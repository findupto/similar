import {uid} from './posData';

export const ORDER_CHANNELS=['POS','ONLINE','QR','PHONE','DELIVERY','PICKUP'];
export const DELIVERY_STATUSES=['PENDING','CONFIRMED','PREPARING','READY','ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'];
export const createDeliveryZone=({name='Zone',fee=0,minOrder=0,postalCodes=[],active=true}={})=>({id:uid('ZONE'),name,fee:Number(fee)||0,minOrder:Number(minOrder)||0,postalCodes,active});
export const createOmnichannelOrder=(data={})=>({id:data.id||uid('OCH'),orderNo:data.orderNo||`WEB-${Date.now().toString(36).toUpperCase()}`,channel:data.channel||'ONLINE',fulfillment:data.fulfillment||'PICKUP',customerId:data.customerId||null,customer:data.customer||null,items:data.items||[],subtotal:Number(data.subtotal)||0,deliveryFee:Number(data.deliveryFee)||0,tax:Number(data.tax)||0,discount:Number(data.discount)||0,total:Number(data.total)||0,address:data.address||null,scheduledAt:data.scheduledAt||null,status:data.status||'PENDING',deliveryStatus:data.fulfillment==='DELIVERY'?'PENDING':null,driverId:null,createdAt:new Date().toISOString()});
export const deliveryZoneFor=(zones=[],postalCode='')=>(zones||[]).find(z=>z.active!==false&&(z.postalCodes||[]).map(String).includes(String(postalCode)));
export const calculateDelivery=(order,zone)=>{const fee=Number(zone?.fee||0);return{...order,deliveryFee:order.fulfillment==='DELIVERY'?fee:0,total:Number(order.subtotal||0)+Number(order.tax||0)-Number(order.discount||0)+(order.fulfillment==='DELIVERY'?fee:0)}};
export const updateDeliveryStatus=(order,status,user)=>DELIVERY_STATUSES.includes(status)?{...order,deliveryStatus:status,status:status==='DELIVERED'?'COMPLETED':status==='CANCELLED'?'CANCELLED':order.status,updatedAt:new Date().toISOString(),updatedBy:user?.username||'system'}:order;
export const assignDriver=(order,driverId,user)=>({...order,driverId,deliveryStatus:'ASSIGNED',assignedAt:new Date().toISOString(),assignedBy:user?.username||'system'});
export const createDriver=(data={})=>({id:uid('DRV'),name:data.name||'Driver',phone:data.phone||'',vehicle:data.vehicle||'',status:'AVAILABLE',active:true});
export const driverStatus=(driver,status)=>({...driver,status,updatedAt:new Date().toISOString()});
export const qrOrderSession=({tableId=null,locationId='MAIN',expiresMinutes=30}={})=>({id:uid('QR'),tableId,locationId,token:uid('TOKEN'),expiresAt:new Date(Date.now()+expiresMinutes*60000).toISOString(),active:true});
export const qrSessionValid=(session,now=new Date())=>Boolean(session?.active&&new Date(session.expiresAt)>now);
export const unifiedOrders=(...sources)=>sources.flat().sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
export const channelSummary=(orders=[])=>Object.values(orders.reduce((a,o)=>{const k=o.channel||'POS';a[k]??={channel:k,orders:0,revenue:0};a[k].orders++;a[k].revenue+=Number(o.total||0);return a},{}));
export const dispatchQueue=(orders=[])=>orders.filter(o=>o.fulfillment==='DELIVERY'&&['READY','ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY'].includes(o.deliveryStatus)).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
export const pickupQueue=(orders=[])=>orders.filter(o=>o.fulfillment==='PICKUP'&&['READY','CONFIRMED','PREPARING'].includes(o.status)).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
