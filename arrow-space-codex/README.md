# Arrow Space Codex Prototype

A separate Codex-built version of the Arrow Space clickable demo.

## What it is

- Browser-only institutional aviation portal prototype.
- Synthetic data only.
- Views for operations, RFQ queue, hybrid catalog, trace packs, AOG desk, and account portal.
- Human approval is preserved for pricing, compliance, and export-control release.

## Run

Serve the folder with any static file server, then open the local URL.

```bash
python3 -m http.server 4317 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4317/`.

```bash
npm test
```

## Design stance

This version is intentionally dependency-light and comparison-friendly. Instead of a full Next.js scaffold, it prioritizes a polished first-click experience, strong aviation-specific copy, and portable files that can be reviewed immediately.
