import fs from 'node:fs';

const file='src/main.jsx';
let text=fs.readFileSync(file,'utf8');

// Repair the Orders payment modal markup before Vite parses JSX.
text=text.replace('</button></div></div></Modal>}{edit&&<OrderEditor','</button></div></Modal>}{edit&&<OrderEditor');

// POS: products with variants must always open the variant picker.
const posStart=text.indexOf('function POS({state,setState,user}){');
const ordersStart=text.indexOf('function Orders',posStart);
if(posStart<0||ordersStart<0)throw new Error('Unable to locate POS function boundaries.');
let pos=text.slice(posStart,ordersStart);

const openStart=pos.indexOf('const openProduct=');
const toggleStart=pos.indexOf('const toggleVariant=',openStart);
if(openStart<0||toggleStart<0)throw new Error('Unable to locate POS variant handlers.');
pos=pos.slice(0,openStart)+"const openProduct=p=>{const vs=variantsOf(p);if(vs.length){setVariantProduct(p);setSelectedVariants([]);return}setCart(c=>c.some(x=>x.id===p.id&&!x.variantId)?c.map(x=>x.id===p.id&&!x.variantId?{...x,qty:Math.min(stock(p,state),x.qty+1)}:x):[...c,{...p,qty:1,variantId:null,variantName:null,productId:p.id}]);};"+pos.slice(toggleStart);

// Keep a parent product visible when any active variant has stock.
const variantFilter='hasVariants(p)?variantsOf(p).some(v=>v?.active!==false&&variantStock(p,v)>0):stock(p,state)>0';
const filterStart=pos.indexOf('hasVariants(p)?variantsOf(p).some(');
if(filterStart>=0){
  const filterEnd=pos.indexOf(')&&`',filterStart);
  if(filterEnd>=0)pos=pos.slice(0,filterStart)+variantFilter+pos.slice(filterEnd);
}

text=text.slice(0,posStart)+pos+text.slice(ordersStart);
fs.writeFileSync(file,text);
console.log('Applied POS variant-selection and JSX repair.');
