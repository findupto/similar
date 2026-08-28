import './salesAudit';
import {logPrint} from './printHistory';

const KEY='mkpos:printer-config-v3';
const VERSION=3;
export const RECEIPT_THEMES={modern:{name:'Modern Professional',width:24},classic:{name:'Classic Restaurant',width:24},minimal:{name:'Minimal Clean',width:24},kitchen:{name:'Kitchen Bold',width:24},compact:{name:'Compact Clean',width:24}};
export const YD801_PROFILE={model:'YD801',version:'YC1.12.03 2026-04-22HBb',dots:192,font:'12x24',codepage:'GB2312',baudRate:460800,heatTime:'950,150',heatDensity:'Normal',feedLine:'LF (0A)',bluetoothName:'B11-70604273',bluetoothAddress:'66:22:BE:5B:40:F6',bluetoothVersion:'583-B',maxFeed:'20mm'};
const defaults=()=>({version:VERSION,profile:YD801_PROFILE,customer:null,kitchen:null,theme:'modern',footer:'Thank you for your order!',kitchenFooter:'PREPARE ORDER',lastDiagnostic:null});
const cfg=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v?.version===VERSION?{...defaults(),...v}:defaults()}catch{return defaults()}};
const save=v=>{const n={...defaults(),...v,version:VERSION,profile:YD801_PROFILE};localStorage.setItem(KEY,JSON.stringify(n));return n};
const text=(v='')=>String(v).replace(/[\r\n]+/g,' ').trim(),cut=(v,w)=>text(v).slice(0,w),pad=(v,w)=>text(v).slice(0,w).padEnd(w),right=(v,w)=>text(v).slice(0,w).padStart(w),line=(w=24)=>'-'.repeat(w)+'\r\n',money=v=>Number(v||0).toFixed(2);
const E={init:'\x1b\x40',left:'\x1b\x61\x00',center:'\x1b\x61\x01',bold:'\x1b\x45\x01',normal:'\x1b\x45\x00',big:'\x1b\x21\x10',normalSize:'\x1b\x21\x00',feed:'\x0a\x0a'};
const encode=v=>Array.from(new TextEncoder().encode(String(v||'').replace(/[^\x00-\x7F]/g,'?')));
function header(business,address,phone){let o=E.init+E.center+E.bold+E.big+cut(business,24)+'\r\n'+E.normal+E.normalSize;if(address)o+=cut(address,24)+'\r\n';if(phone)o+=cut(phone,24)+'\r\n';return o+E.left}
function itemsBlock(items){let o='';for(const i of items||[]){const qty=String(i.qty??1),name=cut(i.variant?`${i.name} · ${i.variant}`:i.name,17),amt=money(i.total??Number(i.price||0)*Number(i.qty||1));o+=pad(qty+' x '+name,17)+right(amt,7)+'\r\n'}return o}
function receipt({business,address,phone,invoice,date,customer,orderType,info,items,subtotal,discount=0,total,method,paid,change,footer}){let o=header(business,address,phone);o+=E.center+E.bold+cut(orderType||'ORDER',24)+'\r\n'+E.normal+E.normalSize+E.left+line();o+=pad('Invoice:',16)+right(invoice,8)+'\r\n'+pad('Date:',16)+right(date,8)+'\r\n';if(customer)o+=pad('Customer:',16)+right(cut(customer,8),8)+'\r\n';if(info)o+=pad('Info:',16)+right(cut(info,8),8)+'\r\n';o+=line()+pad('QTY ITEM',17)+right('AMT',7)+'\r\n'+line()+itemsBlock(items)+line()+pad('Subtotal',17)+right(money(subtotal),7)+'\r\n'+pad('Discount',17)+right(money(discount),7)+'\r\n'+E.bold+pad('TOTAL',17)+right(money(total),7)+'\r\n'+E.normal+line()+pad('Payment',17)+right(method||'',7)+'\r\n'+pad('Paid',17)+right(money(paid),7)+'\r\n'+pad('Change',17)+right(money(change),7)+'\r\n'+line()+E.center+E.bold+cut(footer||'Thank you for your order!',24)+'\r\n'+E.normal+E.feed;return o}
function kitchen({business,address,invoice,date,customer,orderType,info,items,footer}){let o=header(business,address,'');o+=E.center+E.bold+cut(orderType||'ORDER',24)+'\r\n'+E.normal+E.normalSize+E.left+line()+pad('ORDER #',16)+right(invoice,8)+'\r\n'+pad('TIME',16)+right(date,8)+'\r\n';if(customer)o+=pad('CUSTOMER',16)+right(cut(customer,8),8)+'\r\n';if(info)o+=pad('INFO',16)+right(cut(info,8),8)+'\r\n';o+=line()+E.bold+E.big+'ITEMS TO PREPARE\r\n'+E.normal+E.normalSize+line();for(const i of items||[])o+=E.bold+E.big+String(i.qty??1).padStart(2)+' x '+cut(i.variant?`${i.name} · ${i.variant}`:i.name,21)+'\r\n'+E.normal+E.normalSize+'\r\n';return o+line()+E.center+E.bold+(footer||'PREPARE ORDER')+'\r\n'+E.normal+E.feed}
function cleanPrinter(p,role){return {...p,role,name:'YD801',description:'YD801 Bluetooth SPP',bluetoothName:YD801_PROFILE.bluetoothName,bluetoothAddress:YD801_PROFILE.bluetoothAddress,baudRate:460800,profile:YD801_PROFILE,transport:'auto',transportPort:p?.transportPort||'',port:p?.transportPort||p?.port||'',printerName:p?.printerName||''}}
async function send(data,p){const printer=cleanPrinter(p,'customer');if(!window.mkPosDesktop?.printEscPos)return{ok:false,error:'Desktop printer service unavailable'};return window.mkPosDesktop.printEscPos({address:printer.bluetoothAddress,port:printer.transportPort||printer.port,data:encode(data),baudRate:460800,printerName:printer.printerName,transport:'auto'})}
export const PrinterBridge={
 async discover(){try{const rows=await window.mkPosDesktop?.discoverPrinters?.()||[];return rows.map(x=>cleanPrinter(x,x.type==='Windows Printer'?'customer':'customer'))}catch{return[]}},
 async reconnect(){const c=cfg();return c.customer||c.kitchen||null},
 async connect(printer,role='customer'){const v=cleanPrinter(printer,role);const c=cfg();c[role]=v;save(c);return v},
 async disconnect(role){const c=cfg();c[role]=null;return save(c)},
 async test(printer){const p=cleanPrinter(printer||cfg().customer||{},'customer');if(!window.mkPosDesktop?.testSerial)return{ok:false,error:'Desktop printer transport unavailable'};const r=await window.mkPosDesktop.testSerial({address:p.bluetoothAddress,port:p.transportPort||p.port,baudRate:460800,printerName:p.printerName,allPorts:true});save({...cfg(),lastDiagnostic:r});return r},
 async print(r,p){const c=cfg(),x=p||c.customer,out=await send(receipt({...r,footer:c.footer}),x);if(out?.ok)logPrint('customer',r);return out},
 async printCustomer(r,p){return this.print(r,p)},
 async printKitchen(o,p){const c=cfg(),x=p||c.kitchen,out=await send(kitchen({...o,footer:c.kitchenFooter}),x);if(out?.ok)logPrint('kitchen',o);return out},
 saveConfig(patch){return save({...cfg(),...patch})},
 getConfig(){return cfg()},
 getProfile(){return YD801_PROFILE},
 reset(){localStorage.removeItem(KEY);return defaults()},
 setTheme(theme){return save({...cfg(),theme:RECEIPT_THEMES[theme]?theme:'modern'}).theme},
 getTheme(){return cfg().theme||'modern'}
};
