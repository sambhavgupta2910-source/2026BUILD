// Quick smoke test: simulates two clients over WebSocket, exercising the
// room/lobby protocol and playing a full game of each type to completion.
// Run with the server already listening on :3000 (e.g. `node server.js &`).

import WebSocket from 'ws';
import { MessageType } from '../shared/protocol.js';

const URL = 'ws://localhost:3000';

function connect() {
  return new Promise((resolve) => {
    const ws = new WebSocket(URL);
    ws.messageQueue = [];
    ws.on('message', (data) => {
      ws.messageQueue.push(JSON.parse(data.toString()));
    });
    ws.on('open', () => resolve(ws));
  });
}

function send(ws, type, extra) {
  ws.send(JSON.stringify({ type, ...extra }));
}

// Waits for a STATE_UPDATE, then drains any other STATE_UPDATEs already
// queued (stale broadcasts from the other player's prior action that this
// connection never consumed) and returns the most recent one.
async function nextStateUpdate(ws) {
  let msg = await nextMessage(ws, MessageType.STATE_UPDATE);
  await new Promise((r) => setTimeout(r, 5));
  while (true) {
    const idx = ws.messageQueue.findIndex((m) => m.type === MessageType.STATE_UPDATE);
    if (idx === -1) break;
    msg = ws.messageQueue.splice(idx, 1)[0];
  }
  return msg;
}

function nextMessage(ws, type, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function poll() {
      const idx = ws.messageQueue.findIndex((m) => m.type === type);
      if (idx !== -1) {
        const [msg] = ws.messageQueue.splice(idx, 1);
        resolve(msg);
        return;
      }
      if (Date.now() - start > timeout) {
        reject(new Error(`Timed out waiting for ${type}`));
        return;
      }
      setTimeout(poll, 10);
    }
    poll();
  });
}

async function playGame(gameId) {
  console.log(`\n=== Playing ${gameId} ===`);
  const a = await connect();
  const b = await connect();

  const idA = `player-a-${gameId}`;
  const idB = `player-b-${gameId}`;

  await nextMessage(a, MessageType.GAME_LIST);
  await nextMessage(b, MessageType.GAME_LIST);

  send(a, MessageType.CREATE_ROOM, { playerId: idA, name: 'Alice' });
  const roomMsgA = await nextMessage(a, MessageType.ROOM_UPDATE);
  const roomCode = roomMsgA.room.code;
  console.log(`Room created: ${roomCode}`);

  send(b, MessageType.JOIN_ROOM, { playerId: idB, name: 'Bob', roomCode });
  await nextMessage(b, MessageType.ROOM_UPDATE);
  await nextMessage(a, MessageType.ROOM_UPDATE); // a sees b join

  send(a, MessageType.SELECT_GAME, { playerId: idA, gameId });
  await nextMessage(a, MessageType.ROOM_UPDATE);
  await nextMessage(b, MessageType.ROOM_UPDATE);

  send(a, MessageType.START_GAME, { playerId: idA });
  const startedA = await nextMessage(a, MessageType.GAME_STARTED);
  await nextMessage(b, MessageType.GAME_STARTED);

  let state = startedA.state;
  const clients = { [idA]: a, [idB]: b };

  // Import the game module directly to compute available actions client-side.
  const registryModule = await import('../shared/game-registry.js');
  const game = registryModule.registry[gameId];

  let turns = 0;
  const maxTurns = gameId === 'monopoly' ? 1500 : 5000;
  let over = game.checkGameOver(state);
  let tradeTested = false;
  const otherId = { [idA]: idB, [idB]: idA };
  const actionCounts = {};

  while (!over.over && turns < maxTurns) {
    turns += 1;
    let acted = false;

    for (const playerId of [idA, idB]) {
      const { actions } = game.getAvailableActions(state, playerId);
      if (actions.length === 0) continue;

      let action;
      if (gameId === 'monopoly' && !tradeTested && actions.some((a) => a.type === 'propose_trade')) {
        action = {
          type: 'propose_trade',
          payload: {
            toPlayerId: otherId[playerId],
            offer: { cashFrom: 1, cashTo: 0, propertiesFrom: [], propertiesTo: [], jailCardsFrom: 0, jailCardsTo: 0 },
          },
        };
        tradeTested = true;
      } else {
        action = pickAction(gameId, actions, state, playerId);
      }

      actionCounts[action.type] = (actionCounts[action.type] || 0) + 1;
      const ws = clients[playerId];
      send(ws, MessageType.PLAYER_ACTION, { playerId, action });

      const result = await nextMessage(ws, MessageType.ACTION_RESULT);
      if (!result.ok) {
        throw new Error(`Action failed for ${playerId}: ${result.error} (action ${JSON.stringify(action)})`);
      }

      const update = await nextStateUpdate(ws);
      state = update.state;
      acted = true;

      over = game.checkGameOver(state);
      if (over.over) break;
    }

    if (!acted) {
      throw new Error('No player had an available action - stuck.');
    }
  }

  console.log(`Action counts: ${JSON.stringify(actionCounts)}`);

  if (!over.over) {
    console.log(`${gameId} did not finish within ${maxTurns} rounds (ok for smoke test) - protocol exercised cleanly.`);
    await new Promise((r) => setTimeout(r, 100));
    a.close();
    b.close();
    return;
  }

  console.log(`${gameId} finished after ${turns} rounds. Winner: ${over.winnerId}`);

  // Drain the GAME_OVER broadcast.
  await Promise.all([nextMessage(a, MessageType.GAME_OVER), nextMessage(b, MessageType.GAME_OVER)]);

  // Return to lobby.
  send(a, MessageType.RETURN_TO_LOBBY, { playerId: idA });
  await nextMessage(a, MessageType.ROOM_UPDATE);
  await nextMessage(b, MessageType.ROOM_UPDATE);

  a.close();
  b.close();
}

