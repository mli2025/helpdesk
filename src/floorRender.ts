import type { Rect, RegionNode } from './types'

export type Edge = 'n' | 's' | 'e' | 'w'

export interface DoorSpec {
  edge: Edge
  /** 0..1 along the edge */
  t: number
  /** opening width in px */
  width: number
}

export interface WallSeg {
  x1: number
  y1: number
  x2: number
  y2: number
  edge: Edge
}

/** Default one door on south edge center — 户型开口 */
export function defaultDoors(): DoorSpec[] {
  return [{ edge: 's', t: 0.5, width: 56 }]
}

export function ensureDoors(region: RegionNode): DoorSpec[] {
  return region.doors?.length ? region.doors : defaultDoors()
}

/** Split rectangle outline into wall segments with door gaps (图1 线框墙) */
export function wallSegments(rect: Rect, doors: DoorSpec[]): WallSeg[] {
  const { x, y, w, h } = rect
  const segs: WallSeg[] = []

  const edgeLine = (edge: Edge): { x1: number; y1: number; x2: number; y2: number; len: number } => {
    if (edge === 'n') return { x1: x, y1: y, x2: x + w, y2: y, len: w }
    if (edge === 's') return { x1: x, y1: y + h, x2: x + w, y2: y + h, len: w }
    if (edge === 'w') return { x1: x, y1: y, x2: x, y2: y + h, len: h }
    return { x1: x + w, y1: y, x2: x + w, y2: y + h, len: h }
  }

  for (const edge of ['n', 'e', 's', 'w'] as Edge[]) {
    const line = edgeLine(edge)
    const door = doors.find((d) => d.edge === edge)
    if (!door) {
      segs.push({ x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, edge })
      continue
    }
    const half = door.width / 2
    const center = door.t * line.len
    const a0 = 0
    const a1 = Math.max(0, center - half)
    const b0 = Math.min(line.len, center + half)
    const b1 = line.len

    const pointAt = (t: number) => {
      const r = t / line.len
      return {
        x: line.x1 + (line.x2 - line.x1) * r,
        y: line.y1 + (line.y2 - line.y1) * r,
      }
    }

    if (a1 - a0 > 2) {
      const p0 = pointAt(a0)
      const p1 = pointAt(a1)
      segs.push({ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, edge })
    }
    if (b1 - b0 > 2) {
      const p0 = pointAt(b0)
      const p1 = pointAt(b1)
      segs.push({ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, edge })
    }
  }
  return segs
}

/** Isometric projection (图2) */
export function toIso(x: number, y: number, z = 0, ox = 520, oy = 80): { x: number; y: number } {
  return {
    x: ox + (x - y) * 0.72,
    y: oy + (x + y) * 0.36 - z,
  }
}

export function isoQuad(
  points: { x: number; y: number; z?: number }[],
  ox?: number,
  oy?: number,
): string {
  return points
    .map((p, i) => {
      const q = toIso(p.x, p.y, p.z ?? 0, ox, oy)
      return `${i === 0 ? 'M' : 'L'} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`
    })
    .join(' ') + ' Z'
}

/** Extruded wall face for one segment */
export function isoWallFaces(
  seg: WallSeg,
  wallH = 28,
  ox?: number,
  oy?: number,
): { side: string; top: string } {
  const a = { x: seg.x1, y: seg.y1 }
  const b = { x: seg.x2, y: seg.y2 }
  const side = isoQuad(
    [
      { ...a, z: 0 },
      { ...b, z: 0 },
      { ...b, z: wallH },
      { ...a, z: wallH },
    ],
    ox,
    oy,
  )
  // thin top cap
  const thick = 4
  const nx = seg.y1 === seg.y2 ? 0 : thick
  const ny = seg.x1 === seg.x2 ? 0 : thick
  const top = isoQuad(
    [
      { x: a.x, y: a.y, z: wallH },
      { x: b.x, y: b.y, z: wallH },
      { x: b.x + nx, y: b.y + ny, z: wallH },
      { x: a.x + nx, y: a.y + ny, z: wallH },
    ],
    ox,
    oy,
  )
  return { side, top }
}

export function isoFloorPath(rect: Rect, ox?: number, oy?: number): string {
  const { x, y, w, h } = rect
  return isoQuad(
    [
      { x, y, z: 0 },
      { x: x + w, y, z: 0 },
      { x: x + w, y: y + h, z: 0 },
      { x, y: y + h, z: 0 },
    ],
    ox,
    oy,
  )
}
