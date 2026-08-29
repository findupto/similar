const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
ready(()=>{
  document.body.classList.add('premium-focus');
  const key='findupto:premium-ui';
  const prefs=JSON.parse(localStorage.getItem(key)||'{}');
  if(prefs.theme==='dark')document.body.classList.add('premium-dark');
  if(prefs.density==='compact')document.body.classList.add('premium-compact');
  const save=()=>localStorage.setItem(key,JSON.stringify({theme:document.body.classList.contains('premium-dark')?'dark':'light',density:document.body.classList.contains('premium-compact')?'compact':'comfortable'}));
  const toast=document.createElement('div');toast.className='premium-toast';document.body.appendChild(toast);
  let toastTimer;const notify=msg=>{toast.textContent=msg;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2200)};
  const nav=()=>[...document.querySelectorAll('.sidebar nav button')].map(b=>({name:b.innerText.trim(),el:b})).filter(x=>x.name);
  const go=name=>{const x=nav().find(x=>x.name.toLowerCase()===name.toLowerCase());if(x){x.el.click();notify(`${x.name} opened`);return true}return false};
  const print=()=>{window.print();notify('Print dialog opened')};
  const toggleTheme=()=>{document.body.classList.toggle('premium-dark');save();notify(document.body.classList.contains('premium-dark')?'Dark mode enabled':'Light mode enabled')};
  const toggleDensity=()=>{document.body.classList.toggle('premium-compact');save();notify(document.body.classList.contains('premium-compact')?'Compact density enabled':'Comfortable density enabled')};
  const fullscreen=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()};
  const buildCommand=()=>{
    if(document.querySelector('.premium-command'))return;
    const wrap=document.createElement('div');wrap.className='premium-command';wrap.innerHTML=`<div class="premium-command-card" role="dialog" aria-modal="true" aria-label="Command center"><div class="premium-command-head"><span>⌘</span><input aria-label="Search commands" placeholder="Search pages and actions…" autocomplete="off"/></div><div class="premium-command-results"></div><div class="premium-command-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> select</span><span><kbd>Esc</kbd> close</span></div></div>`;document.body.appendChild(wrap);
    const input=wrap.querySelector('input'),results=wrap.querySelector('.premium-command-results');let active=0;
    const actions=[['POS','Open point of sale'],['Orders','Manage open and completed orders'],['Products','Manage products and pricing'],['Inventory','Stock and inventory control'],['Customers','Customer accounts and balances'],['Tables','Table management'],['KDS','Kitchen display system'],['Sales','Sales history and audit'],['Purchases','Supplier purchases'],['Loyalty','Customer loyalty'],['Shifts','Cashier shift control'],['Deals','Deals and promotions'],['Staff','Staff management'],['Expenses','Expense manager'],['Accounting','Accounts and ledger'],['Analytics','Business analytics'],['Reports','Operational reports'],['Settings','System settings'],['Toggle dark mode','Switch appearance'],['Toggle density','Switch compact/comfortable layout'],['Fullscreen','Enter fullscreen'],['Print','Print current screen']];
    const render=()=>{const q=input.value.toLowerCase().trim();const items=actions.filter(a=>(a[0]+' '+a[1]).toLowerCase().includes(q));active=Math.min(active,Math.max(0,items.length-1));results.innerHTML=items.map((a,i)=>`<button class="premium-command-item ${i===active?'active':''}" data-action="${a[0]}"><span class="pc-copy"><b>${a[0]}</b><small>${a[1]}</small></span></button>`).join('');results.querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>run(items[i][0])))};
    const run=a=>{wrap.classList.remove('open');if(a==='Toggle dark mode')toggleTheme();else if(a==='Toggle density')toggleDensity();else if(a==='Fullscreen')fullscreen();else if(a==='Print')print();else go(a)};
    wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.classList.remove('open')});input.addEventListener('input',()=>{active=0;render()});input.addEventListener('keydown',e=>{const count=results.querySelectorAll('button').length;if(e.key==='ArrowDown'){e.preventDefault();active=(active+1)%Math.max(count,1);render()}if(e.key==='ArrowUp'){e.preventDefault();active=(active-1+Math.max(count,1))%Math.max(count,1);render()}if(e.key==='Enter'){e.preventDefault();results.querySelectorAll('button')[active]?.click()}if(e.key==='Escape'){wrap.classList.remove('open')}});wrap.openCommand=()=>{wrap.classList.add('open');input.value='';active=0;render();setTimeout(()=>input.focus(),0)};
  };
  buildCommand();
  const command=document.querySelector('.premium-command');
  const openCommand=()=>command.openCommand();
  const header=document.querySelector('.main>header');
  if(header&&!header.querySelector('.premium-command-trigger')){const trigger=document.createElement('button');trigger.className='premium-command-trigger';trigger.innerHTML='<span>Command Center</span><kbd>Ctrl K</kbd>';trigger.title='Open command center';trigger.addEventListener('click',openCommand);header.appendChild(trigger)}
  const live=document.createElement('span');live.className='premium-live';live.innerHTML='<i></i>Local-first';header?.querySelector('.eyebrow')?.appendChild(live);
  const dock=document.createElement('div');dock.className='premium-action-center';dock.innerHTML='<button aria-label="Quick actions" title="Quick actions">+</button><div class="premium-action-menu"><button data-a="POS">New sale <span>F2</span></button><button data-a="Orders">Orders <span>F3</span></button><button data-a="Products">Products <span>F4</span></button><button data-a="Inventory">Inventory <span>F5</span></button><button data-a="Customers">Customers <span>F6</span></button><button data-a="Tables">Tables <span>F7</span></button><button data-a="KDS">Kitchen <span>F8</span></button><button data-a="Print">Print <span>Ctrl⇧P</span></button><button data-a="Toggle dark mode">Theme <span>Ctrl⇧D</span></button></div>';
  document.body.appendChild(dock);const menu=dock.querySelector('.premium-action-menu');dock.querySelector(':scope>button').addEventListener('click',()=>menu.classList.toggle('open'));dock.querySelectorAll('.premium-action-menu button').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.a;menu.classList.remove('open');if(a==='Print')print();else if(a==='Toggle dark mode')toggleTheme();else go(a)}));
  const keys={F2:'POS',F3:'Orders',F4:'Products',F5:'Inventory',F6:'Customers',F7:'Tables',F8:'KDS'};
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand();return}if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();print();return}if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='d'){e.preventDefault();toggleTheme();return}if(e.key==='Escape'){document.querySelector('.premium-command.open')?.classList.remove('open');menu.classList.remove('open');return}if(keys[e.key]&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();go(keys[e.key])}});
  let last='';const observer=new MutationObserver(()=>{const h=document.querySelector('.main h1')?.textContent?.trim();if(h&&h!==last){last=h;document.title=`${h} · Findupto AI POS`}});observer.observe(document.body,{subtree:true,childList:true});
  notify('Premium POS interface ready');
});
