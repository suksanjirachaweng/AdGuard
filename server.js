import express from "express";
import OpenAI from "openai";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import FirecrawlApp from "@mendable/firecrawl-js";
import cron from "node-cron";
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
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "เฉพาะผู้ดูแลระบบเท่านั้น" });
  next();
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

// Core Claude call, shared by the manual "ตรวจสอบใหม่" flow and the
// discovery-lead promotion flow — both just need { mode, url, text,
// imageBase64, imageMediaType, context } in and an analysis result out.
async function runAnalysis({ mode, url = "", text = "", imageBase64 = "", imageMediaType = "image/jpeg", context = [] }) {
  // Auto-enrich: pull relevant FDA safety alerts from the knowledge base
  const combinedText = [url, text].filter(Boolean).join(" ").slice(0, 300);
  const keywords = combinedText.match(/[฀-๿a-zA-Z]{3,}/g) || [];
  const fdaAlerts = keywords.length
    ? await store.searchAlertsForContext(keywords.slice(0, 6), 3).catch(() => [])
    : [];
  const enrichedContext = [
    ...fdaAlerts.map((a) => ({ title: `[ประกาศเตือนภัย อย.] ${a.title}`, body: a.contentMd })),
    ...(Array.isArray(context) ? context : []),
  ];

  // context items come as { title, body } — include a body excerpt so the
  // model actually reads attached documents, not just their titles.
  const CTX_BODY_EXCERPT = 1500;
  const ctxNote = Array.isArray(enrichedContext) && enrichedContext.length
    ? "\n\nบริบท/ฐานความรู้เพิ่มเติมที่ต้องใช้ประกอบการพิจารณา:\n" + enrichedContext.map((c) => {
        const title = typeof c === "string" ? c : (c.title || "");
        const body = typeof c === "string" ? "" : (c.body || "");
        const excerpt = body && body !== "—" ? body.slice(0, CTX_BODY_EXCERPT) + (body.length > CTX_BODY_EXCERPT ? "…" : "") : "";
        return `- ${title}${excerpt ? `: ${excerpt}` : ""}`;
      }).join("\n")
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
    const err = new Error("OPENROUTER_API_KEY ยังไม่ได้ตั้งค่า");
    err.status = 503;
    throw err;
  }

  // Hash the raw input for consistency grouping (same ad, different models)
  const inputHash = createHash("sha256")
    .update(mode + "|" + (url || "") + "|" + (text || "") + "|" + (imageBase64 ? imageBase64.slice(0, 64) : ""))
    .digest("hex")
    .slice(0, 16);

  const t0 = Date.now();
  const completion = await client.chat.completions.create({
    model: OPENROUTER_MODEL,
    max_tokens: 8192,
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
  if (!choice) { const err = new Error("ไม่ได้รับผลลัพธ์จาก AI"); err.status = 502; throw err; }
  if (choice.finish_reason === "content_filter") {
    const err = new Error("AI ปฏิเสธการวิเคราะห์เนื้อหานี้");
    err.status = 422;
    throw err;
  }
  if (choice.finish_reason === "length") {
    const err = new Error("AI ตอบกลับไม่สมบูรณ์ (ข้อความยาวเกินไป) กรุณาลดปริมาณเนื้อหาแล้วลองใหม่");
    err.status = 502;
    throw err;
  }

  const latencyMs = Date.now() - t0;
  const usage = completion.usage || {};
  const raw = choice.message.content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/,"").trim();
  const result = JSON.parse(raw);

  // The model occasionally ignores response_format/strict and returns a
  // differently-shaped JSON object (seen with some OpenRouter routes) — the
  // Result page assumes these fields exist and .map()s over them, so a
  // mismatched shape used to crash the whole app to a blank screen. Reject
  // it here instead of saving unusable data as a case.
  const REQUIRED_ARRAYS = ["riskDims", "findings", "violations"];
  const missingArrays = REQUIRED_ARRAYS.filter((k) => !Array.isArray(result[k]));
  const REQUIRED_STRINGS = ["riskLevel", "riskTh", "verdictTitle", "verdictSummary"];
  const missingStrings = REQUIRED_STRINGS.filter((k) => typeof result[k] !== "string");
  if (missingArrays.length || missingStrings.length) {
    const err = new Error("AI ตอบกลับไม่ตรงรูปแบบที่กำหนด กรุณาลองวิเคราะห์ใหม่อีกครั้ง");
    err.status = 502;
    throw err;
  }

  const usedModel = completion.model || OPENROUTER_MODEL;
  return { result, usedModel, latencyMs, inputHash, promptTokens: usage.prompt_tokens || null, completionTokens: usage.completion_tokens || null };
}

