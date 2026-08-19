const PRINT_KEY='mkpos:print-history';
const read=()=>{try{return JSON.parse(localStorage.getItem(PRINT_KEY)||'[]')}catch{return[]}};
export function logPrint(type,payload){const entry={id:`PRN-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,type,printedAt:new Date().toISOString(),invoice:payload?.invoice||payload?.id||'',customer:payload?.customer||'',staff:payload?.staff||'',items:(payload?.items||[]).map(i=>({productId:i.productId,name:i.name,qty:Number(i.qty)||0,price:Number(i.price)||0,total:Number(i.total)||((Number(i.qty)||0)*(Number(i.price)||0))})),subtotal:Number(payload?.subtotal)||0,discount:Number(payload?.discount)||0,total:Number(payload?.total)||0,date:payload?.date||new Date().toLocaleString()};localStorage.setItem(PRINT_KEY,JSON.stringify([entry,...read()].slice(0,20000)));return entry}
export const getPrintHistory=()=>read();
export const clearPrintHistory=()=>localStorage.removeItem(PRINT_KEY);
