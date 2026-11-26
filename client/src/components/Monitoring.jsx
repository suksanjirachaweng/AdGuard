import { useEffect, useState } from "react";
import { st } from "../lib/st.js";
import { useApp } from "../store.jsx";

const PLATFORMS = [
  { value: "website", label: "เว็บไซต์ทั่วไป", icon: "🌐" },
  { value: "facebook", label: "Facebook", icon: "📘" },
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "shopee", label: "Shopee", icon: "🛒" },
];
const platformInfo = (p) => PLATFORMS.find((x) => x.value === p) || { label: p, icon: "🔗" };

const STATUS_TABS = [
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "promoted", label: "ส่งเป็นเคสแล้ว" },
  { value: "discarded", label: "ทิ้งแล้ว" },
  { value: "all", label: "ทั้งหมด" },
];

const inputStyle = "width:100%;padding:9px 12px;border:1.5px solid #d8e6de;border-radius:8px;font-family:inherit;font-size:13.5px;color:#16241d;box-sizing:border-box;outline:none;";

// Hide internal service/config names (env var names, vendor names) from
// error messages shown to officers — they shouldn't need to know which
// third-party API powers a feature, just that it's unavailable.
function friendlyError(msg = "") {
  if (/API_KEY|API_TOKEN/i.test(msg)) return "ระบบยังไม่พร้อมใช้งานส่วนนี้ กรุณาติดต่อผู้ดูแลระบบ";
  return msg;
}

function AddLeadForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ url: "", platform: "website", rawText: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setError("");
    if (!form.url.trim()) return setError("กรุณาระบุ URL");
    setBusy(true);
    try {
      await onAdd({ ...form, matchedKeywords: [] });
      setForm({ url: "", platform: "website", rawText: "" });
      setOpen(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={st("display:flex;align-items:center;gap:8px;background:#2f9e6a;color:#fff;border:none;border-radius:10px;padding:12px 20px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.25);")}>
        ＋ เพิ่มลิงก์ที่พบ
      </button>
    );
  }

  return (
    <div style={st("background:#fff;border:1.5px solid #e2e9e5;border-radius:13px;padding:18px;margin-bottom:18px;")}>
      <div style={st("font-size:13.5px;font-weight:700;color:#16241d;margin-bottom:14px;")}>เพิ่มลิงก์ที่พบเข้าคิวเฝ้าระวัง</div>
      {error && <div style={st("background:#fdecea;color:#c0392b;padding:9px 13px;border-radius:8px;font-size:12.5px;margin-bottom:12px;")}>⚠ {error}</div>}
      <div style={st("display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:10px;")}>
        <input style={st(inputStyle)} placeholder="https://…" value={form.url} onChange={f("url")} />
        <select style={st(inputStyle)} value={form.platform} onChange={f("platform")}>
          {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
        </select>
      </div>
      <textarea style={st("width:100%;min-height:70px;border:1.5px solid #d8e6de;border-radius:8px;padding:11px 13px;font-family:inherit;font-size:13px;color:#16241d;resize:vertical;outline:none;margin-bottom:12px;box-sizing:border-box;")}
        placeholder="ข้อความ/แคปชั่นที่พบ (ถ้ามี — เว้นว่างได้ ใช้ตรวจสอบจาก URL อย่างเดียวก็ได้)"
        value={form.rawText} onChange={f("rawText")} />
      <div style={st("display:flex;gap:10px;")}>
        <button onClick={submit} disabled={busy}
          style={st("background:#157347;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-family:inherit;font-size:13px;font-weight:600;cursor:" + (busy ? "not-allowed" : "pointer") + ";")}>
          {busy ? "กำลังบันทึก…" : "เพิ่มเข้าคิว"}
        </button>
        <button onClick={() => { setOpen(false); setError(""); }}
          style={st("background:#fff;border:1px solid #d8e2dc;border-radius:8px;padding:10px 18px;font-family:inherit;font-size:13px;font-weight:600;color:#39473f;cursor:pointer;")}>
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

const DAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MINUTES = [0, 15, 30, 45];

function DiscoverySection({ onRun, running, isAdmin }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState(null); // loaded from API
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    fetch("/api/discovery/schedule", { credentials: "include" })
      .then((r) => r.json())
      .then(({ schedule: s }) => { setSchedule(s); setDraft(s); })
      .catch(() => {});
  }, []);

  const run = async () => {
    setError("");
    setResult(null);
    try { setResult(await onRun()); }
    catch (e) { setError(e.message); }
  };

  const saveSchedule = async () => {
    setSaving(true); setSaveMsg("");
    try {
      const r = await fetch("/api/discovery/schedule", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
      setSchedule(data.schedule);
      setSaveMsg("บันทึกแล้ว ✓");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (e) { setSaveMsg("⚠ " + e.message); }
    finally { setSaving(false); }
  };

  const toggleDay = (d) => {
    setDraft((prev) => {
      const days = prev.days.includes(d) ? prev.days.filter((x) => x !== d) : [...prev.days, d].sort();
      return { ...prev, days: days.length ? days : prev.days }; // must have ≥1 day
    });
  };

  const scheduleLabel = () => {
    if (!schedule) return "กำลังโหลด…";
    if (!schedule.enabled) return "ปิดการทำงาน";
    const h = String(schedule.hour).padStart(2, "0");
    const m = String(schedule.minute).padStart(2, "0");
    const days = schedule.days.length === 7 ? "ทุกวัน" : schedule.days.map((d) => DAY_LABELS[d]).join(", ");
    return `${days} เวลา ${h}:${m} น.`;
  };

  return (
    <div style={st("background:#fff;border:1.5px solid #e2e9e5;border-radius:13px;padding:18px;margin-bottom:18px;")}>
      <div style={st("display:flex;align-items:center;gap:14px;flex-wrap:wrap;")}>
        <div style={st("flex:1;min-width:240px;")}>
          <div style={st("font-size:13.5px;font-weight:700;color:#16241d;margin-bottom:3px;")}>🔍 ค้นหาเว็บไซต์ต้องสงสัยอัตโนมัติ</div>
          <div style={st("font-size:12px;color:#7d8e86;line-height:1.6;")}>ค้นหาเว็บไซต์ที่เข้าข่ายอวดอ้างสรรพคุณเกินจริง (อาหาร/ยา) แล้วเพิ่มเข้าคิวอัตโนมัติ</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
            {/* On/off pill toggle — visible at all times for admin */}
            {isAdmin && draft && (
              <button
                onClick={async () => {
                  const next = { ...draft, enabled: !draft.enabled };
                  setDraft(next);
                  try {
                    const r = await fetch("/api/discovery/schedule", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
                    const data = await r.json();
                    if (r.ok) setSchedule(data.schedule);
                  } catch {}
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  border: "none", borderRadius: 20, padding: "3px 10px 3px 5px",
                  background: draft.enabled ? "#e9f4ee" : "#f1f5f3",
                  color: draft.enabled ? "#157347" : "#9aa8a1",
                  cursor: "pointer", fontSize: 11.5, fontWeight: 600,
                }}>
                <span style={{
                  width: 28, height: 16, borderRadius: 8, position: "relative",
                  background: draft.enabled ? "#2f9e6a" : "#c8d8d0",
                  display: "inline-block", flexShrink: 0,
                }}>
                  <span style={{
                    position: "absolute", top: 2, left: draft.enabled ? 14 : 2,
                    width: 12, height: 12, borderRadius: "50%",
                    background: "#fff", transition: "left .2s",
                  }} />
                </span>
                {draft.enabled ? "เปิดอยู่" : "ปิดอยู่"}
              </button>
            )}
            <span style={st("font-size:11px;color:#9aab9f;")}>🕗 {scheduleLabel()}</span>
            {isAdmin && (
              <button onClick={() => setShowSchedule((v) => !v)}
                style={{ background: "none", border: "1px solid #c9e6d4", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#157347", cursor: "pointer" }}>
                {showSchedule ? "ซ่อน" : "ตั้งเวลา"}
              </button>
            )}
          </div>
        </div>
        <button onClick={run} disabled={running}
          style={st("background:#0f3026;color:#fff;border:none;border-radius:9px;padding:11px 20px;font-family:inherit;font-size:13px;font-weight:600;cursor:" + (running ? "not-allowed" : "pointer") + ";white-space:nowrap;")}>
          {running ? "กำลังค้นหา…" : "🔍 ค้นหาตอนนี้"}
        </button>
      </div>

      {/* Schedule configurator (admin only) */}
      {showSchedule && draft && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #eef2f0" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#16241d", marginBottom: 12 }}>⚙ กำหนดเวลาค้นหาอัตโนมัติ</div>
          {/* Enable toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, color: "#16241d" }}>
              <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft((p) => ({ ...p, enabled: e.target.checked }))} style={{ width: 15, height: 15, accentColor: "#157347" }} />
              เปิดการค้นหาอัตโนมัติ
            </label>
          </div>
          {/* Time */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, opacity: draft.enabled ? 1 : 0.4 }}>
            <span style={{ fontSize: 12.5, color: "#5a6b63", width: 60 }}>เวลา</span>
            <select value={draft.hour} onChange={(e) => setDraft((p) => ({ ...p, hour: Number(e.target.value) }))}
              disabled={!draft.enabled}
              style={st("border:1.5px solid #d8e6de;border-radius:7px;padding:5px 8px;font-family:inherit;font-size:13px;color:#16241d;outline:none;")}>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
              ))}
            </select>
            <span style={{ fontSize: 13, color: "#5a6b63" }}>:</span>
            <select value={draft.minute} onChange={(e) => setDraft((p) => ({ ...p, minute: Number(e.target.value) }))}
              disabled={!draft.enabled}
              style={st("border:1.5px solid #d8e6de;border-radius:7px;padding:5px 8px;font-family:inherit;font-size:13px;color:#16241d;outline:none;")}>
              {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
            </select>
            <span style={{ fontSize: 11.5, color: "#9aab9f" }}>น. (เวลาไทย)</span>
          </div>
          {/* Days */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, opacity: draft.enabled ? 1 : 0.4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: "#5a6b63", width: 60 }}>วัน</span>
            {DAY_LABELS.map((label, i) => {
              const on = draft.days.includes(i);
              return (
                <button key={i} onClick={() => !draft.enabled || toggleDay(i)} disabled={!draft.enabled}
                  style={{ width: 36, height: 32, border: "1.5px solid " + (on ? "#2f9e6a" : "#d8e6de"), borderRadius: 7, background: on ? "#e9f4ee" : "#fff", color: on ? "#157347" : "#9aab9f", fontSize: 11.5, fontWeight: on ? 700 : 400, cursor: draft.enabled ? "pointer" : "default" }}>
                  {label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={saveSchedule} disabled={saving}
              style={st("background:#157347;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-family:inherit;font-size:13px;font-weight:600;cursor:" + (saving ? "not-allowed" : "pointer") + ";")}>
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            <button onClick={() => { setDraft(schedule); setShowSchedule(false); }}
              style={st("background:#fff;border:1px solid #d8e2dc;border-radius:8px;padding:8px 16px;font-family:inherit;font-size:13px;color:#5a6b63;cursor:pointer;")}>
              ยกเลิก
            </button>
            {saveMsg && <span style={{ fontSize: 12.5, color: saveMsg.startsWith("⚠") ? "#c0392b" : "#157347" }}>{saveMsg}</span>}
          </div>
        </div>
      )}

      {error && (
        <div style={st("margin-top:12px;background:#fdecea;color:#c0392b;padding:10px 14px;border-radius:8px;font-size:12.5px;")}>
          ⚠ {friendlyError(error)}
        </div>
      )}
      {result && (
        <div style={st("margin-top:12px;background:#e9f4ee;color:#157347;padding:10px 14px;border-radius:8px;font-size:12.5px;")}>
          ✓ ค้นหา {result.queriesRun} คำ พบ {result.found} ลิงก์ — เพิ่มเข้าคิวใหม่ {result.queued} รายการ (ซ้ำ/มีอยู่แล้ว {result.skipped})
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

function Pager({ page, total, onChange }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const from = page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);
  const btn = (disabled) => ({
    background: "none", border: "1.5px solid #e4ece8", borderRadius: 7,
    padding: "4px 10px", fontFamily: "inherit", fontSize: 12,
    color: disabled ? "#c8d8d0" : "#157347", cursor: disabled ? "default" : "pointer",
  });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, marginTop: 12 }}>
      <span style={{ fontSize: 11.5, color: "#9aa8a1", fontFamily: "'IBM Plex Mono',monospace", marginRight: 4 }}>
        {from}–{to} / {total}
      </span>
      <button style={btn(page === 0)} disabled={page === 0} onClick={() => onChange(0)}>«</button>
      <button style={btn(page === 0)} disabled={page === 0} onClick={() => onChange(page - 1)}>‹</button>
      <button style={btn(page >= pages - 1)} disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>›</button>
      <button style={btn(page >= pages - 1)} disabled={page >= pages - 1} onClick={() => onChange(pages - 1)}>»</button>
    </div>
  );
}

export default function Monitoring() {
  const { state, loadLeads, createLead, promoteLead, discardLead, deleteLead, runDiscovery, collectLead } = useApp();
  const { leads, leadsLoading, leadsError, leadBusyId, discoveryRunning } = state;
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState(""); // "promote" | "collect" | "discard"
  const [prescreenWarn, setPrescreenWarn] = useState(null); // { id, message } — awaiting force confirm

  useEffect(() => { loadLeads(tab); }, [tab, loadLeads]);
  useEffect(() => { setPage(0); }, [tab, search]);

  const handleDiscoveryRun = async () => {
    const result = await runDiscovery();
    if (tab === "pending") loadLeads(tab);
    return result;
  };

  const handlePromote = async (id, force = false) => {
    setActionError(""); setPrescreenWarn(null); setBusyAction("promote");
    try { await promoteLead(id, { force }); }
    catch (e) {
      if (e.prescreen) {
        // Blocked by keyword filter — ask user whether to force-send
        setPrescreenWarn({ id, message: e.message });
      } else {
        setActionError(e.message);
      }
    }
    finally { setBusyAction(""); }
  };
  const handleDiscard = async (id) => {
    setActionError(""); setBusyAction("discard");
    try { await discardLead(id); }
    catch (e) { setActionError(e.message); }
    finally { setBusyAction(""); }
  };
  const handleCollect = async (id) => {
    setActionError(""); setBusyAction("collect");
    try { await collectLead(id); }
    catch (e) { setActionError(e.message); }
    finally { setBusyAction(""); }
  };

  return (
    <div style={st("max-width:1100px;margin:0 auto;animation:fadeUp .4s ease;")}>
      <div className="ctx-intro" style={st("background:linear-gradient(100deg,#0f3026,#16432f);border-radius:14px;padding:22px 24px;margin-bottom:18px;display:flex;align-items:center;gap:18px;color:#fff;")}>
        <div style={st("width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;")}>🔭</div>
        <div style={st("flex:1;")}>
          <div style={st("font-size:16px;font-weight:700;margin-bottom:4px;")}>คิวเฝ้าระวังโฆษณาบนอินเทอร์เน็ต</div>
          <div style={st("font-size:12.5px;color:#bcd6c8;line-height:1.6;")}>
            ค้นหาเว็บไซต์ต้องสงสัยอัตโนมัติ หรือเพิ่มลิงก์ที่พบเองก็ได้ — กด "📥 ดึงเนื้อหาเต็ม" (เว็บไซต์ทั่วไป) เพื่อให้ AI วิเคราะห์จากเนื้อหาจริงแทนข้อความสรุปสั้นๆ — "ส่งเป็นเคส" จะรัน AI วิเคราะห์เหมือนหน้าตรวจสอบใหม่ทุกประการ
          </div>
        </div>
      </div>

      <DiscoverySection onRun={handleDiscoveryRun} running={discoveryRunning} isAdmin={state.user?.role === "admin"} />
      <AddLeadForm onAdd={createLead} />

      {actionError && (
        <div style={st("background:#fdecea;color:#c0392b;padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;")}>⚠ {friendlyError(actionError)}</div>
      )}

      {prescreenWarn && (
        <div style={st("background:#fff8e1;border:1px solid #ffe082;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;")}>
          <div style={st("flex:1;min-width:200px;")}>
            <div style={st("font-size:13px;font-weight:600;color:#7a5c00;margin-bottom:2px;")}>⚠ ไม่พบคำต้องสงสัยในเนื้อหา</div>
            <div style={st("font-size:12px;color:#9a7a00;")}>เนื้อหานี้อาจไม่ใช่โฆษณาเกินจริง ต้องการส่งให้ AI วิเคราะห์ต่อหรือไม่?</div>
          </div>
          <div style={st("display:flex;gap:8px;")}>
            <button onClick={() => handlePromote(prescreenWarn.id, true)}
              style={st("padding:7px 14px;background:#f59e0b;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;")}>
              วิเคราะห์ต่อเลย
            </button>
            <button onClick={() => setPrescreenWarn(null)}
              style={st("padding:7px 14px;background:#eef2f0;color:#5a6b63;border:none;border-radius:7px;font-size:13px;cursor:pointer;")}>
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Filter bar: status dropdown + search */}
      <div style={st("display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;")}>
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value)}
          style={st("border:1.5px solid #d8e6de;background:#fff;color:#16241d;border-radius:8px;padding:8px 32px 8px 12px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;outline:none;appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23157347' stroke-width='1.8' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 10px center;")}
        >
          {STATUS_TABS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9aa8a1", pointerEvents: "none" }}>🔍</span>
          <input
            type="text"
            placeholder="ค้นหา URL หรือข้อความ…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={st("width:100%;padding:8px 12px 8px 32px;border:1.5px solid #d8e6de;border-radius:8px;font-family:inherit;font-size:13px;color:#16241d;outline:none;box-sizing:border-box;")}
          />
        </div>
      </div>

      {leadsError && (
        <div style={st("background:#fdecea;color:#c0392b;padding:14px 18px;border-radius:10px;font-size:13.5px;margin-bottom:16px;")}>⚠ {leadsError}</div>
      )}

      {(() => {
        const q = search.trim().toLowerCase();
        const filtered = q
          ? leads.filter((l) => l.url?.toLowerCase().includes(q) || l.rawText?.toLowerCase().includes(q))
          : leads;
        const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
        return (
      <div style={st("background:#fff;border-radius:14px;border:1.5px solid #e8f0ec;overflow:hidden;")}>
        {leadsLoading ? (
          <div style={st("padding:60px;text-align:center;color:#6b7d75;font-size:14px;")}>กำลังโหลด…</div>
        ) : filtered.length === 0 ? (
          <div style={st("padding:60px;text-align:center;color:#6b7d75;font-size:14px;")}>{q ? "ไม่พบรายการที่ตรงกับคำค้นหา" : "ไม่มีรายการในคิวนี้"}</div>
        ) : (
          <>
          <div>
            {paged.map((l, i) => {
              const p = platformInfo(l.platform);
              const busy = leadBusyId === l.id;
              return (
                <div key={l.id} style={st("padding:16px 20px;display:flex;align-items:flex-start;gap:14px;" + (i > 0 ? "border-top:1px solid #eef2f0;" : ""))}>
                  <div style={st("width:36px;height:36px;border-radius:9px;background:#f1f5f3;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;")}>{p.icon}</div>
                  <div style={st("flex:1;min-width:0;")}>
                    <div style={st("display:flex;align-items:center;gap:8px;margin-bottom:4px;")}>
                      <span style={st("font-size:11px;font-weight:600;color:#5a6b63;background:#f1f5f3;padding:2px 8px;border-radius:6px;")}>{p.label}</span>
                      {l.status === "promoted" && <span style={st("font-size:11px;font-weight:600;color:#157347;")}>✓ ส่งเป็นเคส {l.promotedCaseId}</span>}
                      {l.status === "discarded" && <span style={st("font-size:11px;font-weight:600;color:#9aa8a1;")}>✕ ทิ้งแล้ว</span>}
                    </div>
                    <a href={l.url} target="_blank" rel="noreferrer" style={st("font-size:13.5px;font-weight:600;color:#2563a8;text-decoration:none;word-break:break-all;")}>{l.url}</a>
                    {l.rawText && <div style={st("font-size:12.5px;color:#5a6b63;line-height:1.6;margin-top:6px;")}>{l.rawText.length > 200 ? l.rawText.slice(0, 200) + "…" : l.rawText}</div>}
                    <div style={st("font-size:11px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;margin-top:6px;")}>
                      พบเมื่อ {new Date(l.discoveredAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  {l.status === "pending" && (
                    <div style={st("display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;max-width:200px;")}>
                      {l.platform === "website" && (
                        <button onClick={() => handleCollect(l.id)} disabled={busy} title="ดึงเนื้อหาเต็มจากหน้าเว็บแทนข้อความสรุปสั้นๆ"
                          style={st("background:#fff;border:1px solid #c9d8d0;border-radius:8px;padding:8px 12px;font-family:inherit;font-size:12px;font-weight:600;color:#157347;cursor:" + (busy ? "not-allowed" : "pointer") + ";white-space:nowrap;")}>
                          {busy && busyAction === "collect" ? "กำลังดึง…" : "📥 ดึงเนื้อหาเต็ม"}
                        </button>
                      )}
                      <button onClick={() => handlePromote(l.id)} disabled={busy}
                        style={st("background:#157347;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-family:inherit;font-size:12px;font-weight:600;cursor:" + (busy ? "not-allowed" : "pointer") + ";white-space:nowrap;")}>
                        {busy && busyAction === "promote" ? "กำลังวิเคราะห์…" : "✓ ส่งเป็นเคส"}
                      </button>
                      <button onClick={() => handleDiscard(l.id)} disabled={busy}
                        style={st("background:#fff;border:1px solid #d8e2dc;border-radius:8px;padding:8px 14px;font-family:inherit;font-size:12px;font-weight:600;color:#39473f;cursor:" + (busy ? "not-allowed" : "pointer") + ";white-space:nowrap;")}>
                        ทิ้ง
                      </button>
                    </div>
                  )}
                  {l.status !== "pending" && (
                    <button onClick={() => deleteLead(l.id)} title="ลบออกจากคิว"
                      style={st("background:none;border:none;color:#9aa8a1;font-size:16px;cursor:pointer;padding:4px;flex-shrink:0;")}>🗑</button>
                  )}
                </div>
              );
            })}
          </div>
          <Pager page={page} total={filtered.length} onChange={setPage} />
          </>
        )}
      </div>
        );
      })()}
    </div>
  );
}
