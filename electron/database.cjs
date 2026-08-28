const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

let db;

function getDatabase() {
  if (db) return db;
  const dir = path.join(require('electron').app.getPath('userData'), 'data');
  fs.mkdirSync(dir, { recursive: true });
  db = new Database(path.join(dir, 'mk-pizza-pos.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL DEFAULT 1,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      actor TEXT,
      created_at TEXT NOT NULL,
      metadata_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
  `);
  return db;
}

function loadState() {
  const row = getDatabase().prepare('SELECT state_json FROM app_state WHERE id=1').get();
  if (!row) return null;
  try { return JSON.parse(row.state_json); } catch { return null; }
}

function saveState(state, actor = 'system') {
  if (!state || typeof state !== 'object') throw new Error('Invalid POS state');
  const database = getDatabase();
  const now = new Date().toISOString();
  const write = database.transaction(() => {
    database.prepare(`INSERT INTO app_state(id,version,state_json,updated_at) VALUES(1,1,?,?)
      ON CONFLICT(id) DO UPDATE SET state_json=excluded.state_json, updated_at=excluded.updated_at`).run(JSON.stringify(state), now);
    database.prepare('INSERT INTO audit_log(action,actor,created_at,metadata_json) VALUES(?,?,?,?)')
      .run('STATE_SAVED', String(actor || 'system').slice(0, 120), now, JSON.stringify({ version: 1 }));
  });
  write();
  return { ok: true, updatedAt: now };
}

function backup(targetPath) {
  const database = getDatabase();
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  database.backup(targetPath);
  return targetPath;
}

function close() { if (db) { db.close(); db = null; } }

module.exports = { loadState, saveState, backup, close };
