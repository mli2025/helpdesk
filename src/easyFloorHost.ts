/**
 * Standalone host for nicosandller/easy-floorplan editor (MIT).
 * Monday = 单层办公平面（隐藏楼层切换），高对比皮肤。
 */
import 'easy-floorplan/editor'
import type { FloorplanCardConfig } from 'easy-floorplan/types'
import { emptyConfig, newPlanConfig } from 'easy-floorplan/types'

const STORE_KEY = 'monday.easyFloorplan.config.v3'

export type EasyFloorConfig = FloorplanCardConfig

/** 单层办公平面示例：完整墙体 + 对侧门口 + 深色标签 */
export function defaultOfficePlan(): FloorplanCardConfig {
  return {
    ...emptyConfig('custom:easy-floorplan-card'),
    ...newPlanConfig(),
    width: 1100,
    height: 680,
    grid: 20,
    skin: 'odnetnin',
    background: '#fffdf7',
    compactHeader: true,
    floors: [
      {
        id: 'office',
        name: '办公平面',
        walls: [
          // 财务部
          { id: 'w1', x1: 60, y1: 60, x2: 400, y2: 60, thickness: 8 },
          { id: 'w2', x1: 400, y1: 60, x2: 400, y2: 280, thickness: 8 },
          { id: 'w3', x1: 400, y1: 360, x2: 400, y2: 620, thickness: 8 },
          { id: 'w4', x1: 400, y1: 620, x2: 60, y2: 620, thickness: 8 },
          { id: 'w5', x1: 60, y1: 620, x2: 60, y2: 60, thickness: 8 },
          // AI 办公室
          { id: 'w6', x1: 480, y1: 60, x2: 1040, y2: 60, thickness: 8 },
          { id: 'w7', x1: 1040, y1: 60, x2: 1040, y2: 620, thickness: 8 },
          { id: 'w8', x1: 1040, y1: 620, x2: 480, y2: 620, thickness: 8 },
          { id: 'w9', x1: 480, y1: 620, x2: 480, y2: 360, thickness: 8 },
          { id: 'w10', x1: 480, y1: 280, x2: 480, y2: 60, thickness: 8 },
        ],
        openings: [
          {
            id: 'd_finance',
            type: 'door',
            x: 400,
            y: 320,
            length: 72,
            angle: 90,
            motion: 'swing',
          },
          {
            id: 'd_ai',
            type: 'door',
            x: 480,
            y: 320,
            length: 72,
            angle: 90,
            motion: 'swing',
            flipH: true,
          },
        ],
        items: [],
        texts: [
          { id: 't1', x: 160, y: 110, text: '财务部', size: 28, color: '#1a1a1a' },
          { id: 't2', x: 680, y: 110, text: 'AI 办公室', size: 28, color: '#1a1a1a' },
        ],
        furniture: [],
        trackers: [],
        areas: [],
      },
    ],
  } as FloorplanCardConfig
}

/** 强制单层，避免「几楼」概念 */
export function enforceSinglePlane(cfg: FloorplanCardConfig): FloorplanCardConfig {
  const floors = cfg.floors?.length
    ? [cfg.floors[0]]
    : [
        {
          id: 'office',
          name: '办公平面',
          walls: cfg.walls ?? [],
          openings: cfg.openings ?? [],
          items: cfg.items ?? [],
          texts: cfg.texts ?? [],
          furniture: cfg.furniture ?? [],
          trackers: cfg.trackers ?? [],
          areas: cfg.areas ?? [],
        },
      ]
  floors[0] = { ...floors[0], name: floors[0].name || '办公平面', id: floors[0].id || 'office' }
  return {
    ...cfg,
    skin: cfg.skin || 'odnetnin',
    background: cfg.background || '#fffdf7',
    floors,
    // clear legacy multi-floor noise
    walls: undefined,
    openings: undefined,
    items: undefined,
    texts: undefined,
    furniture: undefined,
    trackers: undefined,
    areas: undefined,
  } as FloorplanCardConfig
}

export function loadEasyFloorConfig(): FloorplanCardConfig {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return enforceSinglePlane(JSON.parse(raw) as FloorplanCardConfig)
  } catch {
    /* ignore */
  }
  return defaultOfficePlan()
}

export function saveEasyFloorConfig(cfg: FloorplanCardConfig): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(enforceSinglePlane(cfg)))
}

export function resetEasyFloorConfig(): void {
  localStorage.removeItem(STORE_KEY)
  // also clear older keys
  localStorage.removeItem('monday.easyFloorplan.config')
}

function hideFloorChrome(ed: HTMLElement): void {
  const root = ed.shadowRoot
  if (!root) return
  if (!root.querySelector('#monday-hide-floors')) {
    const style = document.createElement('style')
    style.id = 'monday-hide-floors'
    style.textContent = `
      .floors { display: none !important; }
      /* 没有 HA 主题时，保证文字/墙体可读 */
      :host {
        --primary-text-color: #1a1a1a;
        --card-background-color: #fffdf7;
        --primary-color: #e4444c;
      }
    `
    root.appendChild(style)
  }
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
    updateComplete?: Promise<unknown>
  }

  let cfg = loadEasyFloorConfig()
  ed.hass = {
    states: {},
    entities: {},
    themes: { darkMode: false },
    formatEntityState: (s: { state?: string }) => s?.state ?? '',
  }
  ed.setConfig(cfg)
  host.appendChild(ed)

  const polish = () => hideFloorChrome(ed)
  void ed.updateComplete?.then(polish)
  // editor re-renders often; keep floor chrome hidden
  const mo = new MutationObserver(polish)
  queueMicrotask(() => {
    if (ed.shadowRoot) mo.observe(ed.shadowRoot, { childList: true, subtree: true })
    polish()
  })

  const onChange = (ev: Event) => {
    const detail = (ev as CustomEvent<{ config: FloorplanCardConfig }>).detail
    if (detail?.config) {
      cfg = enforceSinglePlane(detail.config)
      saveEasyFloorConfig(cfg)
      // if user somehow added a floor, snap back
      if ((detail.config.floors?.length ?? 0) > 1) {
        ed.setConfig(cfg)
      }
    }
    polish()
  }
  ed.addEventListener('config-changed', onChange)

  return {
    getConfig: () => cfg,
    destroy: () => {
      mo.disconnect()
      ed.removeEventListener('config-changed', onChange)
      ed.remove()
    },
  }
}
