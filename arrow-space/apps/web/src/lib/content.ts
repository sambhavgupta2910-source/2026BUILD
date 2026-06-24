/**
 * Institutional site content. Authorization-led, defense-first, no retail tone.
 * Kept in one place so copy stays consistent and reviewable.
 */

export const ORG = {
  name: "Arrow Space",
  parent: "Arrow Aviation Services Pvt. Ltd.",
  tagline: "The institutional operations platform of Arrow Aviation Services.",
  locations: ["Kolkata (HQ)", "Delhi", "Mumbai", "Sharjah FZE (UAE)"],
} as const;

/** The lineage that leads every page — the moat. */
export const AUTHORIZATIONS = [
  {
    title: "Hawker Beechcraft / Textron",
    detail: "Authorized parts distributor since 2008.",
    since: "2008",
  },
  {
    title: "David Clark",
    detail: "Sole authorized aviation-headset distributor in India since 2005.",
    since: "2005",
  },
  {
    title: "DGCA-approved propeller overhaul",
    detail: "In-house propeller overhaul workshop under DGCA approval.",
    since: "",
  },
  {
    title: "24/7 AOG desk",
    detail: "Always-on response for aircraft-on-ground events.",
    since: "",
  },
] as const;

/** Traceability + quality discipline (the trust spine). */
export const TRACE_STANDARDS = [
  { code: "FAA 8130-3", label: "Airworthiness Approval Tag" },
  { code: "EASA Form 1", label: "Authorised Release Certificate" },
  { code: "CoC", label: "Certificate of Conformance" },
  { code: "ATA Spec 106", label: "Material Certification Form" },
] as const;

export const CAPABILITIES = [
  {
    title: "24/7 AOG response",
    body: "A dedicated desk for aircraft-on-ground events, with response-time targets and fast-path sourcing.",
  },
  {
    title: "Sourcing & distribution",
    body: "Authorized OEM lines and vetted third-party paths, sourced against your condition and lead-time needs.",
  },
  {
    title: "Repairs, overhaul & exchange",
    body: "Managed repair and overhaul, including exchange options where a serviceable unit gets you flying sooner.",
  },
  {
    title: "Quality documentation",
    body: "Every part traceable: 8130-3 / EASA Form 1 / CoC / ATA 106, assembled into a clean trace pack.",
  },
  {
    title: "Export-control competence",
    body: "End-use review and ITAR/EAR classification support for US-origin parts to defense and government users.",
  },
  {
    title: "Logistics",
    body: "International freight, customs documentation, and delivery coordination across the corridor.",
  },
] as const;

/** Defense-first ordering. The GA/flying-school tail is explicitly demoted. */
export const MARKETS = [
  {
    title: "Defense & Government",
    body: "Priority access, export-control discipline, and documentation built for government procurement.",
    priority: 1,
  },
  {
    title: "Airlines & Operators",
    body: "Fleet support and AOG coverage for scheduled and charter operators.",
    priority: 2,
  },
  {
    title: "MRO / Part-145",
    body: "Reliable supply and traceable material for maintenance organisations.",
    priority: 3,
  },
  {
    title: "Business & GA / Flying Schools",
    body: "Self-serve support for the general-aviation tail, including the David Clark headset line.",
    priority: 4,
  },
] as const;

/** Demoted self-serve catalogue. No prices, no cart, no checkout — enquire only. */
export const STORE_ITEMS = [
  {
    brand: "David Clark",
    model: "H10-13.4",
    note: "Passive headset. Authorized David Clark line (India).",
  },
  {
    brand: "David Clark",
    model: "H10-13.4XL",
    note: "Passive headset, extended clamping range.",
  },
  {
    brand: "David Clark",
    model: "DC PRO-X2",
    note: "Hybrid ENC on-ear headset.",
  },
  {
    brand: "Bose",
    model: "A30 Aviation Headset",
    note: "Active noise cancelling. Three modes.",
  },
  {
    brand: "Bose",
    model: "ProFlight Series 2",
    note: "In-ear aviation headset for turbine cockpits.",
  },
] as const;

export const END_USER_TYPES = [
  { value: "defense", label: "Defense" },
  { value: "govt", label: "Government" },
  { value: "airline", label: "Airline" },
  { value: "operator", label: "Operator (charter / corporate)" },
  { value: "mro", label: "MRO / Part-145" },
  { value: "ga", label: "Business / GA / Flying school" },
] as const;

export const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "OH", label: "Overhauled" },
  { value: "SV", label: "Serviceable" },
  { value: "AR", label: "As removed" },
] as const;
