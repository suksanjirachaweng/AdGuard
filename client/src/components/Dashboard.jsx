import { useState, useEffect } from "react";
import { st } from "../lib/st.js";
import { riskBadge, statusBadge } from "../lib/badges.js";
import { useApp } from "../store.jsx";

const DAY_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const CHANNEL_COLORS = ["#d64545", "#e0a92e", "#6b39b8", "#2563a8", "#2f9e6a", "#7d8e86"];

function buildWeeklyChart(rows) {
  // Build last-7-days skeleton keyed by ISO date string
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, day: DAY_TH[d.getDay()], high: 0, mid: 0, safe: 0 });
  }
  rows.forEach(({ day, risk, count }) => {
    const slot = days.find((d) => d.key === day);
    if (!slot) return;
    if (risk === "high") slot.high += count;
    else if (risk === "medium") slot.mid += count;
    else slot.safe += count;
  });
  // Scale to pixels (max bar = 150px total)
  const maxTotal = Math.max(...days.map((d) => d.high + d.mid + d.safe), 1);
  return days.map((d) => ({
    ...d,
    highPx: Math.round((d.high / maxTotal) * 150),
    midPx: Math.round((d.mid / maxTotal) * 150),
    safePx: Math.round((d.safe / maxTotal) * 150),
  }));
}

