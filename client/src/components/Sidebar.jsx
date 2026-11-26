import { useLocation } from "react-router-dom";
import { st } from "../lib/st.js";
import { navDef } from "../lib/data.js";
import { screenFromPath } from "../lib/routes.js";
import { useApp } from "../store.jsx";

const roleLabel = { admin: "ผู้ดูแลระบบ", officer: "เจ้าหน้าที่" };

export default function Sidebar({ open, onClose }) {
  const { go, logout, state } = useApp();
  const screen = screenFromPath(useLocation().pathname);
  const user = state.user || {};
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();

  const handleNav = (key) => {
    go(key);
    onClose();
  };

  return (
    <aside
      className="sidebar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: 248,
        flexShrink: 0,
        background: "#0f3026",
        display: "flex",
        flexDirection: "column",
        color: "#cfe0d8",
        zIndex: 100,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .25s cubic-bezier(.4,0,.2,1)",
      }}
    >
      <div className="brand" style={st("padding:22px 20px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,.08);")}>
        <img src="/logo.png" alt="logo" style={st("width:40px;height:40px;object-fit:contain;flex-shrink:0;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:#fff;padding:2px;")} />
        <div className="brand-text" style={st("line-height:1.15;flex:1;")}>
          <div style={st("font-weight:700;font-size:17px;color:#fff;letter-spacing:.2px;")}>AdGuard</div>
          <div style={st("font-size:10.5px;color:#7fae97;font-family:'IBM Plex Mono',monospace;letter-spacing:.5px;")}>กระทรวงสาธารณสุข</div>
        </div>
        <button
          onClick={onClose}
          style={st("background:none;border:none;color:#7fae97;font-size:20px;cursor:pointer;padding:4px;line-height:1;")}
          title="ปิดเมนู"
        >✕</button>
      </div>

      <nav className="sidebar-nav" style={st("padding:8px 10px 10px;display:flex;flex-direction:column;gap:1px;flex:1;overflow-y:auto;")}>
        {navDef.filter((n) => !n.adminOnly || user.role === "admin").map((n, i) => {
          if (n.type === "group") {
            const isFirst = i === 0;
            return (
              <div key={`g-${i}`} style={{
                marginTop: isFirst ? 2 : 10,
                marginBottom: 2,
                paddingTop: isFirst ? 0 : 10,
                borderTop: isFirst ? "none" : "1px solid rgba(255,255,255,0.07)",
                paddingLeft: 12,
                paddingRight: 12,
              }}>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "2px",
                  color: "rgba(207,224,216,0.32)",
                  fontFamily: "'IBM Plex Mono', monospace",
                  textTransform: "uppercase",
                }}>{n.label}</span>
              </div>
            );
          }
          const active = n.key === screen;
          return (
            <button key={n.key} className="nav-btn" onClick={() => handleNav(n.key)} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", border: "none", cursor: "pointer",
              padding: "8px 10px", borderRadius: 8,
              fontFamily: "inherit", transition: "background .15s",
              background: active ? "#2f9e6a" : "transparent",
              color: active ? "#fff" : "#9abfb0",
              position: "relative",
            }}>
              <span style={{
                width: 26, height: 26,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, flexShrink: 0,
                color: active ? "#fff" : "#4e8a6a",
                borderRadius: 6,
                background: active ? "rgba(255,255,255,0.15)" : "transparent",
              }}>{n.icon}</span>
              <span className="nav-label" style={{ flex: 1, textAlign: "left", lineHeight: 1.15 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: active ? 600 : 450 }}>{n.th}</span>
                <span style={{ display: "block", fontSize: 9, opacity: 0.5, fontFamily: "'IBM Plex Mono', monospace", marginTop: 1 }}>{n.en}</span>
              </span>
              {n.badge && <span className="nav-badge" style={{
                background: "#d64545", color: "#fff",
                fontSize: 9.5, fontWeight: 700,
                padding: "1px 6px", borderRadius: 8,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>{n.badge}</span>}
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
