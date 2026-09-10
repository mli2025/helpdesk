/**
 * Standalone host for nicosandller/easy-floorplan editor (MIT).
 * 单层办公平面 · 高对比 · 画布塞进可视区（不撑破一屏）
 */
import 'easy-floorplan/editor'
import type { FloorplanCardConfig } from 'easy-floorplan/types'
import { mondayOfficePlan } from './mondayOfficePlan'

const STORE_KEY = 'monday.easyFloorplan.config.v6'

export type EasyFloorConfig = FloorplanCardConfig

export function defaultOfficePlan(): FloorplanCardConfig {
  return mondayOfficePlan()
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
    width: cfg.width || 1200,
    height: cfg.height || 720,
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
  localStorage.removeItem('monday.easyFloorplan.config.v4')
  localStorage.removeItem('monday.easyFloorplan.config.v5')
}

function planSize(ed: HTMLElement): { w: number; h: number } {
  return {
    w: Number(ed.getAttribute('data-plan-w') || 1200),
    h: Number(ed.getAttribute('data-plan-h') || 720),
  }
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

  const { w, h } = planSize(ed)

  style.textContent = `
    /*
      页面是深色字色；未定义 HA 变量时，context-bar 会继承浅色字 → 白底上看不清。
      在此强制一套可读的浅色主题变量。
    */
    :host {
      --primary-text-color: #0f172a !important;
      --secondary-text-color: #0f172a !important;
      --disabled-text-color: #334155 !important;
      --secondary-background-color: #e2e8f0 !important;
      --divider-color: #cbd5e1 !important;
      --card-background-color: #fffdf7 !important;
      --primary-color: #e4444c !important;
      color: #0f172a !important;
      display: flex !important;
      flex-direction: column !important;
      height: 100% !important;
      min-height: 0 !important;
      max-height: 100% !important;
      box-sizing: border-box;
      overflow: hidden !important;
    }

    .floors { display: none !important; }

    .editor {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      max-height: 100% !important;
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
      overflow: hidden !important;
      padding: 6px !important;
      box-sizing: border-box !important;
    }

    .toolbar {
      flex: 0 0 auto !important;
      flex-wrap: wrap !important;
    }

    .context-bar {
      flex: 0 0 auto !important;
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      color: #0f172a !important;
    }
    .context-bar,
    .context-bar * {
      color: #0f172a !important;
    }
    .context-bar .ctx-hint,
    .context-bar .ctx-field,
    .context-bar .ctx-field-label,
    .context-bar .ctx-count {
      color: #0f172a !important;
      font-weight: 600 !important;
      opacity: 1 !important;
      font-size: 13px !important;
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
      overflow: hidden !important;
    }

    .canvas-outer {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
    }

    /* 吃掉剩余高度；取消源码的 aspect-ratio 撑高 */
    .canvas-wrap {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      height: auto !important;
      aspect-ratio: unset !important;
      overflow: hidden !important;
      resize: none !important;
      display: grid !important;
      place-items: center !important;
      background: #f1f5f9 !important;
      container-type: size !important;
    }

    /*
      用容器查询把 stage「装进」可视区：
      width = min(100cqw, 100cqh * w/h)
      height = min(100cqh, 100cqw * h/w)
    */
    .stage {
      position: relative !important;
      flex: none !important;
      margin: 0 !important;
      width: min(100cqw, calc(100cqh * ${w} / ${h})) !important;
      height: min(100cqh, calc(100cqw * ${h} / ${w})) !important;
      max-width: 100% !important;
      max-height: 100% !important;
      aspect-ratio: unset !important;
    }

    .side {
      flex: 0 0 280px !important;
      max-height: 100% !important;
      overflow: auto !important;
      min-width: 0 !important;
    }

    @media (max-width: 1100px) {
      .workspace { flex-direction: column !important; }
      .side { flex: 0 0 auto !important; max-height: 22vh !important; }
    }
  `
}

/** 再保险：按像素把 stage 缩进 canvas-wrap（容器查询不支持时） */
function fitStagePixels(ed: HTMLElement): void {
  const wrap = ed.shadowRoot?.querySelector('.canvas-wrap') as HTMLElement | null
  const stage = ed.shadowRoot?.querySelector('.stage') as HTMLElement | null
  if (!wrap || !stage) return
  const { w, h } = planSize(ed)
  const cw = wrap.clientWidth
  const ch = wrap.clientHeight
  if (cw < 40 || ch < 40) return
  const scale = Math.min(cw / w, ch / h)
  const sw = Math.max(1, Math.floor(w * scale))
  const sh = Math.max(1, Math.floor(h * scale))
  stage.style.setProperty('width', `${sw}px`, 'important')
  stage.style.setProperty('height', `${sh}px`, 'important')
  stage.style.setProperty('max-width', '100%', 'important')
  stage.style.setProperty('max-height', '100%', 'important')
  stage.style.setProperty('aspect-ratio', 'unset', 'important')
  wrap.style.setProperty('aspect-ratio', 'auto', 'important')
  wrap.style.setProperty('overflow', 'hidden', 'important')
  wrap.style.setProperty('resize', 'none', 'important')
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
  ed.setAttribute('data-plan-w', String(cfg.width || 1200))
  ed.setAttribute('data-plan-h', String(cfg.height || 720))

  ed.hass = {
    states: {},
    entities: {},
    themes: { darkMode: false },
    formatEntityState: (s: { state?: string }) => s?.state ?? '',
  }
  ed.setConfig(cfg)
  host.appendChild(ed)

  let fitting = false
  const polish = () => {
    if (fitting) return
    fitting = true
    try {
      injectEditorChrome(ed)
      fitStagePixels(ed)
    } finally {
      // 下一帧再允许，避免 MutationObserver 死循环
      requestAnimationFrame(() => {
        fitting = false
      })
    }
  }

  void ed.updateComplete?.then(() => polishAndWatch())

  const mo = new MutationObserver(() => polishAndWatch())
  const ro = new ResizeObserver(() => polish())

  let watchedWrap: Element | null = null
  const ensureWrapWatch = () => {
    const wrap = ed.shadowRoot?.querySelector('.canvas-wrap') ?? null
    if (wrap && wrap !== watchedWrap) {
      if (watchedWrap) ro.unobserve(watchedWrap)
      watchedWrap = wrap
      ro.observe(wrap)
    }
  }

  const polishAndWatch = () => {
    polish()
    ensureWrapWatch()
  }

  queueMicrotask(() => {
    if (ed.shadowRoot) {
      mo.observe(ed.shadowRoot, { childList: true, subtree: true })
      ro.observe(ed)
    }
    polishAndWatch()
    setTimeout(polishAndWatch, 50)
    setTimeout(polishAndWatch, 250)
  })

  const onChange = (ev: Event) => {
    const detail = (ev as CustomEvent<{ config: FloorplanCardConfig }>).detail
    if (detail?.config) {
      cfg = enforceSinglePlane(detail.config)
      ed.setAttribute('data-plan-w', String(cfg.width || 1200))
      ed.setAttribute('data-plan-h', String(cfg.height || 720))
      saveEasyFloorConfig(cfg)
      if ((detail.config.floors?.length ?? 0) > 1) ed.setConfig(cfg)
    }
    polishAndWatch()
  }
  ed.addEventListener('config-changed', onChange)

  return {
    getConfig: () => cfg,
    destroy: () => {
      mo.disconnect()
      ro.disconnect()
      ed.removeEventListener('config-changed', onChange)
      ed.remove()
    },
  }
}
