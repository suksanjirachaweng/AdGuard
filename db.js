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

  // ---- Phase 2: web/social discovery (leads queue before promotion to cases)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id                serial PRIMARY KEY,
      url               text UNIQUE,
      platform          text,
      raw_text          text,
      matched_keywords  text[],
      status            text DEFAULT 'pending',
      promoted_case_id  text REFERENCES cases(id),
      discovered_at     timestamptz DEFAULT now()
    );
  `);

  // ---- Phase 3: FDA safety-alert knowledge base
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fda_alerts (
      id           serial PRIMARY KEY,
      url          text UNIQUE NOT NULL,
      title        text,
      content_md   text,
      category     text,
      published_at text,
      crawled_at   timestamptz DEFAULT now()
    );
  `);

  // ---- Phase 4: Structured knowledge base (PDF documents + text chunks) ---
  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_docs (
      id          serial PRIMARY KEY,
      category    text NOT NULL DEFAULT 'general',
      doc_type    text NOT NULL DEFAULT 'manual',
      title       text NOT NULL,
      source_file text,
      priority    text NOT NULL DEFAULT 'normal',
      active      boolean DEFAULT true,
      created_at  timestamptz DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id        serial PRIMARY KEY,
      doc_id    integer REFERENCES knowledge_docs(id) ON DELETE CASCADE,
      chunk_idx integer NOT NULL,
      content   text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON knowledge_chunks(doc_id)");
  // Add category + priority to context_items (safe to run repeatedly)
  await pool.query("ALTER TABLE context_items ADD COLUMN IF NOT EXISTS category text DEFAULT 'general'");
  await pool.query("ALTER TABLE context_items ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal'");

  // ---- Phase 5: Dynamic knowledge categories with parent/child hierarchy ---
  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_categories (
      id         serial PRIMARY KEY,
      slug       text UNIQUE NOT NULL,
      label      text NOT NULL,
      parent_id  integer REFERENCES knowledge_categories(id) ON DELETE SET NULL,
      color      text NOT NULL DEFAULT '#6b7d75',
      bg_color   text NOT NULL DEFAULT '#eef2f0',
      sort_order integer DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );
  `);
  // Seed the 7 built-in categories (slug is immutable; only label/color are editable)
  await pool.query(`
    INSERT INTO knowledge_categories (slug, label, color, bg_color, sort_order) VALUES
      ('food',           'อาหาร',              '#16743c', '#e8f5e9', 1),
      ('drug',           'ยา',                 '#1a5fa8', '#e3f2fd', 2),
      ('cosmetic',       'เครื่องสำอาง',       '#7b2fbe', '#f3e8ff', 3),
      ('herbal',         'สมุนไพร',            '#2d7d44', '#e8f5e9', 4),
      ('medical_device', 'เครื่องมือแพทย์',   '#b06000', '#fff3e0', 5),
      ('hazardous',      'วัตถุอันตราย',       '#c0392b', '#fdecea', 6),
      ('general',        'ทั่วไป',             '#6b7d75', '#eef2f0', 7)
    ON CONFLICT (slug) DO NOTHING;
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

  // Non-destructive migrations — safe to run on every boot
  await pool.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS model text");
  await pool.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS latency_ms int");
  await pool.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS prompt_tokens int");
  await pool.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS completion_tokens int");
  await pool.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS expert_risk_level text");
  await pool.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS expert_verdict text");
  await pool.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS officer_override boolean DEFAULT false");
  await pool.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS expert_violation_count int");
  await pool.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS input_hash text");

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
  model: r.model || null,
  latencyMs: r.latency_ms || null,
  promptTokens: r.prompt_tokens || null,
  completionTokens: r.completion_tokens || null,
  expertRiskLevel: r.expert_risk_level || null,
  expertVerdict: r.expert_verdict || null,
  officerOverride: !!r.officer_override,
  expertViolationCount: r.expert_violation_count ?? null,
  inputHash: r.input_hash || null,
});
const mapCaseFull = (r) => r && ({
  ...mapCaseRow(r),
  analysis: r.analysis_json || null,
  referral: r.referral_json || null,
});
const mapContext = (r) => ({
  id: r.id, type: r.type, title: r.title, body: r.body, meta: r.meta,
  active: !!r.active, category: r.category || "general", priority: r.priority || "normal",
});
const mapKnowledgeDoc = (r) => ({
  id: r.id, category: r.category, docType: r.doc_type, title: r.title,
  sourceFile: r.source_file, priority: r.priority, active: !!r.active, createdAt: r.created_at,
});

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
    `INSERT INTO cases
       (id,title,source,channel,type,risk,risk_th,status,status_th,case_date,violations,agency,score,
        analysis_json,model,latency_ms,prompt_tokens,completion_tokens,input_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [id, a.title || "เคสใหม่", a.source || "-", a.channel || "-", meta.type || "link",
     a.riskLevel, a.riskTh, "pending", "รอตรวจสอบ", date, (a.violations || []).length, "-", a.riskScore,
     JSON.stringify(a), meta.model || null,
     meta.latencyMs || null, meta.promptTokens || null, meta.completionTokens || null,
     meta.inputHash || null]
  );
  return id;
}

export async function setVerdict(id, { expertRiskLevel, expertVerdict, officerOverride, expertViolationCount }) {
  const { rowCount } = await pool.query(
    `UPDATE cases SET expert_risk_level=$1, expert_verdict=$2, officer_override=$3, expert_violation_count=$4 WHERE id=$5`,
    [expertRiskLevel || null, expertVerdict || null, !!officerOverride,
     expertViolationCount != null ? Number(expertViolationCount) : null, id]
  );
  return rowCount > 0;
}

export async function referCase(id, agencies, note) {
  const { rowCount } = await pool.query(
    "UPDATE cases SET status='referred', status_th='ส่งต่อแล้ว', referral_json=$1 WHERE id=$2",
    [JSON.stringify({ agencies, note, at: new Date().toISOString() }), id]
  );
  return rowCount > 0;
}

export async function analyticsStats() {
  const [summary, calibration, quality, consistency] = await Promise.all([
    pool.query(`
      SELECT
        COALESCE(model, 'ไม่ระบุ')                                                        AS model,
        COUNT(*)::int                                                                      AS total,
        COUNT(expert_verdict)::int                                                         AS with_verdict,
        SUM(CASE WHEN expert_verdict = 'confirmed'  THEN 1 ELSE 0 END)::int               AS confirmed,
        SUM(CASE WHEN expert_verdict = 'partial'    THEN 1 ELSE 0 END)::int               AS partial,
        SUM(CASE WHEN expert_verdict = 'overturned' THEN 1 ELSE 0 END)::int               AS overturned,
        SUM(CASE WHEN officer_override = true       THEN 1 ELSE 0 END)::int               AS overrides,
        SUM(CASE WHEN risk = expert_risk_level AND expert_risk_level IS NOT NULL THEN 1 ELSE 0 END)::int AS risk_match,
        ROUND(AVG(latency_ms))::int                                                        AS avg_latency_ms,
        ROUND(AVG(prompt_tokens))::int                                                     AS avg_prompt_tokens,
        ROUND(AVG(completion_tokens))::int                                                 AS avg_completion_tokens
      FROM cases
      GROUP BY COALESCE(model, 'ไม่ระบุ') ORDER BY total DESC
    `),
    pool.query(`
      SELECT
        COALESCE(model, 'ไม่ระบุ')                                                        AS model,
        CASE WHEN score >= 80 THEN '80-100'
             WHEN score >= 60 THEN '60-79'
             WHEN score >= 40 THEN '40-59'
             ELSE '0-39' END                                                               AS bucket,
        COUNT(*)::int                                                                      AS total,
        SUM(CASE WHEN expert_verdict IN ('confirmed','partial') THEN 1 ELSE 0 END)::int   AS agreed
      FROM cases WHERE score IS NOT NULL
      GROUP BY COALESCE(model, 'ไม่ระบุ'), bucket ORDER BY model, bucket DESC
    `),
    pool.query(`
      SELECT
        COALESCE(model, 'ไม่ระบุ')                                                        AS model,
        COUNT(*) FILTER (WHERE expert_violation_count IS NOT NULL)::int                   AS with_violation_data,
        ROUND(AVG(violations::numeric), 2)                                                AS avg_ai_violations,
        ROUND(AVG(expert_violation_count::numeric) FILTER (WHERE expert_violation_count IS NOT NULL), 2) AS avg_expert_violations
      FROM cases
      GROUP BY COALESCE(model, 'ไม่ระบุ') ORDER BY model
    `),
    pool.query(`
      SELECT
        input_hash,
        COUNT(*)::int                                               AS runs,
        COUNT(DISTINCT model)::int                                  AS model_count,
        ARRAY_AGG(DISTINCT model)                                   AS models,
        ARRAY_AGG(risk ORDER BY created_at)                         AS risk_levels
      FROM cases WHERE input_hash IS NOT NULL
      GROUP BY input_hash HAVING COUNT(*) > 1
      ORDER BY COUNT(DISTINCT model) DESC, runs DESC LIMIT 20
    `),
  ]);
  return {
    summary: summary.rows,
    calibration: calibration.rows,
    quality: quality.rows,
    consistency: consistency.rows,
  };
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

// ----- leads (discovery queue, before promotion to a case) ---------------
const mapLead = (r) => ({
  id: r.id, url: r.url, platform: r.platform, rawText: r.raw_text,
  matchedKeywords: r.matched_keywords || [], status: r.status,
  promotedCaseId: r.promoted_case_id, discoveredAt: r.discovered_at,
});

export async function listLeads(status) {
  const { rows } = (status && status !== "all")
    ? await pool.query("SELECT * FROM leads WHERE status=$1 ORDER BY discovered_at DESC", [status])
    : await pool.query("SELECT * FROM leads ORDER BY discovered_at DESC");
  return rows.map(mapLead);
}

export async function insertLead({ url, platform, rawText, matchedKeywords = [] }) {
  const { rows } = await pool.query(
    `INSERT INTO leads (url,platform,raw_text,matched_keywords,status)
     VALUES ($1,$2,$3,$4,'pending') ON CONFLICT (url) DO NOTHING RETURNING *`,
    [url, platform, rawText, matchedKeywords]
  );
  return rows[0] ? mapLead(rows[0]) : null;
}

export async function getLead(id) {
  const { rows } = await pool.query("SELECT * FROM leads WHERE id=$1", [id]);
  return rows[0] ? mapLead(rows[0]) : null;
}

export async function markLeadPromoted(id, caseId) {
  const { rows } = await pool.query(
    "UPDATE leads SET status='promoted', promoted_case_id=$2 WHERE id=$1 RETURNING *",
    [id, caseId]
  );
  return rows[0] ? mapLead(rows[0]) : null;
}

export async function updateLeadRawText(id, rawText) {
  const { rows } = await pool.query("UPDATE leads SET raw_text=$2 WHERE id=$1 RETURNING *", [id, rawText]);
  return rows[0] ? mapLead(rows[0]) : null;
}

export async function discardLead(id) {
  const { rows } = await pool.query("UPDATE leads SET status='discarded' WHERE id=$1 RETURNING *", [id]);
  return rows[0] ? mapLead(rows[0]) : null;
}

export async function deleteLead(id) {
  const { rowCount } = await pool.query("DELETE FROM leads WHERE id=$1", [id]);
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

export async function deleteContext(id) {
  const { rowCount } = await pool.query("DELETE FROM context_items WHERE id=$1", [id]);
  return rowCount > 0;
}

export async function attachContextFile(id, { body, meta }) {
  const { rows } = await pool.query(
    "UPDATE context_items SET body=$1, meta=$2 WHERE id=$3 RETURNING *",
    [body, meta, id]
  );
  return rows[0] ? mapContext(rows[0]) : null;
}

// ----- fda_alerts (knowledge base from safetyalert.fda.moph.go.th) -------
const mapAlert = (r) => ({
  id: r.id, url: r.url, title: r.title, contentMd: r.content_md,
  category: r.category, publishedAt: r.published_at, crawledAt: r.crawled_at,
});

export async function listAlerts({ limit = 50, offset = 0, q = "" } = {}) {
  if (q) {
    const term = `%${q}%`;
    const { rows } = await pool.query(
      `SELECT * FROM fda_alerts WHERE title ILIKE $1 OR content_md ILIKE $1
       ORDER BY crawled_at DESC LIMIT $2 OFFSET $3`,
      [term, limit, offset]
    );
    const { rows: [cnt] } = await pool.query(
      "SELECT COUNT(*)::int AS n FROM fda_alerts WHERE title ILIKE $1 OR content_md ILIKE $1",
      [term]
    );
    return { rows: rows.map(mapAlert), total: cnt.n };
  }
  const { rows } = await pool.query(
    "SELECT * FROM fda_alerts ORDER BY crawled_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  const { rows: [cnt] } = await pool.query("SELECT COUNT(*)::int AS n FROM fda_alerts");
  return { rows: rows.map(mapAlert), total: cnt.n };
}

export async function upsertAlert({ url, title, contentMd, category, publishedAt }) {
  const { rows } = await pool.query(
    `INSERT INTO fda_alerts (url,title,content_md,category,published_at)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (url) DO UPDATE
       SET title=$2, content_md=$3, category=$4, published_at=$5, crawled_at=now()
     RETURNING *`,
    [url, title, contentMd || "", category || "", publishedAt || ""]
  );
  return mapAlert(rows[0]);
}

export async function deleteAlert(id) {
  const { rowCount } = await pool.query("DELETE FROM fda_alerts WHERE id=$1", [id]);
  return rowCount > 0;
}

export async function searchAlertsForContext(keywords, limit = 5) {
  if (!keywords || keywords.length === 0) return [];
  const term = `%${keywords.join("%")}%`;
  const { rows } = await pool.query(
    `SELECT id, url, title, LEFT(content_md, 1500) AS content_md
     FROM fda_alerts WHERE title ILIKE $1 OR content_md ILIKE $1
     ORDER BY crawled_at DESC LIMIT $2`,
    [term, limit]
  );
  return rows.map(mapAlert);
}

// ----- knowledge docs + chunks -------------------------------------------
export async function listKnowledgeDocs({ category } = {}) {
  const base = `
    SELECT kd.*, COUNT(kc.id)::int AS chunk_count
    FROM knowledge_docs kd
    LEFT JOIN knowledge_chunks kc ON kc.doc_id = kd.id
  `;
  const { rows } = category
    ? await pool.query(base + "WHERE kd.category=$1 GROUP BY kd.id ORDER BY kd.created_at DESC", [category])
    : await pool.query(base + "GROUP BY kd.id ORDER BY kd.category, kd.created_at DESC");
  return rows.map((r) => ({ ...mapKnowledgeDoc(r), chunkCount: r.chunk_count }));
}

export async function insertKnowledgeDoc({ category, docType, title, sourceFile, priority = "normal" }) {
  const { rows } = await pool.query(
    `INSERT INTO knowledge_docs (category,doc_type,title,source_file,priority)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [category, docType || "manual", title, sourceFile || null, priority]
  );
  return mapKnowledgeDoc(rows[0]);
}

