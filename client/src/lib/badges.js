export function riskBadge(risk) {
  const m = {
    high:   "background:#fdecea;color:#c0392b;border:1px solid #f5c6bf;",
    medium: "background:#fdf4e3;color:#a9760e;border:1px solid #f3e0b5;",
    low:    "background:#eaf4ee;color:#2c7a4f;border:1px solid #c9e6d4;",
    clear:  "background:#eef2f0;color:#6b7d75;border:1px solid #dde5e0;",
  };
  return "display:inline-flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:600;padding:3px 11px;border-radius:20px;white-space:nowrap;" + (m[risk] || m.clear);
}

export function statusBadge(status) {
  const m = {
    pending:  "background:#fdf4e3;color:#a9760e;",
    review:   "background:#e7f0fb;color:#2563a8;",
    referred: "background:#f0e9fb;color:#6b39b8;",
    cleared:  "background:#eef2f0;color:#6b7d75;",
  };
  return "display:inline-flex;align-items:center;font-size:11px;font-weight:600;padding:3px 9px;border-radius:7px;white-space:nowrap;" + (m[status] || m.cleared);
}

export const dimColor = (pct) => (pct >= 66 ? "#d64545" : pct >= 33 ? "#e0a92e" : "#2c7a4f");
