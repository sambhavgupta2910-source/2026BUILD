// ============================================================================
//  BAR EMPIRE — Layer 0 Simulation Core (engine-independent, pure C#)
//  File 2/2 : Simulation engine + a runnable .NET console harness.
//
//  HOW TO RUN TODAY (no Unity needed):
//    1. Install .NET SDK (dotnet.microsoft.com)
//    2. dotnet new console -o BarEmpireSim
//    3. Drop BarEmpireCore.cs and this file into that folder (delete Program.cs)
//    4. dotnet run
//  You'll see the economy + production maturation play out week by week — the
//  engine validated before any Unity/art exists.
//
//  In Unity, EXCLUDE the Program class (standalone harness only); the
//  SimulationEngine class is what the Presentation layer drives.
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace BarEmpire.Core
{
    public sealed class SimulationEngine
    {
        public GameState S;
        private Rng _rng;

        private static readonly double[] EquipQ = { 1.00, 1.10, 1.18, 1.30 };
        private static readonly double[] EquipCap = { 1.00, 1.18, 1.45, 1.70 };
        private static readonly double[] TrainQ = { 1.00, 1.12, 1.22, 1.34 };
        private static readonly double[] TrainCap = { 1.00, 1.10, 1.18, 1.28 };
        private static readonly double[] TrainWage = { 700, 860, 1040, 1280 };

        public SimulationEngine(GameState s) { S = s; _rng = new Rng(s.Seed); }

        // ----------------------------------------------------------- new game
        public static GameState NewGame(string openingDistrict = "riverside", int seed = 12345)
        {
            var s = new GameState { Seed = seed };
            foreach (Category c in Enum.GetValues(typeof(Category)))
            {
                s.MarketIndex[c] = 1.0;
                s.OwnInventory[c] = 0;
                s.OwnInvQuality[c] = 0;
            }
            s.SourcingTier[Category.Beer]    = SupplyTier.Standard;
            s.SourcingTier[Category.Wine]    = SupplyTier.Premium;
            s.SourcingTier[Category.Scotch]  = SupplyTier.Premium;
            s.SourcingTier[Category.Spirits] = SupplyTier.Premium;
            s.SourcingTier[Category.Mixers]  = SupplyTier.Standard;

            foreach (var d in GameData.Drinks)
                s.Menu[d.Id] = new MenuItem { On = (d.Id != "raredram" && d.Id != "reserve"), Price = Math.Round(d.FairBase * 1.05, 1) };

            s.Venues.Add(new Venue { DistrictId = openingDistrict, Staff = 3 });
            return s;
        }

        // ----------------------------------------------------------- factors
        private double EquipFactorQ() => EquipQ[S.Equipment - 1];
        private double EquipFactorCap() => EquipCap[S.Equipment - 1];
        private double TrainFactorQ() => TrainQ[S.Training - 1];
        private double TrainFactorCap() => TrainCap[S.Training - 1];

        private static double Clamp(double x, double a, double b) => Math.Max(a, Math.Min(b, x));
        private static string Season(int wk) { int m = wk % 52; return m < 13 ? "spring" : m < 26 ? "summer" : m < 39 ? "autumn" : "winter"; }
        private double EconMult() => S.Economy == Economy.Boom ? 1.26 : S.Economy == Economy.Downturn ? 0.71 : 1.0;

        // effective quality of a category given own inventory vs sourcing policy
        private double CategoryQuality(Category c)
        {
            if (S.OwnInventory[c] > 0.001) return S.OwnInvQuality[c];
            var sup = GameData.SupplyFor(c, S.SourcingTier[c]);
            return sup?.Quality ?? 0.5;
        }

        // ----------------------------------------------------------- TICK
        public WeekResult Tick()
        {
            RunProduction();
            EvolveMarket();

            // brand quality contribution from equipment + training
            double eqtr = 0.30 * (TrainFactorQ() - 0.95) + 0.28 * (EquipFactorQ() - 0.95) + 0.18;

            // ---- demand pass: orders per drink across all venues
            var orders = new Dictionary<string, double>();
            var categoryDemand = new Dictionary<Category, double>();
            foreach (Category c in Enum.GetValues(typeof(Category))) categoryDemand[c] = 0;

            double appealSum = 0; int appealN = 0; double serviceSum = 0;
            string sea = Season(S.Week);
            var trend = GameData.Trend(S.TrendId)?.Boosts ?? new Dictionary<string, double>();

            foreach (var v in S.Venues)
            {
                var dist = GameData.District(v.DistrictId);
                var vt = GameData.VenueTiers.First(t => t.Tier == v.Tier);
                double compMult = 1.0 / (1.0 + dist.Competition * 0.11 * S.CompetitorPressure);
                double seasonMult = sea == "summer" ? 1.06 : sea == "winter" ? 0.98 : 1.0;
                double visitors = dist.Traffic * EconMult() * seasonMult
                    * (0.50 + 0.50 * S.Awareness / 100.0)
                    * (0.58 + 0.42 * S.Reputation / 100.0)
                    * compMult * vt.AppealMult;

                var live = S.Menu.Where(m => m.Value.On).Select(m => GameData.Drink(m.Key)).ToList();
                var weights = new Dictionary<string, double>();
                double wSum = 0, paSum = 0;
                foreach (var dr in live)
                {
                    double dq = Clamp(0.45 * CategoryQuality(dr.Primary) + eqtr, 0.2, 1.0);
                    double fair = dr.FairBase * (0.62 + 0.85 * dq) * dist.Affluence;
                    double price = S.Menu[dr.Id].Price;
                    double pa = Clamp(Math.Pow(fair / Math.Max(price, 0.5), 1.7), 0.05, 1.7);
                    double seasonM = dr.SeasonAffinity == sea ? 1.25 : dr.SeasonAffinity != null ? 0.85 : 1.0;
                    double trendM = trend.TryGetValue(dr.Id, out var tm) ? tm : 1.0;
                    double w = Math.Max(0.001, dr.Appeal * pa * seasonM * trendM);
                    weights[dr.Id] = w; wSum += w; paSum += pa; appealSum += pa; appealN++;
                }
                double conversion = Clamp(0.45 + 0.40 * (paSum / Math.Max(1, live.Count)), 0.30, 0.95);

                double capacity = v.Staff * 95 * vt.CapacityMult * EquipFactorCap() * TrainFactorCap();
                double rawDemand = visitors * conversion;
                double scale = rawDemand > capacity ? capacity / rawDemand : 1.0;
                serviceSum += Clamp(scale, 0, 1);

                foreach (var dr in live)
                {
                    double o = rawDemand * (weights[dr.Id] / wSum) * scale;
                    orders[dr.Id] = orders.GetValueOrDefault(dr.Id) + o;
                    categoryDemand[dr.Primary] += o * dr.PrimaryUse;
                    if (dr.Secondary.HasValue) categoryDemand[dr.Secondary.Value] += o * dr.SecondaryUse;
                }
            }

            // ---- consume supply: own inventory first (cheap), then sourced
            double cogs = 0; bool shortfall = false;
            foreach (Category c in categoryDemand.Keys.ToList())
            {
                double need = categoryDemand[c];
                if (need <= 0) continue;
                double own = Math.Min(need, S.OwnInventory[c]);
                double sourced = need - own;
                var line = GameData.Lines.FirstOrDefault(l => l.Category == c && S.OwnedLines.Contains(l.Id));
                if (own > 0 && line != null) { cogs += own * line.ProdCostPerUnit; S.OwnInventory[c] -= own; }
                if (sourced > 0)
                {
                    var sup = GameData.SupplyFor(c, S.SourcingTier[c]);
                    cogs += sourced * (sup?.BaseCostPerUnit ?? 3.0) * S.MarketIndex[c];
                    if (S.OwnedLines.Any(id => GameData.Line(id).Category == c)) shortfall = true; // built a line but still sourcing (maturing)
                }
            }

            // ---- revenue + labor cogs
            double revenue = 0; int units = 0;
            foreach (var kv in orders)
            {
                var dr = GameData.Drink(kv.Key);
                revenue += kv.Value * S.Menu[kv.Key].Price;
                cogs += kv.Value * dr.LaborCost;
                units += (int)Math.Round(kv.Value);
            }

            // ---- opex
            double rent = S.Venues.Where(v => !v.OwnsPremises).Sum(v => GameData.District(v.DistrictId).Rent);
            double wages = S.Venues.Sum(v => v.Staff) * TrainWage[S.Training - 1];
            double interest = S.Debt * 0.012;
            double opex = rent + wages + S.Marketing + interest;
            double gross = revenue - cogs;
            double net = gross - opex;

            // ---- apply finances
            S.Cash += net;
            if (S.Cash < 0) { S.Debt += -S.Cash; S.Cash = 0; }

            // ---- reputation + awareness
            double valuePerc = appealN > 0 ? Clamp(appealSum / appealN, 0, 1.7) / 1.4 : 0.5;
            double servicePerc = S.Venues.Count > 0 ? serviceSum / S.Venues.Count : 1;
            double avgQ = S.Menu.Where(m => m.Value.On).Average(m => CategoryQuality(GameData.Drink(m.Key).Primary));
            double repTarget = Clamp(100 * (0.35 + 0.40 * valuePerc * avgQ + 0.25 * servicePerc), 5, 100);
            S.Reputation = Clamp(S.Reputation + (repTarget - S.Reputation) * 0.28, 1, 100);
            S.Awareness = Clamp(S.Awareness * 0.90 + Math.Sqrt(S.Marketing / 200.0) * 2.2, 0, 100);

            var r = new WeekResult
            {
                Week = S.Week, Revenue = revenue, Cogs = cogs, Gross = gross, Opex = opex, Net = net,
                Rent = rent, Wages = wages, Marketing = S.Marketing, Interest = interest,
                Units = units, Reputation = S.Reputation, Shortfall = shortfall,
            };
            S.History.Add(r);
            S.Week++;
            return r;
        }

        // ----------------------------------------------------------- production + maturation
        private void RunProduction()
        {
            foreach (var id in S.OwnedLines)
            {
                var line = GameData.Line(id);
                S.Maturing.Add(new Batch
                {
                    Category = line.Category, Units = line.WeeklyOutput, Quality = line.Quality,
                    StartWeek = S.Week, ReadyWeek = S.Week + line.MaturationWeeks
                });
            }
            var ready = S.Maturing.Where(b => b.ReadyWeek <= S.Week).ToList();
            foreach (var b in ready)
            {
                var line = GameData.Lines.First(l => l.Category == b.Category);
                double agingYears = (S.Week - b.StartWeek) / 52.0;
                double q = Clamp(b.Quality + line.AgingUplift * agingYears, 0, 1.0);
                double existing = S.OwnInventory[b.Category];
                double newQ = existing > 0 ? (S.OwnInvQuality[b.Category] * existing + q * b.Units) / (existing + b.Units) : q;
                S.OwnInventory[b.Category] = existing + b.Units;
                S.OwnInvQuality[b.Category] = newQ;
                S.Maturing.Remove(b);
            }
        }

        // ----------------------------------------------------------- living market
        private void EvolveMarket()
        {
            double rr = _rng.Next();
            if (S.Economy == Economy.Stable) { if (rr < 0.06) S.Economy = Economy.Boom; else if (rr < 0.13) S.Economy = Economy.Downturn; }
            else if (S.Economy == Economy.Boom) { if (rr < 0.22) S.Economy = Economy.Stable; }
            else if (rr < 0.20) S.Economy = Economy.Stable;

            if (--S.TrendTimer <= 0)
            {
                var ids = GameData.Trends.Select(t => t.Id).Where(i => i != S.TrendId).ToList();
                S.TrendId = ids[_rng.Int(ids.Count)];
                S.TrendTimer = 5 + _rng.Int(6);
            }
            double drift = S.Economy == Economy.Boom ? 0.006 : S.Economy == Economy.Downturn ? -0.005 : 0.001;
            foreach (Category c in S.MarketIndex.Keys.ToList())
                S.MarketIndex[c] = Clamp(S.MarketIndex[c] * (1 + drift + (_rng.Next() - 0.5) * 0.05), 0.55, 2.4);
            S.CompetitorPressure = Clamp(S.CompetitorPressure + (_rng.Next() - 0.45) * 0.04, 0.7, 1.8);
        }

        // ----------------------------------------------------------- player actions (used by UI later)
        public bool BuildLine(string lineId)
        {
            var line = GameData.Line(lineId);
            if (line == null || S.OwnedLines.Contains(lineId) || S.Cash < line.Capex) return false;
            S.Cash -= line.Capex; S.OwnedLines.Add(lineId); return true;
        }
        public double NetWorth()
        {
            double inv = S.OwnInventory.Sum(kv => kv.Value * 2.0); // crude inventory value
            double prem = S.Venues.Where(v => v.OwnsPremises).Sum(v => v.PremisesValue);
            double lines = S.OwnedLines.Sum(id => GameData.Line(id).Capex * 0.5);
            return S.Cash - S.Debt + inv + prem + lines;
        }
    }

    // ============================== CONSOLE HARNESS ==============================
    // EXCLUDE this class from Unity builds — it's just to validate the engine.
    public static class Program
    {
        public static void Main()
        {
            var engine = new SimulationEngine(SimulationEngine.NewGame());
            var s = engine.S;

            // a simple auto-strategy to demonstrate vertical integration:
            engine.BuildLine("brewery");   // fast payback
            engine.BuildLine("distill");   // patient capital — won't pay off for ~3 years
            s.Menu["dram"].On = true;
            s.Marketing = 1200;

            Console.WriteLine("WEEK | NET      | CASH     | REP | ECON     | TREND          | OWN SCOTCH | NOTE");
            Console.WriteLine(new string('-', 92));
            for (int i = 0; i < 60; i++)
            {
                var r = engine.Tick();
                string note = r.Shortfall ? "sourcing scotch (distillery still maturing)" :
                              s.OwnInventory[Category.Scotch] > 1 ? "serving OWN aged malt" : "";
                if (i % 4 == 0 || s.OwnInventory[Category.Scotch] > 1 && i % 2 == 0)
                    Console.WriteLine($"{r.Week,4} | {r.Net,8:N0} | {s.Cash,8:N0} | {r.Reputation,3:N0} | {s.Economy,-8} | {GameData.Trend(s.TrendId).Name,-14} | {s.OwnInventory[Category.Scotch],10:N0} | {note}");
            }
            Console.WriteLine(new string('-', 92));
            Console.WriteLine($"After 60 weeks  |  Net worth ≈ {engine.NetWorth():N0}  |  Reputation {s.Reputation:N0}  |  Distillery matured: {(s.OwnInventory[Category.Scotch] > 1 ? "YES" : "not yet")}");
        }
    }
}
