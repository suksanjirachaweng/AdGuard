import React, { useEffect, useState } from "react";
import { st } from "../lib/st.js";
import { useApp } from "../store.jsx";

const ROLES = [
  { value: "admin",   label: "ผู้ดูแลระบบ", en: "Admin" },
  { value: "officer", label: "เจ้าหน้าที่",  en: "Officer" },
];

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

function Modal({ title, onClose, children }) {
  return (
    <div style={st("position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;")}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={st("background:#fff;border-radius:14px;width:100%;max-width:440px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25);")}
        onClick={(e) => e.stopPropagation()}>
        <div style={st("padding:20px 24px 16px;border-bottom:1px solid #eef2f0;display:flex;align-items:center;justify-content:space-between;")}>
          <div style={st("font-size:16px;font-weight:700;color:#0f3026;")}>{title}</div>
          <button onClick={onClose} style={st("background:none;border:none;font-size:18px;cursor:pointer;color:#6b7d75;padding:2px 6px;")}>✕</button>
        </div>
        <div style={st("padding:20px 24px 24px;")}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={st("margin-bottom:14px;")}>
      <label style={st("display:block;font-size:12px;font-weight:600;color:#0f3026;margin-bottom:5px;")}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = "width:100%;padding:9px 12px;border:1.5px solid #d8e6de;border-radius:8px;font-family:inherit;font-size:13.5px;color:#0f3026;box-sizing:border-box;outline:none;";
const btnPrimary = "background:#157347;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;";
const btnDanger  = "background:#d64545;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;";
const btnSecondary = "background:#eef2f0;color:#0f3026;border:1.5px solid #d8e6de;border-radius:8px;padding:10px 20px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;";

function AddUserModal({ onClose, onCreated }) {
  const { createUserAdmin } = useApp();
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "officer" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const submit = async () => {
    setErr("");
    if (!form.email.trim()) return setErr("กรุณาระบุอีเมล");
    if (form.password.length < 6) return setErr("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    setBusy(true);
    try { await createUserAdmin(form); onCreated(); onClose(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="เพิ่มผู้ใช้งานใหม่" onClose={onClose}>
      {err && <div style={st("background:#fdecea;color:#c0392b;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;")}>{err}</div>}
      <Field label="อีเมล *">
        <input style={st(inputStyle)} type="email" value={form.email} onChange={f("email")} placeholder="user@example.com" />
      </Field>
      <Field label="รหัสผ่าน * (อย่างน้อย 6 ตัวอักษร)">
        <input style={st(inputStyle)} type="password" value={form.password} onChange={f("password")} placeholder="••••••" />
      </Field>
      <Field label="ชื่อที่แสดง">
        <input style={st(inputStyle)} type="text" value={form.name} onChange={f("name")} placeholder="ชื่อ นามสกุล" />
      </Field>
      <Field label="บทบาท">
        <select style={st(inputStyle)} value={form.role} onChange={f("role")}>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label} ({r.en})</option>)}
        </select>
      </Field>
      <div style={st("display:flex;gap:10px;justify-content:flex-end;margin-top:6px;")}>
        <button style={st(btnSecondary)} onClick={onClose}>ยกเลิก</button>
        <button style={st(btnPrimary)} onClick={submit} disabled={busy}>{busy ? "กำลังบันทึก…" : "เพิ่มผู้ใช้"}</button>
      </div>
    </Modal>
  );
}

function EditUserModal({ user, onClose }) {
  const { updateUserAdmin } = useApp();
  const [form, setForm] = useState({ name: user.name || "", role: user.role || "officer" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const submit = async () => {
    setErr("");
    setBusy(true);
    try { await updateUserAdmin(user.id, form); onClose(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={`แก้ไขผู้ใช้: ${user.email}`} onClose={onClose}>
      {err && <div style={st("background:#fdecea;color:#c0392b;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;")}>{err}</div>}
      <Field label="ชื่อที่แสดง">
        <input style={st(inputStyle)} type="text" value={form.name} onChange={f("name")} />
      </Field>
      <Field label="บทบาท">
        <select style={st(inputStyle)} value={form.role} onChange={f("role")}>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label} ({r.en})</option>)}
        </select>
      </Field>
      <div style={st("display:flex;gap:10px;justify-content:flex-end;margin-top:6px;")}>
        <button style={st(btnSecondary)} onClick={onClose}>ยกเลิก</button>
        <button style={st(btnPrimary)} onClick={submit} disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const { resetPasswordAdmin } = useApp();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setErr("");
    if (pw.length < 6) return setErr("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    setBusy(true);
    try { await resetPasswordAdmin(user.id, pw); setDone(true); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={`รีเซ็ตรหัสผ่าน: ${user.email}`} onClose={onClose}>
      {done ? (
        <div style={st("text-align:center;padding:20px 0;")}>
          <div style={st("font-size:32px;margin-bottom:12px;")}>✅</div>
          <div style={st("font-size:14px;color:#157347;font-weight:600;margin-bottom:16px;")}>เปลี่ยนรหัสผ่านสำเร็จ</div>
          <button style={st(btnPrimary)} onClick={onClose}>ปิด</button>
        </div>
      ) : (
        <>
          {err && <div style={st("background:#fdecea;color:#c0392b;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;")}>{err}</div>}
          <Field label="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)">
            <input style={st(inputStyle)} type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••" />
          </Field>
          <div style={st("display:flex;gap:10px;justify-content:flex-end;margin-top:6px;")}>
            <button style={st(btnSecondary)} onClick={onClose}>ยกเลิก</button>
            <button style={st(btnPrimary)} onClick={submit} disabled={busy}>{busy ? "กำลังบันทึก…" : "เปลี่ยนรหัสผ่าน"}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

function DeleteConfirmModal({ user, onClose }) {
  const { deleteUserAdmin } = useApp();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try { await deleteUserAdmin(user.id); onClose(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="ยืนยันการลบผู้ใช้" onClose={onClose}>
      {err && <div style={st("background:#fdecea;color:#c0392b;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;")}>{err}</div>}
      <p style={st("font-size:14px;color:#0f3026;margin:0 0 6px;")}>
        คุณต้องการลบผู้ใช้ <strong>{user.email}</strong> ออกจากระบบ?
      </p>
      <p style={st("font-size:13px;color:#6b7d75;margin:0 0 20px;")}>การกระทำนี้ไม่สามารถย้อนกลับได้</p>
      <div style={st("display:flex;gap:10px;justify-content:flex-end;")}>
        <button style={st(btnSecondary)} onClick={onClose}>ยกเลิก</button>
        <button style={st(btnDanger)} onClick={submit} disabled={busy}>{busy ? "กำลังลบ…" : "ลบผู้ใช้"}</button>
      </div>
    </Modal>
  );
}

export default function UserManagement() {
  const { state, loadUsers } = useApp();
  const { users, usersLoading, usersError, user: me } = state;
  const [modal, setModal] = useState(null); // { type, user? }

  useEffect(() => { loadUsers(); }, [loadUsers]);

  if (me?.role !== "admin") {
    return (
      <div style={st("display:flex;align-items:center;justify-content:center;height:60vh;")}>
        <div style={st("text-align:center;color:#6b7d75;")}>
          <div style={st("font-size:40px;margin-bottom:12px;")}>🔒</div>
          <div style={st("font-size:16px;font-weight:600;")}>เฉพาะผู้ดูแลระบบเท่านั้น</div>
        </div>
      </div>
    );
  }

  const close = () => setModal(null);

  return (
    <div style={st("max-width:900px;margin:0 auto;")}>
      <div style={st("display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;")}>
        <div>
          <div style={st("font-size:20px;font-weight:700;color:#0f3026;")}>จัดการผู้ใช้งาน</div>
          <div style={st("font-size:12px;color:#6b7d75;margin-top:3px;")}>User Management · {users.length} คน</div>
        </div>
        <button
          style={st("background:#157347;color:#fff;border:none;border-radius:9px;padding:10px 18px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:7px;")}
          onClick={() => setModal({ type: "add" })}
        >
          <span style={st("font-size:16px;")}>＋</span> เพิ่มผู้ใช้
        </button>
      </div>

      {usersError && (
        <div style={st("background:#fdecea;color:#c0392b;padding:14px 18px;border-radius:10px;font-size:13.5px;margin-bottom:16px;")}>
          ⚠ {usersError}
          <button onClick={loadUsers} style={st("margin-left:12px;background:none;border:none;color:#c0392b;text-decoration:underline;cursor:pointer;font-size:13px;")}>ลองใหม่</button>
        </div>
      )}

      <div style={st("background:#fff;border-radius:14px;border:1.5px solid #e8f0ec;overflow:hidden;")}>
        {usersLoading ? (
          <div style={st("padding:60px;text-align:center;color:#6b7d75;font-size:14px;")}>กำลังโหลด…</div>
        ) : users.length === 0 ? (
          <div style={st("padding:60px;text-align:center;color:#6b7d75;font-size:14px;")}>ยังไม่มีผู้ใช้งาน</div>
        ) : (
          <table style={st("width:100%;border-collapse:collapse;")}>
            <thead>
              <tr style={st("background:#f5f9f6;")}>
                {["ผู้ใช้งาน / Email", "บทบาท", "วันที่สร้าง", "จัดการ"].map((h) => (
                  <th key={h} style={st("text-align:left;padding:12px 16px;font-size:11.5px;font-weight:600;color:#6b7d75;letter-spacing:.5px;")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const isMe = u.id === me?.id;
                const roleInfo = ROLES.find((r) => r.value === u.role) || { label: u.role, en: u.role };
                return (
                  <tr key={u.id} style={st("border-top:1px solid #eef2f0;" + (i % 2 === 0 ? "" : "background:#fafcfb;"))}>
                    <td style={st("padding:13px 16px;")}>
                      <div style={st("display:flex;align-items:center;gap:10px;")}>
                        <div style={st("width:34px;height:34px;border-radius:50%;background:" + (u.role === "admin" ? "#157347" : "#2563a8") + ";display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0;")}>
                          {(u.name || u.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={st("font-size:13.5px;font-weight:600;color:#0f3026;")}>{u.name || "—"} {isMe && <span style={st("font-size:10px;background:#e9f4ee;color:#157347;padding:1px 7px;border-radius:9px;font-weight:600;")}>(คุณ)</span>}</div>
                          <div style={st("font-size:11.5px;color:#6b7d75;font-family:'IBM Plex Mono',monospace;")}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={st("padding:13px 16px;")}>
                      <span style={st("font-size:12px;font-weight:600;padding:3px 10px;border-radius:9px;" +
                        (u.role === "admin" ? "background:#e9f4ee;color:#157347;" : "background:#e7f0fb;color:#2563a8;"))}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td style={st("padding:13px 16px;font-size:12.5px;color:#6b7d75;font-family:'IBM Plex Mono',monospace;")}>{formatDate(u.created_at)}</td>
                    <td style={st("padding:13px 16px;")}>
                      <div style={st("display:flex;gap:6px;")}>
                        <button
                          onClick={() => setModal({ type: "edit", user: u })}
                          style={st("background:#eef2f0;border:none;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:600;color:#0f3026;cursor:pointer;")}
                        >แก้ไข</button>
                        <button
                          onClick={() => setModal({ type: "password", user: u })}
                          style={st("background:#e7f0fb;border:none;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:600;color:#2563a8;cursor:pointer;")}
                        >รีเซ็ตรหัส</button>
                        {!isMe && (
                          <button
                            onClick={() => setModal({ type: "delete", user: u })}
                            style={st("background:#fdecea;border:none;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:600;color:#c0392b;cursor:pointer;")}
                          >ลบ</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal?.type === "add"      && <AddUserModal onClose={close} onCreated={loadUsers} />}
      {modal?.type === "edit"     && <EditUserModal user={modal.user} onClose={close} />}
      {modal?.type === "password" && <ResetPasswordModal user={modal.user} onClose={close} />}
      {modal?.type === "delete"   && <DeleteConfirmModal user={modal.user} onClose={close} />}
    </div>
  );
}
