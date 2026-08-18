export const DEFAULT_BUSINESS={name:'MK Pizza & Ice Bar',address:'Collage Road Abbas Chowk, Bhakkar, Pakistan',phone:'0316 9700025',currency:'Rs.',tax:0};
export const USERS=[{username:'admin',role:'Admin',password:'0099'},{username:'owner',role:'Owner',password:'0099'},{username:'cashier',role:'Cashier',password:'0099'},{username:'accountant',role:'Accountant',password:'0099'}];
export const SEED_PRODUCTS=[
{id:'PIZ-001',name:'Chicken Pizza',category:'Pizza',sku:'PIZ-001',barcode:'100001',price:850,cost:500,stock:25,active:true,tax:0},
{id:'BUR-001',name:'Beef Burger',category:'Burgers',sku:'BUR-001',barcode:'100002',price:550,cost:300,stock:18,active:true,tax:0},
{id:'SID-001',name:'Fries',category:'Sides',sku:'SID-001',barcode:'100003',price:250,cost:120,stock:40,active:true,tax:0},
{id:'ICE-001',name:'Vanilla Ice Cream',category:'Ice Cream',sku:'ICE-001',barcode:'100004',price:220,cost:90,stock:30,active:true,tax:0},
{id:'DRK-001',name:'Cold Drink',category:'Drinks',sku:'DRK-001',barcode:'100005',price:100,cost:55,stock:60,active:true,tax:0}];
export const SEED_CUSTOMERS=[{id:'C-001',name:'Walk-in Customer',phone:'',balance:0,points:0},{id:'C-002',name:'Ahmed Traders',phone:'0300-1234567',balance:0,points:820},{id:'C-003',name:'Sara Khan',phone:'0312-9876543',balance:1250,points:240}];
export const STORAGE_KEY='findupto-pos-v2';
export const loadState=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{}}catch{return {}}};
export const saveState=s=>localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
export const money=n=>`${DEFAULT_BUSINESS.currency} ${Number(n||0).toLocaleString()}`;
export const csvEscape=v=>`"${String(v??'').replaceAll('"','""')}"`;
export const productsToCSV=products=>[['name','sku','barcode','category','cost','price','tax','stock','status'],...products.map(p=>[p.name,p.sku,p.barcode,p.category,p.cost,p.price,p.tax,p.stock,p.active?'active':'inactive'])].map(r=>r.map(csvEscape).join(',')).join('\n');
export function parseCSV(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&q&&n==='"'){cell+='"';i++;continue}if(c==='"'){q=!q;continue}if(c===','&&!q){row.push(cell);cell='';continue}if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';continue}cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
export const downloadText=(name,text,type='text/csv')=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};
