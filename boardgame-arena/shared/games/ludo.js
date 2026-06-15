// Ludo shared game module. Runs in both the Node server and the browser
// client - no Node/DOM-specific APIs allowed here.

import { PLAYER_COLORS } from '../protocol.js';

const GRID = 15; // 15x15 grid
const RING_LENGTH = 52; // shared outer path squares (logical ring)
const HOME_COLUMN_LENGTH = 6; // squares 52..57 in a player's own reference frame
const FINAL_INDEX = RING_LENGTH + HOME_COLUMN_LENGTH - 1; // 57 = final home square
const TOKENS_PER_PLAYER = 4;
const MAX_CONSECUTIVE_SIXES = 3;

// ---------------------------------------------------------------------------
// Board geometry
//
// The 15x15 grid is a 3x3 arrangement of 5x5/6x6 blocks. The four 6x6 corner
// blocks (cols/rows 0-5 and 9-14) are the colored yards. The cross arms run
// along cols 6 & 8 (vertical lanes) and rows 6 & 8 (horizontal lanes), with
// 4 "bridge" cells at (6,6),(8,6),(6,8),(8,8) connecting perpendicular arms
// near the center. Each color's 6-cell home column runs along row 7 or
// col 7, leading toward the center cell (7,7).
//
// RING_COORDS[i] = grid {col,row} for shared-ring absolute index i (0-51).
// Index 0 is red's entry/start square. Each color's startIndex is 13 apart.
// ---------------------------------------------------------------------------

const RING_COORDS = [
  // Quadrant 0 (red), absolute ring indices 0-12
  { col: 1, row: 6 }, { col: 2, row: 6 }, { col: 3, row: 6 }, { col: 4, row: 6 }, { col: 5, row: 6 },
  { col: 6, row: 6 }, { col: 6, row: 5 }, { col: 6, row: 4 }, { col: 6, row: 3 }, { col: 6, row: 2 },
  { col: 6, row: 1 }, { col: 6, row: 0 }, { col: 8, row: 0 },
  // Quadrant 1 (blue), absolute ring indices 13-25
  { col: 8, row: 1 }, { col: 8, row: 2 }, { col: 8, row: 3 }, { col: 8, row: 4 }, { col: 8, row: 5 },
  { col: 8, row: 6 }, { col: 9, row: 6 }, { col: 10, row: 6 }, { col: 11, row: 6 }, { col: 12, row: 6 },
  { col: 13, row: 6 }, { col: 14, row: 6 }, { col: 14, row: 8 },
  // Quadrant 2 (green), absolute ring indices 26-38
  { col: 13, row: 8 }, { col: 12, row: 8 }, { col: 11, row: 8 }, { col: 10, row: 8 }, { col: 9, row: 8 },
  { col: 8, row: 8 }, { col: 8, row: 9 }, { col: 8, row: 10 }, { col: 8, row: 11 }, { col: 8, row: 12 },
  { col: 8, row: 13 }, { col: 8, row: 14 }, { col: 6, row: 14 },
  // Quadrant 3 (yellow), absolute ring indices 39-51
  { col: 6, row: 13 }, { col: 6, row: 12 }, { col: 6, row: 11 }, { col: 6, row: 10 }, { col: 6, row: 9 },
  { col: 6, row: 8 }, { col: 5, row: 8 }, { col: 4, row: 8 }, { col: 3, row: 8 }, { col: 2, row: 8 },
  { col: 1, row: 8 }, { col: 0, row: 8 }, { col: 0, row: 6 },
];

// Home column coordinates per color, indexed 0-5 (pathIndex 52-57). Index 5
// (pathIndex 57) is the final home square, closest to the center.
const HOME_COLUMN_COORDS = {
  red: [{ col: 1, row: 7 }, { col: 2, row: 7 }, { col: 3, row: 7 }, { col: 4, row: 7 }, { col: 5, row: 7 }, { col: 6, row: 7 }],
  blue: [{ col: 7, row: 1 }, { col: 7, row: 2 }, { col: 7, row: 3 }, { col: 7, row: 4 }, { col: 7, row: 5 }, { col: 7, row: 6 }],
  green: [{ col: 13, row: 7 }, { col: 12, row: 7 }, { col: 11, row: 7 }, { col: 10, row: 7 }, { col: 9, row: 7 }, { col: 8, row: 7 }],
  yellow: [{ col: 7, row: 13 }, { col: 7, row: 12 }, { col: 7, row: 11 }, { col: 7, row: 10 }, { col: 7, row: 9 }, { col: 7, row: 8 }],
};