app.post("/api/analyze", requireAuth, async (req, res) => {
  try {
    const { mode, url = "", text = "", imageBase64 = "", imageMediaType = "image/jpeg", context = [] } = req.body || {};
    const { result, usedModel, latencyMs, inputHash, promptTokens, completionTokens } =
      await runAnalysis({ mode, url, text, imageBase64, imageMediaType, context });
    const caseId = await store.insertCaseFromAnalysis(result, {
      type: mode, model: usedModel, latencyMs, inputHash, promptTokens, completionTokens,
    });
    res.json({ ...result, caseId, model: usedModel, latencyMs, inputHash, promptTokens, completionTokens });
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
app.get("/api/analytics", requireAuth, wrap(async (_req, res) => {
  res.json(await store.analyticsStats());
}));
app.get("/api/cases/stats", requireAuth, wrap(async (_req, res) => {
  const [weekly, channels] = await Promise.all([store.weeklyStats(), store.channelStats()]);
  res.json({ weekly, channels });
}));
app.get("/api/cases/:id", requireAuth, wrap(async (req, res) => {
  const c = await store.getCase(req.params.id);
  if (!c) return res.status(404).json({ error: "ไม่พบเคส" });
  res.json(c);
}));
app.delete("/api/cases/:id", requireAuth, wrap(async (req, res) => {
  const ok = await store.deleteCase(req.params.id);
  if (!ok) return res.status(404).json({ error: "ไม่พบเคส" });
  res.json({ ok: true });
}));

app.patch("/api/cases/:id/verdict", requireAuth, wrap(async (req, res) => {
  const { expertRiskLevel, expertVerdict, officerOverride, expertViolationCount } = req.body || {};
  const ok = await store.setVerdict(req.params.id, { expertRiskLevel, expertVerdict, officerOverride, expertViolationCount });
  if (!ok) return res.status(404).json({ error: "ไม่พบเคส" });
  res.json({ ok: true });
}));
app.post("/api/cases/:id/refer", requireAuth, wrap(async (req, res) => {
  const { agencies = [], note = "" } = req.body || {};
  if (!agencies.length) return res.status(400).json({ error: "ต้องเลือกอย่างน้อย 1 หน่วยงาน" });
  if (!(await store.referCase(req.params.id, agencies, note))) return res.status(404).json({ error: "ไม่พบเคส" });
  res.json({ ok: true });
}));

// ---- Discovery leads (Phase 2: web/social monitoring queue) -------------
// MVP: leads are added manually for now (no Apify/SERP wiring yet). Each
// lead is reviewed and either promoted into a real case (runs the same
// AI analysis as the manual flow) or discarded as a false positive.
app.get("/api/leads", requireAuth, wrap(async (req, res) => {
  res.json({ leads: await store.listLeads(req.query.status) });
}));
app.post("/api/leads", requireAuth, wrap(async (req, res) => {
  const { url = "", platform = "website", rawText = "", matchedKeywords = [] } = req.body || {};
  if (!url.trim()) return res.status(400).json({ error: "ต้องระบุ URL" });
  const lead = await store.insertLead({ url: url.trim(), platform, rawText: rawText.trim(), matchedKeywords });
  if (!lead) return res.status(409).json({ error: "มี URL นี้ในคิวอยู่แล้ว" });
  res.json(lead);
}));
app.delete("/api/leads/:id", requireAuth, wrap(async (req, res) => {
  const ok = await store.deleteLead(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: "ไม่พบรายการ" });
  res.json({ ok: true });
}));
app.post("/api/leads/:id/discard", requireAuth, wrap(async (req, res) => {
  const lead = await store.discardLead(Number(req.params.id));
  if (!lead) return res.status(404).json({ error: "ไม่พบรายการ" });
  res.json(lead);
}));
// Collection (Apify): fetch the real page content for a lead instead of
// just the SERP title+snippet, so AI analysis works from the actual ad
// copy. Website-only for now — Apify actors for FB/TikTok/Shopee carry
// real ToS risk and are deferred until that's reviewed (see roadmap).
app.post("/api/leads/:id/collect", requireAuth, wrap(async (req, res) => {
  const lead = await store.getLead(Number(req.params.id));
  if (!lead) return res.status(404).json({ error: "ไม่พบรายการ" });
  if (lead.platform !== "website") return res.status(400).json({ error: "รองรับเฉพาะแพลตฟอร์มเว็บไซต์ทั่วไปในตอนนี้" });
  if (!process.env.APIFY_API_TOKEN) return res.status(503).json({ error: "APIFY_API_TOKEN ยังไม่ได้ตั้งค่า" });

  const apifyUrl = "https://api.apify.com/v2/acts/apify~website-content-crawler/run-sync-get-dataset-items?"
    + new URLSearchParams({ token: process.env.APIFY_API_TOKEN });
  let items;
  try {
    const r = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startUrls: [{ url: lead.url }], maxCrawlPages: 1, crawlerType: "cheerio" }),
    });
    if (!r.ok) return res.status(502).json({ error: `Apify ตอบกลับ HTTP ${r.status}` });
    items = await r.json();
  } catch (err) {
    return res.status(502).json({ error: "เรียก Apify ไม่สำเร็จ: " + err.message });
  }

  const text = (items?.[0]?.text || "").trim();
  if (!text) return res.status(422).json({ error: "ไม่สามารถดึงเนื้อหาจากหน้านี้ได้ (อาจต้องใช้ JS render หรือหน้าบล็อกการเข้าถึง)" });

  const updated = await store.updateLeadRawText(lead.id, text.slice(0, 20000));
  res.json(updated);
}));

