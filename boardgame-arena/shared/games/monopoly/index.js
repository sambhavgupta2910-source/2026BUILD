// Monopoly shared game module. Runs in both the Node server and the browser
// client - no Node/DOM-specific APIs allowed here (no require/fs/document/window).

import { PLAYER_COLORS } from '../../protocol.js';
import { BOARD, GROUP_COLORS } from './board-data.js';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } from './decks.js';

const STARTING_CASH = 1500;
const GO_SALARY = 200;
const JAIL_POS = 10;
const JAIL_FINE = 50;
const BOARD_LEN = 40;

const CHANCE_BY_ID = Object.fromEntries(CHANCE_CARDS.map((c) => [c.id, c]));
const CHEST_BY_ID = Object.fromEntries(COMMUNITY_CHEST_CARDS.map((c) => [c.id, c]));

// Positions that are ownable (property/railroad/utility).
const OWNABLE_POS = BOARD.filter((c) =>
  c.type === 'property' || c.type === 'railroad' || c.type === 'utility'
).map((c) => c.pos);

const RAILROAD_POS = BOARD.filter((c) => c.type === 'railroad').map((c) => c.pos);
const UTILITY_POS = BOARD.filter((c) => c.type === 'utility').map((c) => c.pos);

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function cardById(deck, id) {
  return deck === 'chance' ? CHANCE_BY_ID[id] : CHEST_BY_ID[id];
}

function activePlayers(state) {
  return state.players.filter((p) => !p.bankrupt);
}

function playerIndexById(state, id) {
  return state.players.findIndex((p) => p.id === id);
}

// Count how many properties of a group an owner holds, and how many exist.
function groupOwnership(state, group, ownerId) {
  const positions = BOARD.filter((c) => c.type === 'property' && c.group === group).map((c) => c.pos);
  const owned = positions.filter((pos) => state.properties[pos].owner === ownerId);
  return { positions, owned, total: positions.length, ownsAll: owned.length === positions.length };
}

function railroadsOwned(state, ownerId) {
  return RAILROAD_POS.filter((pos) => state.properties[pos].owner === ownerId).length;
}

function utilitiesOwned(state, ownerId) {
  return UTILITY_POS.filter((pos) => state.properties[pos].owner === ownerId).length;
}

// ---------------------------------------------------------------------------
// Money / bankruptcy
// ---------------------------------------------------------------------------

// Try to charge `amount` from player at playerIndex, paying creditorId (a
// playerId string, or null/'bank' for the bank). Auto-liquidates then bankrupts
// if insolvent. Mutates state. Returns true if the player survived solvent,
// false if they went bankrupt. Pushes events.
function chargePlayer(state, playerIndex, amount, creditorId, events) {
  const player = state.players[playerIndex];
  if (amount <= 0) {
    return true;
  }

  if (player.cash >= amount) {
    player.cash -= amount;
    payCreditor(state, creditorId, amount);
    return true;
  }

  // Auto-liquidate: sell all houses/hotels, then mortgage all properties.
  liquidatePlayer(state, playerIndex, amount, events);

  if (player.cash >= amount) {
    player.cash -= amount;
    payCreditor(state, creditorId, amount);
    return true;
  }

  // Still insolvent -> bankrupt. Creditor gets whatever cash + assets remain.
  const remainingCash = player.cash;
  player.cash = 0;
  payCreditor(state, creditorId, remainingCash);
  bankruptPlayer(state, playerIndex, creditorId, events);
  return false;
}

function payCreditor(state, creditorId, amount) {
  if (!creditorId || creditorId === 'bank') return;
  const idx = playerIndexById(state, creditorId);
  if (idx >= 0) state.players[idx].cash += amount;
}

// Sell houses/hotels (half cost) then mortgage properties until solvent enough
// to cover `target`, or fully liquidated.
function liquidatePlayer(state, playerIndex, target, events) {
  const player = state.players[playerIndex];

  // 1) Sell houses/hotels back to bank at half house cost.
  let changed = true;
  while (player.cash < target && changed) {
    changed = false;
    for (const pos of player.properties) {
      const prop = state.properties[pos];
      const board = BOARD[pos];
      if (board.type !== 'property') continue;
      if (prop.hotel) {
        prop.hotel = false;
        prop.houses = 4;
        // Returning a hotel: take a hotel back, but need 4 houses available.
        if (state.bank.houses >= 4) {
          state.bank.houses -= 4;
        }
        state.bank.hotels += 1;
        player.cash += Math.floor(board.houseCost / 2) * 5; // hotel = 5 building units sold
        changed = true;
      } else if (prop.houses > 0) {
        prop.houses -= 1;
        state.bank.houses += 1;
        player.cash += Math.floor(board.houseCost / 2);
        changed = true;
      }
      if (player.cash >= target) break;
    }
  }

  // 2) Mortgage properties.
  changed = true;
  while (player.cash < target && changed) {
    changed = false;
    for (const pos of player.properties) {
      const prop = state.properties[pos];
      const board = BOARD[pos];
      if (prop.mortgaged) continue;
      if (board.type === 'property' && (prop.houses > 0 || prop.hotel)) continue;
      prop.mortgaged = true;
      player.cash += board.mortgage;
      changed = true;
      if (player.cash >= target) break;
    }
  }
}

function bankruptPlayer(state, playerIndex, creditorId, events) {
  const player = state.players[playerIndex];
  player.bankrupt = true;

  const props = player.properties.slice();
  for (const pos of props) {
    const prop = state.properties[pos];
    if (creditorId && creditorId !== 'bank') {
      const cIdx = playerIndexById(state, creditorId);
      prop.owner = creditorId;
      // Houses/hotels were already liquidated during chargePlayer attempt; but
      // be safe and clear them here too (return to bank).
      if (prop.hotel) { state.bank.hotels += 1; prop.hotel = false; }
      if (prop.houses > 0) { state.bank.houses += prop.houses; prop.houses = 0; }
      if (cIdx >= 0 && !state.players[cIdx].properties.includes(pos)) {
        state.players[cIdx].properties.push(pos);
      }
    } else {
      // Bank takes it -> becomes purchasable again at face value.
      if (prop.hotel) { state.bank.hotels += 1; prop.hotel = false; }
      if (prop.houses > 0) { state.bank.houses += prop.houses; prop.houses = 0; }
      prop.owner = null;
      prop.mortgaged = false;
    }
  }
  player.properties = [];

  // Transfer jail cards to creditor if a player, else discard back to decks.
  if (player.jailCards > 0) {
    if (creditorId && creditorId !== 'bank') {
      const cIdx = playerIndexById(state, creditorId);
      if (cIdx >= 0) state.players[cIdx].jailCards += player.jailCards;
    }
    player.jailCards = 0;
  }

  events.push({ type: 'bankrupt', playerId: player.id, creditorId: creditorId || 'bank' });
  state.log.push(`${player.id} went bankrupt.`);
}

