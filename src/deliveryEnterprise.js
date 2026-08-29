import {uid,today} from './posData';

export const DELIVERY_STATUSES=['NEW','CONFIRMED','PREPARING','READY','ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'];
export const DRIVER_STATUSES=['AVAILABLE','ASSIGNED','ON_DELIVERY','OFFLINE'];
export const createDeliveryZone=({name,fee=0,minOrder=0,active=true}={})=>({id:uid('ZONE'),name:name||'Delivery Zone',fee:Number(fee)||0,minOrder:Number(minOrder)||0,active});
export const deliveryFee=(zone,subtotal)=>Number(subtotal||0)>=Number(zone?.minOrder||0)?Number(zone?.fee||0):0;
export const createOnlineOrder=(data={})=>({id:data.id||uid('WEB'),orderNo:data.orderNo||`WEB-${Date.now().toString(36).toUpperCase()}`,source:data.source||'ONLINE',customerId:data.customerId||null,customerName:data.customerName||'',phone:data.phone||'',address:data.address||'',zoneId:data.zoneId||null,items:data.items||[],subtotal:Number(data.subtotal)||0,deliveryFee:Number(data.deliveryFee)||0,total:Number(data.total)||0,status:'NEW',paymentStatus:data.paymentStatus||'PENDING',createdAt:new Date().toISOString(),date:today()});
export const transitionDelivery=(order,status,user)=>{if(!DELIVERY_STATUSES.includes(status))return order;return{...order,status,updatedAt:new Date().toISOString(),updatedBy:user?.username||'system'}};
export const createDriver=({name,phone='',vehicle='',locationId='MAIN'}={})=>({id:uid('DRV'),name:name||'Driver',phone,vehicle,locationId,status:'AVAILABLE',active:true});
export const assignDriver=(order,driver,user)=>({...order,driverId:driver?.id||null,driverName:driver?.name||'',status:'ASSIGNED',assignedAt:new Date().toISOString(),assignedBy:user?.username||'system'});
export const driverStatus=(drivers,driverId,status)=>(drivers||[]).map(d=>d.id===driverId?{...d,status}:d);
export const availableDrivers=drivers=>(drivers||[]).filter(d=>d.active!==false&&d.status==='AVAILABLE');
export const deliveryQueue=orders=>(orders||[]).filter(o=>['NEW','CONFIRMED','PREPARING','READY','ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY'].includes(o.status)).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
export const dispatchSummary=orders=>{const q=deliveryQueue(orders);return{queued:q.length,new:q.filter(o=>o.status==='NEW').length,ready:q.filter(o=>o.status==='READY').length,assigned:q.filter(o=>o.status==='ASSIGNED').length,outForDelivery:q.filter(o=>o.status==='OUT_FOR_DELIVERY').length}};
export const deliveryEta=(order,minutes=30)=>{const base=new Date(order?.createdAt||Date.now());return new Date(base.getTime()+Math.max(0,Number(minutes)||0)*60000).toISOString()};
export const deliveryPerformance=(orders=[])=>{const done=orders.filter(o=>o.status==='DELIVERED'&&o.createdAt&&o.updatedAt);const avg=done.length?done.reduce((s,o)=>s+(new Date(o.updatedAt)-new Date(o.createdAt))/60000,0)/done.length:0;return{delivered:done.length,averageMinutes:Math.round(avg),cancelled:orders.filter(o=>o.status==='CANCELLED').length}};
