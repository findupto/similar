const KEY = 'mkpos:last-printer';

function escPosReceipt({ business, address, phone, invoice, date, customer, items, subtotal, discount, total, method, paid, change }) {
  const line = '--------------------------------';
  const center = s => `\x1b\x61\x01${s}\x1b\x61\x00`;
  let out = '\x1b\x40';
  out += center(`\x1b\x45\x01${business}\x1b\x45\x00\n`);
  out += center(`${address}\n${phone}\n`);
  out += `${line}\nInvoice: ${invoice}\n${date}\nCustomer: ${customer}\n${line}\n`;
  for (const i of items) out += `${String(i.qty).padStart(2)} x ${i.name.slice(0,22).padEnd(22)} ${Number(i.total).toFixed(2).padStart(7)}\n`;
  out += `${line}\nSubtotal: ${Number(subtotal).toFixed(2).padStart(18)}\nDiscount: ${Number(discount).toFixed(2).padStart(18)}\n`;
  out += `TOTAL ${Number(total).toFixed(2).padStart(21)}\nPayment: ${method}\nPaid: ${Number(paid).toFixed(2)}\nChange: ${Number(change).toFixed(2)}\n${line}\n`;
  out += center('Thank you!\n\n\n') + '\x1d\x56\x00';
  return out;
}

export const PrinterBridge = {
  async discover() {
    if (window.mkPosDesktop?.discoverPrinters) return window.mkPosDesktop.discoverPrinters();
    return [{ id: 'system', name: 'System Printer', type: 'Browser fallback' }];
  },
  async reconnect() {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved) return null;
    const list = await this.discover();
    return list.find(p => p.id === saved.id || p.port === saved.port) || null;
  },
  async connect(printer) {
    localStorage.setItem(KEY, JSON.stringify(printer));
    return printer;
  },
  async test(printer) {
    if (window.mkPosDesktop?.printEscPos && printer.port) return window.mkPosDesktop.printEscPos({ port: printer.port, data: '\x1b\x40\x1b\x45\x01MK Pizza POS\x1b\x45\x00\nPrinter test OK\n\n\x1d\x56\x00' });
    window.print();
    return { ok: true };
  },
  async print(receipt, printer) {
    const target = printer?.port ? printer : await this.reconnect();
    const data = escPosReceipt(receipt);
    if (window.mkPosDesktop?.printEscPos && target?.port) {
      const result = await window.mkPosDesktop.printEscPos({ port: target.port, data });
      if (result?.ok) return result;
    }
    // Universal fallback: use the OS/browser print dialog if no native printer is available.
    window.print();
    return { ok: true, fallback: true };
  }
};
