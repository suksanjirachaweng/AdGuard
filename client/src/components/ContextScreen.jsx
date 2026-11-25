import { useRef, useState } from "react";
import { st } from "../lib/st.js";
import { ctxTypes } from "../lib/data.js";
import { useApp } from "../store.jsx";

const BODY_PREVIEW_LEN = 220;
// Items whose body is still short are most likely stub seed descriptions
// rather than a real uploaded document — offer to attach the real file.
const SHORT_BODY_LEN = 400;

function DocModal({ item, onClose, onDelete, onAttach }) {
  const tp = ctxTypes[item.type] || ctxTypes.law;
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const looksLikeStub = (item.body || "").length < SHORT_BODY_LEN;

  const onPickFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    setError("");
    try { await onAttach(item.id, f); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={st("position:fixed;inset:0;background:rgba(10,30,22,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:70;padding:24px;")}>
      <div onClick={(e) => e.stopPropagation()} style={st("background:#fff;border-radius:16px;width:680px;max-width:100%;max-height:86vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:fadeUp .3s ease;")}>
        <div style={st("padding:20px 24px;border-bottom:1px solid #eef2f0;display:flex;align-items:flex-start;gap:12px;")}>
          <div style={st("width:38px;height:38px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;background:" + tp.bg + ";color:" + tp.color + ";")}>{tp.icon}</div>
          <div style={st("flex:1;min-width:0;")}>
            <div style={st(("display:inline-flex;align-items:center;font-size:10.5px;font-weight:600;padding:2px 9px;border-radius:6px;margin-bottom:5px;background:" + tp.bg + ";color:" + tp.color + ";border:1px solid " + tp.bd + ";"))}>{tp.label}</div>
            <div style={st("font-size:15.5px;font-weight:700;color:#16241d;line-height:1.35;")}>{item.title}</div>
            <div style={st("font-size:11px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;margin-top:4px;")}>{item.meta}</div>
          </div>
          <button onClick={onClose} style={st("background:none;border:none;font-size:22px;color:#9aa8a1;cursor:pointer;line-height:1;")}>×</button>
        </div>
        <div style={st("padding:20px 24px;overflow-y:auto;white-space:pre-wrap;font-size:13px;line-height:1.75;color:#39473f;flex:1;")}>{item.body || "— ไม่มีเนื้อหา —"}</div>
        {looksLikeStub && (
          <div style={st("margin:0 24px 16px;background:#fdf4e3;border:1px solid #f3e0b5;border-radius:10px;padding:12px 14px;")}>
            <div style={st("font-size:12px;color:#7d6420;line-height:1.6;margin-bottom:8px;")}>
              รายการนี้มีแค่คำอธิบายสั้นๆ ยังไม่มีเอกสารฉบับเต็มแนบไว้ — แนบไฟล์จริง (PDF/TXT/MD/CSV) เพื่อแทนที่เนื้อหาด้านบนด้วยข้อความเต็มฉบับ
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.csv" onChange={onPickFile} style={st("display:none;")} />
            <button onClick={() => fileInputRef.current?.click()} disabled={busy}
              style={st("background:#fff;border:1px solid #e0c178;border-radius:8px;padding:7px 13px;font-family:inherit;font-size:12px;font-weight:600;color:#a9760e;cursor:" + (busy ? "not-allowed" : "pointer") + ";")}>
              {busy ? "กำลังอัปโหลด…" : "📎 แนบเอกสารจริง"}
            </button>
            {error && <div style={st("color:#c0392b;font-size:11.5px;margin-top:8px;")}>⚠ {error}</div>}
          </div>
        )}
        {onDelete && (
          <div style={st("padding:14px 24px;border-top:1px solid #eef2f0;display:flex;justify-content:flex-end;")}>
            <button onClick={() => onDelete(item)} style={st("background:#fdecea;color:#c0392b;border:1px solid #f5c6bf;border-radius:8px;padding:8px 16px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;")}>ลบเอกสารนี้</button>
          </div>
        )}
      </div>
    </div>
  );
}

const CAT_LABEL = { food: "อาหาร", drug: "ยา", cosmetic: "เครื่องสำอาง", herbal: "สมุนไพร", medical_device: "เครื่องมือแพทย์", hazardous: "วัตถุอันตราย", general: "ทั่วไป" };
const CAT_COLOR = { food: "#16743c", drug: "#1a5fa8", cosmetic: "#7b2fbe", herbal: "#2d7d44", medical_device: "#b06000", hazardous: "#c0392b", general: "#6b7d75" };
const CAT_BG   = { food: "#e8f5e9", drug: "#e3f2fd", cosmetic: "#f3e8ff", herbal: "#e8f5e9", medical_device: "#fff3e0", hazardous: "#fdecea", general: "#eef2f0" };
const CAT_OPTIONS = ["food","drug","cosmetic","herbal","medical_device","hazardous","general"];

