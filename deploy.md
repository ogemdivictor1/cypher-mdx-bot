# 🏴‍☠️ CYPHER MDX — Deployment Guide

This bot runs on Node.js (ES modules). It is a self-contained WhatsApp
crash-payload delivery system with a web UI for pairing new sessions.

> **Supported on:** Render, Railway, Fly.io, Heroku, Koyeb, Hugging Face
> Spaces, Replit, a plain VPS, or any host that can run `node server.js`.

---

## 1. Requirements

| Requirement | Value |
|---|---|
| Node.js | **18+** (20 LTS recommended) |
| Package manager | npm |
| Memory | 256 MB+ (Baileys + WhatsApp Rust bridge) |
| Persistence | **A writable persistent disk for `auth_info/`** (see §5) |

The bot stores WhatsApp sessions on disk in `auth_info/<phone>/`. If the
platform's filesystem is **ephemeral** (resets on redeploy), sessions are lost
and you must re-pair after every deploy.

---

## 2. Quick Start (local / any server)

```bash
git clone <your-repo-url>
cd <repo>
npm install
node server.js
```

Open `http://localhost:3000` and pair a number.

**Commands (inside WhatsApp, sent to the bot from any number):**

```
!ping                    -> pong
!list                    -> list loaded payloads & routines
!send <payload> <jid>    -> send a payload to a target
!run <routine> <jid> [n] -> run an embedded routine (loop n times)
!calltest <jid>          -> one call offer
!callspam <jid> [count]  -> burst of call offers
```

**Web endpoints:**

| Path | Purpose |
|---|---|
| `/` | Pairing page (socket.io live code display) |
| `/admin/login` | Admin login |
| `/admin` | Admin panel (view / unpair sessions) |
| `/status` | JSON status (uptime + connections) |

---

## 3. Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Web server port |
| `ADMIN_USER` | `cypher2dwrld` | Admin panel username |
| `ADMIN_PASS` | `4265803791` | Admin panel password |

Set them on your platform's dashboard or in a `.env` file.

---

## 4. Platform-by-platform

### Render.com (recommended — free)
1. Push this repo to GitHub.
2. Render → **New** → **Web Service** → connect the repo.
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add a **persistent disk** (see §5) and mount it at the repo root, or point
   `auth_info` at a mounted path.
6. Deploy. Open the service URL → pair your number.

### Railway
1. Railway → **New Project** → **Deploy from GitHub repo**.
2. Build: `npm install` — Start: `node server.js`.
3. Add a **Volume** mounted at `/app` (repo root) to keep `auth_info/`.

### Fly.io
```bash
# fly.toml is included in the repo
fly launch
fly deploy
```
1. `flyctl launch` (accept defaults), then `fly deploy`.
2. Add a volume for session persistence:
```bash
fly volumes create data --size 1 --region <your-region>
fly deploy
```
   Mount it at `/app` (see the included `fly.toml` — update the mount path
   if your volume has a different name).

### Heroku
```bash
heroku create your-bot-name
heroku config:set ADMIN_USER=... ADMIN_PASS=...
git push heroku main
heroku open
```
> Heroku's filesystem is ephemeral — sessions reset on each dyno restart
> unless you add a paid filesystem add-on or move `auth_info/` to object
> storage (out of scope for this build).

### Koyeb
1. Push to GitHub → Koyeb → **Create Service** → GitHub.
2. Build: `npm install` — Run: `node server.js`.
3. Attach a persistent volume for `auth_info/`.

### Hugging Face Spaces
1. New Space → **Docker** → push the repo (Space repo).
2. The included `Dockerfile` runs `node server.js` on port 3000.
3. Attach a **persistent storage** volume for `auth_info/`.

### Replit
1. Import the GitHub repo.
2. Run: `npm install && node server.js`
3. Turn on the **Always On** toggle. Replit's filesystem is persistent enough
   for casual use.

### VPS / bare metal (any Linux box)
```bash
cd /opt
git clone <your-repo-url> cypher-mdx
cd cypher-mdx
npm install

# run under a process manager so it survives reboots
npm i -g pm2
pm2 start server.js --name cypher-mdx
pm2 save
pm2 startup   # follow the printed command
```

---

## 5. ⚠️ Session persistence (READ THIS)

`auth_info/` holds your WhatsApp login. Deploying to a platform whose disk is
**ephemeral** (Render without a disk, Heroku, Railway without a volume, Fly
without a volume, HF Spaces without persistent storage) means:

- The bot reconnects fine while the instance lives.
- On redeploy/restart the disk is wiped → **you must re-pair**.
- To avoid re-pairing, mount a persistent volume and make sure `auth_info/`
  lives on it. Simplest approach: mount the volume at the repo root so
  `auth_info/` is written to it.

---

## 6. Reverse proxy / HTTPS (recommended)

Many free tiers give you HTTPS automatically. On a VPS put a reverse proxy in
front:

```nginx
server {
  listen 80;
  server_name your.domain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
  }
}
```
The `Upgrade`/`Connection` headers are required for **socket.io** (pairing
codes stream over a WebSocket).

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| Pairing code never appears | Check the server log for `[PAIR] code:`. Make sure the number format is country-code + number. |
| `Cannot find module` at startup | Run `npm install`. Node 18+ required. |
| Sessions lost after redeploy | See §5 — you need persistent storage. |
| Admin panel 401 | Use `ADMIN_USER`/`ADMIN_PASS` (or defaults) and log in at `/admin/login`. |
| Port already in use | Set `PORT` to a free value. |
| WhatsApp "connection closed" in logs | Expected — the bot auto-reconnects with backoff. |

---

## 8. Files layout

```
.
├── server.js        # Express + socket.io control plane (pairing + admin)
├── bot.js           # WhatsApp socket, command registry, payload routines
├── pair.js          # Pairing flow (request code, save session)
├── storage.js       # Per-number session storage (auth_info/<phone>)
├── public/          # Web UI: pairing page + admin panel
├── payloads.mjs     # Static payload object collection
├── detect.mjs       # Optional incoming-message scoring hook
├── auth_info/       # Saved WhatsApp sessions (gitignored)
└── package.json
```
