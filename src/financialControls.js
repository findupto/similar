import {uid,today} from './posData';

export const createFiscalPeriod=({name,startDate,endDate,status='OPEN'}={})=>({id:uid('FP'),name:name||`${startDate||today()} — ${endDate||today()}`,startDate,endDate,status,createdAt:new Date().toISOString()});
export const periodAllows=(period,date=today())=>period?.status==='OPEN'&&(!period.startDate||date>=period.startDate)&&(!period.endDate||date<=period.endDate);
export const closeFiscalPeriod=period=>({...period,status:'CLOSED',closedAt:new Date().toISOString()});
export const nextNumber=(sequence,prefix='INV')=>{const n=Number(sequence?.next||1);return{...sequence,next:n+1,last:`${prefix}-${String(n).padStart(6,'0')}`}};
export const taxRate=(taxes,code,locationId)=>{const t=(taxes||[]).find(x=>x.code===code&&x.active!==false&&(!x.locationId||x.locationId===locationId));return Number(t?.rate||0)};
export const calculateTax=(amount,rate)=>Math.max(0,Number(amount||0))*Math.max(0,Number(rate||0))/100;
export const createTaxTransaction=({saleId,code,base,rate,user})=>({id:uid('TAX'),date:today(),saleId,code,base:Number(base)||0,rate:Number(rate)||0,tax:calculateTax(base,rate),status:'POSTED',by:user?.username||'system'});
export const arInvoice=({customerId,number,total,dueDate,saleId})=>({id:uid('AR'),number,total:Number(total)||0,paid:0,balance:Number(total)||0,customerId,saleId,dueDate,status:'OPEN',createdAt:new Date().toISOString()});
export const recordARPayment=(invoice,amount)=>{const paid=Math.min(Number(invoice.total||0),Number(invoice.paid||0)+Math.max(0,Number(amount)||0));return{...invoice,paid,balance:Number(invoice.total||0)-paid,status:paid>=Number(invoice.total||0)?'PAID':'PARTIAL'}};
export const agingBuckets=(invoices,asOf=new Date())=> (invoices||[]).filter(i=>Number(i.balance)>0).reduce((a,i)=>{const days=i.dueDate?Math.max(0,Math.floor((new Date(asOf)-new Date(i.dueDate))/86400000)):0;const b=days<=0?'current':days<=30?'1_30':days<=60?'31_60':days<=90?'61_90':'90_plus';a[b]=(a[b]||0)+Number(i.balance||0);return a},{current:0,'1_30':0,'31_60':0,'61_90':0,'90_plus':0});
export const controlCheck=(journal,period)=>({balanced:Math.abs(Number(journal?.debit||0)-Number(journal?.credit||0))<0.005,periodOpen:periodAllows(period,journal?.date||today()),approved:journal?.status==='POSTED'});
