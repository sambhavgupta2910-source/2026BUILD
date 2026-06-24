/**
 * @arrow-space/schema — THE DATA CONTRACT.
 *
 * The single source of truth for every Arrow Space entity. zod schemas are
 * authoritative; TS types are derived with `z.infer`. Everything downstream
 * (synthetic data, intake, engine, compliance, the apps) imports from here.
 */
export * from "./common";
export * from "./part";
export * from "./supplier-path";
export * from "./rfq";
export * from "./quote";
export * from "./trace-doc";
export * from "./aog-event";
export * from "./customer";
export * from "./aircraft";
export * from "./customer-inventory";
export * from "./order";
export * from "./rules";
export * from "./asserts";
