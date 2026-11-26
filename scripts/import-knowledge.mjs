/**
 * Import PDF knowledge base documents into the database.
 * Usage: node scripts/import-knowledge.mjs [--category food] [--dry-run]
 *
 * Reads PDFs from knowledge/{category}-ads/ subfolders (or all categories),
 * extracts text with pdf-parse, splits into ~500-char chunks, and INSERTs
 * into knowledge_docs + knowledge_chunks tables.
 *
 * Safe to re-run: skips files already imported (matched by source_file).
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname, extname, basename } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Load .env ──────────────────────────────────────────────────────────────
try {
  const env = readFileSync(join(ROOT, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

// ── Args ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const dryRun = args.includes("--dry-run");
const onlyCategory = getArg("--category"); // e.g. "food"

// ── Category folder mapping ───────────────────────────────────────────────
const FOLDER_TO_CATEGORY = {
  "food-ads":           "food",
  "drug-ads":           "drug",
  "cosmetic-ads":       "cosmetic",
  "herbal-ads":         "herbal",
  "medical-device-ads": "medical_device",
  "hazardous-ads":      "hazardous",
};

// Sub-folder → doc_type hints
const SUBFOLDER_TO_DOCTYPE = {
  "โฆษณาอาหาร":          "regulation",
  "โฆษณายา":             "regulation",
  "โฆษณาผลิตภัณฑ์สมุนไพร": "regulation",
  "โฆษณาวัตถุอันตราย":   "regulation",
  "โฆษณาเครื่องมือแพทย์": "regulation",
  "โฆษณาเครื่องสำอาง":   "regulation",
  "00_ทั่วไป":           "guideline",
};

// Sub-folder → category override (overrides parent folder's category)
const SUBFOLDER_TO_CATEGORY = {
  "โฆษณาอาหาร":          "food",
  "โฆษณายา":             "drug",
  "โฆษณาผลิตภัณฑ์สมุนไพร": "herbal",
  "โฆษณาวัตถุอันตราย":   "hazardous",
  "โฆษณาเครื่องมือแพทย์": "medical_device",
  "โฆษณาเครื่องสำอาง":   "cosmetic",
};

// ── Chunk text ─────────────────────────────────────────────────────────────
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

function chunkText(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= CHUNK_SIZE) return [clean];
  const chunks = [];
  let pos = 0;
  while (pos < clean.length) {
    const end = Math.min(pos + CHUNK_SIZE, clean.length);
    // Try to break at sentence boundary
    const slice = clean.slice(pos, end);
    const breakAt = slice.lastIndexOf("। ") !== -1 ? slice.lastIndexOf("। ") + 2
                  : slice.lastIndexOf(". ") !== -1 ? slice.lastIndexOf(". ") + 2
                  : slice.lastIndexOf(" ") !== -1 ? slice.lastIndexOf(" ") + 1
                  : slice.length;
    chunks.push(slice.slice(0, breakAt).trim());
    const advance = breakAt - CHUNK_OVERLAP;
    pos += advance > 0 ? advance : breakAt; // ensure pos always moves forward
  }
  return chunks.filter(Boolean);
}

// ── Collect PDF files ──────────────────────────────────────────────────────
function collectPdfs(baseDir, category) {
  const files = [];
  function walk(dir, subfolder = "") {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full, name);
      else if (extname(name).toLowerCase() === ".pdf") {
        const docType = SUBFOLDER_TO_DOCTYPE[subfolder] || "manual";
        const effectiveCategory = SUBFOLDER_TO_CATEGORY[subfolder] || category;
        files.push({ path: full, name, category: effectiveCategory, docType });
      }
    }
  }
  walk(baseDir);
  return files;
}

// ── Main ───────────────────────────────────────────────────────────────────
const ssl = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || process.env.PGHOST || "")
  ? false : { rejectUnauthorized: false };
const pool = new pg.Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl }
    : { ssl }
);

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_docs (
      id serial PRIMARY KEY, category text NOT NULL DEFAULT 'general',
      doc_type text NOT NULL DEFAULT 'manual', title text NOT NULL,
      source_file text, priority text NOT NULL DEFAULT 'normal',
      active boolean DEFAULT true, created_at timestamptz DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id serial PRIMARY KEY, doc_id integer REFERENCES knowledge_docs(id) ON DELETE CASCADE,
      chunk_idx integer NOT NULL, content text NOT NULL, created_at timestamptz DEFAULT now()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON knowledge_chunks(doc_id)");
}

async function getImportedFiles() {
  const { rows } = await pool.query("SELECT source_file FROM knowledge_docs");
  return new Set(rows.map((r) => r.source_file));
}

(async () => {
  const knowledgeDir = join(ROOT, "knowledge");
  const MAX_FILE_MB = 15; // skip very large PDFs (image-heavy manuals)
  const MAX_PAGES = 20;   // cap page count for large files (regulatory intro is usually up front)

  function extractPdfText(filePath) {
    const sizeMb = statSync(filePath).size / (1024 * 1024);
    if (sizeMb > MAX_FILE_MB) throw new Error(`ไฟล์ใหญ่เกิน ${MAX_FILE_MB}MB (${sizeMb.toFixed(1)}MB) — ข้าม`);
    // Large files: extract first N pages only (regulatory summary is usually at the front)
    const pageArg = sizeMb > 5 ? `-l ${MAX_PAGES}` : "";
    try {
      return execSync(`pdftotext -enc UTF-8 ${pageArg} "${filePath}" -`, {
        maxBuffer: 15 * 1024 * 1024,
        timeout: 30000,
      }).toString();
    } catch (e) {
      throw new Error(e.stderr?.toString()?.trim() || e.message);
    }
  }

  // Collect which folders to process
  const folders = readdirSync(knowledgeDir)
    .filter((f) => statSync(join(knowledgeDir, f)).isDirectory())
    .filter((f) => f in FOLDER_TO_CATEGORY)
    .filter((f) => !onlyCategory || FOLDER_TO_CATEGORY[f] === onlyCategory);

  if (folders.length === 0) {
    console.log("ไม่พบโฟลเดอร์ที่ตรงกัน ตรวจสอบ knowledge/ directory");
    process.exit(0);
  }

  if (!dryRun) await ensureTables();
  const imported = dryRun ? new Set() : await getImportedFiles();
  let totalDocs = 0, totalChunks = 0, skipped = 0;

  for (const folder of folders) {
    const category = FOLDER_TO_CATEGORY[folder];
    const folderPath = join(knowledgeDir, folder);
    const pdfs = collectPdfs(folderPath, category);
    console.log(`\n📁  ${folder} (${category}) — พบ ${pdfs.length} ไฟล์`);

    for (const { path, name, category: cat, docType } of pdfs) {
      if (imported.has(name)) {
        console.log(`  ⏭  ข้าม (มีแล้ว): ${name}`);
        skipped++;
        continue;
      }

      process.stdout.write(`  📄  ${name}… `);
      let pdfText = "";
      try {
        pdfText = extractPdfText(path);
      } catch (e) {
        console.log(`⚠️  อ่านไม่สำเร็จ: ${e.message}`);
        continue;
      }

      const chunks = chunkText(pdfText);
      const title = basename(name, extname(name));
      console.log(`${chunks.length} chunks`);
      if (dryRun) { totalDocs++; totalChunks += chunks.length; continue; }

      const { rows } = await pool.query(
        `INSERT INTO knowledge_docs (category, doc_type, title, source_file, priority)
         VALUES ($1, $2, $3, $4, 'normal') RETURNING id`,
        [cat, docType, title, name]
      );
      const docId = rows[0].id;
      for (let i = 0; i < chunks.length; i++) {
        await pool.query(
          "INSERT INTO knowledge_chunks (doc_id, chunk_idx, content) VALUES ($1, $2, $3)",
          [docId, i, chunks[i]]
        );
      }
      totalDocs++;
      totalChunks += chunks.length;
    }
  }

  console.log(`\n${dryRun ? "[DRY RUN] " : ""}✅  เสร็จสิ้น`);
  console.log(`   เอกสารใหม่: ${totalDocs}, chunks: ${totalChunks}, ข้ามแล้ว: ${skipped}`);
  await pool.end();
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
