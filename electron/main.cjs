const { app, BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');

const isDev = !app.isPackaged;
const isDebug = process.argv.includes('--debug');
let win;

if (isDebug) app.commandLine.appendSwitch('enable-logging');

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

function showLoadError(details) {
  if (!win || win.isDestroyed()) return;
  const safe = String(details || 'Unknown renderer error').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  win.loadURL(`data:text/html;charset=utf-8,<!doctype html><html><body style="font-family:Segoe UI;padding:40px;background:#f6f7fb;color:#222"><h2>MK Pizza & Ice Bar POS could not load</h2><p>${safe}</p><p>Run the application with <b>--debug</b> to open diagnostics.</p></body></html>`);
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

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (isDebug) console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(`POS renderer exited: ${details.reason || 'unknown'} ${details.exitCode ?? ''}`);
    if (!isDebug) showLoadError(`Renderer process exited: ${details.reason || 'unknown'}`);
  });

  win.webContents.on('did-fail-load', (_event, code, description, validatedURL) => {
    console.error(`POS failed to load: ${code} ${description} ${validatedURL || ''}`);
    if (!isDev) showLoadError(`${code} ${description}<br><small>${validatedURL || ''}</small>`);
  });

  win.webContents.on('did-finish-load', () => {
    if (isDebug) {
      console.log(`POS loaded: ${win.webContents.getURL()}`);
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });

  win.once('ready-to-show', () => win.show());

  win.webContents.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();
    const device = devices.find(d => d.deviceName && d.deviceName.trim()) || devices[0];
    callback(device ? device.deviceId : '');
  });

  win.webContents.session.setBluetoothPairingHandler((_details, callback) => {
    callback({ confirmed: true });
  });

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173').catch(() => {
      let attempts = 0;
      const retry = setInterval(() => {
        attempts += 1;
        win.loadURL('http://127.0.0.1:5173').then(() => clearInterval(retry)).catch(() => {
          if (attempts >= 30) clearInterval(retry);
        });
      }, 500);
    });
  } else {
    const renderer = path.join(__dirname, '..', 'dist', 'index.html');
    const rendererUrl = pathToFileURL(renderer).href;
    console.log(`POS renderer: ${renderer}`);
    console.log(`POS renderer URL: ${rendererUrl}`);
    win.loadURL(rendererUrl).catch(err => showLoadError(err.message));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

require('electron').ipcMain.handle('printer:print-html', async (_event, { printerName, html }) => {
  if (!printerName || process.platform !== 'win32') return { ok:false, reason:'windows-printer-unavailable' };
  return new Promise(async resolve => {
    let printWin;
    try {
      printWin = new BrowserWindow({show:false, width:302, height:1000, webPreferences:{contextIsolation:true,nodeIntegration:false}});
      await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html || ''));
      printWin.webContents.print({silent:true, printBackground:false, deviceName:printerName}, (success, reason) => {
        if (printWin && !printWin.isDestroyed()) printWin.close();
        resolve(success ? {ok:true} : {ok:false, reason:reason || 'print-failed'});
      });
    } catch (err) {
      if (printWin && !printWin.isDestroyed()) printWin.close();
      resolve({ok:false, reason:String(err.message || err)});
    }
  });
});

require('electron').ipcMain.handle('printer:list', () => listWindowsPrinters());

require('electron').ipcMain.handle('printer:print', async (_event, { port, data }) => {
  if (!port || process.platform !== 'win32') return { ok: false, reason: 'native-port-unavailable' };
  const encoded = Buffer.from(data, 'utf8').toString('base64');
  const ps = `$b=[Convert]::FromBase64String('${encoded}'); $p=New-Object System.IO.Ports.SerialPort '${port}',9600,None,8,one; $p.Open(); $p.Write($b,0,$b.Length); $p.Close();`;
  return new Promise(resolve => execFile('powershell.exe', ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command', ps], { windowsHide:true }, err => resolve(err ? {ok:false,reason:err.message} : {ok:true})));
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
