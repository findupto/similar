const crypto = require('node:crypto');

function arr(state, keys) {
  for (const key of keys) if (Array.isArray(state?.[key])) return state[key];
  return [];
}
function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function analyze(state = {}) {
  const products = arr(state, ['products', 'items', 'menuItems']);
  const sales = arr(state, ['sales', 'orders', 'invoices']);
  const customers = arr(state, ['customers', 'clients']);
  const inventory = arr(state, ['inventory', 'stockItems']);
  const totals = sales.map(s => money(s.total ?? s.grandTotal ?? s.amount ?? s.netTotal));
  const revenue = totals.reduce((a, b) => a + b, 0);
  const avgTicket = totals.length ? revenue / totals.length : 0;
  const lowStock = inventory.filter(i => {
    const qty = money(i.stock ?? i.quantity ?? i.onHand);
    const min = money(i.minStock ?? i.reorderLevel ?? 0);
    return min > 0 ? qty <= min : qty <= 3;
  });
  const productSales = new Map();
  for (const sale of sales) {
    for (const item of (Array.isArray(sale.items) ? sale.items : [])) {
      const name = String(item.name ?? item.productName ?? item.title ?? item.sku ?? 'Unknown item');
      const qty = money(item.quantity ?? item.qty ?? 1);
      const amount = money(item.total ?? item.lineTotal ?? item.amount ?? item.price) * (item.total == null && item.lineTotal == null && item.amount == null ? qty : 1);
      const previous = productSales.get(name) || { name, quantity: 0, revenue: 0 };
      previous.quantity += qty;
      previous.revenue += amount;
      productSales.set(name, previous);
    }
  }
  const bestSellers = [...productSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const warnings = [];
  if (!sales.length) warnings.push('No sales history is available yet. AI recommendations will become more accurate after transactions are recorded.');
  if (lowStock.length) warnings.push(`${lowStock.length} inventory item${lowStock.length === 1 ? '' : 's'} need attention.`);
  if (avgTicket > 0 && avgTicket < 500) warnings.push('Average ticket is relatively low; consider bundles, add-ons and upsell prompts.');
  if (bestSellers.length) warnings.push(`Focus staff upselling around ${bestSellers[0].name}, currently the strongest observed seller.`);
  const recommendations = [];
  if (lowStock.length) recommendations.push({ priority: 'high', action: 'Reorder', detail: `Review ${lowStock.slice(0, 5).map(x => x.name || x.sku || 'stock item').join(', ')}.` });
  if (bestSellers.length) recommendations.push({ priority: 'medium', action: 'Promote winners', detail: `Feature ${bestSellers.slice(0, 3).map(x => x.name).join(', ')} in combos or prominent menu positions.` });
  if (customers.length && avgTicket > 0) recommendations.push({ priority: 'medium', action: 'Increase repeat sales', detail: `Use customer history to target returning customers with relevant offers rather than blanket discounts.` });
  return {
    generatedAt: new Date().toISOString(),
    confidence: sales.length >= 100 ? 'high' : sales.length >= 20 ? 'medium' : 'early',
    metrics: { revenue, transactions: sales.length, averageTicket: Number(avgTicket.toFixed(2)), products: products.length, customers: customers.length, lowStock: lowStock.length },
    bestSellers,
    warnings,
    recommendations,
    note: 'This local copilot uses POS data only. It never sends business data to a third-party AI service.'
  };
}
function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pin), salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPin(pin, salt, hash) {
  if (!salt || !hash) return false;
  const actual = crypto.scryptSync(String(pin), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(hash, 'hex'));
}
module.exports = { analyze, hashPin, verifyPin };
