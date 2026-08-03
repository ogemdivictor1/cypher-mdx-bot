// storage.js — per-number session storage (file backend), mirrors cypher-md/src/storage.js
import path from 'node:path'
import fs from 'node:fs'
import { useMultiFileAuthState } from '@lordmega/baileys'

const AUTH_ROOT = path.join(process.cwd(), 'auth_info')

export function getAuthRoot() {
  return AUTH_ROOT
}

function authFolder(phoneNumber) {
  const clean = String(phoneNumber || '').replace(/\D/g, '')
  return path.join(AUTH_ROOT, clean)
}

// Resolve the Baileys auth state for a phone number (auth_info/<number>/)
export async function useAuthState(phoneNumber) {
  const folder = authFolder(phoneNumber)
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true })
  return useMultiFileAuthState(folder)
}

// Delete a per-number auth session
export async function deleteAuthSession(phoneNumber) {
  const folder = authFolder(phoneNumber)
  fs.rmSync(folder, { recursive: true, force: true })
}

// List phone numbers that already have a saved creds.json
export async function getStoredPhoneNumbers() {
  try {
    return fs
      .readdirSync(AUTH_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .filter((d) => fs.existsSync(path.join(AUTH_ROOT, d.name, 'creds.json')))
      .map((d) => d.name)
  } catch {
    return []
  }
}

// Legacy single-session folder (auth_info/creds.json at the root) — used for fallback
export async function hasLegacySession() {
  return fs.existsSync(path.join(AUTH_ROOT, 'creds.json'))
}

// Remove stale auth folders. Folders with no creds.json are always dropped;
// folders older than maxAgeMs are dropped unless they're in activeNumbers.
export async function cleanupStaleSessions(activeNumbers, maxAgeMs = 3 * 24 * 60 * 60 * 1000) {
  const active = new Set(activeNumbers || [])
  let removed = 0
  try {
    const entries = fs.readdirSync(AUTH_ROOT, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const num = entry.name
      if (active.has(num)) continue
      const folder = path.join(AUTH_ROOT, num)
      const hasCreds = fs.existsSync(path.join(folder, 'creds.json'))
      if (!hasCreds) {
        fs.rmSync(folder, { recursive: true, force: true })
        removed++
        console.log(`[STORAGE] removed session folder without creds: ${num}`)
        continue
      }
      const stat = fs.statSync(folder)
      if (Date.now() - stat.mtimeMs > maxAgeMs) {
        fs.rmSync(folder, { recursive: true, force: true })
        removed++
        console.log(`[STORAGE] removed stale session folder: ${num}`)
      }
    }
  } catch (err) {
    console.error('[STORAGE] stale cleanup failed:', err.message)
  }
  return removed
}
