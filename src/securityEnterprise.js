import {uid,today} from './posData';

export const PERMISSIONS=['pos.sell','pos.refund','pos.discount','cash.open','cash.close','cash.payout','inventory.receive','inventory.adjust','inventory.transfer','inventory.wastage','purchases.approve','reports.view','settings.manage','staff.manage','audit.view'];
export const ROLE_DEFAULTS={admin:['*'],manager:PERMISSIONS.filter(p=>p!=='settings.manage'),cashier:['pos.sell','pos.discount','cash.open','cash.close'],inventory:['inventory.receive','inventory.adjust','inventory.transfer','inventory.wastage','reports.view'],accountant:['reports.view','purchases.approve']};
export const hasPermission=(user,permission)=>{const p=user?.permissions||ROLE_DEFAULTS[user?.role]||[];return p.includes('*')||p.includes(permission)};
export const requirePermission=(user,permission)=>{if(!hasPermission(user,permission))throw new Error(`Permission denied: ${permission}`);return true};
export const createApproval=(type,payload,user,permission)=>({id:uid('APR'),date:today(),type,payload,status:'PENDING',requestedBy:user?.username||'system',permission});
export const approveAction=(approval,user)=>({...approval,status:'APPROVED',approvedBy:user?.username||'system',approvedAt:new Date().toISOString()});
export const rejectAction=(approval,user,reason='')=>({...approval,status:'REJECTED',rejectedBy:user?.username||'system',rejectedAt:new Date().toISOString(),reason});
export const auditEvent=(action,user,meta={})=>({id:uid('AUD'),date:today(),timestamp:new Date().toISOString(),action,by:user?.username||'system',role:user?.role||'unknown',...meta});
export const securityLog=(state,event)=>({...state,securityLog:[...(state.securityLog||[]),event],audit:[...(state.audit||[]),event]});
export const sensitiveApproval=(type,amount)=>['REFUND','DISCOUNT','PAYOUT','STOCK_ADJUSTMENT'].includes(type)&&Number(amount||0)>0;
export const passwordPolicy={minLength:8,requireNumber:true,requireUppercase:true,requireSpecial:true};
export const passwordMeetsPolicy=password=>{const s=String(password||'');return s.length>=8&&/[A-Z]/.test(s)&&/[0-9]/.test(s)&&/[^A-Za-z0-9]/.test(s)};
