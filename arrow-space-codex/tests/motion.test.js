import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (name) => readFileSync(join(root, name), "utf8");

test("landing page carries the scroll-reveal and counter hooks", () => {
  const html = read("index.html");
  assert.match(html, /data-reveal-stagger/, "staggered reveal groups exist");
  assert.match(html, /data-reveal\b/, "single reveal blocks exist");
  assert.match(html, /data-count/, "count-up counters are marked");
  assert.match(html, /has-motion/, "no-JS guard script stamps has-motion");
});

test("page head is production-grade: description, theme color, favicon, skip link", () => {
  const html = read("index.html");
  assert.match(html, /<meta\s+name="description"/, "meta description present");
  assert.match(html, /<meta name="theme-color"/, "theme color present");
  assert.match(html, /rel="icon"/, "favicon present");
  assert.match(html, /class="skip-link"/, "skip link present");
});

test("stylesheet implements lazy rendering and honors reduced motion", () => {
  const css = read("styles.css");
  assert.match(css, /content-visibility:\s*auto/, "native lazy rendering enabled");
  assert.match(css, /contain-intrinsic-size/, "intrinsic size reserved for lazy sections");
  assert.match(css, /prefers-reduced-motion:\s*reduce/, "reduced-motion kill-switch present");
  assert.match(css, /:focus-visible/, "keyboard focus styles present");
  assert.match(css, /view-transition/, "view transition styles present");
  assert.match(css, /animation-timeline:\s*view\(\)/, "scroll-driven enhancement present");
});

test("motion engine reveals via IntersectionObserver and respects reduced motion", () => {
  const js = read("src/motion.js");
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /prefers-reduced-motion/);
  assert.match(js, /unobserve/, "reveal targets are unobserved after firing");
});

test("portal renders views lazily and uses view transitions with a fallback", () => {
  const js = read("app.js");
  assert.match(js, /startViewTransition/, "view transitions are used when available");
  assert.match(js, /initMotion/, "motion engine is initialized");
  assert.match(js, /renderCatalogResults/, "catalog results render apart from filters (focus fix)");
  assert.doesNotMatch(js, /function renderAll\(/, "eager render-everything boot removed");
});

test("motion and operator files contain no unresolved placeholders", () => {
  for (const file of ["src/motion.js", "operator/index.html", "operator/app.js"]) {
    assert.equal(
      /\b(TODO|TBD)\b/.test(read(file)),
      false,
      `${file} has an unresolved placeholder`
    );
  }
});

test("operator console approves via an inline field, not a blocking prompt", () => {
  const js = read("operator/app.js");
  assert.match(js, /approver-name/, "inline approver field is used");
  assert.doesNotMatch(js, /\bprompt\(/, "window.prompt removed");
});
