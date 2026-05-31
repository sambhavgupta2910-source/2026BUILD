// ============================================================================
//  BAR EMPIRE — Layer 0 Simulation Core (engine-independent, pure C#)
//  File 1/2 : Data model, sample content, and game state.
//
//  No UnityEngine dependency on purpose: this layer is unit-testable and can
//  run in a plain .NET console (see Program.Main in SimulationEngine.cs).
//  Unity ScriptableObject wrappers come later in the Presentation/Data layer;
//  these POCOs stay the single source of truth for the simulation.
//
//  THEME-AGNOSTIC: "drinks / venues / production" are data. Swapping the
//  product later (back to coffee, or anything else) is a content change here,
//  not an engine change.
// ============================================================================

using System;
using System.Collections.Generic;

namespace BarEmpire.Core
{
    // ---------------------------------------------------------------- enums
    public enum Economy { Boom, Stable, Downturn }

    // What a venue sells is built from supply categories. Each category can be
    // SOURCED on the open market OR produced in-house (the vertical-integration
    // decision). Categories differ in production time/margin (the spectrum).
    public enum Category { Beer, Wine, Scotch, Spirits, Mixers }

    public enum SupplyTier { Standard, Premium, Reserve, TopShelf }

    // ---------------------------------------------------------------- data defs (POCO)
    // A drink on the menu. Cost is driven by the supply categories it consumes.
    public sealed class DrinkDef
    {
        public string Id;
        public string Name;
        public double Appeal;        // intrinsic desirability
        public double FairBase;      // reference price anchor at quality 0
        public Category Primary;     // main supply category consumed
        public double PrimaryUse;    // units of primary per serving
        public Category? Secondary;  // optional secondary (e.g. mixers)
        public double SecondaryUse;
        public double LaborCost;     // non-supply cost per serving
        public string SeasonAffinity; // "summer" | "winter" | null
    }

    // Open-market supply: buyable instantly at market price × tier multiplier.
    public sealed class SupplyDef
    {
        public Category Category;
        public SupplyTier Tier;
        public double BaseCostPerUnit; // multiplied by the live market index
        public double Quality;         // 0..1 ceiling contributed to drinks
    }

    // An in-house production facility (the build-vs-buy core).
    // Beer matures fast/cheap/low-margin; Scotch matures over years/high-margin.
    public sealed class ProductionLineDef
    {
        public string Id;
        public string Name;
        public Category Category;
        public double Capex;            // one-time build cost
        public double WeeklyOutput;     // units produced per week at full run
        public double ProdCostPerUnit;  // marginal cost to produce (< market)
        public double Quality;          // quality of own output (0..1)
        public int MaturationWeeks;     // weeks until a batch becomes usable
        public double AgingUplift;      // extra value/quality per matured year (Scotch)
    }

    public sealed class VenueTierDef
    {
        public int Tier;            // 1 kiosk-bar, 2 bar, 3 flagship
        public string Name;
        public double CapacityMult; // throughput multiplier
        public double AppealMult;   // local appeal multiplier
        public double UpgradeCost;
    }

    public sealed class DistrictDef
    {
        public string Id;
        public string City;
        public string Name;
        public double Traffic;      // base weekly footfall
        public double Rent;         // weekly
        public double Affluence;    // price tolerance
        public int Competition;     // rival density
        public double Fitout;       // capex to open a venue here
    }

    public sealed class TrendDef
    {
        public string Id;
        public string Name;
        public Dictionary<string, double> Boosts; // drinkId -> multiplier
        public string Note;
    }

    // ---------------------------------------------------------------- live state
    public sealed class Venue
    {
        public string DistrictId;
        public int Tier = 1;
        public int Staff = 3;
        public bool OwnsPremises = false;
        public double PremisesValue = 0;
    }

    // A batch of in-house product working through maturation.
    public sealed class Batch
    {
        public Category Category;
        public double Units;
        public double Quality;
        public int StartWeek;
        public int ReadyWeek;
    }

    public sealed class MenuItem { public bool On; public double Price; }

    public sealed class GameState
    {
        public int Week = 1;
        public double Cash = 60000;     // bars are more capital-intensive than cafés
        public double Debt = 0;
        public double Reputation = 42;
        public double Awareness = 25;

        public int Equipment = 1;       // bar equipment tier (1..4)
        public int Training = 1;        // staff training tier (1..4)
        public double Marketing = 800;  // weekly spend

        // sourcing policy: chosen open-market tier per category
        public Dictionary<Category, SupplyTier> SourcingTier = new();

