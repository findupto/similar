const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
let win;
let BluetoothSerialPort;
try { ({ BluetoothSerialPort } = require('bluetooth-serial-port')); } catch (e) { BluetoothSerialPort = null; }

function psJson(script){return new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',script],{windowsHide:true,timeout:10000},(err,stdout)=>{if(err)return resolve([]);try{resolve(JSON.parse(stdout||'[]'))}catch{resolve([])}}))}
function psRun(script){return new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',script],{windowsHide:true,timeout:15000},(err,stdout,stderr)=>resolve({ok:!err,error:err?.message||String(stderr||'')||null,stdout:String(stdout||'')})))}

async function listWindowsPrinters(){
  if(process.platform!=='win32') return [];
  const ps=`$items=@();try{$items+=@(Get-CimInstance Win32_SerialPort|%{[pscustomobject]@{id=$_.DeviceID;name=$_.Name;description=$_.Description;port=$_.DeviceID;transportPort=$_.DeviceID;type='COM / Bluetooth SPP'}})}catch{};try{$items+=@(Get-Printer|%{[pscustomobject]@{id=$_.Name;name=$_.Name;description=$_.DriverName;port=$_.PortName;transportPort=if($_.PortName -match '^COM\\d+$'){$_.PortName}else{''};type='Windows Printer';printerName=$_.Name}})}catch{};$items|ConvertTo-Json -Compress;`;
  const data=await psJson(ps);const rows=Array.isArray(data)?data:(data&&(data.id||data.name)?[data]:[]);const seen=new Set();return rows.filter(x=>{const k=`${x.id}|${x.port}`;if(seen.has(k))return false;seen.add(k);return true});
}

function createWindow(){
  win=new BrowserWindow({width:1440,height:900,minWidth:1024,minHeight:680,show:false,backgroundColor:'#f6f7fb',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false}});
  win.once('ready-to-show',()=>win.show());
  win.webContents.on('select-bluetooth-device',(e,devices,cb)=>{e.preventDefault();const d=devices.find(x=>x.deviceName?.trim())||devices[0];cb(d?d.deviceId:'')});
  win.webContents.session.setBluetoothPairingHandler((_d,cb)=>cb({confirmed:true}));
  if(!app.isPackaged){const load=()=>win.loadURL('http://127.0.0.1:5173').catch(()=>{});load();let n=0;const t=setInterval(()=>{if(++n>30)return clearInterval(t);win.loadURL('http://127.0.0.1:5173').then(()=>clearInterval(t)).catch(()=>{})},500)}
  else win.loadURL(pathToFileURL(path.join(__dirname,'..','dist','index.html')).href);
}
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow()})});

function normalizeAddress(v){return String(v||'').trim().replace(/-/g,':').toUpperCase()}
function directBluetoothSend(address,data){
  return new Promise((resolve)=>{
    if(process.platform!=='win32'||!BluetoothSerialPort)return resolve({ok:false,transport:'bluetooth-direct',error:'Direct Bluetooth SPP module is unavailable'});
    const mac=normalizeAddress(address);if(!/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(mac))return resolve({ok:false,transport:'bluetooth-direct',error:'Invalid Bluetooth address'});
    const serial=new BluetoothSerialPort();let done=false;
    const finish=(r)=>{if(done)return;done=true;try{serial.close?.()}catch{};resolve(r)};
    const timer=setTimeout(()=>finish({ok:false,transport:'bluetooth-direct',error:'Bluetooth SPP connection timeout'}),12000);
    const fail=(e)=>{clearTimeout(timer);finish({ok:false,transport:'bluetooth-direct',error:String(e?.message||e||'Bluetooth SPP connection failed')})};
    try{
      serial.findSerialPortChannel(mac,(channel)=>{
        serial.connect(mac,channel,()=>{
          const buf=Buffer.from(Array.isArray(data)?data:data instanceof Buffer?data:Buffer.from(String(data),'binary'));
          serial.write(buf,(err)=>{clearTimeout(timer);if(err)return fail(err);setTimeout(()=>finish({ok:true,transport:'bluetooth-direct',channel,bytes:buf.length}),350)});
        },fail);
      },()=>fail(new Error('No Bluetooth SPP service/channel found on '+mac)));
    }catch(e){clearTimeout(timer);fail(e)}
  });
}

