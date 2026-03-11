# Deyad Architecture

## Overview

Deyad is a local-first AI app builder built with **Electron + React + TypeScript**. Users describe what they want to build in natural language, and a local Ollama-powered AI generates, edits, and manages full-stack applications entirely on the user's machine.

## Process Model

```
┌──────────────────────────────┐
│         Main Process         │  Electron (Node.js)
│  src/main.ts                 │  - Window management
│  src/main/ipcGit.ts          │  - 48 IPC handlers
│  src/main/ipcDeploy.ts       │  - File system, Docker, git
│  src/main/ipcCapacitor.ts    │  - Terminal (node-pty)
│  src/lib/mainUtils.ts        │  - Settings, snapshots
└──────────┬───────────────────┘
           │ contextBridge (preload.ts)
           │ ipcRenderer.invoke()
┌──────────▼───────────────────┐
│       Renderer Process       │  React 18 + Vite
│  src/App.tsx                 │  - Layout & routing
│  src/components/             │  - 23 UI components
│  src/lib/                    │  - Agent loop, tools, parsers
└──────────────────────────────┘
```

## Directory Structure

```
src/
├── main.ts                  # Electron main process entry
├── preload.ts               # Context bridge (IPC API)
├── renderer.tsx             # React entry point
├── App.tsx                  # Root component, layout, state
├── index.css                # Global + component styles
├── main/
│   ├── ipcGit.ts            # Git/GitHub IPC handlers (11)
│   ├── ipcDeploy.ts         # Deploy IPC handlers (4 incl. Electron desktop)
│   └── ipcCapacitor.ts      # Mobile preview IPC handlers (5)
├── components/
│   ├── ChatPanel.tsx         # AI chat (decomposed: ChatInput, MessageList, AgentStepsList)
│   ├── EditorPanel.tsx       # Monaco editor with tabs
│   ├── PreviewPanel.tsx      # Live preview webview
│   ├── DatabasePanel.tsx     # pgAdmin webview + schema viewer
│   ├── TerminalPanel.tsx     # Multi-tab terminal (xterm.js + node-pty)
│   ├── Sidebar.tsx           # App list, create/delete/rename
│   ├── GitPanel.tsx          # GitHub remote, push/pull, branches
│   ├── VersionHistoryPanel.tsx # Git log + file restore
│   ├── DiffModal.tsx         # LCS-based diff viewer
│   ├── DeployModal.tsx       # Deploy to Netlify/Vercel/Surge/Railway/Fly.io + Electron desktop
│   ├── SettingsModal.tsx     # Ollama host, models, pgAdmin creds
│   ├── EnvVarsPanel.tsx      # .env file editor
│   ├── PackageManagerPanel.tsx # npm install/uninstall
│   ├── TaskQueuePanel.tsx    # Agent task queue display
│   ├── NewAppModal.tsx       # Create app wizard (plugin templates)
│   ├── ImportModal.tsx       # Import existing project
│   ├── WelcomeWizard.tsx     # First-run setup
│   ├── ConfirmDialog.tsx     # Reusable confirmation modal
│   └── ErrorBoundary.tsx     # React error boundary
├── lib/
│   ├── agentLoop.ts          # Autonomous agent orchestration
│   ├── agentTools.ts         # 18 agent tools (file ops, terminal, git)
│   ├── codeParser.ts         # Extract files from AI responses
│   ├── contextBuilder.ts     # Smart context selection for prompts
│   ├── codebaseIndexer.ts    # TF-IDF file indexer for relevance
│   ├── scaffoldGenerator.ts  # Project scaffolding (frontend + fullstack)
│   ├── errorDetector.ts      # Parse build/runtime errors
│   ├── taskQueue.ts          # Persistent task queue
│   ├── crc32.ts              # CRC32 checksum (change detection)
│   ├── crypto.ts             # Crypto utilities
│   └── electronCheck.ts      # Electron environment detection
├── types/
│   └── deyad.d.ts            # TypeScript type declarations
└── test/
    └── setup.ts              # Vitest setup (DOM mocks)
```

