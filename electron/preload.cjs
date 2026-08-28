const { contextBridge, ipcRenderer } = require('electron');

const db = {
  loadState: () => ipcRenderer.invoke('db:load-state'),
  saveState: (state, actor) => ipcRenderer.invoke('db:save-state', { state, actor }),
  backup: (targetPath) => ipcRenderer.invoke('db:backup', { targetPath })
};

contextBridge.exposeInMainWorld('mkPosDesktop', {
  isDesktop: true,
  database: db,
  discoverPrinters: () => ipcRenderer.invoke('printer:list'),
  bluetoothSend: p => ipcRenderer.invoke('printer:bluetooth-send', p),
  printEscPos: p => ipcRenderer.invoke('printer:print', p),
  testSerial: p => ipcRenderer.invoke('printer:test-serial', p),
  testSerialPrinter: p => ipcRenderer.invoke('printer:test-serial', p),
  printRaw: p => ipcRenderer.invoke('printer:print-raw', p),
  printHtml: p => ipcRenderer.invoke('printer:print-html', p)
});