function safePort(v){const p=String(v||'').trim().toUpperCase();return /^COM\d+$/.test(p)?p:null}
async function serialSend(port,data,baudRate=460800){
  const p=safePort(port);if(!p)return{ok:false,transport:'bluetooth-spp',error:'No COM port selected'};
  const bytes=Array.isArray(data)?data:Array.from(Buffer.from(String(data),'binary'));const b=Buffer.from(bytes).toString('base64');const safe=p.replace(/'/g,"''");const rate=Number(baudRate)||460800;
  const script=`$b=[Convert]::FromBase64String('${b}');$p=New-Object System.IO.Ports.SerialPort '${safe}',${rate},None,8,one;$p.Handshake=[System.IO.Ports.Handshake]::None;$p.DtrEnable=$false;$p.RtsEnable=$false;$p.WriteTimeout=5000;$p.Open();try{$p.Write($b,0,$b.Length);$p.BaseStream.Flush();Start-Sleep -Milliseconds 400}finally{if($p.IsOpen){$p.Close();$p.Dispose()}};Write-Output 'SENT'`;
  const r=await psRun(script);return{...r,transport:'bluetooth-spp',bytes:bytes.length,port:p,baudRate:rate};
}

async function queueSend(printerName,data){
  if(!printerName)return{ok:false,error:'No Windows printer queue selected',transport:'windows-raw'};
  const bytes=Array.isArray(data)?data:Array.from(Buffer.from(String(data),'binary'));const b=Buffer.from(bytes).toString('base64');const safe=String(printerName).replace(/'/g,"''");
  const ps=`Add-Type -TypeDefinition @'\nusing System;using System.Runtime.InteropServices;public class RawPrinter{[StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]public class DOCINFO{public string pDocName;public string pOutputFile;public string pDataType;}[DllImport("winspool.drv",EntryPoint="OpenPrinterW",SetLastError=true,CharSet=CharSet.Unicode)]public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr p);[DllImport("winspool.drv",SetLastError=true)]public static extern bool ClosePrinter(IntPtr h);[DllImport("winspool.drv",CharSet=CharSet.Unicode,SetLastError=true)]public static extern bool StartDocPrinter(IntPtr h,int l,DOCINFO d);[DllImport("winspool.drv",SetLastError=true)]public static extern bool EndDocPrinter(IntPtr h);[DllImport("winspool.drv",SetLastError=true)]public static extern bool StartPagePrinter(IntPtr h);[DllImport("winspool.drv",SetLastError=true)]public static extern bool EndPagePrinter(IntPtr h);[DllImport("winspool.drv",SetLastError=true)]public static extern bool WritePrinter(IntPtr h,byte[] b,int c,out int w);public static bool Send(string n,byte[] b,out int w){w=0;IntPtr h;if(!OpenPrinter(n,out h,IntPtr.Zero))return false;var d=new DOCINFO();d.pDocName="MK Pizza POS RAW";d.pDataType="RAW";bool ok=StartDocPrinter(h,1,d)&&StartPagePrinter(h);ok=ok&&WritePrinter(h,b,b.Length,out w);ok=ok&&EndPagePrinter(h)&&EndDocPrinter(h);ClosePrinter(h);return ok;}}\n'@;$b=[Convert]::FromBase64String('${b}');$w=0;if(-not [RawPrinter]::Send('${safe}',$b,[ref]$w)){throw 'Windows RAW printer rejected the job'};Write-Output ('WRITTEN='+$w)`;
  return {...await psRun(ps),transport:'windows-raw',bytes:bytes.length,printerName};
}

ipcMain.handle('printer:list',()=>listWindowsPrinters());
ipcMain.handle('printer:bluetooth-send',(_e,{address,data})=>directBluetoothSend(address,data));
ipcMain.handle('printer:print',async(_e,{address,port,data,baudRate,printerName,transport='auto'})=>{
  if(transport==='direct-bluetooth'||address){const d=await directBluetoothSend(address,data);if(d.ok)return d;}
  if(transport!=='serial'&&printerName){const q=await queueSend(printerName,data);if(q.ok)return q;}
  return serialSend(port,data,baudRate);
});
ipcMain.handle('printer:test-serial',async(_e,{address,port,baudRate=460800,printerName})=>{
  const payload=Buffer.from([0x1b,0x40,0x4d,0x4b,0x20,0x50,0x49,0x5a,0x5a,0x41,0x20,0x50,0x4f,0x53,0x0a,0x59,0x44,0x38,0x30,0x31,0x20,0x42,0x4c,0x55,0x45,0x54,0x4f,0x4f,0x54,0x48,0x20,0x54,0x45,0x53,0x54,0x0a,0x0a]);
  if(address){const d=await directBluetoothSend(address,Array.from(payload));if(d.ok)return d;}
  if(printerName){const q=await queueSend(printerName,Array.from(payload));if(q.ok)return q;}
  return serialSend(port,Array.from(payload),baudRate);
});
ipcMain.handle('printer:print-raw',(_e,{printerName,data})=>queueSend(printerName,data));
ipcMain.handle('printer:print-html',async()=>({ok:false,reason:'html-print-disabled-use-raw'}));
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
