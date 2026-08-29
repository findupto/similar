import {uid} from './posData';

export const KITCHEN_ITEM_STATES=['QUEUED','PREPARING','READY','SERVED','VOID'];
export const KITCHEN_TICKET_STATES=['NEW','IN_PROGRESS','READY','BUMPED','RECALLED','VOID'];
export const createKitchenTicket=(order,items=order?.items||[])=>({id:uid('KIT'),orderId:order?.id||null,orderNo:order?.orderNo||order?.id||'',tableName:order?.tableName||order?.table||'',priority:order?.priority||'NORMAL',state:'NEW',createdAt:new Date().toISOString(),items:items.map(i=>({id:i.id||uid('KITM'),productId:i.productId,name:i.name||i.productName,qty:Number(i.qty||0),station:i.station||'MAIN',notes:i.notes||'',state:'QUEUED',startedAt:null,readyAt:null}))});
export const setKitchenItemState=(ticket,itemId,state)=>({...ticket,items:(ticket.items||[]).map(i=>i.id===itemId?{...i,state,startedAt:state==='PREPARING'?(i.startedAt||new Date().toISOString()):i.startedAt,readyAt:state==='READY'?new Date().toISOString():i.readyAt}:i),state:(ticket.items||[]).every(i=>i.state==='SERVED')?'BUMPED':(ticket.items||[]).some(i=>i.state==='PREPARING')?'IN_PROGRESS':(ticket.items||[]).every(i=>i.state==='READY'||i.state==='SERVED')?'READY':ticket.state});
export const setKitchenTicketState=(ticket,state)=>({...ticket,state,updatedAt:new Date().toISOString()});
export const bumpTicket=ticket=>setKitchenTicketState(ticket,'BUMPED');
export const recallTicket=ticket=>setKitchenTicketState(ticket,'RECALLED');
export const routeByStation=(ticket,station)=>({...ticket,items:(ticket.items||[]).filter(i=>!station||i.station===station)});
export const kitchenQueues=(tickets,station)=>{const rows=(tickets||[]).filter(t=>!station||t.items?.some(i=>i.station===station));return{new:rows.filter(t=>t.state==='NEW'),preparing:rows.filter(t=>t.state==='IN_PROGRESS'),ready:rows.filter(t=>t.state==='READY'),recalled:rows.filter(t=>t.state==='RECALLED')}};
export const ticketElapsedMinutes=(ticket,now=new Date())=>Math.max(0,Math.floor((new Date(now)-new Date(ticket?.createdAt||now))/60000));
export const kitchenPerformance=(tickets=[],now=new Date())=>{const done=tickets.filter(t=>t.state==='BUMPED'&&t.createdAt);const avg=done.length?done.reduce((s,t)=>s+ticketElapsedMinutes(t,now),0)/done.length:0;return{tickets:tickets.length,completed:done.length,averageMinutes:Math.round(avg),active:tickets.filter(t=>['NEW','IN_PROGRESS','READY','RECALLED'].includes(t.state)).length,highPriority:tickets.filter(t=>t.priority==='HIGH'&&t.state!=='BUMPED').length}};
export const overdueTickets=(tickets,thresholdMinutes=15,now=new Date())=>(tickets||[]).filter(t=>!['BUMPED','VOID'].includes(t.state)&&ticketElapsedMinutes(t,now)>=Number(thresholdMinutes));
export const priorityTicket=(ticket,priority='NORMAL')=>({...ticket,priority:priority==='HIGH'||priority==='LOW'?priority:'NORMAL'});