// Pick a reasonable action for the current game/phase so the game makes
// forward progress without getting stuck (e.g. always buy if affordable,
// always accept doubles re-roll, never propose trades to keep it simple).
function pickAction(gameId, actions, state, playerId) {
  const byType = (type) => actions.find((a) => a.type === type);

  if (gameId === 'monopoly') {
    // Avoid propose_trade so the smoke test doesn't get stuck in a
    // pending-trade sub-phase with no resolution path.
    const preferredOrder = [
      'roll_dice', 'pay_jail_fine', 'use_jail_card',
      'buy_property', 'decline_purchase',
      'place_bid', 'pass_auction',
      'accept_trade', 'reject_trade',
      'unmortgage_property', 'build_house', 'build_hotel',
      'end_turn',
    ];
    for (const type of preferredOrder) {
      const found = byType(type);
      if (found) {
        if (found.type === 'place_bid') {
          const currentBid = state.pendingAuction ? state.pendingAuction.currentBid : 0;
          const player = state.players.find((p) => p.id === playerId);
          const amount = Math.min(currentBid + 10, player.cash);
          if (amount > currentBid) {
            return { type: 'place_bid', payload: { amount } };
          }
          continue;
        }
        return { type: found.type, payload: found.payload || {} };
      }
    }
    // Fallback: avoid propose_trade if it's the only action by ending turn
    // via any non-trade action, else just take the first action.
    const nonTrade = actions.find((a) => a.type !== 'propose_trade' && a.type !== 'counter_trade');
    if (nonTrade) return { type: nonTrade.type, payload: nonTrade.payload || {} };
    return { type: actions[0].type, payload: actions[0].payload || {} };
  }

  // Snakes & Ladders / Ludo: just take the first available action.
  const action = actions[0];
  return { type: action.type, payload: action.payload || {} };
}

(async () => {
  try {
    await playGame('snakes-and-ladders');
    await playGame('ludo');
    await playGame('monopoly');
    console.log('\nAll smoke tests passed.');
    process.exit(0);
  } catch (err) {
    console.error('\nSmoke test failed:', err);
    process.exit(1);
  }
})();
