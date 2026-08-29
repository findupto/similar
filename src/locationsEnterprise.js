import {uid,today} from './posData';

export const createLocation=({name,address='',code='',timezone='local',currency='USD',active=true}={})=>({id:uid('LOC'),name:name||'New Location',code:code||`LOC-${Date.now().toString(36).toUpperCase()}`,address,timezone,currency,active});
export const activeLocations=locations=>(locations||[]).filter(l=>l.active!==false);
export const locationStock=(lots,locationId)=> (lots||[]).filter(l=>(l.locationId||'MAIN')===locationId).reduce((a,l)=>a+Math.max(0,Number(l.quantity||0)),0);
export const branchPrice=(prices,productId,locationId,fallback)=>{const hit=(prices||[]).find(p=>p.productId===productId&&p.locationId===locationId&&p.active!==false);return hit?.price??fallback};
export const setBranchPrice=(prices,{productId,locationId,price,user})=>[...(prices||[]).filter(p=>!(p.productId===productId&&p.locationId===locationId)),{id:uid('PRICE'),productId,locationId,price:Number(price)||0,active:true,updatedAt:new Date().toISOString(),by:user?.username||'system'}];
export const branchMenu=(menu,locationId)=> (menu||[]).filter(m=>(m.locationId===locationId||m.locationId==='*')&&m.active!==false);
export const transferRequest=({productId,quantity,fromLocation,toLocation,note='',user})=>({id:uid('TRF'),date:today(),productId,quantity:Number(quantity)||0,fromLocation,toLocation,note,status:'PENDING',requestedBy:user?.username||'system',requestedAt:new Date().toISOString()});
export const approveTransfer=(request,user)=>({...request,status:'APPROVED',approvedBy:user?.username||'system',approvedAt:new Date().toISOString()});
export const rejectTransfer=(request,user,reason='')=>({...request,status:'REJECTED',rejectedBy:user?.username||'system',rejectedAt:new Date().toISOString(),reason});
export const branchSummary=(state,locationId)=>{const sales=(state.sales||[]).filter(s=>(s.locationId||'MAIN')===locationId);const revenue=sales.reduce((a,s)=>a+Number(s.total||0),0);return{locationId,salesCount:sales.length,revenue,stockUnits:locationStock(state.lots||[],locationId),pendingTransfers:(state.transfers||[]).filter(t=>(t.fromLocation===locationId||t.toLocation===locationId)&&t.status==='PENDING').length};};
export const locationAudit=(state,locationId)=>[...(state.audit||[])].filter(a=>a.locationId===locationId||a.locationId==null);
