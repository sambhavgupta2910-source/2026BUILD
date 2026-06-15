import { MessageType } from '/shared/protocol.js';
import { registry } from '/shared/game-registry.js';
import { BOARD } from '/shared/games/monopoly/board-data.js';
import { BoardRenderer, COLOR_MAP } from '/board-renderer.js';

const STORAGE_KEY = 'boardgame-arena-identity';

function loadIdentity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupt storage
  }
  return {};
}

function saveIdentity() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const identity = loadIdentity();
if (!identity.playerId) identity.playerId = generateId();
if (!identity.name) identity.name = '';
saveIdentity();

const appState = {
  ws: null,
  games: [],
  room: null,
  gameId: null,
  gameState: null,
  screen: 'connect',
  tradeContext: null,
};

const els = {
  connectionStatus: document.getElementById('connectionStatus'),
  nameInput: document.getElementById('nameInput'),
  createRoomBtn: document.getElementById('createRoomBtn'),
  roomCodeInput: document.getElementById('roomCodeInput'),
  joinRoomBtn: document.getElementById('joinRoomBtn'),
  connectError: document.getElementById('connectError'),

  roomCodeDisplay: document.getElementById('roomCodeDisplay'),
  playerList: document.getElementById('playerList'),
  hostGameControls: document.getElementById('hostGameControls'),
  gameSelect: document.getElementById('gameSelect'),
  startGameBtn: document.getElementById('startGameBtn'),
  lobbyHint: document.getElementById('lobbyHint'),
  leaveLobbyBtn: document.getElementById('leaveLobbyBtn'),

  turnBanner: document.getElementById('turnBanner'),
  boardCanvas: document.getElementById('boardCanvas'),
  playerSummaries: document.getElementById('playerSummaries'),
  actionPanel: document.getElementById('actionPanel'),
  eventLog: document.getElementById('eventLog'),
  leaveGameBtn: document.getElementById('leaveGameBtn'),

  gameOverModal: document.getElementById('gameOverModal'),
  gameOverText: document.getElementById('gameOverText'),
  backToLobbyBtn: document.getElementById('backToLobbyBtn'),

  tradeModal: document.getElementById('tradeModal'),
  tradeModalTitle: document.getElementById('tradeModalTitle'),
  tradeModalBody: document.getElementById('tradeModalBody'),
  tradeSubmitBtn: document.getElementById('tradeSubmitBtn'),
  tradeCancelBtn: document.getElementById('tradeCancelBtn'),

  toast: document.getElementById('toast'),
};

const renderer = new BoardRenderer(els.boardCanvas);

// ---------------------------------------------------------------------------
// Screens & toast
// ---------------------------------------------------------------------------

function showScreen(name) {
  appState.screen = name;
  for (const section of document.querySelectorAll('.screen')) {
    section.classList.toggle('active', section.id === `screen-${name}`);
  }
}

let toastTimer = null;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 3000);
}

// ---------------------------------------------------------------------------
// WebSocket connection
// ---------------------------------------------------------------------------

function setConnectionStatus(text, cls) {
  els.connectionStatus.textContent = text;
  els.connectionStatus.className = `status ${cls}`;
}

