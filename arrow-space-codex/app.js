import {
  calculateMetrics,
  filterParts,
  formatCurrency,
  rankRfqQueue
} from "./src/portal-data.js";
import { initMotion } from "./src/motion.js";

const state = {
  parts: [
    {
      id: "P-001",
      partNumber: "130-384045-1",
      description: "Main wheel brake assembly",
      ata: 32,
      aircraft: "King Air B200 / B300",
      condition: "NEW / OH",
      sourceType: "authorized",
      supplier: "Textron authorized line",
      leadTimeTier: "24h",
      unitPrice: 12800,
      currency: "USD",
      usOrigin: true,
      traceDocs: ["FAA 8130-3", "CoC", "ATA 106"],
      stock: 4
    },
    {
      id: "P-002",
      partNumber: "DC-ONE-X",
      description: "David Clark ONE-X aviation headset",
      ata: 23,
      aircraft: "Business / GA / training fleets",
      condition: "NEW",
      sourceType: "david_clark",
      supplier: "David Clark India distribution",
      leadTimeTier: "stock",
      unitPrice: 895,
      currency: "USD",
      usOrigin: true,
      traceDocs: ["CoC"],
      stock: 28
    },
    {
      id: "P-003",
      partNumber: "45-80123-003",
      description: "Aileron actuator exchange unit",
      ata: 27,
      aircraft: "Hawker 800XP",
      condition: "SV / OH",
      sourceType: "usm_broker",
      supplier: "USM partner network",
      leadTimeTier: "quote",
      unitPrice: 18600,
      currency: "USD",
      usOrigin: true,
      traceDocs: ["FAA 8130-3", "ATA 106"],
      stock: 0
    },
    {
      id: "P-004",
      partNumber: "90-364018-7",
      description: "Propeller governor overhaul kit",
      ata: 61,
      aircraft: "King Air C90 / B200",
      condition: "OH",
      sourceType: "workshop",
      supplier: "DGCA Kolkata workshop",
      leadTimeTier: "48-72h",
      unitPrice: 4200,
      currency: "USD",
      usOrigin: false,
      traceDocs: ["Workshop release", "CoC"],
      stock: 7
    },
    {
      id: "P-005",
      partNumber: "65-12388-19",
      description: "Bleed air valve",
      ata: 36,
      aircraft: "Hawker 900XP",
      condition: "NEW / SV",
      sourceType: "authorized",
      supplier: "Textron authorized line",
      leadTimeTier: "48-72h",
      unitPrice: 9700,
      currency: "USD",
      usOrigin: true,
      traceDocs: ["FAA 8130-3", "CoC"],
      stock: 2
    },
    {
      id: "P-006",
      partNumber: "GSE-28V-400",
      description: "28V portable power cart service kit",
      ata: 24,
      aircraft: "Ground support",
      condition: "NEW",
      sourceType: "gse_alliance",
      supplier: "GSE alliance path",
      leadTimeTier: "stock",
      unitPrice: 1450,
      currency: "USD",
      usOrigin: false,
      traceDocs: ["CoC"],
      stock: 13
    }
  ],
  rfqs: [
    {
      id: "RFQ-2409",
      customer: "IAF maintenance cell",
      endUser: "defense",
      channel: "email",
      partNumber: "130-384045-1",
      qty: 2,
      condition: "NEW",
      urgency: "aog",
      status: "triaged",
      exportControlReview: true,
      receivedMinutesAgo: 12,
      neededBy: "Today 18:00",
      note: "Aircraft grounded; US-origin part requires end-use workflow before release."
    },
    {
      id: "RFQ-2410",
      customer: "Regional airline MRO",
      endUser: "airline",
      channel: "whatsapp",
      partNumber: "65-12388-19",
      qty: 1,
      condition: "SV",
      urgency: "critical",
      status: "new",
      exportControlReview: false,
      receivedMinutesAgo: 8,
      neededBy: "Tomorrow",
      note: "Asking for exchange path and lead time."
    },
    {
      id: "RFQ-2411",
      customer: "Flight training academy",
      endUser: "ga",
      channel: "form",
      partNumber: "DC-ONE-X",
      qty: 12,
      condition: "NEW",
      urgency: "routine",
      status: "quoted",
      exportControlReview: false,
      receivedMinutesAgo: 35,
      neededBy: "Next week",
      note: "Self-serve tail opportunity."
    }
  ],
  quotes: [
    { id: "Q-801", rfqId: "RFQ-2409", total: 25600, marginFloorOk: true, approvedByHuman: false },
    { id: "Q-802", rfqId: "RFQ-2410", total: 11640, marginFloorOk: false, approvedByHuman: false },
    { id: "Q-803", rfqId: "RFQ-2411", total: 10740, marginFloorOk: true, approvedByHuman: true }
  ],
  aogEvents: [
    { id: "AOG-88", rfqId: "RFQ-2409", aircraft: "B300", respondedMinutes: 11, slaMinutes: 20, resolved: false },
    { id: "AOG-87", rfqId: "RFQ-2398", aircraft: "Hawker 800XP", respondedMinutes: 26, slaMinutes: 30, resolved: true }
  ],
  tracePacks: [
    {
      id: "TP-501",
      order: "ORD-7741",
      customer: "Regional airline MRO",
      partNumber: "65-12388-19",
      status: "Ready for human release",
      docs: ["FAA 8130-3", "CoC", "ATA 106"],
      checks: ["Serial captured", "Supplier path verified", "No export escalation"]
    },
    {
      id: "TP-502",
      order: "ORD-7742",
      customer: "Defense aviation unit",
      partNumber: "130-384045-1",
      status: "Blocked: end-use statement",
      docs: ["FAA 8130-3", "CoC"],
      checks: ["US-origin detected", "Defense end user", "Human compliance sign-off required"]
    }
  ],
  selectedPartId: "P-001",
  filters: {
    query: "",
    ata: "all",
    sourceType: "all",
    availability: "all"
  }
};

