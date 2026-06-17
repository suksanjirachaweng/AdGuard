import express from "express";
import OpenAI from "openai";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import * as store from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env (tiny parser, no dependency) ----------------------------------
try {
  const env = readFileSync(join(__dirname, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* no .env file — rely on the real environment */ }

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json({ limit: "12mb" }));
app.use(cookieParser());
// Serve the built React app (client/ → vite build → ./public) when present.
// Falls through to the original vanilla files at the project root otherwise.
app.use(express.static(join(__dirname, "public")));
app.use(express.static(__dirname));

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-opus-4";
const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "no-key",
  defaultHeaders: { "HTTP-Referer": "https://falsead-detector.onrender.com" },
});

// ---- Authentication (JWT in an httpOnly cookie) -------------------------
const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const COOKIE = "adguard_token";
const isProd = process.env.NODE_ENV === "production" || !!process.env.RENDER;
if (JWT_SECRET === "dev-insecure-secret-change-me" && isProd) {
  console.warn("⚠️  JWT_SECRET ยังไม่ได้ตั้งค่าใน production — ตั้งค่าให้เป็นค่าลับยาวๆ");
}

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role });
const signToken = (u) => jwt.sign(publicUser(u), JWT_SECRET, { expiresIn: "7d" });
function setAuthCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: isProd, maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" }); }
}

// Wrap async handlers so rejected promises become 500s instead of crashing.
const wrap = (fn) => (req, res) => fn(req, res).catch((err) => {
  console.error("API error:", err?.message || err);
  res.status(500).json({ error: "เกิดข้อผิดพลาดของฐานข้อมูล" });
});

// ---- Auth routes (public) -----------------------------------------------
app.post("/api/auth/login", wrap(async (req, res) => {
  const { email = "", password = "" } = req.body || {};
  const user = await store.getUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
  }
  setAuthCookie(res, signToken(user));
  res.json({ user: publicUser(user) });
}));
app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role } });
});

// JSON schema the model must fill — mirrors the AI Analysis result screen ----
const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title:        { type: "string", description: "ชื่อ/หัวข้อโฆษณาหรือผลิตภัณฑ์ที่ตรวจ" },
    source:       { type: "string", description: "แหล่งที่มา (URL/แพลตฟอร์ม) ถ้าไม่ทราบใส่ '-'" },
    channel:      { type: "string", description: "ช่องทาง เช่น Shopee, Facebook, Website" },
    category:     { type: "string", description: "หมวดสินค้า เช่น อาหารเสริม, เครื่องสำอาง" },
    riskScore:    { type: "integer", description: "คะแนนความเสี่ยง 0-100" },
    riskLevel:    { type: "string", enum: ["high", "medium", "low", "clear"] },
    riskTh:       { type: "string", description: "ระดับเสี่ยงภาษาไทย เช่น เสี่ยงสูง" },
    confidence:   { type: "integer", description: "ความเชื่อมั่นของ AI 0-100" },
    verdictTitle: { type: "string", description: "พาดหัวสรุปผล" },
    verdictSummary:{ type: "string", description: "สรุปผลการวิเคราะห์ 1-3 ประโยค" },
    extractedText:{ type: "string", description: "ข้อความโฆษณาที่สกัด/สรุปได้" },
    riskDims: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          name:  { type: "string" },
          pct:   { type: "integer", description: "0-100" },
          label: { type: "string", description: "ค่าที่แสดง เช่น 95 หรือ ต่ำ" },
        },
        required: ["name", "pct", "label"],
      },
    },
    findings: { type: "array", items: { type: "string" } },
    violations: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          severity: { type: "string", enum: ["high", "medium"] },
          tag:      { type: "string", description: "ประเภทความผิดสั้นๆ" },
          claim:    { type: "string", description: "ข้อความโฆษณาที่เข้าข่ายผิด" },
          reason:   { type: "string", description: "เหตุผล/ความผิด" },
          advice:   { type: "string", description: "คำแนะนำการดำเนินการ" },
          laws:     { type: "array", items: { type: "string" }, description: "มาตรากฎหมายที่เกี่ยวข้อง" },
        },
        required: ["severity", "tag", "claim", "reason", "advice", "laws"],
      },
    },
  },
  required: [
    "title", "source", "channel", "category", "riskScore", "riskLevel", "riskTh",
    "confidence", "verdictTitle", "verdictSummary", "extractedText",
    "riskDims", "findings", "violations",
  ],
};

const SYSTEM = `คุณคือเครื่องมือ AI ของสำนักงานคณะกรรมการอาหารและยา (อย.) สำหรับตรวจจับโฆษณาเกินจริง/หลอกลวงในประเทศไทย
หน้าที่: วิเคราะห์เนื้อหาโฆษณาที่ได้รับ แล้วประเมินว่ามีการอ้างสรรพคุณเกินจริงหรือเข้าข่ายความผิดตามกฎหมายไทยหรือไม่
ใช้กฎหมายอ้างอิงจริง เช่น พ.ร.บ.อาหาร พ.ศ. 2522 (ม.40, ม.41), พ.ร.บ.คุ้มครองผู้บริโภค, ประกาศกระทรวงสาธารณสุข, พ.ร.บ.ยา, ประมวลกฎหมายอาญา (กรณีแอบอ้างเครื่องหมายราชการ) ตามความเหมาะสมกับเนื้อหา
ให้คะแนน riskScore ตามความรุนแรงและจำนวนความผิด หากไม่พบความผิดให้ riskLevel='clear', violations=[]
ตอบเป็นภาษาไทยเป็นหลัก (คำเฉพาะอังกฤษได้) และต้องตอบตาม JSON schema ที่กำหนดเท่านั้น`;

