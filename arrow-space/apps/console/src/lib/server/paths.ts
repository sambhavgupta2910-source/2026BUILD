import "server-only";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export function findRepoRoot(start: string = process.cwd()): string | null {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function syntheticDir(): string | null {
  const root = findRepoRoot();
  return root ? join(root, "data", "synthetic") : null;
}

export function intakeDir(): string | null {
  const root = findRepoRoot();
  return root ? join(root, "data", "synthetic", "intake") : null;
}

export function approvalsDir(): string | null {
  const root = findRepoRoot();
  return root ? join(root, "data", "synthetic", "approvals") : null;
}
