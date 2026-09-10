import type { BoardScheme } from './types'
import { emptyScheme, sampleScheme } from './types'

const LIST_KEY = 'monday.board.schemes'
const ACTIVE_KEY = 'monday.board.activeId'

export interface SchemeMeta {
  id: string
  name: string
  updatedAt: string
}

function readAll(): BoardScheme[] {
  try {
    const raw = localStorage.getItem(LIST_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as BoardScheme[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeAll(list: BoardScheme[]): void {
  localStorage.setItem(LIST_KEY, JSON.stringify(list))
}

export function listSchemes(): SchemeMeta[] {
  return readAll()
    .map((s) => ({ id: s.id, name: s.name, updatedAt: s.updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getScheme(id: string): BoardScheme | null {
  return readAll().find((s) => s.id === id) ?? null
}

export function getActiveSchemeId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function setActiveSchemeId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function saveScheme(scheme: BoardScheme): BoardScheme {
  const next = { ...scheme, updatedAt: new Date().toISOString() }
  const all = readAll()
  const idx = all.findIndex((s) => s.id === next.id)
  if (idx >= 0) all[idx] = next
  else all.push(next)
  writeAll(all)
  setActiveSchemeId(next.id)
  return next
}

export function deleteScheme(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id))
  if (getActiveSchemeId() === id) localStorage.removeItem(ACTIVE_KEY)
}

export function ensureDefaultScheme(): BoardScheme {
  const all = readAll()
  if (all.length) {
    const active = getActiveSchemeId()
    return (active && getScheme(active)) || all[0]
  }
  const s = sampleScheme()
  saveScheme(s)
  return s
}

export function exportSchemeJson(scheme: BoardScheme): string {
  return JSON.stringify(scheme, null, 2)
}

export function importSchemeJson(text: string): BoardScheme {
  const parsed = JSON.parse(text) as BoardScheme
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.nodes)) {
    throw new Error('无效的看板方案 JSON')
  }
  if (!parsed.id) parsed.id = `board_${Date.now()}`
  return saveScheme(parsed)
}

export function createNewScheme(name?: string): BoardScheme {
  return saveScheme(emptyScheme(name))
}
