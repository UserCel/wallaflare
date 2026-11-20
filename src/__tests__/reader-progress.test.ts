import { describe, it, expect } from "vitest";
import { buildCurvedProgressPath, parseCornerRadii } from "../client/reader/progress";

describe("parseCornerRadii", () => {
  it("parses valid JSON corner radii", () => {
    expect(parseCornerRadii('{"tl":36,"tr":36}')).toEqual({ tl: 36, tr: 36 });
    expect(parseCornerRadii('{"tl":28,"tr":0}')).toEqual({ tl: 28, tr: 0 });
  });

  it("clamps negative, NaN, and malformed values to 0", () => {
    expect(parseCornerRadii('{"tl":-10,"tr":"bad"}')).toEqual({ tl: 0, tr: 0 });
    expect(parseCornerRadii("not-json")).toEqual({ tl: 0, tr: 0 });
    expect(parseCornerRadii(null)).toEqual({ tl: 0, tr: 0 });
    expect(parseCornerRadii(undefined)).toEqual({ tl: 0, tr: 0 });
  });
});

describe("buildCurvedProgressPath", () => {
  it("builds a concentric top-edge curved SVG path (default 45 deg half-corner arc)", () => {
    const res = buildCurvedProgressPath(412, 36, 36, 2);
    // aL = 34, aR = 34; 45 deg -> xStart = 2 + 34*(1 - sin45) = 11.96, yStart = 11.96
    expect(res.d).toBe("M 11.96 11.96 A 34 34 0 0 1 36 2 L 376 2 A 34 34 0 0 1 400.04 11.96");
    expect(res.height).toBe(18);
  });

  it("supports full 90 deg corner arc when explicitly requested", () => {
    const res = buildCurvedProgressPath(412, 36, 36, 2, 90);
    expect(res.d).toBe("M 2 36 A 34 34 0 0 1 36 2 L 376 2 A 34 34 0 0 1 410 36");
    expect(res.height).toBe(42);
  });

  it("handles asymmetric corners (e.g. one side 0)", () => {
    const res = buildCurvedProgressPath(400, 30, 0, 2, 90);
    expect(res.d).toBe("M 2 30 A 28 28 0 0 1 30 2 L 400 2");
    expect(res.height).toBe(36);
  });

  it("clamps radii larger than half the viewport width", () => {
    const res = buildCurvedProgressPath(100, 80, 80, 2, 90);
    // Clamped to 50 -> aL = 48, aR = 48; xTopLeft = 50, xTopRight = 50
    expect(res.d).toBe("M 2 50 A 48 48 0 0 1 50 2 L 50 2 A 48 48 0 0 1 98 50");
  });
});
