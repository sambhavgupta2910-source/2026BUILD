// Operator console behavior. Talks to the gated /api/operator endpoints.
// Pricing actions never auto-send: a draft is created, then a human must
// explicitly approve, and only if the quote clears the margin floor.

const statusOptions = [
  "new",
  "triaged",
  "quoting",
  "quoted",
  "won",
  "lost",
  "on_hold"
];

let selectedId = null;

const $ = (sel) => document.querySelector(sel);

init();

function init() {
  $("#login-button").addEventListener("click", login);
  $("#passcode").addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
  $("#refresh").addEventListener("click", loadQueue);
  // Try to load immediately in case a session cookie already exists.
  loadQueue({ silent: true });
}

async function login() {
  const passcode = $("#passcode").value;
  const res = await fetch("/api/operator/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode })
  });
  if (!res.ok) {
    $("#login-error").style.display = "block";
    return;
  }
  $("#login-error").style.display = "none";
  loadQueue();
}

function showConsole() {
  $("#operator-login").classList.add("is-hidden");
  $("#operator-console").classList.remove("is-hidden");
}

async function loadQueue({ silent = false } = {}) {
  const res = await fetch("/api/operator/leads", { headers: { Accept: "application/json" } });
  if (res.status === 401) {
    if (!silent) toast("Session expired — sign in again.");
    $("#operator-console").classList.add("is-hidden");
    $("#operator-login").classList.remove("is-hidden");
    return;
  }
  if (!res.ok) {
    toast("Could not load queue.");
    return;
  }
  showConsole();
  const data = await res.json();
  renderMetrics(data.metrics);
  renderList(data.leads);
  if (selectedId) {
    const stillThere = data.leads.find((l) => l.id === selectedId);
    if (stillThere) renderDetail(stillThere);
  }
}

function renderMetrics(metrics = {}) {
  $("#kpi-open").textContent = metrics.openRfqs ?? 0;
  $("#metrics").innerHTML = [
    metric("Open RFQs", metrics.openRfqs ?? 0, "new + triaged"),
    metric("Open AOG", metrics.aogOpen ?? 0, "protocol active", "amber"),
    metric("Awaiting approval", metrics.quotesAwaitingApproval ?? 0, "price cannot auto-send"),
    metric("Margin exceptions", metrics.marginExceptions ?? 0, "floor review", "amber")
  ].join("");
}

function renderList(leads = []) {
  if (!leads.length) {
    $("#lead-list").innerHTML = `<p class="muted">No captured leads yet. Submissions from the public site appear here.</p>`;
    return;
  }
  $("#lead-list").innerHTML = leads
    .map((lead) => {
      const severity = lead.urgency === "aog" ? "red" : lead.urgency === "critical" ? "amber" : "blue";
      return `
        <button class="row-card clickable ${lead.id === selectedId ? "selected" : ""}" type="button" data-lead="${lead.id}">
          <span>
            <strong>${escapeHtml(lead.id)} · ${escapeHtml(lead.customer?.company || lead.customer?.name || lead.kind.toUpperCase())}</strong><br />
            <span class="muted">${escapeHtml(lead.partNumber || "—")} · ${escapeHtml(lead.kind)} · ${lead.receivedMinutesAgo ?? 0} min ago</span>
          </span>
          <span class="chips">
            <span class="status-pill ${severity}">${escapeHtml(lead.urgency)}</span>
            ${lead.exportControlReview ? `<span class="status-pill amber">Export review</span>` : ""}
            <span class="status-pill">${escapeHtml(lead.status)}</span>
          </span>
        </button>`;
    })
    .join("");

  document.querySelectorAll("[data-lead]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedId = button.dataset.lead;
      loadQueue();
    });
  });
}

