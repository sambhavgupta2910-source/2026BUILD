import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { CatalogBrowser } from "@/components/CatalogBrowser";

export const metadata = { title: "Parts Catalog" };

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Parts Catalog"
        description="Search the Arrow Space proprietary line and distributed inventory. Pricing shown is your contract list price."
      />
      <Suspense fallback={<div className="text-sm text-slate-500">Loading catalog…</div>}>
        <CatalogBrowser />
      </Suspense>
    </div>
  );
}
