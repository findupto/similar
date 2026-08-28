const { contextBridge, ipcRenderer } = require('electron');

const db = {
  loadState: () => ipcRenderer.sendSync('db:load-state-sync'),
  saveState: (state, actor) => ipcRenderer.sendSync('db:save-state-sync', { state, actor }),
  backup: targetPath => ipcRenderer.invoke('db:backup', { targetPath }),
  integrityCheck: () => ipcRenderer.invoke('db:integrity-check'),
  authenticate: (username, secret) => ipcRenderer.invoke('auth:authenticate', { username, secret })
};

contextBridge.exposeInMainWorld('mkPosDesktop', {
  isDesktop: true,
  database: db,
  ai: { analyze: state => ipcRenderer.invoke('ai:analyze', { state }) },
  project: {
    list: () => ipcRenderer.invoke('project:list'),
    read: rel => ipcRenderer.invoke('project:read', rel),
    write: (rel, content) => ipcRenderer.invoke('project:write', { rel, content })
  },
  diagnostics: () => ipcRenderer.invoke('app:diagnostics'),
  discoverPrinters: () => ipcRenderer.invoke('printer:list'),
  bluetoothSend: p => ipcRenderer.invoke('printer:bluetooth-send', p),
  printEscPos: p => ipcRenderer.invoke('printer:print', p),
  testSerial: p => ipcRenderer.invoke('printer:test-serial', p),
  testSerialPrinter: p => ipcRenderer.invoke('printer:test-serial', p),
  printRaw: p => ipcRenderer.invoke('printer:print-raw', p),
  printHtml: p => ipcRenderer.invoke('printer:print-html', p)
});
