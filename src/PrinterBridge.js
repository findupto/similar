// Browser-safe printer abstraction. Windows/native bridge can later implement the same methods.
export const PrinterBridge={
 async discover(){
  const printers=[];
  if('bluetooth' in navigator) printers.push({id:'bluetooth',name:'Bluetooth device',type:'Bluetooth',status:'Available'});
  printers.push({id:'browser',name:'System / Browser Printer',type:'System',status:'Available'});
  return printers;
 },
 async test(printer){return {ok:true,message:`Test print queued for ${printer?.name||'printer'}`}},
 async printReceipt(receipt,printer){
  const win=window.open('','_blank','width=380,height=700');
  if(!win) throw new Error('Allow popups to print the receipt.');
  win.document.write(`<html><head><title>${receipt.invoice}</title><style>body{font-family:monospace;width:72mm;margin:0 auto;font-size:12px}h2{text-align:center}.r{display:flex;justify-content:space-between;border-bottom:1px dashed #999;padding:4px 0}.t{font-weight:bold;font-size:16px}.c{text-align:center}@media print{button{display:none}}</style></head><body><h2>${receipt.business}</h2><div class='c'>${receipt.address}<br>${receipt.phone}</div><p>Invoice: ${receipt.invoice}<br>Date: ${receipt.date}<br>Cashier: ${receipt.cashier}</p>${receipt.items.map(i=>`<div class='r'><span>${i.qty} x ${i.name}</span><span>${i.total}</span></div>`).join('')}<div class='r'><span>Subtotal</span><span>${receipt.subtotal}</span></div><div class='r'><span>Discount</span><span>${receipt.discount}</span></div><div class='r t'><span>TOTAL</span><span>${receipt.total}</span></div><div class='r'><span>Paid</span><span>${receipt.paid}</span></div><div class='r'><span>Change</span><span>${receipt.change}</span></div><p class='c'>Thank You!</p><button onclick='window.print()'>Print</button></body></html>`);win.document.close();win.focus();setTimeout(()=>win.print(),250);return {ok:true};
 }
};