export async function insertKnowledgeChunks(docId, chunks) {
  for (let i = 0; i < chunks.length; i++) {
    await pool.query(
      "INSERT INTO knowledge_chunks (doc_id,chunk_idx,content) VALUES ($1,$2,$3)",
      [docId, i, chunks[i]]
    );
  }
}

export async function toggleKnowledgeDoc(id) {
  const { rows } = await pool.query(
    "UPDATE knowledge_docs SET active = NOT active WHERE id=$1 RETURNING *", [id]
  );
  return rows[0] ? mapKnowledgeDoc(rows[0]) : null;
}

export async function updateKnowledgeDoc(id, { title, category }) {
  const fields = [];
  const vals = [];
  if (title !== undefined)    { fields.push(`title=$${fields.length + 1}`);    vals.push(title); }
  if (category !== undefined) { fields.push(`category=$${fields.length + 1}`); vals.push(category); }
  if (!fields.length) return null;
  vals.push(id);
  const { rows } = await pool.query(
    `UPDATE knowledge_docs SET ${fields.join(",")} WHERE id=$${vals.length} RETURNING *`, vals
  );
  return rows[0] ? mapKnowledgeDoc(rows[0]) : null;
}

export async function deleteKnowledgeDoc(id) {
  const { rowCount } = await pool.query("DELETE FROM knowledge_docs WHERE id=$1", [id]);
  return rowCount > 0;
}

