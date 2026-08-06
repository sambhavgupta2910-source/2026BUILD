# 2026BUILD

PRISM 2026 build handoff repository.

This repo contains two separated workstreams:

- `prism-valuation-web-mvp/` - current advisor-facing web MVP prototype.
- `prism-original-colab-analysis/` - original Colab/Jupyter analytical baseline, preserved separately because it was considered more accurate.

## Business Development

- `SOBHA_JVC_BROKERAGE_TARGETS.md` - researched brokerage target list for Sobha distribution
  through JVC, with tiering, approach order and the competitive set of Sobha's existing channel
  partners.
- `prism-valuation-web-mvp/scripts/broker-targets.js` (`npm run broker-targets`) - ranks
  brokerages by DLD-registered agent count from the Dubai Pulse broker register and flags
  JVC-located offices, so team sizes can be verified against the register rather than taken
  from company websites.

## Important Status

The web MVP is a UI and architecture prototype with known valuation inconsistencies. It should not be treated as production-ready or analytically authoritative.

The next step is side-by-side reconciliation between the original Colab notebook and the web MVP valuation outputs.

## Data Policy

The raw transaction CSV is not committed here. It should be stored separately in Google Drive or governed data storage.
