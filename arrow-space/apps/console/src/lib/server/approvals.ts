import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { approvalsDir } from "./paths";

/**
 * Human price-approval store (runtime, git-ignored). A quote may only be sent
 * to a customer once a human has approved it AND it clears the margin floor
 * (see `canQuoteBeSent`). Approval is recorded here; nothing auto-approves.
 */
export interface Approval {
  rfq_id: string;
  approved_by_human: true;
  approver: string;
  at: string;
}

export function getApproval(rfqId: string): Approval | null {
  const dir = approvalsDir();
  if (!dir) return null;
  const path = join(dir, `${rfqId}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Approval;
  } catch {
    return null;
  }
}

export function recordApproval(rfqId: string, approver: string): Approval | null {
  const dir = approvalsDir();
  if (!dir) return null;
  const approval: Approval = {
    rfq_id: rfqId,
    approved_by_human: true,
    approver,
    at: new Date().toISOString(),
  };
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${rfqId}.json`), JSON.stringify(approval, null, 2) + "\n", "utf8");
    return approval;
  } catch {
    return null;
  }
}
