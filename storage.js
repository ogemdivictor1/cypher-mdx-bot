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
