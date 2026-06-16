import { describe, it, expect, beforeAll } from "vitest";
import { newDb } from "pg-mem";

let store;

beforeAll(async () => {
  store = await import("../db.js");
  store._useTestPg(newDb().adapters.createPg()); // in-memory Postgres
  await store.init();
});

describe("db seeding", () => {
  it("seeds 8 cases and 5 context items", async () => {
    expect(await store.listCases("all")).toHaveLength(8);
    expect(await store.listContext()).toHaveLength(5);
  });

  it("computes status counts", async () => {
    const c = await store.countCases();
    expect(c.all).toBe(8);
    expect(c.pending + c.review + c.referred + c.cleared).toBe(8);
  });
});

describe("cases", () => {
  it("getCase returns a seeded row with null analysis", async () => {
    const c = await store.getCase("AD-2026-0481");
    expect(c.title).toContain("SlimX");
    expect(c.riskTh).toBe("เสี่ยงสูง");
    expect(c.analysis).toBeNull();
  });

  it("inserts a case from an analysis with a sequential id", async () => {
    const analysis = {
      title: "ทดสอบ", source: "x.co", channel: "Web", category: "อาหารเสริม",
      riskLevel: "high", riskTh: "เสี่ยงสูง", riskScore: 90, confidence: 95,
      verdictTitle: "v", verdictSummary: "s", extractedText: "t",
      riskDims: [], findings: [], violations: [{ severity: "high", tag: "t", claim: "c", reason: "r", advice: "a", laws: ["l"] }],
    };
    const id = await store.insertCaseFromAnalysis(analysis, { type: "link" });
    expect(id).toMatch(/^AD-2026-\d{4}$/);
    const saved = await store.getCase(id);
    expect(saved.violations).toBe(1);
    expect(saved.analysis.title).toBe("ทดสอบ");
    expect((await store.countCases()).all).toBe(9);
  });

  it("refers a case → status referred + stored referral", async () => {
    expect(await store.referCase("AD-2026-0470", ["fda", "ocpb"], "note")).toBe(true);
    const c = await store.getCase("AD-2026-0470");
    expect(c.status).toBe("referred");
    expect(c.referral.agencies).toEqual(["fda", "ocpb"]);
    expect(await store.referCase("NOPE", ["fda"], "")).toBe(false);
  });
});

describe("context", () => {
  it("inserts and toggles a context item", async () => {
    const item = await store.insertContext({ type: "banned", title: "ใหม่", body: "b", meta: "m" });
    expect(item.id).toBeTypeOf("number");
    expect(item.active).toBe(true);
    const toggled = await store.toggleContext(item.id);
    expect(toggled.active).toBe(false);
  });
});
