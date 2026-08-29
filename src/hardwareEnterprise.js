import {uid} from './posData';

export const DEVICE_TYPES=['BARCODE_SCANNER','RECEIPT_PRINTER','KITCHEN_PRINTER','CASH_DRAWER','CUSTOMER_DISPLAY','SCALE','PAYMENT_TERMINAL'];
export const DEVICE_STATES=['ONLINE','OFFLINE','ERROR','DISABLED'];
export const createDevice=({name,type,locationId='MAIN',connection='NETWORK',address='',model='',printerProfile=null}={})=>({id:uid('DEV'),name:name||type||'Device',type:type||'BARCODE_SCANNER',locationId,connection,address,model,printerProfile,status:'OFFLINE',enabled:true,lastSeenAt:null,createdAt:new Date().toISOString()});
export const updateDeviceStatus=(device,status,error='')=>({...device,status:DEVICE_STATES.includes(status)?status:'ERROR',error,statusAt:new Date().toISOString(),lastSeenAt:status==='ONLINE'?new Date().toISOString():device.lastSeenAt});
export const createPrinterProfile=({name='80mm Receipt',paperWidth=80,copies=1,charset='UTF-8',cut=true,openDrawer=false}={})=>({id:uid('PRN'),name,paperWidth:Number(paperWidth)||80,copies:Number(copies)||1,charset,cut,openDrawer,active:true});
export const createPrintRoute=({locationId='MAIN',documentType='RECEIPT',deviceId,backupDeviceId=null}={})=>({id:uid('ROUTE'),locationId,documentType,deviceId,backupDeviceId,active:true});
export const resolvePrinter=(routes=[],devices=[],locationId,documentType)=>{const r=routes.find(x=>x.active!==false&&x.locationId===locationId&&x.documentType===documentType);const primary=devices.find(d=>d.id===r?.deviceId&&d.enabled!==false&&d.status==='ONLINE');const backup=devices.find(d=>d.id===r?.backupDeviceId&&d.enabled!==false&&d.status==='ONLINE');return primary||backup||null};
export const createHardwareJob=({deviceId,type,payload,priority='NORMAL'}={})=>({id:uid('JOB'),deviceId,type,payload,priority,status:'QUEUED',createdAt:new Date().toISOString(),attempts:0});
export const updateHardwareJob=(job,status,error='')=>({...job,status,error,updatedAt:new Date().toISOString(),attempts:status==='ERROR'?Number(job.attempts||0)+1:Number(job.attempts||0)});
export const scanBarcode=(device,value)=>({id:uid('SCAN'),deviceId:device?.id,value:String(value||''),symbology:'AUTO',date:new Date().toISOString()});
export const cashDrawerCommand=(device,{action='OPEN',reason='SALE'}={})=>createHardwareJob({deviceId:device?.id,type:'CASH_DRAWER',payload:{action,reason}});
export const scaleReading=(device,{weight=0,unit='kg'}={})=>({id:uid('WGT'),deviceId:device?.id,weight:Number(weight)||0,unit,date:new Date().toISOString()});
export const customerDisplayPayload=sale=>({orderNo:sale?.orderNo||'',items:(sale?.items||[]).map(i=>({name:i.name,qty:i.qty,price:i.price})),subtotal:Number(sale?.subtotal||0),discount:Number(sale?.discount||0),tax:Number(sale?.tax||0),total:Number(sale?.total||0),updatedAt:new Date().toISOString()});
export const hardwareHealth=(devices=[])=>({total:devices.length,online:devices.filter(d=>d.status==='ONLINE').length,offline:devices.filter(d=>d.status==='OFFLINE').length,error:devices.filter(d=>d.status==='ERROR').length,disabled:devices.filter(d=>d.status==='DISABLED'||d.enabled===false).length});
export const deviceByLocation=(devices=[],locationId)=>devices.filter(d=>d.locationId===locationId&&d.enabled!==false);
