const KEY='findupto-pos-v3';
const BACKUP_KEY='findupto-pos-ai-backup-v1';
const db=()=>window.mkPosDesktop?.database||null;
const load=()=>{try{const d=db();const x=d?.loadState?.();if(x)return x;const r=localStorage.getItem(KEY);return r?JSON.parse(r):null}catch{return null}};
const save=s=>{try{const d=db();if(d?.saveState){d.saveState(s,'offline-ai-agent');return true}localStorage.setItem(KEY,JSON.stringify(s));return true}catch{return false}};
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const arr=(s,k)=>Array.isArray(s?.[k])?s[k]:[];
const hash=s=>{let t='';for(const k of ['products','customers','heldOrders','sales','purchases','expenses'])t+=JSON.stringify(s?.[k]||[]);let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return String(h>>>0)};
function diagnose(s){
 const products=arr(s,'products'),customers=arr(s,'customers'),orders=arr(s,'heldOrders'),sales=arr(s,'sales');
 const issues=[];const ids=new Set(),skus=new Set(),bars=new Set();
 products.forEach((p,i)=>{if(!p.id)issues.push('missing-product-id');else if(ids.has(p.id))issues.push('duplicate-product-id');ids.add(p.id);if(p.sku){if(skus.has(p.sku))issues.push('duplicate-sku');skus.add(p.sku)}if(p.barcode){if(bars.has(p.barcode))issues.push('duplicate-barcode');bars.add(p.barcode)}if(!p.name)issues.push('missing-product-name');if(num(p.price)<0||num(p.cost)<0||num(p.stock)<0)issues.push('negative-product-value')});
 const pids=new Set(products.map(p=>p.id));const cids=new Set(customers.map(c=>c.id));
 for(const o of [...orders,...sales])for(const i of arr(o,'items')){if(i.productId&&!pids.has(i.productId))issues.push('broken-product-reference');if(num(i.qty)<=0)issues.push('invalid-quantity')}
 for(const o of orders)if(o.customerId&&o.customerId!=='C-001'&&!cids.has(o.customerId))issues.push('broken-customer-reference');
 if(!s?.settings?.name)issues.push('missing-business-name');
 return [...new Set(issues)];
}
function safeRepair(s){
 const x=JSON.parse(JSON.stringify(s||{}));const changes=[];const collections=['products','customers','suppliers','staff','sales','purchases','expenses','payments','deals','inventoryMoves','heldOrders','accounts','audit'];
 for(const k of collections)if(!Array.isArray(x[k])){x[k]=[];changes.push(`restored ${k}`)}
 x.settings={...(x.settings||{}),name:String(x.settings?.name||'Business'),currency:String(x.settings?.currency||'Rs.')};
 const used=new Set();x.products=x.products.map((p,i)=>{const q={...p};if(!q.id){q.id=`AI-PRD-${i+1}`;changes.push('generated product id')}if(used.has(q.id)){q.id=`${q.id}-AI-${i+1}`;changes.push('repaired duplicate product id')}used.add(q.id);if(!q.name){q.name=`Unnamed Product ${i+1}`;changes.push('named unnamed product')}q.price=Math.max(0,num(q.price));q.cost=Math.max(0,num(q.cost));q.stock=Math.max(0,num(q.stock));return q});
 const pids=new Set(x.products.map(p=>p.id));x.customers=x.customers.map((c,i)=>({...c,id:c.id||`AI-CUS-${i+1}`,name:c.name||`Customer ${i+1}`,balance:Math.max(0,num(c.balance)),points:Math.max(0,num(c.points))}));
 const fix=o=>({...o,items:arr(o,'items').filter(i=>!i.productId||pids.has(i.productId)).map(i=>({...i,qty:Math.max(0,num(i.qty)),price:Math.max(0,num(i.price)),total:Math.max(0,num(i.qty))*Math.max(0,num(i.price))}))});
 x.heldOrders=x.heldOrders.map(fix).filter(o=>o.items.length||o.status==='CANCELLED');x.sales=x.sales.map(fix).filter(o=>o.items.length);
 return {state:x,changes};
}
function backup(s){try{localStorage.setItem(BACKUP_KEY,JSON.stringify({at:new Date().toISOString(),state:s}));return true}catch{return false}}
function run(){const s=load();if(!s)return;if(s.settings?.aiAutoHeal===false)return;const before=diagnose(s);if(!before.length)return;const r=safeRepair(s);if(!r.changes.length)return;backup(s);r.state.audit=[...arr(r.state,'audit'),{id:`AI-${Date.now()}`,date:new Date().toLocaleString(),action:`Offline AI Agent repaired ${r.changes.length} safe issue(s)`,by:'offline-ai-agent'}];save(r.state);}
function boot(){if(window.__finduptoAiAgent)return;window.__finduptoAiAgent=true;run();setInterval(run,5000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
