# Data Sources

## Updated Transaction Data

- Local file: `C:\Users\bhavn\Downloads\transactions-2026-05-17.csv`
- Size observed: approximately 21.9 MB
- Rows observed in the web MVP verification: 89,270
- Date coverage observed: 2026-01-01 through 2026-05-17

## Commit Policy

The raw transaction CSV is not included in this repository by default.

Reasons:

- It is a large source data artifact.
- It may be proprietary or licensed.
- It should be governed separately from application and analysis code.

If source data must be versioned later, use governed data storage rather than committing raw CSVs directly.
