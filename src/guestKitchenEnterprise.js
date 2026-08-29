import {uid,today} from './posData';

export const KITCHEN_STATUSES=['NEW','ACCEPTED','PREPARING','READY','SERVED','VOID'];
export const KITCHEN_STATIONS=['GRILL','FRY','BAR','DESSERT','COLD','PACK'];
export const routeStation=item=>item.station||item.categoryStation||'PACK';
export const createKitchenTicket=(sale,items=[])=>({id:uid('KIT'),saleId:sale.id,orderNo:sale.orderNo||sale.id,date:today(),createdAt:new Date().toISOString(),table:sale.table||'',customer:sale.customer||'',priority:sale.priority||'NORMAL',status:'NEW',items:items.map(i=>({...i,status:'NEW',station:routeStation(i)}))});
export const setTicketStatus=(ticket,status,user)=>({ ...ticket,status,updatedAt:new Date().toISOString(),updatedBy:user?.username||'system',items:(ticket.items||[]).map(i=>i.status==='VOID'?i:{...i,status})});
export const setItemStatus=(ticket,itemId,status,user)=>({...ticket,items:(ticket.items||[]).map(i=>i.id===itemId?{...i,status,updatedAt:new Date().toISOString(),updatedBy:user?.username||'system'}:i),updatedAt:new Date().toISOString()});
export const stationTickets=(tickets,station,status)=> (tickets||[]).filter(t=>(!status||t.status===status)&&(t.items||[]).some(i=>i.station===station&&i.status!=='SERVED'&&i.status!=='VOID'));
export const customerDisplay=(sale)=>({orderNo:sale?.orderNo||sale?.id||'',items:(sale?.items||[]).map(i=>({name:i.name||i.productName,qty:i.qty,price:i.price})),subtotal:Number(sale?.subtotal||0),discount:Number(sale?.discount||0),tax:Number(sale?.tax||0),total:Number(sale?.total||0),status:sale?.status||'IN PROGRESS'});
export const prepProgress=ticket=>{const active=(ticket?.items||[]).filter(i=>i.status!=='VOID');if(!active.length)return 100;const done=active.filter(i=>['READY','SERVED'].includes(i.status)).length;return Math.round(done/active.length*100)};
export const printerRoute=(item,routes={})=>routes[routeStation(item)]||routes.default||null;
export const orderRouting=(sale,routes)=> (sale.items||[]).map(item=>({...item,station:routeStation(item),printer:printerRoute(item,routes)}));
