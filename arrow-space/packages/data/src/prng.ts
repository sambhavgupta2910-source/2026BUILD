/**
 * Deterministic PRNG. Same seed ⇒ identical stream ⇒ byte-identical dataset.
 * mulberry32 is small, fast, and good enough for synthetic fixtures.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded random helpers. All sampling in the generator goes through one Rng
 *  instance so output is fully reproducible from the seed. */
export class Rng {
  private readonly next: () => number;

  constructor(seed: number) {
    this.next = mulberry32(seed);
  }

  /** Float in [min, max). */
  float(min = 0, max = 1): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  /** True with probability p. */
  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  /** Uniform pick. */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error("Rng.pick: empty array");
    return arr[this.int(0, arr.length - 1)] as T;
  }

  /** Weighted pick over [value, weight] pairs. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    if (entries.length === 0) throw new Error("Rng.weighted: empty entries");
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = this.float(0, total);
    for (const [v, w] of entries) {
      r -= w;
      if (r <= 0) return v;
    }
    return entries[entries.length - 1]![0];
  }

  /** Fisher–Yates shuffle (returns a new array). */
  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = a[i] as T;
      a[i] = a[j] as T;
      a[j] = tmp;
    }
    return a;
  }

  /** k distinct elements sampled without replacement. */
  sample<T>(arr: readonly T[], k: number): T[] {
    return this.shuffle(arr).slice(0, Math.min(k, arr.length));
  }

  /** Round to 2 decimals — money. */
  money(min: number, max: number): number {
    return Math.round(this.float(min, max) * 100) / 100;
  }
}
