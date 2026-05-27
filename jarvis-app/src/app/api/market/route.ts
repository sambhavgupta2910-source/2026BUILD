import { NextResponse } from 'next/server';

interface MarketData {
  price: number;
  change: number;
  history: number[];
}

interface MarketCache {
  data: { gold: MarketData; silver: MarketData };
  timestamp: number;
}

// In-memory cache — 15 minutes
let cache: MarketCache | null = null;
const CACHE_TTL = 15 * 60 * 1000;

const FALLBACK: { gold: MarketData; silver: MarketData } = {
  gold: {
    price: 3342.50,
    change: +0.42,
    history: [3290, 3305, 3318, 3300, 3325, 3338, 3342],
  },
  silver: {
    price: 32.74,
    change: +0.18,
    history: [31.80, 32.10, 32.40, 32.20, 32.55, 32.68, 32.74],
  },
};

async function fetchYahoo(symbol: string): Promise<MarketData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=7d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
    const validCloses = closes.filter((v: number | null) => v != null) as number[];
    if (validCloses.length < 2) return null;

    const price = validCloses[validCloses.length - 1];
    const prev  = validCloses[validCloses.length - 2];
    const change = prev ? +((((price - prev) / prev) * 100).toFixed(2)) : 0;

    return { price: +price.toFixed(2), change, history: validCloses.slice(-7) };
  } catch {
    return null;
  }
}

export async function GET() {
  // Serve from cache if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const [gold, silver] = await Promise.all([
    fetchYahoo('GC=F'),
    fetchYahoo('SI=F'),
  ]);

  const data = {
    gold:   gold   ?? FALLBACK.gold,
    silver: silver ?? FALLBACK.silver,
  };

  cache = { data, timestamp: Date.now() };
  return NextResponse.json(data);
}
