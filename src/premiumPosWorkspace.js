import {uid} from './posData';

export const createPosWorkspace=({categories=[],products=[],cart=[],query='',activeCategory='ALL'}={})=>({query,activeCategory,categories,products,cart,heldOrders:[],selectedCustomer:null,paymentOpen:false});
export const filterProducts=(products,{query='',category='ALL'}={})=>{const q=String(query||'').trim().toLowerCase();return(products||[]).filter(p=>(category==='ALL'||p.categoryId===category||p.category===category)&&(!q||[p.name,p.sku,p.barcode].some(v=>String(v||'').toLowerCase().includes(q))))};
export const addCartItem=(cart,product,qty=1)=>{const q=Math.max(1,Number(qty)||1),i=cart.findIndex(x=>x.productId===product.id);if(i<0)return[...cart,{id:uid('LINE'),productId:product.id,name:product.name,price:Number(product.price||0),qty:q}];return cart.map((x,n)=>n===i?{...x,qty:x.qty+q}:x)};
export const updateCartQty=(cart,lineId,qty)=>cart.map(x=>x.id===lineId?{...x,qty:Math.max(0,Number(qty)||0)}:x).filter(x=>x.qty>0);
export const cartSubtotal=cart=>(cart||[]).reduce((a,x)=>a+Number(x.price||0)*Number(x.qty||0),0);
export const holdOrder=(workspace,metadata={})=>({...workspace,cart:[],heldOrders:[...(workspace.heldOrders||[]),{id:uid('HOLD'),items:workspace.cart,date:new Date().toISOString(),...metadata}]});
export const recallOrder=(workspace,id)=>{const order=(workspace.heldOrders||[]).find(x=>x.id===id);return order?{...workspace,cart:order.items,heldOrders:workspace.heldOrders.filter(x=>x.id!==id)}:workspace};
export const openPayment=(workspace)=>({...workspace,paymentOpen:true});
export const closePayment=(workspace)=>({...workspace,paymentOpen:false});
export const checkoutSummary=(workspace,totals={})=>({items:workspace.cart,subtotal:cartSubtotal(workspace.cart),...totals});
export const barcodeLookup=(products,code)=>{const c=String(code||'').trim().toLowerCase();return(products||[]).find(p=>String(p.barcode||'').toLowerCase()===c||String(p.sku||'').toLowerCase()===c)||null};
export const touchGrid=(products,columns=4)=>Array.from({length:Math.ceil(products.length/columns)},(_,r)=>products.slice(r*columns,r*columns+columns));