## IPC Communication

All IPC uses `ipcMain.handle()` / `ipcRenderer.invoke()` (request-reply pattern). The preload script (`preload.ts`) exposes a typed `window.deyad` API via `contextBridge`.

### Handler Groups (49 total)

| Group | File | Count | Channels |
|-------|------|-------|----------|
| Core App | main.ts | 29 | apps:list, apps:create, apps:read-files, apps:write-files, apps:delete, apps:rename, apps:dev-start/stop/status, apps:export, apps:import, apps:snapshot/has-snapshot/revert, settings:get/set, etc. |
| AI/Ollama | main.ts | 4 | ollama:list-models, ollama:chat-stream, ollama:fim-complete, ollama:embed |
| Docker/DB | main.ts | 5 | docker:check, docker:db-start/stop/status, docker:port-check |
| Package Mgr | main.ts | 3 | npm:list, npm:install, npm:uninstall |
| Env Vars | main.ts | 2 | env:read, env:write |
| Terminal | main.ts | 3 | terminal:start, terminal:write, terminal:resize |
| Git | ipcGit.ts | 11 | git:log/show/diff-stat/checkout, git:remote-get/set, git:push/pull, git:branch/branch-create/branch-switch |
| Deploy | ipcDeploy.ts | 4 | apps:deploy-check, apps:deploy, apps:deploy-fullstack, apps:deploy-electron |
| Capacitor | ipcCapacitor.ts | 5 | apps:capacitor-init/open/list-devices/run/live-reload |

## Agent System

The AI agent (`agentLoop.ts`) runs autonomously using 18 tools:

1. **File tools**: read_file, write_files, edit_file, list_files
2. **Execution**: run_command, browser_preview
3. **Search**: search_files, search_code
4. **Git tools**: git_status, git_commit, git_push, git_pull, git_remote_get, git_remote_set, git_branch, git_branch_create, git_branch_switch, git_log

The agent loop streams Ollama responses, parses tool calls from markdown code blocks, executes them, and feeds results back until the task is complete.

## Security Model

- **Context isolation**: `contextIsolation: true`, `nodeIntegration: false`
- **Preload bridge**: Only whitelisted IPC channels exposed via `contextBridge`
- **Input validation**: `safeAppId()` rejects path traversal (`../`, `/`, `\`)
- **Git hash validation**: Regex `^[0-9a-f]+$` prevents command injection
- **Branch name validation**: Regex `^[a-zA-Z0-9._\-/]+$`
- **Remote URL validation**: Must match `https?://` or `git@` patterns
- **Header stripping**: X-Frame-Options, CSP, and SameSite/Secure cookies stripped only for `localhost` URLs
- **Cookie handling**: `Set-Cookie` SameSite and Secure attributes stripped on pgAdmin partition for reliable webview login
- **Webview isolation**: pgAdmin webview uses `partition="persist:pgadmin"`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 40 (Chrome 144) |
| Frontend | React 18, TypeScript 5 (strict) |
| Bundler | Vite 5.4 |
| Editor | Monaco Editor |
| Terminal | xterm.js + node-pty |
| AI | Ollama (local LLMs) |
| Database | PostgreSQL 17 + pgAdmin (Docker) |
| Mobile | Capacitor (Android/iOS) |
| Desktop Deploy | Electron Builder (AppImage/exe/DMG with Ollama bridge) |
| Version Control | git (local + GitHub) |
| Testing | Vitest 3.2 + Testing Library |
| Deploy | Netlify, Vercel, Surge, Railway, Fly.io, Electron Desktop |

## Build & Test

```bash
npm start          # Development mode
npm run build      # Production build
npm run make       # Package distributables
npx tsc --noEmit   # Type check
npx vitest run     # Run all tests
```
