// Shared message-type constants and small helpers used by both server.js (Node)
// and public/app.js (browser <script type="module">). No Node-only or DOM-only APIs.

export const MessageType = {
  // Client -> Server
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  REJOIN_ROOM: 'rejoin_room',
  LEAVE_ROOM: 'leave_room',
  SELECT_GAME: 'select_game',
  START_GAME: 'start_game',
  PLAYER_ACTION: 'player_action',
  RETURN_TO_LOBBY: 'return_to_lobby',

  // Server -> Client
  ROOM_UPDATE: 'room_update',
  GAME_LIST: 'game_list',
  GAME_STARTED: 'game_started',
  STATE_UPDATE: 'state_update',
  ACTION_RESULT: 'action_result',
  GAME_OVER: 'game_over',
  ERROR: 'error',
};

// Player colors are assigned by seat order (index into room.players).
export const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow'];

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion

export function randomRoomCode(length = 4) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}
