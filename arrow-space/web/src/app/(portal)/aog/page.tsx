import { Suspense } from "react";
import { PageHeader, Card } from "@/components/ui";
import { AogForm } from "@/components/AogForm";

export const metadata = { title: "AOG Desk & Quote Request" };

export default function AogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AOG Desk & Quote Request"
        description="Aircraft on ground or need pricing on an unlisted part? Submit a request and our desk responds fast — 24/7 for AOG."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Suspense fallback={<div className="text-sm text-slate-500">Loading form…</div>}>
          <AogForm />
        </Suspense>

        <aside className="space-y-4">
          <Card className="border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              AOG hotline
            </div>
            <p className="mt-2 text-sm text-red-900/80">
              24/7 priority desk. Target first response under 20 minutes, with
              exchange and loan options when outright lead time is too long.
            </p>
            <p className="mt-3 mono text-sm font-semibold text-red-700">
              +1 (000) AOG-DESK
            </p>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink">What happens next</h3>
            <ol className="mt-2 space-y-2 text-sm text-slate-600">
              <li>1. Request is logged as an RFQ.</li>
              <li>2. Desk confirms availability, price, and lead time.</li>
              <li>3. You accept the quote to convert it to an order.</li>
            </ol>
          </Card>
        </aside>
      </div>
    </div>
  );
}
