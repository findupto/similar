import './salesAudit.js';

const KEY = 'mkpos:last-printer';
const THEME_KEY = 'mkpos:receipt-theme';

export const RECEIPT_THEMES = {
  classic: { name: 'Classic 80mm', width: 48, divider: '------------------------------------------------' },
  modern: { name: 'Modern 80mm', width: 48, divider: '================================================' },
  compact: { name: 'Compact 80mm', width: 48, divider: '----------------------------------------' }
};

const fit = (value, width) => String(value ?? '').slice(0, width);
const moneyLine = (label, value, width) => `${label}${Number(value || 0).toFixed(2).padStart(Math.max(1, width - label.length))}`;

function escPosReceipt({ business, address, phone, invoice, date, customer, items, subtotal, discount = 0, total, method, paid, change, theme = 'classic' }) {
  const t = RECEIPT_THEMES[theme] || RECEIPT_THEMES.classic;
  const w = t.width;
  const center = s => `\x1b\x61\x01${s}\x1b\x61\x00`;
  let out = '\x1b\x40\x1b\x21\x00';
  out += center(`\x1b\x45\x01${fit(business, w)}\x1b\x45\x00\n`);
  out += center(`${fit(address, w)}\n${fit(phone, w)}\n`);
  out += `${t.divider}\nInvoice: ${invoice}\n${date}\nCustomer: ${fit(customer, w - 10)}\n${t.divider}\n`;
  for (const i of items || []) {
    const name = fit(i.name, 27);
    const qty = String(i.qty).padStart(2);
    const amount = Number(i.total || 0).toFixed(2).padStart(9);
    out += `${qty} x ${name.padEnd(27)}${amount}\n`;
  }
  out += `${t.divider}\n${moneyLine('Subtotal:', subtotal, w)}\n${moneyLine('Discount:', discount, w)}\n`;
  out += `${'TOTAL'.padEnd(w - 12)}${Number(total || 0).toFixed(2).padStart(12)}\n`;
  out += `Payment: ${method}\n${moneyLine('Paid:', paid, w)}\n${moneyLine('Change:', change, w)}\n${t.divider}\n`;
  out += center(theme === 'modern' ? 'Thank you for visiting!\n' : 'Thank you!\n');
  out += '\n\n\x1d\x56\x00';
  return out;
}

function escPosKitchen({ business, address, phone, invoice, date, customer, items, theme = 'classic' }) {
  const t = RECEIPT_THEMES[theme] || RECEIPT_THEMES.classic;
  const w = t.width;
  const center = s => `\x1b\x61\x01${s}\x1b\x61\x00`;
  let out = '\x1b\x40\x1b\x21\x00';
  out += center(`\x1b\x45\x01${fit(business, w)}\x1b\x45\x00\nKITCHEN ORDER\n`);
  out += `${t.divider}\nOrder: ${invoice}\n${date}\nCustomer: ${fit(customer, w - 10)}\n${t.divider}\n`;
  for (const i of items || []) out += `${String(i.qty).padStart(2)} x ${fit(i.name, w - 7)}\n`;
  out += `${t.divider}\n${center('PREPARE ORDER\n')}\n\n\x1d\x56\x00`;
  return out;
}

async function send(data, printer) {
  const target = printer?.port ? printer : await PrinterBridge.reconnect();
  if (window.mkPosDesktop?.printEscPos && target?.port?.toUpperCase().startsWith('COM')) {
    const result = await window.mkPosDesktop.printEscPos({ port: target.port, data });
    if (result?.ok) return result;
  }
  window.print();
  return { ok: true, fallback: true };
}

export const PrinterBridge = {
  async discover() {
    if (window.mkPosDesktop?.discoverPrinters) {
      const printers = await window.mkPosDesktop.discoverPrinters();
      return printers.length ? printers : [{ id: 'system', name: 'System Printer', type: 'Browser fallback' }];
    }
    return [{ id: 'system', name: 'System Printer', type: 'Browser fallback' }];
  },
  async reconnect() {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved) return null;
    const list = await this.discover();
    return list.find(p => p.id === saved.id || p.port === saved.port || p.name === saved.name) || null;
  },
  async connect(printer) {
    const value = { ...printer, connectedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(value));
    return value;
  },
  async test(printer) {
    if (window.mkPosDesktop?.printEscPos && printer?.port?.toUpperCase().startsWith('COM')) return window.mkPosDesktop.printEscPos({ port: printer.port, data: '\x1b\x40\x1b\x45\x01MK Pizza POS\x1b\x45\x00\n80mm Printer Test OK\n\n\x1d\x56\x00' });
    window.print(); return { ok: true, fallback: true };
  },
  async print(receipt, printer) {
    const savedTheme = localStorage.getItem(THEME_KEY) || printer?.theme || 'classic';
    const data = escPosReceipt({ ...receipt, theme: savedTheme });
    const result = await send(data, printer);
    try { const { logPrint } = await import('./salesAudit.js'); logPrint('customer', receipt); } catch {}
    return result;
  },
  async printCustomer(receipt, printer) { return this.print(receipt, printer); },
  async printKitchen(order, printer) {
    const savedTheme = localStorage.getItem(THEME_KEY) || printer?.theme || 'classic';
    const data = escPosKitchen({ ...order, theme: savedTheme });
    const result = await send(data, printer);
    try { const { logPrint } = await import('./salesAudit.js'); logPrint('kitchen', order); } catch {}
    return result;
  },
  setTheme(theme) { const value = RECEIPT_THEMES[theme] ? theme : 'classic'; localStorage.setItem(THEME_KEY, value); return value; },
  getTheme() { return localStorage.getItem(THEME_KEY) || 'classic'; }
};
