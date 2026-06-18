import { useState, useEffect } from "react";
import { st } from "../lib/st.js";

const COST_MAP = [
  { key: "opus-4",   input: 15,  output: 75  },
  { key: "opus",     input: 15,  output: 75  },
  { key: "sonnet-4", input: 3,   output: 15  },
  { key: "sonnet",   input: 3,   output: 15  },
  { key: "haiku",    input: 0.8, output: 4   },
];
function costUsd(model = "", pIn, pOut) {
  const r = COST_MAP.find((c) => (model || "").toLowerCase().includes(c.key)) || { input: 10, output: 30 };
  return ((pIn || 0) * r.input + (pOut || 0) * r.output) / 1_000_000;
}
const pct = (n, d) => (d ? Math.round((n / d) * 100) : null);
const fmt = (n, dec = 1) => (n == null ? "—" : Number(n).toFixed(dec));
const shortModel = (m) => (m || "unknown").replace("anthropic/", "").replace("openai/", "");

const VERDICT_COLOR = { confirmed: "#157347", partial: "#e0a92e", overturned: "#c0392b" };
const VERDICT_TH    = { confirmed: "ยืนยัน",  partial: "บางส่วน", overturned: "พลิกผล" };
const BUCKET_COLOR  = { "80-100": "#d64545", "60-79": "#e0a92e", "40-59": "#6b39b8", "0-39": "#2f9e6a" };

function EmptyState({ icon, text }) {
  return (
    <div style={st("padding:32px;text-align:center;color:#9aa8a1;")}>
      <div style={st("font-size:28px;margin-bottom:8px;")}>{icon}</div>
      <div style={st("font-size:13px;")}>{text}</div>
    </div>
  );
}

