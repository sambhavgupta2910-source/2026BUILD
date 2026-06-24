import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AogEvent, Rfq } from "@arrow-space/schema";
import { syntheticDir } from "./repo-paths";
import type { BuildResult } from "@/lib/intake";

/**
 * Persists an intake to the synthetic intake queue at
 * data/synthetic/intake/<id>.json. The stored record is the schema-valid RFQ
 * plus a clearly-synthetic submission envelope (contact + free text, which the
 * RFQ schema intentionally does not carry). Returns the path, or null if the
 * environment is read-only (the form still succeeds — Phase 1 is synthetic).
 */
export interface PersistedIntake {
  _synthetic: true;
  _source: "web-intake";
  rfq: Rfq;
  aog_event: AogEvent | null;
  submission: BuildResult["submission"];
}

export function persistIntake(result: BuildResult): string | null {
  const dir = syntheticDir();
  if (!dir) return null;
  const intakeDir = join(dir, "intake");
  const record: PersistedIntake = {
    _synthetic: true,
    _source: "web-intake",
    rfq: result.rfq,
    aog_event: result.aogEvent ?? null,
    submission: result.submission,
  };
  try {
    mkdirSync(intakeDir, { recursive: true });
    const path = join(intakeDir, `${result.rfq.id}.json`);
    writeFileSync(path, JSON.stringify(record, null, 2) + "\n", "utf8");
    return path;
  } catch {
    return null; // read-only FS (e.g. serverless) — don't fail the submission
  }
}
