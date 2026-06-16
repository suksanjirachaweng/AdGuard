import { useLocation } from "react-router-dom";
import { st } from "../lib/st.js";
import { navDef } from "../lib/data.js";
import { screenFromPath } from "../lib/routes.js";
import { useApp } from "../store.jsx";

const roleLabel = { admin: "ผู้ดูแลระบบ", officer: "เจ้าหน้าที่" };

export default function Sidebar() {
  const { go, logout, state } = useApp();
  const screen = screenFromPath(useLocation().pathname);
  const user = state.user || {};
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  return (
    <aside className="sidebar" style={st("width:248px;flex-shrink:0;background:#0f3026;display:flex;flex-direction:column;color:#cfe0d8;")}>
      <div className="brand" style={st("padding:22px 20px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,.08);")}>
        <div style={st("width:38px;height:38px;border-radius:9px;background:#2f9e6a;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:20px;flex-shrink:0;box-shadow:0 2px 8px rgba(47,158,106,.4);")}>⚖</div>
        <div className="brand-text" style={st("line-height:1.15;")}>
          <div style={st("font-weight:700;font-size:17px;color:#fff;letter-spacing:.2px;")}>AdGuard</div>
          <div style={st("font-size:10.5px;color:#7fae97;font-family:'IBM Plex Mono',monospace;letter-spacing:.5px;")}>FALSE-AD DETECTION</div>
        </div>
      </div>
      <nav className="sidebar-nav" style={st("padding:14px 12px;display:flex;flex-direction:column;gap:3px;flex:1;")}>
        <div className="menu-label" style={st("font-size:10px;font-weight:600;color:#5c8a72;letter-spacing:1.2px;padding:8px 12px 6px;")}>เมนูหลัก · MENU</div>
        {navDef.map((n) => {
          const active = n.key === screen;
          const btn = "display:flex;align-items:center;gap:11px;width:100%;border:none;cursor:pointer;padding:9px 12px;border-radius:9px;font-family:inherit;transition:background .15s;" +
            (active ? "background:#2f9e6a;color:#fff;" : "background:transparent;color:#a8c4b6;");
          const ic = "width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;" + (active ? "color:#fff;" : "color:#5c8a72;");
          return (
            <button key={n.key} className="nav-btn" onClick={() => go(n.key)} style={st(btn)}>
              <span style={st(ic)}>{n.icon}</span>
              <span className="nav-label" style={st("flex:1;text-align:left;line-height:1.1;")}>
                <span style={st("display:block;font-size:13.5px;font-weight:500;")}>{n.th}</span>
                <span style={st("display:block;font-size:9.5px;opacity:.6;font-family:'IBM Plex Mono',monospace;")}>{n.en}</span>
              </span>
              {n.badge && <span className="nav-badge" style={st("background:#d64545;color:#fff;font-size:10px;font-weight:600;padding:1px 7px;border-radius:9px;font-family:'IBM Plex Mono',monospace;")}>{n.badge}</span>}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-user" style={st("padding:14px;border-top:1px solid rgba(255,255,255,.08);")}>
        <div style={st("display:flex;align-items:center;gap:10px;padding:8px;border-radius:9px;background:rgba(255,255,255,.05);")}>
          <div style={st("width:34px;height:34px;border-radius:50%;background:#2f9e6a;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;flex-shrink:0;")}>{initial}</div>
          <div style={st("flex:1;line-height:1.2;min-width:0;")}>
            <div style={st("font-size:12.5px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{user.name || user.email}</div>
            <div style={st("font-size:10px;color:#7fae97;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{roleLabel[user.role] || user.role}</div>
          </div>
          <button onClick={logout} title="ออกจากระบบ" style={st("background:none;border:none;color:#7fae97;font-size:15px;cursor:pointer;padding:4px;line-height:1;")}>⏻</button>
        </div>
      </div>
    </aside>
  );
}
