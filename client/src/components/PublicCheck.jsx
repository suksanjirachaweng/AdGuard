import { useState } from "react";
import { st, urlLabel } from "../lib/st.js";

const RISK_COLOR = { high: "#d64545", medium: "#e0a92e", low: "#2f9e6a", clear: "#6b7d75" };
const RISK_BG = { high: "#fdecea", medium: "#fff8e1", low: "#e9f4ee", clear: "#eef2f0" };

export default function PublicCheck() {
  const [mode, setMode] = useState("url"); // "url" | "name"
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true); setResult(null); setError("");
    try {
      const r = await fetch("/api/public/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "url" ? { url: value } : { productName: value }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "เกิดข้อผิดพลาด");
      setResult(d);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={st("min-height:100vh;background:#eef2f0;display:flex;flex-direction:column;align-items:center;padding:40px 16px")}>
      {/* Header */}
      <div style={st("text-align:center;margin-bottom:32px")}>
        <div style={st("font-size:48px;margin-bottom:8px")}>🛡️</div>
        <div style={st("font-size:24px;font-weight:700;color:#0f3026;margin-bottom:4px")}>
          ตรวจสอบโฆษณาผลิตภัณฑ์
        </div>
        <div style={st("font-size:14px;color:#6b7d75")}>
          บริการสำหรับผู้ประกอบการและผู้บริโภค · สำนักงานคณะกรรมการอาหารและยา
        </div>
      </div>

      {/* Check form */}
      <div style={st("background:#fff;border-radius:16px;padding:28px 32px;width:100%;max-width:560px;box-shadow:0 2px 12px rgba(0,0,0,.08)")}>
        {/* Mode toggle */}
        <div style={st("display:flex;gap:8px;margin-bottom:20px")}>
          {[{ key: "url", label: "🔗 URL โฆษณา" }, { key: "name", label: "🏷️ ชื่อผลิตภัณฑ์" }].map((m) => (
            <button key={m.key} onClick={() => { setMode(m.key); setValue(""); setResult(null); setError(""); }}
              style={st(`flex:1;padding:9px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid ${mode === m.key ? "#157347" : "#dde5e0"};background:${mode === m.key ? "#e9f4ee" : "#fff"};color:${mode === m.key ? "#157347" : "#6b7d75"}`)}>
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleCheck}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === "url" ? "https://www.example.com/product" : "เช่น สลิมเอ็กซ์ โปร ดีท็อกซ์"}
            style={st("width:100%;padding:12px 16px;border:1.5px solid #d1dbd5;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;margin-bottom:14px")}
          />
          <button type="submit" disabled={loading || !value.trim()}
            style={st(`width:100%;padding:13px;background:${loading || !value.trim() ? "#9aab9f" : "#157347"};color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:${loading || !value.trim() ? "default" : "pointer"}`)}>
            {loading ? "⏳ กำลังตรวจสอบ…" : "🔍 ตรวจสอบ"}
          </button>
        </form>

        {error && (
          <div style={st("margin-top:16px;padding:12px 16px;background:#fdecea;border-radius:8px;color:#c0392b;font-size:13px")}>
            ⚠ {error}
          </div>
        )}

        {/* Result */}
        {result && <CheckResult result={result} query={value} />}
      </div>

      {/* Info box */}
      <div style={st("margin-top:24px;max-width:560px;width:100%;padding:16px 20px;background:#fff;border-radius:12px;border-left:4px solid #157347")}>
        <div style={st("font-size:13px;font-weight:600;color:#0f3026;margin-bottom:6px")}>📱 แจ้งเบาะแสผ่าน LINE</div>
        <div style={st("font-size:12.5px;color:#6b7d75;line-height:1.7")}>
          พบโฆษณาต้องสงสัย? ส่ง URL มาให้เราตรวจสอบทาง LINE Official Account<br />
          เพียงส่งลิงก์โฆษณา — เจ้าหน้าที่จะรับเรื่องและดำเนินการให้
        </div>
      </div>

      <div style={st("margin-top:20px;font-size:11px;color:#9aab9f;text-align:center")}>
        ข้อมูลที่ส่งจะถูกใช้เพื่อการตรวจสอบโฆษณาเท่านั้น
      </div>
    </div>
  );
}

function CheckResult({ result, query }) {
  const { source, cases, alerts, riskLevel, riskTh, riskScore, verdictTitle, verdictSummary, violations, checkedAt } = result;

  if (source === "not_found") {
    return (
      <div style={st("margin-top:20px;padding:16px;background:#f5f7f5;border-radius:10px;text-align:center")}>
        <div style={st("font-size:32px;margin-bottom:8px")}>🔍</div>
        <div style={st("font-size:14px;font-weight:600;color:#0f3026")}>ไม่พบในฐานข้อมูล</div>
        <div style={st("font-size:12px;color:#6b7d75;margin-top:4px")}>
          ยังไม่มีประวัติการตรวจสอบสำหรับ "{query}"
        </div>
      </div>
    );
  }

  if (source === "ai_analysis") {
    const color = RISK_COLOR[riskLevel] || "#6b7d75";
    const bg = RISK_BG[riskLevel] || "#eef2f0";
    return (
      <div style={st("margin-top:20px")}>
        <div style={st("font-size:11px;color:#9aab9f;margin-bottom:12px;text-align:right")}>
          ผลจาก AI · {new Date(checkedAt).toLocaleString("th-TH")}
        </div>
        <div style={{ padding: "16px", background: bg, borderRadius: 10, border: `1.5px solid ${color}30` }}>
          <div style={st("display:flex;align-items:center;gap:10px;margin-bottom:8px")}>
            <span style={{ background: color, color: "#fff", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
              {riskTh || riskLevel}
            </span>
            <span style={{ fontSize: 22, fontWeight: 700, color }}>{riskScore}</span>
            <span style={st("font-size:11px;color:#9aab9f")}>/100</span>
          </div>
          <div style={st("font-size:14px;font-weight:700;color:#0f3026;margin-bottom:4px")}>{verdictTitle}</div>
          <div style={st("font-size:12.5px;color:#4a5f54;line-height:1.6")}>{verdictSummary}</div>
          {violations > 0 && (
            <div style={st("margin-top:10px;font-size:12px;color:#c0392b")}>
              ⚠ พบข้อกังวล {violations} ประเด็น
            </div>
          )}
        </div>
        <div style={st("margin-top:10px;font-size:11.5px;color:#9aab9f;text-align:center")}>
          ผลนี้เป็นเพียงการประเมินเบื้องต้น ไม่ใช่คำวินิจฉัยทางกฎหมาย
        </div>
      </div>
    );
  }

  // source === "database"
  return (
    <div style={st("margin-top:20px")}>
      {cases.length > 0 && (
        <div style={st("margin-bottom:16px")}>
          <div style={st("font-size:12px;font-weight:600;color:#6b7d75;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px")}>
            ประวัติการตรวจสอบ
          </div>
          {cases.map((c) => {
            const color = RISK_COLOR[c.risk] || "#6b7d75";
            const bg = RISK_BG[c.risk] || "#eef2f0";
            return (
              <div key={c.id} style={{ padding: "12px 14px", background: bg, borderRadius: 10, marginBottom: 8, border: `1px solid ${color}30` }}>
                <div style={st("display:flex;align-items:center;gap:8px;margin-bottom:4px")}>
                  <span style={{ background: color, color: "#fff", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                    {c.riskTh}
                  </span>
                  <span style={st("font-size:11px;color:#9aab9f")}>{c.id}</span>
                </div>
                <div style={st("font-size:13px;font-weight:600;color:#0f3026")}>{c.title}</div>
                {c.verdict && <div style={st("font-size:12px;color:#4a5f54;margin-top:2px")}>{c.verdict}</div>}
                <div style={{ fontSize: 11, color: color, marginTop: 4, fontWeight: 600 }}>สถานะ: {c.statusTh}</div>
              </div>
            );
          })}
        </div>
      )}

      {alerts.length > 0 && (
        <div>
          <div style={st("font-size:12px;font-weight:600;color:#6b7d75;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px")}>
            ประกาศเตือนภัย อย. ที่เกี่ยวข้อง
          </div>
          {alerts.map((a, i) => (
            <div key={i} style={st("padding:10px 14px;background:#fdecea;border-radius:8px;margin-bottom:6px;border:1px solid #f5c6bf")}>
              <div style={st("font-size:13px;font-weight:600;color:#c0392b")}>⚠ {a.title}</div>
              {a.publishedAt && <div style={st("font-size:11px;color:#9aab9f;margin-top:2px")}>📅 {a.publishedAt}</div>}
              <a href={a.url} target="_blank" rel="noopener noreferrer"
                style={st("font-size:11px;color:#c0392b;word-break:break-all")}
                title={a.url}>{urlLabel(a.url, 80)}</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