// Prescreen: match text against banned-keyword list from context_items type='banned'.
// Returns { passed, matchedBanned } — if passed=false the lead is likely irrelevant
// and we avoid a costly AI call.
async function prescreenLead(text) {
  const ctx = await store.listContext();
  const bannedItem = ctx.find((c) => c.type === "banned" && c.active);
  if (!bannedItem || !bannedItem.body) return { passed: true, matchedBanned: [] };
  // Body is bullet-delimited: "คำ1 · คำ2 · ..." or newline-separated
  const keywords = bannedItem.body
    .split(/[·\n,]/)
    .map((k) => k.replace(/^\s*[-•*]\s*/, "").trim())
    .filter((k) => k.length > 1);
  const norm = text.toLowerCase();
  const matchedBanned = keywords.filter((k) => norm.includes(k.toLowerCase()));
  // Must match at least 1 banned keyword to be worth sending to AI
  return { passed: matchedBanned.length > 0, matchedBanned };
}

app.post("/api/leads/:id/prescreen", requireAuth, wrap(async (req, res) => {
  const lead = await store.getLead(Number(req.params.id));
  if (!lead) return res.status(404).json({ error: "ไม่พบรายการ" });
  const text = [lead.url, lead.rawText, ...(lead.matchedKeywords || [])].filter(Boolean).join(" ");
  const result = await prescreenLead(text);
  res.json(result);
}));

app.post("/api/leads/:id/promote", requireAuth, wrap(async (req, res) => {
  const lead = await store.getLead(Number(req.params.id));
  if (!lead) return res.status(404).json({ error: "ไม่พบรายการ" });

  // Prescreen before sending to AI (skip if force=true from UI)
  if (!req.body?.force) {
    const text = [lead.url, lead.rawText, ...(lead.matchedKeywords || [])].filter(Boolean).join(" ");
    const { passed, matchedBanned } = await prescreenLead(text);
    if (!passed) {
      return res.status(422).json({
        error: "ไม่พบคำต้องสงสัยในเนื้อหา อาจไม่ใช่โฆษณาเกินจริง",
        matchedBanned,
        hint: "ส่ง force=true หากต้องการวิเคราะห์ต่อ",
      });
    }
  }

  const context = (await store.listContext()).filter((c) => c.active).map((c) => ({ title: c.title, body: c.body }));
  let analysis;
  try {
    analysis = await runAnalysis({ mode: "link", url: lead.url, text: lead.rawText || "", context });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "วิเคราะห์ไม่สำเร็จ" });
  }
  const { result, usedModel, latencyMs, inputHash, promptTokens, completionTokens } = analysis;
  const caseId = await store.insertCaseFromAnalysis(result, {
    type: "link", model: usedModel, latencyMs, inputHash, promptTokens, completionTokens,
  });
  const updatedLead = await store.markLeadPromoted(lead.id, caseId);
  res.json({ lead: updatedLead, caseId });
}));

