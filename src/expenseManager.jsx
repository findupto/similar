import React,{useMemo,useState} from 'react';
import {Plus,Wallet,Receipt,Users,Lightbulb,Flame,Home,Car,ToolCase,MoreHorizontal} from 'lucide-react';
import {Panel,Table,Stat,Modal,Form} from './businessModules';
import {uid,today,money} from './posData';

const CATEGORIES=[
  ['Salaries','salary',Users],['Staff Advance','staff-advance',Users],['Electricity','electricity',Lightbulb],['Gas','gas',Flame],['Rent','rent',Home],['Transport','transport',Car],['Maintenance','maintenance',ToolCase],['Other','other',MoreHorizontal]
];

export function ExpenseManager({state,setState,user}){
 const [category,setCategory]=useState('all');
 const [edit,setEdit]=useState(null);
 const rows=useMemo(()=>state.expenses.filter(e=>category==='all'||e.categoryKey===category).slice().reverse(),[state.expenses,category]);
 const total=rows.reduce((a,e)=>a+(+e.amount||0),0);
 const allTotal=state.expenses.reduce((a,e)=>a+(+e.amount||0),0);
 const save=e=>{
   const amount=+e.amount||0;if(!amount)return;
   const id=uid('EXP'); const cat=CATEGORIES.find(x=>x[1]===e.categoryKey)?.[0]||'Other';
   const record={...e,id,date:e.date||today(),category:cat,amount,paidBy:user.username};
   setState(s=>({...s,expenses:[...s.expenses,record],accounts:[...s.accounts,{id:uid('ACC'),date:record.date,type:'cash-out',category:cat,description:record.description||cat,amount,reference:id,by:user.username}],audit:[...s.audit,{id:uid('AUD'),date:record.date,action:`${cat} expense recorded: ${record.description||''}`.trim(),by:user.username}]}));
   setEdit(null);
 };
 return <div className="module">
  <div className="stats"><Stat title="All Expenses" value={money(allTotal)} icon={Wallet}/><Stat title="Selected Category" value={money(total)} icon={Receipt}/><Stat title="Expense Records" value={state.expenses.length} icon={Receipt}/></div>
  <div className="toolbar"><button className="primary" onClick={()=>setEdit({date:today(),categoryKey:'other',description:'',amount:0,account:'Cash',notes:''})}><Plus size={16}/> Add Expense</button></div>
  <Panel title="Expense categories"><div className="toolbar"><button className={category==='all'?'primary':''} onClick={()=>setCategory('all')}>All</button>{CATEGORIES.map(([name,key,Icon])=><button className={category===key?'primary':''} key={key} onClick={()=>setCategory(key)}><Icon size={15}/> {name}</button>)}</div></Panel>
  <Panel title={category==='all'?'All expense history':`${CATEGORIES.find(x=>x[1]===category)?.[0]||'Expense'} history`}>
   <Table headers={['Date','Category','Description','Amount','Account','Paid By']} rows={rows.map(e=>[e.date,e.category,e.description||'—',money(e.amount),e.account||'Cash',e.paidBy||'—'])}/>
  </Panel>
  {edit&&<Modal title="Record Expense" close={()=>setEdit(null)}><div className="formgrid">
    <label>Date<input type="date" value={edit.date||today()} onChange={e=>setEdit({...edit,date:e.target.value})}/></label>
    <label>Category<select value={edit.categoryKey} onChange={e=>setEdit({...edit,categoryKey:e.target.value})}>{CATEGORIES.map(([n,k])=><option key={k} value={k}>{n}</option>)}</select></label>
    <label>Description<input value={edit.description||''} onChange={e=>setEdit({...edit,description:e.target.value})}/></label>
    <label>Amount<input type="number" min="0" value={edit.amount??0} onChange={e=>setEdit({...edit,amount:e.target.value})}/></label>
    <label>Paid From<select value={edit.account||'Cash'} onChange={e=>setEdit({...edit,account:e.target.value})}><option>Cash</option><option>Bank</option><option>Card</option></select></label>
    <label>Notes<input value={edit.notes||''} onChange={e=>setEdit({...edit,notes:e.target.value})}/></label>
  </div><button className="primary full" onClick={()=>save(edit)}>Save & Post to Account</button></Modal>}
 </div>;
}