// Yard coordinates: 4 token "parking spots" per color, within that color's
// 6x6 corner block.
const YARD_COORDS = {
  red: [{ col: 1, row: 1 }, { col: 2, row: 1 }, { col: 1, row: 2 }, { col: 2, row: 2 }],
  blue: [{ col: 1, row: 12 }, { col: 2, row: 12 }, { col: 1, row: 13 }, { col: 2, row: 13 }],
  green: [{ col: 12, row: 1 }, { col: 13, row: 1 }, { col: 12, row: 2 }, { col: 13, row: 2 }],
  yellow: [{ col: 12, row: 12 }, { col: 13, row: 12 }, { col: 12, row: 13 }, { col: 13, row: 13 }],
};

// Yard block bounds (for drawing the colored corner backgrounds), per color.
const YARD_BLOCKS = {
  red: { col0: 0, row0: 0 },
  green: { col0: 9, row0: 0 },
  yellow: { col0: 9, row0: 9 },
  blue: { col0: 0, row0: 9 },
};

// Each color's entry point into the shared ring (absolute ring index).
// Spaced 13 apart, matching seat order red(0), blue(1), green(2), yellow(3).
const START_INDEX = { red: 0, blue: 13, green: 26, yellow: 39 };

// Safe squares: each color's start square, plus 4 standard "star" squares
// 8 squares after each start.
const SAFE_RING_INDICES = new Set();
for (const color of PLAYER_COLORS) {
  const start = START_INDEX[color];
  SAFE_RING_INDICES.add(start);
  SAFE_RING_INDICES.add((start + 8) % RING_LENGTH);
}

function colorForSeat(index) {
  return PLAYER_COLORS[index];
}

function absRingIndex(color, pathIndex) {
  return (START_INDEX[color] + pathIndex) % RING_LENGTH;
}

function cellIdForToken(color, token) {
  if (token.status === 'yard') {
    return `yard-${color}-${token.tokenIndex}`;
  }
  if (token.status === 'home') {
    return `home-${color}-${token.tokenIndex}`;
  }
  // status === 'path'
  if (token.pathIndex >= RING_LENGTH) {
    const homeIdx = token.pathIndex - RING_LENGTH; // 0-5
    return `homecol-${color}-${homeIdx}`;
  }
  return `ring-${absRingIndex(color, token.pathIndex)}`;
}

function getPlayer(state, playerId) {
  return state.players.find((p) => p.id === playerId);
}

function allTokensHome(player) {
  return player.tokens.every((t) => t.status === 'home');
}

// Returns the list of legal move_token actions {tokenIndex} for a player
// given the last dice roll.
function legalMoves(player, roll) {
  const moves = [];
  player.tokens.forEach((token, tokenIndex) => {
    if (token.status === 'home') return;
    if (token.status === 'yard') {
      if (roll === 6) moves.push(tokenIndex);
      return;
    }
    // status === 'path'
    if (token.pathIndex + roll <= FINAL_INDEX) {
      moves.push(tokenIndex);
    }
  });
  return moves;
}

// Advance currentPlayerIndex to the next player who hasn't finished yet.
// Returns the same index if everyone else has finished (shouldn't happen
// since the game ends as soon as one player finishes).
function nextPlayerIndex(state) {
  const n = state.players.length;
  let idx = state.currentPlayerIndex;
  for (let step = 1; step <= n; step++) {
    const candidate = (idx + step) % n;
    if (!allTokensHome(state.players[candidate])) {
      return candidate;
    }
  }
  return state.currentPlayerIndex;
}