function KnowledgeDocModal({ doc, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(doc.title);
  const [category, setCategory] = useState(doc.category || "general");
  const [busy, setBusy] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [error, setError] = useState("");
  const dirty = title !== doc.title || category !== doc.category;

  const handleSave = async () => {
    if (!title.trim()) return setError("ชื่อเอกสารห้ามว่าง");
    setBusy(true); setError("");
    try { await onSave(doc.id, { title: title.trim(), category }); onClose(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const handleDelete = async () => {
    setBusy(true);
    try { await onDelete(doc.id); onClose(); }
    catch (e) { setError(e.message); setBusy(false); }
  };

  const cat = category || "general";
  const color = CAT_COLOR[cat] || "#6b7d75";
  const bg    = CAT_BG[cat]    || "#eef2f0";

  return (
    <div onClick={onClose} style={st("position:fixed;inset:0;background:rgba(10,30,22,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:70;padding:24px;")}>
      <div onClick={(e) => e.stopPropagation()} style={st("background:#fff;border-radius:16px;width:560px;max-width:100%;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:fadeUp .3s ease;")}>
        {/* Header */}
        <div style={st("padding:20px 24px;border-bottom:1px solid #eef2f0;display:flex;align-items:center;gap:12px;")}>
          <div style={st("width:38px;height:38px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;background:" + bg + ";")}>📄</div>
          <div style={st("flex:1;font-size:15px;font-weight:700;color:#16241d;")}>แก้ไขเอกสาร PDF</div>
          <button onClick={onClose} style={st("background:none;border:none;font-size:22px;color:#9aa8a1;cursor:pointer;line-height:1;")}>×</button>
        </div>

        {/* Body */}
        <div style={st("padding:22px 24px;display:flex;flex-direction:column;gap:18px;")}>
          {/* Title field */}
          <div>
            <label style={st("display:block;font-size:12px;font-weight:600;color:#5a6b63;margin-bottom:7px;")}>ชื่อเอกสาร</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              style={st("width:100%;box-sizing:border-box;border:1.5px solid #d0dbd4;border-radius:9px;padding:10px 12px;font-family:inherit;font-size:13.5px;color:#16241d;outline:none;")}
              onFocus={(e) => e.target.style.borderColor="#2f9e6a"}
              onBlur={(e) => e.target.style.borderColor="#d0dbd4"} />
          </div>

          {/* Category selector */}
          <div>
            <label style={st("display:block;font-size:12px;font-weight:600;color:#5a6b63;margin-bottom:7px;")}>หมวดหมู่สินค้า</label>
            <div style={st("display:grid;grid-template-columns:repeat(4,1fr);gap:8px;")}>
              {CAT_OPTIONS.map((c) => {
                const sel = category === c;
                const cc = CAT_COLOR[c], cb = CAT_BG[c];
                return (
                  <button key={c} onClick={() => setCategory(c)}
                    style={st("border-radius:8px;padding:8px 6px;font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;transition:all .15s;border:1.5px solid " + (sel ? cc : "#e2e9e5") + ";background:" + (sel ? cb : "#fafcfb") + ";color:" + (sel ? cc : "#7d8e86") + ";")}>
                    {CAT_LABEL[c]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* File info */}
          <div style={st("background:#f8faf9;border-radius:9px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start;")}>
            <div style={st("flex:1;")}>
              <div style={st("font-size:11px;font-weight:600;color:#9aa8a1;margin-bottom:3px;")}>ไฟล์ต้นทาง</div>
              <div style={st("font-size:12.5px;color:#5a6b63;font-family:'IBM Plex Mono',monospace;word-break:break-all;")}>{doc.sourceFile || "—"}</div>
            </div>
            <div style={st("text-align:right;flex-shrink:0;")}>
              <div style={st("font-size:11px;font-weight:600;color:#9aa8a1;margin-bottom:3px;")}>Chunks</div>
              <div style={st("font-size:14px;font-weight:700;color:#16241d;font-family:'IBM Plex Mono',monospace;")}>{doc.chunkCount ?? "—"}</div>
            </div>
          </div>

          {error && <div style={st("color:#c0392b;font-size:12px;background:#fdecea;padding:9px 12px;border-radius:8px;")}>⚠ {error}</div>}
        </div>

        {/* Footer */}
        <div style={st("padding:16px 24px;border-top:1px solid #eef2f0;display:flex;align-items:center;justify-content:space-between;gap:10px;")}>
          <div>
            {!delConfirm
              ? <button onClick={() => setDelConfirm(true)} disabled={busy} style={st("background:#fdecea;color:#c0392b;border:1px solid #f5c6bf;border-radius:8px;padding:8px 14px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;")}>ลบเอกสาร</button>
              : <div style={st("display:flex;align-items:center;gap:8px;")}>
                  <span style={st("font-size:12px;color:#c0392b;font-weight:600;")}>ยืนยันลบ?</span>
                  <button onClick={handleDelete} disabled={busy} style={st("background:#c0392b;color:#fff;border:none;border-radius:7px;padding:7px 13px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;")}>{busy ? "กำลังลบ…" : "ลบเลย"}</button>
                  <button onClick={() => setDelConfirm(false)} style={st("background:none;border:1px solid #d0dbd4;border-radius:7px;padding:7px 13px;font-family:inherit;font-size:12px;cursor:pointer;")}>ยกเลิก</button>
                </div>
            }
          </div>
          <div style={st("display:flex;gap:8px;")}>
            <button onClick={onClose} style={st("background:none;border:1px solid #d0dbd4;border-radius:9px;padding:9px 18px;font-family:inherit;font-size:13px;cursor:pointer;color:#5a6b63;")}>ยกเลิก</button>
            <button onClick={handleSave} disabled={!dirty || busy}
              style={st("background:" + (dirty && !busy ? "#157347" : "#b0c9bb") + ";color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:inherit;font-size:13px;font-weight:600;cursor:" + (dirty && !busy ? "pointer" : "default") + ";transition:background .2s;")}>
              {busy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContextScreen() {
  const { state, openAddContext, toggleContext, deleteContext, attachContextFile, toggleKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc } = useApp();
  const items = state.contextItems;
  const knowledgeDocs = state.knowledgeDocs || [];
  const [openDoc, setOpenDoc] = useState(null);
  const [openKnowledgeDoc, setOpenKnowledgeDoc] = useState(null);

  const handleDelete = async (item) => {
    setOpenDoc(null);
    await deleteContext(item.id);
  };
  const handleAttach = async (id, file) => {
    const updated = await attachContextFile(id, file);
    setOpenDoc((cur) => (cur && cur.id === id ? { ...cur, ...updated } : cur));
  };
  const activeCount = items.filter((c) => c.active).length;
  const kActiveCount = knowledgeDocs.filter((d) => d.active).length;
  const totalDocs = knowledgeDocs.reduce((s, d) => s + (d.chunkCount || 0), 0);
  const ctxStats = [
    { value: String(items.length), label: "บริบท AI (manual)" },
    { value: String(activeCount), label: "บริบทใช้งานอยู่" },
    { value: String(knowledgeDocs.length), label: "เอกสาร PDF" },
    { value: String(totalDocs), label: "chunks ในฐานความรู้" },
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

      {/* ── Unified grid: manual context + knowledge docs ── */}
      <div style={st("display:grid;grid-template-columns:1fr 1fr;gap:14px;")}>

        {/* Manual context items */}
        {items.map((c) => {
          const tp = ctxTypes[c.type] || ctxTypes.law;
          const ic = "width:40px;height:40px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;background:" + tp.bg + ";color:" + tp.color + ";";
          const badge = "display:inline-flex;align-items:center;font-size:10.5px;font-weight:600;padding:2px 9px;border-radius:6px;background:" + tp.bg + ";color:" + tp.color + ";border:1px solid " + tp.bd + ";";
          const tog = "position:relative;width:40px;height:23px;border-radius:13px;border:none;cursor:pointer;flex-shrink:0;transition:background .2s;background:" + (c.active ? "#2f9e6a" : "#cdd8d2") + ";";
          const knob = "position:absolute;top:3px;left:" + (c.active ? "20px" : "3px") + ";width:17px;height:17px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 2px rgba(0,0,0,.2);";
          const stStyle = "font-size:11px;font-weight:600;color:" + (c.active ? "#2c7a4f" : "#9aa8a1") + ";";
          const isLong = (c.body || "").length > BODY_PREVIEW_LEN;
          return (
            <div key={"ctx-" + c.id} onClick={() => setOpenDoc(c)}
              style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;padding:18px;display:flex;flex-direction:column;gap:11px;cursor:pointer;transition:border-color .15s,box-shadow .15s;")}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#bcd6c8"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e9e5"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={st("display:flex;align-items:flex-start;gap:12px;")}>
                <div style={st(ic)}>{tp.icon}</div>
                <div style={st("flex:1;min-width:0;")}>
                  <div style={st("display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;")}>
                    <span style={st(badge)}>{tp.label}</span>
                    <span style={st("font-size:9.5px;font-weight:600;padding:1px 7px;border-radius:4px;background:#f0f4f2;color:#7d8e86;border:1px solid #dde6e1;")}>manual</span>
                  </div>
                  <div style={st("font-size:14px;font-weight:600;color:#16241d;line-height:1.35;")}>{c.title}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleContext(c.id); }} style={st(tog)}><span style={st(knob)}></span></button>
              </div>
              <div style={st("font-size:12.5px;color:#5a6b63;line-height:1.6;")}>
                {isLong ? c.body.slice(0, BODY_PREVIEW_LEN) + "…" : c.body}
                {isLong && <span style={st("display:inline-block;margin-left:6px;color:#157347;font-weight:600;font-size:12px;")}>ดูเอกสารเต็ม →</span>}
              </div>
              <div style={st("display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f3f6f4;padding-top:10px;margin-top:auto;")}>
                <span style={st("font-size:11px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;")}>{c.meta}</span>
                <span style={st(stStyle)}>{c.active ? "● ใช้งานอยู่" : "○ ปิดใช้งาน"}</span>
              </div>
            </div>
          );
        })}

        {/* Knowledge PDF docs — same grid, visually distinct by left accent bar */}
        {knowledgeDocs.map((doc) => {
          const cat = doc.category || "general";
          const color = CAT_COLOR[cat] || "#6b7d75";
          const bg    = CAT_BG[cat]    || "#eef2f0";
          const label = CAT_LABEL[cat] || cat;
          const tog = "position:relative;width:40px;height:23px;border-radius:13px;border:none;cursor:pointer;flex-shrink:0;transition:background .2s;background:" + (doc.active ? "#2f9e6a" : "#cdd8d2") + ";";
          const knob = "position:absolute;top:3px;left:" + (doc.active ? "20px" : "3px") + ";width:17px;height:17px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 2px rgba(0,0,0,.2);";
          const stStyle = "font-size:11px;font-weight:600;color:" + (doc.active ? "#2c7a4f" : "#9aa8a1") + ";";
          return (
            <div key={"kd-" + doc.id} onClick={() => setOpenKnowledgeDoc(doc)}
              style={st("background:#fff;border:1px solid #e2e9e5;border-left:3px solid " + color + ";border-radius:13px;padding:18px;display:flex;flex-direction:column;gap:11px;cursor:pointer;transition:border-color .15s,box-shadow .15s;")}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#bcd6c8"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e9e5"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={st("display:flex;align-items:flex-start;gap:12px;")}>
                <div style={st("width:40px;height:40px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;background:" + bg + ";")}>📄</div>
                <div style={st("flex:1;min-width:0;")}>
                  <div style={st("display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;")}>
                    <span style={st("font-size:10.5px;font-weight:600;padding:2px 9px;border-radius:6px;background:" + bg + ";color:" + color + ";border:1px solid " + bg + ";")}>{label}</span>
                    <span style={st("font-size:9.5px;font-weight:600;padding:1px 7px;border-radius:4px;background:#f0f4f2;color:#7d8e86;border:1px solid #dde6e1;")}>PDF · {doc.docType || "manual"}</span>
                  </div>
                  <div style={st("font-size:14px;font-weight:600;color:#16241d;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;")} title={doc.title}>{doc.title}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleKnowledgeDoc(doc.id); }} style={st(tog)}><span style={st(knob)}></span></button>
              </div>
              <div style={st("font-size:12px;color:#9aa8a1;line-height:1.5;")}>{doc.chunkCount != null ? `${doc.chunkCount} text chunks · ระบบดึงอัตโนมัติตามหมวดสินค้าที่วิเคราะห์` : "ระบบดึง chunks อัตโนมัติ"}</div>
              <div style={st("display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f3f6f4;padding-top:10px;margin-top:auto;")}>
                <span style={st("font-size:11px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;")}>{doc.sourceFile || ""}</span>
                <span style={st(stStyle)}>{doc.active ? "● ใช้งานอยู่" : "○ ปิดใช้งาน"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {openDoc && <DocModal item={openDoc} onClose={() => setOpenDoc(null)} onDelete={handleDelete} onAttach={handleAttach} />}
      {openKnowledgeDoc && (
        <KnowledgeDocModal
          doc={openKnowledgeDoc}
          onClose={() => setOpenKnowledgeDoc(null)}
          onSave={updateKnowledgeDoc}
          onDelete={deleteKnowledgeDoc}
        />
      )}
    </div>
  );
}
