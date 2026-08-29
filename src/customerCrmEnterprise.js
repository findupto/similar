import {uid,today} from './posData';

export const CUSTOMER_SEGMENTS=['NEW','REGULAR','VIP','INACTIVE'];
export const createCustomerProfile=(data={})=>({id:data.id||uid('CUS'),name:data.name||'New Customer',phone:data.phone||'',email:data.email||'',birthday:data.birthday||'',address:data.address||'',notes:data.notes||'',preferences:data.preferences||{},tags:data.tags||[],segment:data.segment||'NEW',marketingConsent:data.marketingConsent===true,createdAt:data.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),active:data.active!==false});
export const updateCustomer=(customer,patch={})=>({...customer,...patch,updatedAt:new Date().toISOString()});
export const customerHistory=(sales,customerId)=>(sales||[]).filter(s=>s.customerId===customerId).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
export const customerMetrics=(sales,customerId)=>{const orders=customerHistory(sales,customerId),revenue=orders.reduce((a,s)=>a+Number(s.total||0),0);return{orders:orders.length,revenue,averageOrder:orders.length?revenue/orders.length:0,lastOrder:orders[0]?.date||null}};
export const segmentCustomer=(metrics)=>{if(!metrics.orders)return'NEW';if(metrics.revenue>=1000||metrics.orders>=20)return'VIP';if(metrics.orders>=3)return'REGULAR';return'NEW'};
export const inactiveCustomers=(customers,sales,days=90,now=new Date())=>(customers||[]).filter(c=>{const last=customerHistory(sales,c.id)[0]?.date;if(!last)return true;return((new Date(now)-new Date(last))/86400000)>Number(days)});
export const searchCustomers=(customers,query='')=>{const q=String(query).trim().toLowerCase();return(customers||[]).filter(c=>!q||[c.name,c.phone,c.email,...(c.tags||[])].some(v=>String(v||'').toLowerCase().includes(q)))};
export const addCustomerNote=(customer,note,user)=>updateCustomer(customer,{notes:[...(Array.isArray(customer.notes)?customer.notes:customer.notes?[{text:customer.notes}]:[]),{id:uid('NOTE'),text:String(note||''),date:today(),by:user?.username||'system'}]});
export const addCustomerTag=(customer,tag)=>updateCustomer(customer,{tags:[...new Set([...(customer.tags||[]),String(tag).trim()])].filter(Boolean)});
export const communicationAllowed=customer=>customer?.marketingConsent===true;
export const targetedCustomers=(customers,{segment,tags=[],birthdayMonth,consentedOnly=true}={})=>(customers||[]).filter(c=>(!consentedOnly||communicationAllowed(c))&&(!segment||c.segment===segment)&&(!tags.length||tags.some(t=>(c.tags||[]).includes(t)))&&(!birthdayMonth||String(c.birthday||'').slice(5,7)===String(birthdayMonth).padStart(2,'0')));
export const customerOffer=(customer,{discount=0,expiresAt=null,reason=''}={})=>({id:uid('OFR'),customerId:customer.id,discount:Number(discount)||0,expiresAt,reason,status:'ACTIVE',createdAt:new Date().toISOString()});
