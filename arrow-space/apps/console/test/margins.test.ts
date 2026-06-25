import { describe, it, expect } from "vitest";
import type { Part } from "@arrow-space/schema";
import { suggestedMarginPct } from "../src/lib/margins";

const part = (over: Partial<Part>): Part => ({
  id: "p1",
  oem_part_number: "PN-1",
  manufacturer: "Honeywell",
  ata_chapter: 24,
  ata_subchapter: "24-30",
  description: "x",
  applicable_aircraft: [],
  conditions_available: ["NEW"],
  lead_time_tier: "stock",
  us_origin: true,
  ...over,
});

describe("suggestedMarginPct", () => {
  it("returns the midpoint of the part's class band", () => {
    // ATA 34 (Navigation) → avionics band 0.14–0.28 → midpoint 0.21
    expect(suggestedMarginPct(part({ ata_chapter: 34 }))).toBe(0.21);
    // ATA 24 (Electrical) → consumable band 0.20–0.42 → midpoint 0.31
    expect(suggestedMarginPct(part({ ata_chapter: 24 }))).toBe(0.31);
  });

  it("classifies a David Clark headset into the headset band (0.18–0.32 → 0.25)", () => {
    expect(suggestedMarginPct(part({ manufacturer: "David Clark", ata_chapter: 23 }))).toBe(0.25);
  });

  it("is a fraction strictly between 0 and 1", () => {
    const m = suggestedMarginPct(part({ ata_chapter: 32 }));
    expect(m).toBeGreaterThan(0);
    expect(m).toBeLessThan(1);
  });
});
