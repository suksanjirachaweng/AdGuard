import { useState } from "react";
import { st } from "../lib/st.js";
import { riskBadge, statusBadge } from "../lib/badges.js";
import { useApp } from "../store.jsx";

const typeDotColor = { link: "#2563a8", file: "#6b39b8", image: "#2f9e6a" };
const COLS = "104px 1fr 110px 90px 110px 70px 110px 44px";

function exportExcel(cases) {
  const headers = ["Case ID", "รายการโฆษณา", "แหล่งที่มา", "ช่องทาง", "ระดับเสี่ยง", "หน่วยงาน", "จำนวนผิด", "สถานะ"];
  const rows = cases.map((c) => [c.id, c.title, c.source, c.channel, c.riskTh, c.agency, c.violations, c.statusTh]);
  // Build TSV that Excel can open natively (no extra lib needed)
  const tsv = [headers, ...rows].map((r) => r.map((v) => String(v ?? "").replace(/\t/g, " ")).join("\t")).join("\n");
  const blob = new Blob(["﻿" + tsv], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AdGuard-cases-${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

function DeleteDialog({ caseItem, onConfirm, onCancel }) {
  return (
    <div style={st("position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;")}>
      <div style={st("background:#fff;border-radius:16px;padding:28px;max-width:420px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.18);")}>
        <div style={st("width:44px;height:44px;border-radius:11px;background:#fdecea;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:16px;")}>🗑</div>
        <div style={st("font-size:16px;font-weight:700;color:#16241d;margin-bottom:6px;")}>ยืนยันการลบเคส</div>
        <div style={st("font-size:13px;color:#7d8e86;line-height:1.6;margin-bottom:6px;")}>
          คุณต้องการลบเคสนี้ออกจากฐานข้อมูลหรือไม่? การลบไม่สามารถเรียกคืนได้
        </div>
        <div style={st("background:#f7faf8;border:1px solid #e2e9e5;border-radius:10px;padding:12px 14px;margin-bottom:22px;")}>
          <div style={st("font-family:'IBM Plex Mono',monospace;font-size:11px;color:#7d8e86;margin-bottom:3px;")}>{caseItem.id}</div>
          <div style={st("font-size:13.5px;font-weight:600;color:#16241d;")}>{caseItem.title}</div>
        </div>
        <div style={st("display:flex;gap:10px;")}>
          <button onClick={onCancel} className="h-soft"
            style={st("flex:1;background:#fff;border:1px solid #d8e2dc;border-radius:10px;padding:12px;font-family:inherit;font-size:13.5px;font-weight:600;color:#39473f;cursor:pointer;")}>
            ยกเลิก
          </button>
          <button onClick={onConfirm} className="h-dark"
            style={st("flex:1;background:#c0392b;border:none;border-radius:10px;padding:12px;font-family:inherit;font-size:13.5px;font-weight:600;color:#fff;cursor:pointer;")}>
            ลบเคส
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Cases() {
  const { state, setFilter, openCase, deleteCase } = useApp();
  const [confirmItem, setConfirmItem] = useState(null);
  const cc = state.caseCounts || {};
  const filterDefs = [
    { key: "all", label: "ทั้งหมด", count: cc.all || 0 },
    { key: "pending", label: "รอตรวจสอบ", count: cc.pending || 0 },
    { key: "review", label: "กำลังตรวจ", count: cc.review || 0 },
    { key: "referred", label: "ส่งต่อแล้ว", count: cc.referred || 0 },
    { key: "cleared", label: "ปิดเคส", count: cc.cleared || 0 },
  ];
  const filtered = state.caseFilter === "all" ? state.cases : state.cases.filter((c) => c.status === state.caseFilter);
  const pageBtn = "width:32px;height:32px;border:1px solid #d8e2dc;background:#fff;border-radius:7px;color:#39473f;cursor:pointer;";

  const handleDelete = async () => {
    if (!confirmItem) return;
    await deleteCase(confirmItem.id);
    setConfirmItem(null);
  };

  return (
    <div style={st("max-width:1180px;margin:0 auto;animation:fadeUp .4s ease;")}>
      {confirmItem && (
        <DeleteDialog
          caseItem={confirmItem}
          onConfirm={handleDelete}
          onCancel={() => setConfirmItem(null)}
        />
      )}

      <div style={st("display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap;")}>
        {filterDefs.map((f) => {
          const on = state.caseFilter === f.key;
          const btn = "display:flex;align-items:center;gap:8px;border:1px solid " + (on ? "#157347" : "#d8e2dc") + ";background:" + (on ? "#157347" : "#fff") + ";color:" + (on ? "#fff" : "#39473f") + ";border-radius:9px;padding:8px 14px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;";
          const cs = "font-family:'IBM Plex Mono',monospace;font-size:11px;padding:1px 7px;border-radius:9px;background:" + (on ? "rgba(255,255,255,.22)" : "#eef2f0") + ";color:" + (on ? "#fff" : "#7d8e86") + ";";
          return <button key={f.key} onClick={() => setFilter(f.key)} style={st(btn)}>{f.label} <span style={st(cs)}>{f.count}</span></button>;
        })}
        <div style={st("flex:1;")}></div>
        <button className="h-soft" onClick={() => exportExcel(filtered)}
          style={st("display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:9px 14px;font-family:inherit;font-size:12.5px;font-weight:600;color:#39473f;cursor:pointer;")}>
          ⤓ Export Excel
        </button>
      </div>

      <div className="hscroll" style={st("background:#fff;border:1px solid #e2e9e5;border-radius:13px;overflow:hidden;")}>
        <div className="wide-row" style={st("display:grid;grid-template-columns:" + COLS + ";gap:12px;padding:13px 20px;background:#f7faf8;border-bottom:1px solid #eef2f0;font-size:11px;font-weight:600;color:#7d8e86;letter-spacing:.3px;")}>
          <span>CASE ID</span><span>รายการโฆษณา</span><span>ช่องทาง</span><span>ระดับเสี่ยง</span><span>หน่วยงาน</span><span style={st("text-align:center;")}>ผิด</span><span>สถานะ</span><span></span>
        </div>
        {filtered.map((c) => {
          const vcolor = c.violations >= 3 ? "#c0392b" : c.violations >= 1 ? "#a9760e" : "#9aa8a1";
          return (
            <div key={c.id} className="wide-row" style={st("display:grid;grid-template-columns:" + COLS + ";gap:12px;align-items:center;padding:14px 20px;border-bottom:1px solid #f3f6f4;")}>
              <span style={st("font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#7d8e86;cursor:pointer;")} onClick={() => openCase(c.id)}>{c.id}</span>
              <div style={st("min-width:0;cursor:pointer;")} onClick={() => openCase(c.id)}>
                <div style={st("font-size:13px;font-weight:500;color:#16241d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{c.title}</div>
                <div style={st("font-size:10.5px;color:#9aa8a1;font-family:'IBM Plex Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{c.source}</div>
              </div>
              <span style={st("font-size:12px;color:#5a6b63;display:flex;align-items:center;gap:6px;cursor:pointer;")} onClick={() => openCase(c.id)}>
                <span style={st("width:7px;height:7px;border-radius:50%;background:" + (typeDotColor[c.type] || "#9aa8a1") + ";display:inline-block;")}></span>{c.channel}
              </span>
              <span style={st(riskBadge(c.risk) + "cursor:pointer;")} onClick={() => openCase(c.id)}>{c.riskTh}</span>
              <span style={st("font-size:12px;color:#5a6b63;cursor:pointer;")} onClick={() => openCase(c.id)}>{c.agency}</span>
              <span style={st("text-align:center;font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:" + vcolor + ";cursor:pointer;")} onClick={() => openCase(c.id)}>{c.violations}</span>
              <span style={st(statusBadge(c.status) + "cursor:pointer;")} onClick={() => openCase(c.id)}>{c.statusTh}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmItem(c); }}
                title="ลบเคส"
                style={st("background:none;border:1px solid transparent;border-radius:7px;color:#c0b8b5;font-size:15px;cursor:pointer;padding:5px;line-height:1;display:flex;align-items:center;justify-content:center;")}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#c0392b"; e.currentTarget.style.borderColor = "#f5c6bf"; e.currentTarget.style.background = "#fdecea"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#c0b8b5"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "none"; }}
              >🗑</button>
            </div>
          );
        })}
        <div style={st("padding:14px 20px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#7d8e86;")}>
          <span>แสดง {filtered.length} จาก {cc.all || filtered.length} เคส</span>
          <div style={st("display:flex;gap:6px;")}>
            <button style={st("width:32px;height:32px;border:1px solid #d8e2dc;background:#fff;border-radius:7px;color:#9aa8a1;cursor:pointer;")}>‹</button>
            <button style={st("width:32px;height:32px;border:1px solid #157347;background:#157347;border-radius:7px;color:#fff;cursor:pointer;font-weight:600;")}>1</button>
            <button style={st(pageBtn)}>2</button>
            <button style={st(pageBtn)}>3</button>
            <button style={st(pageBtn)}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
