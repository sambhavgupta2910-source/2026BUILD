import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { LoginForm } from "@/components/login-form";
import { portalCustomers } from "@/lib/server/dataset";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  const customers = portalCustomers().map((c) => ({ id: c.id, name: c.name, type: c.type }));
  return (
    <Container className="py-20">
      <div className="mx-auto max-w-md rounded-lg border border-line bg-card p-8">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Customer portal</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in to view your fleet and inventory and to reorder parts. Reorders are inquiries —
          Arrow confirms availability, traceability and price.
        </p>
        <div className="mt-6">
          <LoginForm customers={customers} />
        </div>
        <p className="mt-6 text-xs text-muted">
          Demo: these are synthetic accounts. No password — pick one to explore the portal.
        </p>
      </div>
    </Container>
  );
}
