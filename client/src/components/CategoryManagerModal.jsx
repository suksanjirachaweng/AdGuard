import { useState, useCallback } from "react";

const COLOR_PRESETS = [
  { color: "#16743c", bg: "#e8f5e9" },
  { color: "#1a5fa8", bg: "#e3f2fd" },
  { color: "#7b2fbe", bg: "#f3e8ff" },
  { color: "#b06000", bg: "#fff3e0" },
  { color: "#c0392b", bg: "#fdecea" },
  { color: "#2d7d44", bg: "#e8f5e9" },
  { color: "#0097a7", bg: "#e0f7fa" },
  { color: "#6b7d75", bg: "#eef2f0" },
];

function buildTree(categories) {
  const byId = {};
  categories.forEach((c) => { byId[c.id] = { ...c, children: [] }; });
  const roots = [];
  categories.forEach((c) => {
    if (c.parentId && byId[c.parentId]) {
      byId[c.parentId].children.push(byId[c.id]);
    } else {
      roots.push(byId[c.id]);
    }
  });
  return roots;
}

function CategoryNode({ node, depth, onCreate, onRename, onDelete, onChangeColor, busy }) {
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(node.label);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pickColor, setPickColor] = useState(false);
  const [nodeColor, setNodeColor] = useState({ color: node.color, bg: node.bgColor });

  const isBusy = busy === node.id;

  const handleRename = async () => {
    if (!editLabel.trim() || editLabel.trim() === node.label) { setEditing(false); return; }
    await onRename(node.id, { label: editLabel.trim() });
    setEditing(false);
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    await onCreate({ label: newLabel.trim(), parentId: node.id, color: newColor.color, bgColor: newColor.bg });
    setAdding(false);
    setNewLabel("");
  };

  const handleColorChange = async (preset) => {
    setNodeColor(preset);
    setPickColor(false);
    await onChangeColor(node.id, { color: preset.color, bgColor: preset.bg });
  };

  const indent = depth * 20;

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 12px 6px " + (12 + indent) + "px",
        borderRadius: 6, marginBottom: 2,
        background: "#fafafa", border: "1px solid #eee",
      }}>
        {/* color dot + label */}
        <span
          style={{ width: 14, height: 14, borderRadius: "50%", background: nodeColor.color, flexShrink: 0, cursor: "pointer", border: "2px solid #fff", boxShadow: "0 0 0 1px #ccc" }}
          title="เปลี่ยนสี"
          onClick={() => setPickColor((v) => !v)}
        />
        {editing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditing(false); }}
            style={{ flex: 1, padding: "2px 6px", fontSize: 13, border: "1px solid #157347", borderRadius: 4 }}
          />
        ) : (
          <span style={{ flex: 1, fontSize: 14, fontWeight: depth === 0 ? 600 : 400, color: "#1a2e1a" }}>
            {node.label}
            {node.docCount != null && (
              <span style={{ marginLeft: 6, fontSize: 11, color: "#7a9b7a", fontFamily: "IBM Plex Mono, monospace" }}>
                {node.docCount} docs
              </span>
            )}
          </span>
        )}

        {/* action buttons */}
        {!editing && !adding && (
          <div style={{ display: "flex", gap: 4, opacity: isBusy ? 0.5 : 1 }}>
            <button
              onClick={() => setAdding((v) => !v)}
              title="เพิ่มหมวดย่อย"
              style={{ background: "none", border: "1px solid #ccc", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer", color: "#555" }}>
              + ซับ
            </button>
            <button
              onClick={() => { setEditing(true); setEditLabel(node.label); }}
              title="เปลี่ยนชื่อ"
              style={{ background: "none", border: "1px solid #ccc", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer", color: "#555" }}>
              ✏
            </button>
            {confirmDelete ? (
              <>
                <button
                  onClick={async () => { setConfirmDelete(false); await onDelete(node.id); }}
                  style={{ background: "#d64545", color: "#fff", border: "none", borderRadius: 4, padding: "2px 7px", fontSize: 11, cursor: "pointer" }}>
                  ยืนยัน
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ background: "#eee", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer" }}>
                  ยกเลิก
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={node.docCount > 0}
                title={node.docCount > 0 ? `มี ${node.docCount} docs — ย้ายหรือลบก่อน` : "ลบหมวดหมู่"}
                style={{ background: "none", border: "1px solid #e0a0a0", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: node.docCount > 0 ? "not-allowed" : "pointer", color: node.docCount > 0 ? "#ccc" : "#c0392b", opacity: node.docCount > 0 ? 0.4 : 1 }}>
                🗑
              </button>
            )}
          </div>
        )}
        {editing && (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={handleRename} style={{ background: "#157347", color: "#fff", border: "none", borderRadius: 4, padding: "2px 10px", fontSize: 12, cursor: "pointer" }}>บันทึก</button>
            <button onClick={() => setEditing(false)} style={{ background: "#eee", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 12, cursor: "pointer" }}>ยกเลิก</button>
          </div>
        )}
      </div>

      {/* color picker popover */}
      {pickColor && (
        <div style={{ marginLeft: 12 + indent, marginBottom: 6, display: "flex", gap: 6, flexWrap: "wrap", padding: "8px 10px", background: "#fff", border: "1px solid #ddd", borderRadius: 6, width: "fit-content" }}>
          {COLOR_PRESETS.map((p, i) => (
            <span
              key={i}
              onClick={() => handleColorChange(p)}
              style={{ width: 20, height: 20, borderRadius: "50%", background: p.color, cursor: "pointer", border: nodeColor.color === p.color ? "3px solid #333" : "2px solid #fff", boxShadow: "0 0 0 1px #ccc" }}
            />
          ))}
        </div>
      )}

      {/* add sub-category form */}
      {adding && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px 6px " + (12 + indent + 20) + "px", marginBottom: 2 }}>
          <input
            autoFocus
            placeholder="ชื่อหมวดย่อย…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            style={{ flex: 1, padding: "4px 8px", fontSize: 13, border: "1px solid #157347", borderRadius: 4 }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            {COLOR_PRESETS.map((p, i) => (
              <span key={i} onClick={() => setNewColor(p)} style={{ width: 16, height: 16, borderRadius: "50%", background: p.color, cursor: "pointer", border: newColor.color === p.color ? "3px solid #333" : "2px solid #fff", boxShadow: "0 0 0 1px #ccc" }} />
            ))}
          </div>
          <button onClick={handleAdd} style={{ background: "#157347", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>เพิ่ม</button>
          <button onClick={() => setAdding(false)} style={{ background: "#eee", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}>ยกเลิก</button>
        </div>
      )}

      {/* children */}
      {node.children.map((child) => (
        <CategoryNode key={child.id} node={child} depth={depth + 1}
          onCreate={onCreate} onRename={onRename} onDelete={onDelete} onChangeColor={onChangeColor} busy={busy} />
      ))}
    </div>
  );
}

export default function CategoryManagerModal({ categories, onCreate, onUpdate, onDelete, onClose }) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState("");

  const tree = buildTree(categories);

  const wrap = useCallback(async (id, fn) => {
    setBusy(id); setErr("");
    try { await fn(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(null); }
  }, []);

  const handleCreate = useCallback(async (payload) => {
    wrap("new", () => onCreate(payload));
  }, [wrap, onCreate]);

  const handleRename = useCallback(async (id, patch) => {
    wrap(id, () => onUpdate(id, patch));
  }, [wrap, onUpdate]);

  const handleColorChange = useCallback(async (id, patch) => {
    wrap(id, () => onUpdate(id, patch));
  }, [wrap, onUpdate]);

  const handleDelete = useCallback(async (id) => {
    wrap(id, () => onDelete(id));
  }, [wrap, onDelete]);

  const handleAddRoot = async () => {
    if (!newLabel.trim()) return;
    setErr("");
    try {
      await onCreate({ label: newLabel.trim(), parentId: null, color: newColor.color, bgColor: newColor.bg });
      setAdding(false); setNewLabel("");
    } catch (e) { setErr(e.message); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 540, maxWidth: "95vw", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#0f3026" }}>จัดการหมวดหมู่ฐานความรู้</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {err && <div style={{ background: "#fdecea", color: "#c0392b", padding: "8px 12px", borderRadius: 6, marginBottom: 10, fontSize: 13 }}>{err}</div>}

        <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
          {tree.length === 0 && <div style={{ color: "#aaa", textAlign: "center", padding: 24 }}>ยังไม่มีหมวดหมู่</div>}
          {tree.map((node) => (
            <CategoryNode key={node.id} node={node} depth={0}
              onCreate={handleCreate} onRename={handleRename} onDelete={handleDelete} onChangeColor={handleColorChange} busy={busy} />
          ))}
        </div>

        <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
          {adding ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                autoFocus
                placeholder="ชื่อหมวดหมู่ใหม่…"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddRoot(); if (e.key === "Escape") setAdding(false); }}
                style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #157347", borderRadius: 6 }}
              />
              <div style={{ display: "flex", gap: 4 }}>
                {COLOR_PRESETS.map((p, i) => (
                  <span key={i} onClick={() => setNewColor(p)} style={{ width: 18, height: 18, borderRadius: "50%", background: p.color, cursor: "pointer", border: newColor.color === p.color ? "3px solid #333" : "2px solid #fff", boxShadow: "0 0 0 1px #ccc" }} />
                ))}
              </div>
              <button onClick={handleAddRoot} style={{ background: "#157347", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>เพิ่ม</button>
              <button onClick={() => setAdding(false)} style={{ background: "#eee", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 13, cursor: "pointer" }}>ยกเลิก</button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              style={{ width: "100%", padding: "9px 0", background: "#f0f7f0", border: "1px dashed #2f9e6a", borderRadius: 6, color: "#157347", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
              + เพิ่มหมวดหมู่ใหม่
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