app.post("/api/analyze", requireAuth, async (req, res) => {
  try {
    const { mode, url = "", text = "", imageBase64 = "", imageMediaType = "image/jpeg", context = [] } = req.body || {};

    const ctxNote = Array.isArray(context) && context.length
      ? `\n\nบริบท/ฐานความรู้เพิ่มเติมที่ต้องใช้ประกอบการพิจารณา:\n- ${context.join("\n- ")}`
      : "";

    const userContent = [];
    if (mode === "image" && imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${imageMediaType};base64,${imageBase64}` },
      });
      userContent.push({ type: "text", text: `วิเคราะห์โฆษณาในรูปภาพนี้ว่ามีการโฆษณาเกินจริงหรือผิดกฎหมายหรือไม่${ctxNote}` });
    } else {
      const subject = url ? `URL/แหล่งที่มา: ${url}\n` : "";
      const body = text || url || "(ไม่มีเนื้อหา)";
      userContent.push({
        type: "text",
        text: `วิเคราะห์เนื้อหาโฆษณาต่อไปนี้:\n${subject}เนื้อหา: ${body}${ctxNote}`,
      });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: "OPENROUTER_API_KEY ยังไม่ได้ตั้งค่า" });
    }

    const completion = await client.chat.completions.create({
      model: OPENROUTER_MODEL,
      max_tokens: 4096,
      response_format: {
        type: "json_schema",
        json_schema: { name: "analysis", strict: true, schema: ANALYSIS_SCHEMA },
      },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
    });

    const choice = completion.choices?.[0];
    if (!choice) return res.status(502).json({ error: "ไม่ได้รับผลลัพธ์จาก AI" });
    if (choice.finish_reason === "content_filter") {
      return res.status(422).json({ error: "AI ปฏิเสธการวิเคราะห์เนื้อหานี้" });
    }

    const raw = choice.message.content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/,"").trim();
    const result = JSON.parse(raw);
    const caseId = await store.insertCaseFromAnalysis(result, { type: mode });
    res.json({ ...result, caseId });
  } catch (err) {
    console.error("analyze error:", err?.message || err);
    const status = err?.status || 500;
    res.status(status).json({ error: err?.message || "เกิดข้อผิดพลาดในการวิเคราะห์" });
  }
});

// ---- Case database (auth required) --------------------------------------
app.get("/api/cases", requireAuth, wrap(async (req, res) => {
  res.json({ cases: await store.listCases(req.query.filter), counts: await store.countCases() });
}));
app.get("/api/cases/:id", requireAuth, wrap(async (req, res) => {
  const c = await store.getCase(req.params.id);
  if (!c) return res.status(404).json({ error: "ไม่พบเคส" });
  res.json(c);
}));
app.post("/api/cases/:id/refer", requireAuth, wrap(async (req, res) => {
  const { agencies = [], note = "" } = req.body || {};
  if (!agencies.length) return res.status(400).json({ error: "ต้องเลือกอย่างน้อย 1 หน่วยงาน" });
  if (!(await store.referCase(req.params.id, agencies, note))) return res.status(404).json({ error: "ไม่พบเคส" });
  res.json({ ok: true });
}));

// ---- AI context / knowledge base (auth required) ------------------------
app.get("/api/context", requireAuth, wrap(async (_req, res) => res.json({ items: await store.listContext() })));
app.post("/api/context", requireAuth, wrap(async (req, res) => {
  const { type = "law", title = "", body = "", meta = "" } = req.body || {};
  if (!title.trim()) return res.status(400).json({ error: "ต้องระบุหัวข้อ" });
  res.json(await store.insertContext({ type, title: title.trim(), body: body.trim() || "—", meta }));
}));
app.patch("/api/context/:id/toggle", requireAuth, wrap(async (req, res) => {
  const c = await store.toggleContext(Number(req.params.id));
  if (!c) return res.status(404).json({ error: "ไม่พบบริบท" });
  res.json(c);
}));

// Lightweight health check for uptime pings (UptimeRobot etc.) — no DB hit,
// keeps a free-tier host awake without loading the database.
app.get("/healthz", (_req, res) => res.type("text/plain").send("ok"));

// SPA fallback: serve the React build's index.html for client-side routes
// (e.g. /result/AD-2026-0481 on refresh). Only when a build exists; API and
// asset requests are already handled by the routes/static middleware above.
const spaIndex = join(__dirname, "public", "index.html");
app.get("*", (req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  if (existsSync(spaIndex)) return res.sendFile(spaIndex, { headers: { "Cache-Control": "no-cache" } });
  next();
});

// Start the server only when run directly (`node server.js`), not when imported
// by tests via supertest.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  if (!process.env.DATABASE_URL && !process.env.PGHOST) {
    console.error("✗ ยังไม่ได้ตั้งค่าฐานข้อมูล — ใส่ DATABASE_URL หรือ PGHOST/PGPASSWORD/... ใน .env ก่อน (ดู .env.example)");
    process.exit(1);
  }
  try {
    await store.init();
  } catch (err) {
    console.error("✗ เชื่อมต่อฐานข้อมูลไม่สำเร็จ:", err?.message || err);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`AdGuard running → http://localhost:${PORT}`);
    console.log("✓ เชื่อมต่อ Postgres สำเร็จ");
    if (!process.env.OPENROUTER_API_KEY) {
      console.warn("⚠️  OPENROUTER_API_KEY ยังไม่ได้ตั้งค่า — /api/analyze จะใช้งานไม่ได้");
    } else {
      console.log(`✓ OpenRouter model: ${OPENROUTER_MODEL}`);
    }
  });
}

export { app };
