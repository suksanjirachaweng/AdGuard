import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { st } from "../lib/st.js";
import { riskBadge, dimColor } from "../lib/badges.js";
import { useApp } from "../store.jsx";

const mark = (color, bg) => "background:" + bg + ";color:" + color + ";border-radius:4px;padding:1px 3px;font-weight:600;box-decoration-break:clone;-webkit-box-decoration-break:clone;";
const STATIC_SEGMENTS = [
  ["🔥 SlimX Pro Detox สุดยอดนวัตกรรมจากธรรมชาติ ", "", null],
  ["ลดน้ำหนัก 10 กก. ใน 7 วัน", "1", "high"],
  [" รับรองเห็นผลจริง สูตรเข้มข้นช่วย ", "", null],
  ["รักษาเบาหวาน ความดัน ไขมันในเลือดให้หายขาด", "2", "high"],
  [" ดื่มแล้ว ", "", null],
  ["เห็นผลทันที ไม่ต้องอดอาหาร ไม่ต้องออกกำลังกาย", "3", "medium"],
  [" ผ่านการ ", "", null],
  ["รับรองจาก อย. ปลอดภัย 100% ไร้ผลข้างเคียง", "4", "high"],
  [" สั่งซื้อด่วน! ของมีจำนวนจำกัด 🛒", "", null],
];
const STATIC_PINS = [[1, "30%", "22%", "high"], [2, "54%", "60%", "high"], [3, "70%", "35%", "medium"], [4, "40%", "78%", "high"]];
const STATIC_DIMS = [
  { name: "อ้างสรรพคุณเกินจริง", pct: 95, label: "95", color: "#d64545" },
  { name: "อ้างรักษาโรค (ต้องห้าม)", pct: 90, label: "90", color: "#d64545" },
  { name: "แอบอ้างการรับรอง อย.", pct: 88, label: "88", color: "#d64545" },
  { name: "ความน่าเชื่อถือหลักฐาน", pct: 24, label: "ต่ำ", color: "#e0a92e" },
];
const STATIC_FINDINGS = [
  "อ้างผลลัพธ์เชิงปริมาณที่เป็นไปไม่ได้ทางการแพทย์ (ลด 10 กก./7 วัน)",
  "ผลิตภัณฑ์อาหารอ้างสรรพคุณรักษาโรคเฉพาะ ซึ่งกฎหมายห้ามเด็ดขาด",
  "แอบอ้างเครื่องหมาย อย. โดยเลขที่ อย. บนฉลากไม่ตรงกับฐานข้อมูล",
];
const STATIC_VIOLATIONS = [
  { n: 1, sev: "high", tag: "การโฆษณาคุณประโยชน์เกินจริง", claim: "ลดน้ำหนัก 10 กก. ใน 7 วัน", reason: "อ้างผลการลดน้ำหนักเชิงปริมาณที่เกินจริงและไม่มีหลักฐานทางวิทยาศาสตร์รองรับ เข้าข่ายโฆษณาหลอกลวงผู้บริโภค", advice: "ระงับการเผยแพร่ทันที และเรียกหลักฐานอ้างอิงผลการทดสอบจากผู้ประกอบการ", laws: ["พ.ร.บ.อาหาร 2522 ม.40", "พ.ร.บ.คุ้มครองผู้บริโภค ม.22"] },
  { n: 2, sev: "high", tag: "อาหารอ้างรักษาโรค (ต้องห้าม)", claim: "รักษาเบาหวาน ความดัน ไขมันในเลือดให้หายขาด", reason: "ผลิตภัณฑ์เสริมอาหารไม่สามารถอ้างสรรพคุณบำบัด บรรเทา หรือรักษาโรคได้ ถือเป็นข้อความต้องห้ามตามประกาศกระทรวงสาธารณสุข", advice: "ส่งเรื่องให้ อย. ออกคำสั่งระงับโฆษณาและพิจารณาโทษตามกฎหมาย", laws: ["พ.ร.บ.อาหาร 2522 ม.41", "ประกาศ สธ. (ฉบับที่ 293)"] },
  { n: 3, sev: "medium", tag: "ข้อความชวนเชื่อเกินจริง", claim: "เห็นผลทันที ไม่ต้องอดอาหาร ไม่ต้องออกกำลังกาย", reason: "สร้างความเข้าใจผิดต่อผู้บริโภคเรื่องประสิทธิผลและวิธีใช้ ขัดกับหลักโภชนาการพื้นฐาน", advice: "ปรับแก้ข้อความให้มีคำเตือนและไม่รับประกันผลลัพธ์", laws: ["พ.ร.บ.คุ้มครองผู้บริโภค ม.22"] },
  { n: 4, sev: "high", tag: "แอบอ้างการรับรองหน่วยงาน", claim: "รับรองจาก อย. ปลอดภัย 100% ไร้ผลข้างเคียง", reason: "แอบอ้างเครื่องหมาย อย. และเลขสารบบอาหารที่ตรวจสอบแล้วไม่ตรงกับฐานข้อมูล ถือเป็นการให้ข้อมูลเท็จ", advice: "แจ้งความดำเนินคดีฐานปลอมแปลง/แอบอ้างเครื่องหมายราชการ และส่งต่อ อย.", laws: ["พ.ร.บ.อาหาร 2522 ม.40", "ประมวลกฎหมายอาญา ม.272"] },
];