        // in-house production
        public List<string> OwnedLines = new();   // ProductionLineDef ids built
        public List<Batch> Maturing = new();       // batches not yet ready
        public Dictionary<Category, double> OwnInventory = new(); // ready, usable
        public Dictionary<Category, double> OwnInvQuality = new(); // wtd avg quality

        public Dictionary<string, MenuItem> Menu = new();
        public List<Venue> Venues = new();

        // living market
        public Economy Economy = Economy.Stable;
        public string TrendId = "balanced";
        public int TrendTimer = 6;
        public Dictionary<Category, double> MarketIndex = new(); // price multiplier per category
        public double CompetitorPressure = 1.0;

        public List<WeekResult> History = new();
        public int Seed = 12345;
    }

    public sealed class WeekResult
    {
        public int Week;
        public double Revenue, Cogs, Gross, Opex, Net;
        public double Rent, Wages, Marketing, Interest;
        public int Units;
        public double Reputation;
        public bool Shortfall;       // ran out of a supply category
        public string Event = "";
    }

    // ---------------------------------------------------------------- sample content
    // Bar-empire content. All tunable; this is the starting catalogue.
    public static class GameData
    {
        public static readonly List<DrinkDef> Drinks = new()
        {
            new(){ Id="draft",   Name="Craft Draft",      Appeal=1.05, FairBase=7.0,  Primary=Category.Beer,    PrimaryUse=1.0, LaborCost=0.6, SeasonAffinity="summer" },
            new(){ Id="houserw", Name="House Red/White",  Appeal=1.15, FairBase=11.0, Primary=Category.Wine,    PrimaryUse=1.0, LaborCost=0.7 },
            new(){ Id="reserve", Name="Reserve Vintage",  Appeal=1.30, FairBase=22.0, Primary=Category.Wine,    PrimaryUse=1.0, LaborCost=0.9 },
            new(){ Id="dram",    Name="Single Malt Dram", Appeal=1.25, FairBase=18.0, Primary=Category.Scotch,  PrimaryUse=1.0, LaborCost=0.8, SeasonAffinity="winter" },
            new(){ Id="raredram",Name="Rare Aged Malt",   Appeal=1.45, FairBase=42.0, Primary=Category.Scotch,  PrimaryUse=1.0, LaborCost=1.0 },
            new(){ Id="cocktail",Name="Signature Cocktail",Appeal=1.35,FairBase=16.0, Primary=Category.Spirits, PrimaryUse=1.0, Secondary=Category.Mixers, SecondaryUse=1.0, LaborCost=1.4 },
            new(){ Id="highball",Name="Highball",         Appeal=1.10, FairBase=12.0, Primary=Category.Spirits, PrimaryUse=0.7, Secondary=Category.Mixers, SecondaryUse=1.2, LaborCost=0.9, SeasonAffinity="summer" },
        };

        public static readonly List<SupplyDef> Supply = new()
        {
            // Beer
            new(){ Category=Category.Beer,   Tier=SupplyTier.Standard, BaseCostPerUnit=1.8, Quality=0.50 },
            new(){ Category=Category.Beer,   Tier=SupplyTier.Premium,  BaseCostPerUnit=2.9, Quality=0.70 },
            // Wine
            new(){ Category=Category.Wine,   Tier=SupplyTier.Standard, BaseCostPerUnit=3.5, Quality=0.55 },
            new(){ Category=Category.Wine,   Tier=SupplyTier.Premium,  BaseCostPerUnit=6.0, Quality=0.75 },
            new(){ Category=Category.Wine,   Tier=SupplyTier.Reserve,  BaseCostPerUnit=11.0,Quality=0.90 },
            // Scotch
            new(){ Category=Category.Scotch, Tier=SupplyTier.Premium,  BaseCostPerUnit=7.5, Quality=0.72 },
            new(){ Category=Category.Scotch, Tier=SupplyTier.Reserve,  BaseCostPerUnit=14.0,Quality=0.88 },
            new(){ Category=Category.Scotch, Tier=SupplyTier.TopShelf, BaseCostPerUnit=26.0,Quality=1.00 },
            // Spirits / Mixers
            new(){ Category=Category.Spirits,Tier=SupplyTier.Standard, BaseCostPerUnit=2.5, Quality=0.55 },
            new(){ Category=Category.Spirits,Tier=SupplyTier.Premium,  BaseCostPerUnit=4.5, Quality=0.78 },
            new(){ Category=Category.Mixers, Tier=SupplyTier.Standard, BaseCostPerUnit=0.6, Quality=0.60 },
            new(){ Category=Category.Mixers, Tier=SupplyTier.Premium,  BaseCostPerUnit=1.1, Quality=0.80 },
        };

