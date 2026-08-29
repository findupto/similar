import {uid,today} from './posData';

export const ORDER_STATUSES=['DRAFT','OPEN','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED','REFUNDED','PARTIAL_REFUND'];
export const createOrder=(data={})=>({id:data.id||uid('ORD'),orderNo:data.orderNo||`ORD-${Date.now().toString(36).toUpperCase()}`,status:data.status||'OPEN',source:data.source||'POS',locationId:data.locationId||'MAIN',registerId:data.registerId||null,tableId:data.tableId||null,customerId:data.customerId||null,items:data.items||[],subtotal:Number(data.subtotal)||0,tax:Number(data.tax)||0,discount:Number(data.discount)||0,total:Number(data.total)||0,payments:data.payments||[],notes:data.notes||'',createdAt:data.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});
export const transitionOrder=(order,status,user,reason='')=>ORDER_STATUSES.includes(status)?{...order,status,updatedAt:new Date().toISOString(),updatedBy:user?.username||'system',statusReason:reason}:order;
export const editOrder=(order,patch,user)=>({...order,...patch,updatedAt:new Date().toISOString(),updatedBy:user?.username||'system'});
export const cancelOrder=(order,reason,user)=>transitionOrder(order,'CANCELLED',user,reason||'Cancelled');
export const returnOrder=(order,{items=[],reason='Return',user}={})=>({...order,id:uid('RET'),orderNo:`RET-${Date.now().toString(36).toUpperCase()}`,originalOrderId:order.id,status:'REFUNDED',items,returnReason:reason,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),updatedBy:user?.username||'system'});
export const parkOrder=(order,user)=>({...order,status:'DRAFT',parked:true,parkedAt:new Date().toISOString(),parkedBy:user?.username||'system'});
export const unparkOrder=order=>({...order,parked:false,status:'OPEN',updatedAt:new Date().toISOString()});
export const orderTimeline=(order,audit=[])=>audit.filter(a=>a.orderId===order.id).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
export const orderAudit=(order,action,user,meta={})=>({id:uid('OAUD'),orderId:order.id,action,date:new Date().toISOString(),by:user?.username||'system',...meta});
export const searchOrders=(orders,query='')=>{const q=String(query).trim().toLowerCase();return(orders||[]).filter(o=>!q||[o.orderNo,o.customerName,o.phone,o.status,o.source].some(v=>String(v||'').toLowerCase().includes(q)))};
export const orderSummary=(orders=[])=>orders.reduce((a,o)=>{a.orders++;a.revenue+=Number(o.total||0);a.cancelled+=o.status==='CANCELLED'?1:0;a.refunded+=o.status==='REFUNDED'||o.status==='PARTIAL_REFUND'?1:0;return a},{orders:0,revenue:0,cancelled:0,refunded:0});
export const itemReturnQty=(original,returns=[])=>Math.max(0,Number(original?.qty||0)-returns.reduce((s,r)=>s+Number(r.qty||0),0));
