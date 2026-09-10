/** Ambient shims — real modules resolved by Vite alias to E:/easy-floorplan/src */

declare module 'easy-floorplan/editor'

declare module 'easy-floorplan/floorplan-card'

declare module 'easy-floorplan/types' {
  export interface FloorplanCardConfig {
    type: string
    width?: number
    height?: number
    grid?: number
    floors?: Floor[]
    walls?: Wall[]
    openings?: Opening[]
    items?: unknown[]
    texts?: unknown[]
    furniture?: unknown[]
    trackers?: unknown[]
    areas?: unknown[]
    [key: string]: unknown
  }

  export interface Floor {
    id: string
    name: string
    walls: Wall[]
    openings: Opening[]
    items?: unknown[]
    texts?: unknown[]
    furniture?: unknown[]
    trackers?: unknown[]
    areas?: unknown[]
  }

  export interface Wall {
    id: string
    x1: number
    y1: number
    x2: number
    y2: number
    thickness?: number
  }

  export interface Opening {
    id: string
    type: 'door' | 'window'
    x: number
    y: number
    length: number
    angle: number
    motion?: string
    flipH?: boolean
    flipV?: boolean
  }

  export function emptyConfig(type: string): FloorplanCardConfig
  export function newPlanConfig(): Partial<FloorplanCardConfig>
}