        // The production spectrum — the signature system.
        // Maturation weeks are compressed for game pacing (1 in-game yr = 52 wks).
        public static readonly List<ProductionLineDef> Lines = new()
        {
            new(){ Id="brewery",  Name="Craft Brewery",   Category=Category.Beer,   Capex=120000,  WeeklyOutput=900, ProdCostPerUnit=0.9, Quality=0.74, MaturationWeeks=3,   AgingUplift=0.0 },
            new(){ Id="wineest",  Name="Wine Estate",     Category=Category.Wine,   Capex=480000,  WeeklyOutput=420, ProdCostPerUnit=1.8, Quality=0.85, MaturationWeeks=52,  AgingUplift=0.05 },
            new(){ Id="distill",  Name="Scotch Distillery",Category=Category.Scotch, Capex=900000, WeeklyOutput=260, ProdCostPerUnit=2.6, Quality=0.90, MaturationWeeks=156, AgingUplift=0.10 },
        };

        public static readonly List<VenueTierDef> VenueTiers = new()
        {
            new(){ Tier=1, Name="Pop-up Bar", CapacityMult=1.0, AppealMult=1.0, UpgradeCost=0 },
            new(){ Tier=2, Name="Bar",        CapacityMult=1.6, AppealMult=1.2, UpgradeCost=85000 },
            new(){ Tier=3, Name="Flagship",   CapacityMult=2.4, AppealMult=1.5, UpgradeCost=320000 },
        };

        public static readonly List<DistrictDef> Districts = new()
        {
            new(){ Id="riverside", City="Bayside", Name="Riverside Strip", Traffic=900,  Rent=1600, Affluence=1.00, Competition=2, Fitout=0 },
            new(){ Id="market",    City="Bayside", Name="Market Lane",     Traffic=1250, Rent=2200, Affluence=1.05, Competition=3, Fitout=42000 },
            new(){ Id="harbor",    City="Bayside", Name="Harbour Front",   Traffic=1700, Rent=3400, Affluence=1.25, Competition=5, Fitout=120000 },
        };

        public static readonly List<TrendDef> Trends = new()
        {
            new(){ Id="balanced",  Name="Balanced Scene",      Boosts=new(), Note="No strong pull." },
            new(){ Id="cocktail",  Name="Craft-Cocktail Boom", Boosts=new(){{"cocktail",1.7},{"highball",1.3}}, Note="Mixology is everywhere." },
            new(){ Id="malt",      Name="Single-Malt Surge",   Boosts=new(){{"dram",1.6},{"raredram",1.8}}, Note="Whisky connoisseurs out in force." },
            new(){ Id="natural",   Name="Natural-Wine Wave",   Boosts=new(){{"houserw",1.4},{"reserve",1.6}}, Note="Wine-forward crowd." },
            new(){ Id="craftbeer", Name="Craft-Beer Hype",     Boosts=new(){{"draft",1.8}}, Note="Taprooms are the move." },
            new(){ Id="lowno",     Name="Premiumization",      Boosts=new(){{"reserve",1.5},{"raredram",1.6},{"cocktail",1.3}}, Note="Drink less, drink better." },
        };

        public static DrinkDef Drink(string id) => Drinks.Find(d => d.Id == id);
        public static DistrictDef District(string id) => Districts.Find(d => d.Id == id);
        public static ProductionLineDef Line(string id) => Lines.Find(l => l.Id == id);
        public static TrendDef Trend(string id) => Trends.Find(t => t.Id == id);
        public static SupplyDef SupplyFor(Category c, SupplyTier t) =>
            Supply.Find(s => s.Category == c && s.Tier == t) ?? Supply.Find(s => s.Category == c);
    }

    // ---------------------------------------------------------------- deterministic RNG
    public sealed class Rng
    {
        private uint _a;
        public Rng(int seed) { _a = (uint)seed; }
        public double Next() // mulberry32, [0,1)
        {
            _a += 0x6D2B79F5u;
            uint t = _a;
            t = (t ^ (t >> 15)) * (1u | t);
            t ^= t + (t ^ (t >> 7)) * (61u | t);
            return ((t ^ (t >> 14)) & 0xFFFFFFFFu) / 4294967296.0;
        }
        public double Range(double a, double b) => a + Next() * (b - a);
        public int Int(int n) => (int)(Next() * n);
    }
}
