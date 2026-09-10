import type { FloorplanCardConfig, Opening, Wall } from 'easy-floorplan/types'

/** Convert easy-floorplan walls/doors into line segments + door portals for Monday demo routing */

export interface EfpPortal {
  id: string
  x: number
  y: number
  angle: number
  length: number
}

export function floorsOf(cfg: FloorplanCardConfig) {
  if (cfg.floors?.length) return cfg.floors
  // legacy flat
  return [
    {
      id: 'legacy',
      name: '1F',
      walls: cfg.walls ?? [],
      openings: cfg.openings ?? [],
      items: cfg.items ?? [],
      texts: cfg.texts ?? [],
      furniture: cfg.furniture ?? [],
      trackers: cfg.trackers ?? [],
      areas: cfg.areas ?? [],
    },
  ]
}

export function activeFloor(cfg: FloorplanCardConfig) {
  return floorsOf(cfg)[0]
}

export function wallLines(walls: Wall[]): { x1: number; y1: number; x2: number; y2: number }[] {
  return walls.map((w) => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }))
}

export function portals(openings: Opening[]): EfpPortal[] {
  return openings
    .filter((o) => o.type === 'door')
    .map((o) => ({
      id: o.id,
      x: o.x,
      y: o.y,
      angle: o.angle ?? 0,
      length: o.length,
    }))
}

/** Orthogonal route preferring door portals (easy-floorplan openings) */
export function routeViaPortals(
  from: { x: number; y: number },
  to: { x: number; y: number },
  doors: EfpPortal[],
): { x: number; y: number }[] {
  if (!doors.length) {
    const midX = (from.x + to.x) / 2
    return [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to]
  }
  let best: { a: EfpPortal; b: EfpPortal; score: number } | null = null
  for (const a of doors) {
    for (const b of doors) {
      if (a.id === b.id) continue
      const score =
        Math.hypot(from.x - a.x, from.y - a.y) +
        Math.hypot(a.x - b.x, a.y - b.y) +
        Math.hypot(b.x - to.x, b.y - to.y)
      if (!best || score < best.score) best = { a, b, score }
    }
  }
  // single door: go through it
  if (!best) {
    const d = doors[0]
    return [
      from,
      { x: from.x, y: d.y },
      { x: d.x, y: d.y },
      { x: to.x, y: d.y },
      to,
    ]
  }
  return [
    from,
    { x: from.x, y: best.a.y },
    { x: best.a.x, y: best.a.y },
    { x: best.b.x, y: best.b.y },
    { x: to.x, y: best.b.y },
    to,
  ]
}
