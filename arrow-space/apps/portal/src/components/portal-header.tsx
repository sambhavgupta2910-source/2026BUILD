import Link from "next/link";
import { Container } from "./ui";
import { currentCustomer } from "@/lib/server/session";
import { LogoutButton } from "./logout-button";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/fleet", label: "My fleet" },
  { href: "/inventory", label: "My inventory" },
  { href: "/orders", label: "Orders" },
];

export async function PortalHeader() {
  const customer = await currentCustomer();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href={customer ? "/" : "/login"} className="flex items-center gap-2.5">
          <span aria-hidden className="block h-5 w-5 rotate-45 border-2 border-navy" />
          <span className="text-base font-semibold tracking-tight text-ink">
            Arrow Space
            <span className="ml-2 hidden text-xs font-normal text-muted sm:inline">Customer Portal</span>
          </span>
        </Link>

        {customer ? (
          <>
            <nav className="hidden items-center gap-6 md:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-sm font-medium text-steel hover:text-ink">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-ink sm:inline">{customer.name}</span>
              <LogoutButton />
            </div>
          </>
        ) : null}
      </Container>
    </header>
  );
}
