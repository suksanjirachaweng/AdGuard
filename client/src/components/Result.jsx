import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { st } from "../lib/st.js";
import { riskBadge, dimColor } from "../lib/badges.js";
import { useApp } from "../store.jsx";

// Rough cost estimate (USD per 1M tokens) keyed by model substring
const COST_MAP = [
  { key: "opus-4",    input: 15,  output: 75  },
  { key: "opus",      input: 15,  output: 75  },
  { key: "sonnet-4",  input: 3,   output: 15  },
  { key: "sonnet",    input: 3,   output: 15  },
  { key: "haiku",     input: 0.8, output: 4   },
];
function estimateCost(model = "", promptTokens, completionTokens) {
  if (!promptTokens && !completionTokens) return null;
  const rate = COST_MAP.find((r) => model.toLowerCase().includes(r.key)) || { input: 10, output: 30 };
  const usd = ((promptTokens || 0) * rate.input + (completionTokens || 0) * rate.output) / 1_000_000;
  return usd < 0.001 ? "<$0.001" : "$" + usd.toFixed(4);
}

const RISK_OPTIONS = [
  { value: "high",   label: "เสี่ยงสูง",   color: "#d64545" },
  { value: "medium", label: "ปานกลาง",     color: "#e0a92e" },
  { value: "low",    label: "เสี่ยงต่ำ",   color: "#2f9e6a" },
  { value: "clear",  label: "ไม่พบความผิด", color: "#6b7d75" },
];
const VERDICT_OPTIONS = [
  { value: "confirmed",  label: "✓ ยืนยันผล AI",       color: "#157347" },
  { value: "partial",    label: "~ แก้ไขบางส่วน",       color: "#e0a92e" },
  { value: "overturned", label: "✕ พลิกผล (ไม่เห็นด้วย)", color: "#c0392b" },
];

const sevHigh = "display:inline-flex;align-items:center;font-size:11px;font-weight:700;padding:3px 11px;border-radius:20px;background:#fdecea;color:#c0392b;border:1px solid #f5c6bf;";
const sevMed = "display:inline-flex;align-items:center;font-size:11px;font-weight:700;padding:3px 11px;border-radius:20px;background:#fdf4e3;color:#a9760e;border:1px solid #f3e0b5;";
const numHigh = "width:34px;height:34px;border-radius:9px;background:#fdecea;color:#c0392b;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;font-family:'IBM Plex Mono',monospace;";
const numMed = "width:34px;height:34px;border-radius:9px;background:#fdf4e3;color:#a9760e;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;font-family:'IBM Plex Mono',monospace;";


