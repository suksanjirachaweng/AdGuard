import { describe, it, expect } from "vitest";
import { st } from "./st.js";

describe("st (CSS string → React style object)", () => {
  it("returns undefined for empty input", () => {
    expect(st("")).toBeUndefined();
    expect(st(undefined)).toBeUndefined();
  });

  it("camelCases kebab properties", () => {
    expect(st("background-color:#fff;font-size:13px")).toEqual({ backgroundColor: "#fff", fontSize: "13px" });
  });

  it("keeps values that contain colons (gradients, urls)", () => {
    const o = st("background:linear-gradient(90deg,#2f9e6a,#157347);color:#fff");
    expect(o.background).toBe("linear-gradient(90deg,#2f9e6a,#157347)");
    expect(o.color).toBe("#fff");
  });

  it("ignores trailing semicolons and blank segments", () => {
    expect(st("color:#000;;")).toEqual({ color: "#000" });
  });
});
