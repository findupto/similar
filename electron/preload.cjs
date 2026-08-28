const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('mkPosDesktop',{isDesktop:true,discoverPrinters:()=>ipcRenderer.invoke('printer:list'),printEscPos:p=>ipcRenderer.invoke('printer:print',p),printRaw:p=>ipcRenderer.invoke('printer:print-raw',p),printHtml:p=>ipcRenderer.invoke('printer:print-html',p)});
