import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

import { registry, gameList } from './shared/game-registry.js';
import { MessageType, PLAYER_COLORS, randomRoomCode } from './shared/protocol.js';
import { createRng } from './shared/rng.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const SHARED_DIR = path.join(__dirname, 'shared');
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/') pathname = '/index.html';

  let rootDir;
  let relPath;
  if (pathname.startsWith('/shared/')) {
    rootDir = SHARED_DIR;
    relPath = pathname.slice('/shared/'.length);
  } else {
    rootDir = PUBLIC_DIR;
    relPath = pathname.slice(1);
  }

  const filePath = path.normalize(path.join(rootDir, relPath));
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(serveStatic);
const wss = new WebSocketServer({ server });

// roomCode -> room
const rooms = new Map();

function generateUniqueRoomCode() {
  let code;
  do {
    code = randomRoomCode();
  } while (rooms.has(code));
  return code;
}

function roomSummary(room) {
  return {
    code: room.code,
    gameId: room.gameId,
    status: room.status,
    hostPlayerId: room.hostPlayerId,
    players: room.players.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      color: p.color,
      connected: p.connected,
    })),
  };
}

function send(ws, message) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(room, message) {
  for (const player of room.players) {
    send(player.ws, message);
  }
}

function sendError(ws, message) {
  send(ws, { type: MessageType.ERROR, message });
}

function findPlayer(room, playerId) {
  return room.players.find((p) => p.playerId === playerId);
}

function handleCreateRoom(ws, msg) {
  const { playerId, name } = msg;
  if (!playerId) return sendError(ws, 'Missing playerId');

  const code = generateUniqueRoomCode();
  const player = { playerId, name: name || 'Player', color: PLAYER_COLORS[0], connected: true, ws };
  const room = {
    code,
    hostPlayerId: playerId,
    gameId: null,
    status: 'lobby',
    players: [player],
    rng: createRng(),
    gameState: null,
  };
  rooms.set(code, room);

  ws.playerId = playerId;
  ws.roomCode = code;

  send(ws, { type: MessageType.GAME_LIST, games: gameList });
  send(ws, { type: MessageType.ROOM_UPDATE, room: roomSummary(room) });
}

function handleJoinRoom(ws, msg) {
  const { playerId, name, roomCode } = msg;
  if (!playerId || !roomCode) return sendError(ws, 'Missing playerId or roomCode');

  const room = rooms.get(String(roomCode).toUpperCase());
  if (!room) return sendError(ws, 'Room not found');
  if (room.status !== 'lobby') return sendError(ws, 'That game has already started');

  let player = findPlayer(room, playerId);
  if (player) {
    player.ws = ws;
    player.connected = true;
    player.name = name || player.name;
  } else {
    if (room.players.length >= PLAYER_COLORS.length) return sendError(ws, 'Room is full');
    player = {
      playerId,
      name: name || 'Player',
      color: PLAYER_COLORS[room.players.length],
      connected: true,
      ws,
    };
    room.players.push(player);
  }

  ws.playerId = playerId;
  ws.roomCode = room.code;

  send(ws, { type: MessageType.GAME_LIST, games: gameList });
  broadcast(room, { type: MessageType.ROOM_UPDATE, room: roomSummary(room) });
}

function handleRejoinRoom(ws, msg) {
  const { playerId, roomCode } = msg;
  if (!playerId || !roomCode) return sendError(ws, 'Missing playerId or roomCode');

  const room = rooms.get(String(roomCode).toUpperCase());
  if (!room) return sendError(ws, 'Room no longer exists');

  const player = findPlayer(room, playerId);
  if (!player) return sendError(ws, 'You are not part of that room');

  player.ws = ws;
  player.connected = true;

  ws.playerId = playerId;
  ws.roomCode = room.code;

  send(ws, { type: MessageType.GAME_LIST, games: gameList });
  broadcast(room, { type: MessageType.ROOM_UPDATE, room: roomSummary(room) });

  if (room.status === 'playing' || room.status === 'ended') {
    send(ws, { type: MessageType.GAME_STARTED, gameId: room.gameId, state: room.gameState });
  }
}

function handleLeaveRoom(ws) {
  const room = rooms.get(ws.roomCode);
  if (!room) return;

  room.players = room.players.filter((p) => p.playerId !== ws.playerId);

  if (room.players.length === 0) {
    rooms.delete(room.code);
  } else {
    if (room.hostPlayerId === ws.playerId) {
      room.hostPlayerId = room.players[0].playerId;
    }
    broadcast(room, { type: MessageType.ROOM_UPDATE, room: roomSummary(room) });
  }

  ws.playerId = null;
  ws.roomCode = null;
}

