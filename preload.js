const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ghostAPI', {
    toggleProtection: () => ipcRenderer.send('toggle-protection'),
    hideWindow: () => ipcRenderer.send('hide-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    setOpacity: (opacity) => ipcRenderer.send('set-opacity', opacity),
    captureScreen: () => ipcRenderer.invoke('capture-screen'),
    startLiveMonitor: (intervalMs) => ipcRenderer.send('start-live-monitor', intervalMs),
    stopLiveMonitor: () => ipcRenderer.send('stop-live-monitor'),
    platform: process.platform,
    onProtectionStatus: (callback) => {
        ipcRenderer.on('protection-status', (event, status) => callback(status));
    },
    onScreenCaptured: (callback) => {
        ipcRenderer.on('screen-captured', (event, dataUrl) => callback(dataUrl));
    },
    onLiveFrame: (callback) => {
        ipcRenderer.on('live-frame', (event, dataUrl) => callback(dataUrl));
    },
});