function renderDetail(lead) {
  const quotesRows = (lead.quotes || [])
    .map(
      (q) => `
        <tr>
          <td>${escapeHtml(q.id)}</td>
          <td>${q.currency} ${Number(q.total).toLocaleString("en-US")}</td>
          <td>${(q.marginRate * 100).toFixed(1)}%</td>
          <td>${q.approvedByHuman ? "Approved" : q.marginFloorOk ? "Awaiting human" : "Margin exception"}</td>
          <td>${
            q.approvedByHuman
              ? `<span class="status-pill green">sendable</span>`
              : q.marginFloorOk
                ? `<button class="small-button" type="button" data-approve="${q.id}">Approve</button>`
                : `<span class="status-pill red">blocked</span>`
          }</td>
        </tr>`
    )
    .join("");

  $("#lead-detail").innerHTML = `
    <p class="eyebrow">Lead record</p>
    <h3>${escapeHtml(lead.id)}</h3>
    <div class="chips">
      <span class="status-pill blue">${escapeHtml(lead.kind)}</span>
      <span class="status-pill">${escapeHtml(lead.urgency)}</span>
      ${lead.exportControlReview ? `<span class="status-pill amber">Export-control review</span>` : ""}
      <span class="status-pill ${lead.usOrigin ? "amber" : "green"}">${lead.usOrigin ? "US origin" : "Non-US origin"}</span>
    </div>
    <table class="data-table" style="margin-top:14px">
      <tbody>
        <tr><th>Requester</th><td>${escapeHtml(lead.customer?.name || "—")} ${lead.customer?.company ? "· " + escapeHtml(lead.customer.company) : ""}</td></tr>
        <tr><th>Contact</th><td>${escapeHtml(lead.customer?.email || lead.customer?.phone || "—")}</td></tr>
        <tr><th>End user</th><td>${escapeHtml(lead.endUser)}</td></tr>
        <tr><th>Part</th><td>${escapeHtml(lead.partNumber || "—")} · qty ${lead.qty}</td></tr>
        <tr><th>Aircraft</th><td>${escapeHtml(lead.aircraft || "—")}</td></tr>
        <tr><th>Condition</th><td>${escapeHtml(lead.condition || "—")}</td></tr>
        ${lead.location ? `<tr><th>Location</th><td>${escapeHtml(lead.location)}</td></tr>` : ""}
        ${lead.neededBy ? `<tr><th>Needed by</th><td>${escapeHtml(lead.neededBy)}</td></tr>` : ""}
        ${lead.note ? `<tr><th>Note</th><td>${escapeHtml(lead.note)}</td></tr>` : ""}
        ${lead.attachments?.length ? `<tr><th>Attachments</th><td>${lead.attachments.map((a) => escapeHtml(a.filename)).join(", ")}</td></tr>` : ""}
        ${lead.clarificationsNeeded?.length ? `<tr><th>Clarify</th><td>${lead.clarificationsNeeded.map(escapeHtml).join(", ")}</td></tr>` : ""}
      </tbody>
    </table>

    <div class="action-row" style="margin-top:14px">
      <label>Status
        <select id="status-select">
          ${statusOptions.map((s) => `<option value="${s}" ${s === lead.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </label>
      <button class="ghost-button" type="button" id="save-status">Update status</button>
    </div>

    <section style="margin-top:18px">
      <p class="eyebrow">Draft quote (human-approved before send)</p>
      <div class="filter-row">
        <input id="quote-total" type="number" min="0" placeholder="Sell total (USD)" />
        <input id="quote-cost" type="number" min="0" placeholder="Cost basis (USD)" />
        <button class="primary-button" type="button" id="draft-quote">Draft</button>
      </div>
      <p class="muted">A draft below the margin floor is flagged as a margin exception and cannot be approved or sent.</p>
      ${
        lead.quotes?.length
          ? `<table class="data-table" style="margin-top:12px">
              <thead><tr><th>Quote</th><th>Total</th><th>Margin</th><th>State</th><th></th></tr></thead>
              <tbody>${quotesRows}</tbody>
            </table>`
          : ""
      }
    </section>
  `;

  $("#save-status").addEventListener("click", async () => {
    await postJson(`/api/operator/leads/${lead.id}/status`, { status: $("#status-select").value });
    toast(`Status updated to ${$("#status-select").value}.`);
    loadQueue();
  });

  $("#draft-quote").addEventListener("click", async () => {
    const res = await postJson(`/api/operator/leads/${lead.id}/quote`, {
      total: Number($("#quote-total").value),
      costBasis: Number($("#quote-cost").value)
    });
    if (res.ok) {
      const body = await res.json();
      toast(body.marginException ? "Draft saved — margin exception, needs review." : "Draft saved — awaiting human approval.");
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Could not draft quote.");
    }
    loadQueue();
  });

  document.querySelectorAll("[data-approve]").forEach((button) => {
    button.addEventListener("click", async () => {
      const approver = prompt("Approver name for human sign-off:");
      if (!approver) return;
      const res = await postJson(`/api/operator/leads/${lead.id}/quotes/${button.dataset.approve}/approve`, { approver });
      if (res.ok) {
        toast("Quote approved by human — now sendable.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Approval refused.");
      }
      loadQueue();
    });
  });
}

function metric(label, value, note, color = "") {
  return `
    <article class="card">
      <p class="table-label">${label}</p>
      <strong class="metric-value ${color}">${value}</strong>
      <span class="metric-note">${note}</span>
    </article>`;
}

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}
