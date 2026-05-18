# PRISM Valuation MVP Build Report - 2026-05-17

## Executive Summary

Two separated handoff packages are being saved in this GitHub repository:

- `artifacts/prism-valuation-web-mvp.zip`
- `artifacts/prism-original-colab-analysis.zip`

The web MVP is a UI and architecture prototype. It should not be treated as production-ready or analytically authoritative. The original Colab notebook has been preserved separately because it was considered more accurate.

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

## Recommended Next Steps

1. Download both zip artifacts from this repo.
2. Unzip and inspect original Colab analysis first.
3. Run side-by-side validation between the original notebook and web MVP outputs.
4. Lock canonical cleaning, filtering, and unit rules.
5. Refine the valuation logic only after reconciliation.
