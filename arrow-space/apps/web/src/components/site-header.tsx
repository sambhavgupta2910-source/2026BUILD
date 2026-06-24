import Link from "next/link";
import { Container, ButtonLink } from "./ui";

const NAV = [
  { href: "/capabilities", label: "Capabilities" },
  { href: "/markets", label: "Markets" },
  { href: "/authorizations", label: "Authorizations & Quality" },
  { href: "/aog", label: "AOG Desk" },
  { href: "/store", label: "Store" }, // demoted: last in the rail
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span aria-hidden className="block h-5 w-5 rotate-45 border-2 border-navy" />
          <span className="text-base font-semibold tracking-tight text-ink">
            Arrow Space
            <span className="ml-2 hidden text-xs font-normal text-muted sm:inline">
              by Arrow Aviation Services
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-steel transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ButtonLink href="/aog" variant="ghost" className="hidden sm:inline-flex">
            24/7 AOG
          </ButtonLink>
          <ButtonLink href="/rfq">Request a quote</ButtonLink>
        </div>
      </Container>
    </header>
  );
}