// ---------------------------------------------------------------------------
// Card deck handling
// ---------------------------------------------------------------------------

function drawCard(state, deck, rng) {
  const deckKey = deck === 'chance' ? 'chanceDeck' : 'chestDeck';
  const discardKey = deck === 'chance' ? 'chanceDiscard' : 'chestDiscard';
  if (state[deckKey].length === 0) {
    state[deckKey] = rng.shuffle(state[discardKey]);
    state[discardKey] = [];
  }
  if (state[deckKey].length === 0) {
    // No cards anywhere (e.g. all jail cards held out). Fall back to full deck.
    const all = (deck === 'chance' ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS)
      .filter((c) => c.effect.type !== 'get_out_of_jail_free')
      .map((c) => c.id);
    state[deckKey] = rng.shuffle(all);
  }
  const id = state[deckKey].shift();
  const card = cardById(deck, id);
  // Get-out-of-jail-free cards are kept by the player, not discarded here.
  // All other cards return to the discard pile to be reshuffled later.
  if (card && card.effect.type !== 'get_out_of_jail_free') {
    state[discardKey].push(id);
  }
  return card;
}

// ---------------------------------------------------------------------------
// Movement helpers
// ---------------------------------------------------------------------------

function movePlayerTo(state, playerIndex, newPos, collectGo, events) {
  const player = state.players[playerIndex];
  const from = player.position;
  // Collect GO money if we pass or land on GO (and collectGo not disabled).
  if (collectGo !== false && newPos < from) {
    player.cash += GO_SALARY;
    events.push({ type: 'message', text: `${player.id} passed GO and collected $${GO_SALARY}.` });
  } else if (collectGo !== false && newPos === 0 && from !== 0) {
    player.cash += GO_SALARY;
    events.push({ type: 'message', text: `${player.id} landed on GO and collected $${GO_SALARY}.` });
  }
  player.position = newPos;
  events.push({ type: 'token_moved', playerId: player.id, from, to: newPos });
}

function nearestAhead(from, positions) {
  const sorted = positions.slice().sort((a, b) => a - b);
  for (const p of sorted) {
    if (p > from) return p;
  }
  return sorted[0]; // wrap to first
}

// ---------------------------------------------------------------------------
// Landing resolution
// ---------------------------------------------------------------------------

// Resolve landing on the player's current square. Keeps mutating state.phase
// until it settles into 'buy_decision', 'auction', or 'manage'. `opts` may carry
// { railroadMultiplier, diceTotal, depth, fromCard }.
function resolveLanding(state, playerIndex, rng, events, opts = {}) {
  const depth = opts.depth || 0;
  if (depth > 10) {
    state.phase = 'manage';
    return;
  }
  const player = state.players[playerIndex];
  if (player.bankrupt) {
    state.phase = 'manage';
    return;
  }
  const pos = player.position;
  const square = BOARD[pos];

  switch (square.type) {
    case 'go':
    case 'jail':
    case 'free_parking':
      state.phase = 'manage';
      return;

    case 'go_to_jail':
      sendToJail(state, playerIndex, 'square', events);
      state.phase = 'manage';
      return;

    case 'tax': {
      const ok = chargePlayer(state, playerIndex, square.amount, 'bank', events);
      events.push({ type: 'message', text: `${player.id} paid $${square.amount} ${square.name}.` });
      maybeGameOver(state);
      state.phase = 'manage';
      return;
    }

    case 'chance':
    case 'community_chest': {
      const deck = square.type === 'chance' ? 'chance' : 'community_chest';
      const card = drawCard(state, deck, rng);
      events.push({ type: 'card_drawn', deck, card: { text: card.text, id: card.id, effect: card.effect } });
      state.log.push(`${player.id} drew: ${card.text}`);
      applyCardEffect(state, playerIndex, deck, card, rng, events, depth + 1);
      // applyCardEffect sets phase (may recurse into resolveLanding).
      return;
    }

    case 'property':
    case 'railroad':
    case 'utility': {
      const prop = state.properties[pos];
      if (prop.owner === null) {
        state.phase = 'buy_decision';
        return;
      }
      if (prop.owner === player.id || prop.mortgaged) {
        state.phase = 'manage';
        return;
      }
      // Owned by another -> pay rent.
      const ownerIdx = playerIndexById(state, prop.owner);
      const rent = computeRent(state, pos, ownerIdx, rng, opts);
      const ok = chargePlayer(state, playerIndex, rent, prop.owner, events);
      events.push({
        type: 'rent_paid',
        fromId: player.id,
        toId: prop.owner,
        amount: rent,
        property: square.name,
      });
      maybeGameOver(state);
      state.phase = 'manage';
      return;
    }

    default:
      state.phase = 'manage';
      return;
  }
}