function handleSelectGame(ws, msg) {
  const room = rooms.get(ws.roomCode);
  if (!room) return sendError(ws, 'Room not found');
  if (room.status !== 'lobby') return sendError(ws, 'Game already started');
  if (msg.playerId !== room.hostPlayerId) return sendError(ws, 'Only the host can choose the game');
  if (!registry[msg.gameId]) return sendError(ws, 'Unknown game');

  room.gameId = msg.gameId;
  broadcast(room, { type: MessageType.ROOM_UPDATE, room: roomSummary(room) });
}

function handleStartGame(ws, msg) {
  const room = rooms.get(ws.roomCode);
  if (!room) return sendError(ws, 'Room not found');
  if (room.status !== 'lobby') return sendError(ws, 'Game already started');
  if (msg.playerId !== room.hostPlayerId) return sendError(ws, 'Only the host can start the game');
  if (!room.gameId) return sendError(ws, 'Choose a game first');

  const game = registry[room.gameId];
  if (room.players.length < game.meta.minPlayers) {
    return sendError(ws, `${game.meta.name} needs at least ${game.meta.minPlayers} players`);
  }
  if (room.players.length > game.meta.maxPlayers) {
    return sendError(ws, `${game.meta.name} supports at most ${game.meta.maxPlayers} players`);
  }

  const playerIds = room.players.map((p) => p.playerId);
  room.gameState = game.createInitialState(playerIds, room.rng);
  room.status = 'playing';

  broadcast(room, { type: MessageType.GAME_STARTED, gameId: room.gameId, state: room.gameState });
}

function handlePlayerAction(ws, msg) {
  const room = rooms.get(ws.roomCode);
  if (!room) return sendError(ws, 'Room not found');
  if (room.status !== 'playing') return sendError(ws, 'Game is not in progress');

  const game = registry[room.gameId];
  const { playerId, action } = msg;
  if (!playerId || !action || !action.type) return sendError(ws, 'Invalid action');

  const available = game.getAvailableActions(room.gameState, playerId);
  const allowed = available.actions.some((a) => a.type === action.type);
  if (!allowed) {
    send(ws, { type: MessageType.ACTION_RESULT, ok: false, error: 'That action is not available right now' });
    return;
  }

  const result = game.applyAction(room.gameState, playerId, action, room.rng);
  if (result.error) {
    send(ws, { type: MessageType.ACTION_RESULT, ok: false, error: result.error });
    return;
  }

  room.gameState = result.state;
  send(ws, { type: MessageType.ACTION_RESULT, ok: true });
  broadcast(room, { type: MessageType.STATE_UPDATE, state: room.gameState, events: result.events || [] });

  const over = game.checkGameOver(room.gameState);
  if (over && over.over) {
    room.status = 'ended';
    broadcast(room, { type: MessageType.GAME_OVER, winnerId: over.winnerId, rankings: over.rankings });
  }
}

function handleReturnToLobby(ws, msg) {
  const room = rooms.get(ws.roomCode);
  if (!room) return sendError(ws, 'Room not found');
  if (room.status !== 'ended') return sendError(ws, 'Game is still in progress');

  room.status = 'lobby';
  room.gameState = null;
  broadcast(room, { type: MessageType.ROOM_UPDATE, room: roomSummary(room) });
}

const HANDLERS = {
  [MessageType.CREATE_ROOM]: handleCreateRoom,
  [MessageType.JOIN_ROOM]: handleJoinRoom,
  [MessageType.REJOIN_ROOM]: handleRejoinRoom,
  [MessageType.LEAVE_ROOM]: handleLeaveRoom,
  [MessageType.SELECT_GAME]: handleSelectGame,
  [MessageType.START_GAME]: handleStartGame,
  [MessageType.PLAYER_ACTION]: handlePlayerAction,
  [MessageType.RETURN_TO_LOBBY]: handleReturnToLobby,
};

wss.on('connection', (ws) => {
  ws.playerId = null;
  ws.roomCode = null;

  send(ws, { type: MessageType.GAME_LIST, games: gameList });

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return sendError(ws, 'Invalid message');
    }

    const handler = HANDLERS[msg.type];
    if (!handler) return sendError(ws, `Unknown message type: ${msg.type}`);

    try {
      handler(ws, msg);
    } catch (err) {
      console.error('Error handling message', msg.type, err);
      sendError(ws, 'Server error processing that action');
    }
  });

  ws.on('close', () => {
    const room = rooms.get(ws.roomCode);
    if (!room) return;
    const player = findPlayer(room, ws.playerId);
    if (player) {
      player.connected = false;
      broadcast(room, { type: MessageType.ROOM_UPDATE, room: roomSummary(room) });
    }
  });
});

function listLanAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

server.listen(PORT, () => {
  console.log(`Board Game Arena running at http://localhost:${PORT}`);
  const lan = listLanAddresses();
  if (lan.length > 0) {
    console.log('On your phones (same WiFi), open one of:');
    for (const addr of lan) {
      console.log(`  http://${addr}:${PORT}`);
    }
  } else {
    console.log('Could not detect a LAN address - make sure this device is on WiFi.');
  }
});
