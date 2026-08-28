const APP_KEY='findupto-pos-v3';
const DEFAULT_AI_NAME='Findupto AI';

function desktopDb(){return window.mkPosDesktop?.database||null}
function loadState(){try{const db=desktopDb();if(db?.loadState){const s=db.loadState();if(s)return s}const raw=localStorage.getItem(APP_KEY);return raw?JSON.parse(raw):null}catch{return null}}
function saveState(state){try{const db=desktopDb();if(db?.saveState){db.saveState(state,'offline-ai');return true}localStorage.setItem(APP_KEY,JSON.stringify(state));return true}catch{return false}}
function getSettings(state){return state.settings||{name:'Business',currency:'Rs.'}}
function aiName(state){return String(getSettings(state).aiName||DEFAULT_AI_NAME).trim()||DEFAULT_AI_NAME}
function role(){return document.querySelector('.user-chip small')?.textContent?.trim()||''}
function isAdmin(){return /admin|owner/i.test(role())}
function money(n,state){const cur=getSettings(state).currency||'Rs.';return `${cur} ${Number(n||0).toLocaleString()}`}
function analyze(state){
  const products=Array.isArray(state?.products)?state.products:[];
  const customers=Array.isArray(state?.customers)?state.customers:[];
  const orders=Array.isArray(state?.heldOrders)?state.heldOrders:[];
  const sales=Array.isArray(state?.sales)?state.sales:[];
  const expenses=Array.isArray(state?.expenses)?state.expenses:[];
  const low=products.filter(p=>p.active!==false&&Number(p.stock||0)<=3&&!p.isDeal);
  const open=orders.filter(o=>!['COMPLETED','CANCELLED'].includes(o.status));
  const revenue=sales.reduce((a,s)=>a+Number(s.total||0),0);
  const expense=expenses.reduce((a,e)=>a+Number(e.amount||0),0);
  const warnings=[];
  if(low.length)warnings.push(`${low.length} low-stock product${low.length===1?'':'s'}: ${low.slice(0,5).map(p=>p.name).join(', ')}`);
  if(open.length)warnings.push(`${open.length} order${open.length===1?'':'s'} still open in the kitchen queue.`);
  const badPrices=products.filter(p=>!Number.isFinite(Number(p.price))||Number(p.price)<0);
  if(badPrices.length)warnings.push(`${badPrices.length} product price${badPrices.length===1?'':'s'} need repair.`);
  return {revenue,expense,open:open.length,low:low.length,customers:customers.length,products:products.length,warnings}
}
function repair(state){
  const next=JSON.parse(JSON.stringify(state||{}));
  const changes=[]; const now=new Date().toISOString();
  if(!Array.isArray(next.products))next.products=[];
  if(!Array.isArray(next.customers))next.customers=[];
  if(!Array.isArray(next.heldOrders))next.heldOrders=[];
  if(!Array.isArray(next.sales))next.sales=[];
  if(!Array.isArray(next.expenses))next.expenses=[];
  if(!Array.isArray(next.audit))next.audit=[];
  if(!next.settings)next.settings={name:'Business',currency:'Rs.'};
  const seen=new Set();
  next.products=next.products.map((p,i)=>{
    const x={...p};
    if(!x.id){x.id=`AI-PRD-${i+1}`;changes.push(`Added missing product ID to ${x.name||'product '+(i+1)}`)}
    if(!x.name){x.name=`Unnamed Product ${i+1}`;changes.push(`Named an unnamed product as ${x.name}`)}
    x.price=Math.max(0,Number.isFinite(Number(x.price))?Number(x.price):0);
    x.cost=Math.max(0,Number.isFinite(Number(x.cost))?Number(x.cost):0);
    x.stock=Math.max(0,Number.isFinite(Number(x.stock))?Number(x.stock):0);
    const key=String(x.id);if(seen.has(key)){x.id=`${key}-AI-${i+1}`;changes.push(`Fixed duplicate product ID for ${x.name}`)}seen.add(x.id);return x;
  });
  const customerIds=new Set(next.customers.map(c=>c.id));
  next.customers=next.customers.map((c,i)=>({...c,id:c.id||`AI-CUS-${i+1}`,name:c.name||`Customer ${i+1}`,balance:Math.max(0,Number(c.balance)||0)}));
  const validProducts=new Set(next.products.map(p=>p.id));
  const validCustomers=new Set(next.customers.map(c=>c.id));
  const fixItems=o=>({...o,items:(Array.isArray(o.items)?o.items:[]).filter(i=>validProducts.has(i.productId)).map(i=>({...i,qty:Math.max(0,Number(i.qty)||0),price:Math.max(0,Number(i.price)||0),total:Math.max(0,Number(i.qty)||0)*Math.max(0,Number(i.price)||0)}))});
  next.heldOrders=next.heldOrders.map(fixItems).filter(o=>o.items.length||o.status==='CANCELLED');
  next.sales=next.sales.map(fixItems).filter(o=>o.items.length);
  next.settings.aiName=aiName(next); next.settings.aiInstructions=String(next.settings.aiInstructions||'');
  if(changes.length)next.audit.push({id:`AI-${Date.now()}`,date:now,action:`${aiName(next)} automatically repaired ${changes.length} data issue${changes.length===1?'':'s'}`,by:'offline-ai'});
  saveState(next);return {state:next,changes}
}
function reply(text,state){
  const s=analyze(state);const instructions=String(getSettings(state).aiInstructions||'').trim();
  const t=text.toLowerCase();
  if(/repair|fix|clean|problem|issue|error|broken/.test(t)){const r=repair(state);return {state:r.state,text:r.changes.length?`I fixed ${r.changes.length} safe data issue${r.changes.length===1?'':'s'} automatically. ${r.changes.slice(0,5).join('; ')}.`:'I checked the POS data and found no safe automatic repairs needed.'}}
  if(/stock|inventory|low/.test(t))return {state,text:s.low?`There are ${s.low} low-stock products. ${s.warnings.find(w=>w.includes('low-stock'))||''}`:'No active product is currently at or below the low-stock threshold of 3.'}
  if(/sales|revenue|profit|earning/.test(t))return {state,text:`Recorded sales: ${money(s.revenue,state)}. Recorded expenses: ${money(s.expense,state)}. Difference: ${money(s.revenue-s.expense,state)}.`}
  if(/order|kitchen|queue/.test(t))return {state,text:s.open?`${s.open} order${s.open===1?'':'s'} remain open in the kitchen queue.`:'The kitchen queue is clear.'}
  if(/customer/.test(t))return {state,text:`There are ${s.customers} customers in the POS database.`}
  if(/instruction|policy|rule/.test(t))return {state,text:isAdmin()?`Your admin instructions are active: ${instructions||'No custom instructions have been set.'}`:'Only an Admin or Owner can manage AI instructions.'}
  return {state,text:`I am your offline POS assistant. I can help with sales, stock, orders, customers, reports, data cleanup and safe automatic repairs. I do not send your business data to an online AI service.${instructions?' I am also following the admin instructions configured for this store.':''}`}
}

