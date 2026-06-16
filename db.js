import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Tests point ADGUARD_DB at a throwaway file (or ":memory:") so they never
// touch the real adguard.db.
const dbPath = process.env.ADGUARD_DB || join(__dirname, "adguard.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id            TEXT PRIMARY KEY,
    title         TEXT,
    source        TEXT,
    channel       TEXT,
    type          TEXT,
    risk          TEXT,
    riskTh        TEXT,
    status        TEXT,
    statusTh      TEXT,
    date          TEXT,
    violations    INTEGER,
    agency        TEXT,
    score         INTEGER,
    analysis_json TEXT,
    referral_json TEXT,
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS context_items (
    id      INTEGER PRIMARY KEY,
    type    TEXT,
    title   TEXT,
    body    TEXT,
    meta    TEXT,
    active  INTEGER
  );
`);

// ---- Seed data (only on first run) --------------------------------------
const SEED_CASES = [
  { id:'AD-2026-0481', title:'อาหารเสริมลดน้ำหนัก "SlimX Pro Detox"', source:'shopee.co.th/slimx-pro', channel:'Shopee', type:'image', risk:'high', riskTh:'เสี่ยงสูง', status:'pending', statusTh:'รอตรวจสอบ', date:'14 มิ.ย.', violations:3, agency:'อย.', score:92 },
  { id:'AD-2026-0479', title:'เซรั่มหน้าใส "GlowMax" ลดฝ้าใน 3 วัน', source:'facebook.com/glowmax.th', channel:'Facebook', type:'link', risk:'high', riskTh:'เสี่ยงสูง', status:'review', statusTh:'กำลังตรวจ', date:'14 มิ.ย.', violations:4, agency:'อย.', score:88 },
  { id:'AD-2026-0476', title:'คอร์สเทรดทำเงิน "รวยเร็ว 300%/เดือน"', source:'tiktok.com/@fxmaster', channel:'TikTok', type:'link', risk:'high', riskTh:'เสี่ยงสูง', status:'referred', statusTh:'ส่งต่อแล้ว', date:'13 มิ.ย.', violations:5, agency:'กลต./DSI', score:95 },
  { id:'AD-2026-0470', title:'เครื่องกรองน้ำ "PureLife" รักษาโรคได้', source:'lazada.co.th/purelife', channel:'Lazada', type:'image', risk:'medium', riskTh:'ปานกลาง', status:'pending', statusTh:'รอตรวจสอบ', date:'13 มิ.ย.', violations:2, agency:'สคบ.', score:64 },
  { id:'AD-2026-0468', title:'แพ็กเกจเน็ตมือถือ "ไม่อั้นจริง" 4G', source:'netfast.co.th/promo', channel:'Website', type:'link', risk:'medium', riskTh:'ปานกลาง', status:'review', statusTh:'กำลังตรวจ', date:'12 มิ.ย.', violations:2, agency:'กสทช.', score:58 },
  { id:'AD-2026-0463', title:'กาแฟควบคุมน้ำหนัก "FitCoffee"', source:'instagram.com/fitcoffee', channel:'Instagram', type:'image', risk:'medium', riskTh:'ปานกลาง', status:'cleared', statusTh:'ปิดเคส', date:'12 มิ.ย.', violations:1, agency:'อย.', score:46 },
  { id:'AD-2026-0459', title:'ประกันสุขภาพ "คุ้มครองทันที 100%"', source:'surecare.co.th', channel:'Website', type:'file', risk:'low', riskTh:'เสี่ยงต่ำ', status:'cleared', statusTh:'ปิดเคส', date:'11 มิ.ย.', violations:1, agency:'คปภ.', score:28 },
  { id:'AD-2026-0455', title:'ครีมกันแดด "UV Shield SPF100"', source:'shopee.co.th/uvshield', channel:'Shopee', type:'image', risk:'clear', riskTh:'ไม่พบ', status:'cleared', statusTh:'ปิดเคส', date:'10 มิ.ย.', violations:0, agency:'-', score:8 },
];

const SEED_CONTEXT = [
  { id:1, type:'law', title:'พ.ร.บ.อาหาร พ.ศ. 2522 — หมวดการโฆษณา', body:'มาตรา 40–41 ว่าด้วยการห้ามโฆษณาคุณประโยชน์ คุณภาพ หรือสรรพคุณเกินจริง และการอ้างรักษาโรคสำหรับผลิตภัณฑ์อาหาร', meta:'อัปเดต 1 มิ.ย. 2026', active:1 },
  { id:2, type:'banned', title:'คำต้องห้าม — กลุ่มอาหารเสริม', body:'รักษาหายขาด · ลดน้ำหนัก X กก. ใน Y วัน · เห็นผล 100% · ปลอดภัยไร้ผลข้างเคียง · อย. รับรอง (เกินจริง) · รักษาเบาหวาน/มะเร็ง', meta:'128 คำ · อัปเดต 8 มิ.ย.', active:1 },
  { id:3, type:'rule', title:'เกณฑ์ให้คะแนนความเสี่ยงภายใน อย.', body:'หลักเกณฑ์การให้ Risk Score 0–100 ตามประเภทการอ้างสรรพคุณ ความรุนแรง และผลกระทบต่อผู้บริโภค', meta:'v3.2 · อัปเดต 5 มิ.ย.', active:1 },
  { id:4, type:'whitelist', title:'เลขสารบบอาหาร อย. ที่รับรองแล้ว', body:'ฐานข้อมูลเลข อย. และแบรนด์ที่ผ่านการขึ้นทะเบียนถูกต้อง ใช้ตรวจการแอบอ้างเครื่องหมายรับรอง', meta:'1,240 รายการ', active:1 },
  { id:5, type:'doc', title:'ประกาศกระทรวงสาธารณสุข ฉบับที่ 293', body:'รายการสรรพคุณที่ห้ามแสดงบนฉลากและสื่อโฆษณาผลิตภัณฑ์เสริมอาหาร (เอกสารแนบ PDF)', meta:'PDF · 14 หน้า', active:0 },
];

if (db.prepare("SELECT COUNT(*) n FROM cases").get().n === 0) {
  const ins = db.prepare(`INSERT INTO cases
    (id,title,source,channel,type,risk,riskTh,status,statusTh,date,violations,agency,score)
    VALUES (@id,@title,@source,@channel,@type,@risk,@riskTh,@status,@statusTh,@date,@violations,@agency,@score)`);
  const tx = db.transaction(rows => rows.forEach(r => ins.run(r)));
  tx(SEED_CASES);
}
if (db.prepare("SELECT COUNT(*) n FROM context_items").get().n === 0) {
  const ins = db.prepare(`INSERT INTO context_items (id,type,title,body,meta,active)
    VALUES (@id,@type,@title,@body,@meta,@active)`);
  const tx = db.transaction(rows => rows.forEach(r => ins.run(r)));
  tx(SEED_CONTEXT);
}

// ---- Cases --------------------------------------------------------------
const rowToCase = r => r && { ...r, analysis: r.analysis_json ? JSON.parse(r.analysis_json) : null,
  referral: r.referral_json ? JSON.parse(r.referral_json) : null };

export function listCases(filter) {
  const rows = (filter && filter !== "all")
    ? db.prepare("SELECT * FROM cases WHERE status=? ORDER BY created_at DESC, id DESC").all(filter)
    : db.prepare("SELECT * FROM cases ORDER BY created_at DESC, id DESC").all();
  // strip heavy analysis_json from list payloads
  return rows.map(({ analysis_json, referral_json, ...c }) => c);
}
export function countCases() {
  const rows = db.prepare("SELECT status FROM cases").all();
  const by = { all: rows.length, pending:0, review:0, referred:0, cleared:0 };
  rows.forEach(r => { if (by[r.status] !== undefined) by[r.status]++; });
  return by;
}
export function getCase(id) { return rowToCase(db.prepare("SELECT * FROM cases WHERE id=?").get(id)); }

function nextCaseId() {
  const row = db.prepare("SELECT id FROM cases WHERE id LIKE 'AD-2026-%' ORDER BY id DESC LIMIT 1").get();
  const n = row ? parseInt(row.id.slice(-4), 10) + 1 : 1;
  return "AD-2026-" + String(n).padStart(4, "0");
}

export function insertCaseFromAnalysis(a, meta = {}) {
  const id = nextCaseId();
  const date = new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  const row = {
    id, title: a.title || "เคสใหม่", source: a.source || "-", channel: a.channel || "-",
    type: meta.type || "link", risk: a.riskLevel, riskTh: a.riskTh,
    status: "pending", statusTh: "รอตรวจสอบ", date,
    violations: (a.violations || []).length, agency: "-", score: a.riskScore,
    analysis_json: JSON.stringify(a),
  };
  db.prepare(`INSERT INTO cases
    (id,title,source,channel,type,risk,riskTh,status,statusTh,date,violations,agency,score,analysis_json)
    VALUES (@id,@title,@source,@channel,@type,@risk,@riskTh,@status,@statusTh,@date,@violations,@agency,@score,@analysis_json)`).run(row);
  return id;
}

export function referCase(id, agencies, note) {
  const c = db.prepare("SELECT id FROM cases WHERE id=?").get(id);
  if (!c) return false;
  db.prepare("UPDATE cases SET status='referred', statusTh='ส่งต่อแล้ว', referral_json=? WHERE id=?")
    .run(JSON.stringify({ agencies, note, at: new Date().toISOString() }), id);
  return true;
}

// ---- Context ------------------------------------------------------------
export function listContext() {
  return db.prepare("SELECT * FROM context_items ORDER BY id DESC").all()
    .map(c => ({ ...c, active: !!c.active }));
}
export function insertContext({ type, title, body, meta }) {
  const info = db.prepare("INSERT INTO context_items (type,title,body,meta,active) VALUES (?,?,?,?,1)")
    .run(type, title, body, meta);
  const c = db.prepare("SELECT * FROM context_items WHERE id=?").get(info.lastInsertRowid);
  return { ...c, active: !!c.active };
}
export function toggleContext(id) {
  db.prepare("UPDATE context_items SET active = 1 - active WHERE id=?").run(id);
  const c = db.prepare("SELECT * FROM context_items WHERE id=?").get(id);
  return c && { ...c, active: !!c.active };
}

export default db;