// ---- Discovery: SERP API (SerpApi.com) — finds candidate URLs on the open
// web, queues them as leads. This is "Discovery" only (search-index results:
// title + snippet); deep social scraping (Apify) is a later step. Query
// templates pair an excessive-claim phrase with a product category so
// results skew toward food/drug ad pages rather than news/forum mentions.
const DISCOVERY_QUERIES = [
  { q: '"อาหารเสริม" "ลดน้ำหนัก" "เห็นผล 100%"', keyword: "เห็นผล 100%" },
  { q: '"อาหารเสริม" "รักษาหายขาด"', keyword: "รักษาหายขาด" },
  { q: '"ลดน้ำหนัก" "การันตีผล" "ไม่ต้องคุมอาหาร"', keyword: "การันตีผล" },
  { q: '"สมุนไพร" "รักษามะเร็ง" OR "รักษาเบาหวาน"', keyword: "รักษามะเร็ง/เบาหวาน" },
  { q: '"ยา" "หายขาด" "ไม่ต้องผ่าตัด"', keyword: "ไม่ต้องผ่าตัด" },
  { q: '"อาหารเสริม" "อย. รับรอง" "ปลอดภัยไร้ผลข้างเคียง"', keyword: "ปลอดภัยไร้ผลข้างเคียง" },
];

app.get("/api/discovery/queries", requireAuth, wrap(async (_req, res) => {
  res.json({ queries: DISCOVERY_QUERIES, configured: !!process.env.SERPAPI_API_KEY });
}));

app.post("/api/discovery/run", requireAuth, wrap(async (req, res) => {
  if (!process.env.SERPAPI_API_KEY) return res.status(503).json({ error: "SERPAPI_API_KEY ยังไม่ได้ตั้งค่า" });

  const queries = Array.isArray(req.body?.queries) && req.body.queries.length
    ? req.body.queries.map((q) => (typeof q === "string" ? { q, keyword: q } : q))
    : DISCOVERY_QUERIES;

  let found = 0, queued = 0, skipped = 0;
  const errors = [];
  for (const { q, keyword } of queries) {
    try {
      const url = "https://serpapi.com/search.json?" + new URLSearchParams({
        engine: "google", q, gl: "th", hl: "th", num: "10", api_key: process.env.SERPAPI_API_KEY,
      });
      const r = await fetch(url);
      if (!r.ok) { errors.push(`"${q}": HTTP ${r.status}`); continue; }
      const data = await r.json();
      for (const item of data.organic_results || []) {
        if (!item.link) continue;
        found++;
        const lead = await store.insertLead({
          url: item.link,
          platform: "website",
          rawText: [item.title, item.snippet].filter(Boolean).join(" — "),
          matchedKeywords: [keyword],
        });
        if (lead) queued++; else skipped++;
      }
    } catch (err) {
      errors.push(`"${q}": ${err.message}`);
    }
  }
  res.json({ found, queued, skipped, errors, queriesRun: queries.length });
}));

// ---- AI context / knowledge base (auth required) ------------------------
app.get("/api/context", requireAuth, wrap(async (_req, res) => res.json({ items: await store.listContext() })));
app.post("/api/context", requireAuth, wrap(async (req, res) => {
  const { type = "law", title = "", body = "", meta = "" } = req.body || {};
  if (!title.trim()) return res.status(400).json({ error: "ต้องระบุหัวข้อ" });
  res.json(await store.insertContext({ type, title: title.trim(), body: body.trim() || "—", meta }));
}));

// Extracts full text from an uploaded PDF/TXT/MD/CSV file, used by both the
// "new context item" and "attach file to existing item" routes below.
async function extractFileText(file) {
  const name = file.originalname || "เอกสาร";
  const ext = (name.split(".").pop() || "").toLowerCase();

  if (ext === "pdf" || file.mimetype === "application/pdf") {
    const parser = new PDFParse({ data: file.buffer });
    const data = await parser.getText();
    await parser.destroy();
    const text = (data.text || "").trim();
    return { text, meta: `PDF · ${data.total || "?"} หน้า · ${name}`, name };
  }
  if (["txt", "md", "csv"].includes(ext) || file.mimetype?.startsWith("text/")) {
    const text = file.buffer.toString("utf8").trim();
    return { text, meta: `${ext.toUpperCase() || "TXT"} · ${(file.size / 1024).toFixed(0)} KB · ${name}`, name };
  }
  return null;
}

