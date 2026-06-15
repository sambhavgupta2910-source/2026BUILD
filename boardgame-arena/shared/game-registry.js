import snakesAndLadders from './games/snakes-and-ladders.js';
import ludo from './games/ludo.js';
import monopoly from './games/monopoly/index.js';

export const registry = {
  [snakesAndLadders.id]: snakesAndLadders,
  [ludo.id]: ludo,
  [monopoly.id]: monopoly,
};

export const gameList = Object.values(registry).map((g) => ({ id: g.id, meta: g.meta }));
