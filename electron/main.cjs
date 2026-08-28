const { app, BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
const isDev = !app.isPackaged;
const isDebug = process.argv.includes('--debug');
let win;
if (isDebug) app.commandLine.appendSwitch('enable-logging');
function powershell(script){return new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',script],{windowsHide:true},(err,stdout)=>{if(err)return resolve([]);try{resolve(JSON.parse(stdout||'[]'))}catch{resolve([])}}))}
async function listWindowsPrinters(){
  if(process.platform!=='win32')return[];
  const ps=`$items=@();try{$items+=@(Get-CimInstance Win32_SerialPort|%{[pscustomobject]@{id=$_.DeviceID;name=$_.Name;description=$_.Description;port=$_.DeviceID;transportPort=$_.DeviceID;type='COM / Bluetooth SPP'}})}catch{};try{$items+=@(Get-Printer|%{[pscustomobject]@{id=$_.Name;name=$_.Name;description=$_.DriverName;port=$_.PortName;transportPort=($_.PortName -match '^COM\\d+$'?$_['PortName']:'');type='Windows Printer';printerName=$_.Name}})}catch{};$items|ConvertTo-Json -Compress;`;
  const data=await powershell(ps);
  const rows=Array.isArray(data)?data:(data&&(data.id||data.name)?[data]:[]);
  const seen=new Set();
  const clean=rows.filter(x=>{const k=`${x.id}|${x.port}`;if(seen.has(k))return false;seen.add(k);return true});
  const serials=clean.filter(x=>/^COM\d+$/i.test(String(x.transportPort||x.port||'')));
  const queues=clean.filter(x=>x.printerName);
  return clean.map(x=>{
    const p=String(x.transportPort||x.port||'').toUpperCase();
    if(/^COM\d+$/.test(p)){
      const q=queues.find(y=>String(y.port||'').toUpperCase()===p);
      if(q)return {...x,printerName:q.printerName,windowsQueue:q.printerName,transport:'windows-raw+serial'};
      return {...x,transport:'serial'};
    }
    return x;
  });
}
function showLoadError(details){if(!win||win.isDestroyed())return;const safe=String(details||'Unknown').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));win.loadURL(`data:text/html;charset=utf-8,<!doctype html><body style="font-family:Segoe UI;padding:40px"><h2>MK Pizza POS could not load</h2><p>${safe}</p></body>`)}
function createWindow(){win=new BrowserWindow({width:1440,height:900,minWidth:1024,minHeight:680,show:false,backgroundColor:'#f6f7fb',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false}});win.once('ready-to-show',()=>win.show());win.webContents.on('select-bluetooth-device',(e,devices,cb)=>{e.preventDefault();const d=devices.find(x=>x.deviceName?.trim())||devices[0];cb(d?d.deviceId:'')});win.webContents.session.setBluetoothPairingHandler((_d,cb)=>cb({confirmed:true}));if(isDev){win.loadURL('http://127.0.0.1:5173').catch(()=>{let n=0;const t=setInterval(()=>{n++;win.loadURL('http://127.0.0.1:5173').then(()=>clearInterval(t)).catch(()=>{if(n>=30)clearInterval(t)})},500)})}else{const u=pathToFileURL(path.join(__dirname,'..','dist','index.html')).href;win.loadURL(u).catch(e=>showLoadError(e.message))}}
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow()})});
const {ipcMain}=require('electron');
ipcMain.handle('printer:list',()=>listWindowsPrinters());
function runPowerShell(ps){return new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',ps],{windowsHide:true,timeout:15000},(err,stdout,stderr)=>resolve({ok:!err,error:err?.message||stderr||null,stdout:String(stdout||'')})))}
function safePort(value){const p=String(value||'').trim().toUpperCase();return /^COM\d+$/.test(p)?p:null}
function serialScript(port,rate,base64){const safe=String(port).replace(/'/g,"''");const baud=Number(rate)||460800;return `$b=[Convert]::FromBase64String('${base64}');$p=New-Object System.IO.Ports.SerialPort '${safe}',${baud},None,8,one;$p.ReadTimeout=250;$p.WriteTimeout=5000;$p.Handshake=[System.IO.Ports.Handshake]::None;$p.DtrEnable=$false;$p.RtsEnable=$false;$p.Encoding=[System.Text.Encoding]::ASCII;$p.Open();try{$p.Write($b,0,$b.Length);$p.BaseStream.Flush();Start-Sleep -Milliseconds 500}finally{if($p.IsOpen){$p.Close();$p.Dispose()}};Write-Output 'SENT'`}
async function serialSend(port,data,baudRate){const p=safePort(port);if(!p||process.platform!=='win32')return{ok:false,reason:'serial-unavailable',port};const bytes=Array.isArray(data)?data:Array.from(Buffer.from(String(data),'binary'));const b=Buffer.from(bytes).toString('base64');return runPowerShell(serialScript(p,baudRate,b))}
async function queueSend(printerName,data){if(!printerName||process.platform!=='win32')return{ok:false,reason:'printer-unavailable'};const bytes=Array.isArray(data)?data:Array.from(Buffer.from(String(data),'binary'));const b=Buffer.from(bytes).toString('base64');const safe=String(printerName).replace(/'/g,"''");const ps=`Add-Type -TypeDefinition @'\nusing System;using System.Runtime.InteropServices;public class RawPrinter{[StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]public class DOCINFO{public string pDocName;public string pOutputFile;public string pDataType;}[DllImport("winspool.drv",EntryPoint="OpenPrinterW",SetLastError=true,CharSet=CharSet.Unicode)]public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr p);[DllImport("winspool.drv",SetLastError=true)]public static extern bool ClosePrinter(IntPtr h);[DllImport("winspool.drv",CharSet=CharSet.Unicode,SetLastError=true)]public static extern bool StartDocPrinter(IntPtr h,int l,DOCINFO d);[DllImport("winspool.drv",SetLastError=true)]public static extern bool EndDocPrinter(IntPtr h);[DllImport("winspool.drv",SetLastError=true)]public static extern bool StartPagePrinter(IntPtr h);[DllImport("winspool.drv",SetLastError=true)]public static extern bool EndPagePrinter(IntPtr h);[DllImport("winspool.drv",SetLastError=true)]public static extern bool WritePrinter(IntPtr h,byte[] b,int c,out int w);public static bool Send(string n,byte[] b,out int written){written=0;IntPtr h;if(!OpenPrinter(n,out h,IntPtr.Zero))return false;var d=new DOCINFO();d.pDocName="MK Pizza POS Receipt";d.pDataType="RAW";bool ok=StartDocPrinter(h,1,d)&&StartPagePrinter(h);ok=ok&&WritePrinter(h,b,b.Length,out written);ok=ok&&EndPagePrinter(h)&&EndDocPrinter(h);ClosePrinter(h);return ok;}}\n'@;$b=[Convert]::FromBase64String('${b}');$w=0;if(-not [RawPrinter]::Send('${safe}',$b,[ref]$w)){throw 'Windows RAW queue rejected the print job'};Write-Output ('WRITTEN='+$w)`;return runPowerShell(ps)}
ipcMain.handle('printer:print',async(_e,{port,data,baudRate,printerName,transport='auto'})=>{if(transport!=='serial'&&printerName){const q=await queueSend(printerName,data);if(q.ok)return{...q,transport:'windows-raw'};}
  const s=await serialSend(port,data,baudRate);if(s.ok)return{...s,transport:'bluetooth-spp'};
  return {...s,transport:'none',queueError:printerName?'Windows RAW queue failed':'No Windows printer queue mapped'};});
ipcMain.handle('printer:test-serial',async(_e,{port,baudRate=460800,printerName})=>{const payload=Buffer.from('MK PIZZA POS\r\nYD801 BLUETOOTH TEST\r\n\r\n','ascii');if(printerName){const q=await queueSend(printerName,Array.from(payload));if(q.ok)return{...q,transport:'windows-raw'};}const s=await serialSend(port,Array.from(payload),baudRate);return{...s,transport:s.ok?'bluetooth-spp':'none'};});
ipcMain.handle('printer:print-raw',async(_e,{printerName,data})=>queueSend(printerName,data));
ipcMain.handle('printer:print-html',async()=>({ok:false,reason:'html-print-disabled-use-raw'}));
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
