import { useState } from "react";
import { st } from "../lib/st.js";
import { useApp } from "../store.jsx";

export default function Login() {
  const { state, login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e) => { e.preventDefault(); if (!state.authBusy) login(email.trim(), password); };

  return (
    <div style={st("min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#eef2f0;padding:24px;")}>
      <div style={st("width:100%;max-width:400px;")}>
        {/* Brand */}
        <div style={st("display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:26px;")}>
          <div style={st("width:56px;height:56px;border-radius:14px;background:#2f9e6a;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:28px;box-shadow:0 4px 14px rgba(47,158,106,.4);")}>⚖</div>
          <div style={st("text-align:center;line-height:1.2;")}>
            <div style={st("font-weight:700;font-size:22px;color:#16241d;letter-spacing:.2px;")}>AdGuard</div>
            <div style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;letter-spacing:.5px;margin-top:2px;")}>FALSE-AD DETECTION · เข้าสู่ระบบเจ้าหน้าที่</div>
          </div>
        </div>

        <form onSubmit={submit} style={st("background:#fff;border:1px solid #e2e9e5;border-radius:16px;padding:26px;box-shadow:0 2px 12px rgba(16,36,29,.06);")}>
          <div style={st("font-size:16px;font-weight:700;color:#16241d;margin-bottom:4px;")}>เข้าสู่ระบบ</div>
          <div style={st("font-size:12.5px;color:#7d8e86;margin-bottom:20px;")}>สำหรับเจ้าหน้าที่ที่ได้รับสิทธิ์เท่านั้น</div>

          <label style={st("font-size:12px;font-weight:600;color:#39473f;display:block;margin-bottom:7px;")}>อีเมล</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required placeholder="name@agency.go.th"
            className="fc" style={st("width:100%;border:1.5px solid #d8e2dc;border-radius:10px;padding:12px 13px;font-family:inherit;font-size:13.5px;color:#16241d;outline:none;margin-bottom:16px;")} />

          <label style={st("font-size:12px;font-weight:600;color:#39473f;display:block;margin-bottom:7px;")}>รหัสผ่าน</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
            className="fc" style={st("width:100%;border:1.5px solid #d8e2dc;border-radius:10px;padding:12px 13px;font-family:inherit;font-size:13.5px;color:#16241d;outline:none;margin-bottom:18px;")} />

          {state.authError && (
            <div style={st("background:#fdecea;border:1px solid #f5c6bf;color:#c0392b;font-size:12.5px;border-radius:9px;padding:10px 12px;margin-bottom:16px;")}>
              ⚠ {state.authError}
            </div>
          )}

          <button type="submit" disabled={state.authBusy} className="h-dark"
            style={st("width:100%;background:" + (state.authBusy ? "#6fae8e" : "#157347") + ";color:#fff;border:none;border-radius:11px;padding:14px;font-family:inherit;font-size:14.5px;font-weight:600;cursor:" + (state.authBusy ? "wait" : "pointer") + ";box-shadow:0 3px 10px rgba(21,115,71,.3);")}>
            {state.authBusy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div style={st("text-align:center;font-size:11px;color:#9aa8a1;margin-top:18px;line-height:1.6;")}>
          ระบบตรวจจับโฆษณาเกินจริงด้วย AI · สำหรับหน่วยงานรัฐ<br />การเข้าใช้งานถูกบันทึกเพื่อความปลอดภัย
        </div>
      </div>
    </div>
  );
}
