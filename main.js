const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

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
  win.setContentProtection(true);

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
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

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  stopLiveMonitor();
  globalShortcut.unregisterAll();
  app.quit();
});

app.on('will-quit', () => {
  stopLiveMonitor();
  globalShortcut.unregisterAll();
  if (tray) { tray.destroy(); tray = null; }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
