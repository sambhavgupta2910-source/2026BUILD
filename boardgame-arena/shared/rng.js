// Seeded PRNG (mulberry32) used by the server as the single source of truth for
// dice rolls and card draws. Each room gets its own SeededRng instance, seeded
// once at room creation. Clients never generate their own random results for
// gameplay-affecting outcomes - the server ships results inside `events`.

export class SeededRng {
  constructor(seed) {
    this.state = seed >>> 0;
  }

  // Returns a float in [0, 1)
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Integer in [min, max] inclusive
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  // Roll a single six-sided die
  rollDie() {
    return this.int(1, 6);
  }

  // Fisher-Yates shuffle, returns a new array
  shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

export function createRng(seed) {
  const actualSeed = seed === undefined
    ? Math.floor(Math.random() * 0xffffffff)
    : seed;
  return new SeededRng(actualSeed);
}