export default function Dashboard() {
  const { state, go, openCase } = useApp();
  const [chart, setChart] = useState([]);
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    fetch("/api/cases/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setChart(buildWeeklyChart(d.weekly || []));
        const rows = d.channels || [];
        const max = rows[0]?.count || 1;
        setChannels(rows.map((r, i) => ({
          name: r.channel || "—",
          count: String(r.count),
          pct: Math.round((r.count / max) * 100),
          color: CHANNEL_COLORS[i] || "#9aa8a1",
        })));
      })
      .catch(() => {});
  }, []);
  const recent = state.cases.slice(0, 5);
  const c = state.caseCounts;
  const highRisk = state.cases.filter((x) => x.risk === "high").length;
  const stats = [
    { label: "เคสทั้งหมด · Total", value: c.all, sub: "ในระบบ · in system", accent: "#2f9e6a" },
    { label: "รอตรวจสอบ · Pending", value: c.pending, sub: "ต้องดำเนินการ", accent: "#e0a92e" },
    { label: "เสี่ยงสูง · High risk", value: highRisk, sub: "พบความผิดชัดเจน", accent: "#d64545" },
    { label: "ส่งต่อแล้ว · Referred", value: c.referred, sub: "ไปยังหน่วยงาน", accent: "#6b39b8" },
  ];
  return (
    <div style={st("max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;")}>
      <div className="stat-grid" style={st("display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px;")}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:18px;position:relative;overflow:hidden;")}>
            <div className="stat-label" style={st("font-size:12px;color:#7d8e86;font-weight:500;margin-bottom:10px;")}>{s.label}</div>
            <div className="stat-numrow" style={st("display:flex;align-items:flex-end;gap:8px;")}>
              <div className="stat-value" style={st("font-size:32px;font-weight:700;color:#16241d;line-height:1;font-family:'IBM Plex Mono',monospace;")}>{s.value ?? "—"}</div>
            </div>
            <div className="stat-sub" style={st("font-size:11px;color:#9aa8a1;margin-top:6px;")}>{s.sub}</div>
            <div style={st("position:absolute;left:0;top:0;bottom:0;width:4px;background:" + s.accent + ";")}></div>
          </div>
        ))}
      </div>

      <div style={st("display:grid;grid-template-columns:1.6fr 1fr;gap:16px;margin-bottom:18px;")}>
        <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:20px;")}>
          <div style={st("display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;")}>
            <div>
              <div style={st("font-size:14px;font-weight:600;color:#16241d;")}>ปริมาณการตรวจสอบรายสัปดาห์</div>
              <div style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;")}>Weekly detection volume</div>
            </div>
            <div style={st("display:flex;gap:14px;font-size:11px;color:#7d8e86;")}>
              <span style={st("display:flex;align-items:center;gap:5px;")}><span style={st("width:9px;height:9px;border-radius:2px;background:#d64545;")}></span>เสี่ยงสูง</span>
              <span style={st("display:flex;align-items:center;gap:5px;")}><span style={st("width:9px;height:9px;border-radius:2px;background:#e0a92e;")}></span>ปานกลาง</span>
              <span style={st("display:flex;align-items:center;gap:5px;")}><span style={st("width:9px;height:9px;border-radius:2px;background:#2f9e6a;")}></span>ปลอดภัย</span>
            </div>
          </div>
          <div style={st("display:flex;align-items:flex-end;gap:14px;height:170px;padding-top:10px;")}>
            {(chart.length ? chart : Array(7).fill({ day: "…", highPx: 0, midPx: 0, safePx: 0 })).map((d, i) => (
              <div key={i} style={st("flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;justify-content:flex-end;")}>
                <div style={st("width:100%;max-width:34px;display:flex;flex-direction:column;border-radius:5px;overflow:hidden;")}>
                  <div style={st("height:" + (d.highPx || 0) + "px;background:#d64545;")}></div>
                  <div style={st("height:" + (d.midPx || 0) + "px;background:#e0a92e;")}></div>
                  <div style={st("height:" + (d.safePx || 0) + "px;background:#2f9e6a;")}></div>
                </div>
                <div style={st("font-size:10.5px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;")}>{d.day}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:20px;")}>
          <div style={st("font-size:14px;font-weight:600;color:#16241d;margin-bottom:2px;")}>ช่องทางที่พบบ่อย</div>
          <div style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;margin-bottom:16px;")}>Top flagged channels</div>
          <div style={st("display:flex;flex-direction:column;gap:14px;")}>
            {(channels.length ? channels : [{ name: "กำลังโหลด…", count: "—", pct: 0, color: "#eef2f0" }]).map((c, i) => (
              <div key={i}>
                <div style={st("display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;")}>
                  <span style={st("color:#39473f;font-weight:500;")}>{c.name}</span>
                  <span style={st("color:#7d8e86;font-family:'IBM Plex Mono',monospace;")}>{c.count}</span>
                </div>
                <div style={st("height:7px;background:#eef2f0;border-radius:4px;overflow:hidden;")}>
                  <div style={st("width:" + c.pct + "%;height:100%;background:" + c.color + ";border-radius:4px;animation:barGrow .8s ease;")}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hscroll" style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;overflow:hidden;")}>
        <div style={st("display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #eef2f0;")}>
          <div style={st("font-size:14px;font-weight:600;color:#16241d;")}>เคสล่าสุด · Recent cases</div>
          <button className="h-soft" onClick={() => go("cases")} style={st("background:none;border:1px solid #d8e2dc;border-radius:8px;padding:7px 13px;font-family:inherit;font-size:12px;color:#157347;font-weight:600;cursor:pointer;")}>ดูทั้งหมด →</button>
        </div>
        {recent.map((c) => (
          <div key={c.id} className="h-soft2 wide-row" onClick={() => openCase(c.id)} style={st("display:grid;grid-template-columns:90px 1fr 130px 110px 90px;gap:14px;align-items:center;padding:13px 20px;border-bottom:1px solid #f3f6f4;cursor:pointer;")}>
            <span style={st("font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#7d8e86;")}>{c.id}</span>
            <div style={st("min-width:0;")}>
              <div style={st("font-size:13.5px;font-weight:500;color:#16241d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{c.title}</div>
              <div style={st("font-size:11px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{c.source}</div>
            </div>
            <span style={st(riskBadge(c.risk))}>{c.riskTh}</span>
            <span style={st("font-size:12px;color:#7d8e86;")}>{c.date}</span>
            <span style={st(statusBadge(c.status))}>{c.statusTh}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
