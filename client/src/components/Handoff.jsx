import { st } from "../lib/st.js";
import { useApp } from "../store.jsx";

const agencyDefs = [
  { key: "fda", abbr: "อย.", name: "สำนักงานคณะกรรมการอาหารและยา", scope: "อาหาร · ยา · เครื่องสำอาง · เครื่องมือแพทย์" },
  { key: "ocpb", abbr: "สคบ.", name: "สำนักงานคุ้มครองผู้บริโภค", scope: "โฆษณาหลอกลวง · สัญญาไม่เป็นธรรม" },
  { key: "nbtc", abbr: "กสทช.", name: "สำนักงาน กสทช.", scope: "โทรคมนาคม · สื่อกระจายเสียง" },
  { key: "dsi", abbr: "DSI", name: "กรมสอบสวนคดีพิเศษ / ตำรวจ", scope: "คดีฉ้อโกง · อาชญากรรมทางเทคโนโลยี" },
  { key: "custom", abbr: "+", name: "กำหนดหน่วยงานเอง", scope: "ระบุหน่วยงานปลายทางอื่น ๆ" },
];

export default function Handoff() {
  const { state, set, go, toggleAgency, send, resetHandoff } = useApp();
  const ai = state.viewAnalysis;
  const caseId = state.selectedId || "—";
  const caseTitle = ai?.title || caseId;
  const riskTh = ai?.riskTh || "—";
  const riskScore = ai?.riskScore ?? null;
  const violationCount = ai?.violations?.length ?? 0;
  const lawCount = ai?.violations?.flatMap((v) => v.laws || []).length ?? 0;
  const refNum = caseId.replace("AD-", "REF-") + "-A";
  const attachments = [
    `รายงานการวิเคราะห์ฉบับเต็ม (PDF) · ${caseId}`,
    "ภาพหน้าจอโฆษณาต้นฉบับ + ภาพไฮไลต์จุดผิด",
    ...(lawCount > 0 ? [`ตารางมาตรากฎหมายที่เกี่ยวข้อง ${lawCount} รายการ`] : []),
  ];

  if (state.handoffSent) {
    return (
      <div style={st("max-width:880px;margin:0 auto;animation:fadeUp .4s ease;")}>
        <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:14px;padding:48px;text-align:center;")}>
          <div style={st("width:72px;height:72px;border-radius:50%;background:#e9f4ee;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 20px;color:#157347;")}>✓</div>
          <div style={st("font-size:20px;font-weight:700;color:#16241d;margin-bottom:8px;")}>ส่งต่อเรื่องเรียบร้อยแล้ว</div>
          <div style={st("font-size:13.5px;color:#7d8e86;line-height:1.7;max-width:480px;margin:0 auto 8px;")}>ระบบได้บันทึกการส่งต่อเคส <b style={st("font-family:'IBM Plex Mono',monospace;color:#16241d;")}>{caseId}</b> ไปยังหน่วยงานที่เลือก พร้อมแนบรายงานการวิเคราะห์และหลักฐานทั้งหมด หน่วยงานจะได้รับการแจ้งเตือนผ่านระบบเชื่อมต่อภายใน 1 ชั่วโมง</div>
          <div style={st("font-family:'IBM Plex Mono',monospace;font-size:12px;color:#9aa8a1;margin-bottom:24px;")}>เลขอ้างอิงการส่งต่อ · {refNum}</div>
          <div style={st("display:flex;gap:10px;justify-content:center;")}>
            <button onClick={() => go("cases")} style={st("background:#157347;color:#fff;border:none;border-radius:9px;padding:11px 22px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;")}>กลับสู่ฐานข้อมูลเคส</button>
            <button onClick={resetHandoff} style={st("background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:11px 22px;font-family:inherit;font-size:13px;font-weight:600;color:#39473f;cursor:pointer;")}>ส่งต่ออีกหน่วยงาน</button>
          </div>
        </div>
      </div>
    );
  }

  const nSel = state.handoffAgencies.length;
  const sendBtn = "display:flex;align-items:center;justify-content:center;gap:8px;flex:1;border:none;border-radius:11px;padding:14px;font-family:inherit;font-size:14px;font-weight:600;cursor:" + (nSel > 0 ? "pointer" : "not-allowed") + ";background:" + (nSel > 0 ? "#157347" : "#cdd8d2") + ";color:#fff;" + (nSel > 0 ? "box-shadow:0 3px 10px rgba(21,115,71,.3);" : "");

  return (
    <div style={st("max-width:880px;margin:0 auto;animation:fadeUp .4s ease;")}>
      <div style={st("background:#0f3026;border-radius:13px;padding:18px 22px;margin-bottom:16px;display:flex;align-items:center;gap:16px;color:#fff;")}>
        <div style={st("width:46px;height:46px;border-radius:11px;background:#c0392b;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;")}>⚠</div>
        <div style={st("flex:1;min-width:0;")}>
          <div style={st("font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#7fae97;margin-bottom:3px;")}>
            {caseId}{riskTh !== "—" ? ` · ${riskTh}` : ""}{violationCount > 0 ? ` · ${violationCount} ความผิด` : ""}
          </div>
          <div style={st("font-size:15px;font-weight:600;")}>{caseTitle}</div>
        </div>
        {riskScore !== null && (
          <span style={st("font-family:'IBM Plex Mono',monospace;font-size:11px;color:#7fae97;background:rgba(255,255,255,.08);padding:5px 11px;border-radius:7px;")}>RISK {riskScore}/100</span>
        )}
      </div>

      <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:14px;padding:26px;")}>
        <div style={st("font-size:16px;font-weight:600;color:#16241d;margin-bottom:4px;")}>เลือกหน่วยงานปลายทาง</div>
        <div style={st("font-size:12.5px;color:#7d8e86;margin-bottom:20px;")}>ระบบจะส่งรายงานการวิเคราะห์ หลักฐาน และมาตราที่เกี่ยวข้องผ่านช่องทางเชื่อมต่อระหว่างหน่วยงาน (e-Referral)</div>

        <div style={st("display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px;")}>
          {agencyDefs.map((a) => {
            const on = state.handoffAgencies.includes(a.key);
            const btn = "display:flex;align-items:center;gap:12px;border:1.5px solid " + (on ? "#2f9e6a" : "#e2e9e5") + ";background:" + (on ? "#f0f7f3" : "#fff") + ";border-radius:11px;padding:14px;font-family:inherit;cursor:pointer;text-align:left;transition:all .15s;";
            const ic = "width:42px;height:42px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;background:" + (on ? "#2f9e6a" : "#eef4f1") + ";color:" + (on ? "#fff" : "#3d6b54") + ";";
            const ck = "width:22px;height:22px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:" + (on ? "#2f9e6a" : "#f1f5f3") + ";color:" + (on ? "#fff" : "transparent") + ";border:1px solid " + (on ? "#2f9e6a" : "#e2e9e5") + ";";
            return (
              <button key={a.key} onClick={() => toggleAgency(a.key)} style={st(btn)}>
                <div style={st(ic)}>{a.abbr}</div>
                <div style={st("flex:1;text-align:left;min-width:0;")}>
                  <div style={st("font-size:13.5px;font-weight:600;color:#16241d;")}>{a.name}</div>
                  <div style={st("font-size:11px;color:#7d8e86;line-height:1.4;")}>{a.scope}</div>
                </div>
                <span style={st(ck)}>✓</span>
              </button>
            );
          })}
        </div>

        <div style={st("margin-bottom:20px;")}>
          <label style={st("font-size:12.5px;font-weight:600;color:#39473f;display:block;margin-bottom:8px;")}>ความเห็น / ข้อสั่งการเพิ่มเติม</label>
          <textarea value={state.handoffNote} onChange={(e) => set({ handoffNote: e.target.value })} placeholder="ระบุข้อสังเกตหรือข้อสั่งการถึงหน่วยงานปลายทาง…" style={st("width:100%;min-height:90px;border:1.5px solid #d8e2dc;border-radius:10px;padding:13px;font-family:inherit;font-size:13px;color:#16241d;resize:vertical;outline:none;line-height:1.6;")}></textarea>
        </div>

        <div style={st("background:#f7faf8;border:1px solid #eef2f0;border-radius:10px;padding:14px 16px;margin-bottom:22px;")}>
          <div style={st("font-size:12px;font-weight:600;color:#39473f;margin-bottom:10px;")}>📎 เอกสารแนบอัตโนมัติ</div>
          <div style={st("display:flex;flex-direction:column;gap:7px;")}>
            {attachments.map((at, i) => (
              <div key={i} style={st("display:flex;align-items:center;gap:9px;font-size:12.5px;color:#5a6b63;")}><span style={st("color:#2c7a4f;")}>✓</span>{at}</div>
            ))}
          </div>
        </div>

        <div style={st("display:flex;align-items:center;gap:12px;")}>
          <button onClick={send} style={st(sendBtn)}>➤ ส่งต่อไปยัง {nSel} หน่วยงาน</button>
          <button onClick={() => go("result")} style={st("background:none;border:none;font-family:inherit;font-size:13px;color:#7d8e86;cursor:pointer;text-decoration:underline;")}>← กลับไปดูผลวิเคราะห์</button>
        </div>
      </div>
    </div>
  );
}
