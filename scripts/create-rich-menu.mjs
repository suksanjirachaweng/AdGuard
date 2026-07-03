/**
 * LINE Rich Menu creator
 * Usage: node scripts/create-rich-menu.mjs
 * Requires LINE_CHANNEL_ACCESS_TOKEN in .env
 */

import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load .env
try {
  const env = readFileSync(join(ROOT, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!TOKEN) { console.error("❌  LINE_CHANNEL_ACCESS_TOKEN ไม่พบใน .env"); process.exit(1); }

// Register fonts
GlobalFonts.registerFromPath("/System/Library/Fonts/Supplemental/Thonburi.ttc", "Thonburi");
GlobalFonts.registerFromPath("/System/Library/Fonts/Apple Color Emoji.ttc", "Emoji");
console.log("  Registered fonts:", GlobalFonts.families.map(f => f.family).join(", "));

// ── Rich Menu JSON ────────────────────────────────────────────────────────────
const PUBLIC_CHECK_URL = "https://falsead-detector.onrender.com/check";
const FDA_ALERT_URL    = "https://safetyalert.fda.moph.go.th/";

const W = 2500, H = 1686;
const COL = Math.floor(W / 3), ROW = Math.floor(H / 2);

const RICH_MENU = {
  size: { width: W, height: H },
  selected: true,
  name: "AdGuard Main Menu",
  chatBarText: "เมนูหลัก",
  areas: [
    btn(0,      0,    COL, ROW, { type: "message", text: "แจ้งเบาะแส: ส่ง URL โฆษณาที่ต้องการแจ้ง" }),
    btn(COL,    0,    COL, ROW, { type: "uri",     uri: PUBLIC_CHECK_URL }),
    btn(COL*2,  0,    COL, ROW, { type: "uri",     uri: FDA_ALERT_URL }),
    btn(0,      ROW,  COL, ROW, { type: "message", text: "ตรวจเลขอนุญาต: กรุณาระบุเลขที่อนุญาต เช่น 10-1-12345-1-0001" }),
    btn(COL,    ROW,  COL, ROW, { type: "uri",     uri: "tel:1556" }),
    btn(COL*2,  ROW,  COL, ROW, { type: "message", text: "วิธีใช้งาน" }),
  ],
};

function btn(x, y, w, h, action) {
  return { bounds: { x, y, width: w, height: h }, action };
}

// ── Cell definitions ──────────────────────────────────────────────────────────
const CELLS = [
  { label: "แจ้งเบาะแส",    sub: "ส่ง URL โฆษณาต้องสงสัย",    bg: "#E8F5E9", accent: "#2E7D32", icon: drawIconReport },
  { label: "ตรวจสอบ",       sub: "ผลิตภัณฑ์ / URL",           bg: "#E3F2FD", accent: "#1565C0", icon: drawIconSearch },
  { label: "เตือนภัย อย.", sub: "ประกาศ สำนักงาน อย.",        bg: "#FCE4EC", accent: "#C62828", icon: drawIconAlert  },
  { label: "เลขอนุญาต",     sub: "ตรวจสถานะทะเบียน",          bg: "#FFF8E1", accent: "#E65100", icon: drawIconDoc    },
  { label: "ติดต่อ อย.",    sub: "สายด่วน 1556",               bg: "#F3E5F5", accent: "#6A1B9A", icon: drawIconPhone  },
  { label: "วิธีใช้งาน",   sub: "คู่มือการแจ้งเบาะแส",       bg: "#E0F2F1", accent: "#00695C", icon: drawIconHelp   },
];

// ── Vector icons (drawn with canvas primitives) ───────────────────────────────
function drawIconReport(ctx, cx, cy, r, color) {
  // Link / paperclip icon
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.18; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx - r*0.2, cy - r*0.2, r*0.38, Math.PI*0.75, Math.PI*1.75);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + r*0.2, cy + r*0.2, r*0.38, Math.PI*1.75, Math.PI*0.75);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r*0.35, cy + r*0.07);
  ctx.lineTo(cx + r*0.35, cy - r*0.07);
  ctx.stroke();
}

function drawIconSearch(ctx, cx, cy, r, color) {
  // Magnifier
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.18; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx - r*0.12, cy - r*0.12, r*0.52, 0, Math.PI*2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + r*0.28, cy + r*0.28);
  ctx.lineTo(cx + r*0.6, cy + r*0.6);
  ctx.stroke();
}