function computeRent(state, pos, ownerIdx, rng, opts = {}) {
  const square = BOARD[pos];
  const prop = state.properties[pos];
  const ownerId = state.players[ownerIdx].id;

  if (square.type === 'property') {
    const idx = prop.hotel ? 5 : prop.houses; // 0..4 houses, 5 = hotel
    // Double base rent if owner holds the full color group and no houses built.
    if (prop.houses === 0 && !prop.hotel) {
      const { ownsAll } = groupOwnership(state, square.group, ownerId);
      if (ownsAll) return square.rent[0] * 2;
    }
    return square.rent[idx];
  }

  if (square.type === 'railroad') {
    const count = railroadsOwned(state, ownerId);
    let base = 25 * Math.pow(2, count - 1);
    if (opts.railroadMultiplier) base *= opts.railroadMultiplier;
    return base;
  }

  if (square.type === 'utility') {
    const both = utilitiesOwned(state, ownerId) === 2;
    let dice = opts.diceTotal;
    if (typeof dice !== 'number') {
      dice = rng.rollDie() + rng.rollDie();
    }
    if (opts.utilityForce10) return dice * 10;
    return dice * (both ? 10 : 4);
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Card effects
// ---------------------------------------------------------------------------

function applyCardEffect(state, playerIndex, deck, card, rng, events, depth) {
  const player = state.players[playerIndex];
  const eff = card.effect;

  switch (eff.type) {
    case 'move_to': {
      movePlayerTo(state, playerIndex, eff.pos, eff.collectGo, events);
      resolveLanding(state, playerIndex, rng, events, { depth });
      return;
    }
    case 'move_relative': {
      let np = (player.position + eff.spaces) % BOARD_LEN;
      if (np < 0) np += BOARD_LEN;
      // Backward moves never collect GO; forward moves can pass GO.
      const collectGo = eff.spaces > 0 ? undefined : false;
      movePlayerTo(state, playerIndex, np, collectGo, events);
      resolveLanding(state, playerIndex, rng, events, { depth });
      return;
    }
    case 'collect': {
      player.cash += eff.amount;
      state.phase = 'manage';
      return;
    }
    case 'pay': {
      chargePlayer(state, playerIndex, eff.amount, 'bank', events);
      maybeGameOver(state);
      state.phase = 'manage';
      return;
    }
    case 'collect_from_each': {
      for (let i = 0; i < state.players.length; i++) {
        if (i === playerIndex || state.players[i].bankrupt) continue;
        chargePlayer(state, i, eff.amount, player.id, events);
      }
      maybeGameOver(state);
      state.phase = 'manage';
      return;
    }
    case 'pay_each': {
      for (let i = 0; i < state.players.length; i++) {
        if (i === playerIndex || state.players[i].bankrupt) continue;
        const survived = chargePlayer(state, playerIndex, eff.amount, state.players[i].id, events);
        if (!survived) break;
      }
      maybeGameOver(state);
      state.phase = 'manage';
      return;
    }
    case 'go_to_jail': {
      sendToJail(state, playerIndex, 'card', events);
      state.phase = 'manage';
      return;
    }
    case 'get_out_of_jail_free': {
      player.jailCards += 1;
      state.phase = 'manage';
      return;
    }
    case 'nearest_railroad': {
      const target = nearestAhead(player.position, RAILROAD_POS);
      movePlayerTo(state, playerIndex, target, undefined, events);
      resolveLanding(state, playerIndex, rng, events, { depth, railroadMultiplier: eff.multiplier || 2 });
      return;
    }
    case 'nearest_utility': {
      const target = nearestAhead(player.position, UTILITY_POS);
      movePlayerTo(state, playerIndex, target, undefined, events);
      resolveLanding(state, playerIndex, rng, events, { depth, utilityForce10: true });
      return;
    }
    case 'repairs': {
      let houses = 0;
      let hotels = 0;
      for (const pos of player.properties) {
        const prop = state.properties[pos];
        if (prop.hotel) hotels += 1;
        else houses += prop.houses;
      }
      const amount = eff.perHouse * houses + eff.perHotel * hotels;
      chargePlayer(state, playerIndex, amount, 'bank', events);
      maybeGameOver(state);
      state.phase = 'manage';
      return;
    }
    default:
      state.phase = 'manage';
      return;
  }
}

function sendToJail(state, playerIndex, reason, events) {
  const player = state.players[playerIndex];
  player.inJail = true;
  player.position = JAIL_POS;
  player.jailTurns = 0;
  state.doublesCount = 0;
  events.push({ type: 'jailed', playerId: player.id, reason: reason === 'card' ? 'card' : reason });
}

// ---------------------------------------------------------------------------
// Turn advancement & game over
// ---------------------------------------------------------------------------

function advanceTurn(state) {
  state.doublesCount = 0;
  const n = state.players.length;
  let idx = state.currentPlayerIndex;
  for (let step = 0; step < n; step++) {
    idx = (idx + 1) % n;
    if (!state.players[idx].bankrupt) break;
  }
  state.currentPlayerIndex = idx;
  state.phase = 'roll';
}

function maybeGameOver(state) {
  const alive = activePlayers(state);
  if (alive.length <= 1) {
    state.phase = 'game_over';
    state.winnerId = alive.length === 1 ? alive[0].id : null;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Building rules
// ---------------------------------------------------------------------------

function groupHouseStats(state, group) {
  const positions = BOARD.filter((c) => c.type === 'property' && c.group === group).map((c) => c.pos);
  const counts = positions.map((pos) => {
    const prop = state.properties[pos];
    return prop.hotel ? 5 : prop.houses;
  });
  return { positions, min: Math.min(...counts), max: Math.max(...counts) };
}

function canBuildHouse(state, playerIndex, pos) {
  const player = state.players[playerIndex];
  const board = BOARD[pos];
  if (board.type !== 'property') return false;
  const prop = state.properties[pos];
  if (prop.owner !== player.id) return false;
  if (prop.hotel || prop.houses >= 4) return false;
  const { ownsAll } = groupOwnership(state, board.group, player.id);
  if (!ownsAll) return false;
  // No property in the group may be mortgaged.
  const groupPositions = BOARD.filter((c) => c.type === 'property' && c.group === board.group).map((c) => c.pos);
  if (groupPositions.some((p) => state.properties[p].mortgaged)) return false;
  // Even-build: this property's count must be at the group minimum.
  const { min } = groupHouseStats(state, board.group);
  const cur = prop.houses;
  if (cur > min) return false;
  if (state.bank.houses <= 0) return false;
  if (player.cash < board.houseCost) return false;
  return true;
}

function canBuildHotel(state, playerIndex, pos) {
  const player = state.players[playerIndex];
  const board = BOARD[pos];
  if (board.type !== 'property') return false;
  const prop = state.properties[pos];
  if (prop.owner !== player.id) return false;
  if (prop.hotel || prop.houses !== 4) return false;
  const { ownsAll } = groupOwnership(state, board.group, player.id);
  if (!ownsAll) return false;
  const groupPositions = BOARD.filter((c) => c.type === 'property' && c.group === board.group).map((c) => c.pos);
  if (groupPositions.some((p) => state.properties[p].mortgaged)) return false;
  // Even-build: every property in group must be at 4 (or hotel) to add a hotel
  // and keep within 1; simplest: this must be at group min and min===4.
  const { min } = groupHouseStats(state, board.group);
  if (prop.houses > min) return false;
  if (state.bank.hotels <= 0) return false;
  if (player.cash < board.houseCost) return false;
  return true;
}

function canSellHouse(state, playerIndex, pos) {
  const player = state.players[playerIndex];
  const board = BOARD[pos];
  if (board.type !== 'property') return false;
  const prop = state.properties[pos];
  if (prop.owner !== player.id) return false;
  if (!prop.hotel && prop.houses <= 0) return false;
  // Even-sell: must sell from the property at the group maximum.
  const { max } = groupHouseStats(state, board.group);
  const cur = prop.hotel ? 5 : prop.houses;
  if (cur < max) return false;
  // Selling a hotel returns 4 houses to player as houses (need bank houses).
  if (prop.hotel && state.bank.houses < 4) return false;
  return true;
}

function canMortgage(state, playerIndex, pos) {
  const player = state.players[playerIndex];
  const board = BOARD[pos];
  if (!OWNABLE_POS.includes(pos)) return false;
  const prop = state.properties[pos];
  if (prop.owner !== player.id) return false;
  if (prop.mortgaged) return false;
  if (board.type === 'property' && (prop.houses > 0 || prop.hotel)) return false;
  return true;
}

function canUnmortgage(state, playerIndex, pos) {
  const player = state.players[playerIndex];
  const prop = state.properties[pos];
  if (!OWNABLE_POS.includes(pos)) return false;
  if (prop.owner !== player.id) return false;
  if (!prop.mortgaged) return false;
  const cost = Math.round(BOARD[pos].mortgage * 1.1);
  return player.cash >= cost;
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export default {
  id: 'monopoly',
  meta: { name: 'Monopoly', minPlayers: 2, maxPlayers: 4 },

  createInitialState(playerIds, rng) {
    const properties = {};
    for (const pos of OWNABLE_POS) {
      properties[pos] = { owner: null, houses: 0, hotel: false, mortgaged: false };
    }

    const chanceDeck = rng.shuffle(CHANCE_CARDS.map((c) => c.id));
    const chestDeck = rng.shuffle(COMMUNITY_CHEST_CARDS.map((c) => c.id));

    return {
      players: playerIds.map((id, index) => ({
        id,
        color: PLAYER_COLORS[index],
        cash: STARTING_CASH,
        position: 0,
        properties: [],
        inJail: false,
        jailTurns: 0,
        jailCards: 0,
        bankrupt: false,
      })),
      properties,
      chanceDeck,
      chanceDiscard: [],
      chestDeck,
      chestDiscard: [],
      bank: { houses: 32, hotels: 12 },
      currentPlayerIndex: 0,
      doublesCount: 0,
      phase: 'roll',
      pendingAuction: null,
      pendingTrade: null,
      log: [],
      winnerId: null,
    };
  },

  getAvailableActions(state, playerId) {
    if (state.phase === 'game_over' || state.winnerId) {
      return { phase: 'game_over', actions: [] };
    }

    // Trade sub-phase: trade target and proposer get actions regardless of turn.
    if (state.pendingTrade) {
      const t = state.pendingTrade;
      if (playerId === t.toId) {
        return {
          phase: 'trade',
          message: `${t.fromId} proposed a trade.`,
          actions: [
            { type: 'accept_trade', label: 'Accept Trade' },
            { type: 'reject_trade', label: 'Reject Trade' },
            { type: 'counter_trade', label: 'Counter Offer' },
          ],
        };
      }
      if (playerId === t.fromId) {
        // Proposer can cancel, plus continue managing if it's their turn.
        const actions = [{ type: 'cancel_trade', label: 'Cancel Trade' }];
        if (state.players[state.currentPlayerIndex].id === playerId && state.phase === 'manage') {
          actions.push(...manageActions(state, state.currentPlayerIndex, true));
        }
        return { phase: 'trade', actions };
      }
      // Everyone else waits.
      return { phase: state.phase, actions: [] };
    }

    // Auction sub-phase: current bidder gets actions regardless of main turn.
    if (state.phase === 'auction' && state.pendingAuction) {
      const a = state.pendingAuction;
      const bidderId = a.bidders[a.auctionTurnIndex];
      if (playerId === bidderId) {
        const player = state.players[playerIndexById(state, playerId)];
        const actions = [];
        if (player.cash > a.currentBid) {
          actions.push({ type: 'place_bid', label: 'Place Bid' });
        }
        actions.push({ type: 'pass_auction', label: 'Pass' });
        return {
          phase: 'auction',
          message: `Auction for ${BOARD[a.pos].name}. Current bid $${a.currentBid}.`,
          actions,
        };
      }
      return { phase: 'auction', actions: [] };
    }

    const current = state.players[state.currentPlayerIndex];
    if (!current || current.id !== playerId) {
      return { phase: state.phase, actions: [] };
    }

    const idx = state.currentPlayerIndex;

    if (state.phase === 'roll') {
      const player = state.players[idx];
      if (player.inJail) {
        const actions = [{ type: 'roll_dice', label: 'Roll for Doubles' }];
        if (player.cash >= JAIL_FINE) {
          actions.push({ type: 'pay_jail_fine', label: `Pay $${JAIL_FINE} Fine` });
        }
        if (player.jailCards > 0) {
          actions.push({ type: 'use_jail_card', label: 'Use Jail Card' });
        }
        return { phase: 'roll', message: 'You are in jail.', actions };
      }
      return { phase: 'roll', actions: [{ type: 'roll_dice', label: 'Roll Dice' }] };
    }

    if (state.phase === 'buy_decision') {
      const pos = state.players[idx].position;
      const price = BOARD[pos].price;
      const actions = [];
      if (state.players[idx].cash >= price) {
        actions.push({ type: 'buy_property', label: `Buy ${BOARD[pos].name} ($${price})` });
      }
      actions.push({ type: 'decline_purchase', label: 'Decline (Auction)' });
      return { phase: 'buy_decision', actions };
    }

    if (state.phase === 'manage') {
      return { phase: 'manage', actions: manageActions(state, idx, false) };
    }

    return { phase: state.phase, actions: [] };
  },

  applyAction(state, playerId, action, rng) {
    if (state.phase === 'game_over' || state.winnerId) {
      return { error: 'The game is over.' };
    }
    if (!action || !action.type) {
      return { error: 'No action provided.' };
    }

    const events = [];
    const type = action.type;
    const payload = action.payload || {};

    // --- Trade actions (may be a non-current player) ---
    if (['accept_trade', 'reject_trade', 'counter_trade', 'cancel_trade'].includes(type)) {
      return applyTradeAction(state, playerId, type, payload, events);
    }
    if (type === 'propose_trade') {
      return applyProposeTrade(state, playerId, payload, events);
    }

    // --- Auction actions (may be a non-current player) ---
    if (state.phase === 'auction' && (type === 'place_bid' || type === 'pass_auction')) {
      return applyAuctionAction(state, playerId, type, payload, rng, events);
    }

    // Block other actions while a trade is pending (except current player's manage moves).
    if (state.pendingTrade && type === 'end_turn') {
      return { error: 'Resolve the pending trade before ending your turn.' };
    }

    // --- Current-player actions ---
    const current = state.players[state.currentPlayerIndex];
    if (!current || current.id !== playerId) {
      return { error: 'It is not your turn.' };
    }
    const idx = state.currentPlayerIndex;
    const player = state.players[idx];

    switch (type) {
      case 'roll_dice':
        return applyRollDice(state, idx, rng, events);

      case 'pay_jail_fine': {
        if (state.phase !== 'roll' || !player.inJail) return { error: 'Cannot pay jail fine now.' };
        if (player.cash < JAIL_FINE) return { error: 'Not enough cash to pay the fine.' };
        player.cash -= JAIL_FINE;
        player.inJail = false;
        player.jailTurns = 0;
        events.push({ type: 'jail_release', playerId, reason: 'fine' });
        advanceTurn(state);
        return { state, events };
      }

      case 'use_jail_card': {
        if (state.phase !== 'roll' || !player.inJail) return { error: 'Cannot use jail card now.' };
        if (player.jailCards <= 0) return { error: 'You have no Get Out of Jail Free card.' };
        player.jailCards -= 1;
        player.inJail = false;
        player.jailTurns = 0;
        events.push({ type: 'jail_release', playerId, reason: 'card' });
        advanceTurn(state);
        return { state, events };
      }

      case 'buy_property':
        return applyBuyProperty(state, idx, events);

      case 'decline_purchase':
        return applyDeclinePurchase(state, idx, events);

      case 'build_house':
        return applyBuildHouse(state, idx, payload, events);

      case 'build_hotel':
        return applyBuildHotel(state, idx, payload, events);

      case 'sell_house':
        return applySellHouse(state, idx, payload, events);

      case 'mortgage_property':
        return applyMortgage(state, idx, payload, events);

      case 'unmortgage_property':
        return applyUnmortgage(state, idx, payload, events);

      case 'end_turn':
        return applyEndTurn(state, idx, events);

      default:
        return { error: `Unknown action: ${type}` };
    }
  },

  checkGameOver(state) {
    if (state.winnerId) return { over: true, winnerId: state.winnerId };
    const alive = activePlayers(state);
    if (alive.length === 1) return { over: true, winnerId: alive[0].id };
    return { over: false };
  },

  getBoardLayout(state) {
    const cells = [];
    for (let pos = 0; pos < BOARD_LEN; pos++) {
      const { col, row } = posToColRow(pos);
      const board = BOARD[pos];
      cells.push({
        id: pos,
        col,
        row,
        kind: board.type,
        name: board.name,
        ...(board.group ? { group: board.group } : {}),
      });
    }

    const tokens = state.players
      .filter((p) => !p.bankrupt)
      .map((p) => ({
        playerId: p.id,
        color: p.color,
        cellId: p.position,
        tokenIndex: 0,
      }));

    return { type: 'grid', cols: 11, rows: 11, cells, tokens, decorations: [] };
  },

  getPlayerSummary(state, playerId) {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return [];
    return [
      { label: 'Cash', value: `$${player.cash}` },
      { label: 'Properties', value: String(player.properties.length) },
      { label: 'In Jail', value: player.inJail ? 'Yes' : 'No' },
      { label: 'Jail Cards', value: String(player.jailCards) },
      { label: 'Status', value: player.bankrupt ? 'Bankrupt' : 'Active' },
    ];
  },

  renderHooks: {
    drawCell(ctx, cell, rect, state) {
      const board = BOARD[cell.id];
      if (!board) return false;
      // Color-group stripe band for property cells.
      if (board.type === 'property' && GROUP_COLORS[board.group]) {
        ctx.save();
        ctx.fillStyle = GROUP_COLORS[board.group];
        const bandH = Math.max(4, rect.h * 0.22);
        ctx.fillRect(rect.x, rect.y, rect.w, bandH);
        ctx.restore();
      }

      // Houses / hotel icons.
      const prop = state && state.properties ? state.properties[cell.id] : null;
      if (prop) {
        ctx.save();
        const iconY = rect.y + rect.h * 0.30;
        if (prop.hotel) {
          ctx.fillStyle = '#d62828';
          ctx.fillRect(rect.x + rect.w * 0.35, iconY, rect.w * 0.3, rect.h * 0.18);
        } else if (prop.houses > 0) {
          ctx.fillStyle = '#2a9d2a';
          const hw = rect.w * 0.16;
          for (let i = 0; i < prop.houses; i++) {
            ctx.fillRect(rect.x + rect.w * 0.05 + i * (hw + 2), iconY, hw, rect.h * 0.14);
          }
        }
        ctx.restore();

        // Mortgaged diagonal hatch overlay.
        if (prop.mortgaged) {
          ctx.save();
          ctx.strokeStyle = 'rgba(120,120,120,0.7)';
          ctx.lineWidth = 1;
          for (let o = -rect.h; o < rect.w; o += 6) {
            ctx.beginPath();
            ctx.moveTo(rect.x + o, rect.y);
            ctx.lineTo(rect.x + o + rect.h, rect.y + rect.h);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // Name + price text.
      ctx.save();
      ctx.fillStyle = '#111';
      ctx.font = `${Math.max(6, Math.floor(rect.h * 0.13))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const label = shortName(board.name);
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h * 0.55, rect.w - 2);
      if (board.price) {
        ctx.fillText(`$${board.price}`, rect.x + rect.w / 2, rect.y + rect.h * 0.78, rect.w - 2);
      }
      ctx.restore();
      return false;
    },
  },
};

// ---------------------------------------------------------------------------
// Action implementations
// ---------------------------------------------------------------------------

function manageActions(state, idx, isProposerSide) {
  const player = state.players[idx];
  const actions = [];

  for (const pos of player.properties) {
    if (canBuildHouse(state, idx, pos)) {
      actions.push({ type: 'build_house', label: `Build house on ${shortName(BOARD[pos].name)}`, payload: { pos } });
    }
    if (canBuildHotel(state, idx, pos)) {
      actions.push({ type: 'build_hotel', label: `Build hotel on ${shortName(BOARD[pos].name)}`, payload: { pos } });
    }
    if (canSellHouse(state, idx, pos)) {
      actions.push({ type: 'sell_house', label: `Sell house on ${shortName(BOARD[pos].name)}`, payload: { pos } });
    }
    if (canMortgage(state, idx, pos)) {
      actions.push({ type: 'mortgage_property', label: `Mortgage ${shortName(BOARD[pos].name)}`, payload: { pos } });
    }
    if (canUnmortgage(state, idx, pos)) {
      actions.push({ type: 'unmortgage_property', label: `Unmortgage ${shortName(BOARD[pos].name)}`, payload: { pos } });
    }
  }

  // Trades may be proposed to any other active player.
  if (!state.pendingTrade) {
    for (const other of state.players) {
      if (other.id === player.id || other.bankrupt) continue;
      actions.push({ type: 'propose_trade', label: `Propose trade to ${other.id}`, payload: { toPlayerId: other.id } });
    }
  }

  // end_turn only when no pending trade/auction (and not when offering as proposer-side helper).
  if (!isProposerSide && !state.pendingTrade && !state.pendingAuction) {
    actions.push({ type: 'end_turn', label: 'End Turn' });
  }

  return actions;
}

function applyRollDice(state, idx, rng, events) {
  if (state.phase !== 'roll') return { error: 'You cannot roll right now.' };
  const player = state.players[idx];

  const d1 = rng.rollDie();
  const d2 = rng.rollDie();
  const sum = d1 + d2;
  const doubles = d1 === d2;
  events.push({ type: 'dice_rolled', playerId: player.id, values: [d1, d2] });

  if (player.inJail) {
    if (doubles) {
      player.inJail = false;
      player.jailTurns = 0;
      events.push({ type: 'jail_release', playerId: player.id, reason: 'doubles' });
      const np = (player.position + sum) % BOARD_LEN;
      movePlayerTo(state, idx, np, undefined, events);
      resolveLanding(state, idx, rng, events, { diceTotal: sum });
      maybeGameOver(state);
      // Doubles out of jail do NOT grant another roll.
      return { state, events };
    }
    // Not doubles in jail.
    player.jailTurns += 1;
    if (player.jailTurns >= 3) {
      const survived = chargePlayer(state, idx, JAIL_FINE, 'bank', events);
      player.inJail = false;
      player.jailTurns = 0;
      events.push({ type: 'jail_release', playerId: player.id, reason: 'served_time' });
      if (survived || !player.bankrupt) {
        const np = (player.position + sum) % BOARD_LEN;
        movePlayerTo(state, idx, np, undefined, events);
        resolveLanding(state, idx, rng, events, { diceTotal: sum });
      }
      maybeGameOver(state);
      return { state, events };
    }
    // Stays in jail; turn passes.
    events.push({ type: 'message', text: `${player.id} stays in jail.` });
    state.log.push(`${player.id} failed to roll doubles and stays in jail.`);
    advanceTurn(state);
    return { state, events };
  }

  // Not in jail.
  if (doubles) {
    state.doublesCount += 1;
    if (state.doublesCount === 3) {
      sendToJail(state, idx, 'three_doubles', events);
      events.push({ type: 'jailed', playerId: player.id, reason: 'three_doubles' });
      state.phase = 'manage';
      return { state, events };
    }
  }

  const np = (player.position + sum) % BOARD_LEN;
  movePlayerTo(state, idx, np, undefined, events);
  resolveLanding(state, idx, rng, events, { diceTotal: sum });
  maybeGameOver(state);
  return { state, events };
}

function applyBuyProperty(state, idx, events) {
  if (state.phase !== 'buy_decision') return { error: 'Nothing to buy right now.' };
  const player = state.players[idx];
  const pos = player.position;
  const price = BOARD[pos].price;
  if (player.cash < price) return { error: 'Not enough cash to buy this property.' };
  player.cash -= price;
  state.properties[pos].owner = player.id;
  player.properties.push(pos);
  events.push({ type: 'property_bought', playerId: player.id, property: BOARD[pos].name, price });
  state.phase = 'manage';
  return { state, events };
}

function applyDeclinePurchase(state, idx, events) {
  if (state.phase !== 'buy_decision') return { error: 'Nothing to decline.' };
  const pos = state.players[idx].position;
  const bidders = activePlayers(state).map((p) => p.id);
  state.pendingAuction = {
    pos,
    currentBid: 0,
    highBidderId: null,
    bidders,
    passed: [],
    auctionTurnIndex: 0,
  };
  state.phase = 'auction';
  events.push({ type: 'auction_started', pos, property: BOARD[pos].name });
  // If somehow only one bidder, resolve immediately.
  resolveAuctionIfDone(state, events);
  return { state, events };
}

function applyAuctionAction(state, playerId, type, payload, rng, events) {
  const a = state.pendingAuction;
  if (!a) return { error: 'No auction in progress.' };
  const expected = a.bidders[a.auctionTurnIndex];
  if (playerId !== expected) return { error: 'It is not your turn to bid.' };

  if (type === 'place_bid') {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= a.currentBid) {
      return { error: 'Bid must be higher than the current bid.' };
    }
    const pIdx = playerIndexById(state, playerId);
    if (state.players[pIdx].cash < amount) return { error: 'You cannot afford that bid.' };
    a.currentBid = amount;
    a.highBidderId = playerId;
    events.push({ type: 'auction_bid', playerId, amount, pos: a.pos });
    advanceAuctionTurn(state);
    resolveAuctionIfDone(state, events);
    return { state, events };
  }

  // pass_auction
  if (!a.passed.includes(playerId)) a.passed.push(playerId);
  events.push({ type: 'message', text: `${playerId} passed on the auction.` });
  advanceAuctionTurn(state);
  resolveAuctionIfDone(state, events);
  return { state, events };
}

function advanceAuctionTurn(state) {
  const a = state.pendingAuction;
  const n = a.bidders.length;
  let next = a.auctionTurnIndex;
  for (let step = 0; step < n; step++) {
    next = (next + 1) % n;
    if (!a.passed.includes(a.bidders[next])) break;
  }
  a.auctionTurnIndex = next;
}

function resolveAuctionIfDone(state, events) {
  const a = state.pendingAuction;
  const remaining = a.bidders.filter((id) => !a.passed.includes(id));

  let done = false;
  if (remaining.length === 0) {
    done = true;
  } else if (remaining.length === 1 && a.highBidderId) {
    // Only the high bidder remains active.
    if (remaining[0] === a.highBidderId) done = true;
  }

  if (!done) return;

  if (a.highBidderId) {
    const wIdx = playerIndexById(state, a.highBidderId);
    state.players[wIdx].cash -= a.currentBid;
    state.properties[a.pos].owner = a.highBidderId;
    state.players[wIdx].properties.push(a.pos);
    events.push({ type: 'auction_won', playerId: a.highBidderId, pos: a.pos, amount: a.currentBid, property: BOARD[a.pos].name });
  } else {
    events.push({ type: 'message', text: `No one bid on ${BOARD[a.pos].name}; it remains unowned.` });
  }

  state.pendingAuction = null;
  state.phase = 'manage';
}

function applyBuildHouse(state, idx, payload, events) {
  if (state.phase !== 'manage') return { error: 'You can only build during the manage phase.' };
  const pos = payload.pos;
  if (!canBuildHouse(state, idx, pos)) return { error: 'You cannot build a house there.' };
  const board = BOARD[pos];
  state.players[idx].cash -= board.houseCost;
  state.properties[pos].houses += 1;
  state.bank.houses -= 1;
  events.push({ type: 'message', text: `${state.players[idx].id} built a house on ${board.name}.` });
  return { state, events };
}

function applyBuildHotel(state, idx, payload, events) {
  if (state.phase !== 'manage') return { error: 'You can only build during the manage phase.' };
  const pos = payload.pos;
  if (!canBuildHotel(state, idx, pos)) return { error: 'You cannot build a hotel there.' };
  const board = BOARD[pos];
  state.players[idx].cash -= board.houseCost;
  state.properties[pos].houses = 0;
  state.properties[pos].hotel = true;
  state.bank.houses += 4; // return the 4 houses
  state.bank.hotels -= 1;
  events.push({ type: 'message', text: `${state.players[idx].id} built a hotel on ${board.name}.` });
  return { state, events };
}

function applySellHouse(state, idx, payload, events) {
  if (state.phase !== 'manage') return { error: 'You can only sell during the manage phase.' };
  const pos = payload.pos;
  if (!canSellHouse(state, idx, pos)) return { error: 'You cannot sell a building there.' };
  const board = BOARD[pos];
  const prop = state.properties[pos];
  if (prop.hotel) {
    prop.hotel = false;
    prop.houses = 4;
    state.bank.hotels += 1;
    state.bank.houses -= 4;
    state.players[idx].cash += Math.floor(board.houseCost / 2) * 5;
  } else {
    prop.houses -= 1;
    state.bank.houses += 1;
    state.players[idx].cash += Math.floor(board.houseCost / 2);
  }
  events.push({ type: 'message', text: `${state.players[idx].id} sold a building on ${board.name}.` });
  return { state, events };
}

function applyMortgage(state, idx, payload, events) {
  if (state.phase !== 'manage') return { error: 'You can only mortgage during the manage phase.' };
  const pos = payload.pos;
  if (!canMortgage(state, idx, pos)) return { error: 'You cannot mortgage that property.' };
  state.properties[pos].mortgaged = true;
  state.players[idx].cash += BOARD[pos].mortgage;
  events.push({ type: 'message', text: `${state.players[idx].id} mortgaged ${BOARD[pos].name}.` });
  return { state, events };
}

function applyUnmortgage(state, idx, payload, events) {
  if (state.phase !== 'manage') return { error: 'You can only unmortgage during the manage phase.' };
  const pos = payload.pos;
  if (!canUnmortgage(state, idx, pos)) return { error: 'You cannot unmortgage that property.' };
  const cost = Math.round(BOARD[pos].mortgage * 1.1);
  state.players[idx].cash -= cost;
  state.properties[pos].mortgaged = false;
  events.push({ type: 'message', text: `${state.players[idx].id} unmortgaged ${BOARD[pos].name}.` });
  return { state, events };
}

function applyEndTurn(state, idx, events) {
  if (state.phase !== 'manage') return { error: 'You can only end your turn during the manage phase.' };
  if (state.pendingTrade) return { error: 'Resolve the pending trade first.' };
  if (state.pendingAuction) return { error: 'Resolve the pending auction first.' };

  const player = state.players[idx];
  // Doubles bonus: same player rolls again (unless they were jailed this turn).
  if (state.doublesCount > 0 && !player.inJail) {
    state.phase = 'roll';
    return { state, events };
  }

  advanceTurn(state);
  return { state, events };
}

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------

function normalizeOffer(offer) {
  offer = offer || {};
  return {
    cashFrom: Math.max(0, Number(offer.cashFrom) || 0),
    cashTo: Math.max(0, Number(offer.cashTo) || 0),
    propertiesFrom: Array.isArray(offer.propertiesFrom) ? offer.propertiesFrom.slice() : [],
    propertiesTo: Array.isArray(offer.propertiesTo) ? offer.propertiesTo.slice() : [],
    jailCardsFrom: Math.max(0, Number(offer.jailCardsFrom) || 0),
    jailCardsTo: Math.max(0, Number(offer.jailCardsTo) || 0),
  };
}

function applyProposeTrade(state, playerId, payload, events) {
  if (state.phase !== 'manage') return { error: 'You can only propose trades during your manage phase.' };
  const current = state.players[state.currentPlayerIndex];
  if (!current || current.id !== playerId) return { error: 'Only the current player may propose a trade.' };
  if (state.pendingTrade) return { error: 'A trade is already pending.' };
  const toId = payload.toPlayerId;
  const toIdx = playerIndexById(state, toId);
  if (toIdx < 0 || toId === playerId || state.players[toIdx].bankrupt) {
    return { error: 'Invalid trade target.' };
  }
  state.pendingTrade = { fromId: playerId, toId, offer: normalizeOffer(payload.offer) };
  events.push({ type: 'message', text: `${playerId} proposed a trade to ${toId}.` });
  return { state, events };
}

function applyTradeAction(state, playerId, type, payload, events) {
  const t = state.pendingTrade;
  if (!t) return { error: 'No trade pending.' };

  if (type === 'cancel_trade') {
    if (playerId !== t.fromId) return { error: 'Only the proposer can cancel the trade.' };
    state.pendingTrade = null;
    events.push({ type: 'message', text: `${playerId} cancelled the trade.` });
    return { state, events };
  }

  if (type === 'reject_trade') {
    if (playerId !== t.toId) return { error: 'Only the trade target can reject.' };
    state.pendingTrade = null;
    events.push({ type: 'message', text: `${playerId} rejected the trade.` });
    return { state, events };
  }

  if (type === 'counter_trade') {
    if (playerId !== t.toId) return { error: 'Only the trade target can counter.' };
    state.pendingTrade = {
      fromId: t.toId,
      toId: t.fromId,
      offer: normalizeOffer(payload.offer),
    };
    events.push({ type: 'message', text: `${playerId} countered the trade.` });
    return { state, events };
  }

  if (type === 'accept_trade') {
    if (playerId !== t.toId) return { error: 'Only the trade target can accept.' };
    const fromIdx = playerIndexById(state, t.fromId);
    const toIdx = playerIndexById(state, t.toId);
    const from = state.players[fromIdx];
    const to = state.players[toIdx];
    const o = t.offer;

    // Validate ownership and affordability at accept time.
    if (o.propertiesFrom.some((pos) => state.properties[pos].owner !== from.id)) {
      return { error: 'Proposer no longer owns an offered property.' };
    }
    if (o.propertiesTo.some((pos) => state.properties[pos].owner !== to.id)) {
      return { error: 'You no longer own a requested property.' };
    }
    // No buildings on traded properties.
    const anyBuildings = (pos) => {
      const p = state.properties[pos];
      return p.houses > 0 || p.hotel;
    };
    if (o.propertiesFrom.some(anyBuildings) || o.propertiesTo.some(anyBuildings)) {
      return { error: 'Cannot trade properties with buildings on them.' };
    }
    if (from.cash < o.cashFrom) return { error: 'Proposer cannot afford the cash offered.' };
    if (to.cash < o.cashTo) return { error: 'You cannot afford the cash offered.' };
    if (from.jailCards < o.jailCardsFrom) return { error: 'Proposer lacks the jail cards offered.' };
    if (to.jailCards < o.jailCardsTo) return { error: 'You lack the jail cards offered.' };

    // Execute atomically.
    from.cash -= o.cashFrom;
    to.cash += o.cashFrom;
    to.cash -= o.cashTo;
    from.cash += o.cashTo;

    from.jailCards -= o.jailCardsFrom;
    to.jailCards += o.jailCardsFrom;
    to.jailCards -= o.jailCardsTo;
    from.jailCards += o.jailCardsTo;

    for (const pos of o.propertiesFrom) {
      state.properties[pos].owner = to.id;
      from.properties = from.properties.filter((p) => p !== pos);
      if (!to.properties.includes(pos)) to.properties.push(pos);
    }
    for (const pos of o.propertiesTo) {
      state.properties[pos].owner = from.id;
      to.properties = to.properties.filter((p) => p !== pos);
      if (!from.properties.includes(pos)) from.properties.push(pos);
    }

    state.pendingTrade = null;
    events.push({ type: 'message', text: `Trade completed between ${from.id} and ${to.id}.` });
    return { state, events };
  }

  return { error: `Unknown trade action: ${type}` };
}

// ---------------------------------------------------------------------------
// Board layout geometry
// ---------------------------------------------------------------------------

// Map position 0-39 to {col,row} on an 11x11 grid forming a square ring.
// pos 0 (GO) = bottom-right corner (col 10, row 10).
// Counter-clockwise: 0-10 bottom edge right->left, 10 (Jail) = bottom-left,
// 10-20 left edge bottom->top, 20 (Free Parking) = top-left,
// 20-30 top edge left->right, 30 (Go To Jail) = top-right,
// 30-40 right edge top->bottom.
function posToColRow(pos) {
  if (pos <= 10) {
    // bottom row, right to left
    return { col: 10 - pos, row: 10 };
  }
  if (pos <= 20) {
    // left column, bottom to top
    return { col: 0, row: 10 - (pos - 10) };
  }
  if (pos <= 30) {
    // top row, left to right
    return { col: pos - 20, row: 0 };
  }
  // right column, top to bottom
  return { col: 10, row: pos - 30 };
}

function shortName(name) {
  if (name.length <= 12) return name;
  return name.slice(0, 11) + '.';
}