export default {
  id: 'ludo',
  meta: { name: 'Ludo', minPlayers: 2, maxPlayers: 4 },

  createInitialState(playerIds, rng) {
    const players = playerIds.map((id, index) => ({
      id,
      color: colorForSeat(index),
      tokens: Array.from({ length: TOKENS_PER_PLAYER }, (_, tokenIndex) => ({
        tokenIndex,
        status: 'yard',
        pathIndex: null,
      })),
    }));

    return {
      players,
      currentPlayerIndex: 0,
      // 'roll' = waiting for roll_dice; 'move' = waiting for move_token/pass_turn
      turnPhase: 'roll',
      lastRoll: null,
      consecutiveSixes: 0,
      winnerId: null,
    };
  },

  getAvailableActions(state, playerId) {
    if (state.winnerId) {
      return { phase: 'game_over', actions: [] };
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || playerId !== currentPlayer.id) {
      return { phase: 'waiting', actions: [] };
    }

    if (state.turnPhase === 'roll') {
      return { phase: 'roll', actions: [{ type: 'roll_dice', label: 'Roll Dice' }] };
    }

    // turnPhase === 'move'
    const moves = legalMoves(currentPlayer, state.lastRoll);
    if (moves.length === 0) {
      return { phase: 'move', actions: [{ type: 'pass_turn', label: 'No moves - Pass' }] };
    }

    return {
      phase: 'move',
      actions: moves.map((tokenIndex) => ({
        type: 'move_token',
        label: `Move token ${tokenIndex + 1}`,
        payload: { tokenIndex },
      })),
    };
  },

  applyAction(state, playerId, action, rng) {
    if (state.winnerId) {
      return { error: 'The game is already over.' };
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || playerId !== currentPlayer.id) {
      return { error: 'It is not your turn.' };
    }

    if (!action || typeof action.type !== 'string') {
      return { error: `Unknown action: ${action && action.type}` };
    }

    if (action.type === 'roll_dice') {
      return handleRollDice(state, currentPlayer, rng);
    }

    if (action.type === 'move_token') {
      return handleMoveToken(state, currentPlayer, action, rng);
    }

    if (action.type === 'pass_turn') {
      return handlePassTurn(state, currentPlayer);
    }

    return { error: `Unknown action: ${action.type}` };
  },

  checkGameOver(state) {
    if (state.winnerId) {
      return { over: true, winnerId: state.winnerId };
    }
    return { over: false };
  },

  getBoardLayout(state) {
    const cells = [];
    const seenIds = new Set();
    const pushCell = (cell) => {
      if (seenIds.has(cell.id)) return;
      seenIds.add(cell.id);
      cells.push(cell);
    };

    // Shared ring cells
    RING_COORDS.forEach((coord, ringIndex) => {
      pushCell({
        id: `ring-${ringIndex}`,
        col: coord.col,
        row: coord.row,
        kind: 'path',
        safe: SAFE_RING_INDICES.has(ringIndex),
      });
    });

    // Home column cells per color
    for (const color of PLAYER_COLORS) {
      HOME_COLUMN_COORDS[color].forEach((coord, homeIdx) => {
        pushCell({
          id: `homecol-${color}-${homeIdx}`,
          col: coord.col,
          row: coord.row,
          kind: 'home_column',
          color,
        });
      });
    }

    // Yard cells (4 per color)
    for (const color of PLAYER_COLORS) {
      YARD_COORDS[color].forEach((coord, tokenIndex) => {
        pushCell({
          id: `yard-${color}-${tokenIndex}`,
          col: coord.col,
          row: coord.row,
          kind: 'yard',
          color,
        });
      });
      // Yard background block (covers the full 6x6 corner area).
      const block = YARD_BLOCKS[color];
      for (let dc = 0; dc < 6; dc++) {
        for (let dr = 0; dr < 6; dr++) {
          const col = block.col0 + dc;
          const row = block.row0 + dr;
          // Don't duplicate the 4 token-spot cells already added above.
          pushCell({
            id: `yardbg-${color}-${col}-${row}`,
            col,
            row,
            kind: 'yard',
            color,
          });
        }
      }
    }

    // "Home" finish cells per color (4 tokens that have completed the board
    // stack on the final home-column square visually; give each a distinct
    // cell id so 16 tokens always map to 16 unique-but-stackable cells).
    for (const color of PLAYER_COLORS) {
      for (let tokenIndex = 0; tokenIndex < TOKENS_PER_PLAYER; tokenIndex++) {
        const final = HOME_COLUMN_COORDS[color][HOME_COLUMN_LENGTH - 1];
        pushCell({
          id: `home-${color}-${tokenIndex}`,
          col: final.col,
          row: final.row,
          kind: 'home_column',
          color,
        });
      }
    }

    // Center "finish" cell
    pushCell({ id: 'center', col: 7, row: 7, kind: 'center' });

    // Start cells - mark the entry square for each color (also part of the
    // ring, but expose a 'start' kind flag via a duplicate lookup is not
    // possible since ids must be unique; instead mark via the ring cell's
    // safe flag and color below).
    for (const color of PLAYER_COLORS) {
      const startRingIndex = START_INDEX[color];
      const cell = cells.find((c) => c.id === `ring-${startRingIndex}`);
      if (cell) {
        cell.kind = 'start';
        cell.color = color;
      }
    }

    const tokens = [];
    state.players.forEach((player) => {
      player.tokens.forEach((token) => {
        tokens.push({
          playerId: player.id,
          color: player.color,
          cellId: cellIdForToken(player.color, token),
          tokenIndex: token.tokenIndex,
        });
      });
    });

    return {
      type: 'grid',
      cols: GRID,
      rows: GRID,
      cells,
      tokens,
      decorations: [],
    };
  },

  getPlayerSummary(state, playerId) {
    const player = getPlayer(state, playerId);
    if (!player) return [];
    const homeCount = player.tokens.filter((t) => t.status === 'home').length;
    return [{ label: 'Tokens home', value: `${homeCount}/${TOKENS_PER_PLAYER}` }];
  },

  renderHooks: {
    drawCell(ctx, cell, rect, state) {
      if (cell.safe || cell.kind === 'start') {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 215, 0, 0.85)';
        ctx.strokeStyle = 'rgba(120, 90, 0, 0.9)';
        ctx.lineWidth = Math.max(1, rect.w * 0.04);
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        const outerR = Math.min(rect.w, rect.h) * 0.35;
        const innerR = outerR * 0.45;
        const points = 5;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (Math.PI / points) * i - Math.PI / 2;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // Let the renderer also draw the default cell background/border.
      return false;
    },
  },
};

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

