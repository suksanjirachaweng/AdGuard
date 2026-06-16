import { st } from "../lib/st.js";
import { useApp } from "../store.jsx";

const stepDefs = [
  { label: "ดึงเนื้อหาและข้อความจากแหล่งข้อมูล", th: 30 },
  { label: "วิเคราะห์ภาพ / ฉลาก ด้วย Vision AI", th: 55 },
  { label: "ตรวจสรรพคุณเทียบฐานข้อมูลกฎหมาย", th: 80 },
  { label: "สรุปความเสี่ยงและจัดทำรายงาน", th: 100 },
];

export default function AnalyzingOverlay() {
  const { state } = useApp();
  if (!state.analyzing) return null;
  const p = state.progress;
  return (
    <div style={st("position:fixed;inset:0;background:rgba(10,30,22,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:50;padding:20px;")}>
      <div className="analyze-card" style={st("background:#fff;border-radius:16px;padding:34px;width:440px;max-width:100%;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:fadeUp .3s ease;")}>
        <div style={st("display:flex;align-items:center;gap:14px;margin-bottom:22px;")}>
          <div style={st("width:46px;height:46px;border-radius:11px;border:3px solid #e6f1ea;border-top-color:#2f9e6a;animation:spin 1s linear infinite;")}></div>
          <div>
            <div style={st("font-size:16px;font-weight:700;color:#16241d;")}>กำลังวิเคราะห์ด้วย AI</div>
            <div style={st("font-size:12px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;")}>AdGuard Engine v3.2 · Claude</div>
          </div>
        </div>
        <div style={st("height:8px;background:#eef2f0;border-radius:5px;overflow:hidden;margin-bottom:8px;")}>
          <div style={st("width:" + p + "%;height:100%;background:linear-gradient(90deg,#2f9e6a,#157347);border-radius:5px;transition:width .3s ease;")}></div>
        </div>
        <div style={st("text-align:right;font-size:11px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;margin-bottom:18px;")}>{p}%</div>
        <div style={st("display:flex;flex-direction:column;gap:9px;")}>
          {stepDefs.map((stp, i) => {
            const done = p >= stp.th;
            const active = p >= stp.th - 25 && !done;
            const dim = done ? "color:#16241d;" : active ? "color:#39473f;" : "color:#c2ccc6;";
            const dot = "width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;" +
              (done ? "background:#2f9e6a;color:#fff;" : active ? "background:#fdf4e3;color:#a9760e;animation:pulse 1s infinite;" : "background:#f1f5f3;color:#c2ccc6;");
            return (
              <div key={i} style={st("display:flex;align-items:center;gap:10px;font-size:12.5px;" + dim)}>
                <span style={st(dot)}>{done ? "✓" : "○"}</span>
                <span>{stp.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
