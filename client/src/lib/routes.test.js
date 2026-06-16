import { describe, it, expect } from "vitest";
import { pathFor, screenFromPath } from "./routes.js";

describe("routes", () => {
  it("pathFor maps screen keys to paths", () => {
    expect(pathFor("dashboard")).toBe("/");
    expect(pathFor("cases")).toBe("/cases");
    expect(pathFor("nope")).toBe("/"); // fallback
  });

  it("screenFromPath resolves the active screen, including /result/:id", () => {
    expect(screenFromPath("/")).toBe("dashboard");
    expect(screenFromPath("/cases")).toBe("cases");
    expect(screenFromPath("/result/AD-2026-0481")).toBe("result");
    expect(screenFromPath("/unknown")).toBe("dashboard");
  });
});
