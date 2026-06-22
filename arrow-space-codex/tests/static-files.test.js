import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("index references existing local assets", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const assetPaths = [...html.matchAll(/(?:href|src)="\.\/([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(assetPaths.sort(), ["app.js", "styles.css"]);
  for (const assetPath of assetPaths) {
    assert.equal(existsSync(join(root, assetPath)), true, `${assetPath} should exist`);
  }
});

test("prototype files do not contain unresolved implementation placeholders", () => {
  for (const file of ["index.html", "styles.css", "app.js", "README.md"]) {
    const body = readFileSync(join(root, file), "utf8");
    assert.equal(/\b(TODO|TBD|undefined)\b/.test(body), false, `${file} has an unresolved placeholder`);
  }
});

test("public company landing page is the default and portal starts behind login", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");

  assert.match(html, /<div class="public-site" id="public-site">/);
  assert.match(html, /<div class="app-shell is-hidden" id="portal-app">/);
  assert.match(html, /Client login/);
  assert.match(html, /Request a quote/);
});

test("landing page includes aviation parts supplier patterns from research", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");

  for (const phrase of [
    "Global aircraft parts supply",
    "Search our live inventory",
    "Search parts",
    "Search repairs",
    "Upload RFP",
    "Authorized channel partner of Textron Aviation",
    "DGCA-approved propeller workshop",
    "Aircraft products",
    "Markets served",
    "Parts counter"
  ]) {
    assert.match(html, new RegExp(phrase, "i"));
  }
});

test("landing scroll introduces credentials before the parts counter", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const credentialIndex = html.indexOf("Certifications and distributions");
  const counterIndex = html.indexOf("Parts counter");

  assert.ok(credentialIndex > -1, "certifications section exists");
  assert.ok(counterIndex > -1, "parts counter section exists");
  assert.ok(credentialIndex < counterIndex, "certifications should appear before parts counter");
});