const sevHigh = "display:inline-flex;align-items:center;font-size:11px;font-weight:700;padding:3px 11px;border-radius:20px;background:#fdecea;color:#c0392b;border:1px solid #f5c6bf;";
const sevMed = "display:inline-flex;align-items:center;font-size:11px;font-weight:700;padding:3px 11px;border-radius:20px;background:#fdf4e3;color:#a9760e;border:1px solid #f3e0b5;";
const numHigh = "width:34px;height:34px;border-radius:9px;background:#fdecea;color:#c0392b;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;font-family:'IBM Plex Mono',monospace;";
const numMed = "width:34px;height:34px;border-radius:9px;background:#fdf4e3;color:#a9760e;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;font-family:'IBM Plex Mono',monospace;";

function Seg({ t, sup, sev }) {
  let style = "color:#39473f;", supStyle = "display:none;";
  if (sev === "high") { style = mark("#9e2b1e", "#fbd9d3"); supStyle = "font-size:10px;color:#c0392b;font-weight:700;margin-left:1px;font-family:'IBM Plex Mono',monospace;"; }
  else if (sev === "medium") { style = mark("#8a5d08", "#fbeccb"); supStyle = "font-size:10px;color:#a9760e;font-weight:700;margin-left:1px;font-family:'IBM Plex Mono',monospace;"; }
  return <span style={st(style)}>{t}<sup style={st(supStyle)}>{sup || ""}</sup></span>;
}

