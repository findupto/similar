export const DEFAULT_BUSINESS={name:'MK Pizza & Ice Bar',address:'Collage Road Abbas Chowk, Bhakkar, Pakistan',phone:'0316 9700025',currency:'Rs.',tax:0};
export const USERS=[{username:'admin',role:'Admin',password:'0099'},{username:'owner',role:'Owner',password:'0099'},{username:'cashier',role:'Cashier',password:'0099'},{username:'accountant',role:'Accountant',password:'0099'}];
export const SEED_PRODUCTS=[{id:'PIZ-001',name:'Chicken Pizza',category:'Pizza',sku:'PIZ-001',barcode:'100001',price:850,cost:500,stock:25,active:true,tax:0},{id:'BUR-001',name:'Beef Burger',category:'Burgers',sku:'BUR-001',barcode:'100002',price:550,cost:300,stock:18,active:true,tax:0},{id:'SID-001',name:'Fries',category:'Sides',sku:'SID-001',barcode:'100003',price:250,cost:120,stock:40,active:true,tax:0},{id:'ICE-001',name:'Vanilla Ice Cream',category:'Ice Cream',sku:'ICE-001',barcode:'100004',price:220,cost:90,stock:30,active:true,tax:0},{id:'DRK-001',name:'Cold Drink',category:'Drinks',sku:'DRK-001',barcode:'100005',price:100,cost:55,stock:60,active:true,tax:0}];
export const SEED_CUSTOMERS=[{id:'C-001',name:'Walk-in Customer',phone:'',email:'',address:'',balance:0,points:0,active:true},{id:'C-002',name:'Ahmed Traders',phone:'0300-1234567',email:'',address:'',balance:0,points:820,active:true},{id:'C-003',name:'Sara Khan',phone:'0312-9876543',email:'',address:'',balance:1250,points:240,active:true}];
export const SEED_SUPPLIERS=[];
export const SEED_STAFF=[];
export const STORAGE_KEY='findupto-pos-v3';
export const uid=p=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
export const today=()=>new Date().toLocaleString();
export const money=n=>`${DEFAULT_BUSINESS.currency} ${Number(n||0).toLocaleString()}`;

export const parseCSV=text=>{const rows=[];let row=[],cell='',quoted=false;const input=String(text??'').replace(/^\uFEFF/,'');for(let i=0;i<input.length;i++){const c=input[i],n=input[i+1];if(c==='"'&&quoted&&n==='"'){cell+='"';i++;continue}if(c==='"'){quoted=!quoted;continue}if(c===','&&!quoted){row.push(cell);cell='';continue}if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(v=>String(v).trim()!==''))rows.push(row);row=[];continue}cell+=c}if(cell!==''||row.length){row.push(cell);if(row.some(v=>String(v).trim()!==''))rows.push(row)}return rows};

export const downloadText=(filename,text,mime='text/plain')=>{const blob=new Blob([String(text??'')],{type:`${mime};charset=utf-8`});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};

export const loadState=()=>{try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):null}catch{return null}};
export const saveState=s=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(s));return true}catch{return false}};
