// Motion engine: scroll reveals, count-up counters, and nav scroll state.
// Zero dependencies. Honors prefers-reduced-motion: when reduced (or when
// IntersectionObserver is unavailable) everything is revealed immediately,
// counters stay at their final markup values, and no animation runs.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export function initMotion(root = document) {
  const targets = [...root.querySelectorAll("[data-reveal], [data-reveal-stagger]")];

  // Assign per-child stagger indices so CSS can delay each item.
  for (const group of root.querySelectorAll("[data-reveal-stagger]")) {
    [...group.children].forEach((child, index) => {
      child.style.setProperty("--reveal-i", index);
    });
  }

  bindNavScrollState();

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        runCounters(entry.target);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  targets.forEach((el) => observer.observe(el));
}

// Count numeric text up from zero on first reveal. Works on elements marked
// data-count whose text starts with an integer (e.g. "4", "25+", "24/7" —
// the leading number animates, the suffix is preserved).
function runCounters(scope) {
  const counters = scope.matches("[data-count]")
    ? [scope]
    : [...scope.querySelectorAll("[data-count]")];

  for (const el of counters) {
    if (el.dataset.countDone) continue;
    el.dataset.countDone = "true";
    const match = /^(\d+)(.*)$/.exec(el.textContent.trim());
    if (!match) continue;
    const target = Number(match[1]);
    const suffix = match[2];
    const duration = 1100;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

// Deepen the sticky public nav once the page is scrolled.
function bindNavScrollState() {
  const nav = document.querySelector(".public-nav");
  if (!nav) return;
  const update = () => nav.classList.toggle("is-scrolled", window.scrollY > 10);
  update();
  window.addEventListener("scroll", update, { passive: true });
}
