import { st } from "../lib/st.js";
import { ctxTypes } from "../lib/data.js";
import { useApp } from "../store.jsx";

export default function AddContextModal() {
  const { state, set, closeAddContext, saveContext } = useApp();
  if (!state.showAddContext) return null;
  const canSave = state.draftTitle.trim().length > 0;
  const saveStyle = "flex:1;border:none;border-radius:10px;padding:13px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:" + (canSave ? "pointer" : "not-allowed") + ";background:" + (canSave ? "#157347" : "#cdd8d2") + ";color:#fff;" + (canSave ? "box-shadow:0 2px 8px rgba(21,115,71,.3);" : "");

  return (
    <div onClick={closeAddContext} style={st("position:fixed;inset:0;background:rgba(10,30,22,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:60;padding:24px;")}>
      <div onClick={(e) => e.stopPropagation()} style={st("background:#fff;border-radius:16px;width:560px;max-width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:fadeUp .3s ease;")}>
        <div style={st("padding:22px 24px;border-bottom:1px solid #eef2f0;display:flex;align-items:center;gap:12px;")}>
          <div style={st("width:38px;height:38px;border-radius:10px;background:#e9f4ee;display:flex;align-items:center;justify-content:center;font-size:19px;color:#157347;")}>✦</div>
          <div style={st("flex:1;")}>
            <div style={st("font-size:16px;font-weight:700;color:#16241d;")}>เพิ่มบริบทให้ AI</div>
            <div style={st("font-size:11.5px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;")}>New AI context entry</div>
          </div>
          <button onClick={closeAddContext} style={st("background:none;border:none;font-size:22px;color:#9aa8a1;cursor:pointer;line-height:1;")}>×</button>
        </div>
        <div style={st("padding:24px;")}>
          <div style={st("font-size:12.5px;font-weight:600;color:#39473f;margin-bottom:9px;")}>ประเภทบริบท</div>
          <div style={st("display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:20px;")}>
            {Object.keys(ctxTypes).map((k) => {
              const tp = ctxTypes[k];
              const on = state.draftType === k;
              const stl = "display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 6px;border-radius:10px;cursor:pointer;font-family:inherit;transition:all .15s;border:1.5px solid " + (on ? tp.color : "#e2e9e5") + ";background:" + (on ? tp.bg : "#fff") + ";color:" + (on ? tp.color : "#5a6b63") + ";";
              return <button key={k} onClick={() => set({ draftType: k })} style={st(stl)}><span style={st("font-size:17px;")}>{tp.icon}</span><span style={st("font-size:11.5px;font-weight:600;")}>{tp.label}</span></button>;
            })}
          </div>
          <div style={st("margin-bottom:16px;")}>
            <label style={st("font-size:12.5px;font-weight:600;color:#39473f;display:block;margin-bottom:8px;")}>หัวข้อ</label>
            <input className="fc" value={state.draftTitle} onChange={(e) => set({ draftTitle: e.target.value })} placeholder="เช่น คำต้องห้ามกลุ่มเครื่องสำอาง" style={st("width:100%;border:1.5px solid #d8e2dc;border-radius:10px;padding:11px 13px;font-family:inherit;font-size:13px;color:#16241d;outline:none;")} />
          </div>
          <div style={st("margin-bottom:18px;")}>
            <label style={st("font-size:12.5px;font-weight:600;color:#39473f;display:block;margin-bottom:8px;")}>เนื้อหา / รายละเอียด</label>
            <textarea value={state.draftBody} onChange={(e) => set({ draftBody: e.target.value })} placeholder="ระบุข้อความ กฎเกณฑ์ มาตรา หรือรายการคำที่ต้องการให้ AI ใช้เป็นบริบท…" style={st("width:100%;min-height:110px;border:1.5px solid #d8e2dc;border-radius:10px;padding:13px;font-family:inherit;font-size:13px;color:#16241d;resize:vertical;outline:none;line-height:1.6;")}></textarea>
          </div>
          <div style={st("display:flex;align-items:center;gap:10px;background:#f7faf8;border:1px solid #eef2f0;border-radius:10px;padding:12px 14px;margin-bottom:22px;")}>
            <span style={st("font-size:16px;")}>📎</span>
            <span style={st("font-size:12px;color:#7d8e86;flex:1;")}>หรือแนบไฟล์เอกสาร (PDF / DOCX / CSV)</span>
            <button style={st("background:#fff;border:1px solid #d8e2dc;border-radius:8px;padding:7px 13px;font-family:inherit;font-size:11.5px;font-weight:600;color:#157347;cursor:pointer;")}>เลือกไฟล์</button>
          </div>
          <div style={st("display:flex;gap:10px;")}>
            <button onClick={saveContext} style={st(saveStyle)}>บันทึกบริบท</button>
            <button onClick={closeAddContext} style={st("background:#fff;border:1px solid #d8e2dc;border-radius:10px;padding:13px 22px;font-family:inherit;font-size:13.5px;font-weight:600;color:#39473f;cursor:pointer;")}>ยกเลิก</button>
          </div>
        </div>
      </div>
    </div>
  );
}
