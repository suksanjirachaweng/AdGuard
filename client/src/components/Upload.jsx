import { useRef } from "react";
import { st } from "../lib/st.js";
import { useApp } from "../store.jsx";

const modeDefs = [
  { key: "link", th: "ลิงก์ URL", en: "Website link", icon: "🔗" },
  { key: "file", th: "อัปโหลดไฟล์", en: "PDF / Doc", icon: "📄" },
  { key: "image", th: "รูปภาพ", en: "Image / Ad", icon: "🖼" },
];
const examples = ["slimx-pro-detox", "glowmax.th/serum", "fxmaster-course"];
const scopeTags = [
  { label: "✓ ข้อความโฆษณา", on: true }, { label: "✓ รูปภาพ / ฉลาก", on: true },
  { label: "✓ สรรพคุณเกินจริง", on: true }, { label: "✓ มาตรากฎหมาย", on: true },
  { label: "+ คอมเมนต์ผู้ใช้", on: false },
];
const scopeActive = "display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:500;padding:6px 12px;border-radius:8px;background:#e9f4ee;color:#2c7a4f;border:1px solid #c9e6d4;";
const scopeOff = "display:inline-flex;align-items:center;font-size:11.5px;font-weight:500;padding:6px 12px;border-radius:8px;background:#f1f5f3;color:#9aa8a1;border:1px dashed #d8e2dc;cursor:pointer;";

