import pandas as pd
import numpy as np

# ---- Config ------------------------------------------------
CSV_PATH       = "/content/drive/MyDrive/data set/Transactions.csv"
# CSV_PATH     = "/content/drive/MyDrive/data set/transactions-2026-05-17.csv"  # 2026 data

TARGET_PROJECT = "seventh heaven"   # case-insensitive
TARGET_AREA    = "al barari"         # case-insensitive
UNIT_SERIES    = "0922"              # substring to match unit identifiers
# ------------------------------------------------------------

print("Loading raw DLD data...")
df_raw = pd.read_csv(CSV_PATH, low_memory=False)
print(f"Raw rows: {len(df_raw):,}")

# ---- Resolve column names dynamically ----------------------
def find_col(candidates, cols):
    lmap = {c.lower(): c for c in cols}
    for cand in candidates:
        for k, v in lmap.items():
            if cand.lower() in k:
                return v
    return None

project_col  = find_col(["project_name_en", "project_en"], df_raw.columns)
area_col     = find_col(["area_name_en", "community_en", "area"], df_raw.columns)
building_col = find_col(["building_name_en", "building_name"], df_raw.columns)
master_col   = find_col(["master_project_en", "master_project"], df_raw.columns)
date_col     = find_col(["instance_date", "transaction_date", "date"], df_raw.columns)
price_col    = find_col(["actual_worth", "price", "transaction_amount"], df_raw.columns)
area_sqm_col = find_col(["procedure_area", "bua", "built_up_area"], df_raw.columns)
rooms_col    = find_col(["rooms_en", "bedrooms", "rooms"], df_raw.columns)
proj_num_col = find_col(["project_number"], df_raw.columns)

print(f"Columns — project: {project_col}, area: {area_col}, building: {building_col}, master: {master_col}")

# ---- Filter: Seventh Heaven or Al Barari -------------------
mask = pd.Series([False] * len(df_raw))
for col in [project_col, building_col, master_col]:
    if col:
        mask |= df_raw[col].astype(str).str.lower().str.contains(TARGET_PROJECT, na=False)
if area_col:
    mask |= df_raw[area_col].astype(str).str.lower().str.contains(TARGET_AREA, na=False)

df_sh = df_raw[mask].copy()
print(f"\nSeventh Heaven / Al Barari transactions found: {len(df_sh):,}")

if len(df_sh) == 0:
    print("\nNo matches. Showing available area and project samples:")
    if area_col:
        print("\nTop 50 area names:")
        print(df_raw[area_col].value_counts().head(50).to_string())
    if project_col:
        matches = df_raw[project_col].astype(str).str.lower().str.contains("barari|heaven", na=False)
        print("\nProjects containing barari/heaven:")
        print(df_raw.loc[matches, project_col].value_counts().head(20).to_string())
else:
    # Derive sqft and AED/sqft
    if area_sqm_col:
        df_sh["area_sqft"] = pd.to_numeric(df_sh[area_sqm_col], errors="coerce") * 10.764
    if price_col:
        df_sh["worth"] = pd.to_numeric(df_sh[price_col], errors="coerce")
        if area_sqm_col:
            df_sh["aed_per_sqft"] = df_sh["worth"] / df_sh["area_sqft"]

    # Tower A / Tower B breakdown
    sep = "=" * 60
    print(f"\n{sep}")
    print("BUILDINGS IN SEVENTH HEAVEN / AL BARARI")
    print(sep)
    if building_col:
        print(df_sh[building_col].value_counts().to_string())
    if project_col:
        print("\nProjects:")
        print(df_sh[project_col].value_counts().to_string())

    # Unit 0922 series search
    print(f"\n{sep}")
    print(f"SEARCHING FOR UNIT SERIES: {UNIT_SERIES!r}")
    print("Searching: project_number, building_name, transaction_id, procedure_id")
    print(sep)

    unit_mask = pd.Series([False] * len(df_sh), index=df_sh.index)
    for col in [proj_num_col, building_col, "transaction_id", "procedure_id"]:
        if col and col in df_sh.columns:
            unit_mask |= df_sh[col].astype(str).str.contains(UNIT_SERIES, na=False)

    df_unit = df_sh[unit_mask].copy()
    print(f"Transactions matching {UNIT_SERIES!r}: {len(df_unit):,}")

    display_cols = [c for c in [
        date_col, area_col, project_col, building_col,
        rooms_col, proj_num_col, area_sqm_col, "area_sqft",
        price_col, "aed_per_sqft"
    ] if c and c in df_sh.columns]

    if len(df_unit) == 0:
        print("\nUnit series not found. Showing all Seventh Heaven / Al Barari transactions:")
        df_show = df_sh[display_cols]
        if date_col:
            df_show = df_show.sort_values(date_col, ascending=False)
        print(df_show.to_string(index=False))
    else:
        print(f"\nUNIT {UNIT_SERIES} TRANSACTIONS:")
        df_show = df_unit[display_cols]
        if date_col:
            df_show = df_show.sort_values(date_col, ascending=False)
        print(df_show.to_string(index=False))

        if "worth" in df_unit.columns:
            latest = df_unit.sort_values(date_col).iloc[-1] if date_col else df_unit.iloc[-1]
            sqft  = latest.get("area_sqft", float("nan"))
            worth = latest["worth"]
            psf   = latest.get("aed_per_sqft", float("nan"))
            bldg  = latest.get(building_col, "N/A") if building_col else "N/A"
            dated = latest.get(date_col, "N/A") if date_col else "N/A"
            print(f"\nMost recent transaction for unit series {UNIT_SERIES}:")
            print(f"   Date        : {dated}")
            print(f"   Building    : {bldg}")
            print(f"   Size (sqft) : {sqft:,.0f}")
            print(f"   Price (AED) : AED {worth:,.0f}")
            print(f"   AED/sqft    : {psf:,.0f}")
    print()
