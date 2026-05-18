# PRISM Valuation MVP Build Report - 2026-05-17

## Executive Summary

This GitHub repository now contains:

- `artifacts/prism-valuation-web-mvp.zip` - uploaded web MVP prototype package
- `prism-original-colab-analysis/` - documentation for the original Colab analytical baseline
- `PRISM_BUILD_REPORT_FOR_NOTION.md` - this handoff report

The web MVP is a UI and architecture prototype. It should not be treated as production-ready or analytically authoritative. The original Colab notebook has been preserved locally because it was considered more accurate, but the full notebook zip was too large to safely upload through the current connector path.

## Current Build

Local app URL used during development:

```text
http://localhost:4173/
```

## Source Data

Updated transaction data used locally:

```text
C:\Users\bhavn\Downloads\transactions-2026-05-17.csv
```

Observed profile:

- Rows: 89,270
- Clean Sales rows used by MVP verification: 68,562
- Date coverage: 2026-01-01 to 2026-05-17
- Median Sales value after sqm-to-sqft conversion: approximately 1,761 AED/sqft

The raw CSV is not included in this repo.

## Unit Policy

The MVP assumes DLD area fields are square meters:

- `PROCEDURE_AREA` and `ACTUAL_AREA` are treated as sqm
- `area_sqft = area_sqm * 10.764`
- client-facing outputs use AED/sqft only

## Known Issues

- The current web MVP has valuation inconsistencies.
- Comparable fallback logic can over-broaden results.
- Winsorization thresholds need business validation.
- The original Colab analysis should remain the analytical baseline until reconciliation is complete.
- The MVP should be used for product/UI direction, not final valuation advice.

## Verification Performed

- Confirmed the local app served at `http://localhost:4173/`
- Confirmed no client-facing `AED/sqm` label in the served HTML
- Confirmed metadata API loaded 89,270 rows
- Confirmed converted median AED/sqft near 1,761
- Tested Business Bay / The Crestmark valuation
- Tested JVC area-level valuation

## GitHub Upload Status

Uploaded:

- Web MVP zip artifact
- Build report
- Original-analysis documentation

Not uploaded:

- Raw transaction CSV
- Full original Colab notebook zip

The original notebook remains available locally at:

```text
C:\Users\bhavn\Downloads\Coding Enviroment_
```

Prepared local package:

```text
C:\Users\bhavn\OneDrive\Documents\PRISM APP & Elevate Advisory\repo-bundles\prism-original-colab-analysis.zip
```

## Recommended Next Steps

1. Download the web MVP zip from this repo.
2. Upload the original Colab zip through GitHub web UI, GitHub Desktop, or Google Drive.
3. Run side-by-side validation between the original notebook and web MVP outputs.
4. Lock canonical cleaning, filtering, and unit rules.
5. Refine the valuation logic only after reconciliation.
