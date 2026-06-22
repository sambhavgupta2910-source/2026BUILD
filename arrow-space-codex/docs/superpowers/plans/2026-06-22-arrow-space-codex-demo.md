# Arrow Space Codex Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, browser-only Arrow Space clickable prototype that can be compared against Claude's Next.js portal.

**Architecture:** A dependency-light static app keeps the demo portable and instantly reviewable. Shared data utilities live in `src/portal-data.js`, tests cover the core derived metrics and catalog filtering, and the interface consumes the same seeded domain objects in `app.js`.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node's built-in `node:test`.

## Global Constraints

- Browser-only, no installation required for the end user.
- Hybrid model: Arrow-authorized/own paths plus third-party supplier paths.
- Synthetic/mock data only; never present seeded values as real customer data.
- Human approval remains mandatory for pricing, export-control, and compliance release.
- First deliverable is a clickable demo/prototype.

---

### Task 1: Data Utilities

**Files:**
- Create: `package.json`
- Create: `src/portal-data.js`
- Create: `tests/portal-data.test.js`

**Interfaces:**
- Produces: `calculateMetrics(state)`, `filterParts(parts, filters)`, `rankRfqQueue(rfqs)`, and `formatCurrency(value, currency)`.

- [x] **Step 1: Write failing tests for derived metrics and filters**
- [x] **Step 2: Run tests and verify they fail because utilities do not exist**
- [x] **Step 3: Implement the minimal data utilities**
- [x] **Step 4: Run tests and verify they pass**

### Task 2: Clickable Portal

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `app.js`
- Create: `README.md`

**Interfaces:**
- Consumes: utility functions from `src/portal-data.js`.
- Produces: a navigable prototype with dashboard, RFQ queue, catalog, trace packs, AOG desk, and account panels.

- [ ] **Step 1: Create semantic HTML app shell**
- [ ] **Step 2: Add responsive institutional aviation visual system**
- [ ] **Step 3: Render seeded dashboard, RFQ, catalog, traceability, and AOG views**
- [ ] **Step 4: Add filters, tab switching, selected-part detail, and AOG escalation interactions**
- [ ] **Step 5: Smoke check locally**

### Task 3: Verification

**Files:**
- Modify only if verification exposes issues.

- [ ] **Step 1: Run `npm test`**
- [ ] **Step 2: Confirm `index.html` is self-contained enough to open directly**
- [ ] **Step 3: Summarize compare-ready differences versus Claude's approach**
