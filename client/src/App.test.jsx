import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppProvider } from "./store.jsx";
import App from "./App.jsx";

const CASE = {
  id: "AD-2026-0481", title: "อาหารเสริม SlimX", source: "shopee.co.th/slimx", channel: "Shopee",
  type: "image", risk: "high", riskTh: "เสี่ยงสูง", status: "pending", statusTh: "รอตรวจสอบ",
  date: "14 มิ.ย.", violations: 3, agency: "อย.", score: 92,
};
const CASES_PAYLOAD = { cases: [CASE], counts: { all: 1, pending: 1, review: 0, referred: 0, cleared: 0 } };
const CONTEXT_PAYLOAD = { items: [] };
const CASE_DETAIL = {
  ...CASE,
  analysis: {
    title: "ผลวิเคราะห์ AI", source: "shopee.co.th/slimx", channel: "Shopee", category: "อาหารเสริม",
    riskLevel: "high", riskTh: "เสี่ยงสูง", riskScore: 90, confidence: 95,
    verdictTitle: "พบการโฆษณาเกินจริง", verdictSummary: "สรุปผลโดย AI", extractedText: "ข้อความที่สกัด",
    riskDims: [{ name: "อ้างสรรพคุณเกินจริง", pct: 90, label: "90" }],
    findings: ["ข้อสังเกตที่ 1"],
    violations: [{ severity: "high", tag: "เกินจริง", claim: "เคลม", reason: "เหตุผล", advice: "คำแนะนำ", laws: ["พ.ร.บ.อาหาร ม.40"] }],
  },
};

const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = vi.fn((url) => {
    if (url.startsWith("/api/auth/me")) return ok({ user: { id: 1, email: "u@x.com", name: "ผู้ทดสอบ", role: "admin" } });
    if (url.startsWith("/api/cases/AD-2026-0481")) return ok(CASE_DETAIL);
    if (url.startsWith("/api/cases")) return ok(CASES_PAYLOAD);
    if (url.startsWith("/api/context")) return ok(CONTEXT_PAYLOAD);
    return ok({});
  });
});

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>
  );
}

describe("App routing + store integration", () => {
  it("loads cases from the API and renders them on the dashboard", async () => {
    renderAt("/");
    expect(await screen.findByText("อาหารเสริม SlimX")).toBeInTheDocument();
    // static stat card label is present too
    expect(screen.getByText("เคสทั้งหมด · Total")).toBeInTheDocument();
  });

  it("navigates to the Cases screen when the sidebar item is clicked", async () => {
    renderAt("/");
    await screen.findByText("อาหารเสริม SlimX");
    await userEvent.click(screen.getByRole("button", { name: /ฐานข้อมูลเคส/ }));
    // Cases screen shows filter tabs
    expect(await screen.findByText("ทั้งหมด")).toBeInTheDocument();
    expect(screen.getByText("Export Excel", { exact: false })).toBeInTheDocument();
  });

  it("deep-links to /result/:id and renders the stored AI analysis", async () => {
    renderAt("/result/AD-2026-0481");
    expect(await screen.findByText("พบการโฆษณาเกินจริง")).toBeInTheDocument();
    expect(screen.getByText("สรุปผลโดย AI")).toBeInTheDocument();
    expect(screen.getByText("คำแนะนำ")).toBeInTheDocument();
    // fetched the case detail for the URL id
    expect(global.fetch).toHaveBeenCalledWith("/api/cases/AD-2026-0481");
  });
});
