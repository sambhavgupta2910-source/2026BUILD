import "server-only";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/** Walk up from cwd to the monorepo root (the dir holding pnpm-workspace.yaml).
 *  Returns null if not found (e.g. a read-only deploy without the workspace). */
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
