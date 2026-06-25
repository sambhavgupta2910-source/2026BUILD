/**
 * @arrow-space/engine — operator-side logic that drafts but never decides.
 * Pricing here is always a DRAFT; a human approves before anything is sent
 * (see `canQuoteBeSent` in @arrow-space/schema).
 */
export * from "./quote-builder";
