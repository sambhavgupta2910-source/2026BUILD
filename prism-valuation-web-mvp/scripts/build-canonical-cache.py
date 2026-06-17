#!/usr/bin/env python3
"""
build-canonical-cache.py — PRISM full-DLD canonical cache builder.

Converts the full (multi-GB) DLD transactions export into a slim, canonical
cache CSV that the PRISM server (server.js) can load directly as
TRANSACTIONS_CSV. This is the data-upgrade path: run it once when a fresh full
DLD file is available, then point the server at the output.

It streams the input row by row (constant memory), applies the same v3.1
pipeline the server uses, and writes only Sales + Residential rows that pass the
sanity band — typically shrinking a multi-GB file to a few MB.

Pipeline (mirrors server.js buildDataset):
  - keep GROUP_EN == "Sales" and USAGE_EN == "Residential"
  - area_sqm = PROCEDURE_AREA (fallback ACTUAL_AREA); must be > 0
  - TRANS_VALUE must be > 0
  - aed_per_sqft = TRANS_VALUE / (area_sqm * 10.764); keep 50..20000
  - preserve the original columns so the cache is a drop-in CSV

Usage:
  python3 scripts/build-canonical-cache.py \
      --input /path/to/dld-full.csv \
      --output ./transactions-canonical.csv

Then:
  TRANSACTIONS_CSV=./transactions-canonical.csv npm start
"""

import argparse
import csv
import sys

SQM_TO_SQFT = 10.764
MIN_PSF, MAX_PSF = 50.0, 20000.0

# Columns the server reads; preserved in the output when present in the input.
KEEP_COLS = [
    "TRANSACTION_NUMBER", "INSTANCE_DATE", "GROUP_EN", "PROCEDURE_EN", "USAGE_EN",
    "AREA_EN", "PROP_TYPE_EN", "PROP_SB_TYPE_EN", "ROOMS_EN", "PROCEDURE_AREA",
    "ACTUAL_AREA", "TRANS_VALUE", "PROJECT_EN", "MASTER_PROJECT_EN",
    "IS_OFFPLAN_EN", "IS_FREE_HOLD_EN",
]
REQUIRED = ["GROUP_EN", "USAGE_EN", "TRANS_VALUE", "PROCEDURE_AREA", "AREA_EN"]


def to_float(v):
    try:
        return float(str(v).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def main():
    ap = argparse.ArgumentParser(description="Build the PRISM canonical DLD cache.")
    ap.add_argument("--input", "-i", required=True, help="Path to the full DLD CSV export")
    ap.add_argument("--output", "-o", default="transactions-canonical.csv", help="Output canonical CSV path")
    args = ap.parse_args()

    csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

    kept = sales = residential = total = 0
    with open(args.input, "r", encoding="utf-8-sig", newline="") as fin:
        reader = csv.DictReader(fin)
        missing = [c for c in REQUIRED if c not in (reader.fieldnames or [])]
        if missing:
            sys.exit(f"ERROR: input is missing required columns: {', '.join(missing)}")

        out_cols = [c for c in KEEP_COLS if c in reader.fieldnames]
        with open(args.output, "w", encoding="utf-8", newline="") as fout:
            writer = csv.DictWriter(fout, fieldnames=out_cols, extrasaction="ignore")
            writer.writeheader()

            for row in reader:
                total += 1
                if total % 500_000 == 0:
                    print(f"  …scanned {total:,} rows, kept {kept:,}", file=sys.stderr)

                if (row.get("GROUP_EN") or "").strip() != "Sales":
                    continue
                sales += 1
                if (row.get("USAGE_EN") or "").strip() != "Residential":
                    continue
                residential += 1

                trans = to_float(row.get("TRANS_VALUE"))
                proc = to_float(row.get("PROCEDURE_AREA"))
                actual = to_float(row.get("ACTUAL_AREA"))
                area_sqm = proc if (proc and proc > 0) else actual
                if not trans or trans <= 0 or not area_sqm or area_sqm <= 0:
                    continue

                psf = trans / (area_sqm * SQM_TO_SQFT)
                if psf < MIN_PSF or psf > MAX_PSF:
                    continue

                writer.writerow({c: row.get(c, "") for c in out_cols})
                kept += 1

    print(
        f"[canonical] {total:,} raw -> {sales:,} sales -> {residential:,} residential "
        f"-> {kept:,} clean written to {args.output}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