export default function Result() {
  const { state, go, ensureCase } = useApp();
  const { id } = useParams();

  // Load the case named in the URL (handles deep links + browser back/forward).
  // Skip when the store already holds this case's analysis (e.g. right after analyze()).
  useEffect(() => {
    if (id && (state.selectedId !== id || !state.viewAnalysis)) ensureCase(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ai = state.viewAnalysis || null;
  const base = state.cases.find((c) => c.id === state.selectedId) || state.cases[0] || {};
  const rc = ai
    ? { id: state.selectedId || "AI-LIVE", risk: ai.riskLevel, riskTh: ai.riskTh, title: ai.title, source: ai.source, channel: ai.channel, score: ai.riskScore, date: "วันนี้" }
    : base;
  const catVal = ai ? ai.category : "อาหารเสริม";
  const confidence = ai ? ai.confidence : 96;
  const verdictTitle = ai ? ai.verdictTitle : "พบการโฆษณาเกินจริง — เข้าข่ายความผิดชัดเจน";
  const verdictSummary = ai ? ai.verdictSummary : "AI ตรวจพบข้อความโฆษณาที่อ้างสรรพคุณเกินจริง 4 รายการ โดย 3 รายการเข้าข่ายความผิดตาม พ.ร.บ.อาหาร พ.ศ. 2522 และการแอบอ้างเครื่องหมาย อย. ควรพิจารณาส่งต่อให้สำนักงานคณะกรรมการอาหารและยาดำเนินการ";
  const ringColor = dimColor(rc.score || 0);
  const scoreRing = "position:absolute;inset:0;border-radius:50%;background:conic-gradient(" + ringColor + " 0 " + (rc.score || 0) + "%, #f0e3e1 " + (rc.score || 0) + "% 100%);";

  const riskDims = ai ? ai.riskDims.map((r) => ({ name: r.name, pct: r.pct, label: r.label, color: dimColor(r.pct) })) : STATIC_DIMS;
  const findings = ai ? ai.findings : STATIC_FINDINGS;
  const violations = ai ? ai.violations.map((v, i) => ({ n: i + 1, sev: v.severity, tag: v.tag, claim: v.claim, reason: v.reason, advice: v.advice, laws: v.laws })) : STATIC_VIOLATIONS;

  return (
    <div style={st("max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;")}>
      {/* CASE HEADER */}
      <div className="result-head" style={st("background:#fff;border:1px solid #e2e9e5;border-radius:14px;padding:20px 22px;margin-bottom:16px;display:flex;align-items:center;gap:22px;")}>
        <div style={st("flex:1;min-width:0;")}>
          <div style={st("display:flex;align-items:center;gap:9px;margin-bottom:7px;")}>
            <span style={st("font-family:'IBM Plex Mono',monospace;font-size:12px;color:#7d8e86;background:#f1f5f3;padding:2px 9px;border-radius:6px;")}>{rc.id}</span>
            <span style={st(riskBadge(rc.risk))}>⚠ {rc.riskTh}</span>
            <span style={st("font-size:11px;color:#9aa8a1;")}>· วิเคราะห์เมื่อ {rc.date} 2026 น.</span>
          </div>
          <div style={st("font-size:19px;font-weight:700;color:#16241d;margin-bottom:6px;")}>{rc.title}</div>
          <div style={st("display:flex;align-items:center;gap:8px;flex-wrap:wrap;")}>
            <span style={st("font-family:'IBM Plex Mono',monospace;font-size:12px;color:#3d6b54;")}>🔗 {rc.source}</span>
            <span style={st("font-size:11px;color:#7d8e86;background:#eef4f1;border:1px solid #dce6e0;padding:2px 9px;border-radius:6px;")}>{rc.channel}</span>
            <span style={st("font-size:11px;color:#7d8e86;background:#eef4f1;border:1px solid #dce6e0;padding:2px 9px;border-radius:6px;")}>หมวด: {catVal}</span>
          </div>
        </div>
        <div className="result-ring" style={st("position:relative;width:104px;height:104px;flex-shrink:0;")}>
          <div style={st(scoreRing)}></div>
          <div style={st("position:absolute;inset:9px;background:#fff;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;")}>
            <div style={st("font-size:30px;font-weight:700;color:#c0392b;font-family:'IBM Plex Mono',monospace;line-height:1;")}>{rc.score}</div>
            <div style={st("font-size:9px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;letter-spacing:.5px;")}>RISK SCORE</div>
          </div>
        </div>
        <div className="result-actions" style={st("display:flex;flex-direction:column;gap:8px;flex-shrink:0;")}>
          <button className="h-dark" onClick={() => go("handoff")} style={st("display:flex;align-items:center;justify-content:center;gap:7px;background:#157347;color:#fff;border:none;border-radius:9px;padding:11px 18px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 2px 6px rgba(21,115,71,.3);")}>➤ ส่งต่อหน่วยงาน</button>
          <div style={st("display:flex;gap:8px;")}>
            <button className="h-soft" style={st("flex:1;background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:9px 12px;font-family:inherit;font-size:12px;font-weight:600;color:#39473f;cursor:pointer;")}>💾 บันทึก</button>
            <button className="h-soft" style={st("flex:1;background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:9px 12px;font-family:inherit;font-size:12px;font-weight:600;color:#39473f;cursor:pointer;")}>⤓ PDF</button>
          </div>
        </div>
      </div>

      {/* VERDICT BANNER */}
      <div style={st("background:linear-gradient(100deg,#fdecea,#fdf4f2);border:1px solid #f5c6bf;border-radius:13px;padding:18px 22px;margin-bottom:16px;display:flex;align-items:flex-start;gap:15px;")}>
        <div style={st("width:40px;height:40px;border-radius:10px;background:#c0392b;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;flex-shrink:0;")}>⚠</div>
        <div style={st("flex:1;")}>
          <div style={st("font-size:15px;font-weight:700;color:#9e2b1e;margin-bottom:4px;")}>{verdictTitle}</div>
          <div style={st("font-size:13px;color:#7a3329;line-height:1.6;")}>{verdictSummary}</div>
        </div>
        <div style={st("text-align:center;flex-shrink:0;padding-left:12px;border-left:1px solid #f0cbc4;")}>
          <div style={st("font-size:12px;color:#9aa8a1;")}>ความเชื่อมั่น AI</div>
          <div style={st("font-size:24px;font-weight:700;color:#16241d;font-family:'IBM Plex Mono',monospace;")}>{confidence}%</div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div style={st("display:grid;grid-template-columns:1.45fr 1fr;gap:16px;margin-bottom:16px;")}>
        <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:20px;")}>
          <div style={st("font-size:13.5px;font-weight:600;color:#16241d;margin-bottom:3px;")}>เนื้อหาที่ตรวจสอบ · Analyzed content</div>
          <div style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;margin-bottom:14px;")}>Vision AI · OCR + claim extraction</div>
          <div style={st("position:relative;border-radius:11px;overflow:hidden;border:1px solid #e2e9e5;background-image:repeating-linear-gradient(135deg,#eef2f0 0 12px,#e7ede9 12px 24px);height:200px;margin-bottom:16px;")}>
            <div style={st("position:absolute;top:10px;left:12px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#8a988f;background:rgba(255,255,255,.75);padding:3px 8px;border-radius:5px;")}>{ai ? (state.fileName || rc.source || "analyzed source") : "AD BANNER · slimx_ad.jpg · 1280×720"}</div>
            {!ai && STATIC_PINS.map(([n, top, left, sev]) => (
              <div key={n} style={st("position:absolute;top:" + top + ";left:" + left + ";width:24px;height:24px;border-radius:50%;background:" + (sev === "medium" ? "#e0a92e" : "#d64545") + ";color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;font-family:'IBM Plex Mono',monospace;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff;")}>{n}</div>
            ))}
            <div style={st("position:absolute;bottom:10px;right:12px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8a988f;background:rgba(255,255,255,.75);padding:3px 8px;border-radius:5px;")}>📌 จุดที่ตรวจพบ</div>
          </div>
          <div style={st("font-size:11px;color:#7d8e86;font-weight:600;margin-bottom:8px;")}>ข้อความที่สกัดได้ · Extracted copy</div>
          <div style={st("font-size:14px;line-height:2.1;color:#39473f;background:#f9fbfa;border:1px solid #eef2f0;border-radius:10px;padding:16px;")}>
            {ai
              ? <span style={st("color:#39473f;white-space:pre-wrap;")}>{ai.extractedText}</span>
              : STATIC_SEGMENTS.map(([t, sup, sev], i) => <Seg key={i} t={t} sup={sup} sev={sev} />)}
          </div>
        </div>

        <div style={st("display:flex;flex-direction:column;gap:16px;")}>
          <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:20px;")}>
            <div style={st("font-size:13.5px;font-weight:600;color:#16241d;margin-bottom:14px;")}>มิติความเสี่ยง · Risk breakdown</div>
            <div style={st("display:flex;flex-direction:column;gap:13px;")}>
              {riskDims.map((r, i) => (
                <div key={i}>
                  <div style={st("display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;")}>
                    <span style={st("color:#39473f;")}>{r.name}</span>
                    <span style={st("color:" + r.color + ";font-weight:600;font-family:'IBM Plex Mono',monospace;")}>{r.label}</span>
                  </div>
                  <div style={st("height:7px;background:#eef2f0;border-radius:4px;overflow:hidden;")}>
                    <div style={st("width:" + r.pct + "%;height:100%;background:" + r.color + ";border-radius:4px;animation:barGrow .7s ease;")}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:20px;flex:1;")}>
            <div style={st("font-size:13.5px;font-weight:600;color:#16241d;margin-bottom:13px;")}>สรุปประเด็น · Key findings</div>
            <div style={st("display:flex;flex-direction:column;gap:11px;")}>
              {findings.map((f, i) => (
                <div key={i} style={st("display:flex;gap:10px;align-items:flex-start;")}>
                  <span style={st("color:#c0392b;font-size:14px;flex-shrink:0;line-height:1.5;")}>●</span>
                  <span style={st("font-size:12.5px;color:#39473f;line-height:1.55;")}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* VIOLATIONS */}
      <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;overflow:hidden;")}>
        <div style={st("padding:18px 22px;border-bottom:1px solid #eef2f0;display:flex;align-items:center;gap:10px;")}>
          <span style={st("font-size:15px;font-weight:600;color:#16241d;")}>รายการความผิดที่ตรวจพบ</span>
          <span style={st("background:#fdecea;color:#c0392b;font-size:12px;font-weight:600;padding:2px 10px;border-radius:20px;")}>{violations.length} รายการ</span>
        </div>
        {violations.map((v) => (
          <div key={v.n} style={st("padding:20px 22px;border-bottom:1px solid #f3f6f4;display:grid;grid-template-columns:34px 1fr;gap:16px;")}>
            <div style={st(v.sev === "high" ? numHigh : numMed)}>{v.n}</div>
            <div>
              <div style={st("display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;")}>
                <span style={st(v.sev === "high" ? sevHigh : sevMed)}>{v.sev === "high" ? "ความผิดร้ายแรง · HIGH" : "ควรแก้ไข · MEDIUM"}</span>
                <span style={st("font-size:12px;color:#9aa8a1;")}>{v.tag}</span>
              </div>
              <div style={st("background:#fdf4f2;border-left:3px solid #d64545;border-radius:0 8px 8px 0;padding:11px 14px;margin-bottom:13px;")}>
                <div style={st("font-size:10.5px;color:#a9760e;font-weight:600;margin-bottom:3px;")}>ข้อความที่พบ</div>
                <div style={st("font-size:14px;color:#16241d;font-weight:600;font-style:italic;")}>“{v.claim}”</div>
              </div>
              <div style={st("display:grid;grid-template-columns:1fr 1fr;gap:16px;")}>
                <div>
                  <div style={st("font-size:11px;color:#7d8e86;font-weight:600;margin-bottom:5px;")}>⚖ เหตุผล / ความผิด</div>
                  <div style={st("font-size:13px;color:#39473f;line-height:1.6;")}>{v.reason}</div>
                </div>
                <div>
                  <div style={st("font-size:11px;color:#7d8e86;font-weight:600;margin-bottom:5px;")}>💡 คำแนะนำ</div>
                  <div style={st("font-size:13px;color:#39473f;line-height:1.6;")}>{v.advice}</div>
                </div>
              </div>
              <div style={st("margin-top:13px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;")}>
                <span style={st("font-size:11px;color:#7d8e86;font-weight:600;")}>มาตราที่เกี่ยวข้อง:</span>
                {v.laws.map((law, i) => (
                  <span key={i} style={st("display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:#2c5a8a;background:#e7f0fb;border:1px solid #cfe0f5;padding:4px 11px;border-radius:7px;")}>§ {law}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
