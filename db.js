import pg from "pg";
import bcrypt from "bcryptjs";

// ----- seed data (inserted only on first run) ----------------------------
const SEED_CASES = [
  { id: "AD-2026-0481", title: 'อาหารเสริมลดน้ำหนัก "SlimX Pro Detox"', source: "shopee.co.th/slimx-pro", channel: "Shopee", type: "image", risk: "high", riskTh: "เสี่ยงสูง", status: "pending", statusTh: "รอตรวจสอบ", date: "14 มิ.ย.", violations: 3, agency: "อย.", score: 92 },
  { id: "AD-2026-0479", title: 'เซรั่มหน้าใส "GlowMax" ลดฝ้าใน 3 วัน', source: "facebook.com/glowmax.th", channel: "Facebook", type: "link", risk: "high", riskTh: "เสี่ยงสูง", status: "review", statusTh: "กำลังตรวจ", date: "14 มิ.ย.", violations: 4, agency: "อย.", score: 88 },
  { id: "AD-2026-0476", title: 'คอร์สเทรดทำเงิน "รวยเร็ว 300%/เดือน"', source: "tiktok.com/@fxmaster", channel: "TikTok", type: "link", risk: "high", riskTh: "เสี่ยงสูง", status: "referred", statusTh: "ส่งต่อแล้ว", date: "13 มิ.ย.", violations: 5, agency: "กลต./DSI", score: 95 },
  { id: "AD-2026-0470", title: 'เครื่องกรองน้ำ "PureLife" รักษาโรคได้', source: "lazada.co.th/purelife", channel: "Lazada", type: "image", risk: "medium", riskTh: "ปานกลาง", status: "pending", statusTh: "รอตรวจสอบ", date: "13 มิ.ย.", violations: 2, agency: "สคบ.", score: 64 },
  { id: "AD-2026-0468", title: 'แพ็กเกจเน็ตมือถือ "ไม่อั้นจริง" 4G', source: "netfast.co.th/promo", channel: "Website", type: "link", risk: "medium", riskTh: "ปานกลาง", status: "review", statusTh: "กำลังตรวจ", date: "12 มิ.ย.", violations: 2, agency: "กสทช.", score: 58 },
  { id: "AD-2026-0463", title: 'กาแฟควบคุมน้ำหนัก "FitCoffee"', source: "instagram.com/fitcoffee", channel: "Instagram", type: "image", risk: "medium", riskTh: "ปานกลาง", status: "cleared", statusTh: "ปิดเคส", date: "12 มิ.ย.", violations: 1, agency: "อย.", score: 46 },
  { id: "AD-2026-0459", title: 'ประกันสุขภาพ "คุ้มครองทันที 100%"', source: "surecare.co.th", channel: "Website", type: "file", risk: "low", riskTh: "เสี่ยงต่ำ", status: "cleared", statusTh: "ปิดเคส", date: "11 มิ.ย.", violations: 1, agency: "คปภ.", score: 28 },
  { id: "AD-2026-0455", title: 'ครีมกันแดด "UV Shield SPF100"', source: "shopee.co.th/uvshield", channel: "Shopee", type: "image", risk: "clear", riskTh: "ไม่พบ", status: "cleared", statusTh: "ปิดเคส", date: "10 มิ.ย.", violations: 0, agency: "-", score: 8 },
];

const SEED_CONTEXT = [
  { type: "law", title: "พ.ร.บ.อาหาร พ.ศ. 2522 — หมวดการโฆษณา", body: "มาตรา 40–41 ว่าด้วยการห้ามโฆษณาคุณประโยชน์ คุณภาพ หรือสรรพคุณเกินจริง และการอ้างรักษาโรคสำหรับผลิตภัณฑ์อาหาร", meta: "อัปเดต 1 มิ.ย. 2026", active: true },
  { type: "banned", title: "คำต้องห้าม — กลุ่มอาหารเสริม", body: "รักษาหายขาด · ลดน้ำหนัก X กก. ใน Y วัน · เห็นผล 100% · ปลอดภัยไร้ผลข้างเคียง · อย. รับรอง (เกินจริง) · รักษาเบาหวาน/มะเร็ง", meta: "128 คำ · อัปเดต 8 มิ.ย.", active: true },
  { type: "rule", title: "เกณฑ์ให้คะแนนความเสี่ยงภายใน อย.", body: "หลักเกณฑ์การให้ Risk Score 0–100 ตามประเภทการอ้างสรรพคุณ ความรุนแรง และผลกระทบต่อผู้บริโภค", meta: "v3.2 · อัปเดต 5 มิ.ย.", active: true },
  { type: "whitelist", title: "เลขสารบบอาหาร อย. ที่รับรองแล้ว", body: "ฐานข้อมูลเลข อย. และแบรนด์ที่ผ่านการขึ้นทะเบียนถูกต้อง ใช้ตรวจการแอบอ้างเครื่องหมายรับรอง", meta: "1,240 รายการ", active: true },
  { type: "doc", title: "ประกาศกระทรวงสาธารณสุข ฉบับที่ 293", body: "รายการสรรพคุณที่ห้ามแสดงบนฉลากและสื่อโฆษณาผลิตภัณฑ์เสริมอาหาร (เอกสารแนบ PDF)", meta: "PDF · 14 หน้า", active: false },
];

