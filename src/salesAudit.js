const STORAGE_KEY = 'findupto-pos-v3';
const PRINT_KEY = 'mkpos:print-history';

const read = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } };
const readPrints = () => { try { return JSON.parse(localStorage.getItem(PRINT_KEY) || '[]'); } catch { return []; } };
const money = n => `Rs. ${Number(n || 0).toLocaleString()}`;
const day = value => new Date(value || Date.now()).toISOString().slice(0,10);
const categoryOf = p => {
  const text = `${p?.category || ''} ${p?.name || ''}`.toLowerCase();
  if (/pizza/.test(text)) return 'Pizza';
  if (/shawarma/.test(text)) return 'Shawarma';
  if (/burger/.test(text)) return 'Burgers';
  if (/shake|milkshake/.test(text)) return 'Shakes';
  if (/ice cream|icecream|gelato/.test(text)) return 'Ice Cream';
  if (/biryani/.test(text)) return 'Biryani';
  return p?.category || 'Other';
};
const pizzaSize = name => { const m = String(name || '').match(/\b(xs|small|sm|medium|med|large|lg|xl|x-large|extra large)\b/i); if (!m) return 'Other'; const x=m[1].toLowerCase(); if(x==='sm'||x==='small')return 'Small'; if(x==='med'||x==='medium')return 'Medium'; if(x==='lg'||x==='large')return 'Large'; if(x==='x-large'||x==='extra large'||x==='xl')return 'XL'; if(x==='xs')return 'XS'; return 'Other'; };
const variant = item => { const c=categoryOf(item); return c==='Pizza' ? pizzaSize(item.name) : (item.name || 'Unknown'); };

export function logPrint(type, payload) {
  const entry = { id:`PRN-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type, printedAt:new Date().toISOString(), invoice:payload?.invoice || payload?.id || '', customer:payload?.customer || '', items:(payload?.items || []).map(i=>({productId:i.productId,name:i.name,qty:Number(i.qty)||0,price:Number(i.price)||0,total:Number(i.total)||((Number(i.qty)||0)*(Number(i.price)||0))})), total:Number(payload?.total)||0, date:payload?.date || new Date().toLocaleString() };
  const next=[entry,...readPrints()].slice(0,10000); localStorage.setItem(PRINT_KEY,JSON.stringify(next)); return entry;
}

function rowsFor(state, filters={}) {
  const sales=(state.sales||[]).filter(s=>!filters.date || day(s.date)===filters.date);
  const rows=[];
  for(const s of sales) for(const i of s.items||[]) {
    const cat=categoryOf(i), v=variant(i);
    if(filters.category && cat!==filters.category) continue;
    if(filters.variant && v!==filters.variant) continue;
    rows.push({...i,invoice:s.invoice,date:s.date,customer:s.customer,staff:s.staff,method:s.method,total:Number(i.total)||0,category:cat,variant:v,saleTotal:s.total});
  }
  return rows;
}

function aggregate(rows) {
  const map=new Map(); for(const r of rows){ const key=`${r.category}||${r.variant}`; const x=map.get(key)||{category:r.category,variant:r.variant,qty:0,revenue:0,sales:0}; x.qty+=Number(r.qty)||0; x.revenue+=Number(r.total)||0; x.sales+=1; map.set(key,x); } return [...map.values()].sort((a,b)=>b.revenue-a.revenue);
}
function allCategories(state){ return ['Pizza','Shawarma','Burgers','Shakes','Ice Cream','Biryani'].filter(c=>rowsFor(state,{category:c}).length); }
function printReport(title, body){ const w=window.open('', '_blank', 'width=900,height=700'); if(!w)return; w.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:7px;text-align:left}.right{text-align:right}@media print{button{display:none}}</style></head><body><h1>${title}</h1>${body}<button onclick="window.print()">Print</button></body></html>`); w.document.close(); }
function table(rows, detail=false){ return `<table><thead><tr><th>${detail?'Invoice':'Category'}</th><th>${detail?'Date':'Variant'}</th><th>${detail?'Customer':'Qty'}</th><th>${detail?'Items':'Revenue'}</th>${detail?'<th>Total</th>':''}</tr></thead><tbody>${rows.map(r=>detail?`<tr><td>${r.invoice}</td><td>${r.date}</td><td>${r.customer||''}</td><td>${r.name} × ${r.qty}</td><td class="right">${money(r.total)}</td></tr>`:`<tr><td>${r.category}</td><td>${r.variant}</td><td>${r.qty}</td><td class="right">${money(r.revenue)}</td></tr>`).join('')}</tbody></table>`; }

