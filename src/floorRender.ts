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

/** Split rectangle outline into wall segments with door gaps */
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

    if (a1 > 2) {
      const p0 = pointAt(0)
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