// File-upload variant: extracts full text from PDF/TXT/MD/CSV and stores it
// as the context item's body, so the complete document lives in the DB
// (not just a short summary).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
app.post("/api/context/upload", requireAuth, upload.single("file"), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "ไม่พบไฟล์ที่อัปโหลด" });
  const { type = "doc", title = "" } = req.body || {};
  const extracted = await extractFileText(req.file);
  if (!extracted) return res.status(400).json({ error: "รองรับเฉพาะไฟล์ PDF, TXT, MD, CSV" });
  if (!extracted.text) return res.status(400).json({ error: "ไม่สามารถสกัดข้อความจากไฟล์นี้ได้" });

  const item = await store.insertContext({
    type,
    title: (title.trim() || extracted.name.replace(/\.[^.]+$/, "")).slice(0, 200),
    body: extracted.text.slice(0, 100000),
    meta: extracted.meta,
  });
  res.json(item);
}));

// Attach/replace a real document on an *existing* context item — for legacy
// entries that only ever had a short seed description, not a full document.
app.patch("/api/context/:id/upload", requireAuth, upload.single("file"), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "ไม่พบไฟล์ที่อัปโหลด" });
  const extracted = await extractFileText(req.file);
  if (!extracted) return res.status(400).json({ error: "รองรับเฉพาะไฟล์ PDF, TXT, MD, CSV" });
  if (!extracted.text) return res.status(400).json({ error: "ไม่สามารถสกัดข้อความจากไฟล์นี้ได้" });

  const item = await store.attachContextFile(Number(req.params.id), { body: extracted.text.slice(0, 100000), meta: extracted.meta });
  if (!item) return res.status(404).json({ error: "ไม่พบบริบท" });
  res.json(item);
}));
app.patch("/api/context/:id/toggle", requireAuth, wrap(async (req, res) => {
  const c = await store.toggleContext(Number(req.params.id));
  if (!c) return res.status(404).json({ error: "ไม่พบบริบท" });
  res.json(c);
}));
app.delete("/api/context/:id", requireAuth, wrap(async (req, res) => {
  const ok = await store.deleteContext(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: "ไม่พบบริบท" });
  res.json({ ok: true });
}));

// User management (admin only)
app.get("/api/users", requireAuth, requireAdmin, wrap(async (_req, res) => {
  res.json({ users: await store.listUsers() });
}));
app.post("/api/users", requireAuth, requireAdmin, wrap(async (req, res) => {
  const { email = "", password = "", name = "", role = "officer" } = req.body || {};
  if (!email.trim() || !password) return res.status(400).json({ error: "ต้องระบุอีเมลและรหัสผ่าน" });
  if (await store.getUserByEmail(email.trim())) return res.status(409).json({ error: "อีเมลนี้มีในระบบแล้ว" });
  const hash = await bcrypt.hash(password, 10);
  const user = await store.createUser({ email: email.trim(), passwordHash: hash, name: name.trim() || email.trim(), role });
  const { password_hash: _, ...safe } = user;
  res.json(safe);
}));
app.patch("/api/users/:id", requireAuth, requireAdmin, wrap(async (req, res) => {
  const { name, role } = req.body || {};
  const updated = await store.updateUser(req.params.id, { name, role });
  if (!updated) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  res.json(updated);
}));
app.delete("/api/users/:id", requireAuth, requireAdmin, wrap(async (req, res) => {
  if (String(req.params.id) === String(req.user.id)) return res.status(400).json({ error: "ไม่สามารถลบบัญชีตัวเองได้" });
  const ok = await store.deleteUser(req.params.id);
  if (!ok) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  res.json({ ok: true });
}));
app.patch("/api/users/:id/password", requireAuth, requireAdmin, wrap(async (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
  const hash = await bcrypt.hash(password, 10);
  const ok = await store.resetPassword(req.params.id, hash);
  if (!ok) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  res.json({ ok: true });
}));

// ---- Knowledge base (FDA alerts via Firecrawl) --------------------------
// In-memory crawl job state (single-process; resets on restart)
const crawlJobs = new Map(); // jobId → { status, total, done, errors, startedAt }

app.get("/api/knowledge/alerts", requireAuth, wrap(async (req, res) => {
  const { q = "", limit = "50", offset = "0" } = req.query;
  const result = await store.listAlerts({ q, limit: +limit, offset: +offset });
  res.json(result);
}));

