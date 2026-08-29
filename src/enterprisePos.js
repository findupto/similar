import {uid,today,money} from './posData';

/** Enterprise POS utilities: barcode intake, drawer events, payment validation and stock-safe checkout helpers. */
export const PAYMENT_METHODS=['Cash','Card','Bank','Store Credit'];
export const normalizeBarcode=value=>String(value??'').trim();
export const findScannedProduct=(products,code)=>{const q=normalizeBarcode(code).toLowerCase();if(!q)return null;return products.find(p=>p.active&&((p.barcode&&String(p.barcode).toLowerCase()===q)||(p.sku&&String(p.sku).toLowerCase()===q)))||null};
export const allocatePayments=(total,payments)=>{const clean=(payments||[]).filter(p=>PAYMENT_METHODS.includes(p.method)&&Number(p.amount)>0).map(p=>({...p,amount:Number(p.amount)}));const paid=clean.reduce((a,p)=>a+p.amount,0);return{payments:clean,paid,remaining:Math.max(0,Number(total||0)-paid),change:Math.max(0,paid-Number(total||0)),balanced:Math.abs(paid-Number(total||0))<0.005};};
export const recordDrawerEvent=(state,{type,amount=0,note='',user})=>({...state,drawerEvents:[...(state.drawerEvents||[]),{id:uid('DRAW'),date:today(),timestamp:new Date().toISOString(),type,amount:Number(amount)||0,note,by:user?.username||'system'}],audit:[...(state.audit||[]),{id:uid('AUD'),date:today(),action:`Cash drawer ${type}${amount?` ${money(amount)}`:''}${note?` — ${note}`:''}`,by:user?.username||'system'}]});
export const expectedDrawerCash=(state,openingCash=0)=>Number(openingCash||0)+(state.sales||[]).reduce((sum,s)=>sum+(s.payments||[]).filter(p=>p.method==='Cash').reduce((a,p)=>a+Number(p.amount||0),0),0)-(state.drawerEvents||[]).filter(e=>['PAID_OUT','DROP'].includes(e.type)).reduce((a,e)=>a+Number(e.amount||0),0)+(state.drawerEvents||[]).filter(e=>e.type==='PAID_IN').reduce((a,e)=>a+Number(e.amount||0),0);
export const buildDrawerSession=(user,openingCash=0)=>({id:uid('DRAWER'),user:user.username,openedAt:new Date().toISOString(),openingCash:Number(openingCash)||0,status:'OPEN'});
