const { app, BrowserWindow } = require('electron');
const path = require('path');
const { execFile } = require('child_process');

let win;
const isDev = !app.isPackaged;

function powershell(script) {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { windowsHide: true }, (err, stdout) => {
      if (err) return resolve([]);
      try { resolve(JSON.parse(stdout || '[]')); } catch { resolve([]); }
    });
  });
}

async function listWindowsPrinters() {
  if (process.platform !== 'win32') return [];
  const ps = `
    $items = @();
    try {
      $items += @(Get-CimInstance Win32_SerialPort | ForEach-Object {
        [pscustomobject]@{ id=$_.DeviceID; name=$_.Name; description=$_.Description; port=$_.DeviceID; type='COM / Bluetooth SPP'; pnp=$_.PNPDeviceID }
      });
    } catch {}
    try {
      $items += @(Get-Printer | ForEach-Object {
        [pscustomobject]@{ id=$_.Name; name=$_.Name; description=$_.DriverName; port=$_.PortName; type='Windows Printer'; pnp='' }
      });
    } catch {}
    $items | ConvertTo-Json -Compress;
  `;
  const data = await powershell(ps);
  const rows = Array.isArray(data) ? data : (data && (data.id || data.name) ? [data] : []);
  const seen = new Set();
  return rows.filter(x => {
    const key = `${x.id}|${x.port}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#f6f7fb',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Electron cancels Web Bluetooth requests unless this event is handled.
  win.webContents.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();
    const device = devices.find(d => d.deviceName && d.deviceName.trim()) || devices[0];
    callback(device ? device.deviceId : '');
  });

  win.webContents.session.setBluetoothPairingHandler((_details, callback) => {
    // Most thermal printers are already paired in Windows. If Windows requests
    // a pairing confirmation/PIN, accept the system pairing request.
    callback({ confirmed: true });
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-fail-load', (_event, code, description) => {
    if (isDev) console.error(`POS failed to load: ${code} ${description}`);
  });

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173').catch(() => {
      // electron:dev starts Vite before Electron; this retry also handles a slow startup.
      let attempts = 0;
      const retry = setInterval(() => {
        attempts += 1;
        win.loadURL('http://127.0.0.1:5173').then(() => clearInterval(retry)).catch(() => {
          if (attempts >= 30) clearInterval(retry);
        });
      }, 500);
    });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

require('electron').ipcMain.handle('printer:list', () => listWindowsPrinters());

require('electron').ipcMain.handle('printer:print', async (_event, { port, data }) => {
  if (!port || process.platform !== 'win32') return { ok: false, reason: 'native-port-unavailable' };
  const encoded = Buffer.from(data, 'utf8').toString('base64');
  const ps = `$b=[Convert]::FromBase64String('${encoded}'); $p=New-Object System.IO.Ports.SerialPort '${port}',9600,None,8,one; $p.Open(); $p.Write($b,0,$b.Length); $p.Close();`;
  return new Promise(resolve => execFile('powershell.exe', ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command', ps], { windowsHide:true }, err => resolve(err ? {ok:false,reason:err.message} : {ok:true})));
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
