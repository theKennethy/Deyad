/**
 * Autonomous agent loop.
 *
 * Orchestrates a multi-turn conversation with Ollama where the AI can
 * call tools (read/write files, run commands, etc.) and iterate until
 * the task is complete.
 */

import { parseToolCalls, executeTool, isDone, stripToolMarkup, AGENT_TOOLS_DESCRIPTION } from './agentTools';
import type { ToolResult } from './agentTools';
import { buildSmartContext } from './contextBuilder';

/** Maximum autonomous iterations before forcing a stop. */
const MAX_ITERATIONS = 15;

export interface AgentCallbacks {
  /** Called when the agent adds/updates its thinking or prose output. */
  onContent: (text: string) => void;
  /** Called when a tool starts executing. */
  onToolStart: (toolName: string, params: Record<string, string>) => void;
  /** Called when a tool finishes executing. */
  onToolResult: (result: ToolResult) => void;
  /** Called when files are written by the agent. Returns the updated file map. */
  onFilesWritten: (files: Record<string, string>) => Promise<void>;
  /** Called when the agent loop is fully done. */
  onDone: () => void;
  /** Called on error. */
  onError: (error: string) => void;
}

export interface AgentOptions {
  appId: string;
  appType: 'frontend' | 'fullstack';
  dbProvider?: 'mysql' | 'postgresql';
  dbStatus: 'none' | 'running' | 'stopped';
  model: string;
  userMessage: string;
  /** Current project files for initial context. */
  appFiles: Record<string, string>;
  /** Currently selected file in the editor. */
  selectedFile?: string | null;
  /** Previous conversation messages (for continuity). */
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  callbacks: AgentCallbacks;
}

function getAgentSystemPrompt(appType: string, dbProvider?: string): string {
  const stackInfo = appType === 'fullstack'
    ? `This is a full-stack project (React + Vite + TypeScript frontend, Express + Prisma backend, ${dbProvider === 'postgresql' ? 'PostgreSQL' : 'MySQL'} database).`
    : 'This is a frontend project (React + Vite + TypeScript).';

  return `You are Deyad Agent, an autonomous AI developer powered by Ollama.
You can independently read code, write files, run shell commands, and iterate until the task is complete.

${stackInfo}

${AGENT_TOOLS_DESCRIPTION}

WORKFLOW:
1. First, understand the request and explore the current project (list_files, read_file).
2. Plan your approach briefly in prose.
3. Implement changes using write_files and run_command as needed.
4. Verify your work (e.g. check for errors, read files to confirm).
5. When everything is done, output <done/>.

RULES:
- Always explore the project structure before making changes.
- Write complete file contents (not diffs or patches).
- After writing files, run build/lint commands to verify if applicable.
- If a command fails, read the error and fix the issue.
- Keep your prose explanations concise — focus on actions.
- Do not ask the user questions; make reasonable decisions autonomously.
- You can make multiple tool calls in a single response.
- Use ### FILE: format inside write_files content param for code.

When writing files with write_files, put the raw file content directly in the content param (no markdown fences).`;
}

/**
 * Streams a single Ollama turn and returns the full response text.
 */
function streamOllamaTurn(
  model: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  onToken: (token: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = '';

    const unsubToken = window.deyad.onStreamToken((token: string) => {
      buf += token;
      onToken(token);
    });

    const unsubDone = window.deyad.onStreamDone(() => {
      cleanup();
      resolve(buf);
    });

    const unsubError = window.deyad.onStreamError((err: string) => {
      cleanup();
      reject(new Error(err));
    });

    function cleanup() {
      unsubToken();
      unsubDone();
      unsubError();
    }

    window.deyad.chatStream(model, messages).catch((err) => {
      cleanup();
      reject(err);
    });
  });
}

/**
 * Run the autonomous agent loop.
 *
 * Returns a cleanup function that can abort the loop.
 */
export function runAgentLoop(options: AgentOptions): () => void {
  const { appId, appType, dbProvider, dbStatus, model, userMessage, appFiles, selectedFile, history, callbacks } = options;
  let aborted = false;

  const abort = () => { aborted = true; };

  (async () => {
    try {
      // Build initial context
      const context = buildSmartContext({
        files: appFiles,
        selectedFile,
        userMessage,
      });

      // Assemble conversation
      const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
        { role: 'system', content: getAgentSystemPrompt(appType, dbProvider) },
      ];

      if (context) {
        messages.push({ role: 'system', content: `Current project files:\n\n${context}` });
      }

      // Inject DB schema if available
      if (dbStatus === 'running' && appType === 'fullstack') {
        try {
          const schema = await window.deyad.dbDescribe(appId);
          if (schema.tables.length > 0) {
            const schemaText = schema.tables.map((t) => `${t.name}: ${t.columns.join(', ')}`).join('\n');
            messages.push({
              role: 'system',
              content: `Database schema:\n${schemaText}`,
            });
          }
        } catch { /* ignore */ }
      }

      // Add conversation history (last 6 messages)
      for (const msg of history.slice(-6)) {
        messages.push(msg);
      }

      // Add the user's current message
      messages.push({ role: 'user', content: userMessage });

      let fullOutput = '';
      let iteration = 0;

      // Agent loop
      while (iteration < MAX_ITERATIONS && !aborted) {
        iteration++;

        // Stream one turn from Ollama
        const turnResponse = await streamOllamaTurn(model, messages, (token) => {
          fullOutput += token;
          callbacks.onContent(fullOutput);
        });

        if (aborted) break;

        // Check for tool calls
        const toolCalls = parseToolCalls(turnResponse);

        if (toolCalls.length === 0 || isDone(turnResponse)) {
          // No tool calls or explicit done — the agent is finished
          callbacks.onDone();
          return;
        }

        // Execute each tool call
        const results: ToolResult[] = [];
        for (const call of toolCalls) {
          if (aborted) break;
          callbacks.onToolStart(call.name, call.params);

          const result = await executeTool(call, appId);
          results.push(result);
          callbacks.onToolResult(result);

          // If files were written, notify parent
          if (call.name === 'write_files' && result.success) {
            const fileMap: Record<string, string> = {};
            if (call.params.path && call.params.content !== undefined) {
              fileMap[call.params.path] = call.params.content;
            }
            for (let i = 0; i < 50; i++) {
              const p = call.params[`file_${i}_path`];
              const c = call.params[`file_${i}_content`];
              if (!p) break;
              fileMap[p] = c ?? '';
            }
            if (Object.keys(fileMap).length > 0) {
              await callbacks.onFilesWritten(fileMap);
            }
          }
        }

        if (aborted) break;

        // Build tool results message to feed back
        const resultsText = results
          .map((r) => `<tool_result>\n<name>${r.tool}</name>\n<status>${r.success ? 'success' : 'error'}</status>\n<output>\n${r.output}\n</output>\n</tool_result>`)
          .join('\n\n');

        // Add assistant response and tool results to conversation
        messages.push({ role: 'assistant', content: turnResponse });
        messages.push({ role: 'user', content: resultsText });

        // Add a separator in the display
        fullOutput += '\n\n---\n\n';
        callbacks.onContent(fullOutput);
      }

      if (iteration >= MAX_ITERATIONS && !aborted) {
        fullOutput += '\n\n*Agent stopped after reaching the maximum iteration limit.*';
        callbacks.onContent(fullOutput);
      }

      callbacks.onDone();
    } catch (err) {
      if (!aborted) {
        callbacks.onError(err instanceof Error ? err.message : String(err));
      }
    }
  })();

  return abort;
}
