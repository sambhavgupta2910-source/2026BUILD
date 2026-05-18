# Validation Notes

## Current Assessment

The original Colab analysis should be treated as the analytical baseline. The web MVP should be treated as a visual/product prototype until its valuation outputs are reconciled.

## Reconciliation Priorities

1. Confirm exact filters used in the original notebook.
2. Confirm whether Sales-only or Sales + Mortgage records were used in each original result.
3. Confirm sqm-to-sqft conversion is applied exactly once.
4. Compare AED/sqft distributions by area, project, rooms, and property type.
5. Compare sample valuation outputs for Business Bay and JVC.
6. Document all differences before choosing the canonical valuation logic.

## Do Not

- Do not overwrite the original notebook with MVP code.
- Do not treat the MVP valuation output as final.
- Do not mix raw CSVs, generated outputs, and app code without a clear data governance approach.
