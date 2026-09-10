/**
 * Standalone host for nicosandller/easy-floorplan editor (MIT).
 * Uses a minimal mock `hass` — same approach as their browser tests.
 */
import 'easy-floorplan/editor'
import type { FloorplanCardConfig } from 'easy-floorplan/types'
import { emptyConfig, newPlanConfig } from 'easy-floorplan/types'

const STORE_KEY = 'monday.easyFloorplan.config'

export type EasyFloorConfig = FloorplanCardConfig

export function loadEasyFloorConfig(): FloorplanCardConfig {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw) as FloorplanCardConfig
  } catch {
    /* ignore */
  }
  return {
    ...emptyConfig('custom:easy-floorplan-card'),
    ...newPlanConfig(),
    width: 1200,
    height: 720,
    floors: [
      {
        id: 'f1',
        name: '1F',
        walls: [
          // 财务部 box
          { id: 'w1', x1: 80, y1: 80, x2: 420, y2: 80 },
          { id: 'w2', x1: 420, y1: 80, x2: 420, y2: 300 },
          { id: 'w3', x1: 420, y1: 360, x2: 420, y2: 640 },
          { id: 'w4', x1: 420, y1: 640, x2: 80, y2: 640 },
          { id: 'w5', x1: 80, y1: 640, x2: 80, y2: 80 },
          // AI 办公室 box
          { id: 'w6', x1: 500, y1: 80, x2: 1120, y2: 80 },
          { id: 'w7', x1: 1120, y1: 80, x2: 1120, y2: 640 },
          { id: 'w8', x1: 1120, y1: 640, x2: 500, y2: 640 },
          { id: 'w9', x1: 500, y1: 640, x2: 500, y2: 360 },
          { id: 'w10', x1: 500, y1: 300, x2: 500, y2: 80 },
        ],
        openings: [
          {
            id: 'd1',
            type: 'door',
            x: 420,
            y: 330,
            length: 56,
            angle: 90,
            motion: 'swing',
          },
          {
            id: 'd2',
            type: 'door',
            x: 500,
            y: 330,
            length: 56,
            angle: 90,
            motion: 'swing',
            flipH: true,
          },
        ],
        items: [],
        texts: [
          { id: 't1', x: 180, y: 120, text: '财务部', size: 22 },
          { id: 't2', x: 720, y: 120, text: 'AI 办公室', size: 22 },
        ],
        furniture: [],
        trackers: [],
        areas: [],
      },
    ],
  } as FloorplanCardConfig
}

export function saveEasyFloorConfig(cfg: FloorplanCardConfig): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(cfg))
}

export function mountEasyFloorEditor(host: HTMLElement): {
  getConfig: () => FloorplanCardConfig
  destroy: () => void
} {
  host.innerHTML = ''
  host.classList.add('efp-host')

  const ed = document.createElement('easy-floorplan-card-editor') as unknown as HTMLElement & {
    hass?: unknown
    setConfig: (c: FloorplanCardConfig) => void
  }

  let cfg = loadEasyFloorConfig()
  ed.hass = {
    states: {},
    entities: {},
    formatEntityState: (s: { state?: string }) => s?.state ?? '',
  }
  ed.setConfig(cfg)
  host.appendChild(ed)

  const onChange = (ev: Event) => {
    const detail = (ev as CustomEvent<{ config: FloorplanCardConfig }>).detail
    if (detail?.config) {
      cfg = detail.config
      saveEasyFloorConfig(cfg)
    }
  }
  ed.addEventListener('config-changed', onChange)

  return {
    getConfig: () => cfg,
    destroy: () => {
      ed.removeEventListener('config-changed', onChange)
      ed.remove()
    },
  }
}
