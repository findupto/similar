const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const db = {
  loadState: () => ipcRenderer.sendSync('db:load-state-sync'),
  saveState: (state, actor) => ipcRenderer.sendSync('db:save-state-sync', { state, actor }),
  backup: (targetPath) => ipcRenderer.invoke('db:backup', { targetPath }),
  integrityCheck: () => ipcRenderer.invoke('db:integrity-check'),
  authenticate: (username, secret) => ipcRenderer.invoke('auth:authenticate', { username, secret })
};

const projectRoot = path.resolve(__dirname, '..');
const allowed = new Set(['.css','.jsx','.js','.cjs','.html','.json']);
function projectPath(rel) {
  const clean = String(rel || '').replace(/^[/\\]+/, '');
  const full = path.resolve(projectRoot, clean);
  if (full !== projectRoot && !full.startsWith(projectRoot + path.sep)) throw new Error('Path outside project is blocked');
  if (!allowed.has(path.extname(full).toLowerCase())) throw new Error('File type is not allowed');
  return full;
}
const project = {
  list: () => {
    if (process.sandboxed) return [];
    const out = [];
    const walk = dir => { for (const name of fs.readdirSync(dir)) { if (name==='node_modules'||name==='.git'||name==='dist') continue; const full=path.join(dir,name); const st=fs.statSync(full); if(st.isDirectory()) walk(full); else if(allowed.has(path.extname(name).toLowerCase())) out.push(path.relative(projectRoot,full).replaceAll(path.sep,'/')); } };
    try { walk(projectRoot); } catch {} return out.slice(0,500);
  },
  read: rel => {
    try { if(process.sandboxed) return {ok:false,error:'Project source editing is available in development mode only'}; const full=projectPath(rel); return {ok:true,path:rel,content:fs.readFileSync(full,'utf8')}; } catch(e) { return {ok:false,error:e.message}; }
  },
  write: (rel, content) => {
    try {
      if(process.sandboxed) return {ok:false,error:'Project source editing is available in development mode only'};
      if(typeof content!=='string'||content.length>1000000) return {ok:false,error:'Invalid or oversized content'};
      const full=projectPath(rel), backupPath=full+'.ai-backup';
      if(fs.existsSync(full)) fs.copyFileSync(full,backupPath);
      fs.writeFileSync(full,content,'utf8');
      return {ok:true,path:rel,backup:backupPath};
    } catch(e) { return {ok:false,error:e.message}; }
  }
};

contextBridge.exposeInMainWorld('mkPosDesktop', {
  isDesktop: true,
  database: db,
  ai: { analyze: state => ipcRenderer.invoke('ai:analyze', { state }) },
  project,
  diagnostics: () => ipcRenderer.invoke('app:diagnostics'),
  discoverPrinters: () => ipcRenderer.invoke('printer:list'),
  bluetoothSend: p => ipcRenderer.invoke('printer:bluetooth-send', p),
  printEscPos: p => ipcRenderer.invoke('printer:print', p),
  testSerial: p => ipcRenderer.invoke('printer:test-serial', p),
  testSerialPrinter: p => ipcRenderer.invoke('printer:test-serial', p),
  printRaw: p => ipcRenderer.invoke('printer:print-raw', p),
  printHtml: p => ipcRenderer.invoke('printer:print-html', p)
});
