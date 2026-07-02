import { useEffect, useRef, useState } from "react";
import { useApp } from "../store.jsx";
import { st } from "../lib/st.js";

export default function KnowledgeScreen() {
  const { state, loadAlerts, deleteAlert, startCrawl, pollCrawl, set } = useApp();
  const { alerts, alertsTotal, alertsLoading, alertsError, alertSearch,
          crawlJobId, crawlStatus, crawlPolling } = state;
  const me = state.user;
  const isAdmin = me?.role === "admin";
  const [search, setSearch] = useState(alertSearch || "");
  const [openAlert, setOpenAlert] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => { loadAlerts(search); }, []);

  // Poll crawl status while a job is running
  useEffect(() => {
    if (!crawlPolling || !crawlJobId) return;
    pollRef.current = setInterval(() => pollCrawl(crawlJobId), 4000);
    return () => clearInterval(pollRef.current);
  }, [crawlPolling, crawlJobId, pollCrawl]);

  const handleSearch = (v) => {
    setSearch(v);
    set({ alertSearch: v });
    loadAlerts(v);
  };

  const handleCrawl = async () => {
    if (!window.confirm("เริ่มดึงข้อมูลจาก safetyalert.fda.moph.go.th?\n(อาจใช้เวลา 5–15 นาที)")) return;
    await startCrawl();
  };

  const crawling = crawlStatus?.status === "scraping" || crawlStatus?.status === "starting";
  const crawlDone = crawlStatus?.status === "completed";
  const crawlFailed = crawlStatus?.status === "failed";

  return (
    <div style={st("padding:32px 36px;max-width:1100px")}>
      {/* Header */}
      <div style={st("display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px")}>
        <div>
          <div style={st("font-size:22px;font-weight:700;color:#0f3026;margin-bottom:4px")}>
            📚 คลังความรู้ อย.
          </div>
          <div style={st("font-size:13px;color:#6b7d75")}>
            ประกาศเตือนภัย ฉลาก และกฎหมายจาก safetyalert.fda.moph.go.th
            {alertsTotal > 0 && ` · ${alertsTotal.toLocaleString()} รายการ`}
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={handleCrawl}
            disabled={crawling}
            style={st(`padding:10px 20px;background:${crawling ? "#6b7d75" : "#157347"};color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:${crawling ? "default" : "pointer"}`)}
          >
            {crawling ? "⏳ กำลังดึงข้อมูล…" : "🔄 ดึงข้อมูลใหม่จากเว็บ อย."}
          </button>
        )}
      </div>

      {/* Crawl status bar */}
      {crawlStatus && (
        <div style={st(`margin-bottom:20px;padding:14px 18px;border-radius:10px;background:${crawlDone ? "#e9f4ee" : crawlFailed ? "#fdecea" : "#fff8e1"};border:1px solid ${crawlDone ? "#c9e6d4" : crawlFailed ? "#f5c6bf" : "#ffe082"}`)}>
          {crawling && (
            <>
              <div style={st("font-size:14px;font-weight:600;color:#0f3026;margin-bottom:6px")}>
                กำลังดึงข้อมูลจากเว็บ อย.…
              </div>
              <div style={st("font-size:13px;color:#6b7d75")}>
                นำเข้าแล้ว {crawlStatus.imported || 0} หน้า
                {crawlStatus.total > 0 && ` / ประมาณ ${crawlStatus.total} หน้า`}
              </div>
              <div style={st("margin-top:8px;height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden")}>
                <div style={{
                  height: "100%",
                  background: "#157347",
                  borderRadius: 3,
                  width: crawlStatus.total > 0
                    ? `${Math.min(100, Math.round((crawlStatus.done / crawlStatus.total) * 100))}%`
                    : "30%",
                  transition: "width 1s",
                }} />
              </div>
            </>
          )}
          {crawlDone && (
            <div style={st("font-size:14px;color:#157347;font-weight:600")}>
              ✓ ดึงข้อมูลสำเร็จ — นำเข้า {crawlStatus.imported || 0} รายการ
              {crawlStatus.errors > 0 && ` (ข้ามไป ${crawlStatus.errors} รายการที่มีปัญหา)`}
            </div>
          )}
          {crawlFailed && (
            <div style={st("font-size:14px;color:#c0392b;font-weight:600")}>
              ✗ ดึงข้อมูลไม่สำเร็จ{crawlStatus.error ? ` — ${crawlStatus.error}` : ""}
            </div>
          )}
        </div>
      )}

      {/* Search bar */}
      <div style={st("margin-bottom:20px")}>
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="🔍 ค้นหาประกาศเตือนภัย ชื่อผลิตภัณฑ์ บริษัท…"
          style={st("width:100%;padding:10px 16px;border:1px solid #d1dbd5;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box")}
        />
      </div>

      {/* Error */}
      {alertsError && (
        <div style={st("padding:12px 16px;background:#fdecea;border-radius:8px;color:#c0392b;font-size:13px;margin-bottom:16px")}>
          {alertsError}
        </div>
      )}

      {/* Empty state */}
      {!alertsLoading && alerts.length === 0 && (
        <div style={st("text-align:center;padding:60px 20px;color:#6b7d75")}>
          <div style={st("font-size:48px;margin-bottom:12px")}>📭</div>
          {search
            ? <div>ไม่พบประกาศที่ตรงกับ "{search}"</div>
            : <div>
                ยังไม่มีข้อมูลในคลังความรู้<br />
                {isAdmin && <span style={st("font-size:13px")}>กด "ดึงข้อมูลใหม่จากเว็บ อย." เพื่อเริ่มต้น</span>}
              </div>
          }
        </div>
      )}

      {/* Alert list */}
      {alertsLoading && <div style={st("color:#6b7d75;font-size:14px")}>กำลังโหลด…</div>}
      {!alertsLoading && alerts.length > 0 && (
        <div style={st("display:flex;flex-direction:column;gap:10px")}>
          {alerts.map((a) => (
            <div
              key={a.id}
              onClick={() => setOpenAlert(a)}
              style={st("background:#fff;border:1px solid #dde5e0;border-radius:10px;padding:16px 20px;cursor:pointer;transition:box-shadow .15s")}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.1)"}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
            >
              <div style={st("display:flex;align-items:flex-start;justify-content:space-between;gap:12px")}>
                <div style={st("flex:1;min-width:0")}>
                  <div style={st("font-size:14px;font-weight:600;color:#0f3026;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                    {a.title || a.url}
                  </div>
                  <div style={st("font-size:12px;color:#6b7d75;display:flex;gap:12px;flex-wrap:wrap")}>
                    <span>{a.category || "ทั่วไป"}</span>
                    {a.publishedAt && <span>📅 {a.publishedAt}</span>}
                    <span style={st("color:#9aab9f")}>{a.url}</span>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteAlert(a.id); }}
                    style={st("flex-shrink:0;background:none;border:none;cursor:pointer;color:#c0392b;font-size:18px;line-height:1;padding:2px 6px;border-radius:4px")}
                    title="ลบ"
                  >×</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert detail modal */}
      {openAlert && (
        <div
          onClick={() => setOpenAlert(null)}
          style={st("position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px")}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={st("background:#fff;border-radius:14px;width:100%;max-width:720px;max-height:85vh;overflow:auto;padding:28px 32px")}
          >
            <div style={st("font-size:18px;font-weight:700;color:#0f3026;margin-bottom:8px")}>
              {openAlert.title || openAlert.url}
            </div>
            <div style={st("font-size:12px;color:#6b7d75;margin-bottom:16px;display:flex;gap:12px")}>
              <span>{openAlert.category}</span>
              {openAlert.publishedAt && <span>📅 {openAlert.publishedAt}</span>}
            </div>
            <a href={openAlert.url} target="_blank" rel="noopener noreferrer"
              style={st("font-size:12px;color:#157347;display:block;margin-bottom:16px;word-break:break-all")}>
              {openAlert.url}
            </a>
            <div style={st("font-size:13px;color:#222;white-space:pre-wrap;line-height:1.7;border-top:1px solid #eef2f0;padding-top:16px;max-height:50vh;overflow:auto")}>
              {openAlert.contentMd || "(ไม่มีเนื้อหา)"}
            </div>
            <div style={st("margin-top:20px;text-align:right")}>
              <button
                onClick={() => setOpenAlert(null)}
                style={st("padding:8px 20px;background:#eef2f0;border:none;border-radius:8px;font-size:14px;cursor:pointer")}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
