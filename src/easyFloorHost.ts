/**
 * Standalone host for nicosandller/easy-floorplan editor (MIT).
 * 单层办公平面 · 高对比 · 画布塞进可视区
 */
import 'easy-floorplan/editor'
import type { FloorplanCardConfig } from 'easy-floorplan/types'
import { emptyConfig, newPlanConfig } from 'easy-floorplan/types'

const STORE_KEY = 'monday.easyFloorplan.config.v4'

export type EasyFloorConfig = FloorplanCardConfig

/** 更小画布，默认一屏能看全（约 16:10） */
export function defaultOfficePlan(): FloorplanCardConfig {
  return {
    ...emptyConfig('custom:easy-floorplan-card'),
    ...newPlanConfig(),
    width: 960,
    height: 540,
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
          { id: 'w1', x1: 40, y1: 40, x2: 340, y2: 40, thickness: 8 },
          { id: 'w2', x1: 340, y1: 40, x2: 340, y2: 220, thickness: 8 },
          { id: 'w3', x1: 340, y1: 300, x2: 340, y2: 500, thickness: 8 },
          { id: 'w4', x1: 340, y1: 500, x2: 40, y2: 500, thickness: 8 },
          { id: 'w5', x1: 40, y1: 500, x2: 40, y2: 40, thickness: 8 },
          // AI 办公室
          { id: 'w6', x1: 420, y1: 40, x2: 920, y2: 40, thickness: 8 },
          { id: 'w7', x1: 920, y1: 40, x2: 920, y2: 500, thickness: 8 },
          { id: 'w8', x1: 920, y1: 500, x2: 420, y2: 500, thickness: 8 },
          { id: 'w9', x1: 420, y1: 500, x2: 420, y2: 300, thickness: 8 },
          { id: 'w10', x1: 420, y1: 220, x2: 420, y2: 40, thickness: 8 },
        ],
        openings: [
          {
            id: 'd_finance',
            type: 'door',
            x: 340,
            y: 260,
            length: 64,
            angle: 90,
            motion: 'swing',
          },
          {
            id: 'd_ai',
            type: 'door',
            x: 420,
            y: 260,
            length: 64,
            angle: 90,
            motion: 'swing',
            flipH: true,
          },
        ],
        items: [],
        texts: [
          { id: 't1', x: 120, y: 90, text: '财务部', size: 26, color: '#111111' },
          { id: 't2', x: 600, y: 90, text: 'AI 办公室', size: 26, color: '#111111' },
        ],
        furniture: [],
        trackers: [],
        areas: [],
      },
    ],
  } as FloorplanCardConfig
}

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
    width: cfg.width || 960,
    height: cfg.height || 540,
    floors,
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
  localStorage.removeItem('monday.easyFloorplan.config')
  localStorage.removeItem('monday.easyFloorplan.config.v3')
}

function injectEditorChrome(ed: HTMLElement): void {
  const root = ed.shadowRoot
  if (!root) return

  let style = root.querySelector('#monday-efp-fit') as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = 'monday-efp-fit'
    root.appendChild(style)
  }

  style.textContent = `
    /* 无 HA 主题时的可读配色 */
    :host {
      --primary-text-color: #0f172a;
      --secondary-text-color: #1e293b;
      --disabled-text-color: #475569;
      --secondary-background-color: #e2e8f0;
      --divider-color: #cbd5e1;
      --card-background-color: #fffdf7;
      --primary-color: #e4444c;
      display: flex !important;
      flex-direction: column !important;
      height: 100% !important;
      min-height: 0 !important;
      box-sizing: border-box;
    }

    .floors { display: none !important; }

    .editor {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
    }

    .context-bar .ctx-hint {
      color: #0f172a !important;
      font-weight: 600 !important;
      opacity: 1 !important;
    }
    .context-bar .ctx-label {
      color: #b91c1c !important;
    }

    .workspace {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: stretch !important;
      gap: 8px !important;
    }

    .canvas-outer {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
    }

    /* 关键：不要用 aspect-ratio 把高度撑破屏幕 */
    .canvas-wrap {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      height: auto !important;
      aspect-ratio: unset !important;
      overflow: hidden !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #f1f5f9;
    }

    .stage {
      width: auto !important;
      max-width: 100% !important;
      max-height: 100% !important;
      height: auto !important;
      /* 用画布比例，但限制在容器内 */
      aspect-ratio: ${Number(ed.getAttribute('data-plan-w') || 960)} / ${Number(ed.getAttribute('data-plan-h') || 540)};
    }

    .side {
      flex: 0 0 300px !important;
      max-height: 100% !important;
      overflow: auto !important;
      min-width: 0 !important;
    }

    @media (max-width: 1100px) {
      .workspace { flex-direction: column !important; }
      .side { flex: 0 0 auto !important; max-height: 28vh !important; }
    }
  `
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
  ed.setAttribute('data-plan-w', String(cfg.width || 960))
  ed.setAttribute('data-plan-h', String(cfg.height || 540))

  ed.hass = {
    states: {},
    entities: {},
    themes: { darkMode: false },
    formatEntityState: (s: { state?: string }) => s?.state ?? '',
  }
  ed.setConfig(cfg)
  host.appendChild(ed)

  const polish = () => {
    injectEditorChrome(ed)
    const w = Number(ed.getAttribute('data-plan-w') || 960)
    const h = Number(ed.getAttribute('data-plan-h') || 540)
    const wrap = ed.shadowRoot?.querySelector('.canvas-wrap') as HTMLElement | null
    if (wrap) {
      wrap.style.aspectRatio = 'auto'
      wrap.style.height = 'auto'
      wrap.style.flex = '1 1 auto'
      wrap.style.minHeight = '0'
      wrap.style.overflow = 'hidden'
    }
    const stage = ed.shadowRoot?.querySelector('.stage') as HTMLElement | null
    if (stage) {
      // 盖掉 zoom% 宽度，改成「塞进可视区」
      stage.style.width = 'auto'
      stage.style.height = 'auto'
      stage.style.maxWidth = '100%'
      stage.style.maxHeight = '100%'
      stage.style.aspectRatio = `${w} / ${h}`
    }
  }

  void ed.updateComplete?.then(polish)
  const mo = new MutationObserver(() => polish())
  queueMicrotask(() => {
    if (ed.shadowRoot) mo.observe(ed.shadowRoot, { childList: true, subtree: true, attributes: true })
    polish()
  })

  const onChange = (ev: Event) => {
    const detail = (ev as CustomEvent<{ config: FloorplanCardConfig }>).detail
    if (detail?.config) {
      cfg = enforceSinglePlane(detail.config)
      ed.setAttribute('data-plan-w', String(cfg.width || 960))
      ed.setAttribute('data-plan-h', String(cfg.height || 540))
      saveEasyFloorConfig(cfg)
      if ((detail.config.floors?.length ?? 0) > 1) ed.setConfig(cfg)
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
