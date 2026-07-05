const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { applyStealthAffinity, removeStealthAffinity, bindStealthEvents } = require('./stealth');


// ─── MEMORY OPTIMIZATIONS ───
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
// NOTE: Do NOT disable hardware acceleration or GPU compositing.
// SetWindowDisplayAffinity (content protection) requires DWM hardware compositing to work.

let win;
let tray = null;
let contentProtectionEnabled = true;
let liveMonitorInterval = null;

function toggleWindow() {
  if (!win) return;
  if (win.isVisible() && !win.isMinimized()) {
    win.hide();
  } else {
    win.restore();
    win.show();
    win.focus();
  }
}

function createTray() {
  // Create a small 16x16 icon programmatically (ghost emoji as tray icon)
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
    'gElEQVQ4T2NkoBAwUqifgWoGDP7/n+E/AwMDIyMjAzYXMDIyMjBgMwAbDdQzgJGRkYER' +
    'pxeI0YPNC8S4gJGBgYGREZcXiNGDzQtANhPIDYyMjAzEuICRkZEBqxdIMQCnF0gxAKcX' +
    'SDEApxdIMQCnF0gxAKcXSDGAagYAAJoeIRGz9qAAAAAASUVORK5CYII='
  );
  tray = new Tray(icon);
  tray.setToolTip('GHOST — Click to show/hide');

  const contextMenu = Menu.buildFromTemplate([
    { label: '👻 Show/Hide GHOST', click: toggleWindow },
    { type: 'separator' },
    {
      label: '🛡️ Toggle Protection', click: () => {
        contentProtectionEnabled = !contentProtectionEnabled;
        if (win) {
          win.setContentProtection(contentProtectionEnabled);
          if (contentProtectionEnabled) {
            applyStealthAffinity(win);
          } else {
            removeStealthAffinity(win);
          }
          win.webContents.send('protection-status', contentProtectionEnabled);
        }
      }
    },
    { type: 'separator' },
    { label: '❌ Quit GHOST', click: () => { app.quit(); } }
  ]);

  tray.setContextMenu(contextMenu);

  // Left-click on tray icon toggles window
  tray.on('click', toggleWindow);
}

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0f',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      enableWebSQL: false,
      v8CacheOptions: 'bypassHeatCheck',
      backgroundThrottling: true,
    },
  });

  // 'floating' level — stays on top but doesn't block the taskbar
  win.setAlwaysOnTop(true, 'floating');

  // Enable content protection — invisible to screen capture
  // Use both Electron's API AND native Win32 call for maximum reliability
  win.setContentProtection(true);

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();

    // Apply native Win32 stealth (WDA_EXCLUDEFROMCAPTURE) directly
    // This is more reliable than Electron's setContentProtection alone
    const ok = applyStealthAffinity(win);
    if (ok) {
      console.log('[GHOST] Native stealth active — window is invisible to screen capture');
    } else {
      console.warn('[GHOST] Native stealth failed — falling back to Electron content protection only');
    }

    // Re-apply stealth on window state changes (some Win11 builds reset the flag)
    bindStealthEvents(win);
  });

  // ─── HOTKEYS ───
  // Toggle visibility — register multiple combos so at least one works
  const toggleKeys = [
    'Alt+Shift+G',           // Primary
    'CommandOrControl+Shift+F2', // Fallback 1 (F-key less likely to conflict)
    'CommandOrControl+`',    // Fallback 2 (backtick)
  ];
  for (const key of toggleKeys) {
    try { globalShortcut.register(key, toggleWindow); } catch (e) { /* skip if taken */ }
  }

  // Toggle content protection: Alt+Shift+P
  try {
    globalShortcut.register('Alt+Shift+P', () => {
      contentProtectionEnabled = !contentProtectionEnabled;
      win.setContentProtection(contentProtectionEnabled);
      if (contentProtectionEnabled) {
        applyStealthAffinity(win);
      } else {
        removeStealthAffinity(win);
      }
      win.webContents.send('protection-status', contentProtectionEnabled);
    });
  } catch (e) { }

  // Screen capture: Alt+Shift+S
  try {
    globalShortcut.register('Alt+Shift+S', () => {
      captureAndSend(1920, 1080);
    });
  } catch (e) { }

  // Prevent minimize from losing the window (no taskbar icon)
  win.on('minimize', (e) => {
    e.preventDefault();
    win.hide();
  });

  win.on('closed', () => {
    stopLiveMonitor();
    win = null;
  });
}

