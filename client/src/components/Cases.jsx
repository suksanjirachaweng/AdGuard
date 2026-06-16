import { st } from "../lib/st.js";
import { riskBadge, statusBadge } from "../lib/badges.js";
import { useApp } from "../store.jsx";

const typeDotColor = { link: "#2563a8", file: "#6b39b8", image: "#2f9e6a" };
const COLS = "104px 1fr 110px 90px 110px 70px 110px";

export default function Cases() {
  const { state, setFilter, openCase } = useApp();
  const cc = state.caseCounts || {};
  const filterDefs = [
    { key: "all", label: "ทั้งหมด", count: cc.all || 0 }, { key: "pending", label: "รอตรวจสอบ", count: cc.pending || 0 },
    { key: "review", label: "กำลังตรวจ", count: cc.review || 0 }, { key: "referred", label: "ส่งต่อแล้ว", count: cc.referred || 0 },
    { key: "cleared", label: "ปิดเคส", count: cc.cleared || 0 },
  ];
  const filtered = state.caseFilter === "all" ? state.cases : state.cases.filter((c) => c.status === state.caseFilter);
  const pageBtn = "width:32px;height:32px;border:1px solid #d8e2dc;background:#fff;border-radius:7px;color:#39473f;cursor:pointer;";

  return (
    <div style={st("max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;")}>
      <div style={st("display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap;")}>
        {filterDefs.map((f) => {
          const on = state.caseFilter === f.key;
          const btn = "display:flex;align-items:center;gap:8px;border:1px solid " + (on ? "#157347" : "#d8e2dc") + ";background:" + (on ? "#157347" : "#fff") + ";color:" + (on ? "#fff" : "#39473f") + ";border-radius:9px;padding:8px 14px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;";
          const cs = "font-family:'IBM Plex Mono',monospace;font-size:11px;padding:1px 7px;border-radius:9px;background:" + (on ? "rgba(255,255,255,.22)" : "#eef2f0") + ";color:" + (on ? "#fff" : "#7d8e86") + ";";
          return <button key={f.key} onClick={() => setFilter(f.key)} style={st(btn)}>{f.label} <span style={st(cs)}>{f.count}</span></button>;
        })}
        <div style={st("flex:1;")}></div>
        <button className="h-soft" style={st("display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:9px 14px;font-family:inherit;font-size:12.5px;font-weight:600;color:#39473f;cursor:pointer;")}>⤓ Export CSV</button>
      </div>

      <div className="hscroll" style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;overflow:hidden;")}>
        <div className="wide-row" style={st("display:grid;grid-template-columns:" + COLS + ";gap:12px;padding:13px 20px;background:#f7faf8;border-bottom:1px solid #eef2f0;font-size:11px;font-weight:600;color:#7d8e86;letter-spacing:.3px;")}>
          <span>CASE ID</span><span>รายการโฆษณา</span><span>ช่องทาง</span><span>ระดับเสี่ยง</span><span>หน่วยงาน</span><span style={st("text-align:center;")}>ผิด</span><span>สถานะ</span>
        </div>
        {filtered.map((c) => {
          const vcolor = c.violations >= 3 ? "#c0392b" : c.violations >= 1 ? "#a9760e" : "#9aa8a1";
          return (
            <div key={c.id} className="h-soft2 wide-row" onClick={() => openCase(c.id)} style={st("display:grid;grid-template-columns:" + COLS + ";gap:12px;align-items:center;padding:14px 20px;border-bottom:1px solid #f3f6f4;cursor:pointer;")}>
              <span style={st("font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#7d8e86;")}>{c.id}</span>
              <div style={st("min-width:0;")}>
                <div style={st("font-size:13px;font-weight:500;color:#16241d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{c.title}</div>
                <div style={st("font-size:10.5px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{c.source}</div>
              </div>
              <span style={st("font-size:12px;color:#5a6b63;display:flex;align-items:center;gap:6px;")}><span style={st("width:7px;height:7px;border-radius:50%;background:" + (typeDotColor[c.type] || "#9aa8a1") + ";display:inline-block;")}></span>{c.channel}</span>
              <span style={st(riskBadge(c.risk))}>{c.riskTh}</span>
              <span style={st("font-size:12px;color:#5a6b63;")}>{c.agency}</span>
              <span style={st("text-align:center;font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:" + vcolor + ";")}>{c.violations}</span>
              <span style={st(statusBadge(c.status))}>{c.statusTh}</span>
            </div>
          );
        })}
        <div style={st("padding:14px 20px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#7d8e86;")}>
          <span>แสดง {filtered.length} จาก {cc.all || filtered.length} เคส</span>
          <div style={st("display:flex;gap:6px;")}>
            <button style={st("width:32px;height:32px;border:1px solid #d8e2dc;background:#fff;border-radius:7px;color:#9aa8a1;cursor:pointer;")}>‹</button>
            <button style={st("width:32px;height:32px;border:1px solid #157347;background:#157347;border-radius:7px;color:#fff;cursor:pointer;font-weight:600;")}>1</button>
            <button style={st(pageBtn)}>2</button>
            <button style={st(pageBtn)}>3</button>
            <button style={st(pageBtn)}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
