export const navDef = [
  { key: "dashboard", th: "แดชบอร์ด",      en: "Dashboard",     icon: "▦" },
  { key: "upload",    th: "ตรวจสอบใหม่",    en: "New Check",     icon: "＋" },
  { key: "result",    th: "ผลวิเคราะห์ AI", en: "AI Analysis",   icon: "◎" },
  { key: "cases",     th: "ฐานข้อมูลเคส",   en: "Case Database", icon: "▤", badge: "24" },
  { key: "context",   th: "บริบท AI",       en: "AI Context",    icon: "✦" },
  { key: "monitoring", th: "เฝ้าระวัง",      en: "Monitoring",    icon: "🔭" },
  { key: "handoff",   th: "ส่งต่อหน่วยงาน", en: "Referral",      icon: "➤" },
  { key: "analytics", th: "วัดประสิทธิภาพ", en: "Model Analytics", icon: "◈" },
  { key: "users",     th: "จัดการผู้ใช้",    en: "User Management", icon: "👤", adminOnly: true },
];

export const titles = {
  dashboard: ["แดชบอร์ดภาพรวม", "Overview Dashboard · ศูนย์เฝ้าระวังโฆษณา"],
  upload:    ["ตรวจสอบรายการใหม่", "New Verification · วาง URL / อัปโหลดไฟล์ / ภาพ"],
  result:    ["ผลการวิเคราะห์ด้วย AI", "AI Analysis Report · AD-2026-0481"],
  cases:     ["ฐานข้อมูลเคส", "Case Database · 24 records"],
  context:   ["บริบท & ฐานความรู้ AI", "AI Context & Knowledge Base"],
  monitoring: ["เฝ้าระวังโฆษณาบนอินเทอร์เน็ต", "Web & Social Monitoring Queue"],
  handoff:   ["ส่งต่อหน่วยงานที่เกี่ยวข้อง", "Inter-agency Referral"],
  analytics: ["วัดประสิทธิภาพ AI Model", "Model Performance Analytics"],
  users:     ["จัดการผู้ใช้งาน", "User Management"],
};

export const ctxTypes = {
  law:       { label: "กฎหมาย/ประกาศ", icon: "§", color: "#2563a8", bg: "#e7f0fb", bd: "#cfe0f5" },
  banned:    { label: "คำต้องห้าม",     icon: "⊘", color: "#c0392b", bg: "#fdecea", bd: "#f5c6bf" },
  rule:      { label: "กฎเกณฑ์ภายใน",   icon: "◆", color: "#157347", bg: "#e9f4ee", bd: "#c9e6d4" },
  whitelist: { label: "รายการอนุญาต",   icon: "✓", color: "#6b7d75", bg: "#eef2f0", bd: "#dde5e0" },
  doc:       { label: "เอกสารอ้างอิง",   icon: "▤", color: "#6b39b8", bg: "#f0e9fb", bd: "#ddccf3" },
};