let reconnectDelay = 1000;

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${location.host}`);
  appState.ws = ws;
  setConnectionStatus('Connecting…', 'status-connecting');

  ws.addEventListener('open', () => {
    reconnectDelay = 1000;
    setConnectionStatus('Connected', 'status-connected');
    updateConnectButtons();
    if (identity.roomCode) {
      send(MessageType.REJOIN_ROOM, { roomCode: identity.roomCode });
    }
  });

  ws.addEventListener('close', () => {
    setConnectionStatus('Disconnected - reconnecting…', 'status-disconnected');
    updateConnectButtons();
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 10000);
  });

  ws.addEventListener('error', () => {
    ws.close();
  });

  ws.addEventListener('message', (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    handleMessage(msg);
  });
}

function send(type, extra = {}) {
  if (!appState.ws || appState.ws.readyState !== WebSocket.OPEN) return;
  appState.ws.send(JSON.stringify({ type, playerId: identity.playerId, ...extra }));
}

function updateConnectButtons() {
  const connected = appState.ws && appState.ws.readyState === WebSocket.OPEN;
  els.createRoomBtn.disabled = !connected;
  els.joinRoomBtn.disabled = !connected;
}

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------

function handleMessage(msg) {
  switch (msg.type) {
    case MessageType.GAME_LIST:
      appState.games = msg.games || [];
      populateGameSelect();
      if (appState.room) renderLobby();
      break;

    case MessageType.ROOM_UPDATE:
      handleRoomUpdate(msg.room);
      break;

    case MessageType.GAME_STARTED:
      appState.gameId = msg.gameId;
      appState.gameState = msg.state;
      els.eventLog.innerHTML = '';
      if (appState.room) appState.room.status = 'playing';
      els.gameOverModal.classList.add('hidden');
      showScreen('game');
      renderGame();
      break;

    case MessageType.STATE_UPDATE:
      appState.gameState = msg.state;
      for (const evt of msg.events || []) {
        appendEvent(evt);
      }
      renderGame();
      break;

    case MessageType.ACTION_RESULT:
      if (!msg.ok) showToast(msg.error || 'Action failed');
      break;

    case MessageType.GAME_OVER:
      if (appState.room) appState.room.status = 'ended';
      showGameOver(msg.winnerId);
      break;

    case MessageType.ERROR:
      if (appState.screen === 'connect') {
        els.connectError.textContent = msg.message || 'Something went wrong';
      } else {
        showToast(msg.message || 'Something went wrong');
      }
      break;

    default:
      break;
  }
}

function handleRoomUpdate(room) {
  appState.room = room;
  identity.roomCode = room.code;
  saveIdentity();

  if (room.status === 'lobby') {
    appState.gameId = null;
    appState.gameState = null;
    els.gameOverModal.classList.add('hidden');
    els.tradeModal.classList.add('hidden');
    showScreen('lobby');
    renderLobby();
  } else if (appState.screen === 'lobby' || appState.screen === 'connect') {
    // Mid-game room update (e.g. reconnect) - GAME_STARTED follows shortly.
    renderLobby();
  } else {
    renderLobby();
    if (appState.screen === 'game') renderGame();
  }
}

// ---------------------------------------------------------------------------
// Connect screen
// ---------------------------------------------------------------------------

els.nameInput.value = identity.name || '';
els.nameInput.addEventListener('input', () => {
  identity.name = els.nameInput.value;
  saveIdentity();
});

els.createRoomBtn.addEventListener('click', () => {
  els.connectError.textContent = '';
  const name = els.nameInput.value.trim() || 'Player';
  identity.name = name;
  saveIdentity();
  send(MessageType.CREATE_ROOM, { name });
});

els.joinRoomBtn.addEventListener('click', () => {
  els.connectError.textContent = '';
  const name = els.nameInput.value.trim() || 'Player';
  const roomCode = els.roomCodeInput.value.trim().toUpperCase();
  if (roomCode.length !== 4) {
    els.connectError.textContent = 'Enter the 4-character room code.';
    return;
  }
  identity.name = name;
  saveIdentity();
  send(MessageType.JOIN_ROOM, { name, roomCode });
});

els.roomCodeInput.addEventListener('input', () => {
  els.roomCodeInput.value = els.roomCodeInput.value.toUpperCase();
});

// ---------------------------------------------------------------------------
// Lobby screen
// ---------------------------------------------------------------------------

function populateGameSelect() {
  els.gameSelect.innerHTML = '';
  for (const game of appState.games) {
    const option = document.createElement('option');
    option.value = game.id;
    option.textContent = `${game.meta.name} (${game.meta.minPlayers}-${game.meta.maxPlayers} players)`;
    els.gameSelect.appendChild(option);
  }
  if (appState.room && appState.room.gameId) {
    els.gameSelect.value = appState.room.gameId;
  }
}

function renderLobby() {
  const room = appState.room;
  if (!room) return;

  els.roomCodeDisplay.textContent = room.code;

  els.playerList.innerHTML = '';
  for (const player of room.players) {
    const li = document.createElement('li');
    if (!player.connected) li.classList.add('player-offline');

    const dot = document.createElement('span');
    dot.className = `color-dot color-${player.color}`;
    li.appendChild(dot);

    const name = document.createElement('span');
    name.className = 'player-name';
    name.textContent = player.name;
    li.appendChild(name);

    if (player.playerId === identity.playerId) {
      li.appendChild(makeTag('You'));
    }
    if (player.playerId === room.hostPlayerId) {
      li.appendChild(makeTag('Host'));
    }
    if (!player.connected) {
      li.appendChild(makeTag('Offline'));
    }

    els.playerList.appendChild(li);
  }

  const isHost = room.hostPlayerId === identity.playerId;
  els.hostGameControls.classList.toggle('hidden', !isHost);

  if (isHost) {
    populateGameSelect();
    const game = appState.games.find((g) => g.id === room.gameId);
    const count = room.players.length;
    let disabled = !game;
    let hint = '';
    if (game) {
      if (count < game.meta.minPlayers) {
        disabled = true;
        hint = `${game.meta.name} needs at least ${game.meta.minPlayers} players.`;
      } else if (count > game.meta.maxPlayers) {
        disabled = true;
        hint = `${game.meta.name} supports at most ${game.meta.maxPlayers} players.`;
      }
    }
    els.startGameBtn.disabled = disabled;
    els.lobbyHint.textContent = hint;
  } else {
    const game = appState.games.find((g) => g.id === room.gameId);
    els.lobbyHint.textContent = game
      ? `Waiting for the host to start ${game.meta.name}…`
      : 'Waiting for the host to choose a game…';
  }
}

function makeTag(text) {
  const span = document.createElement('span');
  span.className = 'player-tag';
  span.textContent = text;
  return span;
}

els.gameSelect.addEventListener('change', () => {
  send(MessageType.SELECT_GAME, { gameId: els.gameSelect.value });
});

els.startGameBtn.addEventListener('click', () => {
  send(MessageType.START_GAME);
});

els.leaveLobbyBtn.addEventListener('click', () => {
  leaveRoom();
});

els.leaveGameBtn.addEventListener('click', () => {
  leaveRoom();
});

function leaveRoom() {
  send(MessageType.LEAVE_ROOM);
  appState.room = null;
  appState.gameId = null;
  appState.gameState = null;
  identity.roomCode = null;
  saveIdentity();
  els.gameOverModal.classList.add('hidden');
  els.tradeModal.classList.add('hidden');
  showScreen('connect');
}

// ---------------------------------------------------------------------------
// Game screen
// ---------------------------------------------------------------------------

function getRoomPlayer(playerId) {
  return (appState.room?.players || []).find((p) => p.playerId === playerId);
}

function playerName(playerId) {
  const player = getRoomPlayer(playerId);
  return player ? player.name : playerId;
}

function renderGame() {
  const game = registry[appState.gameId];
  const state = appState.gameState;
  if (!game || !state) return;

  renderer.render(game, state);
  renderTurnBanner(game, state);
  renderPlayerSummaries(game, state);
  renderActionPanel(game, state);
}

function renderTurnBanner(game, state) {
  const { phase, actions, message } = game.getAvailableActions(state, identity.playerId);
  els.turnBanner.classList.toggle('your-turn', actions.length > 0);

  if (phase === 'game_over') {
    els.turnBanner.textContent = 'Game over';
    return;
  }

  if (actions.length > 0) {
    els.turnBanner.textContent = message ? `Your turn - ${message}` : 'Your turn';
    return;
  }

  const current = state.players[state.currentPlayerIndex];
  const currentName = current ? playerName(current.id) : '…';
  els.turnBanner.textContent = message ? message : `${currentName}'s turn`;
}

