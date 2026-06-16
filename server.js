import express from "express";
import Anthropic from "@anthropic-ai/sdk";
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
// Serve the built React app (client/ → vite build → ./public) when present.
// Falls through to the original vanilla files at the project root otherwise.
app.use(express.static(join(__dirname, "public")));
app.use(express.static(__dirname));

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

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

app.post("/api/analyze", async (req, res) => {
  try {
    const { mode, url = "", text = "", imageBase64 = "", imageMediaType = "image/jpeg", context = [] } = req.body || {};

    const ctxNote = Array.isArray(context) && context.length
      ? `\n\nบริบท/ฐานความรู้เพิ่มเติมที่ต้องใช้ประกอบการพิจารณา:\n- ${context.join("\n- ")}`
      : "";

    const userContent = [];
    if (mode === "image" && imageBase64) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: imageMediaType, data: imageBase64 },
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

    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: ANALYSIS_SCHEMA } },
      messages: [{ role: "user", content: userContent }],
    });

    if (message.stop_reason === "refusal") {
      return res.status(422).json({ error: "AI ปฏิเสธการวิเคราะห์เนื้อหานี้" });
    }

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock) return res.status(502).json({ error: "ไม่ได้รับผลลัพธ์จาก AI" });

    const result = JSON.parse(textBlock.text);
    const caseId = store.insertCaseFromAnalysis(result, { type: mode });
    res.json({ ...result, caseId });
  } catch (err) {
    console.error("analyze error:", err?.message || err);
    const status = err?.status || 500;
    res.status(status).json({ error: err?.message || "เกิดข้อผิดพลาดในการวิเคราะห์" });
  }
});

// ---- Case database -------------------------------------------------------
app.get("/api/cases", (req, res) => {
  res.json({ cases: store.listCases(req.query.filter), counts: store.countCases() });
});
app.get("/api/cases/:id", (req, res) => {
  const c = store.getCase(req.params.id);
  if (!c) return res.status(404).json({ error: "ไม่พบเคส" });
  res.json(c);
});
app.post("/api/cases/:id/refer", (req, res) => {
  const { agencies = [], note = "" } = req.body || {};
  if (!agencies.length) return res.status(400).json({ error: "ต้องเลือกอย่างน้อย 1 หน่วยงาน" });
  if (!store.referCase(req.params.id, agencies, note)) return res.status(404).json({ error: "ไม่พบเคส" });
  res.json({ ok: true });
});

// ---- AI context / knowledge base ----------------------------------------
app.get("/api/context", (_req, res) => res.json({ items: store.listContext() }));
app.post("/api/context", (req, res) => {
  const { type = "law", title = "", body = "", meta = "" } = req.body || {};
  if (!title.trim()) return res.status(400).json({ error: "ต้องระบุหัวข้อ" });
  res.json(store.insertContext({ type, title: title.trim(), body: body.trim() || "—", meta }));
});
app.patch("/api/context/:id/toggle", (req, res) => {
  const c = store.toggleContext(Number(req.params.id));
  if (!c) return res.status(404).json({ error: "ไม่พบบริบท" });
  res.json(c);
});

// SPA fallback: serve the React build's index.html for client-side routes
// (e.g. /result/AD-2026-0481 on refresh). Only when a build exists; API and
// asset requests are already handled by the routes/static middleware above.
const spaIndex = join(__dirname, "public", "index.html");
app.get("*", (req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  if (existsSync(spaIndex)) return res.sendFile(spaIndex);
  next();
});

// Start the server only when run directly (`node server.js`), not when imported
// by tests via supertest.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  app.listen(PORT, () => {
    console.log(`AdGuard running → http://localhost:${PORT}`);
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("⚠️  ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่า — /api/analyze จะใช้งานไม่ได้ (คัดลอก .env.example เป็น .env)");
    }
  });
}

export { app };
