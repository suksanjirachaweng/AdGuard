import { useLocation } from "react-router-dom";
import { st } from "../lib/st.js";
import { titles } from "../lib/data.js";
import { screenFromPath } from "../lib/routes.js";
import { useApp } from "../store.jsx";

export default function Topbar() {
  const { go } = useApp();
  const t = titles[screenFromPath(useLocation().pathname)] || ["", ""];
  return (
    <header className="topbar" style={st("height:62px;flex-shrink:0;background:#fff;border-bottom:1px solid #e2e9e5;display:flex;align-items:center;padding:0 26px;gap:18px;")}>
      <div style={st("flex:1;min-width:0;")}>
        <div style={st("font-size:16px;font-weight:600;color:#16241d;line-height:1.1;")}>{t[0]}</div>
        <div className="topbar-sub" style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;")}>{t[1]}</div>
      </div>
      <div className="topbar-search" style={st("display:flex;align-items:center;gap:9px;background:#f1f5f3;border:1px solid #e2e9e5;border-radius:9px;padding:8px 13px;width:300px;")}>
        <span style={st("color:#9aa8a1;font-size:14px;")}>🔍</span>
        <input placeholder="ค้นหาเคส, แบรนด์, URL…" style={st("border:none;background:none;outline:none;font-family:inherit;font-size:13px;flex:1;color:#16241d;")} />
      </div>
      <button className="h-dark topbar-cta" onClick={() => go("upload")} style={st("display:flex;align-items:center;gap:7px;background:#157347;color:#fff;border:none;border-radius:9px;padding:10px 16px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 1px 3px rgba(21,115,71,.3);")}>
        <span style={st("font-size:15px;line-height:1;")}>＋</span> <span className="topbar-cta-text">ตรวจสอบใหม่</span>
      </button>
    </header>
  );
}
