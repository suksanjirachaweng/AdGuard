import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { rmSync } from "fs";
import request from "supertest";

const DB_FILE = join(tmpdir(), "adguard-api-test-" + Date.now() + ".db");
let app;

beforeAll(async () => {
  process.env.ADGUARD_DB = DB_FILE;
  delete process.env.ANTHROPIC_API_KEY; // exercise the analyze error path
  ({ app } = await import("../server.js"));
});
afterAll(() => {
  for (const ext of ["", "-wal", "-shm"]) { try { rmSync(DB_FILE + ext); } catch {} }
});

describe("GET /api/cases", () => {
  it("returns seeded cases with counts", async () => {
    const res = await request(app).get("/api/cases?filter=all");
    expect(res.status).toBe(200);
    expect(res.body.cases).toHaveLength(8);
    expect(res.body.counts.all).toBe(8);
  });

  it("filters by status", async () => {
    const res = await request(app).get("/api/cases?filter=cleared");
    expect(res.status).toBe(200);
    expect(res.body.cases.every((c) => c.status === "cleared")).toBe(true);
  });
});

describe("GET /api/cases/:id", () => {
  it("returns one case", async () => {
    const res = await request(app).get("/api/cases/AD-2026-0481");
    expect(res.status).toBe(200);
    expect(res.body.title).toContain("SlimX");
  });
  it("404s for a missing case", async () => {
    const res = await request(app).get("/api/cases/NOPE");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/cases/:id/refer", () => {
  it("records a referral and flips status", async () => {
    const res = await request(app).post("/api/cases/AD-2026-0479/refer").send({ agencies: ["fda"], note: "x" });
    expect(res.status).toBe(200);
    const after = await request(app).get("/api/cases/AD-2026-0479");
    expect(after.body.status).toBe("referred");
  });
  it("400s with no agencies", async () => {
    const res = await request(app).post("/api/cases/AD-2026-0481/refer").send({ agencies: [] });
    expect(res.status).toBe(400);
  });
});

describe("context API", () => {
  it("lists, adds, and toggles", async () => {
    const list = await request(app).get("/api/context");
    expect(list.body.items).toHaveLength(5);

    const add = await request(app).post("/api/context").send({ type: "rule", title: "เกณฑ์ทดสอบ", body: "b" });
    expect(add.status).toBe(200);
    expect(add.body.active).toBe(true);

    const toggled = await request(app).patch(`/api/context/${add.body.id}/toggle`);
    expect(toggled.status).toBe(200);
    expect(toggled.body.active).toBe(false);
  });

  it("400s when title is missing", async () => {
    const res = await request(app).post("/api/context").send({ type: "rule", body: "b" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/analyze (no API key)", () => {
  it("returns an error status, not a crash", async () => {
    const res = await request(app).post("/api/analyze").send({ mode: "link", url: "https://x" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.error).toBeDefined();
  });
});
