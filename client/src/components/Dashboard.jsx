import { st } from "../lib/st.js";
import { riskBadge, statusBadge } from "../lib/badges.js";
import { useApp } from "../store.jsx";

const stats = [
  { label: "เคสทั้งหมด · Total", value: "1,284", delta: "+18%", sub: "เดือนนี้ · this month", accent: "#2f9e6a" },
  { label: "รอตรวจสอบ · Pending", value: "47", delta: "+12", sub: "ต้องดำเนินการ", accent: "#e0a92e" },
  { label: "เสี่ยงสูง · High risk", value: "31", delta: "+6", sub: "พบความผิดชัดเจน", accent: "#d64545" },
  { label: "ส่งต่อแล้ว · Referred", value: "208", delta: "+9%", sub: "ไปยังหน่วยงาน", accent: "#6b39b8" },
];
const chart = [
  { day: "จ.", high: 34, mid: 30, safe: 46 }, { day: "อ.", high: 28, mid: 38, safe: 52 },
  { day: "พ.", high: 44, mid: 34, safe: 40 }, { day: "พฤ.", high: 52, mid: 28, safe: 48 },
  { day: "ศ.", high: 38, mid: 42, safe: 56 }, { day: "ส.", high: 22, mid: 24, safe: 38 },
  { day: "อา.", high: 18, mid: 20, safe: 30 },
];
const categories = [
  { name: "อาหารเสริม / ลดน้ำหนัก", count: "412", pct: 100, color: "#d64545" },
  { name: "เครื่องสำอาง / สกินแคร์", count: "318", pct: 77, color: "#e0a92e" },
  { name: "การเงิน / ลงทุน", count: "201", pct: 49, color: "#6b39b8" },
  { name: "โทรคมนาคม", count: "147", pct: 36, color: "#2563a8" },
  { name: "เครื่องมือแพทย์", count: "94", pct: 23, color: "#2f9e6a" },
];

export default function Dashboard() {
  const { state, go, openCase } = useApp();
  const recent = state.cases.slice(0, 5);
  return (
    <div style={st("max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;")}>
      <div style={st("display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px;")}>
        {stats.map((s, i) => (
          <div key={i} style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:18px;position:relative;overflow:hidden;")}>
            <div style={st("font-size:12px;color:#7d8e86;font-weight:500;margin-bottom:10px;")}>{s.label}</div>
            <div style={st("display:flex;align-items:flex-end;gap:8px;")}>
              <div style={st("font-size:32px;font-weight:700;color:#16241d;line-height:1;font-family:'IBM Plex Mono',monospace;")}>{s.value}</div>
              <div style={st("font-size:12px;font-weight:600;font-family:'IBM Plex Mono',monospace;color:" + s.accent)}>{s.delta}</div>
            </div>
            <div style={st("font-size:11px;color:#9aa8a1;margin-top:6px;")}>{s.sub}</div>
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
            {chart.map((d, i) => (
              <div key={i} style={st("flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;justify-content:flex-end;")}>
                <div style={st("width:100%;max-width:34px;display:flex;flex-direction:column;border-radius:5px;overflow:hidden;")}>
                  <div style={st("height:" + d.high + "px;background:#d64545;")}></div>
                  <div style={st("height:" + d.mid + "px;background:#e0a92e;")}></div>
                  <div style={st("height:" + d.safe + "px;background:#2f9e6a;")}></div>
                </div>
                <div style={st("font-size:10.5px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;")}>{d.day}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:20px;")}>
          <div style={st("font-size:14px;font-weight:600;color:#16241d;margin-bottom:2px;")}>หมวดสินค้าที่พบบ่อย</div>
          <div style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;margin-bottom:16px;")}>Top flagged categories</div>
          <div style={st("display:flex;flex-direction:column;gap:14px;")}>
            {categories.map((c, i) => (
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