function renderPlayerSummaries(game, state) {
  els.playerSummaries.innerHTML = '';
  for (const player of state.players) {
    const roomPlayer = getRoomPlayer(player.id);
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.style.borderLeftColor = COLOR_MAP[player.color] || 'transparent';

    const nameRow = document.createElement('div');
    nameRow.className = 'summary-name';

    const dot = document.createElement('span');
    dot.className = `color-dot color-${player.color}`;
    nameRow.appendChild(dot);

    const nameText = document.createElement('span');
    let label = roomPlayer ? roomPlayer.name : player.id;
    if (player.id === identity.playerId) label += ' (You)';
    if (roomPlayer && !roomPlayer.connected) label += ' [offline]';
    if (state.players[state.currentPlayerIndex]?.id === player.id) label += ' ⬤';
    nameText.textContent = label;
    nameRow.appendChild(nameText);

    card.appendChild(nameRow);

    for (const row of game.getPlayerSummary(state, player.id)) {
      const rowEl = document.createElement('div');
      rowEl.className = 'summary-row';
      const labelEl = document.createElement('span');
      labelEl.textContent = row.label;
      const valueEl = document.createElement('span');
      valueEl.textContent = row.value;
      rowEl.appendChild(labelEl);
      rowEl.appendChild(valueEl);
      card.appendChild(rowEl);
    }

    els.playerSummaries.appendChild(card);
  }
}

function renderActionPanel(game, state) {
  els.actionPanel.innerHTML = '';
  const { actions } = game.getAvailableActions(state, identity.playerId);

  for (const action of actions) {
    if (action.type === 'place_bid') {
      els.actionPanel.appendChild(buildBidControl(action, state));
      continue;
    }

    if (action.type === 'propose_trade' || action.type === 'counter_trade') {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.addEventListener('click', () => openTradeModal(action, state));
      els.actionPanel.appendChild(btn);
      continue;
    }

    const btn = document.createElement('button');
    btn.textContent = action.label;
    if (action.type === 'decline_purchase' || action.type === 'reject_trade' || action.type === 'pass_auction' || action.type === 'sell_house' || action.type === 'mortgage_property') {
      btn.classList.add('secondary');
    }
    btn.addEventListener('click', () => {
      send(MessageType.PLAYER_ACTION, { action: { type: action.type, payload: action.payload || {} } });
    });
    els.actionPanel.appendChild(btn);
  }
}

