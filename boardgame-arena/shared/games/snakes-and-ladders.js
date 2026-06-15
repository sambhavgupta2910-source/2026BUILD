// Snakes & Ladders shared game module. Runs in both the Node server and the
// browser client - no Node/DOM-specific APIs allowed here.

import { PLAYER_COLORS } from '../protocol.js';

const LADDERS = { 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91 };
const SNAKES = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 79 };

const BOARD_SIZE = 100;
const COLS = 10;
const ROWS = 10;

// Convert a square number (1..100) to {col, row} on a 10x10 grid where row 0
// is the TOP row visually and square 1 is the bottom-left, in boustrophedon
// (zigzag) order.
function squareToColRow(num) {
  const rowFromBottom = Math.floor((num - 1) / COLS); // 0..9
  const row = (ROWS - 1) - rowFromBottom;
  const posInRow = (num - 1) % COLS; // 0..9
  // Even rowFromBottom (0, 2, 4, ...) -> left-to-right; odd -> right-to-left
  const col = (rowFromBottom % 2 === 0) ? posInRow : (COLS - 1 - posInRow);
  return { col, row };
}

export default {
  id: 'snakes-and-ladders',
  meta: { name: 'Snakes & Ladders', minPlayers: 2, maxPlayers: 4 },

  createInitialState(playerIds, rng) {
    return {
      players: playerIds.map((id, index) => ({
        id,
        position: 0,
        color: PLAYER_COLORS[index],
      })),
      currentPlayerIndex: 0,
      lastRoll: null,
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
    return { phase: 'roll', actions: [{ type: 'roll_dice', label: 'Roll Dice' }] };
  },

  applyAction(state, playerId, action, rng) {
    if (state.winnerId) {
      return { error: 'The game is already over.' };
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || playerId !== currentPlayer.id) {
      return { error: 'It is not your turn.' };
    }

    if (!action || action.type !== 'roll_dice') {
      return { error: `Unknown action: ${action && action.type}` };
    }

    const events = [];
    const roll = rng.rollDie();
    events.push({ type: 'dice_rolled', playerId, value: roll });

    const players = state.players.map((p) => ({ ...p }));
    const player = players[state.currentPlayerIndex];
    const from = player.position;
    const tentative = from + roll;

    let newPosition = from;
    let winnerId = state.winnerId;

    if (tentative > BOARD_SIZE) {
      // Overshoot: no move.
      events.push({
        type: 'message',
        text: `Rolled a ${roll} but needs an exact ${BOARD_SIZE} - no move.`,
      });
    } else {
      newPosition = tentative;
      events.push({ type: 'token_moved', playerId, from, to: newPosition });

      if (LADDERS[newPosition]) {
        const ladderTop = LADDERS[newPosition];
        events.push({ type: 'ladder_climb', playerId, from: newPosition, to: ladderTop });
        newPosition = ladderTop;
      } else if (SNAKES[newPosition]) {
        const snakeTail = SNAKES[newPosition];
        events.push({ type: 'snake_bite', playerId, from: newPosition, to: snakeTail });
        newPosition = snakeTail;
      }

      player.position = newPosition;

      if (newPosition === BOARD_SIZE) {
        winnerId = playerId;
        events.push({ type: 'message', text: `${playerId} wins!` });
      }
    }

    let nextPlayerIndex = state.currentPlayerIndex;
    if (!winnerId) {
      nextPlayerIndex = (state.currentPlayerIndex + 1) % players.length;
    }

    const newState = {
      players,
      currentPlayerIndex: nextPlayerIndex,
      lastRoll: roll,
      winnerId,
    };

    return { state: newState, events };
  },

  checkGameOver(state) {
    if (state.winnerId) {
      return { over: true, winnerId: state.winnerId };
    }
    return { over: false };
  },

  getBoardLayout(state) {
    const cells = [];
    for (let num = 1; num <= BOARD_SIZE; num++) {
      const { col, row } = squareToColRow(num);
      cells.push({ id: num, col, row, kind: 'square', number: num });
    }

    const tokens = state.players.map((player) => ({
      playerId: player.id,
      color: player.color,
      cellId: player.position > 0 ? player.position : 1,
      tokenIndex: 0,
    }));

    const decorations = [
      ...Object.entries(LADDERS).map(([from, to]) => ({
        type: 'ladder',
        from: Number(from),
        to: Number(to),
      })),
      ...Object.entries(SNAKES).map(([from, to]) => ({
        type: 'snake',
        from: Number(from),
        to: Number(to),
      })),
    ];

    return {
      type: 'grid',
      cols: COLS,
      rows: ROWS,
      cells,
      tokens,
      decorations,
    };
  },

  getPlayerSummary(state, playerId) {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return [];
    return [{ label: 'Position', value: String(player.position) }];
  },

  renderHooks: {
    drawCell(ctx, cell, rect, state) {
      // Draw the square number in the corner, then let the renderer draw the
      // default cell background/border underneath (we return false so the
      // default drawing happens, then ours runs on top - per contract, our
      // code runs AFTER the default when returning false).
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.font = `${Math.max(9, Math.floor(rect.h * 0.18))}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(String(cell.number), rect.x + 3, rect.y + 2);
      ctx.restore();
      return false;
    },

    drawOverlay(ctx, layout, state, boardRect) {
      const cellW = boardRect.w / layout.cols;
      const cellH = boardRect.h / layout.rows;

      const cellMap = new Map();
      for (const cell of layout.cells) {
        cellMap.set(cell.id, cell);
      }

      const centerOf = (squareId) => {
        const cell = cellMap.get(squareId);
        if (!cell) return null;
        return {
          x: boardRect.x + cell.col * cellW + cellW / 2,
          y: boardRect.y + cell.row * cellH + cellH / 2,
        };
      };

      ctx.save();
      for (const dec of layout.decorations) {
        const start = centerOf(dec.from);
        const end = centerOf(dec.to);
        if (!start || !end) continue;

        if (dec.type === 'ladder') {
          ctx.strokeStyle = '#8b5a2b';
          ctx.lineWidth = Math.max(2, cellW * 0.06);
        } else {
          ctx.strokeStyle = '#2e8b57';
          ctx.lineWidth = Math.max(2, cellW * 0.08);
        }

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Arrowhead / marker at the destination end.
        ctx.beginPath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.arc(end.x, end.y, Math.max(3, cellW * 0.08), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  },
};