function handleRollDice(state, currentPlayer, rng) {
  if (state.turnPhase !== 'roll') {
    return { error: 'You must move or pass before rolling again.' };
  }

  const events = [];
  const roll = rng.rollDie();
  events.push({ type: 'dice_rolled', playerId: currentPlayer.id, value: roll });

  const players = state.players.map((p) => ({
    ...p,
    tokens: p.tokens.map((t) => ({ ...t })),
  }));

  let consecutiveSixes = state.consecutiveSixes;
  if (roll === 6) {
    consecutiveSixes += 1;
  } else {
    consecutiveSixes = 0;
  }

  const updatedPlayer = players[state.currentPlayerIndex];
  const moves = legalMoves(updatedPlayer, roll);

  let newState = {
    ...state,
    players,
    lastRoll: roll,
    consecutiveSixes,
    turnPhase: 'move',
  };

  // If the player rolled three consecutive 6s, the rule says the extra-turn
  // privilege is forfeited, but they may still act on this roll if legal.
  // If there are no legal moves at all (regardless of six-count), pass the
  // turn immediately (advance to next player), since there is nothing to
  // act on.
  if (moves.length === 0) {
    events.push({ type: 'message', text: 'No legal moves - turn passed.' });
    newState = advanceTurn(newState, roll, consecutiveSixes);
  }

  return { state: newState, events };
}

