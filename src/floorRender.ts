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

export interface Pt {
  x: number
  y: number
}

/** Default one door on south edge center */
export function defaultDoors(): DoorSpec[] {
  return [{ edge: 's', t: 0.5, width: 56 }]
}

export function ensureDoors(region: RegionNode): DoorSpec[] {
  return region.doors?.length ? region.doors.map((d) => ({ ...d })) : defaultDoors()
}

/** 门口旋转 90°：北→东→南→西→北 */
export function rotateDoorEdge(edge: Edge, steps = 1): Edge {
  const order: Edge[] = ['n', 'e', 's', 'w']
  const i = order.indexOf(edge)
  const s = ((steps % 4) + 4) % 4
  return order[(i + s) % 4]
}

export function edgeLine(
  rect: Rect,
  edge: Edge,
): { x1: number; y1: number; x2: number; y2: number; len: number } {
  const { x, y, w, h } = rect
  if (edge === 'n') return { x1: x, y1: y, x2: x + w, y2: y, len: w }
  if (edge === 's') return { x1: x, y1: y + h, x2: x + w, y2: y + h, len: w }
  if (edge === 'w') return { x1: x, y1: y, x2: x, y2: y + h, len: h }
  return { x1: x + w, y1: y, x2: x + w, y2: y + h, len: h }
}

export function pointOnEdge(rect: Rect, edge: Edge, t: number): Pt {
  const line = edgeLine(rect, edge)
  return {
    x: line.x1 + (line.x2 - line.x1) * t,
    y: line.y1 + (line.y2 - line.y1) * t,
  }
}

export function doorCenter(rect: Rect, door: DoorSpec): Pt {
  return pointOnEdge(rect, door.edge, door.t)
}

/** Project screen point onto an edge → t in 0..1 */
export function projectToEdge(rect: Rect, edge: Edge, p: Pt): number {
  const line = edgeLine(rect, edge)
  if (edge === 'n' || edge === 's') {
    return Math.min(1, Math.max(0, (p.x - line.x1) / (line.len || 1)))
  }
  return Math.min(1, Math.max(0, (p.y - line.y1) / (line.len || 1)))
}

/**
 * Door swing arc (户型图常见画法，参考 Khaaka / easy-floorplan)
 * inward: arc opens into the room
 */
export function doorSwingPoints(rect: Rect, door: DoorSpec, steps = 8): Pt[] {
  const half = door.width / 2
  const c = doorCenter(rect, door)
  // hinge at lower-t side of opening
  const hingeT = Math.max(0, door.t - half / edgeLine(rect, door.edge).len)
  const hinge = pointOnEdge(rect, door.edge, hingeT)
  const startAngle =
    door.edge === 'n' ? Math.PI : door.edge === 's' ? 0 : door.edge === 'e' ? -Math.PI / 2 : Math.PI / 2
  // swing 90° into interior
  const dir = door.edge === 'n' || door.edge === 'w' ? 1 : -1
  const pts: Pt[] = [hinge]
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + dir * (Math.PI / 2) * (i / steps)
    pts.push({
      x: hinge.x + Math.cos(a) * door.width,
      y: hinge.y + Math.sin(a) * door.width,
    })
  }
  pts.push(c) // not needed for line
  return pts.slice(0, -1)
}

/** Split rectangle outline into wall segments with door gaps (multi-door per edge) */
export function wallSegments(rect: Rect, doors: DoorSpec[]): WallSeg[] {
  const segs: WallSeg[] = []

  for (const edge of ['n', 'e', 's', 'w'] as Edge[]) {
    const line = edgeLine(rect, edge)
    const onEdge = doors
      .filter((d) => d.edge === edge)
      .map((d) => {
        const half = d.width / 2
        return {
          a: Math.max(0, d.t * line.len - half),
          b: Math.min(line.len, d.t * line.len + half),
        }
      })
      .sort((a, b) => a.a - b.a)

    const pointAt = (dist: number) => {
      const r = dist / (line.len || 1)
      return {
        x: line.x1 + (line.x2 - line.x1) * r,
        y: line.y1 + (line.y2 - line.y1) * r,
      }
    }

    let cursor = 0
    for (const gap of onEdge) {
      if (gap.a - cursor > 2) {
        const p0 = pointAt(cursor)
        const p1 = pointAt(gap.a)
        segs.push({ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, edge })
      }
      cursor = Math.max(cursor, gap.b)
    }
    if (line.len - cursor > 2) {
      const p0 = pointAt(cursor)
      const p1 = pointAt(line.len)
      segs.push({ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, edge })
    }
  }
  return segs
}

export function edgeLabel(edge: Edge): string {
  if (edge === 'n') return '北墙'
  if (edge === 's') return '南墙'
  if (edge === 'e') return '东墙'
  return '西墙'
}