app.delete("/api/knowledge/alerts/:id", requireAuth, requireAdmin, wrap(async (req, res) => {
  const ok = await store.deleteAlert(+req.params.id);
  res.json({ ok });
}));

app.post("/api/knowledge/crawl", requireAuth, requireAdmin, wrap(async (req, res) => {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return res.status(503).json({ error: "FIRECRAWL_API_KEY ยังไม่ได้ตั้งค่า" });

  const { url = "https://safetyalert.fda.moph.go.th/", limit: pageLimit = 200 } = req.body || {};
  const fc = new FirecrawlApp({ apiKey: key });

  // Start an async crawl job (Firecrawl returns a job ID)
  let crawlResp;
  try {
    crawlResp = await fc.asyncCrawlUrl(url, {
      limit: pageLimit,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      excludePaths: ["/wp-content/", "/wp-admin/"],
    });
  } catch (err) {
    console.error("Firecrawl start error:", err?.message || err);
    return res.status(502).json({ error: "เริ่มต้นการค้นหาเว็บไม่สำเร็จ กรุณาตรวจสอบ Firecrawl API key" });
  }

  if (!crawlResp?.success || !crawlResp?.id) {
    return res.status(502).json({ error: "Firecrawl ไม่ตอบสนอง" });
  }

  const jobId = crawlResp.id;
  crawlJobs.set(jobId, { status: "scraping", total: 0, done: 0, imported: 0, errors: 0, startedAt: Date.now() });
  res.json({ jobId, status: "scraping" });

  // Background: poll Firecrawl every 5s, import pages as they complete
  (async () => {
    const job = crawlJobs.get(jobId);
    const seen = new Set();
    let polls = 0;
    while (polls < 120) { // max 10 min
      await new Promise((r) => setTimeout(r, 5000));
      polls++;
      try {
        const status = await fc.checkCrawlStatus(jobId);
        job.total = status.total || 0;
        job.status = status.status; // "scraping" | "completed" | "failed"

        // Import any new pages
        for (const page of status.data || []) {
          const src = page.metadata?.sourceURL || "";
          if (!src || seen.has(src)) continue;
          // Skip non-alert pages (sitemap, rss, search, etc.)
          if (/sitemap|rss|\/search|\/tag\/|\/category\//.test(src)) continue;
          seen.add(src);
          try {
            const md = page.markdown || "";
            const title = extractFdaTitle(md) || page.metadata.title || src;
            // Skip pages with no real alert title
            if (!title || title === "Safety Alert" || title === "แชร์ข่าวสาร​" || title === "ค้นหาข้อมูลการแจ้งเตือน" || title === "ลิงก์จากเว็บไซต์ภายใน อย.") { job.done++; continue; }
            await store.upsertAlert({
              url: src,
              title,
              contentMd: md,
              category: extractCategory(page.metadata.sourceURL),
              publishedAt: extractFdaDate(md) || page.metadata.publishedAt || page.metadata.ogDate || "",
            });
            job.imported++;
          } catch (e) {
            job.errors++;
          }
          job.done++;
        }
        if (status.status === "completed" || status.status === "failed") break;
      } catch (e) {
        console.error("Firecrawl poll error:", e?.message || e);
        job.errors++;
      }
    }
    if (crawlJobs.get(jobId)?.status === "scraping") {
      crawlJobs.get(jobId).status = "completed";
    }
  })();
}));

app.get("/api/knowledge/crawl/:jobId", requireAuth, wrap(async (req, res) => {
  const job = crawlJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "ไม่พบงานนี้" });
  res.json(job);
}));

function extractCategory(url) {
  const m = url.match(/\/(\w+)\//);
  return m ? m[1] : "general";
}

// Extract the actual alert title from breadcrumb pattern:
// "- [ประกาศแจ้งเตือน](url)\n- ชื่อประกาศจริง\n\nชื่อประกาศจริง"
function extractFdaTitle(md) {
  // Last breadcrumb item that is plain text (not a link)
  const crumbMatch = md.match(/- \[ประกาศ[^\]]+\]\([^)]+\)\n- ([^\n\[]+)/);
  if (crumbMatch) return crumbMatch[1].trim();
  // Fallback: first heading
  const h2 = md.match(/^#{1,3} (.+)$/m);
  if (h2) return h2[1].trim();
  return "";
}

// Extract Thai date from content
function extractFdaDate(md) {
  const m = md.match(/(\d{1,2}\s+(?:มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s+\d{4})/);
  return m ? m[1] : "";
}

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
    startSchedules();
  });
}

