import { Container, ButtonLink } from "./ui";
import { AUTHORIZATIONS } from "@/lib/content";

export function Hero() {
  return (
    <div className="border-b border-line bg-navy text-white">
      <Container className="py-20 sm:py-28">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
          Arrow Space · by Arrow Aviation Services
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          The institutional operations platform of Arrow Aviation Services.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
          Authorized distribution, traceable material, and disciplined export control — for defense,
          government, airlines, operators and MROs. Built on lineage, not listings.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/rfq">Request a quote</ButtonLink>
          <ButtonLink href="/aog" variant="ghost" className="border-white/25 text-white hover:bg-white/10">
            24/7 AOG desk
          </ButtonLink>
        </div>

        <dl className="mt-14 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {AUTHORIZATIONS.map((a) => (
            <div key={a.title} className="bg-navy p-5">
              <dt className="text-sm font-semibold text-white">{a.title}</dt>
              <dd className="mt-1.5 text-sm text-white/70">{a.detail}</dd>
              {a.since ? (
                <dd className="mt-2 font-mono text-xs text-gold">since {a.since}</dd>
              ) : null}
            </div>
          ))}
        </dl>
      </Container>
    </div>
  );
}
