import "server-only";
import { cookies } from "next/headers";
import type { Customer } from "@arrow-space/schema";
import { getCustomer } from "./dataset";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Demo session for the synthetic portal. The cookie holds a synthetic
 * customer_id; "sign in" picks a portal-enabled synthetic account. This is NOT
 * production auth — it exists to demonstrate per-account gating on synthetic
 * data. Real auth (SSO / passwordless) swaps in here without touching the rest.
 */
export { SESSION_COOKIE };

export async function currentCustomer(): Promise<Customer | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return getCustomer(id) ?? null;
}
