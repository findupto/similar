import {uid,today} from './posData';

export const PAYMENT_METHODS=['CASH','CARD','ONLINE','WALLET','GIFT_CARD','STORE_CREDIT'];
export const PAYMENT_STATES=['PENDING','AUTHORIZED','CAPTURED','PARTIAL','REFUNDED','FAILED','VOIDED'];
export const createPayment=({saleId,method='CASH',amount=0,reference='',user}={})=>({id:uid('PAY'),saleId,method,amount:Math.max(0,Number(amount)||0),reference,status:'CAPTURED',date:today(),createdAt:new Date().toISOString(),by:user?.username||'system'});
export const splitPayment=(saleId,total,payments=[],user)=>{const paid=payments.reduce((s,p)=>s+Math.max(0,Number(p.amount)||0),0),remaining=Math.max(0,Number(total||0)-paid);return{saleId,total:Number(total)||0,paid,remaining,status:remaining<=0?'PAID':paid>0?'PARTIAL':'UNPAID',payments:payments.map(p=>createPayment({...p,saleId,user}))}};
export const cashChange=(due,tendered)=>Math.max(0,Number(tendered||0)-Number(due||0));
export const paymentRemaining=(total,payments=[])=>Math.max(0,Number(total||0)-payments.reduce((s,p)=>s+Number(p.amount||0),0));
export const refundPayment=(payment,amount,reason='',user)=>{const v=Math.min(Number(payment.amount||0),Math.max(0,Number(amount)||0));return{...payment,refundedAmount:v,refundReason:reason,status:v>=Number(payment.amount||0)?'REFUNDED':'PARTIAL',refundedAt:new Date().toISOString(),refundedBy:user?.username||'system'}};
export const refundSale=(sale,amount,reason='',user)=>{const v=Math.min(Number(sale.total||0),Math.max(0,Number(amount)||0));return{...sale,refundedAmount:Number(sale.refundedAmount||0)+v,status:v>=Number(sale.total||0)?'REFUNDED':'PARTIAL_REFUND',refunds:[...(sale.refunds||[]),{id:uid('REF'),amount:v,reason,date:today(),by:user?.username||'system'}]}};
export const paymentReconciliation=(payments=[])=>payments.reduce((a,p)=>{const k=p.method||'OTHER';a[k]??={method:k,count:0,amount:0,refunded:0};a[k].count++;a[k].amount+=Number(p.amount||0);a[k].refunded+=Number(p.refundedAmount||0);return a},{});
export const paymentAudit=(payment,action,user,meta={})=>({id:uid('PAUD'),paymentId:payment.id,action,date:new Date().toISOString(),by:user?.username||'system',...meta});
export const authorizePayment=(payment,reference='')=>({...payment,status:'AUTHORIZED',reference:reference||payment.reference});
export const capturePayment=payment=>({...payment,status:'CAPTURED',capturedAt:new Date().toISOString()});
export const voidPayment=(payment,reason='',user)=>({...payment,status:'VOIDED',voidReason:reason,voidedAt:new Date().toISOString(),voidedBy:user?.username||'system'});