const css=`#offline-ai-root{position:fixed;right:20px;bottom:20px;z-index:99999;font-family:Arial,Helvetica,sans-serif}#offline-ai-root *{box-sizing:border-box}.oai-fab{border:0;border-radius:999px;padding:12px 16px;background:linear-gradient(135deg,#7c5cff,#a568ff);color:#fff;font-weight:800;box-shadow:0 12px 35px #0005;cursor:pointer}.oai-panel{width:380px;max-width:calc(100vw - 30px);height:560px;max-height:calc(100vh - 40px);background:#111620;color:#eef2f7;border:1px solid #30384a;border-radius:18px;box-shadow:0 24px 70px #0008;display:flex;flex-direction:column;overflow:hidden}.oai-head{padding:15px 16px;border-bottom:1px solid #2a3240;display:flex;align-items:center;gap:10px}.oai-head b{flex:1}.oai-head button,.oai-mini{border:1px solid #30384a;background:#171d29;color:#eef2f7;border-radius:8px;padding:7px;cursor:pointer}.oai-body{padding:14px;overflow:auto;flex:1}.oai-msg{padding:10px 12px;border-radius:12px;background:#171d29;margin-bottom:9px;font-size:12px;line-height:1.55}.oai-user{background:#7c5cff22}.oai-actions{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 12px}.oai-actions button{border:1px solid #30384a;background:#171d29;color:#bdb3ff;border-radius:8px;padding:7px 9px;font-size:11px;cursor:pointer}.oai-compose{padding:10px;border-top:1px solid #2a3240;display:flex;gap:7px}.oai-compose input{min-width:0;flex:1;background:#171d29;border:1px solid #30384a;color:#fff;border-radius:9px;padding:10px;outline:0}.oai-compose button{border:0;border-radius:9px;background:#7c5cff;color:#fff;padding:0 13px;font-weight:800}.oai-admin{margin-top:10px;padding-top:10px;border-top:1px solid #2a3240}.oai-admin label{display:block;font-size:10px;color:#8c97a9;margin-bottom:5px}.oai-admin input,.oai-admin textarea{width:100%;background:#171d29;color:#fff;border:1px solid #30384a;border-radius:8px;padding:8px;margin-bottom:7px}.oai-admin textarea{height:65px;resize:vertical}.oai-save{width:100%;padding:8px;border:0;border-radius:8px;background:#24d6a5;color:#061710;font-weight:800}.oai-status{font-size:10px;color:#8c97a9;margin-top:6px}`;
function mount(){if(document.getElementById('offline-ai-root'))return;const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);const root=document.createElement('div');root.id='offline-ai-root';document.body.appendChild(root);let open=false;let state=loadState()||{};
 const render=()=>{state=loadState()||state;const name=aiName(state);const admin=isAdmin();root.innerHTML=open?`<div class="oai-panel"><div class="oai-head"><span>✦</span><b>${escapeHtml(name)} · Offline</b><button id="oai-close">×</button></div><div class="oai-body" id="oai-body"><div class="oai-msg"><b>Ready.</b><br/>I work locally with this POS and can assist the counter person without internet.</div><div class="oai-actions"><button data-q="Check sales">Sales</button><button data-q="Check stock">Stock</button><button data-q="Check orders">Kitchen</button><button data-q="Fix all issues">Auto-fix</button></div>${admin?`<div class="oai-admin"><label>AI NAME (Admin / Owner)</label><input id="oai-name" value="${escapeAttr(name)}"><label>AI INSTRUCTIONS FOR THIS STORE</label><textarea id="oai-instructions" placeholder="Tell the AI how this business wants it to behave...">${escapeHtml(String(getSettings(state).aiInstructions||''))}</textarea><button class="oai-save" id="oai-save">Save AI settings</button><div class="oai-status">Instructions are stored locally with the POS business settings.</div></div>`:''}</div><div class="oai-compose"><input id="oai-input" placeholder="Ask anything about this POS…"><button id="oai-send">Send</button></div></div>`:`<button class="oai-fab">✦ ${escapeHtml(name)}</button>`;
 root.querySelector('.oai-fab')?.addEventListener('click',()=>{open=true;render()});root.querySelector('#oai-close')?.addEventListener('click',()=>{open=false;render()});root.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.q)));root.querySelector('#oai-send')?.addEventListener('click',()=>ask(root.querySelector('#oai-input')?.value||''));root.querySelector('#oai-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')ask(e.target.value)});root.querySelector('#oai-save')?.addEventListener('click',()=>{if(!isAdmin())return;const n=root.querySelector('#oai-name')?.value?.trim()||DEFAULT_AI_NAME;const inst=root.querySelector('#oai-instructions')?.value||'';const next=loadState()||state;next.settings={...(next.settings||{}),aiName:n,aiInstructions:inst};saveState(next);state=next;render()});};
 const ask=q=>{if(!String(q).trim())return;const body=root.querySelector('#oai-body');if(!body)return;const u=document.createElement('div');u.className='oai-msg oai-user';u.textContent=String(q);body.appendChild(u);const r=reply(String(q),loadState()||state);state=r.state||state;const a=document.createElement('div');a.className='oai-msg';a.textContent=r.text;body.appendChild(a);body.scrollTop=body.scrollHeight;};
 render();setInterval(()=>{if(open){const n=aiName(loadState()||state);if(!root.querySelector('.oai-head b')?.textContent?.startsWith(n))render()}},2000);
}
function escapeHtml(v){return String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function escapeAttr(v){return escapeHtml(v).replace(/"/g,'&quot;')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
