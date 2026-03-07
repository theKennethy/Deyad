// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

/** Types shared between main and renderer */
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  details?: {
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AppProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

contextBridge.exposeInMainWorld('deyad', {
  // Ollama
  listModels: (): Promise<{ models: OllamaModel[] }> =>
    ipcRenderer.invoke('ollama:list-models'),

  chat: (model: string, messages: ChatMessage[]): Promise<{ message: ChatMessage }> =>
    ipcRenderer.invoke('ollama:chat', { model, messages }),

  chatStream: (model: string, messages: ChatMessage[]): Promise<void> =>
    ipcRenderer.invoke('ollama:chat-stream', { model, messages }),

  onStreamToken: (cb: (token: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, token: string) => cb(token);
    ipcRenderer.on('ollama:stream-token', handler);
    return () => ipcRenderer.removeListener('ollama:stream-token', handler);
  },

  onStreamDone: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.once('ollama:stream-done', handler);
    return () => ipcRenderer.removeListener('ollama:stream-done', handler);
  },

  onStreamError: (cb: (err: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, err: string) => cb(err);
    ipcRenderer.once('ollama:stream-error', handler);
    return () => ipcRenderer.removeListener('ollama:stream-error', handler);
  },

  // App projects
  listApps: (): Promise<AppProject[]> =>
    ipcRenderer.invoke('apps:list'),

  createApp: (name: string, description: string): Promise<AppProject> =>
    ipcRenderer.invoke('apps:create', { name, description }),

  readFiles: (appId: string): Promise<Record<string, string>> =>
    ipcRenderer.invoke('apps:read-files', appId),

  writeFiles: (appId: string, files: Record<string, string>): Promise<boolean> =>
    ipcRenderer.invoke('apps:write-files', { appId, files }),

  deleteApp: (appId: string): Promise<boolean> =>
    ipcRenderer.invoke('apps:delete', appId),

  getAppsDir: (): Promise<string> =>
    ipcRenderer.invoke('apps:get-dir'),
});

