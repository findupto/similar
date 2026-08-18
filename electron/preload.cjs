const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('mkPosDesktop', {
  isDesktop: true,
  discoverPrinters: () => ipcRenderer.invoke('printer:list'),
  printEscPos: (payload) => ipcRenderer.invoke('printer:print', payload)
});
