import {uid,today} from './posData';

export const QUEUE_STATES=['PENDING','SYNCING','SYNCED','FAILED','CONFLICT'];
export const enqueueTransaction=(queue,type,payload)=>[...(queue||[]),{id:uid('SYNC'),type,payload,createdAt:new Date().toISOString(),state:'PENDING',attempts:0,lastError:null}];
export const markSyncing=(queue,id)=>queue.map(x=>x.id===id?{...x,state:'SYNCING',attempts:Number(x.attempts||0)+1}:x);
export const markSynced=(queue,id,serverId=null)=>queue.map(x=>x.id===id?{...x,state:'SYNCED',syncedAt:new Date().toISOString(),serverId,lastError:null}:x);
export const markFailed=(queue,id,error)=>queue.map(x=>x.id===id?{...x,state:'FAILED',lastError:String(error||'Sync failed')}:x);
export const markConflict=(queue,id,details)=>queue.map(x=>x.id===id?{...x,state:'CONFLICT',conflict:details}:x);
export const pendingTransactions=queue=>(queue||[]).filter(x=>['PENDING','FAILED','CONFLICT'].includes(x.state));
export const retryableTransactions=queue=>(queue||[]).filter(x=>x.state==='PENDING'||x.state==='FAILED');
export const syncStats=queue=>{const q=queue||[];return{total:q.length,pending:q.filter(x=>x.state==='PENDING').length,syncing:q.filter(x=>x.state==='SYNCING').length,synced:q.filter(x=>x.state==='SYNCED').length,failed:q.filter(x=>x.state==='FAILED').length,conflicts:q.filter(x=>x.state==='CONFLICT').length}};
export const createBackup=(state)=>({id:uid('BKP'),version:1,createdAt:new Date().toISOString(),date:today(),data:state});
export const restoreBackup=(backup)=>backup?.data?JSON.parse(JSON.stringify(backup.data)):null;
export const validateState=state=>{const errors=[];if(!state||typeof state!=='object')errors.push('Invalid state');for(const key of ['products','sales','customers'])if(state&&state[key]&&!Array.isArray(state[key]))errors.push(`${key} must be an array`);return{valid:errors.length===0,errors}};
export const integritySnapshot=state=>({products:state?.products?.length||0,sales:state?.sales?.length||0,customers:state?.customers?.length||0,lots:state?.lots?.length||0,queue:state?.syncQueue?.length||0,generatedAt:new Date().toISOString()});
export const recoverState=(current,backup)=>{const check=validateState(backup?.data);return check.valid?{ok:true,state:restoreBackup(backup),snapshot:integritySnapshot(backup.data)}:{ok:false,state:current,errors:check.errors}};