function buildBidControl(action, state) {
  const wrap = document.createElement('div');
  wrap.className = 'action-with-input';

  const currentBid = state.pendingAuction ? state.pendingAuction.currentBid : 0;
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(currentBid + 1);
  input.placeholder = `> $${currentBid}`;
  input.value = String(currentBid + 10);

  const btn = document.createElement('button');
  btn.textContent = action.label;
  btn.addEventListener('click', () => {
    const amount = Number(input.value);
    if (!Number.isFinite(amount) || amount <= currentBid) {
      showToast(`Bid must be higher than $${currentBid}`);
      return;
    }
    send(MessageType.PLAYER_ACTION, { action: { type: 'place_bid', payload: { amount } } });
  });

  wrap.appendChild(input);
  wrap.appendChild(btn);
  return wrap;
}

// ---------------------------------------------------------------------------
// Trade modal (Monopoly)
// ---------------------------------------------------------------------------

function propertyName(pos) {
  return BOARD[pos] ? BOARD[pos].name : `#${pos}`;
}

function openTradeModal(action, state) {
  const myId = identity.playerId;
  let counterpartId;
  let mode;

  if (action.type === 'propose_trade') {
    mode = 'propose';
    counterpartId = action.payload.toPlayerId;
  } else {
    mode = 'counter';
    counterpartId = state.pendingTrade.fromId;
  }

  const me = state.players.find((p) => p.id === myId);
  const them = state.players.find((p) => p.id === counterpartId);
  if (!me || !them) return;

  appState.tradeContext = { mode, counterpartId };

  els.tradeModalTitle.textContent = mode === 'propose'
    ? `Propose Trade with ${playerName(counterpartId)}`
    : `Counter Offer to ${playerName(counterpartId)}`;

  els.tradeModalBody.innerHTML = '';
  els.tradeModalBody.appendChild(buildTradeSide('Your offer', 'from', me));
  els.tradeModalBody.appendChild(buildTradeSide(`Request from ${playerName(counterpartId)}`, 'to', them));

  els.tradeModal.classList.remove('hidden');
}

function buildTradeSide(title, side, player) {
  const section = document.createElement('div');
  section.className = 'trade-section';

  const heading = document.createElement('h3');
  heading.textContent = title;
  section.appendChild(heading);

  const cashLabel = document.createElement('label');
  cashLabel.textContent = `Cash (max $${player.cash})`;
  section.appendChild(cashLabel);

  const cashInput = document.createElement('input');
  cashInput.type = 'number';
  cashInput.min = '0';
  cashInput.max = String(player.cash);
  cashInput.value = '0';
  cashInput.id = `tradeCash-${side}`;
  section.appendChild(cashInput);

  if (player.jailCards > 0) {
    const jailLabel = document.createElement('label');
    jailLabel.textContent = `Get Out of Jail Free cards (has ${player.jailCards})`;
    section.appendChild(jailLabel);

    const jailInput = document.createElement('input');
    jailInput.type = 'number';
    jailInput.min = '0';
    jailInput.max = String(player.jailCards);
    jailInput.value = '0';
    jailInput.id = `tradeJail-${side}`;
    section.appendChild(jailInput);
  }

  const propsLabel = document.createElement('label');
  propsLabel.textContent = 'Properties';
  section.appendChild(propsLabel);

  const propsList = document.createElement('div');
  propsList.className = 'trade-property-list';
  propsList.id = `tradeProps-${side}`;
  if (player.properties.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'hint';
    empty.textContent = 'No properties.';
    propsList.appendChild(empty);
  }
  for (const pos of player.properties) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = String(pos);
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(propertyName(pos)));
    propsList.appendChild(label);
  }
  section.appendChild(propsList);

  return section;
}

function readTradeSide(side) {
  const cashEl = document.getElementById(`tradeCash-${side}`);
  const jailEl = document.getElementById(`tradeJail-${side}`);
  const propsList = document.getElementById(`tradeProps-${side}`);
  const properties = Array.from(propsList.querySelectorAll('input[type="checkbox"]:checked'))
    .map((cb) => Number(cb.value));

  return {
    cash: cashEl ? Number(cashEl.value) || 0 : 0,
    jailCards: jailEl ? Number(jailEl.value) || 0 : 0,
    properties,
  };
}

