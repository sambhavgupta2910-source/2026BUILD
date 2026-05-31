# CLAUDE.md — Bar Empire (working title: "PROOF")

> This file is the persistent project brief. Read it fully before any task.
> Authoritative design lives in `docs/GameDesignDocument.md`. This file carries
> the latest decisions (which supersede the GDD where they conflict).

## What we're building
A **real-time business-tycoon city-builder** for **mobile (iOS/Android), Unity 6 LTS + URP**, with a WebGL desktop build for demos. The player grows a single bar into a global, vertically-integrated premium-beverage empire — sourcing top products *and* owning production (wine estates, a scotch distillery, a brewery) — set in a visible 3D city, not a dashboard.

The earlier prototype failed because it was panels-and-sliders. **The city is the game; management is contextual (tap a building → a drawer slides up).**

## Hard constraints (do not violate)
1. **No AI / LLM features.** All "adaptive" behaviour is procedural designed systems. No network calls to any AI service.
2. **Theme-agnostic engine.** Drinks/venues/supply are *data*, not hardcoded. The product could be re-skinned later. Keep content in data; keep the engine generic.
3. **Simulation is pure C#, decoupled from rendering.** The `Simulation` layer has **zero `UnityEngine` dependency**, is deterministic (seedable RNG), and is unit-testable. The `Presentation` layer reads sim state / subscribes to events and never mutates sim state directly.
4. **Real-time with pause/speed** (∥ / 1× / 2× / 3×), not turn-based. The economic tick is fixed-step and decoupled from the 60fps render.
5. **Mobile-first & performant.** Pedestrian agents are a *visual representation* of demand, pooled and hard-capped (~60–120 visible). The economic sim is independent of how many agents are drawn.
6. **Respect the player's time.** Sliders, steppers, "set-policy-once" toggles. Never press-and-hold value entry.

## Architecture
```
Presentation (MonoBehaviours, URP, UI Toolkit)
   Camera · World/Building rendering · AgentSystem · HUD · Context drawers
        ▲ reads state / subscribes (event bus)
Simulation (pure C#, deterministic, testable)   ← already started, see /Scripts/Simulation
   TimeManager · EconomySystem · DemandSystem · SupplySystem · ProductionSystem
   StaffSystem · MarketingSystem · ReputationSystem · EventSystem · ObjectiveSystem
        ▲ operates on
GameState (serializable) + Data (POCO defs; SO wrappers in Presentation/Data)
        ▲
Persistence: SaveSystem → JSON @ persistentDataPath (versioned)
```

## Current state (Layer 0 — DONE)
Pure-C# simulation core exists and runs headless in a .NET console:
- `Scripts/Simulation/BarEmpireCore.cs` — enums, POCO data defs, **bar-empire sample content**, `GameState`, deterministic `Rng`.
- `Scripts/Simulation/SimulationEngine.cs` — `SimulationEngine.Tick()` covering demand, supply (own-vs-sourced), **production + maturation** (the signature system), finance, reputation, and the living market (economy cycles, rotating trends, fluctuating commodity prices). Contains a console `Program` harness — **exclude `Program` from Unity builds.**

The signature mechanic already works: brewery (~3wk), wine estate (~52wk), scotch distillery (~156wk) produce batches that mature on timers; own production is cheaper/quality-locked; until matured you source at market price (the patience cost of scotch is modelled).

## Layered roadmap (build in order; ship at v1.0)
- **L0 Simulation core** — DONE.
- **L1 Playable slice** *(next)* — Unity: one city, grid + tap-to-build venues, real-time pause/speed, drive the existing `SimulationEngine`, placeholder art (Kenney CC0), basic pedestrians, context drawers. **Gate: is it fun?**
- **L2 Vertical integration UI** — full production/build-vs-buy UI, venue tier upgrades (visible prefab swaps), Synty POLYGON art swap. → **🚀 v1.0 SHIP (single city).**
- **L3** Multi-city, real estate, trends/events UI. → v1.1
- **L4** Capital-markets ecosystem: your IPO + procedurally-simulated rival companies that IPO / get acquired, hostile takeovers (both directions), startup/VC investing. → v1.2
- **L5** Live-ops, tutorial, balancing, cosmetic DLC.

## Conventions
- Namespace `BarEmpire.Core` (sim) / `BarEmpire.Game` (presentation).
- Sim emits events; presentation subscribes. No `UnityEngine` types in `Scripts/Simulation`.
- All tunable numbers live in data defs, not inline in systems.
- Unity 6 LTS, URP, UI Toolkit for HUD/drawers, DOTween (free) for tweening, TextMeshPro. No paid plugins for v1.
- Art: Kenney CC0 for the prototype; Synty POLYGON packs for production.
- After each task: summarise decisions, assumptions, implementation notes, and next actions in your reply.

## Folder layout (target)
```
BarEmpire/ (Unity project root)
  Assets/Scripts/Simulation/      ← BarEmpireCore.cs, SimulationEngine.cs (no Program in build)
  Assets/Scripts/Presentation/    ← MonoBehaviours (L1+)
  Assets/Scripts/Data/            ← ScriptableObject wrappers (L1+)
  docs/GameDesignDocument.md
  CLAUDE.md
```

## Out of scope (v1)
Multiplayer, online leaderboards, UGC, real-estate auctions, bonds/credit markets, console ports, procedural city generation. Designed-for-later, not now.
