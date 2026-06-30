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

function DiscoverySection({ onRun, running }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const run = async () => {
    setError("");
    setResult(null);
    try { setResult(await onRun()); }
    catch (e) { setError(e.message); }
  };

  return (
    <div style={st("background:#fff;border:1.5px solid #e2e9e5;border-radius:13px;padding:18px;margin-bottom:18px;")}>
      <div style={st("display:flex;align-items:center;gap:14px;flex-wrap:wrap;")}>
        <div style={st("flex:1;min-width:240px;")}>
          <div style={st("font-size:13.5px;font-weight:700;color:#16241d;margin-bottom:3px;")}>🔍 ค้นหาอัตโนมัติด้วย SERP API</div>
          <div style={st("font-size:12px;color:#7d8e86;line-height:1.6;")}>ค้นหาเว็บไซต์ที่เข้าข่ายอวดอ้างสรรพคุณเกินจริง (อาหาร/ยา) จากชุดคำค้นที่ตั้งไว้ แล้วเพิ่มเข้าคิวอัตโนมัติ</div>
        </div>
        <button onClick={run} disabled={running}
          style={st("background:#0f3026;color:#fff;border:none;border-radius:9px;padding:11px 20px;font-family:inherit;font-size:13px;font-weight:600;cursor:" + (running ? "not-allowed" : "pointer") + ";white-space:nowrap;")}>
          {running ? "กำลังค้นหา…" : "🔍 ค้นหาตอนนี้"}
        </button>
      </div>
      {error && (
        <div style={st("margin-top:12px;background:#fdecea;color:#c0392b;padding:10px 14px;border-radius:8px;font-size:12.5px;")}>
          ⚠ {error}
          {error.includes("SERPAPI_API_KEY") && <div style={st("margin-top:4px;")}>ตั้งค่า SERPAPI_API_KEY ใน .env / Render dashboard ก่อน (สมัครได้ที่ serpapi.com)</div>}
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

export default function Monitoring() {
  const { state, loadLeads, createLead, promoteLead, discardLead, deleteLead, runDiscovery, collectLead } = useApp();
  const { leads, leadsLoading, leadsError, leadBusyId, discoveryRunning } = state;
  const [tab, setTab] = useState("pending");
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState(""); // "promote" | "collect" | "discard"

  useEffect(() => { loadLeads(tab); }, [tab, loadLeads]);

  const handleDiscoveryRun = async () => {
    const result = await runDiscovery();
    if (tab === "pending") loadLeads(tab);
    return result;
  };

  const handlePromote = async (id) => {
    setActionError(""); setBusyAction("promote");
    try { await promoteLead(id); }
    catch (e) { setActionError(e.message); }
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
            ค้นหาเว็บไซต์อัตโนมัติด้วย SERP API หรือเพิ่มลิงก์ที่พบเองก็ได้ — กด "📥 ดึงเนื้อหาเต็ม" (เว็บไซต์ทั่วไป) เพื่อให้ AI วิเคราะห์จากเนื้อหาจริงแทน snippet สั้นๆ — Apify สำหรับ Facebook/TikTok/Shopee ยังรอตรวจสอบ ToS ก่อนเปิดใช้ — "ส่งเป็นเคส" จะรัน AI วิเคราะห์เหมือนหน้าตรวจสอบใหม่ทุกประการ
          </div>
        </div>
      </div>

      <DiscoverySection onRun={handleDiscoveryRun} running={discoveryRunning} />
      <AddLeadForm onAdd={createLead} />

      {actionError && (
        <div style={st("background:#fdecea;color:#c0392b;padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px;")}>⚠ {actionError}</div>
      )}

      <div style={st("display:flex;gap:6px;margin-bottom:16px;")}>
        {STATUS_TABS.map((s) => (
          <button key={s.value} onClick={() => setTab(s.value)}
            style={st("border:1.5px solid " + (tab === s.value ? "#2f9e6a" : "#e2e9e5") + ";background:" + (tab === s.value ? "#e9f4ee" : "#fff") + ";color:" + (tab === s.value ? "#157347" : "#5a6b63") + ";border-radius:8px;padding:7px 14px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;")}>
            {s.label}
          </button>
        ))}
      </div>

      {leadsError && (
        <div style={st("background:#fdecea;color:#c0392b;padding:14px 18px;border-radius:10px;font-size:13.5px;margin-bottom:16px;")}>⚠ {leadsError}</div>
      )}

      <div style={st("background:#fff;border-radius:14px;border:1.5px solid #e8f0ec;overflow:hidden;")}>
        {leadsLoading ? (
          <div style={st("padding:60px;text-align:center;color:#6b7d75;font-size:14px;")}>กำลังโหลด…</div>
        ) : leads.length === 0 ? (
          <div style={st("padding:60px;text-align:center;color:#6b7d75;font-size:14px;")}>ไม่มีรายการในคิวนี้</div>
        ) : (
          <div>
            {leads.map((l, i) => {
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
                        <button onClick={() => handleCollect(l.id)} disabled={busy} title="ดึงเนื้อหาเต็มจากหน้าเว็บแทน snippet สั้นๆ"
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
        )}
      </div>
    </div>
  );
}