// ----- connection --------------------------------------------------------
// Default driver is node-postgres; tests inject pg-mem via _useTestPg().
let _pg = pg;
let pool = null;
export function _useTestPg(mod) { _pg = mod; pool = null; }

const sslFor = (host = "") =>
  /localhost|127\.0\.0\.1/.test(host) ? false : { rejectUnauthorized: false };

function poolConfig() {
  // Option A — full URL. Note: special chars in the password (& ? * / @ # :)
  // must be percent-encoded, or the URL fails to parse ("Invalid URL").
  const cs = process.env.DATABASE_URL;
  if (cs) return { connectionString: cs, ssl: sslFor(cs) };

  // Option B — discrete vars (recommended for passwords with special chars).
  // node-postgres reads PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE automatically;
  // we only add SSL. No URL encoding needed.
  if (process.env.PGHOST) return { ssl: sslFor(process.env.PGHOST) };

  return {}; // tests inject pg-mem, which ignores config
}

export async function init() {
  if (pool) return pool;
  pool = new _pg.Pool(poolConfig());

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id            text PRIMARY KEY,
      title         text,
      source        text,
      channel       text,
      type          text,
      risk          text,
      risk_th       text,
      status        text,
      status_th     text,
      case_date     text,
      violations    int,
      agency        text,
      score         int,
      analysis_json jsonb,
      referral_json jsonb,
      created_at    timestamptz DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS context_items (
      id      serial PRIMARY KEY,
      type    text,
      title   text,
      body    text,
      meta    text,
      active  boolean DEFAULT true
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            serial PRIMARY KEY,
      email         text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      name          text,
      role          text DEFAULT 'officer',
      created_at    timestamptz DEFAULT now()
    );
  `);

  // Seed a first admin so you can log in immediately. Credentials come from env
  // (ADMIN_EMAIL / ADMIN_PASSWORD); the defaults are dev-only — change them.
  const { rows: [uc] } = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  if (uc.n === 0) {
    const email = (process.env.ADMIN_EMAIL || "admin@adguard.local").trim().toLowerCase();
    const pw = process.env.ADMIN_PASSWORD || "changeme1234";
    const hash = await bcrypt.hash(pw, 10);
    await pool.query(
      "INSERT INTO users (email,password_hash,name,role) VALUES ($1,$2,$3,'admin')",
      [email, hash, "ผู้ดูแลระบบ"]
    );
    if (!process.env.ADMIN_PASSWORD) {
      console.warn(`⚠️  สร้างผู้ดูแลระบบเริ่มต้น: ${email} / changeme1234 — กรุณาตั้ง ADMIN_PASSWORD แล้วเปลี่ยนรหัส`);
    }
  }

  const { rows: [cc] } = await pool.query("SELECT COUNT(*)::int AS n FROM cases");
  if (cc.n === 0) {
    for (const c of SEED_CASES) {
      await pool.query(
        `INSERT INTO cases (id,title,source,channel,type,risk,risk_th,status,status_th,case_date,violations,agency,score)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [c.id, c.title, c.source, c.channel, c.type, c.risk, c.riskTh, c.status, c.statusTh, c.date, c.violations, c.agency, c.score]
      );
    }
  }
  const { rows: [xc] } = await pool.query("SELECT COUNT(*)::int AS n FROM context_items");
  if (xc.n === 0) {
    for (const c of SEED_CONTEXT) {
      await pool.query(
        "INSERT INTO context_items (type,title,body,meta,active) VALUES ($1,$2,$3,$4,$5)",
        [c.type, c.title, c.body, c.meta, c.active]
      );
    }
  }
  return pool;
}

