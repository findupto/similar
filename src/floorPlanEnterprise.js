import {uid} from './posData';

export const TABLE_STATES=['AVAILABLE','OCCUPIED','RESERVED','DIRTY','OUT_OF_SERVICE'];
export const createRestaurantTable=({name,zone='Main',x=0,y=0,width=90,height=70,capacity=4,state='AVAILABLE'}={})=>({id:uid('TBL'),name:name||'Table',zone,x,y,width,height,capacity,state,active:true,orderId:null,updatedAt:new Date().toISOString()});
export const setTableState=(tables,id,state,meta={})=>(tables||[]).map(t=>t.id===id?{...t,state,updatedAt:new Date().toISOString(),...meta}:t);
export const assignOrderToTable=(tables,tableId,orderId)=>(tables||[]).map(t=>t.id===tableId?{...t,orderId,state:'OCCUPIED',updatedAt:new Date().toISOString()}:t);
export const releaseTable=(tables,tableId)=>(tables||[]).map(t=>t.id===tableId?{...t,orderId:null,state:'DIRTY',updatedAt:new Date().toISOString()}:t);
export const mergeTables=(tables,tableIds,primaryId)=>{const ids=new Set(tableIds);return(tables||[]).map(t=>ids.has(t.id)?{...t,mergedInto:t.id===primaryId?null:primaryId,state:t.id===primaryId?'OCCUPIED':'OUT_OF_SERVICE',updatedAt:new Date().toISOString()}:t)};
export const splitTables=(tables,primaryId)=>{const ids=new Set([primaryId,...(tables||[]).filter(t=>t.mergedInto===primaryId).map(t=>t.id)]);return(tables||[]).map(t=>ids.has(t.id)?{...t,mergedInto:null,state:t.id===primaryId&&t.orderId?'OCCUPIED':'AVAILABLE',updatedAt:new Date().toISOString()}:t)};
export const tableMap=(tables,zone)=>({zones:[...new Set((tables||[]).filter(t=>t.active!==false).map(t=>t.zone))],tables:(tables||[]).filter(t=>t.active!==false&&(!zone||t.zone===zone))});
export const createReservation=({customerId,customerName='',date,time,partySize=2,tableId=null,note=''}={})=>({id:uid('RSV'),customerId,customerName,date,time,partySize:Number(partySize)||2,tableId,note,status:'CONFIRMED',createdAt:new Date().toISOString()});
export const reservationConflict=(reservations,{date,time,tableId,partySize}={})=>(reservations||[]).some(r=>r.status!=='CANCELLED'&&r.date===date&&r.time===time&&tableId&&r.tableId===tableId);
export const availableTables=(tables,reservations,{date,time,partySize=1}={})=>{const reserved=new Set((reservations||[]).filter(r=>r.status!=='CANCELLED'&&r.date===date&&r.time===time).map(r=>r.tableId));return(tables||[]).filter(t=>t.active!==false&&t.state==='AVAILABLE'&&!reserved.has(t.id)&&Number(t.capacity||0)>=Number(partySize||1))};
export const floorOrderContext=(table,customer=null)=>({tableId:table?.id||null,tableName:table?.name||'',zone:table?.zone||'',customerId:customer?.id||null,customerName:customer?.name||''});