function Card({ title, sub, children }) {
  return (
    <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;overflow:hidden;margin-bottom:16px;")}>
      <div style={st("padding:16px 20px;border-bottom:1px solid #eef2f0;")}>
        <span style={st("font-size:14px;font-weight:600;color:#16241d;")}>{title}</span>
        {sub && <span style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;margin-left:10px;")}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

// ── 1. Model Overview ──────────────────────────────────────────────────────
function OverviewTable({ summary }) {
  if (!summary.length) return <EmptyState icon="🤖" text="ยังไม่มีเคสที่วิเคราะห์ด้วย AI" />;
  const cols = "2fr 60px 80px 80px 80px 80px 90px 90px";
  const hdr = "font-size:11px;font-weight:600;color:#7d8e86;letter-spacing:.3px;";
  return (
    <div style={st("overflow-x:auto;")}>
      <div style={st("min-width:680px;")}>
        <div style={st("display:grid;grid-template-columns:" + cols + ";gap:10px;padding:11px 20px;background:#f7faf8;border-bottom:1px solid #eef2f0;")}>
          {["MODEL","เคส","ผล","แม่นยำ%","Override%","Latency","Tokens","~Cost"].map((h) => (
            <span key={h} style={st(hdr + (h === "MODEL" ? "" : "text-align:right;"))}>{h}</span>
          ))}
        </div>
        {summary.map((r) => {
          const accuracy = pct(r.risk_match, r.with_verdict);
          const overrideRate = pct(r.overrides, r.total);
          const avgCost = costUsd(r.model, r.avg_prompt_tokens, r.avg_completion_tokens);
          const totalTok = (r.avg_prompt_tokens || 0) + (r.avg_completion_tokens || 0);
          return (
            <div key={r.model} style={st("display:grid;grid-template-columns:" + cols + ";gap:10px;align-items:center;padding:13px 20px;border-bottom:1px solid #f3f6f4;")}>
              <div>
                <div style={st("font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:#16241d;")}>{shortModel(r.model)}</div>
                <div style={st("font-size:10.5px;color:#9aa8a1;margin-top:2px;")}>{r.with_verdict}/{r.total} มีผลผู้เชี่ยวชาญ</div>
              </div>
              <span style={st("text-align:right;font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:#16241d;")}>{r.total}</span>
              <div style={st("text-align:right;")}>
                {r.with_verdict > 0 ? (
                  <div style={st("display:flex;flex-direction:column;gap:2px;align-items:flex-end;")}>
                    {r.confirmed > 0 && <span style={st("font-size:10.5px;color:#157347;font-weight:600;")}>✓ {r.confirmed}</span>}
                    {r.partial > 0   && <span style={st("font-size:10.5px;color:#e0a92e;font-weight:600;")}>~ {r.partial}</span>}
                    {r.overturned > 0 && <span style={st("font-size:10.5px;color:#c0392b;font-weight:600;")}>✕ {r.overturned}</span>}
                  </div>
                ) : <span style={st("font-size:11px;color:#c8d8cc;")}>—</span>}
              </div>
              <span style={st("text-align:right;font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:" + (accuracy == null ? "#c8d8cc" : accuracy >= 70 ? "#157347" : accuracy >= 50 ? "#e0a92e" : "#c0392b") + ";")}>{accuracy != null ? accuracy + "%" : "—"}</span>
              <span style={st("text-align:right;font-family:'IBM Plex Mono',monospace;font-size:13px;color:" + (overrideRate > 30 ? "#c0392b" : "#5a6b63") + ";")}>{overrideRate != null ? overrideRate + "%" : "—"}</span>
              <span style={st("text-align:right;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#5a6b63;")}>{r.avg_latency_ms ? (r.avg_latency_ms / 1000).toFixed(1) + "s" : "—"}</span>
              <span style={st("text-align:right;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#5a6b63;")}>{totalTok ? totalTok.toLocaleString() : "—"}</span>
              <span style={st("text-align:right;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#6b39b8;font-weight:600;")}>{avgCost > 0 ? (avgCost < 0.001 ? "<$0.001" : "$" + avgCost.toFixed(4)) : "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 2. Accuracy — verdict breakdown bars ───────────────────────────────────
function AccuracySection({ summary }) {
  const withVerdict = summary.filter((r) => r.with_verdict > 0);
  if (!withVerdict.length) return <EmptyState icon="📋" text="ยังไม่มีผลตรวจสอบของผู้เชี่ยวชาญ — บันทึกผลในหน้า ผลวิเคราะห์ AI" />;
  return (
    <div style={st("padding:18px 20px;display:flex;flex-direction:column;gap:18px;")}>
      {withVerdict.map((r) => {
        const total = r.with_verdict;
        const bars = [
          { key: "confirmed",  n: r.confirmed,  label: VERDICT_TH.confirmed  },
          { key: "partial",    n: r.partial,     label: VERDICT_TH.partial    },
          { key: "overturned", n: r.overturned,  label: VERDICT_TH.overturned },
        ];
        const accuracy = pct(r.risk_match, total);
        return (
          <div key={r.model}>
            <div style={st("display:flex;align-items:center;gap:10px;margin-bottom:8px;")}>
              <span style={st("font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:#16241d;")}>{shortModel(r.model)}</span>
              {accuracy != null && (
                <span style={st("font-size:11px;padding:1px 8px;border-radius:9px;background:" + (accuracy >= 70 ? "#eaf5ee" : accuracy >= 50 ? "#fdf4e3" : "#fdecea") + ";color:" + (accuracy >= 70 ? "#157347" : accuracy >= 50 ? "#a9760e" : "#c0392b") + ";font-weight:600;")}>
                  Risk accuracy {accuracy}%
                </span>
              )}
              <span style={st("margin-left:auto;font-size:11px;color:#9aa8a1;")}>{total} เคส</span>
            </div>
            <div style={st("display:flex;border-radius:7px;overflow:hidden;height:26px;gap:2px;")}>
              {bars.map(({ key, n, label }) => n > 0 && (
                <div key={key} style={st("background:" + VERDICT_COLOR[key] + ";flex:" + n + ";display:flex;align-items:center;justify-content:center;min-width:28px;")}
                  title={label + ": " + n + " เคส"}>
                  <span style={st("font-size:11px;font-weight:600;color:#fff;")}>{n > 0 && pct(n, total) >= 15 ? pct(n, total) + "%" : ""}</span>
                </div>
              ))}
            </div>
            <div style={st("display:flex;gap:14px;margin-top:6px;")}>
              {bars.map(({ key, n, label }) => (
                <span key={key} style={st("display:flex;align-items:center;gap:4px;font-size:11px;color:#7d8e86;")}>
                  <span style={st("width:8px;height:8px;border-radius:2px;background:" + VERDICT_COLOR[key] + ";flex-shrink:0;")}></span>
                  {label} {n}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 3. Calibration — score bucket vs confirm rate ─────────────────────────
function CalibrationSection({ calibration, summary }) {
  const buckets = ["80-100", "60-79", "40-59", "0-39"];
  const models = [...new Set(calibration.map((r) => r.model))];
  if (!models.length) return <EmptyState icon="📊" text="ยังไม่มีข้อมูล score จาก AI" />;
  return (
    <div style={st("padding:18px 20px;")}>
      <div style={st("font-size:11px;color:#7d8e86;margin-bottom:14px;")}>สัดส่วนเคสที่ผู้เชี่ยวชาญเห็นด้วย (confirmed+partial) ในแต่ละช่วงคะแนน</div>
      {models.map((model) => {
        const rows = calibration.filter((r) => r.model === model);
        if (!rows.length) return null;
        return (
          <div key={model} style={st("margin-bottom:20px;")}>
            <div style={st("font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:#16241d;margin-bottom:10px;")}>{shortModel(model)}</div>
            <div style={st("display:grid;grid-template-columns:repeat(4,1fr);gap:10px;")}>
              {buckets.map((bucket) => {
                const row = rows.find((r) => r.bucket === bucket);
                const total = row?.total || 0;
                const agreed = row?.agreed || 0;
                const agreePct = pct(agreed, total);
                return (
                  <div key={bucket} style={st("background:#f7faf8;border:1px solid #e2e9e5;border-radius:10px;padding:12px;text-align:center;")}>
                    <div style={st("font-size:11px;font-weight:700;color:" + BUCKET_COLOR[bucket] + ";margin-bottom:6px;")}>{bucket}</div>
                    <div style={st("font-size:22px;font-weight:700;color:#16241d;font-family:'IBM Plex Mono',monospace;line-height:1;")}>{total}</div>
                    <div style={st("font-size:10px;color:#9aa8a1;margin-bottom:8px;")}>เคส</div>
                    {total > 0 && (
                      <>
                        <div style={st("height:5px;background:#eef2f0;border-radius:3px;overflow:hidden;margin-bottom:4px;")}>
                          <div style={st("height:100%;width:" + (agreePct || 0) + "%;background:" + BUCKET_COLOR[bucket] + ";border-radius:3px;")}></div>
                        </div>
                        <div style={st("font-size:11px;font-weight:600;color:" + BUCKET_COLOR[bucket] + ";")}>{agreePct != null ? agreePct + "%" : "—"}</div>
                        <div style={st("font-size:10px;color:#9aa8a1;")}>expert agree</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 4. Quality — violation precision ──────────────────────────────────────
function QualitySection({ quality }) {
  const withData = quality.filter((r) => r.with_violation_data > 0);
  if (!withData.length) return <EmptyState icon="🔍" text="ยังไม่มีข้อมูล — กรอก 'จำนวน violations ที่ถูกต้องจริง' ในหน้าผลวิเคราะห์" />;
  return (
    <div style={st("padding:18px 20px;display:flex;flex-direction:column;gap:16px;")}>
      {quality.map((r) => {
        const aiV = r.avg_ai_violations;
        const exV = r.avg_expert_violations;
        const violPrecision = aiV > 0 && exV != null ? pct(exV, aiV) : null;
        const maxBar = Math.max(aiV || 0, exV || 0, 1);
        return (
          <div key={r.model}>
            <div style={st("display:flex;align-items:center;gap:10px;margin-bottom:10px;")}>
              <span style={st("font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:#16241d;")}>{shortModel(r.model)}</span>
              {violPrecision != null && (
                <span style={st("font-size:11px;padding:1px 8px;border-radius:9px;background:" + (violPrecision >= 70 ? "#eaf5ee" : violPrecision >= 50 ? "#fdf4e3" : "#fdecea") + ";color:" + (violPrecision >= 70 ? "#157347" : violPrecision >= 50 ? "#a9760e" : "#c0392b") + ";font-weight:600;")}>
                  Violation precision {violPrecision}%
                </span>
              )}
              <span style={st("margin-left:auto;font-size:11px;color:#9aa8a1;")}>{r.with_violation_data} เคสมี expert data</span>
            </div>
            <div style={st("display:grid;grid-template-columns:1fr 1fr;gap:12px;")}>
              {[
                { label: "AI ตรวจพบเฉลี่ย", val: aiV, color: "#d64545" },
                { label: "Expert ยืนยันเฉลี่ย", val: exV, color: "#157347" },
              ].map(({ label, val, color }) => (
                <div key={label} style={st("background:#f7faf8;border:1px solid #e2e9e5;border-radius:10px;padding:12px 14px;")}>
                  <div style={st("font-size:11px;color:#7d8e86;margin-bottom:6px;")}>{label}</div>
                  <div style={st("display:flex;align-items:flex-end;gap:10px;")}>
                    <span style={st("font-size:26px;font-weight:700;color:#16241d;font-family:'IBM Plex Mono',monospace;line-height:1;")}>{val != null ? fmt(val) : "—"}</span>
                    <span style={st("font-size:11px;color:#9aa8a1;margin-bottom:3px;")}>จุด/เคส</span>
                  </div>
                  <div style={st("height:5px;background:#eef2f0;border-radius:3px;margin-top:8px;overflow:hidden;")}>
                    <div style={st("height:100%;width:" + (val != null ? Math.round((val / maxBar) * 100) : 0) + "%;background:" + color + ";border-radius:3px;")}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 5. Operational — latency + cost ───────────────────────────────────────
function OperationalSection({ summary }) {
  if (!summary.length) return <EmptyState icon="⚙️" text="ยังไม่มีข้อมูลการใช้งาน" />;
  const maxLatency = Math.max(...summary.map((r) => r.avg_latency_ms || 0), 1);
  const maxCost    = Math.max(...summary.map((r) => costUsd(r.model, r.avg_prompt_tokens, r.avg_completion_tokens)), 0.0001);
  return (
    <div style={st("padding:18px 20px;display:flex;flex-direction:column;gap:14px;")}>
      {summary.map((r) => {
        const latMs = r.avg_latency_ms || 0;
        const cost  = costUsd(r.model, r.avg_prompt_tokens, r.avg_completion_tokens);
        return (
          <div key={r.model}>
            <div style={st("display:flex;align-items:center;gap:8px;margin-bottom:8px;")}>
              <span style={st("font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:#16241d;")}>{shortModel(r.model)}</span>
              <span style={st("font-size:11px;color:#9aa8a1;")}>{r.total} เคส</span>
            </div>
            <div style={st("display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;")}>
              {[
                { label: "⏱ เวลาเฉลี่ย", val: latMs ? (latMs / 1000).toFixed(1) + "s" : "—", bar: latMs / maxLatency, color: "#2563a8" },
                { label: "📊 Tokens เฉลี่ย", val: ((r.avg_prompt_tokens || 0) + (r.avg_completion_tokens || 0)).toLocaleString(), bar: null, color: "#6b39b8" },
                { label: "💰 ราคาเฉลี่ย/เคส", val: cost > 0 ? (cost < 0.001 ? "<$0.001" : "$" + cost.toFixed(4)) : "—", bar: cost / maxCost, color: "#e0a92e" },
              ].map(({ label, val, bar, color }) => (
                <div key={label} style={st("background:#f7faf8;border:1px solid #e2e9e5;border-radius:10px;padding:11px 13px;")}>
                  <div style={st("font-size:10.5px;color:#7d8e86;margin-bottom:5px;")}>{label}</div>
                  <div style={st("font-family:'IBM Plex Mono',monospace;font-size:16px;font-weight:700;color:#16241d;")}>{val}</div>
                  {bar != null && (
                    <div style={st("height:4px;background:#eef2f0;border-radius:3px;margin-top:8px;overflow:hidden;")}>
                      <div style={st("height:100%;width:" + Math.round(bar * 100) + "%;background:" + color + ";border-radius:3px;")}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 6. Consistency — same input, different models ─────────────────────────
function ConsistencySection({ consistency }) {
  if (!consistency.length) return <EmptyState icon="🔄" text="ยังไม่มีเคสที่ส่ง input เดิมซ้ำหลาย model — ลองวิเคราะห์โฆษณาเดิมด้วย model ต่างกัน" />;
  const RISK_COLOR = { high: "#d64545", medium: "#e0a92e", low: "#2f9e6a", clear: "#6b7d75" };
  return (
    <div style={st("overflow-x:auto;")}>
      <div style={st("min-width:560px;")}>
        <div style={st("display:grid;grid-template-columns:120px 1fr 1fr 80px;gap:10px;padding:11px 20px;background:#f7faf8;border-bottom:1px solid #eef2f0;font-size:11px;font-weight:600;color:#7d8e86;letter-spacing:.3px;")}>
          <span>INPUT HASH</span><span>MODELS</span><span>RISK LEVELS</span><span style={st("text-align:center;")}>RUNS</span>
        </div>
        {consistency.map((r) => {
          const allSame = new Set(r.risk_levels).size === 1;
          return (
            <div key={r.input_hash} style={st("display:grid;grid-template-columns:120px 1fr 1fr 80px;gap:10px;align-items:start;padding:12px 20px;border-bottom:1px solid #f3f6f4;")}>
              <span style={st("font-family:'IBM Plex Mono',monospace;font-size:11px;color:#7d8e86;")}>{r.input_hash}</span>
              <div style={st("display:flex;flex-direction:column;gap:3px;")}>
                {(r.models || []).map((m) => (
                  <span key={m} style={st("font-size:11.5px;color:#16241d;font-family:'IBM Plex Mono',monospace;")}>{shortModel(m)}</span>
                ))}
              </div>
              <div style={st("display:flex;flex-wrap:wrap;gap:4px;align-items:center;")}>
                {(r.risk_levels || []).map((lv, i) => (
                  <span key={i} style={st("font-size:11px;padding:2px 8px;border-radius:6px;font-weight:600;background:" + (RISK_COLOR[lv] || "#eef2f0") + "22;color:" + (RISK_COLOR[lv] || "#7d8e86") + ";border:1px solid " + (RISK_COLOR[lv] || "#dde5e0") + "44;")}>{lv}</span>
                ))}
                <span style={st("font-size:11px;margin-left:4px;" + (allSame ? "color:#157347;font-weight:600;" : "color:#c0392b;font-weight:600;"))}>{allSame ? "✓ สอดคล้อง" : "⚠ ต่างกัน"}</span>
              </div>
              <span style={st("text-align:center;font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:600;color:#16241d;")}>{r.runs}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshed, setRefreshed] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/analytics");
      if (!r.ok) throw new Error("HTTP " + r.status);
      setData(await r.json());
      setRefreshed(new Date());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={st("max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;")}>
      {/* Header */}
      <div style={st("display:flex;align-items:center;gap:12px;margin-bottom:18px;")}>
        <div style={st("flex:1;")}>
          <div style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;")}>
            {refreshed ? "อัปเดต " + refreshed.toLocaleTimeString("th-TH") : ""}
          </div>
        </div>
        <button onClick={load} disabled={loading}
          style={st("display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:9px 14px;font-family:inherit;font-size:12.5px;font-weight:600;color:#39473f;cursor:" + (loading ? "wait" : "pointer") + ";")}>
          {loading ? "⟳ กำลังโหลด…" : "⟳ รีเฟรช"}
        </button>
      </div>

      {error && (
        <div style={st("background:#fdecea;border:1px solid #f5c6bf;color:#c0392b;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;")}>
          ⚠ {error}
        </div>
      )}

      {loading && !data && (
        <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:60px;text-align:center;color:#7d8e86;font-size:14px;")}>
          กำลังโหลดข้อมูล…
        </div>
      )}

      {data && (
        <>
          {/* ── Overview ── */}
          <Card title="ภาพรวมตาม AI Model" sub="Model Overview">
            <OverviewTable summary={data.summary} />
          </Card>

          {/* ── Accuracy + Operational side by side on desktop ── */}
          <div style={st("display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;")}>
            <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;overflow:hidden;")}>
              <div style={st("padding:16px 20px;border-bottom:1px solid #eef2f0;")}>
                <span style={st("font-size:14px;font-weight:600;color:#16241d;")}>Accuracy</span>
                <span style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;margin-left:10px;")}>ความแม่นยำในการตัดสิน</span>
              </div>
              <AccuracySection summary={data.summary} />
            </div>
            <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;overflow:hidden;")}>
              <div style={st("padding:16px 20px;border-bottom:1px solid #eef2f0;")}>
                <span style={st("font-size:14px;font-weight:600;color:#16241d;")}>Operational</span>
                <span style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;margin-left:10px;")}>ประสิทธิภาพการใช้งาน</span>
              </div>
              <OperationalSection summary={data.summary} />
            </div>
          </div>

          {/* ── Calibration ── */}
          <Card title="Calibration" sub="Score bucket vs Expert agreement rate">
            <CalibrationSection calibration={data.calibration} summary={data.summary} />
          </Card>

          {/* ── Quality ── */}
          <Card title="Quality — Violation Detection" sub="AI violations vs Expert-confirmed violations">
            <QualitySection quality={data.quality} />
          </Card>

          {/* ── Consistency ── */}
          <Card title="Consistency — Same Input, Different Models" sub="input_hash grouping">
            <ConsistencySection consistency={data.consistency} />
          </Card>
        </>
      )}
    </div>
  );
}
