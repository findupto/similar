import express from 'express';
import cors from 'cors';
import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 8080);
const apiToken = String(process.env.POS_API_TOKEN || '').trim();
const allowedOrigin = String(process.env.POS_ALLOWED_ORIGIN || '').trim();

if (!apiToken) {
  console.error('[MK POS API] POS_API_TOKEN is required');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('[MK POS API] DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  max: Number(process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors({ origin: allowedOrigin || false, methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '1mb', strict: true }));

const auth = (req, res, next) => {
  const value = String(req.headers.authorization || '');
  const expected = `Bearer ${apiToken}`;
  if (value.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected))) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

const requestWindow = new Map();
const rateLimit = (limit = 120, windowMs = 60000) => (req, res, next) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const current = requestWindow.get(key);
  if (!current || now - current.startedAt >= windowMs) { requestWindow.set(key, { startedAt: now, count: 1 }); return next(); }
  current.count += 1;
  if (current.count > limit) { res.setHeader('Retry-After', Math.ceil((windowMs - (now - current.startedAt)) / 1000)); return res.status(429).json({ error: 'Too many requests' }); }
  next();
};

const validStatus = new Set(['NEW', 'ACCEPTED', 'REJECTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']);
const validTransitions = {
  NEW: new Set(['ACCEPTED', 'REJECTED', 'CANCELLED']),
  ACCEPTED: new Set(['PREPARING', 'CANCELLED']),
  PREPARING: new Set(['READY', 'CANCELLED']),
  READY: new Set(['OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']),
  OUT_FOR_DELIVERY: new Set(['COMPLETED', 'CANCELLED']),
  COMPLETED: new Set(), REJECTED: new Set(), CANCELLED: new Set()
};

let initialized = false;
async function db() {
  if (initialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menus(id text PRIMARY KEY, settings jsonb NOT NULL DEFAULT '{}', products jsonb NOT NULL DEFAULT '[]', updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS orders(id text PRIMARY KEY, menu_id text NOT NULL DEFAULT 'default', status text NOT NULL, channel text NOT NULL, customer jsonb NOT NULL, items jsonb NOT NULL, total numeric NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status, created_at);
    CREATE INDEX IF NOT EXISTS orders_menu_created_idx ON orders(menu_id, created_at);
  `);
  initialized = true;
}

const normalizeOrder = (body) => {
  const customer = body?.customer, items = body?.items, total = Number(body?.total);
  if (!customer || typeof customer !== 'object' || Array.isArray(customer)) return null;
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) return null;
  if (!Number.isFinite(total) || total < 0 || total > 100000000) return null;
  const safeItems = items.map(item => ({ productId: String(item?.productId || '').slice(0, 100), name: String(item?.name || '').slice(0, 200), qty: Number(item?.qty), price: Number(item?.price), total: Number(item?.total) }));
  if (safeItems.some(i => !i.productId || !i.name || !Number.isInteger(i.qty) || i.qty <= 0 || i.qty > 10000 || !Number.isFinite(i.price) || i.price < 0 || !Number.isFinite(i.total) || i.total < 0)) return null;
  return { customer: JSON.parse(JSON.stringify(customer)), items: safeItems, total };
};

app.get('/api/health', async (_req, res) => {
  try { await db(); await pool.query('SELECT 1'); res.json({ ok: true, service: 'mk-pizza-online-server' }); }
  catch { res.status(503).json({ ok: false, error: 'Database unavailable' }); }
});

app.put('/api/menu', auth, rateLimit(60), async (req, res) => {
  try {
    await db();
    const menuId = String(req.body?.menuId || 'default').trim().slice(0, 100);
    const settings = req.body?.settings && typeof req.body.settings === 'object' ? req.body.settings : {};
    const products = Array.isArray(req.body?.products) ? req.body.products.slice(0, 5000) : [];
    await pool.query('INSERT INTO menus(id,settings,products) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET settings=$2,products=$3,updated_at=now()', [menuId, settings, JSON.stringify(products)]);
    res.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch { res.status(500).json({ error: 'Unable to save menu' }); }
});

app.get('/api/menu/:menuId', rateLimit(120), async (req, res) => {
  try {
    await db();
    const id = String(req.params.menuId || '').slice(0, 100);
    const result = await pool.query('SELECT * FROM menus WHERE id=$1', [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Menu not found' });
    const row = result.rows[0];
    res.json({ settings: row.settings, products: row.products, updatedAt: row.updated_at });
  } catch { res.status(500).json({ error: 'Unable to load menu' }); }
});

app.post('/api/orders', rateLimit(30), async (req, res) => {
  try {
    await db();
    const normalized = normalizeOrder(req.body);
    if (!normalized) return res.status(400).json({ error: 'Invalid order' });
    const menuId = String(req.body?.menuId || 'default').trim().slice(0, 100);
    const id = `WEB-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    await pool.query('INSERT INTO orders(id,menu_id,status,channel,customer,items,total) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, menuId, 'NEW', 'WEBSITE', normalized.customer, JSON.stringify(normalized.items), normalized.total]);
    res.status(201).json({ ok: true, orderId: id, status: 'NEW' });
  } catch { res.status(500).json({ error: 'Unable to create order' }); }
});

app.get('/api/orders', auth, rateLimit(120), async (req, res) => {
  try {
    await db();
    const status = String(req.query.status || 'NEW');
    if (!validStatus.has(status)) return res.status(400).json({ error: 'Invalid status' });
    const result = await pool.query('SELECT * FROM orders WHERE status=$1 ORDER BY created_at ASC LIMIT 500', [status]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Unable to load orders' }); }
});

app.patch('/api/orders/:id', auth, rateLimit(120), async (req, res) => {
  try {
    await db();
    const id = String(req.params.id || '').slice(0, 100), next = String(req.body?.status || '');
    if (!validStatus.has(next)) return res.status(400).json({ error: 'Invalid status' });
    const currentResult = await pool.query('SELECT status FROM orders WHERE id=$1', [id]);
    if (!currentResult.rowCount) return res.status(404).json({ error: 'Order not found' });
    const current = currentResult.rows[0].status;
    if (current !== next && !validTransitions[current]?.has(next)) return res.status(409).json({ error: `Invalid transition: ${current} -> ${next}` });
    const result = await pool.query('UPDATE orders SET status=$1,updated_at=now() WHERE id=$2 RETURNING *', [next, id]);
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Unable to update order' }); }
});

const onlineDir = new URL('../online/', import.meta.url).pathname;
app.use(express.static(onlineDir));
app.use((_req, res) => res.sendFile(new URL('../online/index.html', import.meta.url).pathname));

process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
app.listen(port, () => console.log(`[MK POS API] listening on ${port}`));
