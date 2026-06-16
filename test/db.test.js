import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { rmSync } from "fs";

const DB_FILE = join(tmpdir(), "adguard-db-test-" + Date.now() + ".db");
let store;

beforeAll(async () => {
  process.env.ADGUARD_DB = DB_FILE;
  store = await import("../db.js");
});
afterAll(() => {
  for (const ext of ["", "-wal", "-shm"]) { try { rmSync(DB_FILE + ext); } catch {} }
});

describe("db seeding", () => {
  it("seeds 8 cases and 5 context items", () => {
    expect(store.listCases("all")).toHaveLength(8);
    expect(store.listContext()).toHaveLength(5);
  });

  it("computes status counts", () => {
    const c = store.countCases();
    expect(c.all).toBe(8);
    expect(c.pending + c.review + c.referred + c.cleared).toBe(8);
  });
});

describe("cases", () => {
  it("getCase returns a seeded row with null analysis", () => {
    const c = store.getCase("AD-2026-0481");
    expect(c.title).toContain("SlimX");
    expect(c.analysis).toBeNull();
  });

  it("inserts a case from an analysis with a sequential id", () => {
    const analysis = {
      title: "ทดสอบ", source: "x.co", channel: "Web", category: "อาหารเสริม",
      riskLevel: "high", riskTh: "เสี่ยงสูง", riskScore: 90, confidence: 95,
      verdictTitle: "v", verdictSummary: "s", extractedText: "t",
      riskDims: [], findings: [], violations: [{ severity: "high", tag: "t", claim: "c", reason: "r", advice: "a", laws: ["l"] }],
    };
    const id = store.insertCaseFromAnalysis(analysis, { type: "link" });
    expect(id).toMatch(/^AD-2026-\d{4}$/);
    const saved = store.getCase(id);
    expect(saved.violations).toBe(1);
    expect(saved.analysis.title).toBe("ทดสอบ");
    expect(store.countCases().all).toBe(9);
  });

  it("refers a case → status referred + stored referral", () => {
    expect(store.referCase("AD-2026-0470", ["fda", "ocpb"], "note")).toBe(true);
    const c = store.getCase("AD-2026-0470");
    expect(c.status).toBe("referred");
    expect(c.referral.agencies).toEqual(["fda", "ocpb"]);
    expect(store.referCase("NOPE", ["fda"], "")).toBe(false);
  });
});

describe("context", () => {
  it("inserts and toggles a context item", () => {
    const item = store.insertContext({ type: "banned", title: "ใหม่", body: "b", meta: "m" });
    expect(item.id).toBeTypeOf("number");
    expect(!!item.active).toBe(true);
    const toggled = store.toggleContext(item.id);
    expect(toggled.active).toBe(false);
  });
});