// ─── SINGLE SCREEN CAPTURE ───
async function captureAndSend(width, height) {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
    });
    if (sources.length > 0) {
      const screenshot = sources[0].thumbnail.toDataURL();
      if (win) {
        win.webContents.send('screen-captured', screenshot);
      }
      return screenshot;
    }
  } catch (err) {
    console.error('Screen capture failed:', err);
  }
  return null;
}

// ─── LIVE MONITOR ───
function startLiveMonitor(intervalMs) {
  stopLiveMonitor();
  liveMonitorInterval = setInterval(async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 960, height: 540 },
      });
      if (sources.length > 0 && win) {
        const frame = sources[0].thumbnail.toDataURL();
        win.webContents.send('live-frame', frame);
      }
    } catch (err) {
      console.error('Live capture error:', err);
    }
  }, intervalMs);
}

function stopLiveMonitor() {
  if (liveMonitorInterval) {
    clearInterval(liveMonitorInterval);
    liveMonitorInterval = null;
  }
}

// ─── IPC HANDLERS ───
ipcMain.on('toggle-protection', () => {
  contentProtectionEnabled = !contentProtectionEnabled;
  win.setContentProtection(contentProtectionEnabled);

  // Also toggle native Win32 stealth
  if (contentProtectionEnabled) {
    applyStealthAffinity(win);
  } else {
    removeStealthAffinity(win);
  }

  win.webContents.send('protection-status', contentProtectionEnabled);
});

ipcMain.on('hide-window', () => {
  if (win) win.hide();
});

ipcMain.on('minimize-window', () => {
  if (win) win.hide(); // hide instead of minimize
});

ipcMain.on('close-window', () => {
  if (win) win.close();
});

ipcMain.on('set-opacity', (event, opacity) => {
  if (win) win.setOpacity(opacity);
});

ipcMain.handle('capture-screen', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    if (sources.length > 0) {
      return sources[0].thumbnail.toDataURL();
    }
    return null;
  } catch (err) {
    console.error('Screen capture failed:', err);
    return null;
  }
});

ipcMain.on('start-live-monitor', (event, intervalMs) => {
  startLiveMonitor(intervalMs || 3000);
});

ipcMain.on('stop-live-monitor', () => {
  stopLiveMonitor();
});

// ─── ENVIRONMENT CONFIG LOADER ───
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          let key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          env[key] = value.trim();
        }
      }
    } catch (e) {
      console.error('[GHOST] Error parsing .env file:', e);
    }
  }
  return env;
}

ipcMain.handle('get-env', () => {
  return loadEnv();
});

ipcMain.on('open-external-url', (event, url) => {
  shell.openExternal(url);
});

// ─── OAUTH LOCAL REDIRECT SERVER ───
let oauthServer = null;

function startOauthServer() {
  oauthServer = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname === '/auth/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <head>
              <title>GHOST Auth Success</title>
              <style>
                body {
                  font-family: 'Consolas', 'Courier New', monospace;
                  background: #080a0e;
                  color: #c9d1d9;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                }
                .card {
                  text-align: center;
                  border: 1px solid #1a2233;
                  padding: 30px;
                  border-radius: 8px;
                  background: #0d1117;
                  box-shadow: 0 0 16px rgba(0, 255, 136, 0.1);
                }
                h1 { color: #00ff88; margin: 0 0 10px 0; font-size: 20px; }
                p { font-size: 11px; margin: 0; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>👻 GHOST Auth</h1>
                <p>Authentication successful! You can close this tab and return to the GHOST app.</p>
              </div>
            </body>
          </html>
        `);

        if (win) {
          win.webContents.send('oauth-callback', { code, error });
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    } catch (e) {
      console.error('[GHOST] HTTP Server error:', e);
      res.writeHead(500);
      res.end();
    }
  });

  oauthServer.listen(9999, '127.0.0.1', () => {
    console.log('[GHOST] Local OAuth callback server listening on http://localhost:9999');
  });
}

function stopOauthServer() {
  if (oauthServer) {
    oauthServer.close();
    oauthServer = null;
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  startOauthServer();
});

app.on('window-all-closed', () => {
  stopLiveMonitor();
  stopOauthServer();
  globalShortcut.unregisterAll();
  app.quit();
});

app.on('will-quit', () => {
  stopLiveMonitor();
  stopOauthServer();
  globalShortcut.unregisterAll();
  if (tray) { tray.destroy(); tray = null; }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
