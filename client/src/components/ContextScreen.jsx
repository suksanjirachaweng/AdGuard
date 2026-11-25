import { useRef, useState, useMemo } from "react";
import { st } from "../lib/st.js";
import { ctxTypes } from "../lib/data.js";
import { useApp } from "../store.jsx";
import CategoryManagerModal from "./CategoryManagerModal.jsx";

const BODY_PREVIEW_LEN = 180;
const SHORT_BODY_LEN = 400;

// ─── DocModal (manual context viewer) ────────────────────────────────────────
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
    setBusy(true); setError("");
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
            <div style={st("font-size:12px;color:#7d6420;line-height:1.6;margin-bottom:8px;")}>รายการนี้มีแค่คำอธิบายสั้นๆ ยังไม่มีเอกสารฉบับเต็มแนบไว้ — แนบไฟล์จริง (PDF/TXT/MD/CSV) เพื่อแทนที่เนื้อหาด้านบนด้วยข้อความเต็มฉบับ</div>
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

// ─── KnowledgeDocModal (PDF editor with chunk viewer) ─────────────────────
function KnowledgeDocModal({ doc, categories, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(doc.title);
  const [category, setCategory] = useState(doc.category || "general");
  const [busy, setBusy] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [error, setError] = useState("");
  const [showChunks, setShowChunks] = useState(false);
  const [chunks, setChunks] = useState(null);
  const [chunksLoading, setChunksLoading] = useState(false);
  const dirty = title !== doc.title || category !== doc.category;

  const loadChunks = async () => {
    if (chunks !== null) { setShowChunks((v) => !v); return; }
    setChunksLoading(true);
    try {
      const r = await fetch(`/api/knowledge/docs/${doc.id}/chunks`);
      const d = await r.json();
      setChunks(d.chunks || []);
      setShowChunks(true);
    } catch { setChunks([]); setShowChunks(true); }
    finally { setChunksLoading(false); }
  };

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

  const ci = catInfo(category, categories);

  function flatTree(cats, parentId = null, depth = 0) {
    return cats
      .filter((c) => (c.parentId || null) === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
      .flatMap((c) => [{ ...c, depth }, ...flatTree(cats, c.id, depth + 1)]);
  }
  const flatCats = categories.length > 0
    ? flatTree(categories)
    : Object.entries(CAT_FALLBACK).map(([slug, v], i) => ({ id: slug, slug, label: v.label, color: v.color, bgColor: v.bg, depth: 0, sortOrder: i }));

  return (
    <div onClick={onClose} style={st("position:fixed;inset:0;background:rgba(10,30,22,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:70;padding:24px;")}>
      <div onClick={(e) => e.stopPropagation()} style={st("background:#fff;border-radius:16px;width:560px;max-width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:fadeUp .3s ease;")}>
        <div style={st("padding:20px 24px;border-bottom:1px solid #eef2f0;display:flex;align-items:center;gap:12px;flex-shrink:0;")}>
          <div style={st("width:38px;height:38px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;background:" + ci.bg + ";")} >📄</div>
          <div style={st("flex:1;font-size:15px;font-weight:700;color:#16241d;")}>แก้ไขเอกสาร PDF</div>
          <button onClick={onClose} style={st("background:none;border:none;font-size:22px;color:#9aa8a1;cursor:pointer;line-height:1;")}>×</button>
        </div>
        <div style={st("padding:22px 24px;display:flex;flex-direction:column;gap:18px;overflow-y:auto;flex:1;")}>
          <div>
            <label style={st("display:block;font-size:12px;font-weight:600;color:#5a6b63;margin-bottom:7px;")}>ชื่อเอกสาร</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              style={st("width:100%;box-sizing:border-box;border:1.5px solid #d0dbd4;border-radius:9px;padding:10px 12px;font-family:inherit;font-size:13.5px;color:#16241d;outline:none;")}
              onFocus={(e) => e.target.style.borderColor="#2f9e6a"}
              onBlur={(e) => e.target.style.borderColor="#d0dbd4"} />
          </div>
          <div>
            <label style={st("display:block;font-size:12px;font-weight:600;color:#5a6b63;margin-bottom:7px;")}>หมวดหมู่สินค้า</label>
            <div style={st("display:flex;flex-wrap:wrap;gap:7px;max-height:140px;overflow-y:auto;")}>
              {flatCats.map((c) => {
                const sel = category === c.slug;
                return (
                  <button key={c.id} onClick={() => setCategory(c.slug)}
                    style={st("border-radius:8px;padding:6px 10px;font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;transition:all .15s;border:1.5px solid " + (sel ? c.color : "#e2e9e5") + ";background:" + (sel ? c.bgColor : "#fafcfb") + ";color:" + (sel ? c.color : "#7d8e86") + ";display:flex;align-items:center;gap:5px;")}
                  >
                    {c.depth > 0 && <span style={{ opacity: 0.4, fontSize: 10 }}>{"└".padStart(c.depth, "·")}</span>}
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, display: "inline-block", flexShrink: 0 }} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
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
          <div>
            <button onClick={loadChunks} disabled={chunksLoading}
              style={st("display:flex;align-items:center;gap:7px;background:#f0f7f0;border:1px solid #c5dfc8;border-radius:9px;padding:9px 14px;font-family:inherit;font-size:12.5px;font-weight:600;color:#157347;cursor:pointer;width:100%;")}>
              <span>{showChunks ? "▾" : "▸"}</span>
              <span>{chunksLoading ? "กำลังโหลด…" : `📋 ดู Text Chunks (${doc.chunkCount ?? "?"})`}</span>
            </button>
            {showChunks && chunks && (
              <div style={st("margin-top:8px;border:1px solid #e2e9e5;border-radius:9px;overflow:hidden;")}>
                {chunks.length === 0
                  ? <div style={st("padding:16px;text-align:center;color:#9aa8a1;font-size:13px;")}>ไม่พบ chunks</div>
                  : (
                    <div style={st("max-height:320px;overflow-y:auto;")}>
                      {chunks.map((c, i) => (
                        <div key={c.id} style={st("padding:12px 14px;border-bottom:" + (i < chunks.length - 1 ? "1px solid #f0f4f2" : "none") + ";")}>
                          <div style={st("font-size:10.5px;font-weight:700;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;margin-bottom:5px;")}>chunk #{c.idx + 1} · {c.content.length} chars</div>
                          <div style={st("font-size:12px;color:#39473f;line-height:1.65;white-space:pre-wrap;")}>{c.content}</div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}
          </div>
          {error && <div style={st("color:#c0392b;font-size:12px;background:#fdecea;padding:9px 12px;border-radius:8px;")}>⚠ {error}</div>}
        </div>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CAT_FALLBACK = {
  food:           { label: "อาหาร",          color: "#16743c", bg: "#e8f5e9" },
  drug:           { label: "ยา",             color: "#1a5fa8", bg: "#e3f2fd" },
  cosmetic:       { label: "เครื่องสำอาง",   color: "#7b2fbe", bg: "#f3e8ff" },
  herbal:         { label: "สมุนไพร",         color: "#2d7d44", bg: "#e8f5e9" },
  medical_device: { label: "เครื่องมือแพทย์", color: "#b06000", bg: "#fff3e0" },
  hazardous:      { label: "วัตถุอันตราย",    color: "#c0392b", bg: "#fdecea" },
  general:        { label: "ทั่วไป",          color: "#6b7d75", bg: "#eef2f0" },
};
function catInfo(slug, categories) {
  const found = categories.find((c) => c.slug === slug);
  if (found) return { label: found.label, color: found.color, bg: found.bgColor };
  return CAT_FALLBACK[slug] || CAT_FALLBACK.general;
}

function Toggle({ active, onClick }) {
  return (
    <button onClick={onClick}
      style={st("position:relative;width:40px;height:23px;border-radius:13px;border:none;cursor:pointer;flex-shrink:0;transition:background .2s;background:" + (active ? "#2f9e6a" : "#cdd8d2") + ";")}>
      <span style={st("position:absolute;top:3px;left:" + (active ? "20px" : "3px") + ";width:17px;height:17px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 2px rgba(0,0,0,.2);")} />
    </button>
  );
}

// ─── ManualCard ───────────────────────────────────────────────────────────────
function ManualCard({ item, onOpen, onToggle }) {
  const tp = ctxTypes[item.type] || ctxTypes.law;
  const isLong = (item.body || "").length > BODY_PREVIEW_LEN;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onOpen(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={st("background:#fff;border:1.5px solid " + (hovered ? "#bcd6c8" : "#e8ede9") + ";border-radius:13px;padding:18px;display:flex;flex-direction:column;gap:11px;cursor:pointer;transition:border-color .15s,box-shadow .15s;box-shadow:" + (hovered ? "0 4px 16px rgba(0,0,0,.07)" : "none") + ";")}
    >
      <div style={st("display:flex;align-items:flex-start;gap:12px;")}>
        <div style={st("width:40px;height:40px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;background:" + tp.bg + ";color:" + tp.color + ";")}>{tp.icon}</div>
        <div style={st("flex:1;min-width:0;")}>
          <div style={st("display:flex;align-items:center;gap:5px;margin-bottom:4px;flex-wrap:wrap;")}>
            <span style={st("font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:5px;background:" + tp.bg + ";color:" + tp.color + ";border:1px solid " + tp.bd + ";")}>{tp.label}</span>
            <span style={st("font-size:9.5px;font-weight:600;padding:1px 7px;border-radius:4px;background:#f0f4f2;color:#7d8e86;border:1px solid #dde6e1;")}>manual</span>
          </div>
          <div style={st("font-size:14px;font-weight:700;color:#16241d;line-height:1.3;")}>{item.title}</div>
        </div>
        <Toggle active={item.active} onClick={(e) => { e.stopPropagation(); onToggle(item.id); }} />
      </div>
      <div style={st("font-size:12.5px;color:#5a6b63;line-height:1.65;")}>
        {isLong ? item.body.slice(0, BODY_PREVIEW_LEN) + "…" : item.body}
      </div>
      <div style={st("display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f3f6f4;padding-top:9px;margin-top:auto;")}>
        <span style={st("font-size:10.5px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;")}>{item.meta}</span>
        <span style={st("font-size:11px;font-weight:600;color:" + (item.active ? "#2c7a4f" : "#9aa8a1") + ";")}>{item.active ? "● ใช้งานอยู่" : "○ ปิด"}</span>
      </div>
    </div>
  );
}

// ─── PdfCard ──────────────────────────────────────────────────────────────────
function PdfCard({ doc, categories, onOpen, onToggle }) {
  const ci = catInfo(doc.category || "general", categories);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onOpen(doc)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: "1.5px solid " + (hovered ? ci.color : "#e8ede9"),
        borderLeft: "3.5px solid " + ci.color,
        borderRadius: 13,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 11,
        cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s",
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,.07)" : "none",
      }}
    >
      <div style={st("display:flex;align-items:flex-start;gap:12px;")}>
        <div style={st("width:40px;height:40px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;background:" + ci.bg + ";")} >📄</div>
        <div style={st("flex:1;min-width:0;")}>
          <div style={st("display:flex;align-items:center;gap:5px;margin-bottom:4px;flex-wrap:wrap;")}>
            <span style={st("font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:5px;background:" + ci.bg + ";color:" + ci.color + ";")}>{ci.label}</span>
            <span style={st("font-size:9.5px;font-weight:600;padding:1px 7px;border-radius:4px;background:#f0f4f2;color:#7d8e86;border:1px solid #dde6e1;")}>PDF · {doc.docType || "regulation"}</span>
          </div>
          <div style={st("font-size:14px;font-weight:700;color:#16241d;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;")} title={doc.title}>{doc.title}</div>
        </div>
        <Toggle active={doc.active} onClick={(e) => { e.stopPropagation(); onToggle(doc.id); }} />
      </div>
      {doc.chunkCount != null && (
        <div style={st("display:flex;align-items:center;gap:7px;")}>
          <span style={st("font-size:11px;font-weight:700;color:" + ci.color + ";background:" + ci.bg + ";padding:3px 9px;border-radius:5px;font-family:'IBM Plex Mono',monospace;")}>{doc.chunkCount} chunks</span>
          <span style={st("font-size:11.5px;color:#9aa8a1;")}>ดึงอัตโนมัติตามหมวดสินค้า</span>
        </div>
      )}
      <div style={st("display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f3f6f4;padding-top:9px;margin-top:auto;")}>
        <span style={st("font-size:10.5px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;")}>{doc.sourceFile || ""}</span>
        <span style={st("font-size:11px;font-weight:600;color:" + (doc.active ? "#2c7a4f" : "#9aa8a1") + ";")}>{doc.active ? "● ใช้งานอยู่" : "○ ปิด"}</span>
      </div>
    </div>
  );
}

// ─── GridView ─────────────────────────────────────────────────────────────────
function GridView({ items, sortBy, categories, onOpenDoc, onOpenKnowledgeDoc, onToggleManual, onTogglePdf }) {
  const els = [];
  let lastGroup = null;

  items.forEach((item) => {
    if (sortBy === "category") {
      const group = item._kind === "pdf" ? (item.category || "general") : "__manual__";
      if (group !== lastGroup) {
        lastGroup = group;
        const isManual = group === "__manual__";
        const ci = isManual ? null : catInfo(group, categories);
        els.push(
          <div key={`grp-${group}`} style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, margin: "10px 0 2px" }}>
            {!isManual && <span style={{ width: 10, height: 10, borderRadius: "50%", background: ci.color, display: "inline-block", flexShrink: 0 }} />}
            <span style={{ fontWeight: 700, color: "#16241d", fontSize: 13 }}>{isManual ? "บริบท Manual" : ci.label}</span>
            <div style={{ flex: 1, height: 1, background: "#e8ede9" }} />
          </div>
        );
      }
    }

    if (item._kind === "manual") {
      els.push(<ManualCard key={`m-${item.id}`} item={item} onOpen={onOpenDoc} onToggle={onToggleManual} />);
    } else {
      els.push(<PdfCard key={`k-${item.id}`} doc={item} categories={categories} onOpen={onOpenKnowledgeDoc} onToggle={onTogglePdf} />);
    }
  });

  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{els}</div>;
}

// ─── ListView ─────────────────────────────────────────────────────────────────
function ListView({ items, categories, onOpenDoc, onOpenKnowledgeDoc, onToggleManual, onTogglePdf }) {
  return (
    <div style={st("background:#fff;border:1.5px solid #e8ede9;border-radius:13px;overflow:hidden;")}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const borderB = isLast ? "none" : "1px solid #f3f6f4";

        if (item._kind === "manual") {
          const tp = ctxTypes[item.type] || ctxTypes.law;
          return (
            <div key={`m-${item.id}`}
              onClick={() => onOpenDoc(item)}
              style={st("display:flex;align-items:center;gap:14px;padding:13px 18px;border-bottom:" + borderB + ";cursor:pointer;transition:background .12s;")}
              onMouseEnter={e => e.currentTarget.style.background="#fafcfb"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}
            >
              <div style={st("width:34px;height:34px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;background:" + tp.bg + ";")}>{tp.icon}</div>
              <div style={st("flex:1;min-width:0;")}>
                <div style={st("font-size:13.5px;font-weight:700;color:#16241d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;")}>{item.title}</div>
                <div style={st("font-size:11px;color:#9aa8a1;margin-top:1px;")}>{item.meta}</div>
              </div>
              <span style={st("font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:5px;background:" + tp.bg + ";color:" + tp.color + ";flex-shrink:0;white-space:nowrap;")}>{tp.label}</span>
              <span style={st("font-size:9.5px;font-weight:600;padding:1px 7px;border-radius:4px;background:#f0f4f2;color:#7d8e86;border:1px solid #dde6e1;flex-shrink:0;")}>manual</span>
              <span style={st("font-size:11px;font-weight:600;color:" + (item.active ? "#2c7a4f" : "#9aa8a1") + ";flex-shrink:0;min-width:72px;text-align:right;")}>{item.active ? "● ใช้งาน" : "○ ปิด"}</span>
              <Toggle active={item.active} onClick={e => { e.stopPropagation(); onToggleManual(item.id); }} />
            </div>
          );
        } else {
          const ci = catInfo(item.category || "general", categories);
          return (
            <div key={`k-${item.id}`}
              onClick={() => onOpenKnowledgeDoc(item)}
              style={st("display:flex;align-items:center;gap:14px;padding:13px 18px;border-bottom:" + borderB + ";border-left:3px solid " + ci.color + ";cursor:pointer;transition:background .12s;")}
              onMouseEnter={e => e.currentTarget.style.background="#fafcfb"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}
            >
              <div style={st("width:34px;height:34px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;background:" + ci.bg + ";")} >📄</div>
              <div style={st("flex:1;min-width:0;")}>
                <div style={st("font-size:13.5px;font-weight:700;color:#16241d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;")}>{item.title}</div>
                <div style={st("font-size:11px;color:#9aa8a1;margin-top:1px;font-family:'IBM Plex Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;")}>{item.sourceFile || ""}</div>
              </div>
              <span style={st("font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:5px;background:" + ci.bg + ";color:" + ci.color + ";flex-shrink:0;white-space:nowrap;")}>{ci.label}</span>
              {item.chunkCount != null && (
                <span style={st("font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:5px;background:#f0f4f2;color:#5a6b63;font-family:'IBM Plex Mono',monospace;flex-shrink:0;")}>{item.chunkCount} chunks</span>
              )}
              <span style={st("font-size:11px;font-weight:600;color:" + (item.active ? "#2c7a4f" : "#9aa8a1") + ";flex-shrink:0;min-width:72px;text-align:right;")}>{item.active ? "● ใช้งาน" : "○ ปิด"}</span>
              <Toggle active={item.active} onClick={e => { e.stopPropagation(); onTogglePdf(item.id); }} />
            </div>
          );
        }
      })}
    </div>
  );
}

// ─── ContextScreen (main) ─────────────────────────────────────────────────────
export default function ContextScreen() {
  const {
    state, openAddContext, toggleContext, deleteContext, attachContextFile,
    toggleKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc,
    createCategory, updateCategory, deleteCategory,
  } = useApp();

  const items        = state.contextItems;
  const knowledgeDocs = state.knowledgeDocs || [];
  const categories   = state.categories || [];

  // Modal state
  const [openDoc, setOpenDoc] = useState(null);
  const [openKnowledgeDoc, setOpenKnowledgeDoc] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Filter / sort / view state
  const [search, setSearch]           = useState("");
  const [filterType, setFilterType]   = useState("all");    // all | manual | pdf
  const [filterCat, setFilterCat]     = useState("all");    // all | <slug>
  const [filterStatus, setFilterStatus] = useState("all"); // all | active | inactive
  const [sortBy, setSortBy]           = useState("newest"); // newest | name | name_z | category | chunks
  const [viewMode, setViewMode]       = useState("grid");   // grid | list

  // Stats
  const activeManual  = items.filter(c => c.active).length;
  const activePdf     = knowledgeDocs.filter(d => d.active).length;
  const totalChunks   = knowledgeDocs.reduce((s, d) => s + (d.chunkCount || 0), 0);
  const uniqueCatCount = [...new Set(knowledgeDocs.map(d => d.category || "general"))].length;

  // Category chip counts (before filtering, so counts reflect total PDF docs)
  const catCounts = useMemo(() => {
    const counts = { all: knowledgeDocs.length };
    knowledgeDocs.forEach(d => {
      const cat = d.category || "general";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [knowledgeDocs]);

  // Which category chips to show
  const visibleCats = useMemo(() => {
    const slugsUsed = new Set(knowledgeDocs.map(d => d.category || "general"));
    if (categories.length > 0) return categories.filter(c => slugsUsed.has(c.slug));
    return Object.entries(CAT_FALLBACK)
      .filter(([slug]) => slugsUsed.has(slug))
      .map(([slug, v]) => ({ slug, label: v.label, color: v.color, bgColor: v.bg }));
  }, [categories, knowledgeDocs]);

  // Combined, filtered, sorted list
  const filtered = useMemo(() => {
    let combined = [
      ...items.map(item => ({ ...item, _kind: "manual" })),
      ...knowledgeDocs.map(doc  => ({ ...doc,  _kind: "pdf" })),
    ];

    if (filterType !== "all") combined = combined.filter(x => x._kind === filterType);
    if (filterCat !== "all")  combined = combined.filter(x => x._kind === "pdf" && (x.category || "general") === filterCat);
    if (filterStatus !== "all") combined = combined.filter(x => filterStatus === "active" ? x.active : !x.active);

    const q = search.trim().toLowerCase();
    if (q) combined = combined.filter(x =>
      (x.title || "").toLowerCase().includes(q) ||
      (x.sourceFile || "").toLowerCase().includes(q) ||
      (x.body || "").toLowerCase().includes(q)
    );

    combined.sort((a, b) => {
      if (sortBy === "name")     return (a.title || "").localeCompare(b.title || "", "th");
      if (sortBy === "name_z")   return (b.title || "").localeCompare(a.title || "", "th");
      if (sortBy === "category") {
        const ga = a._kind === "pdf" ? (a.category || "general") : "\xff";
        const gb = b._kind === "pdf" ? (b.category || "general") : "\xff";
        if (ga !== gb) return ga.localeCompare(gb);
        return (a.title || "").localeCompare(b.title || "", "th");
      }
      if (sortBy === "chunks") {
        const ca = a._kind === "pdf" ? (a.chunkCount || 0) : 0;
        const cb = b._kind === "pdf" ? (b.chunkCount || 0) : 0;
        return cb - ca;
      }
      return 0; // newest = insertion order
    });

    return combined;
  }, [items, knowledgeDocs, filterType, filterCat, filterStatus, search, sortBy]);

  const hasFilters = search || filterType !== "all" || filterCat !== "all" || filterStatus !== "all";

  const handleDelete = async (item) => { setOpenDoc(null); await deleteContext(item.id); };
  const handleAttach = async (id, file) => {
    const updated = await attachContextFile(id, file);
    setOpenDoc((cur) => (cur && cur.id === id ? { ...cur, ...updated } : cur));
  };

  // Pill style helper
  const pill = (active, color = "#157347", bg = "#157347") =>
    `border-radius:20px;padding:5px 13px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid ${active ? color : "#e2e9e5"};background:${active ? bg : "#fafcfb"};color:${active ? "#fff" : "#5a6b63"};transition:all .15s;white-space:nowrap;`;

  return (
    <div style={st("max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;")}>

      {/* ── Dark header banner ─────────────────────────────────────────────── */}
      <div className="ctx-intro" style={st("background:linear-gradient(110deg,#0f3026 0%,#164b32 60%,#1a5a3a 100%);border-radius:16px;padding:24px;margin-bottom:16px;")}>
        {/* Top row */}
        <div style={st("display:flex;align-items:flex-start;gap:16px;color:#fff;margin-bottom:20px;")}>
          <div style={st("width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;")}>✦</div>
          <div style={st("flex:1;")}>
            <div style={st("font-size:17px;font-weight:800;margin-bottom:5px;letter-spacing:-.2px;")}>ฐานความรู้และบริบทสำหรับ AI</div>
            <div style={st("font-size:12.5px;color:#9dcdb5;line-height:1.65;max-width:600px;")}>เพิ่มกฎหมาย ประกาศ กฎเกณฑ์ภายใน หรือรายการคำต้องห้าม เพื่อให้ AI ใช้เป็นบริบทประกอบการวิเคราะห์โฆษณา — ยิ่งมีบริบทมาก ผลวิเคราะห์ยิ่งแม่นยำและอ้างอิงได้</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => setShowCategoryManager(true)}
              style={st("display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.1);color:#cde8da;border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:10px 16px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .15s;")}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.18)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,.1)"}
            >📂 จัดการหมวดหมู่</button>
            <button className="h-green" onClick={openAddContext}
              style={st("display:flex;align-items:center;gap:8px;background:#2f9e6a;color:#fff;border:none;border-radius:10px;padding:11px 20px;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,.3);")}>
              ＋ เพิ่มบริบท
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div style={st("display:grid;grid-template-columns:repeat(4,1fr);gap:10px;")}>
          {[
            { value: items.length,               label: "บริบท Manual",    sub: `${activeManual} ใช้งานอยู่`,         icon: "📝" },
            { value: knowledgeDocs.length,        label: "เอกสาร PDF",     sub: `${activePdf} ใช้งานอยู่`,           icon: "📄" },
            { value: totalChunks.toLocaleString(), label: "Text Chunks",   sub: "ในฐานความรู้ RAG",                   icon: "🧩" },
            { value: uniqueCatCount,              label: "หมวดหมู่ที่มีเอกสาร", sub: `จาก ${categories.length || 7} หมวดทั้งหมด`, icon: "📂" },
          ].map((s, i) => (
            <div key={i} style={st("background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);border-radius:11px;padding:14px 16px;")}>
              <div style={st("display:flex;align-items:center;gap:7px;margin-bottom:6px;")}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <span style={st("font-size:11px;color:#9dcdb5;font-weight:600;")}>{s.label}</span>
              </div>
              <div style={st("font-size:24px;font-weight:800;color:#fff;font-family:'IBM Plex Mono',monospace;line-height:1;")}>{s.value}</div>
              <div style={st("font-size:10.5px;color:#6aaa88;margin-top:4px;")}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div style={st("background:#fff;border:1.5px solid #e8ede9;border-radius:13px;padding:14px 16px;margin-bottom:12px;display:flex;flex-direction:column;gap:11px;")}>

        {/* Row 1: Search + Sort + View */}
        <div style={st("display:flex;align-items:center;gap:10px;")}>
          <div style={st("flex:1;position:relative;")}>
            <span style={st("position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:#9aa8a1;pointer-events:none;")}>🔍</span>
            <input
              placeholder="ค้นหาชื่อเอกสาร, ไฟล์, เนื้อหา…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={st("width:100%;box-sizing:border-box;border:1.5px solid #e8ede9;border-radius:9px;padding:9px 36px;font-family:inherit;font-size:13px;color:#16241d;outline:none;transition:border-color .15s;")}
              onFocus={e => e.target.style.borderColor="#2f9e6a"}
              onBlur={e => e.target.style.borderColor="#e8ede9"}
            />
            {search && (
              <button onClick={() => setSearch("")}
                style={st("position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:17px;color:#9aa8a1;line-height:1;padding:0;")}>×</button>
            )}
          </div>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={st("border:1.5px solid #e8ede9;border-radius:9px;padding:9px 10px;font-family:inherit;font-size:12.5px;color:#39473f;background:#fafcfb;cursor:pointer;outline:none;")}>
            <option value="newest">ล่าสุด</option>
            <option value="name">ชื่อ A→Z</option>
            <option value="name_z">ชื่อ Z→A</option>
            <option value="category">หมวดหมู่</option>
            <option value="chunks">Chunks มาก→น้อย</option>
          </select>

          <div style={st("display:flex;border:1.5px solid #e8ede9;border-radius:9px;overflow:hidden;")}>
            {[["grid", "⊞", "Grid"], ["list", "☰", "List"]].map(([v, icon]) => (
              <button key={v} onClick={() => setViewMode(v)} title={v}
                style={st("background:" + (viewMode === v ? "#157347" : "#fafcfb") + ";color:" + (viewMode === v ? "#fff" : "#7d8e86") + ";border:none;padding:8px 14px;font-size:16px;cursor:pointer;transition:all .15s;")}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Type + Status pills */}
        <div style={st("display:flex;align-items:center;gap:7px;flex-wrap:wrap;")}>
          <span style={st("font-size:11px;color:#9aa8a1;font-weight:700;letter-spacing:.3px;")}>ประเภท</span>
          {[
            ["all",    `ทั้งหมด · ${items.length + knowledgeDocs.length}`],
            ["manual", `Manual · ${items.length}`],
            ["pdf",    `PDF · ${knowledgeDocs.length}`],
          ].map(([v, label]) => (
            <button key={v}
              onClick={() => { setFilterType(v); if (v === "manual") setFilterCat("all"); }}
              style={st(pill(filterType === v))}>
              {label}
            </button>
          ))}

          <div style={st("width:1px;height:18px;background:#e8ede9;margin:0 2px;")} />
          <span style={st("font-size:11px;color:#9aa8a1;font-weight:700;letter-spacing:.3px;")}>สถานะ</span>
          {[
            ["all",      "ทั้งหมด"],
            ["active",   "● ใช้งานอยู่"],
            ["inactive", "○ ปิดอยู่"],
          ].map(([v, label]) => (
            <button key={v} onClick={() => setFilterStatus(v)} style={st(pill(filterStatus === v))}>{label}</button>
          ))}
        </div>

        {/* Row 3: Category chips (only for pdf/all) */}
        {filterType !== "manual" && visibleCats.length > 0 && (
          <div style={st("display:flex;align-items:center;gap:7px;flex-wrap:wrap;")}>
            <span style={st("font-size:11px;color:#9aa8a1;font-weight:700;letter-spacing:.3px;")}>หมวด</span>
            <button onClick={() => setFilterCat("all")} style={st(pill(filterCat === "all"))}>
              ทั้งหมด · {catCounts.all || 0}
            </button>
            {visibleCats.map(c => {
              const sel = filterCat === c.slug;
              return (
                <button key={c.slug} onClick={() => setFilterCat(c.slug)}
                  style={st("border-radius:20px;padding:5px 13px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid " + (sel ? c.color : "#e2e9e5") + ";background:" + (sel ? c.bgColor : "#fafcfb") + ";color:" + (sel ? c.color : "#5a6b63") + ";display:flex;align-items:center;gap:5px;transition:all .15s;white-space:nowrap;")}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, display: "inline-block", flexShrink: 0 }} />
                  {c.label} · {catCounts[c.slug] || 0}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Result info bar ────────────────────────────────────────────────── */}
      <div style={st("display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 2px;")}>
        <div style={st("font-size:12.5px;color:#7d8e86;")}>
          แสดง <strong style={{ color: "#16241d" }}>{filtered.length}</strong> จาก {items.length + knowledgeDocs.length} รายการ
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setFilterType("all"); setFilterCat("all"); setFilterStatus("all"); }}
              style={st("margin-left:10px;background:none;border:none;color:#157347;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;text-decoration:underline;padding:0;")}>
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
        {sortBy === "category" && filtered.length > 0 && (
          <span style={st("font-size:11.5px;color:#9aa8a1;")}>จัดกลุ่มตามหมวดหมู่</span>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={st("text-align:center;padding:70px 20px;background:#fff;border:1.5px solid #e8ede9;border-radius:13px;")}>
          <div style={st("font-size:44px;margin-bottom:14px;")}>{search ? "🔍" : "📭"}</div>
          <div style={st("font-size:15px;font-weight:700;color:#5a6b63;margin-bottom:7px;")}>{search ? `ไม่พบ "${search}"` : "ไม่มีรายการที่ตรงกัน"}</div>
          <div style={st("font-size:13px;color:#9aa8a1;margin-bottom:16px;")}>ลองปรับตัวกรอง หรือล้างเพื่อดูทั้งหมด</div>
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setFilterType("all"); setFilterCat("all"); setFilterStatus("all"); }}
              style={st("background:#157347;color:#fff;border:none;border-radius:9px;padding:9px 20px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;")}>
              ล้างตัวกรอง
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <GridView
          items={filtered}
          sortBy={sortBy}
          categories={categories}
          onOpenDoc={setOpenDoc}
          onOpenKnowledgeDoc={setOpenKnowledgeDoc}
          onToggleManual={toggleContext}
          onTogglePdf={toggleKnowledgeDoc}
        />
      ) : (
        <ListView
          items={filtered}
          categories={categories}
          onOpenDoc={setOpenDoc}
          onOpenKnowledgeDoc={setOpenKnowledgeDoc}
          onToggleManual={toggleContext}
          onTogglePdf={toggleKnowledgeDoc}
        />
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {openDoc && (
        <DocModal item={openDoc} onClose={() => setOpenDoc(null)} onDelete={handleDelete} onAttach={handleAttach} />
      )}
      {openKnowledgeDoc && (
        <KnowledgeDocModal
          doc={openKnowledgeDoc}
          categories={categories}
          onClose={() => setOpenKnowledgeDoc(null)}
          onSave={updateKnowledgeDoc}
          onDelete={deleteKnowledgeDoc}
        />
      )}
      {showCategoryManager && (
        <CategoryManagerModal
          categories={categories}
          onCreate={createCategory}
          onUpdate={updateCategory}
          onDelete={deleteCategory}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
    </div>
  );
}