function mount(){ if(document.getElementById('mk-sales-audit')) return; const root=document.createElement('div'); root.id='mk-sales-audit'; root.innerHTML=`<button id="mk-audit-open">Sales Audit</button><div id="mk-audit-panel"><div class="mk-ah"><b>Sales & Print Audit</b><button id="mk-audit-close">×</button></div><div class="mk-ap"><div id="mk-print-stats"></div><div class="mk-tabs"><button data-cat="ALL">All Sales</button><button data-cat="Pizza">Pizza</button><button data-cat="Shawarma">Shawarma</button><button data-cat="Burgers">Burgers</button><button data-cat="Shakes">Shakes</button><button data-cat="Ice Cream">Ice Cream</button><button data-cat="Biryani">Biryani</button></div><div id="mk-variants"></div><div id="mk-audit-content"></div></div></div>`; document.body.appendChild(root);
 const panel=root.querySelector('#mk-audit-panel'); root.querySelector('#mk-audit-open').onclick=()=>{panel.classList.add('open');render('ALL')}; root.querySelector('#mk-audit-close').onclick=()=>panel.classList.remove('open'); root.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>render(b.dataset.cat));
 function render(cat,variantFilter=''){ const state=read(), prints=readPrints(), sales=state.sales||[], kitchen=prints.filter(p=>p.type==='kitchen'), direct=prints.filter(p=>p.type==='customer'); const date=new Date().toISOString().slice(0,10); const todaySales=sales.filter(s=>day(s.date)===date); root.querySelector('#mk-print-stats').innerHTML=`<div class="mk-cards"><button data-print="kitchen"><b>${kitchen.length}</b><span>Kitchen slips printed</span></button><button data-print="customer"><b>${direct.length}</b><span>Customer receipts printed</span></button><button><b>${todaySales.length}</b><span>Today's completed sales</span></button><button><b>${money(todaySales.reduce((a,s)=>a+(+s.total||0),0))}</b><span>Today's sales</span></button></div>`; root.querySelectorAll('[data-print]').forEach(b=>b.onclick=()=>renderPrints(b.dataset.print));
 const rows=cat==='ALL'?aggregate(rowsFor(state)):aggregate(rowsFor(state,{category:cat})); const variants=rows.filter(r=>cat==='ALL'||r.category===cat); root.querySelector('#mk-variants').innerHTML=`<div class="mk-variant-tabs">${(cat==='ALL'?allCategories(state):[...new Set(variants.map(r=>r.variant))]).map(v=>`<button data-v="${v}">${v}</button>`).join('')}</div>`; root.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{ const v=b.dataset.v; const detail=rowsFor(state,{category:cat==='ALL'?undefined:cat,variant:v}); root.querySelector('#mk-audit-content').innerHTML=`<h3>${cat==='ALL'?'':cat+' — '}${v}</h3>${table(detail,true)}<button class="mk-print" data-detail="1">Print this variant</button>`; root.querySelector('[data-detail]').onclick=()=>printReport(`${cat==='ALL'?'Sales':cat+' '+v} — Sale Details`,table(detail,true)); }); root.querySelector('#mk-audit-content').innerHTML=`<h3>${cat==='ALL'?'All product variants':cat+' totals'}</h3>${table(variants)}`; root.querySelector('#mk-audit-content').insertAdjacentHTML('beforeend',`<button class="mk-print" id="mk-print-summary">Print this report</button>`); root.querySelector('#mk-print-summary').onclick=()=>printReport(`${cat} Sales Summary`,table(variants)); }
 function renderPrints(type){ const prints=readPrints().filter(p=>p.type===type); root.querySelector('#mk-variants').innerHTML=''; root.querySelector('#mk-audit-content').innerHTML=`<h3>${type==='kitchen'?'Kitchen slips':'Direct customer receipts'} — ${prints.length} printed</h3>${prints.map((p,i)=>`<button class="mk-order" data-i="${i}"><b>${p.invoice}</b><span>${p.customer||''}</span><span>${p.items.reduce((a,x)=>a+x.qty,0)} items</span><strong>${money(p.total)}</strong></button>`).join('')}`; root.querySelectorAll('.mk-order').forEach(b=>b.onclick=()=>{const p=prints[+b.dataset.i];root.querySelector('#mk-audit-content').innerHTML=`<button class="mk-back" id="mk-back">← Back</button><h3>${p.invoice}</h3><p>${p.date} · ${p.customer||'Walk-in Customer'}</p>${table(p.items.map(i=>({...i,invoice:p.invoice,date:p.date,customer:p.customer})),true)}<p><b>Total: ${money(p.total)}</b></p><button class="mk-print" id="mk-reprint">Print this receipt</button>`; root.querySelector('#mk-back').onclick=()=>renderPrints(type); root.querySelector('#mk-reprint').onclick=()=>printReport(`${type==='kitchen'?'Kitchen Slip':'Customer Receipt'} ${p.invoice}`,table(p.items.map(i=>({...i,invoice:p.invoice,date:p.date,customer:p.customer})),true)); }); }
 render('ALL'); }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else setTimeout(mount,0);