// ---- Scheduled jobs ---------------------------------------------------------
// Auto-discovery: ค้นหาเว็บต้องสงสัยทุกวัน เวลา 08:00 น. (Asia/Bangkok)
// Auto-crawl FDA: ดึงข้อมูล safetyalert.fda.moph.go.th ทุกวันอาทิตย์ เวลา 02:00 น.
function startSchedules() {
  if (process.env.DISABLE_SCHEDULES === "true") return;

  // Daily discovery at 08:00 ICT
  if (process.env.SERPAPI_API_KEY) {
    cron.schedule("0 8 * * *", runScheduledDiscovery, { timezone: "Asia/Bangkok" });
    console.log("✓ กำหนดการค้นหาเว็บอัตโนมัติ: ทุกวัน 08:00 น.");
  }

  // Weekly FDA crawl on Sunday 02:00 ICT
  if (process.env.FIRECRAWL_API_KEY) {
    cron.schedule("0 2 * * 0", runScheduledFdaCrawl, { timezone: "Asia/Bangkok" });
    console.log("✓ กำหนดการอัปเดตคลังความรู้ อย.: ทุกวันอาทิตย์ 02:00 น.");
  }
}

async function runScheduledDiscovery() {
  console.log("[schedule] เริ่มค้นหาเว็บต้องสงสัยอัตโนมัติ…");
  try {
    let queued = 0, skipped = 0;
    for (const { q, keyword } of DISCOVERY_QUERIES) {
      const url = "https://serpapi.com/search.json?" + new URLSearchParams({
        engine: "google", q, gl: "th", hl: "th", num: "10",
        api_key: process.env.SERPAPI_API_KEY,
      });
      const r = await fetch(url);
      if (!r.ok) { console.warn(`[schedule] SERP error for "${q}": ${r.status}`); continue; }
      const data = await r.json();
      for (const item of data.organic_results || []) {
        if (!item.link) continue;
        const lead = await store.insertLead({
          url: item.link, platform: "website",
          rawText: [item.title, item.snippet].filter(Boolean).join(" — "),
          matchedKeywords: [keyword],
        });
        if (lead) queued++; else skipped++;
      }
    }
    console.log(`[schedule] ค้นพบ leads ใหม่ ${queued} รายการ (ซ้ำ ${skipped})`);
  } catch (e) {
    console.error("[schedule] discovery error:", e?.message || e);
  }
}

async function runScheduledFdaCrawl() {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return;
  console.log("[schedule] เริ่มอัปเดตคลังความรู้ อย.…");
  try {
    const fc = new FirecrawlApp({ apiKey: key });
    const crawlResp = await fc.asyncCrawlUrl("https://safetyalert.fda.moph.go.th/", {
      limit: 200,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      excludePaths: ["/wp-content/", "/wp-admin/"],
    });
    if (!crawlResp?.success || !crawlResp?.id) {
      console.error("[schedule] Firecrawl ไม่ตอบสนอง");
      return;
    }
    // Poll to completion, upsert pages
    const seen = new Set();
    let imported = 0, polls = 0;
    while (polls < 120) {
      await new Promise((r) => setTimeout(r, 5000));
      polls++;
      const status = await fc.checkCrawlStatus(crawlResp.id).catch(() => null);
      if (!status) continue;
      for (const page of status.data || []) {
        const src = page.metadata?.sourceURL || "";
        if (!src || seen.has(src) || /sitemap|rss|\/search/.test(src)) continue;
        seen.add(src);
        const md = page.markdown || "";
        const title = extractFdaTitle(md) || page.metadata.title || src;
        if (!title || ["Safety Alert", "แชร์ข่าวสาร​", "ค้นหาข้อมูลการแจ้งเตือน", "ลิงก์จากเว็บไซต์ภายใน อย."].includes(title)) continue;
        await store.upsertAlert({
          url: src, title,
          contentMd: md,
          category: extractCategory(src),
          publishedAt: extractFdaDate(md) || "",
        }).catch(() => {});
        imported++;
      }
      if (status.status === "completed" || status.status === "failed") break;
    }
    console.log(`[schedule] อัปเดตคลังความรู้ อย. สำเร็จ — ${imported} รายการ`);
  } catch (e) {
    console.error("[schedule] FDA crawl error:", e?.message || e);
  }
}

export { app };
