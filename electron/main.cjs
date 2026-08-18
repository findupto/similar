const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');

let win;
const isDev = !app.isPackaged;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#f6f7fb',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  });
  if (isDev) win.loadURL('http://127.0.0.1:5173');
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

function powershell(script) {
  return new Promise((resolve) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true }, (err, stdout) => {
    if (err) return resolve([]);
    try { resolve(JSON.parse(stdout || '[]')); } catch { resolve([]); }
  }));
}

ipcMain.handle('printer:list', async () => {
  if (process.platform !== 'win32') return [];
  const ps = `Get-CimInstance Win32_SerialPort | Select-Object DeviceID,Name,Description,PNPDeviceID | ConvertTo-Json -Compress`;
  const data = await powershell(ps);
  const rows = Array.isArray(data) ? data : (data && data.DeviceID ? [data] : []);
  return rows.map(x => ({ id: x.DeviceID, name: x.Name || x.Description || x.DeviceID, type: 'Windows COM / Bluetooth', port: x.DeviceID, pnp: x.PNPDeviceID || '' }));
});

ipcMain.handle('printer:print', async (_event, { port, data }) => {
  if (!port || process.platform !== 'win32') return { ok: false, reason: 'native-port-unavailable' };
  // ESC/POS bytes are sent through PowerShell to the paired Windows COM printer.
  const encoded = Buffer.from(data, 'utf8').toString('base64');
  const ps = `$b=[Convert]::FromBase64String('${encoded}'); $p=new-Object System.IO.Ports.SerialPort '${port}',9600,None,8,one; $p.Open(); $p.Write($b,0,$b.Length); $p.Close();`;
  return new Promise(resolve => execFile('powershell.exe', ['-NoProfile','-NonInteractive','-Command', ps], { windowsHide:true }, err => resolve(err ? {ok:false,reason:err.message} : {ok:true})));
});

app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
