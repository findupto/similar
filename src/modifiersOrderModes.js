import {uid} from './posData';

export const ORDER_MODES=['DINE_IN','TAKEAWAY','DELIVERY','PICKUP'];
export const SERVICE_CHARGES=['PERCENT','FIXED'];
export const createModifierGroup=(data={})=>({id:uid('MOD'),name:data.name||'Add-ons',required:data.required===true,min:Number(data.min)||0,max:Number(data.max)||99,options:(data.options||[]).map(o=>({id:o.id||uid('OPT'),name:o.name,price:Number(o.price)||0,active:o.active!==false}))});
export const createVariant=(data={})=>({id:uid('VAR'),productId:data.productId,name:data.name||'Regular',sku:data.sku||'',barcode:data.barcode||'',price:Number(data.price)||0,cost:Number(data.cost)||0,active:data.active!==false});
export const validateModifiers=(groups,selections={})=>{const errors=[];for(const g of groups||[]){const count=(selections[g.id]||[]).length;if(g.required&&count<Math.max(1,g.min))errors.push(`${g.name} requires a selection`);if(count<g.min)errors.push(`${g.name}: minimum ${g.min}`);if(count>g.max)errors.push(`${g.name}: maximum ${g.max}`)}return{valid:!errors.length,errors}};
export const modifierTotal=(groups,selections={})=>(groups||[]).reduce((sum,g)=>sum+(selections[g.id]||[]).reduce((a,id)=>a+Number(g.options.find(o=>o.id===id)?.price||0),0),0);
export const buildOrderMode=(mode,details={})=>({mode:ORDER_MODES.includes(mode)?mode:'DINE_IN',tableId:details.tableId||null,tableName:details.tableName||'',customerId:details.customerId||null,address:details.address||'',deliveryFee:Number(details.deliveryFee)||0,notes:details.notes||''});
export const serviceCharge=(subtotal,{type='PERCENT',value=0}={})=>{const base=Math.max(0,Number(subtotal)||0),v=Math.max(0,Number(value)||0);return type==='FIXED'?v:base*v/100};
export const tipAmount=(subtotal,tip)=>{const base=Math.max(0,Number(subtotal)||0);return tip?.type==='PERCENT'?base*Math.max(0,Number(tip.value)||0)/100:Math.max(0,Number(tip?.value)||0)};
export const orderTotals=({subtotal=0,discount=0,tax=0,service=0,tip=0,deliveryFee=0}={})=>{const s=Math.max(0,Number(subtotal)||0),d=Math.min(s,Math.max(0,Number(discount)||0));return{subtotal:s,discount:d,tax:Math.max(0,Number(tax)||0),service:Math.max(0,Number(service)||0),tip:Math.max(0,Number(tip)||0),deliveryFee:Math.max(0,Number(deliveryFee)||0),total:Math.max(0,s-d+Number(tax||0)+Number(service||0)+Number(tip||0)+Number(deliveryFee||0))}};
