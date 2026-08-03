// server.js — Express + socket.io control plane, mirrors cypher-md/src/server.js
import express from 'express'
import http from 'node:http'
import { Server } from 'socket.io'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { startBot, connections, sessions, startTime, isConnecting, sentTracker } from './bot.mjs'
import pairMod from './pair.js'
import storageMod from './storage.js'

const { pairWithWhiskey } = pairMod
const { useAuthState, deleteAuthSession, getStoredPhoneNumbers, hasLegacySession, cleanupStaleSessions } = storageMod

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Admin auth ───
const ADMIN_USER = process.env.ADMIN_USER || 'cypher2dwrld'
const ADMIN_PASS = process.env.ADMIN_PASS || '4265803791'
const adminTokens = new Set()

function genToken() { return crypto.randomBytes(32).toString('hex') }

function getAdminToken(req) {
  const cookies = (req.headers.cookie || '').split(';').map((c) => c.trim())
  for (const c of cookies) {
    if (c.startsWith('admin_token=')) return c.slice('admin_token='.length)
  }
  return null
}

function requireAdmin(req, res, next) {
  const token = getAdminToken(req)
  if (!token || !adminTokens.has(token)) {
    if (req.path.startsWith('/admin/api/')) return res.status(401).json({ error: 'Unauthorized' })
    return res.redirect('/admin/login')
  }
  next()
}

async function main() {
  // ─── Sweep stale session folders first ───
  try {
    const before = await getStoredPhoneNumbers()
    const removed = await cleanupStaleSessions(before)
    if (removed > 0) console.log(`[SRV] stale sweep removed ${removed} folder(s)`)
  } catch (err) {
    console.error('[SRV] initial stale sweep failed:', err.message)
  }

  // ─── Auto-restore saved per-number sessions ───
  try {
    const numbers = await getStoredPhoneNumbers()
    for (const num of numbers) {
      console.log('[SRV] auto-start', num)
      startBot(num).catch((err) => console.error('[SRV] start failed', num, err.message))
    }
    if (await hasLegacySession()) {
      console.log('[SRV] legacy auth_info/ session found — starting main bot')
      startBot().catch((err) => console.error('[SRV] legacy start failed:', err.message))
    }
  } catch (err) {
    console.error('[SRV] load sessions failed:', err.message)
  }

  // ─── Periodic stale-session sweep (every 6h) ───
  setInterval(async () => {
    const active = [...connections.keys()]
    try {
      const removed = await cleanupStaleSessions(active)
      if (removed > 0) console.log(`[SRV] periodic sweep removed ${removed} folder(s)`)
    } catch (err) {
      console.error('[SRV] periodic sweep failed:', err.message)
    }
  }, 6 * 60 * 60 * 1000)

  const app = express()
  const server = http.createServer(app)
  const io = new Server(server)
  app.use(express.json())

  // ─── Admin routes (before static to prevent unauthed file access) ───
  app.post('/admin/login', (req, res) => {
    const { username, password } = req.body || {}
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const token = genToken()
      adminTokens.add(token)
      res.cookie('admin_token', token, { httpOnly: true, sameSite: 'strict', maxAge: 86400000 })
      return res.json({ success: true })
    }
    return res.status(401).json({ error: 'Invalid credentials' })
  })

  app.post('/admin/logout', (req, res) => {
    const token = getAdminToken(req)
    if (token) adminTokens.delete(token)
    res.clearCookie('admin_token')
    res.json({ success: true })
  })

  app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'))
  })

  app.get('/admin/login', (req, res) => {
    const token = getAdminToken(req)
    if (token && adminTokens.has(token)) return res.redirect('/admin')
    res.sendFile(path.join(__dirname, 'public/admin-login.html'))
  })

  app.get('/admin/api/numbers', requireAdmin, (req, res) => {
    const numbers = []
    for (const [sid, conn] of connections) {
      numbers.push({ sid, connected: !!(conn && conn.user) })
    }
    res.json({ numbers })
  })

  app.post('/admin/api/unpair/:sid', requireAdmin, async (req, res) => {
    const sid = req.params.sid
    if (!sid) return res.status(400).json({ error: 'Invalid sid' })

    // Disconnect socket
    const conn = connections.get(sid)
    if (conn) {
      try {
        conn.ev.removeAllListeners()
        if (conn.ws) conn.ws.close()
        if (typeof conn.end === 'function') conn.end()
      } catch (_) {}
      connections.delete(sid)
      sessions.delete(sid)
    }
    isConnecting?.delete(sid)

    // Delete auth session if it's a per-number session
    if (sid !== 'main') {
      try { await deleteAuthSession(sid) } catch (_) {}
    }

    res.json({ success: true, message: `Unpaired ${sid}` })
  })

  app.use(express.static(path.join(__dirname, 'public')))

  app.get('/status', (req, res) => {
    try {
      const connList = []
      for (const [sid, conn] of connections) {
        connList.push({ sid, connected: !!(conn && conn.user) })
      }
      const pendingSends = [...sentTracker.entries()].map(([id, e]) => ({
        msgId: id, type: e.type, name: e.name, target: e.target,
        status: e.statusLabel, sentAt: e.sentAt, updatedAt: e.updatedAt,
      }))
      const botStart = startTime || Date.now()
      res.json({
        uptime: Math.floor((Date.now() - botStart) / 1000) + 's',
        connections: connList,
        pendingSends,
      })
    } catch (err) {
      res.status(500).json({ error: err.message, stack: err.stack })
    }
  })

  io.on('connection', (socket) => {
    console.log('[SRV] frontend connected')

    socket.on('request-code', async (phoneNumber) => {
      console.log('[SRV] pair request:', phoneNumber)
      const cleanNumber = phoneNumber.replace(/\D/g, '')
      if (!/^\d{10,15}$/.test(cleanNumber)) {
        socket.emit('error', 'Invalid phone number')
        return
      }

      // If already connected or connecting, tear down the old session first
      if (connections.has(cleanNumber) || isConnecting?.has(cleanNumber)) {
        console.log(`[SRV] re-pairing ${cleanNumber} — killing old session`)
        const oldConn = connections.get(cleanNumber)
        if (oldConn) {
          try {
            oldConn.ev.removeAllListeners()
            if (oldConn.ws) oldConn.ws.close()
            if (typeof oldConn.end === 'function') oldConn.end()
          } catch (_) {}
          connections.delete(cleanNumber)
          sessions.delete(cleanNumber)
        }
        isConnecting?.delete(cleanNumber)
      }

      try {
        const { state, saveCreds } = await pairWithWhiskey(cleanNumber, socket)
        await startBot(cleanNumber, socket, undefined, state, saveCreds)
        socket.emit('bot-started', 'Bot started successfully')
      } catch (error) {
        console.error('[SRV] pair error:', error.message)
        socket.emit('error', 'Pairing failed: ' + error.message)
      }
    })

    socket.on('disconnect', () => {
      console.log('[SRV] frontend disconnected')
    })
  })

  const PORT = process.env.PORT || 3000
  server.listen(PORT, () => {
    console.log(`[SRV] listening on :${PORT}`)
  })
}

main()
