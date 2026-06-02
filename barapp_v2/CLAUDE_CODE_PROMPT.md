# Claude Code — Kickoff Prompt (Layer 1)

Paste the block below into Claude Code, run from the project root after placing
the files (see "Setup" at the bottom).

---

You are the lead Unity engineer on "Bar Empire" (working title PROOF), a real-time
business-tycoon city-builder. Before writing any code, read `CLAUDE.md` and
`docs/GameDesignDocument.md` in full, then read the existing simulation core at
`Assets/Scripts/Simulation/BarEmpireCore.cs` and `Assets/Scripts/Simulation/SimulationEngine.cs`.

Do NOT rewrite the simulation layer. It is pure, deterministic C# with no UnityEngine
dependency and it must stay that way. Your job in Layer 1 is to build the Unity
presentation layer that DRIVES this existing engine and proves the game is fun.

Constraints (from CLAUDE.md — honour all):
- No AI/LLM features. No network calls.
- Simulation stays decoupled from rendering; presentation reads state / subscribes to
  events and never mutates sim state directly. Add an event/notification mechanism on
  the sim if one is missing, without adding UnityEngine references to the Simulation layer.
- Real-time with pause + speed (Pause/1x/2x/3x). The economic Tick() is fixed-step and
  decoupled from the 60fps render; interpolate visuals between ticks.
- Mobile-first. Pedestrians are pooled and hard-capped; they represent demand, they are
  not the demand simulation.
- Use Unity 6 LTS + URP, UI Toolkit for HUD/drawers, placeholder primitives or Kenney CC0
  art only (no paid assets yet).

Layer 1 deliverables (one city — "Bayside" — only):
1. A `TimeController` MonoBehaviour wrapping the sim's time: pause/speed UI, fires Tick()
   on a fixed in-game cadence.
2. A tile/lot grid for the Bayside districts from the data; tap an empty lot to open a
   build menu and place a venue; tap a venue to open a context drawer (staff +/-, tier,
   stats). Use placeholder prefabs that visibly differ by venue tier.
3. A bottom command bar for brand-wide policies that exist in the sim today: menu pricing,
   sourcing tier per category, marketing spend, build a production line (brewery/distillery).
4. A pooled pedestrian/agent system (capped) whose flow scales with the sim's computed
   foot traffic; customers visibly enter busy venues.
5. A minimal HUD: cash, net worth, reputation, in-game date, speed controls; a weekly
   summary panel surfacing the WeekResult.
6. A `SaveSystem` that serialises `GameState` to JSON at persistentDataPath, versioned.

Working method:
- FIRST, propose a short implementation plan and the scene/prefab/script structure, and
  list any assumptions or sim-layer gaps you found. Wait for my OK before building.
- Then build incrementally, smallest runnable milestone first (grid + place one venue +
  pause/play driving Tick() + cash updating on screen), so I can press Play early.
- Keep the Simulation folder free of UnityEngine references at all times.
- After each milestone, summarise: decisions, assumptions, implementation notes, next actions.

Start by reading the four files and giving me the Layer 1 plan.

---

## Setup (do this once, before pasting the prompt)
1. Create a Unity 6 LTS project (URP, mobile template) named `BarEmpire`.
2. Place files:
   - `Assets/Scripts/Simulation/BarEmpireCore.cs`
   - `Assets/Scripts/Simulation/SimulationEngine.cs`  (in Unity, the console `Program`
     class won't run but won't break the build; optionally delete the `Program` class)
   - `docs/GameDesignDocument.md`
   - `CLAUDE.md` at the project root
3. Install Claude Code (see https://docs.claude.com/en/docs/claude-code/overview for
   current setup), open it in the `BarEmpire` folder, and paste the prompt above.

Note: Claude Code writes and edits files; it cannot run the Unity editor or play-test.
You compile and press Play; report back what you see and it iterates.