const viewTitles = {
  dashboard: "Operations control",
  rfqs: "RFQ queue",
  catalog: "Hybrid parts catalog",
  trace: "Traceability control",
  aog: "AOG protocol",
  account: "Customer account"
};

const sourceLabels = {
  authorized: "Authorized",
  david_clark: "David Clark",
  usm_broker: "USM broker",
  workshop: "Workshop",
  gse_alliance: "GSE alliance"
};

// Views render lazily: each builds on first activation and is re-rendered
// only after its underlying state changes (see invalidateViews).
const renderers = {
  dashboard: renderDashboard,
  rfqs: renderRfqs,
  catalog: renderCatalog,
  trace: renderTrace,
  aog: renderAog,
  account: renderAccount
};
const renderedViews = new Set();
let currentView = "dashboard";

bindPublicSite();
bindNavigation();
bindGlobalActions();
updateSidebarSla();
initMotion();

function ensureView(viewName) {
  if (!renderedViews.has(viewName)) {
    renderers[viewName]();
    renderedViews.add(viewName);
  }
}

function invalidateViews(...viewNames) {
  for (const viewName of viewNames) {
    renderedViews.delete(viewName);
  }
  if (viewNames.includes(currentView)) {
    ensureView(currentView);
  }
  updateSidebarSla();
}

function updateSidebarSla() {
  const open = state.aogEvents.filter((event) => !event.resolved);
  const fastest = open.length ? Math.min(...open.map((event) => event.respondedMinutes)) : 0;
  document.querySelector("#sidebar-sla").textContent = `${fastest} min`;
}

