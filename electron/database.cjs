const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const { app } = require('electron');

let db;
function getDatabase(){
  if(db)return db;
  const dir=path.join(app.getPath('userData'),'data');
  fs.mkdirSync(dir,{recursive:true});
  db=new Database(path.join(dir,'mk-pizza-pos.sqlite'));
  db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON'); db.pragma('busy_timeout = 5000');
  db.exec(`CREATE TABLE IF NOT EXISTS app_state(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL DEFAULT 1,state_json TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT,action TEXT NOT NULL,actor TEXT,created_at TEXT NOT NULL,metadata_json TEXT);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL UNIQUE,role TEXT NOT NULL,credential_salt TEXT NOT NULL,credential_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,last_login_at TEXT);
CREATE TABLE IF NOT EXISTS permissions(user_id INTEGER NOT NULL,permission TEXT NOT NULL,PRIMARY KEY(user_id,permission),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);`);
  return db;
}
function loadState(){const row=getDatabase().prepare('SELECT state_json FROM app_state WHERE id=1').get();if(!row)return null;try{return JSON.parse(row.state_json)}catch{return null}}
function saveState(state,actor='system'){if(!state||typeof state!=='object')throw new Error('Invalid POS state');const database=getDatabase(),now=new Date().toISOString();database.transaction(()=>{database.prepare(`INSERT INTO app_state(id,version,state_json,updated_at) VALUES(1,1,?,?) ON CONFLICT(id) DO UPDATE SET state_json=excluded.state_json,updated_at=excluded.updated_at`).run(JSON.stringify(state),now);database.prepare('INSERT INTO audit_log(action,actor,created_at,metadata_json) VALUES(?,?,?,?)').run('STATE_SAVED',String(actor||'system').slice(0,120),now,JSON.stringify({version:1}))})();return{ok:true,updatedAt:now}}
async function backup(targetPath){if(typeof targetPath!=='string'||!targetPath.trim())throw new Error('Invalid backup path');fs.mkdirSync(path.dirname(targetPath),{recursive:true});await getDatabase().backup(targetPath);return targetPath}
function integrityCheck(){const result=getDatabase().pragma('integrity_check',{simple:true});return{ok:result==='ok',result}}
function hashCredential(secret,salt=crypto.randomBytes(16).toString('hex')){return{salt,hash:crypto.scryptSync(String(secret),salt,64).toString('hex')}}
function ensureBootstrapAdmin(){const database=getDatabase();if(database.prepare('SELECT 1 FROM users LIMIT 1').get())return;const credential=hashCredential(crypto.randomBytes(24).toString('hex'));const now=new Date().toISOString();const info=database.prepare('INSERT INTO users(username,role,credential_salt,credential_hash,created_at) VALUES(?,?,?,?,?)').run('admin','Admin',credential.salt,credential.hash,now);database.prepare('INSERT INTO audit_log(action,actor,created_at,metadata_json) VALUES(?,?,?,?)').run('BOOTSTRAP_ADMIN_CREATED','system',now,JSON.stringify({userId:info.lastInsertRowid,username:'admin',credential:'random-generated'}));return{username:'admin',temporaryCredential:credential}}
function authenticate(username,secret){const row=getDatabase().prepare('SELECT * FROM users WHERE username=? AND active=1').get(String(username||'').trim());if(!row)return{ok:false,error:'Invalid credentials'};const actual=crypto.scryptSync(String(secret||''),row.credential_salt,64);const expected=Buffer.from(row.credential_hash,'hex');if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return{ok:false,error:'Invalid credentials'};const now=new Date().toISOString();getDatabase().prepare('UPDATE users SET last_login_at=? WHERE id=?').run(now,row.id);getDatabase().prepare('INSERT INTO audit_log(action,actor,created_at,metadata_json) VALUES(?,?,?,?)').run('LOGIN',row.username,now,JSON.stringify({userId:row.id,role:row.role}));return{ok:true,user:{id:row.id,username:row.username,role:row.role}}}
function close(){if(db){db.close();db=null}}
module.exports={loadState,saveState,backup,integrityCheck,authenticate,hashCredential,ensureBootstrapAdmin,close};