function handleMoveToken(state, currentPlayer, action, rng) {
  if (state.turnPhase !== 'move') {
    return { error: 'You must roll the dice first.' };
  }

  const tokenIndex = action.payload && action.payload.tokenIndex;
  if (
    typeof tokenIndex !== 'number'
    || tokenIndex < 0
    || tokenIndex >= TOKENS_PER_PLAYER
  ) {
    return { error: 'Invalid token index.' };
  }

  const roll = state.lastRoll;
  const players = state.players.map((p) => ({
    ...p,
    tokens: p.tokens.map((t) => ({ ...t })),
  }));
  const player = players[state.currentPlayerIndex];
  const token = player.tokens[tokenIndex];

  if (!token || token.status === 'home') {
    return { error: 'That token cannot move.' };
  }

  const moves = legalMoves(player, roll);
  if (!moves.includes(tokenIndex)) {
    return { error: 'That token has no legal move with the current roll.' };
  }

  const events = [];
  const color = player.color;

  if (token.status === 'yard') {
    // Moving out of the yard requires roll === 6 (enforced by legalMoves).
    token.status = 'path';
    token.pathIndex = 0;
    events.push({
      type: 'token_moved',
      playerId: player.id,
      tokenIndex,
      from: 'yard',
      to: 0,
    });
    maybeCapture(players, player, color, 0, events);
  } else {
    const from = token.pathIndex;
    const to = from + roll;
    token.pathIndex = to;

    if (to === FINAL_INDEX) {
      token.status = 'home';
      events.push({
        type: 'token_moved',
        playerId: player.id,
        tokenIndex,
        from,
        to: 'home',
      });
    } else {
      events.push({
        type: 'token_moved',
        playerId: player.id,
        tokenIndex,
        from,
        to,
      });
      if (to < RING_LENGTH) {
        maybeCapture(players, player, color, to, events);
      }
    }
  }

  let newState = {
    ...state,
    players,
    turnPhase: 'move',
  };

  // Check win condition immediately.
  if (allTokensHome(player)) {
    newState.winnerId = player.id;
    events.push({ type: 'message', text: `${player.id} wins!` });
    return { state: newState, events };
  }

  newState = advanceTurn(newState, roll, state.consecutiveSixes);

  return { state: newState, events: appendExtraTurnEvent(events, newState, state, roll) };
}

function handlePassTurn(state, currentPlayer) {
  if (state.turnPhase !== 'move') {
    return { error: 'Nothing to pass right now.' };
  }

  const moves = legalMoves(currentPlayer, state.lastRoll);
  if (moves.length > 0) {
    return { error: 'You have a legal move and must make it.' };
  }

  const events = [{ type: 'message', text: 'No moves - Pass' }];
  const newState = advanceTurn({ ...state }, state.lastRoll, state.consecutiveSixes);
  return { state: newState, events: appendExtraTurnEvent(events, newState, state, state.lastRoll) };
}

// If a token landed on an opponent's token on a non-safe ring square, send
// that opponent's token back to its yard and emit a 'capture' event.
function maybeCapture(players, movingPlayer, movingColor, landedRingIndex, events) {
  const absIdx = absRingIndex(movingColor, landedRingIndex);
  if (SAFE_RING_INDICES.has(absIdx)) return;

  for (const opponent of players) {
    if (opponent.id === movingPlayer.id) continue;
    opponent.tokens.forEach((oToken, oTokenIndex) => {
      if (oToken.status !== 'path') return;
      if (oToken.pathIndex >= RING_LENGTH) return; // in home column, can't be captured
      const oAbsIdx = absRingIndex(opponent.color, oToken.pathIndex);
      if (oAbsIdx === absIdx) {
        oToken.status = 'yard';
        oToken.pathIndex = null;
        events.push({
          type: 'capture',
          playerId: movingPlayer.id,
          capturedPlayerId: opponent.id,
          capturedTokenIndex: oTokenIndex,
        });
      }
    });
  }
}

// Decide whether the current player keeps rolling (extra turn on 6) or the
// turn advances to the next player. Resets consecutiveSixes appropriately.
function advanceTurn(state, roll, consecutiveSixesAfterRoll) {
  const grantsExtraTurn = roll === 6 && consecutiveSixesAfterRoll < MAX_CONSECUTIVE_SIXES;

  if (grantsExtraTurn) {
    return {
      ...state,
      turnPhase: 'roll',
      consecutiveSixes: consecutiveSixesAfterRoll,
    };
  }

  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex(state),
    turnPhase: 'roll',
    consecutiveSixes: 0,
    lastRoll: null,
  };
}

// Emits an 'extra_turn' event if the same player retains the turn.
function appendExtraTurnEvent(events, newState, prevState, roll) {
  if (
    newState.currentPlayerIndex === prevState.currentPlayerIndex
    && newState.turnPhase === 'roll'
    && roll === 6
  ) {
    events.push({ type: 'extra_turn', playerId: prevState.players[prevState.currentPlayerIndex].id });
  }
  return events;
}
