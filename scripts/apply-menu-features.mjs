import fs from 'node:fs';

const file='src/main.jsx';
let text=fs.readFileSync(file,'utf8');

// Keep the POS variant selector authoritative: a product with variants must
// open the selector instead of being added as the parent product. Variants
// with zero stock remain selectable/visible in the picker but are disabled
// there; the product card itself is shown whenever it has any active variant.
const posStart=text.indexOf('function POS({state,setState,user}){');
const ordersStart=text.indexOf('function Orders',posStart);
if(posStart<0||ordersStart<0)throw new Error('Unable to locate POS function boundaries.');
let pos=text.slice(posStart,ordersStart);

// The POS implementation already contains addLine(), variant state and a
// variant picker. Replace only the product-opening decision so barcode/SKU
// scans and normal clicks follow the same variant flow.
pos=pos.replace(
  /const openProduct=[\\s\\S]*?;const items=/,
  "const openProduct=p=>{const vs=variantsOf(p);if(vs.length){setVariantProduct(p);setSelectedVariants([]);return}addLine(p,null,1)};const items="
);

// If the current POS implementation uses an inline/openProduct variant that
// differs from the expected form, inject a safe definition immediately before
// the product list instead of silently leaving the bug in place.
if(!pos.includes('const openProduct=p=>')){
  const marker='const items=';
  const at=pos.indexOf(marker);
  if(at<0)throw new Error('Unable to locate POS product list.');
  pos=pos.slice(0,at)+"const openProduct=p=>{const vs=variantsOf(p);if(vs.length){setVariantProduct(p);setSelectedVariants([]);return}addLine(p,null,1)};"+pos.slice(at);
}

// Ensure product cards are not hidden merely because the parent product has
// no stock when one of its variants has stock.
pos=pos.replace(
  /hasVariants\(p\)\?variantsOf\(p\)\.some\(v=>v\?\.active!==false&&variantStock\(p,v\)>0\):stock\(p,state\)>0/,
  'hasVariants(p)?variantsOf(p).some(v=>v?.active!==false&&variantStock(p,v)>0):stock(p,state)>0'
);

text=text.slice(0,posStart)+pos+text.slice(ordersStart);
fs.writeFileSync(file,text);
console.log('Applied POS variant-selection fix.');