export default function Upload() {
  const { state, set, analyze, onFileChosen, openAddContext } = useApp();
  const fileRef = useRef(null);
  const isImage = state.inputMode === "image";
  const isDrop = state.inputMode === "file" || state.inputMode === "image";
  const modeBtn = (m) =>
    "display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 10px;border-radius:11px;cursor:pointer;font-family:inherit;transition:all .15s;" +
    (state.inputMode === m.key ? "background:#e9f4ee;border:1.5px solid #2f9e6a;color:#157347;" : "background:#f7faf8;border:1.5px solid #e2e9e5;color:#5a6b63;");

  return (
    <div style={st("max-width:820px;margin:0 auto;animation:fadeUp .4s ease;")}>
      <div style={st("background:#fff;border:1px solid #e2e9e5;border-radius:14px;padding:28px;")}>
        <div style={st("font-size:17px;font-weight:600;color:#16241d;margin-bottom:4px;")}>ส่งข้อมูลเพื่อตรวจสอบ</div>
        <div style={st("font-size:12.5px;color:#7d8e86;margin-bottom:22px;")}>เลือกแหล่งข้อมูล — ระบบ AI จะวิเคราะห์เนื้อหาโฆษณาเทียบกับกฎหมายและประกาศที่เกี่ยวข้อง</div>

        <div style={st("display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px;")}>
          {modeDefs.map((m) => (
            <button key={m.key} onClick={() => set({ inputMode: m.key })} style={st(modeBtn(m))}>
              <span style={st("font-size:22px;line-height:1;")}>{m.icon}</span>
              <span style={st("font-size:13.5px;font-weight:600;")}>{m.th}</span>
              <span style={st("font-size:10.5px;opacity:.7;font-family:'IBM Plex Mono',monospace;")}>{m.en}</span>
            </button>
          ))}
        </div>

        {state.inputMode === "link" && (
          <div style={st("margin-bottom:18px;")}>
            <label style={st("font-size:12px;font-weight:600;color:#39473f;display:block;margin-bottom:8px;")}>URL ของโฆษณา / โพสต์ / หน้าเว็บ</label>
            <div className="fw" style={st("display:flex;align-items:center;gap:10px;background:#f7faf8;border:1.5px solid #d8e2dc;border-radius:10px;padding:3px 4px 3px 14px;")}>
              <span style={st("color:#9aa8a1;font-family:'IBM Plex Mono',monospace;font-size:13px;")}>https://</span>
              <input value={state.linkValue} onChange={(e) => set({ linkValue: e.target.value })} placeholder="shopee.co.th/slimx-pro-detox" style={st("flex:1;border:none;background:none;outline:none;font-family:'IBM Plex Mono',monospace;font-size:13px;padding:11px 0;color:#16241d;")} />
            </div>
            <div style={st("display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;")}>
              <span style={st("font-size:11px;color:#9aa8a1;align-self:center;")}>ตัวอย่าง:</span>
              {examples.map((ex) => (
                <button key={ex} className="h-chip" onClick={() => set({ linkValue: ex })} style={st("background:#eef4f1;border:1px solid #dce6e0;border-radius:7px;padding:5px 11px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#3d6b54;cursor:pointer;")}>{ex}</button>
              ))}
            </div>
          </div>
        )}

        {isDrop && (
          <>
            <div className="h-drop" style={st("border:2px dashed #cdded4;border-radius:12px;background:#f7faf8;padding:42px 24px;text-align:center;margin-bottom:18px;cursor:pointer;")}>
              <div style={st("width:58px;height:58px;border-radius:14px;background:#e6f1ea;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 14px;")}>{isImage ? "🖼" : "📄"}</div>
              <div style={st("font-size:14px;font-weight:600;color:#16241d;margin-bottom:5px;")}>{isImage ? "ลากรูปโฆษณามาวาง หรือเลือกไฟล์" : "ลากไฟล์เอกสารมาวาง หรือเลือกไฟล์"}</div>
              <div style={st("font-size:12px;color:#7d8e86;margin-bottom:16px;")}>{isImage ? "รองรับ JPG, PNG, WEBP · สูงสุด 10 MB" : "รองรับ TXT, MD, CSV (อ่านข้อความ) · PDF/DOCX แนะนำวางข้อความในโหมดลิงก์"}</div>
              <input ref={fileRef} type="file" accept={isImage ? "image/*" : ".txt,.md,.csv,.json,text/*"} style={{ display: "none" }} onChange={(e) => onFileChosen(e.target.files?.[0], state.inputMode)} />
              <button onClick={() => fileRef.current?.click()} style={st("background:#fff;border:1px solid #d8e2dc;border-radius:9px;padding:9px 18px;font-family:inherit;font-size:12.5px;font-weight:600;color:#157347;cursor:pointer;")}>เลือกไฟล์…</button>
            </div>
            {state.fileLoaded && (
              <div style={st("display:flex;align-items:center;gap:12px;background:#eef4f1;border:1px solid #d8e6de;border-radius:10px;padding:12px 14px;margin-bottom:18px;")}>
                <div style={st("width:40px;height:40px;border-radius:8px;background:#2f9e6a;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;")}>{isImage ? "🖼" : "📄"}</div>
                <div style={st("flex:1;min-width:0;")}>
                  <div style={st("font-size:13px;font-weight:600;color:#16241d;")}>{state.fileName || (isImage ? "slimx_ad_banner.jpg" : "document.txt")}</div>
                  <div style={st("font-size:11px;color:#7d8e86;font-family:'IBM Plex Mono',monospace;")}>{state.fileMetaReal || (isImage ? "1280×720 · 248 KB" : "TXT · 12 KB")}</div>
                </div>
                <span style={st("color:#2c7a4f;font-size:18px;")}>✓</span>
              </div>
            )}
          </>
        )}

        <div style={st("border-top:1px solid #eef2f0;padding-top:18px;margin-top:4px;")}>
          <div style={st("display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;")}>
            <div style={st("font-size:12px;font-weight:600;color:#39473f;")}>ขอบเขตการตรวจ · Detection scope</div>
            <button className="h-chip" onClick={openAddContext} style={st("display:flex;align-items:center;gap:6px;background:#eef4f1;border:1px solid #cfe0d6;border-radius:8px;padding:6px 12px;font-family:inherit;font-size:11.5px;font-weight:600;color:#157347;cursor:pointer;")}>✦ เพิ่มบริบทให้ AI</button>
          </div>
          <div style={st("display:flex;flex-wrap:wrap;gap:9px;")}>
            {scopeTags.map((t, i) => <span key={i} style={st(t.on ? scopeActive : scopeOff)}>{t.label}</span>)}
          </div>
        </div>

        <button className="h-dark" onClick={analyze} style={st("display:flex;align-items:center;justify-content:center;gap:9px;width:100%;margin-top:22px;background:#157347;color:#fff;border:none;border-radius:11px;padding:15px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 3px 10px rgba(21,115,71,.3);")}>
          <span style={st("font-size:17px;")}>◎</span> วิเคราะห์ด้วย AI · Run AI Analysis
        </button>
      </div>
    </div>
  );
}
