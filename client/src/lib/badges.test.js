import { describe, it, expect } from "vitest";
import { riskBadge, statusBadge, dimColor } from "./badges.js";

describe("badges", () => {
  it("riskBadge picks the colour per level and falls back to clear", () => {
    expect(riskBadge("high")).toContain("#c0392b");
    expect(riskBadge("medium")).toContain("#a9760e");
    expect(riskBadge("weird")).toBe(riskBadge("clear"));
  });

  it("statusBadge maps known statuses", () => {
    expect(statusBadge("referred")).toContain("#6b39b8");
    expect(statusBadge("unknown")).toBe(statusBadge("cleared"));
  });

  it("dimColor thresholds: red / amber / green", () => {
    expect(dimColor(90)).toBe("#d64545");
    expect(dimColor(50)).toBe("#e0a92e");
    expect(dimColor(10)).toBe("#2c7a4f");
  });
});