els.tradeSubmitBtn.addEventListener('click', () => {
  const ctx = appState.tradeContext;
  if (!ctx) return;

  const from = readTradeSide('from');
  const to = readTradeSide('to');

  const offer = {
    cashFrom: from.cash,
    cashTo: to.cash,
    propertiesFrom: from.properties,
    propertiesTo: to.properties,
    jailCardsFrom: from.jailCards,
    jailCardsTo: to.jailCards,
  };

  if (ctx.mode === 'propose') {
    send(MessageType.PLAYER_ACTION, {
      action: { type: 'propose_trade', payload: { toPlayerId: ctx.counterpartId, offer } },
    });
  } else {
    send(MessageType.PLAYER_ACTION, {
      action: { type: 'counter_trade', payload: { offer } },
    });
  }

  closeTradeModal();
});

els.tradeCancelBtn.addEventListener('click', () => {
  closeTradeModal();
});

function closeTradeModal() {
  appState.tradeContext = null;
  els.tradeModal.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Event log
// ---------------------------------------------------------------------------

const MAX_LOG_ENTRIES = 60;

function appendEvent(evt) {
  const text = describeEvent(evt);
  if (!text) return;

  const entry = document.createElement('div');
  entry.textContent = text;
  els.eventLog.appendChild(entry);

  while (els.eventLog.children.length > MAX_LOG_ENTRIES) {
    els.eventLog.removeChild(els.eventLog.firstChild);
  }
}

function describeEvent(evt) {
  switch (evt.type) {
    case 'dice_rolled':
      if (Array.isArray(evt.values)) {
        const [d1, d2] = evt.values;
        return `${playerName(evt.playerId)} rolled ${d1} and ${d2} (${d1 + d2}).`;
      }
      return `${playerName(evt.playerId)} rolled a ${evt.value}.`;

    case 'token_moved':
      return `${playerName(evt.playerId)} moved from ${evt.from} to ${evt.to}.`;

    case 'ladder_climb':
      return `${playerName(evt.playerId)} climbed a ladder to ${evt.to}!`;

    case 'snake_bite':
      return `${playerName(evt.playerId)} was bitten by a snake, sliding to ${evt.to}!`;

    case 'extra_turn':
      return `${playerName(evt.playerId)} rolled a 6 and gets another turn!`;

    case 'capture':
      return `${playerName(evt.playerId)} sent ${playerName(evt.capturedPlayerId)}'s token back to the yard!`;

    case 'card_drawn': {
      const deckName = evt.deck === 'chance' ? 'Chance' : 'Community Chest';
      return `${deckName}: ${evt.card.text}`;
    }

    case 'rent_paid':
      return `${playerName(evt.fromId)} paid $${evt.amount} rent to ${playerName(evt.toId)} for ${evt.property}.`;

    case 'jailed':
      return `${playerName(evt.playerId)} was sent to jail.`;

    case 'jail_release': {
      const reasons = { fine: 'paid the fine', card: 'used a Get Out of Jail Free card', doubles: 'rolled doubles', served_time: 'served their time' };
      return `${playerName(evt.playerId)} got out of jail (${reasons[evt.reason] || evt.reason}).`;
    }

    case 'property_bought':
      return `${playerName(evt.playerId)} bought ${evt.property} for $${evt.price}.`;

    case 'auction_started':
      return `Auction started for ${evt.property}.`;

    case 'auction_bid':
      return `${playerName(evt.playerId)} bid $${evt.amount}.`;

    case 'auction_won':
      return `${playerName(evt.playerId)} won ${evt.property} for $${evt.amount}.`;

    case 'bankrupt':
      return `${playerName(evt.playerId)} went bankrupt!`;

    case 'message':
      return evt.text;

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Game over modal
// ---------------------------------------------------------------------------

function showGameOver(winnerId) {
  if (winnerId === identity.playerId) {
    els.gameOverText.textContent = 'You win!';
  } else if (winnerId) {
    els.gameOverText.textContent = `${playerName(winnerId)} wins!`;
  } else {
    els.gameOverText.textContent = 'Game over.';
  }
  els.gameOverModal.classList.remove('hidden');
}

els.backToLobbyBtn.addEventListener('click', () => {
  send(MessageType.RETURN_TO_LOBBY);
  els.gameOverModal.classList.add('hidden');
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

showScreen('connect');
updateConnectButtons();
connect();

window.addEventListener('resize', () => {
  if (appState.screen === 'game' && appState.gameState) {
    renderGame();
  }
});