function renderDashboard() {
  const metrics = calculateMetrics(state);
  const view = document.querySelector("#view-dashboard");
  view.innerHTML = `
    <div class="grid metrics">
      ${metric("Open RFQs", metrics.openRfqs, "new + triaged")}
      ${metric("Open AOG", metrics.aogOpen, "protocol active", "amber")}
      ${metric("Draft value", formatCurrency(metrics.draftQuoteValue), "awaiting approval")}
      ${metric("Human approvals", metrics.quotesAwaitingApproval, "price cannot auto-send")}
      ${metric("Margin exceptions", metrics.marginExceptions, "floor review")}
      ${metric("AOG SLA hit", `${metrics.aogSlaHitRate}%`, "synthetic month")}
    </div>
    <div class="grid two-col" style="margin-top:16px">
      <section class="card">
        <p class="eyebrow">Priority queue</p>
        <h3>Operator attention</h3>
        <div class="list">
          ${rankRfqQueue(state.rfqs).map(renderRfqCard).join("")}
        </div>
      </section>
      <section class="card">
        <p class="eyebrow">Governance</p>
        <h3>Drafting support with human release</h3>
        <div class="timeline">
          ${timeline("Intake", "Email, WhatsApp, phone, and form traffic normalize into one RFQ object.")}
          ${timeline("Triage", "ATA, condition, urgency, export-control, and clarification flags are assigned.")}
          ${timeline("Quote draft", "Supplier path and margin floor are prepared, never sent automatically.")}
          ${timeline("Traceability", "Release documents are assembled and blocked when compliance needs a sign-off.")}
        </div>
      </section>
    </div>
  `;
}