export async function getDocChunks(docId) {
  const { rows } = await pool.query(
    "SELECT id, chunk_idx, content FROM knowledge_chunks WHERE doc_id=$1 ORDER BY chunk_idx",
    [docId]
  );
  return rows.map((r) => ({ id: r.id, idx: r.chunk_idx, content: r.content }));
}

// ----- knowledge_categories (dynamic, DB-backed) --------------------------
const mapCategory = (r) => ({
  id: r.id, slug: r.slug, label: r.label,
  parentId: r.parent_id || null, color: r.color, bgColor: r.bg_color,
  sortOrder: r.sort_order, createdAt: r.created_at,
  docCount: r.doc_count != null ? r.doc_count : undefined,
});

export async function listCategories() {
  const { rows } = await pool.query(`
    SELECT kc.*, COUNT(kd.id)::int AS doc_count
    FROM knowledge_categories kc
    LEFT JOIN knowledge_docs kd ON kd.category = kc.slug
    GROUP BY kc.id
    ORDER BY kc.sort_order, kc.label
  `);
  return rows.map(mapCategory);
}

export async function createCategory({ label, parentId = null, color = '#6b7d75', bgColor = '#eef2f0' }) {
  const slug = 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
  const { rows: siblings } = await pool.query(
    'SELECT MAX(sort_order) AS m FROM knowledge_categories WHERE parent_id IS NOT DISTINCT FROM $1',
    [parentId || null]
  );
  const sortOrder = (siblings[0]?.m ?? 0) + 1;
  const { rows } = await pool.query(
    `INSERT INTO knowledge_categories (slug, label, parent_id, color, bg_color, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [slug, label, parentId || null, color, bgColor, sortOrder]
  );
  return mapCategory(rows[0]);
}

export async function updateCategory(id, { label, color, bgColor, parentId, sortOrder }) {
  const fields = [], vals = [];
  if (label !== undefined)     { fields.push(`label=$${fields.length+1}`);      vals.push(label); }
  if (color !== undefined)     { fields.push(`color=$${fields.length+1}`);      vals.push(color); }
  if (bgColor !== undefined)   { fields.push(`bg_color=$${fields.length+1}`);   vals.push(bgColor); }
  if (parentId !== undefined)  { fields.push(`parent_id=$${fields.length+1}`);  vals.push(parentId || null); }
  if (sortOrder !== undefined) { fields.push(`sort_order=$${fields.length+1}`); vals.push(sortOrder); }
  if (!fields.length) return null;
  vals.push(id);
  const { rows } = await pool.query(
    `UPDATE knowledge_categories SET ${fields.join(',')} WHERE id=$${vals.length} RETURNING *`, vals
  );
  return rows[0] ? mapCategory(rows[0]) : null;
}

export async function deleteCategory(id) {
  // Reassign docs in this category to the parent category's slug (or 'general')
  const { rows: cat } = await pool.query(
    'SELECT slug, parent_id FROM knowledge_categories WHERE id=$1', [id]
  );
  if (!cat[0]) return false;
  let fallbackSlug = 'general';
  if (cat[0].parent_id) {
    const { rows: parent } = await pool.query(
      'SELECT slug FROM knowledge_categories WHERE id=$1', [cat[0].parent_id]
    );
    if (parent[0]) fallbackSlug = parent[0].slug;
  }
  await pool.query('UPDATE knowledge_docs SET category=$1 WHERE category=$2', [fallbackSlug, cat[0].slug]);
  // Move sub-categories up to parent
  await pool.query(
    'UPDATE knowledge_categories SET parent_id=$1 WHERE parent_id=$2',
    [cat[0].parent_id || null, id]
  );
  const { rowCount } = await pool.query('DELETE FROM knowledge_categories WHERE id=$1', [id]);
  return rowCount > 0;
}

// Category detection: map URL + text keywords → product category
const CATEGORY_PATTERNS = {
  drug:           /ยา(?!สมุนไพร|บ้า)|drug|medicine|pharmaceutical|tablet|capsule|antibiotic/i,
  herbal:         /สมุนไพร|herbal|herb\b/i,
  cosmetic:       /เครื่องสำอาง|cosmetic|serum|cream|moisturizer|skincare|foundation|lipstick/i,
  medical_device: /เครื่องมือแพทย์|medical.?device|อุปกรณ์การแพทย์|blood.?pressure|glucose/i,
  hazardous:      /วัตถุอันตราย|hazardous|pesticide|insecticide/i,
  food:           /อาหาร|food|supplement|dietary|เสริมอาหาร|วิตามิน|vitamin|slimx|slim|detox|collagen/i,
};

function detectCategory(text) {
  for (const [cat, re] of Object.entries(CATEGORY_PATTERNS)) {
    if (re.test(text)) return cat;
  }
  return "general";
}

// Get context enrichment for AI analysis (critical items + keyword search in chunks)
export async function getContextForCategory(combinedText, limit = 8) {
  const category = detectCategory(combinedText);
  const keywords = (combinedText.match(/[฀-๿a-zA-Z]{3,}/g) || []).slice(0, 6);

  // 1. Critical context_items for this category (always inject)
  const { rows: criticalRows } = await pool.query(
    `SELECT title, body FROM context_items
     WHERE active = true AND priority = 'critical'
       AND (category = $1 OR category = 'general')
     LIMIT 5`,
    [category]
  );

  // 2. Search knowledge_chunks by ILIKE (most relevant)
  let chunkRows = [];
  if (keywords.length > 0) {
    const patterns = keywords.map((k) => `%${k}%`);
    const { rows } = await pool.query(
      `SELECT kd.title, kc.content AS body
       FROM knowledge_chunks kc
       JOIN knowledge_docs kd ON kd.id = kc.doc_id
       WHERE kd.active = true
         AND (kd.category = $1 OR kd.category = 'general')
         AND kc.content ILIKE ANY($2::text[])
       LIMIT $3`,
      [category, patterns, limit - criticalRows.length]
    );
    chunkRows = rows;
  }

  return { category, items: [...criticalRows, ...chunkRows] };
}

// ----- users -------------------------------------------------------------
export async function listUsers() {
  const { rows } = await pool.query(
    "SELECT id,email,name,role,created_at FROM users ORDER BY created_at ASC"
  );
  return rows;
}

export async function updateUser(id, { name, role }) {
  const { rows } = await pool.query(
    "UPDATE users SET name=$1, role=$2 WHERE id=$3 RETURNING id,email,name,role,created_at",
    [name, role, id]
  );
  return rows[0] || null;
}

export async function deleteUser(id) {
  const { rowCount } = await pool.query("DELETE FROM users WHERE id=$1", [id]);
  return rowCount > 0;
}

export async function resetPassword(id, passwordHash) {
  const { rowCount } = await pool.query(
    "UPDATE users SET password_hash=$1 WHERE id=$2", [passwordHash, id]
  );
  return rowCount > 0;
}

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