// ----- mappers (DB row → API shape) --------------------------------------
const mapCaseRow = (r) => ({
  id: r.id, title: r.title, source: r.source, channel: r.channel, type: r.type,
  risk: r.risk, riskTh: r.risk_th, status: r.status, statusTh: r.status_th,
  date: r.case_date, violations: r.violations, agency: r.agency, score: r.score,
});
const mapCaseFull = (r) => r && ({
  ...mapCaseRow(r),
  analysis: r.analysis_json || null,
  referral: r.referral_json || null,
});
const mapContext = (r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, meta: r.meta, active: !!r.active });

// ----- cases -------------------------------------------------------------
export async function listCases(filter) {
  const { rows } = (filter && filter !== "all")
    ? await pool.query("SELECT * FROM cases WHERE status=$1 ORDER BY created_at DESC, id DESC", [filter])
    : await pool.query("SELECT * FROM cases ORDER BY created_at DESC, id DESC");
  return rows.map(mapCaseRow);
}

export async function countCases() {
  const { rows } = await pool.query("SELECT status FROM cases");
  const by = { all: rows.length, pending: 0, review: 0, referred: 0, cleared: 0 };
  rows.forEach((r) => { if (by[r.status] !== undefined) by[r.status]++; });
  return by;
}

export async function getCase(id) {
  const { rows } = await pool.query("SELECT * FROM cases WHERE id=$1", [id]);
  return mapCaseFull(rows[0]);
}

async function nextCaseId() {
  const { rows } = await pool.query("SELECT id FROM cases WHERE id LIKE 'AD-2026-%' ORDER BY id DESC LIMIT 1");
  const n = rows[0] ? parseInt(rows[0].id.slice(-4), 10) + 1 : 1;
  return "AD-2026-" + String(n).padStart(4, "0");
}

export async function insertCaseFromAnalysis(a, meta = {}) {
  const id = await nextCaseId();
  const date = new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  await pool.query(
    `INSERT INTO cases (id,title,source,channel,type,risk,risk_th,status,status_th,case_date,violations,agency,score,analysis_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [id, a.title || "เคสใหม่", a.source || "-", a.channel || "-", meta.type || "link",
     a.riskLevel, a.riskTh, "pending", "รอตรวจสอบ", date, (a.violations || []).length, "-", a.riskScore,
     JSON.stringify(a)]
  );
  return id;
}

export async function referCase(id, agencies, note) {
  const { rowCount } = await pool.query(
    "UPDATE cases SET status='referred', status_th='ส่งต่อแล้ว', referral_json=$1 WHERE id=$2",
    [JSON.stringify({ agencies, note, at: new Date().toISOString() }), id]
  );
  return rowCount > 0;
}

export async function weeklyStats() {
  const { rows } = await pool.query(`
    SELECT
      date_trunc('day', created_at AT TIME ZONE 'Asia/Bangkok')::date AS day,
      risk,
      COUNT(*)::int AS count
    FROM cases
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY 1, 2
    ORDER BY 1
  `);
  return rows;
}

export async function channelStats() {
  const { rows } = await pool.query(
    "SELECT channel, COUNT(*)::int AS count FROM cases GROUP BY channel ORDER BY count DESC LIMIT 6"
  );
  return rows;
}

export async function deleteCase(id) {
  const { rowCount } = await pool.query("DELETE FROM cases WHERE id=$1", [id]);
  return rowCount > 0;
}

// ----- context -----------------------------------------------------------
export async function listContext() {
  const { rows } = await pool.query("SELECT * FROM context_items ORDER BY id DESC");
  return rows.map(mapContext);
}

export async function insertContext({ type, title, body, meta }) {
  const { rows } = await pool.query(
    "INSERT INTO context_items (type,title,body,meta,active) VALUES ($1,$2,$3,$4,true) RETURNING *",
    [type, title, body, meta]
  );
  return mapContext(rows[0]);
}

export async function toggleContext(id) {
  const { rows } = await pool.query("UPDATE context_items SET active = NOT active WHERE id=$1 RETURNING *", [id]);
  return rows[0] ? mapContext(rows[0]) : null;
}

// ----- users -------------------------------------------------------------
export async function getUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [String(email).trim().toLowerCase()]);
  return rows[0] || null;
}
export async function getUserById(id) {
  const { rows } = await pool.query("SELECT id,email,name,role FROM users WHERE id=$1", [id]);
  return rows[0] || null;
}
export async function createUser({ email, passwordHash, name, role = "officer" }) {
  const { rows } = await pool.query(
    "INSERT INTO users (email,password_hash,name,role) VALUES ($1,$2,$3,$4) RETURNING id,email,name,role",
    [String(email).trim().toLowerCase(), passwordHash, name, role]
  );
  return rows[0];
}

export default { init };
