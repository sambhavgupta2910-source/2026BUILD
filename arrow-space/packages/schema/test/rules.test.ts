import { describe, it, expect } from "vitest";
import {
  exportControlRequired,
  marginFloorOk,
  canQuoteBeSent,
  PLACEHOLDER_MARGIN_FLOOR_PCT,
} from "../src/index";

describe("export-control rule (US-origin → defense/govt)", () => {
  it("flags US-origin going to defense", () => {
    expect(exportControlRequired("defense", true)).toBe(true);
  });

  it("flags US-origin going to government", () => {
    expect(exportControlRequired("govt", true)).toBe(true);
  });

  it("does not flag non-US-origin even to defense", () => {
    expect(exportControlRequired("defense", false)).toBe(false);
  });

  it("does not flag US-origin to a commercial end-user", () => {
    for (const e of ["airline", "operator", "mro", "ga"] as const) {
      expect(exportControlRequired(e, true)).toBe(false);
    }
  });
});

describe("margin floor on every line", () => {
  it("passes when every line meets the floor", () => {
    expect(marginFloorOk([0.2, 0.18, 0.31])).toBe(true);
  });

  it("fails when any single line is below the floor", () => {
    expect(marginFloorOk([0.2, 0.05, 0.31])).toBe(false);
  });

  it("fails on an empty quote — nothing priced cannot be 'ok'", () => {
    expect(marginFloorOk([])).toBe(false);
  });

  it("honours a caller-supplied floor", () => {
    expect(marginFloorOk([0.1], 0.05)).toBe(true);
    expect(marginFloorOk([0.1], 0.25)).toBe(false);
  });

  it("the placeholder floor is just that — a placeholder, not the real band", () => {
    expect(PLACEHOLDER_MARGIN_FLOOR_PCT).toBeGreaterThan(0);
    expect(PLACEHOLDER_MARGIN_FLOOR_PCT).toBeLessThan(1);
  });
});

describe("no quote leaves the building without floor + human approval", () => {
  it("sendable only when margin_floor_ok AND approved_by_human", () => {
    expect(canQuoteBeSent({ margin_floor_ok: true, approved_by_human: true })).toBe(true);
  });

  it("a sub-floor quote can never be sent, even if a human approved it", () => {
    expect(canQuoteBeSent({ margin_floor_ok: false, approved_by_human: true })).toBe(false);
  });

  it("a floor-passing quote still cannot auto-send without human approval", () => {
    expect(canQuoteBeSent({ margin_floor_ok: true, approved_by_human: false })).toBe(false);
  });
});
