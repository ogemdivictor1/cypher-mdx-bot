# ☠️ CYPHER MDX

A self-contained WhatsApp crash-payload delivery system with a web-based
pairing UI. Structurally mirrors a production Baileys bot:

- **`server.js`** — Express + socket.io control plane (pairing page, admin panel, status)
- **`bot.js`** — WhatsApp socket factory, command registry, reconnect logic, embedded payload routines
- **`pair.js`** — pairing flow (request code → save session to `auth_info/<phone>/`)
- **`storage.js`** — per-number session storage
- **`public/`** — pirate-themed pairing UI + admin deck

## Quick start

```bash
npm install
node server.js
```

Open `http://localhost:3000`, enter your number, and enter the pairing code in
WhatsApp → Linked Devices.

## Commands (in WhatsApp)

```
!ping                     -> pong
!list                     -> list loaded payloads & routines
!send <payload> <jid>     -> send a payload
!run <routine> <jid> [n]  -> run a routine (loop n times)
!calltest <jid>           -> one call offer
!callspam <jid> [count]   -> call offer burst
```

## Deployment

See [`deploy.md`](deploy.md) for Render, Railway, Fly.io, Heroku, Koyeb,
Hugging Face Spaces, Replit, and VPS instructions.
