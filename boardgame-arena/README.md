# Board Game Arena

A small local-network multiplayer board game app. One device runs the
server; both phones connect to it over WiFi and play turn-based games
together: **Snakes & Ladders**, **Ludo**, and **Monopoly** (full rules).

## Run the server

```sh
cd boardgame-arena
npm install
npm start
```

The server prints something like:

```
Board Game Arena running at http://localhost:3000
On your phones (same WiFi), open one of:
  http://192.168.1.42:3000
```

Both phones must be on the **same WiFi network** as the computer running
the server.

## Connect from each phone

1. Open the printed `http://<lan-ip>:3000` address in your phone's browser
   (Safari on iOS, Chrome on Android).
2. Enter your name.
3. One player taps **Create Room** to get a 4-character room code, and
   shares it with the other player.
4. The other player enters the code and taps **Join Room**.
5. The host picks a game from the dropdown and taps **Start Game**.

## Install as an app (PWA)

- **iOS (Safari)**: tap the Share icon, then "Add to Home Screen".
- **Android (Chrome)**: tap the ⋮ menu, then "Add to Home screen" /
  "Install app".

The app shell (HTML/CSS/JS) is cached for offline loading, but you still
need the LAN server running and reachable to actually play - the app shows
a "Disconnected - reconnecting…" status if it can't reach the server.

## Reconnecting

Each device remembers its player identity and room code in local storage.
If you refresh the page or the app reconnects after losing WiFi, it
automatically rejoins your seat and resyncs the current game state.

## Games

- **Snakes & Ladders** - classic 10x10 board, 2-4 players, first to square
  100 wins.
- **Ludo** - classic cross-shaped board, 2-4 players, get all 4 tokens home.
- **Monopoly** - full rules: buying property, rent, building houses/hotels,
  Chance & Community Chest, jail, mortgages, trading between players, and
  auctions when a purchase is declined.
