# Arrow Space

A browser-based **B2B aerospace parts & aftermarket-services portal** — in the
family of **Satair** and the **Textron Aviation** customer portal. Customers log
in from a computer to search parts, see their pricing and availability, request
quotes, place orders, and track delivery and certification. No installs.

## Status

Early planning. See [`docs/SPEC.md`](docs/SPEC.md) for the product spec,
recommended tech approach, data model, route map, and build roadmap.

## Recommended stack (proposed)

Next.js (App Router) + TypeScript + Tailwind/shadcn-ui · PostgreSQL + Prisma ·
Auth.js · deployed on Vercel. Rationale in the spec.

## Next step

Confirm the approach and answer the open questions in the spec, then scaffold
**Phase 0** (app foundation, schema, auth shell, seed catalog data).
