import { app, BrowserWindow, ipcMain, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const OLLAMA_BASE_URL = process.env.OLLAMA_HOST || 'http://localhost:11434';
const APPS_DIR = path.join(app.getPath('userData'), 'deyad-apps');

// Ensure apps directory exists
if (!fs.existsSync(APPS_DIR)) {
  fs.mkdirSync(APPS_DIR, { recursive: true });
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

// ── Ollama IPC Handlers ────────────────────────────────────────────────────

/** Fetch all locally available Ollama models */
ipcMain.handle('ollama:list-models', async () => {
  return new Promise((resolve, reject) => {
    const request = net.request(`${OLLAMA_BASE_URL}/api/tags`);
    let data = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Failed to parse Ollama response'));
        }
      });
    });
    request.on('error', (err) => reject(new Error(`Ollama not reachable: ${err.message}`)));
    request.end();
  });
});

/** Non-streaming chat completion via Ollama */
ipcMain.handle('ollama:chat', async (_event, { model, messages }: { model: string; messages: { role: string; content: string }[] }) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model, messages, stream: false });
    const request = net.request({
      method: 'POST',
      url: `${OLLAMA_BASE_URL}/api/chat`,
    });
    let data = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Failed to parse Ollama chat response'));
        }
      });
    });
    request.on('error', (err) => reject(new Error(`Ollama chat error: ${err.message}`)));
    request.setHeader('Content-Type', 'application/json');
    request.write(body);
    request.end();
  });
});

/** Streaming chat — sends tokens back via webContents.send */
ipcMain.handle('ollama:chat-stream', async (event, { model, messages }: { model: string; messages: { role: string; content: string }[] }) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model, messages, stream: true });
    const request = net.request({
      method: 'POST',
      url: `${OLLAMA_BASE_URL}/api/chat`,
    });

    let buffer = '';
    request.on('response', (response) => {
      response.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              event.sender.send('ollama:stream-token', parsed.message.content);
            }
            if (parsed.done) {
              event.sender.send('ollama:stream-done');
              resolve(undefined);
            }
          } catch { /* skip malformed lines */ }
        }
      });
      response.on('end', () => {
        event.sender.send('ollama:stream-done');
        resolve(undefined);
      });
    });
    request.on('error', (err) => {
      event.sender.send('ollama:stream-error', err.message);
      reject(err);
    });
    request.setHeader('Content-Type', 'application/json');
    request.write(body);
    request.end();
  });
});

// ── App/Project IPC Handlers ───────────────────────────────────────────────

/** List saved app projects */
ipcMain.handle('apps:list', () => {
  try {
    const entries = fs.readdirSync(APPS_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => {
        const metaPath = path.join(APPS_DIR, e.name, 'deyad.json');
        let meta = { name: e.name, description: '', createdAt: '' };
        if (fs.existsSync(metaPath)) {
          try { meta = { ...meta, ...JSON.parse(fs.readFileSync(metaPath, 'utf-8')) }; } catch { /* ignore */ }
        }
        return { id: e.name, ...meta };
      });
  } catch {
    return [];
  }
});

/** Create a new app project */
ipcMain.handle('apps:create', (_event, { name, description }: { name: string; description: string }) => {
  const id = `${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const dir = path.join(APPS_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  const meta = { name, description, createdAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, 'deyad.json'), JSON.stringify(meta, null, 2));
  return { id, ...meta };
});

/** Read the files of an app project */
ipcMain.handle('apps:read-files', (_event, appId: string) => {
  const dir = path.join(APPS_DIR, appId);
  if (!fs.existsSync(dir)) return {};
  const result: Record<string, string> = {};
  const walk = (base: string, rel = '') => {
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      const fullPath = path.join(base, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.name !== 'deyad.json') {
        try { result[relPath] = fs.readFileSync(fullPath, 'utf-8'); } catch { /* skip binary files */ }
      }
    }
  };
  walk(dir);
  return result;
});

/** Write / update files in an app project */
ipcMain.handle('apps:write-files', (_event, { appId, files }: { appId: string; files: Record<string, string> }) => {
  const dir = path.join(APPS_DIR, appId);
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }
  return true;
});

/** Delete an app project */
ipcMain.handle('apps:delete', (_event, appId: string) => {
  const dir = path.join(APPS_DIR, appId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  return true;
});

/** Get the apps directory path (so user can open it in Finder/Explorer) */
ipcMain.handle('apps:get-dir', () => APPS_DIR);

// ── Lifecycle ──────────────────────────────────────────────────────────────

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