// Offline fallback used only if /api/cases is unreachable.
export const FALLBACK_CASES = [
  { id: "AD-2026-0481", title: 'อาหารเสริมลดน้ำหนัก "SlimX Pro Detox"', source: "shopee.co.th/slimx-pro", channel: "Shopee", type: "image", risk: "high", riskTh: "เสี่ยงสูง", status: "pending", statusTh: "รอตรวจสอบ", date: "14 มิ.ย.", violations: 3, agency: "อย.", score: 92 },
  { id: "AD-2026-0479", title: 'เซรั่มหน้าใส "GlowMax" ลดฝ้าใน 3 วัน', source: "facebook.com/glowmax.th", channel: "Facebook", type: "link", risk: "high", riskTh: "เสี่ยงสูง", status: "review", statusTh: "กำลังตรวจ", date: "14 มิ.ย.", violations: 4, agency: "อย.", score: 88 },
  { id: "AD-2026-0476", title: 'คอร์สเทรดทำเงิน "รวยเร็ว 300%/เดือน"', source: "tiktok.com/@fxmaster", channel: "TikTok", type: "link", risk: "high", riskTh: "เสี่ยงสูง", status: "referred", statusTh: "ส่งต่อแล้ว", date: "13 มิ.ย.", violations: 5, agency: "กลต./DSI", score: 95 },
  { id: "AD-2026-0470", title: 'เครื่องกรองน้ำ "PureLife" รักษาโรคได้', source: "lazada.co.th/purelife", channel: "Lazada", type: "image", risk: "medium", riskTh: "ปานกลาง", status: "pending", statusTh: "รอตรวจสอบ", date: "13 มิ.ย.", violations: 2, agency: "สคบ.", score: 64 },
  { id: "AD-2026-0468", title: 'แพ็กเกจเน็ตมือถือ "ไม่อั้นจริง" 4G', source: "netfast.co.th/promo", channel: "Website", type: "link", risk: "medium", riskTh: "ปานกลาง", status: "review", statusTh: "กำลังตรวจ", date: "12 มิ.ย.", violations: 2, agency: "กสทช.", score: 58 },
  { id: "AD-2026-0463", title: 'กาแฟควบคุมน้ำหนัก "FitCoffee"', source: "instagram.com/fitcoffee", channel: "Instagram", type: "image", risk: "medium", riskTh: "ปานกลาง", status: "cleared", statusTh: "ปิดเคส", date: "12 มิ.ย.", violations: 1, agency: "อย.", score: 46 },
  { id: "AD-2026-0459", title: 'ประกันสุขภาพ "คุ้มครองทันที 100%"', source: "surecare.co.th", channel: "Website", type: "file", risk: "low", riskTh: "เสี่ยงต่ำ", status: "cleared", statusTh: "ปิดเคส", date: "11 มิ.ย.", violations: 1, agency: "คปภ.", score: 28 },
  { id: "AD-2026-0455", title: 'ครีมกันแดด "UV Shield SPF100"', source: "shopee.co.th/uvshield", channel: "Shopee", type: "image", risk: "clear", riskTh: "ไม่พบ", status: "cleared", statusTh: "ปิดเคส", date: "10 มิ.ย.", violations: 0, agency: "-", score: 8 },
];

export const FALLBACK_CONTEXT = [
  { id: 1, type: "law", title: "พ.ร.บ.อาหาร พ.ศ. 2522 — หมวดการโฆษณา", body: "มาตรา 40–41 ว่าด้วยการห้ามโฆษณาคุณประโยชน์ คุณภาพ หรือสรรพคุณเกินจริง และการอ้างรักษาโรคสำหรับผลิตภัณฑ์อาหาร", meta: "อัปเดต 1 มิ.ย. 2026", active: true },
  { id: 2, type: "banned", title: "คำต้องห้าม — กลุ่มอาหารเสริม", body: "รักษาหายขาด · ลดน้ำหนัก X กก. ใน Y วัน · เห็นผล 100% · ปลอดภัยไร้ผลข้างเคียง · อย. รับรอง (เกินจริง) · รักษาเบาหวาน/มะเร็ง", meta: "128 คำ · อัปเดต 8 มิ.ย.", active: true },
  { id: 3, type: "rule", title: "เกณฑ์ให้คะแนนความเสี่ยงภายใน อย.", body: "หลักเกณฑ์การให้ Risk Score 0–100 ตามประเภทการอ้างสรรพคุณ ความรุนแรง และผลกระทบต่อผู้บริโภค", meta: "v3.2 · อัปเดต 5 มิ.ย.", active: true },
  { id: 4, type: "whitelist", title: "เลขสารบบอาหาร อย. ที่รับรองแล้ว", body: "ฐานข้อมูลเลข อย. และแบรนด์ที่ผ่านการขึ้นทะเบียนถูกต้อง ใช้ตรวจการแอบอ้างเครื่องหมายรับรอง", meta: "1,240 รายการ", active: true },
  { id: 5, type: "doc", title: "ประกาศกระทรวงสาธารณสุข ฉบับที่ 293", body: "รายการสรรพคุณที่ห้ามแสดงบนฉลากและสื่อโฆษณาผลิตภัณฑ์เสริมอาหาร (เอกสารแนบ PDF)", meta: "PDF · 14 หน้า", active: false },
];
