const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
let win;
let BluetoothSerialPort;
try { ({ BluetoothSerialPort } = require('bluetooth-serial-port')); } catch (e) { BluetoothSerialPort = null; }

function psJson(script){return new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',script],{windowsHide:true,timeout:12000},(err,stdout)=>{if(err)return resolve([]);try{resolve(JSON.parse(stdout||'[]'))}catch{resolve([])}}))}
function psRun(script,timeout=15000){return new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',script],{windowsHide:true,timeout},(err,stdout,stderr)=>resolve({ok:!err,error:err?.message||String(stderr||'')||null,stdout:String(stdout||'')})))}

async function listWindowsPrinters(){
  if(process.platform!=='win32') return [];
  const ps=`$items=@();try{$items+=@(Get-CimInstance Win32_SerialPort|%{[pscustomobject]@{id=$_.DeviceID;name=$_.Name;description=$_.Description;port=$_.DeviceID;transportPort=$_.DeviceID;type='COM / Bluetooth SPP'}})}catch{};try{$items+=@(Get-Printer|%{[pscustomobject]@{id=$_.Name;name=$_.Name;description=$_.DriverName;port=$_.PortName;transportPort=if($_.PortName -match '^COM\\d+$'){$_.PortName}else{''};type='Windows Printer';printerName=$_.Name}})}catch{};try{$bt=@(Get-PnpDevice -Class Bluetooth -PresentOnly|?{$_.FriendlyName -match 'B11-70604273|YD801'}|%{[pscustomobject]@{id=$_.InstanceId;name=$_.FriendlyName;description=$_.Status;port='Bluetooth';transportPort='';type='Bluetooth Device';bluetoothName=$_.FriendlyName}});$items+=$bt}catch{};$items|ConvertTo-Json -Compress;`;
  const data=await psJson(ps);const rows=Array.isArray(data)?data:(data&&(data.id||data.name)?[data]:[]);const seen=new Set();return rows.filter(x=>{const k=`${x.id}|${x.port}|${x.type}`;if(seen.has(k))return false;seen.add(k);return true});
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
function directBluetoothSend(address,data,channelOverride=null){
  return new Promise((resolve)=>{
    if(process.platform!=='win32'||!BluetoothSerialPort)return resolve({ok:false,transport:'bluetooth-direct',error:'Direct Bluetooth SPP module is unavailable'});
    const mac=normalizeAddress(address);if(!/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(mac))return resolve({ok:false,transport:'bluetooth-direct',error:'Invalid Bluetooth address'});
    const serial=new BluetoothSerialPort();let done=false;
    const finish=(r)=>{if(done)return;done=true;try{serial.close?.()}catch{};resolve(r)};
    const timer=setTimeout(()=>finish({ok:false,transport:'bluetooth-direct',error:'Bluetooth SPP connection timeout'}),12000);
    const fail=(e)=>{clearTimeout(timer);finish({ok:false,transport:'bluetooth-direct',error:String(e?.message||e||'Bluetooth SPP connection failed')})};
    const connect=(channel)=>{try{serial.connect(mac,channel,()=>{const buf=Buffer.from(Array.isArray(data)?data:data instanceof Buffer?data:Buffer.from(String(data),'binary'));serial.write(buf,(err,written)=>{if(err)return fail(err);setTimeout(()=>finish({ok:true,transport:'bluetooth-direct',channel,bytes:Number(written)||buf.length}),650)});},fail)}catch(e){fail(e)}};
    try{
      if(Number.isInteger(channelOverride)){connect(channelOverride);return;}
      serial.findSerialPortChannel(mac,(channel)=>connect(Number(channel)||1),()=>connect(1));
    }catch(e){clearTimeout(timer);fail(e)}
  });
}

function safePort(v){const p=String(v||'').trim().toUpperCase();return /^COM\d+$/.test(p)?p:null}
async function getComPorts(){
  if(process.platform!=='win32')return[];
  const data=await psJson(`@(Get-CimInstance Win32_SerialPort|%{$_.DeviceID})|ConvertTo-Json -Compress`);
  const rows=Array.isArray(data)?data:(data?[data]:[]);return rows.map(s=>safePort(s)).filter(Boolean);
}
async function serialSend(port,data,baudRate=460800){
  const p=safePort(port);if(!p)return{ok:false,transport:'bluetooth-spp',error:'No COM port selected'};
  const bytes=Array.isArray(data)?data:Array.from(Buffer.from(String(data),'binary'));const b=Buffer.from(bytes).toString('base64');const safe=p.replace(/'/g,"''");const rate=Number(baudRate)||460800;
  const script=`$b=[Convert]::FromBase64String('${b}');$p=New-Object System.IO.Ports.SerialPort '${safe}',${rate},None,8,one;$p.Handshake=[System.IO.Ports.Handshake]::None;$p.DtrEnable=$false;$p.RtsEnable=$false;$p.WriteTimeout=5000;$p.ReadTimeout=1000;$p.Open();try{$p.DiscardInBuffer();$p.DiscardOutBuffer();$p.Write($b,0,$b.Length);$p.BaseStream.Flush();Start-Sleep -Milliseconds 700}finally{if($p.IsOpen){$p.Close();$p.Dispose()}};Write-Output 'SENT'`;
  const r=await psRun(script,10000);return{...r,transport:'bluetooth-spp',bytes:bytes.length,port:p,baudRate:rate};
}

async function queueSend(printerName,data){
  if(!printerName)return{ok:false,error:'No Windows printer queue selected',transport:'windows-raw'};
  const bytes=Array.isArray(data)?data:Array.from(Buffer.from(String(data),'binary'));const b=Buffer.from(bytes).toString('base64');const safe=String(printerName).replace(/'/g,"''");
  const ps=`Add-Type -TypeDefinition @'\nusing System;using System.Runtime.InteropServices;public class RawPrinter{[StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]public class DOCINFO{public string pDocName;public string pOutputFile;public string pDataType;}[DllImport("winspool.drv",EntryPoint="OpenPrinterW",SetLastError=true,CharSet=CharSet.Unicode)]public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr p);[DllImport("winspool.drv",SetLastError=true)]public static extern bool ClosePrinter(IntPtr h);[DllImport("winspool.drv",CharSet=CharSet.Unicode,SetLastError=true)]public static extern bool StartDocPrinter(IntPtr h,int l,DOCINFO d);[DllImport("winspool.drv",SetLastError=true)]public static extern bool EndDocPrinter(IntPtr h);[DllImport("winspool.drv",SetLastError=true)]public static extern bool StartPagePrinter(IntPtr h);[DllImport("winspool.drv",SetLastError=true)]public static extern bool EndPagePrinter(IntPtr h);[DllImport("winspool.drv",SetLastError=true)]public static extern bool WritePrinter(IntPtr h,byte[] b,int c,out int w);public static bool Send(string n,byte[] b,out int w){w=0;IntPtr h;if(!OpenPrinter(n,out h,IntPtr.Zero))return false;var d=new DOCINFO();d.pDocName="MK Pizza POS RAW";d.pDataType="RAW";bool ok=StartDocPrinter(h,1,d)&&StartPagePrinter(h);ok=ok&&WritePrinter(h,b,b.Length,out w);ok=ok&&EndPagePrinter(h)&&EndDocPrinter(h);ClosePrinter(h);return ok;}}\n'@;$b=[Convert]::FromBase64String('${b}');$w=0;if(-not [RawPrinter]::Send('${safe}',$b,[ref]$w)){throw 'Windows RAW printer rejected the job'};Write-Output ('WRITTEN='+$w)`;
  return {...await psRun(ps),transport:'windows-raw',bytes:bytes.length,printerName};
}

function testPayload(label){return Array.from(Buffer.from([0x1b,0x40,...Buffer.from('MK PIZZA POS\r\n','ascii'),...Buffer.from(`YD801 ${label}\r\n`,'ascii'),0x0a,0x0a]))}

ipcMain.handle('printer:list',()=>listWindowsPrinters());
ipcMain.handle('printer:bluetooth-send',(_e,{address,data,channel})=>directBluetoothSend(address,data,channel));
ipcMain.handle('printer:print',async(_e,{address,port,data,baudRate,printerName,transport='auto'})=>{
  const errors=[];
  if(transport!=='serial'&&address){for(const ch of [null,1]){const d=await directBluetoothSend(address,data,ch);if(d.ok)return d;errors.push(d.error)}}
  if(transport!=='serial'&&printerName){const q=await queueSend(printerName,data);if(q.ok)return q;errors.push(q.error)}
  const ports=[port,...await getComPorts()].map(safePort).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
  for(const p of ports){const r=await serialSend(p,data,baudRate);if(r.ok)return r;errors.push(`${p}: ${r.error||'failed'}`)}
  return{ok:false,transport:'none',error:errors.filter(Boolean).join(' | ')||'All printer transports failed'};
});
ipcMain.handle('printer:test-serial',async(_e,{address,port,baudRate=460800,printerName,allPorts=false})=>{
  const results=[];
  if(address){for(const ch of [null,1]){const r=await directBluetoothSend(address,testPayload(ch===null?'DIRECT':'CHANNEL-1'),ch);results.push(r);if(r.ok&&!allPorts)return{...r,diagnostics:results}}}
  if(printerName){const q=await queueSend(printerName,testPayload('WINDOWS-RAW'));results.push(q);if(q.ok&&!allPorts)return{...q,diagnostics:results}}
  const ports=[port,...await getComPorts()].map(safePort).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
  for(const p of ports){const r=await serialSend(p,testPayload(`COM-${p}`),baudRate);results.push(r);if(r.ok&&!allPorts)return{...r,diagnostics:results}}
  return{ok:false,transport:'diagnostic',error:'No transport reported a failed write without error. Test outputs were sent to all available methods.',diagnostics:results};
});
ipcMain.handle('printer:print-raw',(_e,{printerName,data})=>queueSend(printerName,data));
ipcMain.handle('printer:print-html',async()=>({ok:false,reason:'html-print-disabled-use-raw'}));
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});