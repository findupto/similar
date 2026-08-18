export const DEFAULT_BUSINESS={name:'MK Pizza & Ice Bar',address:'Collage Road Abbas Chowk, Bhakkar, Pakistan',phone:'0316 9700025',currency:'Rs.',tax:0};
export const USERS=[{username:'admin',role:'Admin',password:'0099'},{username:'owner',role:'Owner',password:'0099'},{username:'cashier',role:'Cashier',password:'0099'},{username:'accountant',role:'Accountant',password:'0099'}];
export const SEED_PRODUCTS=[{id:'PIZ-001',name:'Chicken Pizza',category:'Pizza',sku:'PIZ-001',barcode:'100001',price:850,cost:500,stock:25,active:true,tax:0},{id:'BUR-001',name:'Beef Burger',category:'Burgers',sku:'BUR-001',barcode:'100002',price:550,cost:300,stock:18,active:true,tax:0},{id:'SID-001',name:'Fries',category:'Sides',sku:'SID-001',barcode:'100003',price:250,cost:120,stock:40,active:true,tax:0},{id:'ICE-001',name:'Vanilla Ice Cream',category:'Ice Cream',sku:'ICE-001',barcode:'100004',price:220,cost:90,stock:30,active:true,tax:0},{id:'DRK-001',name:'Cold Drink',category:'Drinks',sku:'DRK-001',barcode:'100005',price:100,cost:55,stock:60,active:true,tax:0}];
export const SEED_CUSTOMERS=[{id:'C-001',name:'Walk-in Customer',phone:'',email:'',address:'',balance:0,points:0,active:true},{id:'C-002',name:'Ahmed Traders',phone:'0300-1234567',email:'',address:'',balance:0,points:820,active:true},{id:'C-003',name:'Sara Khan',phone:'0312-9876543',email:'',address:'',balance:1250,points:240,active:true}];
export const SEED_SUPPLIERS=[];
export const SEED_STAFF=[];
export const STORAGE_KEY='findupto-pos-v3';
export const loadState=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{}}catch{return {}}};
export const saveState=s=>{
  try{
    const previous=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    const previousSaleIds=new Set((previous.sales||[]).map(x=>x.id));
    const products=s.products||[];
    const newSales=(s.sales||[]).filter(x=>!previousSaleIds.has(x.id));
    const applied=[];
    for(const sale of newSales){
      for(const item of (sale.items||[])){
        const dealProduct=products.find(p=>p.id===item.productId&&p.isDeal&&p.dealComponents);
        if(!dealProduct) continue;
        const qty=Number(item.qty)||0;
        const components=dealProduct.dealComponents||[];
        item.components=components.map(c=>({...c,quantity:(Number(c.quantity)||0)*qty}));
        for(const c of components){const p=products.find(x=>x.id===c.productId);if(p)p.stock=Math.max(0,(Number(p.stock)||0)-((Number(c.quantity)||0)*qty));}
        applied.push({saleId:sale.id,dealId:dealProduct.dealId,deal:dealProduct.name,quantity:qty,components:item.components});
      }
    }
    for(const p of products.filter(x=>x.isDeal&&x.dealComponents))p.stock=p.dealComponents.length?Math.max(0,...p.dealComponents.map(c=>{const source=products.find(x=>x.id===c.productId);const q=Number(c.quantity)||1;return source?Math.floor((Number(source.stock)||0)/q):0})):0;
    s.inventoryMoves=s.inventoryMoves||[];
    for(const x of applied)for(const c of x.components)s.inventoryMoves.push({id:uid('MOV'),date:today(),type:'DEAL_COMPONENT_SALE',productId:c.productId,product:c.name,qty:-c.quantity,reference:x.saleId,deal:x.deal,by:'POS'});
    if(applied.length)s.audit=[...(s.audit||[]),...applied.map(x=>({id:uid('AUD'),date:today(),action:`Deal ${x.deal} stock recipe applied to ${x.saleId}`,by:'POS'}))];
    localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
  }catch(e){localStorage.setItem(STORAGE_KEY,JSON.stringify(s));}
};
export const money=n=>`${DEFAULT_BUSINESS.currency} ${Number(n||0).toLocaleString()}`;
export const csvEscape=v=>`"${String(v??'').replaceAll('"','""')}"`;
export const productsToCSV=products=>[['name','sku','barcode','category','cost','price','tax','stock','status','type','isDeal','dealComponents','bundlePrice'],...products.map(p=>[p.name,p.sku,p.barcode,p.category,p.cost,p.price,p.tax,p.stock,p.active?'active':'inactive',p.isDeal?'deal':'product',p.isDeal?'yes':'no',p.isDeal?(p.dealComponents||[]).map(c=>`${c.sku||c.name||c.productId} x${c.quantity}`).join(' + '):'',p.isDeal?p.price:''])].map(r=>r.map(csvEscape).join(',')).join('\n');
export function parseCSV(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&q&&n==='"'){cell+='"';i++;continue}if(c==='"'){q=!q;continue}if(c===','&&!q){row.push(cell);cell='';continue}if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';continue}cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
export const downloadText=(name,text,type='text/csv')=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};
export const uid=p=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
export const today=()=>new Date().toLocaleString();
