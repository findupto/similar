import fs from 'node:fs';

const file='src/main.jsx';
let text=fs.readFileSync(file,'utf8');

// Repair the existing Orders payment modal markup before Vite parses JSX.
// The generated source had one extra closing div immediately before the
// OrderEditor modal, which causes esbuild to stop before POS can load.
text=text.replace('</button></div></div></Modal>}{edit&&<OrderEditor','</button></div></Modal>}{edit&&<OrderEditor');

// Keep the POS variant selector authoritative: a product with variants must
// open the selector instead of being added as the parent product.
const posStart=text.indexOf('function POS({state,setState,user}){');
const ordersStart=text.indexOf('function Orders',posStart);
if(posStart<0||ordersStart<0)throw new Error('Unable to locate POS function boundaries.');
let pos=text.slice(posStart,ordersStart);

// Barcode/SKU scans and normal product clicks should use the same variant flow.
pos=pos.replace(
  /const openProduct=[\\s\\S]*?;const items=/,
  "const openProduct=p=>{const vs=variantsOf(p);if(vs.length){setVariantProduct(p);setSelectedVariants([]);return}addLine(p,null,1)};const items="
);

if(!pos.includes('const openProduct=p=>')){
  const marker='const items=';
  const at=pos.indexOf(marker);
  if(at<0)throw new Error('Unable to locate POS product list.');
  pos=pos.slice(0,at)+"const openProduct=p=>{const vs=variantsOf(p);if(vs.length){setVariantProduct(p);setSelectedVariants([]);return}addLine(p,null,1)};"+pos.slice(at);
}

// A parent product with variants should remain visible when any active
// variant has stock, even if the parent stock field itself is zero.
pos=pos.replace(
  /hasVariants\(p\)\?variantsOf\(p\)\.some\(v=>v\?\.active!==false&&variantStock\(p,v\)>0\):stock\(p,state\)>0/,
  'hasVariants(p)?variantsOf(p).some(v=>v?.active!==false&&variantStock(p,v)>0):stock(p,state)>0'
);

text=text.slice(0,posStart)+pos+text.slice(ordersStart);
fs.writeFileSync(file,text);
console.log('Applied POS variant-selection and JSX repair.');
