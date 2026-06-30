import { useState } from "react";
import { st } from "../lib/st.js";
import { ctxTypes } from "../lib/data.js";
import { useApp } from "../store.jsx";

const BODY_PREVIEW_LEN = 220;

function DocModal({ item, onClose }) {
  const tp = ctxTypes[item.type] || ctxTypes.law;
  return (
    <div onClick={onClose} style={st("position:fixed;inset:0;background:rgba(10,30,22,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:70;padding:24px;")}>
      <div onClick={(e) => e.stopPropagation()} style={st("background:#fff;border-radius:16px;width:680px;max-width:100%;max-height:86vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:fadeUp .3s ease;")}>
        <div style={st("padding:20px 24px;border-bottom:1px solid #eef2f0;display:flex;align-items:flex-start;gap:12px;")}>
          <div style={st("width:38px;height:38px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;background:" + tp.bg + ";color:" + tp.color + ";")}>{tp.icon}</div>
          <div style={st("flex:1;min-width:0;")}>
            <div style={st("font-size:15.5px;font-weight:700;color:#16241d;line-height:1.35;")}>{item.title}</div>
            <div style={st("font-size:11px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;margin-top:4px;")}>{item.meta}</div>
          </div>
          <button onClick={onClose} style={st("background:none;border:none;font-size:22px;color:#9aa8a1;cursor:pointer;line-height:1;")}>×</button>
        </div>
        <div style={st("padding:20px 24px;overflow-y:auto;white-space:pre-wrap;font-size:13px;line-height:1.75;color:#39473f;")}>{item.body}</div>
      </div>
    </div>
  );
}

export default function ContextScreen() {
  const { state, openAddContext, toggleContext } = useApp();
  const items = state.contextItems;
  const [openDoc, setOpenDoc] = useState(null);
  const activeCount = items.filter((c) => c.active).length;
  const ctxStats = [
    { value: String(items.length), label: "รายการบริบททั้งหมด" },
    { value: String(activeCount), label: "กำลังใช้งาน · active" },
    { value: String(items.filter((c) => c.type === "banned").length), label: "ชุดคำต้องห้าม" },
    { value: String(items.filter((c) => c.type === "law" || c.type === "doc").length), label: "อ้างอิงกฎหมาย" },
  ];

  return (
    <div style={st("max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;")}>
      <div className="ctx-intro" style={st("background:linear-gradient(100deg,#0f3026,#16432f);border-radius:14px;padding:22px 24px;margin-bottom:18px;display:flex;align-items:center;gap:18px;color:#fff;")}>
        <div style={st("width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;")}>✦</div>
        <div style={st("flex:1;")}>
          <div style={st("font-size:16px;font-weight:700;margin-bottom:4px;")}>ฐานความรู้และบริบทสำหรับ AI</div>
          <div style={st("font-size:12.5px;color:#bcd6c8;line-height:1.6;")}>เพิ่มกฎหมาย ประกาศ กฎเกณฑ์ภายใน หรือรายการคำต้องห้าม เพื่อให้ AI ใช้เป็นบริบทประกอบการวิเคราะห์โฆษณาในอนาคต — ยิ่งมีบริบทมาก ผลวิเคราะห์ยิ่งแม่นยำและอ้างอิงได้</div>
        </div>
        <button className="h-green" onClick={openAddContext} style={st("display:flex;align-items:center;gap:8px;background:#2f9e6a;color:#fff;border:none;border-radius:10px;padding:12px 20px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.25);")}>＋ เพิ่มบริบท</button>
      </div>

      <div className="stat-grid" style={st("display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;")}>
        {ctxStats.map((cs, i) => (
          <div key={i} style={st("background:#fff;border:1px solid #e2e9e5;border-radius:11px;padding:14px 16px;")}>
            <div style={st("font-size:24px;font-weight:700;color:#16241d;font-family:'IBM Plex Mono',monospace;line-height:1;")}>{cs.value}</div>
            <div style={st("font-size:11.5px;color:#7d8e86;margin-top:5px;")}>{cs.label}</div>
          </div>
        ))}
      </div>

      <div style={st("display:grid;grid-template-columns:1fr 1fr;gap:14px;")}>
        {items.map((c) => {
          const tp = ctxTypes[c.type] || ctxTypes.law;
          const ic = "width:40px;height:40px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;background:" + tp.bg + ";color:" + tp.color + ";";
          const badge = "display:inline-flex;align-items:center;font-size:10.5px;font-weight:600;padding:2px 9px;border-radius:6px;background:" + tp.bg + ";color:" + tp.color + ";border:1px solid " + tp.bd + ";";
          const tog = "position:relative;width:40px;height:23px;border-radius:13px;border:none;cursor:pointer;flex-shrink:0;transition:background .2s;background:" + (c.active ? "#2f9e6a" : "#cdd8d2") + ";";
          const knob = "position:absolute;top:3px;left:" + (c.active ? "20px" : "3px") + ";width:17px;height:17px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 2px rgba(0,0,0,.2);";
          const stStyle = "font-size:11px;font-weight:600;color:" + (c.active ? "#2c7a4f" : "#9aa8a1") + ";";
          return (
            <div key={c.id} style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:18px;display:flex;flex-direction:column;gap:11px;")}>
              <div style={st("display:flex;align-items:flex-start;gap:12px;")}>
                <div style={st(ic)}>{tp.icon}</div>
                <div style={st("flex:1;min-width:0;")}>
                  <div style={st("display:flex;align-items:center;gap:8px;margin-bottom:3px;")}><span style={st(badge)}>{tp.label}</span></div>
                  <div style={st("font-size:14px;font-weight:600;color:#16241d;line-height:1.35;")}>{c.title}</div>
                </div>
                <button onClick={() => toggleContext(c.id)} style={st(tog)}><span style={st(knob)}></span></button>
              </div>
              <div style={st("font-size:12.5px;color:#5a6b63;line-height:1.6;")}>
                {(c.body || "").length > BODY_PREVIEW_LEN ? c.body.slice(0, BODY_PREVIEW_LEN) + "…" : c.body}
                {(c.body || "").length > BODY_PREVIEW_LEN && (
                  <button onClick={() => setOpenDoc(c)} style={st("display:inline-block;margin-left:6px;background:none;border:none;color:#157347;font-weight:600;font-size:12px;cursor:pointer;padding:0;font-family:inherit;")}>ดูเอกสารเต็ม →</button>
                )}
              </div>
              <div style={st("display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f3f6f4;padding-top:10px;margin-top:auto;")}>
                <span style={st("font-size:11px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;")}>{c.meta}</span>
                <span style={st(stStyle)}>{c.active ? "● ใช้งานอยู่" : "○ ปิดใช้งาน"}</span>
              </div>
            </div>
          );
        })}
      </div>
      {openDoc && <DocModal item={openDoc} onClose={() => setOpenDoc(null)} />}
    </div>
  );
}