function drawIconAlert(ctx, cx, cy, r, color) {
  // Warning triangle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r*0.65);
  ctx.lineTo(cx + r*0.7, cy + r*0.45);
  ctx.lineTo(cx - r*0.7, cy + r*0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${r*0.65}px Thonburi`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("!", cx, cy + r*0.12);
}

function drawIconDoc(ctx, cx, cy, r, color) {
  // Document with lines
  ctx.fillStyle = "#FFFFFF";
  const dw = r*1.1, dh = r*1.3;
  roundRect(ctx, cx - dw/2, cy - dh/2, dw, dh, r*0.12);
  ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = r*0.12;
  ctx.stroke();
  // fold
  const fold = r*0.28;
  ctx.fillStyle = color + "44";
  ctx.beginPath();
  ctx.moveTo(cx + dw/2 - fold, cy - dh/2);
  ctx.lineTo(cx + dw/2, cy - dh/2 + fold);
  ctx.lineTo(cx + dw/2 - fold, cy - dh/2 + fold);
  ctx.closePath();
  ctx.fill();
  // lines
  ctx.strokeStyle = color; ctx.lineWidth = r*0.1; ctx.lineCap = "round";
  [0.15, 0.35, 0.55].forEach((t, i) => {
    const lw = i === 2 ? dw*0.5 : dw*0.7;
    ctx.beginPath();
    ctx.moveTo(cx - lw/2 + r*0.05, cy - dh/2 + dh*0.42 + t*dh*0.5);
    ctx.lineTo(cx - lw/2 + r*0.05 + lw, cy - dh/2 + dh*0.42 + t*dh*0.5);
    ctx.stroke();
  });
}

function drawIconPhone(ctx, cx, cy, r, color) {
  // Phone handset
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx - r*0.35, cy - r*0.3, r*0.2, r*0.28, Math.PI/4, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + r*0.35, cy + r*0.3, r*0.2, r*0.28, Math.PI/4, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = r*0.22; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r*0.22, cy - r*0.35);
  ctx.quadraticCurveTo(cx - r*0.6, cy, cx + r*0.22, cy + r*0.35);
  ctx.stroke();
}

function drawIconHelp(ctx, cx, cy, r, color) {
  // Question mark in circle
  ctx.strokeStyle = color; ctx.lineWidth = r*0.14;
  ctx.beginPath(); ctx.arc(cx, cy, r*0.72, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `bold ${r*0.72}px Thonburi`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("?", cx, cy + r*0.06);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}

// ── Draw the full image ───────────────────────────────────────────────────────
function drawMenu() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const cw = COL, ch = ROW;

  // White background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  CELLS.forEach((cell, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = col * cw, y = row * ch;

    // Cell background
    ctx.fillStyle = cell.bg;
    ctx.fillRect(x, y, cw, ch);

    // Accent top bar
    ctx.fillStyle = cell.accent;
    ctx.fillRect(x, y, cw, 18);

    // Icon circle background
    const icx = x + cw / 2, icy = y + ch * 0.35;
    const ir = ch * 0.21;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.arc(icx, icy, ir * 1.15, 0, Math.PI * 2); ctx.fill();

    // Draw vector icon
    ctx.save();
    cell.icon(ctx, icx, icy, ir, cell.accent);
    ctx.restore();

    // Label (Thai)
    ctx.fillStyle = cell.accent;
    ctx.font = `bold 105px Thonburi`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(cell.label, x + cw / 2, y + ch * 0.64);

    // Sub-label
    ctx.fillStyle = "#666666";
    ctx.font = `72px Thonburi`;
    ctx.fillText(cell.sub, x + cw / 2, y + ch * 0.78);

    // Grid lines
    ctx.strokeStyle = "#CCCCCC";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, cw, ch);
  });

  return canvas.toBuffer("image/png");
}

// ── LINE API helpers ──────────────────────────────────────────────────────────
const LINE      = "https://api.line.me/v2/bot";
const LINE_DATA = "https://api-data.line.me/v2/bot";

async function linePost(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

async function uploadImage(richMenuId, imageBuffer) {
  const r = await fetch(`${LINE_DATA}/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { "Content-Type": "image/png", Authorization: `Bearer ${TOKEN}` },
    body: imageBuffer,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`upload ${r.status} ${text}`);
}

async function deleteAllRichMenus() {
  const r = await fetch(`${LINE}/richmenu/list`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const { richmenus = [] } = await r.json();
  for (const m of richmenus) {
    console.log(`  🗑  ลบ: ${m.richMenuId}`);
    await fetch(`${LINE}/richmenu/${m.richMenuId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${TOKEN}` },
    });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log("🎨  วาด Rich Menu image (2500×1686)…");
  const img = drawMenu();
  const imgPath = join(ROOT, "scripts", "rich-menu-preview.png");
  writeFileSync(imgPath, img);
  console.log(`    บันทึก preview → scripts/rich-menu-preview.png`);

  console.log("🗑   ลบ Rich Menu เก่า…");
  await deleteAllRichMenus();

  console.log("📤  สร้าง Rich Menu…");
  const { richMenuId } = await linePost(`${LINE}/richmenu`, RICH_MENU);
  console.log(`    richMenuId: ${richMenuId}`);

  console.log("🖼   อัปโหลด image…");
  await uploadImage(richMenuId, img);

  console.log("⭐  ตั้งเป็น Default Rich Menu…");
  await linePost(`${LINE}/user/all/richmenu/${richMenuId}`, {});

  console.log(`\n✅  เสร็จสิ้น! Rich Menu พร้อมใช้งานแล้ว`);
  console.log(`    ดู preview ได้ที่ scripts/rich-menu-preview.png`);
})().catch((e) => { console.error("❌ ", e.message); process.exit(1); });
