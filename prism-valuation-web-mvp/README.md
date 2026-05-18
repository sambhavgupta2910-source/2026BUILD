# PRISM Valuation Web MVP

Advisor-facing web prototype for the 2026 Dubai transaction valuation workflow.

## Run locally

```bash
npm start
```

The server defaults to reading:

```text
C:\Users\bhavn\Downloads\transactions-2026-05-17.csv
```

Set `TRANSACTIONS_CSV` to use another CSV path.

## Important status

This is a prototype and needs reconciliation against the original Colab analysis before production use.

## Unit policy

- Treat DLD `PROCEDURE_AREA` and fallback `ACTUAL_AREA` as square meters.
- Convert once with `area_sqft = area_sqm_raw * 10.764`.
- Client-facing values must remain AED/sqft and total AED only.
