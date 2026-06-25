import "server-only";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/** Walk up from cwd to the monorepo root (dir with pnpm-workspace.yaml). */
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

/** The shared operator intake queue — where ALL channels (web form + portal
 *  reorder) drop RFQs. Runtime state, git-ignored. */
export function intakeDir(): string | null {
  const root = findRepoRoot();
  return root ? join(root, "data", "synthetic", "intake") : null;
}