export default function Result() {
  const { state, go, ensureCase, setVerdict } = useApp();
  const { id } = useParams();
  const contentRef = useRef(null);

  // Hooks must be at top level — before any early returns
  const ai = state.viewAnalysis || null;
  const [vForm, setVForm] = useState({
    expertRiskLevel: ai?.expertRiskLevel || "",
    expertVerdict: ai?.expertVerdict || "",
    officerOverride: ai?.officerOverride || false,
  });
  const [vSaved, setVSaved] = useState(!!ai?.expertVerdict);

  useEffect(() => {
    if (id && (state.selectedId !== id || !state.viewAnalysis)) ensureCase(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Sync verdict form when analysis loads (e.g. deep-link)
  useEffect(() => {
    if (ai) {
      setVForm({ expertRiskLevel: ai.expertRiskLevel || "", expertVerdict: ai.expertVerdict || "", officerOverride: !!ai.officerOverride });
      setVSaved(!!ai.expertVerdict);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedId]);

  // Loading skeleton
  if (state.loadingCase) {
    return (
      <div style={st("max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;")}>
        <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:14px;padding:20px 22px;margin-bottom:16px;")}>
          <div style={st("height:16px;background:#eef2f0;border-radius:6px;width:30%;margin-bottom:12px;animation:pulse 1.2s ease infinite;")}></div>
          <div style={st("height:24px;background:#eef2f0;border-radius:6px;width:60%;margin-bottom:10px;animation:pulse 1.2s ease infinite;")}></div>
          <div style={st("height:14px;background:#eef2f0;border-radius:6px;width:45%;animation:pulse 1.2s ease infinite;")}></div>
        </div>
        <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:48px;text-align:center;color:#7d8e86;font-size:14px;")}>
          กำลังโหลดข้อมูลเคส…
        </div>
      </div>
    );
  }

  const base = state.cases.find((c) => c.id === state.selectedId) || state.cases[0] || {};

  // No-analysis state: case exists in DB but has no AI analysis yet
  if (!ai && state.selectedId && !state.loadingCase) {
    const caseId = state.selectedId;
    return (
      <div style={st("max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;")}>
        <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:14px;padding:20px 22px;margin-bottom:16px;display:flex;align-items:center;gap:12px;")}>
          <span style={st("font-family:'IBM Plex Mono',monospace;font-size:12px;color:#7d8e86;background:#f1f5f3;padding:2px 9px;border-radius:6px;")}>{caseId}</span>
          {base.riskTh && <span style={st("font-size:12px;color:#7d8e86;")}>{base.riskTh}</span>}
          {base.title && <span style={st("font-size:15px;font-weight:600;color:#16241d;")}>{base.title}</span>}
        </div>
        <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:56px;text-align:center;")}>
          <div style={st("font-size:40px;margin-bottom:16px;")}>📋</div>
          <div style={st("font-size:16px;font-weight:600;color:#16241d;margin-bottom:8px;")}>ยังไม่มีผลวิเคราะห์ AI</div>
          <div style={st("font-size:13.5px;color:#7d8e86;line-height:1.7;max-width:420px;margin:0 auto 24px;")}>เคสนี้ยังไม่ผ่านการตรวจสอบด้วย AI กดปุ่มด้านล่างเพื่อเริ่มวิเคราะห์ใหม่</div>
          <div style={st("display:flex;gap:10px;justify-content:center;")}>
            <button onClick={() => go("upload")} style={st("background:#157347;color:#fff;border:none;border-radius:9px;padding:11px 22px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;")}>＋ ตรวจสอบใหม่</button>
            <button onClick={() => go("cases")} style={st("background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:11px 22px;font-family:inherit;font-size:13px;font-weight:600;color:#39473f;cursor:pointer;")}>← กลับฐานข้อมูลเคส</button>
          </div>
        </div>
      </div>
    );
  }
  const caseModel = ai.model || state.cases.find((c) => c.id === state.selectedId)?.model || null;
  const totalTokens = (ai.promptTokens || 0) + (ai.completionTokens || 0);
  const costEst = estimateCost(caseModel, ai.promptTokens, ai.completionTokens);
  const handleSaveVerdict = async () => {
    await setVerdict(state.selectedId, vForm);
    setVSaved(true);
  };

  const rc = { id: state.selectedId || "AI-LIVE", risk: ai.riskLevel, riskTh: ai.riskTh, title: ai.title, source: ai.source, channel: ai.channel, score: ai.riskScore, date: "วันนี้" };
  const catVal = ai.category;
  const confidence = ai.confidence;
  const verdictTitle = ai.verdictTitle;
  const verdictSummary = ai.verdictSummary;
  const ringColor = dimColor(rc.score || 0);

  const handleExportPdf = () => {
    const prev = document.title;
    document.title = `AdGuard-${rc.id || "report"}-${new Date().toISOString().slice(0, 10)}`;
    const restore = () => { document.title = prev; window.removeEventListener("afterprint", restore); };
    window.addEventListener("afterprint", restore);
    window.print();
  };
  const scoreRing = "position:absolute;inset:0;border-radius:50%;background:conic-gradient(" + ringColor + " 0 " + (rc.score || 0) + "%, #f0e3e1 " + (rc.score || 0) + "% 100%);";

  const riskDims = ai.riskDims.map((r) => ({ name: r.name, pct: r.pct, label: r.label, color: dimColor(r.pct) }));
  const findings = ai.findings;
  const violations = ai.violations.map((v, i) => ({ n: i + 1, sev: v.severity, tag: v.tag, claim: v.claim, reason: v.reason, advice: v.advice, laws: v.laws }));

  const today = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div ref={contentRef} style={st("max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;")}>
      {/* PRINT-ONLY HEADER */}
      <div className="print-header" style={st("display:none;")}>
        <div style={st("display:flex;align-items:center;gap:16px;padding-bottom:14px;border-bottom:2px solid #157347;margin-bottom:18px;")}>
          <img src="/logo.png" alt="กระทรวงสาธารณสุข" style={st("width:72px;height:72px;object-fit:contain;border-radius:50%;border:2px solid #c8d8cc;background:#fff;padding:4px;flex-shrink:0;")} />
          <div style={st("flex:1;")}>
            <div style={st("font-size:15px;font-weight:700;color:#0f3026;")}>กระทรวงสาธารณสุข · Ministry of Public Health</div>
            <div style={st("font-size:13px;color:#39473f;font-weight:600;margin-top:2px;")}>รายงานผลการตรวจสอบโฆษณาผลิตภัณฑ์สุขภาพ</div>
            <div style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;margin-top:3px;")}>AdGuard False-Ad Detection System · ระบบตรวจจับโฆษณาเกินจริงด้วย AI</div>
          </div>
          <div style={st("text-align:right;font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;")}>
            <div>เลขที่เคส: {rc.id}</div>
            <div>วันที่พิมพ์: {today}</div>
            <div>ระดับความเสี่ยง: {rc.riskTh}</div>
          </div>
        </div>
      </div>
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
            {caseModel && (
              <span style={st("font-size:11px;color:#4a3b7a;background:#f0ecfa;border:1px solid #d8ceee;padding:2px 9px;border-radius:6px;font-family:'IBM Plex Mono',monospace;")} title="AI model ที่ใช้วิเคราะห์">🤖 {caseModel}</span>
            )}
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
            <button className="h-soft" onClick={handleExportPdf} style={st("flex:1;background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:9px 12px;font-family:inherit;font-size:12px;font-weight:600;color:#39473f;cursor:pointer;")}>⤓ PDF</button>
          </div>
        </div>
      </div>

      {/* PERFORMANCE STRIP */}
      {(ai.latencyMs || totalTokens > 0) && (
        <div style={st("display:flex;align-items:center;gap:16px;flex-wrap:wrap;background:#f7faf8;border:1px solid #e2e9e5;border-radius:10px;padding:10px 16px;margin-bottom:16px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#5a6b63;")}>
          <span style={st("font-size:10px;font-weight:700;color:#9aa8a1;letter-spacing:.8px;")}>AI METADATA</span>
          {ai.latencyMs && <span>⏱ {(ai.latencyMs / 1000).toFixed(1)}s</span>}
          {ai.promptTokens && <span>↑ {ai.promptTokens.toLocaleString()} tokens in</span>}
          {ai.completionTokens && <span>↓ {ai.completionTokens.toLocaleString()} tokens out</span>}
          {totalTokens > 0 && <span style={st("color:#7d8e86;")}>{totalTokens.toLocaleString()} total</span>}
          {costEst && <span style={st("color:#6b39b8;font-weight:600;")}>~{costEst}</span>}
        </div>
      )}

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
            <div style={st("position:absolute;top:10px;left:12px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#8a988f;background:rgba(255,255,255,.75);padding:3px 8px;border-radius:5px;")}>{state.fileName || rc.source || "analyzed source"}</div>
            <div style={st("position:absolute;bottom:10px;right:12px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8a988f;background:rgba(255,255,255,.75);padding:3px 8px;border-radius:5px;")}>📌 จุดที่ตรวจพบ</div>
          </div>
          <div style={st("font-size:11px;color:#7d8e86;font-weight:600;margin-bottom:8px;")}>ข้อความที่สกัดได้ · Extracted copy</div>
          <div style={st("font-size:14px;line-height:2.1;color:#39473f;background:#f9fbfa;border:1px solid #eef2f0;border-radius:10px;padding:16px;")}>
            <span style={st("color:#39473f;white-space:pre-wrap;")}>{ai.extractedText}</span>
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

      {/* EXPERT VERDICT */}
      <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:20px 22px;margin-top:16px;")}>
        <div style={st("display:flex;align-items:center;gap:10px;margin-bottom:16px;")}>
          <span style={st("font-size:15px;font-weight:600;color:#16241d;")}>ผลตรวจสอบของผู้เชี่ยวชาญ</span>
          <span style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;")}>Expert Ground Truth</span>
          {vSaved && <span style={st("margin-left:auto;font-size:11px;color:#157347;background:#eaf5ee;border:1px solid #c3e6cb;padding:2px 10px;border-radius:20px;font-weight:600;")}>✓ บันทึกแล้ว</span>}
        </div>

        <div style={st("display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:18px;")}>
          {/* Expert risk level */}
          <div>
            <div style={st("font-size:11px;font-weight:600;color:#7d8e86;margin-bottom:8px;")}>ระดับเสี่ยงตามผู้เชี่ยวชาญ</div>
            <div style={st("display:flex;flex-direction:column;gap:6px;")}>
              {RISK_OPTIONS.map((o) => {
                const on = vForm.expertRiskLevel === o.value;
                return (
                  <button key={o.value} onClick={() => setVForm((f) => ({ ...f, expertRiskLevel: o.value }))}
                    style={st("display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;border:1.5px solid " + (on ? o.color : "#e2e9e5") + ";background:" + (on ? o.color + "14" : "#fff") + ";font-family:inherit;font-size:13px;cursor:pointer;text-align:left;")}>
                    <span style={st("width:10px;height:10px;border-radius:50%;background:" + o.color + ";flex-shrink:0;")}></span>
                    <span style={st("font-weight:" + (on ? "600" : "400") + ";color:#16241d;")}>{o.label}</span>
                    {on && <span style={st("margin-left:auto;font-size:12px;color:" + o.color + ";")}>●</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expert verdict */}
          <div>
            <div style={st("font-size:11px;font-weight:600;color:#7d8e86;margin-bottom:8px;")}>ผลสรุปเทียบ AI</div>
            <div style={st("display:flex;flex-direction:column;gap:6px;")}>
              {VERDICT_OPTIONS.map((o) => {
                const on = vForm.expertVerdict === o.value;
                return (
                  <button key={o.value} onClick={() => setVForm((f) => ({ ...f, expertVerdict: o.value }))}
                    style={st("display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;border:1.5px solid " + (on ? o.color : "#e2e9e5") + ";background:" + (on ? o.color + "14" : "#fff") + ";font-family:inherit;font-size:13px;cursor:pointer;text-align:left;")}>
                    <span style={st("font-weight:" + (on ? "600" : "400") + ";color:#16241d;")}>{o.label}</span>
                    {on && <span style={st("margin-left:auto;font-size:12px;color:" + o.color + ";")}>●</span>}
                  </button>
                );
              })}
            </div>

            <div style={st("margin-top:14px;")}>
              <label style={st("display:flex;align-items:center;gap:9px;cursor:pointer;padding:10px 12px;border-radius:8px;border:1.5px solid " + (vForm.officerOverride ? "#e0a92e" : "#e2e9e5") + ";background:" + (vForm.officerOverride ? "#fdf4e3" : "#fff") + ";")}>
                <input type="checkbox" checked={vForm.officerOverride} onChange={(e) => setVForm((f) => ({ ...f, officerOverride: e.target.checked }))}
                  style={st("width:16px;height:16px;accent-color:#e0a92e;cursor:pointer;")} />
                <span style={st("font-size:13px;color:#16241d;font-family:inherit;")}>เจ้าหน้าที่แก้ไขผล (Officer Override)</span>
              </label>
            </div>
          </div>
        </div>

        <div style={st("display:flex;align-items:center;gap:10px;padding-top:16px;border-top:1px solid #eef2f0;")}>
          <div style={st("flex:1;font-size:12px;color:#9aa8a1;")}>
            AI ให้: <strong style={st("color:#16241d;")}>{rc.riskTh}</strong>
            {vForm.expertRiskLevel && vForm.expertRiskLevel !== ai.riskLevel && (
              <span style={st("color:#c0392b;")}> → ผู้เชี่ยวชาญให้: <strong>{RISK_OPTIONS.find((o) => o.value === vForm.expertRiskLevel)?.label}</strong></span>
            )}
          </div>
          <button onClick={handleSaveVerdict}
            disabled={!vForm.expertRiskLevel || !vForm.expertVerdict}
            className={(!vForm.expertRiskLevel || !vForm.expertVerdict) ? "" : "h-dark"}
            style={st("background:" + (!vForm.expertRiskLevel || !vForm.expertVerdict ? "#c8d8cc" : "#157347") + ";color:#fff;border:none;border-radius:9px;padding:10px 22px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:" + (!vForm.expertRiskLevel || !vForm.expertVerdict ? "not-allowed" : "pointer") + ";")}>
            บันทึกผลผู้เชี่ยวชาญ
          </button>
        </div>
      </div>
    </div>
  );
}
