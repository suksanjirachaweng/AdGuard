import { describe, it, expect, beforeAll } from "vitest";
import { newDb } from "pg-mem";
import request from "supertest";

let app, agent;
const ADMIN = { email: "tester@adguard.local", password: "test-pass-123" };

beforeAll(async () => {
  process.env.ADMIN_EMAIL = ADMIN.email;       // seed a known admin
  process.env.ADMIN_PASSWORD = ADMIN.password;
  process.env.JWT_SECRET = "test-secret";
  // Inject pg-mem into the shared db module before importing the server.
  const store = await import("../db.js");
  store._useTestPg(newDb().adapters.createPg());
  await store.init();
  ({ app } = await import("../server.js"));
  delete process.env.OPENROUTER_API_KEY;       // delete AFTER import so .env loader doesn't restore it
  // Authenticate once; the agent keeps the session cookie for protected routes.
  agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send(ADMIN);
  expect(res.status).toBe(200);
});

describe("auth", () => {
  it("rejects protected routes without a session", async () => {
    const res = await request(app).get("/api/cases?filter=all");
    expect(res.status).toBe(401);
  });
  it("rejects a bad password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: ADMIN.email, password: "wrong" });
    expect(res.status).toBe(401);
  });
  it("/api/auth/me returns the logged-in user", async () => {
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(ADMIN.email);
    expect(res.body.user.role).toBe("admin");
  });
});

describe("GET /api/cases", () => {
  it("returns seeded cases with counts", async () => {
    const res = await agent.get("/api/cases?filter=all");
    expect(res.status).toBe(200);
    expect(res.body.cases).toHaveLength(8);
    expect(res.body.counts.all).toBe(8);
  });

  it("filters by status", async () => {
    const res = await agent.get("/api/cases?filter=cleared");
    expect(res.status).toBe(200);
    expect(res.body.cases.every((c) => c.status === "cleared")).toBe(true);
  });
});

describe("GET /api/cases/:id", () => {
  it("returns one case", async () => {
    const res = await agent.get("/api/cases/AD-2026-0481");
    expect(res.status).toBe(200);
    expect(res.body.title).toContain("SlimX");
  });
  it("404s for a missing case", async () => {
    const res = await agent.get("/api/cases/NOPE");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/cases/:id/refer", () => {
  it("records a referral and flips status", async () => {
    const res = await agent.post("/api/cases/AD-2026-0479/refer").send({ agencies: ["fda"], note: "x" });
    expect(res.status).toBe(200);
    const after = await agent.get("/api/cases/AD-2026-0479");
    expect(after.body.status).toBe("referred");
  });
  it("400s with no agencies", async () => {
    const res = await agent.post("/api/cases/AD-2026-0481/refer").send({ agencies: [] });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/cases/:id", () => {
  it("deletes an existing case", async () => {
    const list = await agent.get("/api/cases?filter=all");
    const id = list.body.cases[0]?.id;
    if (!id) return;
    const del = await agent.delete(`/api/cases/${id}`);
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);
    const after = await agent.get("/api/cases?filter=all");
    expect(after.body.cases.find((c) => c.id === id)).toBeUndefined();
  });

  it("404s for a non-existent case", async () => {
    const res = await agent.delete("/api/cases/AD-9999-9999");
    expect(res.status).toBe(404);
  });
});

describe("context API", () => {
  it("lists, adds, and toggles", async () => {
    const list = await agent.get("/api/context");
    expect(list.body.items).toHaveLength(5);

    const add = await agent.post("/api/context").send({ type: "rule", title: "เกณฑ์ทดสอบ", body: "b" });
    expect(add.status).toBe(200);
    expect(add.body.active).toBe(true);

    const toggled = await agent.patch(`/api/context/${add.body.id}/toggle`);
    expect(toggled.status).toBe(200);
    expect(toggled.body.active).toBe(false);
  });

  it("400s when title is missing", async () => {
    const res = await agent.post("/api/context").send({ type: "rule", body: "b" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/analyze (no API key)", () => {
  it("returns an error status, not a crash", async () => {
    const res = await agent.post("/api/analyze").send({ mode: "link", url: "https://x" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.error).toBeDefined();
  });
});