function renderRfqs() {
  const view = document.querySelector("#view-rfqs");
  view.innerHTML = `
    <div class="grid two-col">
      <section class="card">
        <p class="eyebrow">Live RFQ queue</p>
        <h3>Sorted by urgency, export review, and time waiting</h3>
        <div class="list">
          ${rankRfqQueue(state.rfqs).map(renderRfqCard).join("")}
        </div>
      </section>
      <section class="card">
        <p class="eyebrow">Quote controls</p>
        <table class="data-table">
          <thead><tr><th>Quote</th><th>RFQ</th><th>Total</th><th>State</th></tr></thead>
          <tbody>
            ${state.quotes.map((quote) => `
              <tr>
                <td>${quote.id}</td>
                <td>${quote.rfqId}</td>
                <td>${formatCurrency(quote.total)}</td>
                <td>${quote.approvedByHuman ? "Approved" : quote.marginFloorOk ? "Awaiting human" : "Margin exception"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
    </div>
  `;
}

function renderCatalog() {
  const view = document.querySelector("#view-catalog");

  // The filter row renders once and persists across result updates, so typing
  // in the search field never loses focus.
  view.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="filter-row">
        <input id="part-query" type="search" placeholder="Search part number or description" value="${escapeAttribute(state.filters.query)}" />
        <select id="ata-filter" aria-label="ATA chapter">
          ${option("all", "All ATA", state.filters.ata)}
          ${[23, 24, 27, 32, 36, 61].map((ata) => option(String(ata), `ATA ${ata}`, state.filters.ata)).join("")}
        </select>
        <select id="source-filter" aria-label="Source type">
          ${option("all", "All source paths", state.filters.sourceType)}
          ${Object.entries(sourceLabels).map(([value, label]) => option(value, label, state.filters.sourceType)).join("")}
        </select>
        <select id="availability-filter" aria-label="Availability">
          ${option("all", "Any availability", state.filters.availability)}
          ${option("fast", "Stock / fast", state.filters.availability)}
        </select>
      </div>
    </div>
    <div class="grid two-col" id="catalog-results"></div>
  `;

  bindCatalogFilters();
  renderCatalogResults();
}

function renderCatalogResults() {
  const container = document.querySelector("#catalog-results");
  const parts = filterParts(state.parts, state.filters);
  const selected = state.parts.find((part) => part.id === state.selectedPartId) || parts[0] || state.parts[0];

  container.innerHTML = `
    <section class="card">
      <p class="eyebrow">${parts.length} matching parts</p>
      <div class="list">
        ${parts.map((part) => `
          <button class="row-card clickable ${part.id === selected.id ? "selected" : ""}" type="button" data-part-id="${part.id}">
            <span>
              <strong>${part.partNumber}</strong><br />
              <span class="muted">${part.description} · ATA ${part.ata}</span>
            </span>
            <span class="status-pill ${part.leadTimeTier === "quote" ? "amber" : "green"}">${part.leadTimeTier}</span>
          </button>
        `).join("")}
      </div>
    </section>
    <aside class="card detail-panel">
      <p class="eyebrow">Part record</p>
      <h3>${selected.partNumber}</h3>
      <p class="muted">${selected.description}</p>
      <div class="chips">
        <span class="status-pill blue">${sourceLabels[selected.sourceType]}</span>
        <span class="status-pill">${selected.condition}</span>
        <span class="status-pill ${selected.usOrigin ? "amber" : "green"}">${selected.usOrigin ? "US origin" : "Non-US origin"}</span>
      </div>
      <table class="data-table" style="margin-top:14px">
        <tbody>
          <tr><th>Aircraft</th><td>${selected.aircraft}</td></tr>
          <tr><th>Supplier</th><td>${selected.supplier}</td></tr>
          <tr><th>Guide price</th><td>${formatCurrency(selected.unitPrice, selected.currency)}</td></tr>
          <tr><th>Stock</th><td>${selected.stock}</td></tr>
          <tr><th>Docs</th><td>${selected.traceDocs.join(", ")}</td></tr>
        </tbody>
      </table>
      <div class="action-row" style="margin-top:14px">
        <button class="primary-button" type="button" data-draft="${selected.id}">Draft quote</button>
        <button class="ghost-button" type="button" data-trace="${selected.id}">Build trace pack</button>
      </div>
    </aside>
  `;

  bindCatalogResults();
}

function renderTrace() {
  const view = document.querySelector("#view-trace");
  view.innerHTML = `
    <div class="grid two-col">
      <section class="card">
        <p class="eyebrow">Document control</p>
        <h3>Release status by order</h3>
        <div class="list">
          ${state.tracePacks.map((pack) => `
            <article class="row-card">
              <span>
                <strong>${pack.id} · ${pack.order}</strong><br />
                <span class="muted">${pack.customer} · ${pack.partNumber}</span>
              </span>
              <span class="status-pill ${pack.status.includes("Blocked") ? "red" : "green"}">${pack.status}</span>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="card">
        <p class="eyebrow">AS9120-aligned checks</p>
        ${state.tracePacks.map((pack) => `
          <h3>${pack.id}</h3>
          <div class="chips">${pack.docs.map((doc) => `<span class="status-pill blue">${doc}</span>`).join("")}</div>
          <ul>
            ${pack.checks.map((check) => `<li>${check}</li>`).join("")}
          </ul>
        `).join("")}
      </section>
    </div>
  `;
}

function renderAog() {
  const view = document.querySelector("#view-aog");
  view.innerHTML = `
    <div class="grid three-col">
      ${state.aogEvents.map((event) => `
        <article class="card">
          <p class="eyebrow">${event.id}</p>
          <h3>${event.aircraft}</h3>
          <span class="metric-value">${event.respondedMinutes} min</span>
          <p class="muted">SLA target ${event.slaMinutes} min · ${event.resolved ? "resolved" : "open"}</p>
          <button class="small-button" type="button" data-escalate="${event.id}">${event.resolved ? "View record" : "Escalate to principal"}</button>
        </article>
      `).join("")}
      <article class="card">
        <p class="eyebrow">Response sequence</p>
        <h3>AOG operating protocol</h3>
        <div class="timeline">
          ${timeline("Confirm tail + grounding", "Capture aircraft, base, required-by time, and acceptable condition.")}
          ${timeline("Secure source path", "Check authorized stock first, then exchange / USM corridor.")}
          ${timeline("Compliance hold", "Defense + US-origin pauses at end-use and classification review.")}
        </div>
      </article>
    </div>
  `;

  view.querySelectorAll("[data-escalate]").forEach((button) => {
    button.addEventListener("click", () => showToast(`${button.dataset.escalate}: principal escalation note prepared.`));
  });
}

function renderAccount() {
  const view = document.querySelector("#view-account");
  view.innerHTML = `
    <div class="grid two-col">
      <section class="card">
        <p class="eyebrow">Customer portal preview</p>
        <h3>Regional airline MRO</h3>
        <table class="data-table">
          <tbody>
            <tr><th>Open quotes</th><td>2 awaiting operator release</td></tr>
            <tr><th>Orders</th><td>4 active shipments</td></tr>
            <tr><th>Docs</th><td>18 trace files available</td></tr>
            <tr><th>Preferred fleets</th><td>King Air B300, Hawker 900XP</td></tr>
          </tbody>
        </table>
      </section>
      <section class="card">
        <p class="eyebrow">Buyer-facing promises</p>
        <h3>What the portal says without sounding retail</h3>
        <div class="list">
          ${["Authorized and documented sourcing paths", "AOG response with audit trail", "Quote history and release documents", "Human-reviewed pricing and compliance"].map((text) => `
            <article class="row-card"><strong>${text}</strong><span class="status-pill green">active</span></article>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderRfqCard(rfq) {
  const severity = rfq.urgency === "aog" ? "red" : rfq.urgency === "critical" ? "amber" : "blue";
  return `
    <article class="row-card">
      <span>
        <strong>${rfq.id} · ${rfq.customer}</strong><br />
        <span class="muted">${rfq.partNumber} · qty ${rfq.qty} · ${rfq.channel} · ${rfq.receivedMinutesAgo} min ago</span><br />
        <span class="muted">${rfq.note}</span>
      </span>
      <span class="chips">
        <span class="status-pill ${severity}">${rfq.urgency}</span>
        ${rfq.exportControlReview ? `<span class="status-pill amber">Export review</span>` : ""}
      </span>
    </article>
  `;
}

function metric(label, value, note, color = "") {
  return `
    <article class="card">
      <p class="table-label">${label}</p>
      <strong class="metric-value ${color}">${value}</strong>
      <span class="metric-note">${note}</span>
    </article>
  `;
}

function timeline(title, body) {
  return `<div class="timeline-item"><strong>${title}</strong><p>${body}</p></div>`;
}

function option(value, label, selected) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

function bindNavigation() {
  document.querySelectorAll("[data-view-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showPortal();
      setView(link.dataset.viewLink);
    });
  });

  const initialView = window.location.hash.replace("#", "");
  if (viewTitles[initialView]) {
    showPortal();
    setView(initialView);
  }
}

function bindPublicSite() {
  document.querySelectorAll("[data-login]").forEach((button) => {
    button.addEventListener("click", () => {
      showPortal();
      setView("dashboard");
      showToast("Client portal opened with synthetic account data.");
    });
  });

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector("#portal-app").classList.add("is-hidden");
      document.querySelector("#public-site").classList.remove("is-hidden");
      history.replaceState(null, "", "#top");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  const rfqButton = document.querySelector("#public-rfq");
  if (rfqButton) {
    rfqButton.addEventListener("click", () =>
      submitIntake(
        "/api/rfq",
        {
          partNumber: valueOf("#rfq-part"),
          aircraft: valueOf("#rfq-aircraft"),
          condition: valueOf("#rfq-condition"),
          company: valueOf("#rfq-company"),
          email: valueOf("#rfq-email"),
          endUser: valueOf("#rfq-enduser"),
          channel: "form"
        },
        rfqButton
      )
    );
  }

  const inventoryButton = document.querySelector("#inventory-search");
  if (inventoryButton) {
    inventoryButton.addEventListener("click", async () => {
      const res = await fetch("/api/inventory-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: valueOf("#hero-q") })
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        showToast(
          `${data.count} matching part${data.count === 1 ? "" : "s"} — availability and documents only. Submit an RFQ for a human-reviewed price.`
        );
      } else {
        showToast("Inventory search is temporarily unavailable.");
      }
    });
  }

  const aogButton = document.querySelector("#aog-submit");
  if (aogButton) {
    aogButton.addEventListener("click", () =>
      submitIntake(
        "/api/aog",
        {
          aircraft: valueOf("#aog-aircraft"),
          partNumber: valueOf("#aog-part"),
          condition: valueOf("#aog-condition"),
          location: valueOf("#aog-location"),
          neededBy: valueOf("#aog-needed"),
          email: valueOf("#aog-email"),
          endUser: valueOf("#aog-enduser"),
          channel: "aog-desk"
        },
        aogButton
      )
    );
  }

  const rfpButton = document.querySelector("#rfp-submit");
  if (rfpButton) {
    rfpButton.addEventListener("click", async () => {
      const input = document.querySelector("#rfp-file");
      const file = input && input.files && input.files[0];
      const payload = {
        partNumber: valueOf("#rfp-ref") || "RFP package",
        company: valueOf("#rfp-company"),
        email: valueOf("#rfp-email"),
        note: "Multi-line RFP / tender package upload",
        channel: "rfp-upload"
      };
      if (file) {
        payload.file = { name: file.name, contentBase64: await fileToBase64(file) };
      }
      submitIntake("/api/rfp", payload, rfpButton);
    });
  }
}

function valueOf(selector) {
  const el = document.querySelector(selector);
  return el ? el.value.trim() : "";
}

async function submitIntake(url, body, button) {
  if (button) button.disabled = true;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      showToast(`${data.message || "Request captured."} Reference ${data.id}.`);
    } else {
      const missing = data.fields ? Object.keys(data.fields).join(", ") : "";
      showToast(missing ? `Please add: ${missing}.` : data.error || "Submission failed.");
    }
  } catch {
    showToast("Network error — please retry or call the AOG desk.");
  } finally {
    if (button) button.disabled = false;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showPortal() {
  document.querySelector("#public-site").classList.add("is-hidden");
  document.querySelector("#portal-app").classList.remove("is-hidden");
}

function setView(viewName) {
  const apply = () => {
    currentView = viewName;
    ensureView(viewName);
    document.querySelectorAll("[data-view-link]").forEach((link) => {
      link.classList.toggle("active", link.dataset.viewLink === viewName);
    });
    document.querySelectorAll("[data-view]").forEach((view) => {
      view.classList.toggle("active", view.dataset.view === viewName);
    });
    const title = document.querySelector("#view-title");
    title.textContent = viewTitles[viewName];
    title.setAttribute("tabindex", "-1");
    title.focus({ preventScroll: true });
    history.replaceState(null, "", `#${viewName}`);
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (document.startViewTransition && !reduced) {
    document.startViewTransition(apply);
  } else {
    apply();
  }
}

function bindCatalogFilters() {
  const query = document.querySelector("#part-query");
  const ata = document.querySelector("#ata-filter");
  const source = document.querySelector("#source-filter");
  const availability = document.querySelector("#availability-filter");

  [query, ata, source, availability].forEach((control) => {
    control.addEventListener("input", () => {
      state.filters = {
        query: query.value,
        ata: ata.value,
        sourceType: source.value,
        availability: availability.value
      };
      // Only the results re-render; the filter controls (and focus) persist.
      renderCatalogResults();
    });
  });
}

function bindCatalogResults() {
  document.querySelectorAll("[data-part-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPartId = button.dataset.partId;
      renderCatalogResults();
    });
  });

  document.querySelectorAll("[data-draft]").forEach((button) => {
    button.addEventListener("click", () => showToast("Draft quote created in shadow mode. Human price approval still required."));
  });

  document.querySelectorAll("[data-trace]").forEach((button) => {
    button.addEventListener("click", () => showToast("Trace-pack checklist opened with synthetic document requirements."));
  });
}

function bindGlobalActions() {
  document.querySelector("#simulate-rfq").addEventListener("click", () => {
    const nextId = `RFQ-${2412 + state.rfqs.length}`;
    state.rfqs.unshift({
      id: nextId,
      customer: "Corporate operator",
      endUser: "operator",
      channel: "form",
      partNumber: "90-364018-7",
      qty: 1,
      condition: "OH",
      urgency: "critical",
      status: "new",
      exportControlReview: false,
      receivedMinutesAgo: 1,
      neededBy: "48 hours",
      note: "Synthetic RFQ generated for demo review."
    });
    invalidateViews("dashboard", "rfqs");
    showToast(`${nextId} added to the queue.`);
  });

  document.querySelector("#open-aog").addEventListener("click", () => {
    setView("aog");
    showToast("AOG protocol opened. Phone and final release remain human-owned.");
  });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function escapeAttribute(value) {
  return value.replaceAll('"', "&quot;");
}
