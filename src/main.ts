import './style.css'
import {
  applyDemoMode,
  deskMood,
  frontMood,
  startBusiness,
  tick,
  type LiveState,
  type Link,
} from './mock'
import { deskSvg, mondaySvg, moodLabel } from './sprites'

const app = document.querySelector<HTMLDivElement>('#app')!

let state: LiveState = applyDemoMode('busy')
let clockTimer: number | undefined
let simTimer: number | undefined
let spawnTimer: number | undefined

/** viewBox 0..1200 x 0..640 — two rooms only */
const FRONT = { x: 520, y: 300 }
const DESKS = {
  w1: { x: 860, y: 180 },
  w2: { x: 860, y: 420 },
} as const

/** Wall between 财务部 / AI办公室; lines must pass the window gap */
const WINDOW = { x: 484, y: 300 }
/** Inner corridor x inside AI office (front → waiter), avoid cutting desks */
const OFFICE_CORRIDOR_X = 680
/** Approach column just left of window inside 财务部 */
const FINANCE_APPROACH_X = 430

/** 5 users laid out inside 财务部 */
const USER_POS: Record<string, { x: number; y: number }> = {
  u1: { x: 130, y: 160 },
  u2: { x: 250, y: 150 },
  u3: { x: 160, y: 280 },
  u4: { x: 280, y: 300 },
  u5: { x: 200, y: 420 },
}

type Pt = { x: number; y: number }

function nodePos(id: string): Pt {
  if (id === 'front') return FRONT
  if (id === 'w1' || id === 'w2') return DESKS[id]
  return USER_POS[id] ?? { x: 200, y: 300 }
}

function isUser(id: string): boolean {
  return id.startsWith('u')
}

function isDesk(id: string): id is 'w1' | 'w2' {
  return id === 'w1' || id === 'w2'
}

function simplifyOrtho(points: Pt[]): Pt[] {
  if (points.length <= 2) return points
  const out: Pt[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1]
    const cur = points[i]
    if (prev.x === cur.x && prev.y === cur.y) continue
    // collapse colinear middle points
    if (out.length >= 2) {
      const a = out[out.length - 2]
      const b = prev
      if ((a.x === b.x && b.x === cur.x) || (a.y === b.y && b.y === cur.y)) {
        out[out.length - 1] = cur
        continue
      }
    }
    out.push(cur)
  }
  return out
}

function ptsToPath(points: Pt[]): string {
  const pts = simplifyOrtho(points)
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function pathMid(points: Pt[]): Pt {
  const pts = simplifyOrtho(points)
  if (pts.length <= 1) return pts[0] ?? WINDOW
  // prefer a point near the window if the route crosses it
  const winIdx = pts.findIndex((p) => p.x === WINDOW.x && p.y === WINDOW.y)
  if (winIdx >= 0) {
    return { x: WINDOW.x, y: WINDOW.y - 16 }
  }
  const mid = pts[Math.floor(pts.length / 2)]
  return { x: mid.x, y: mid.y - 14 }
}

/** Orthogonal route: never cross the wall except via window */
function routePoints(from: string, to: string, lane = 0): Pt[] {
  const a = nodePos(from)
  const b = nodePos(to)
  const yLane = WINDOW.y + lane

  // Same room: AI office (front ↔ waiter)
  if ((from === 'front' || isDesk(from)) && (to === 'front' || isDesk(to))) {
    return [
      a,
      { x: OFFICE_CORRIDOR_X, y: a.y },
      { x: OFFICE_CORRIDOR_X, y: b.y },
      b,
    ]
  }

  // Finance user ↔ front: must go through window
  if (isUser(from) && to === 'front') {
    return [
      a,
      { x: a.x, y: yLane },
      { x: FINANCE_APPROACH_X, y: yLane },
      { x: WINDOW.x, y: yLane },
      { x: FRONT.x, y: yLane },
      FRONT,
    ]
  }
  if (from === 'front' && isUser(to)) {
    return [
      FRONT,
      { x: FRONT.x, y: yLane },
      { x: WINDOW.x, y: yLane },
      { x: FINANCE_APPROACH_X, y: yLane },
      { x: b.x, y: yLane },
      b,
    ]
  }

  // Waiter ↔ user (writeback / rare): office corridor → window → finance
  if (isDesk(from) && isUser(to)) {
    return [
      a,
      { x: OFFICE_CORRIDOR_X, y: a.y },
      { x: OFFICE_CORRIDOR_X, y: yLane },
      { x: FRONT.x, y: yLane },
      { x: WINDOW.x, y: yLane },
      { x: FINANCE_APPROACH_X, y: yLane },
      { x: b.x, y: yLane },
      b,
    ]
  }
  if (isUser(from) && isDesk(to)) {
    return [
      a,
      { x: a.x, y: yLane },
      { x: FINANCE_APPROACH_X, y: yLane },
      { x: WINDOW.x, y: yLane },
      { x: FRONT.x, y: yLane },
      { x: OFFICE_CORRIDOR_X, y: yLane },
      { x: OFFICE_CORRIDOR_X, y: b.y },
      b,
    ]
  }

  // fallback ortho
  return [a, { x: b.x, y: a.y }, b]
}

function laneOffset(link: Link): number {
  // slight vertical separation so concurrent lines don't fully overlap
  const n = link.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return ((n % 5) - 2) * 10
}

function route(link: Link): { d: string; mid: Pt } {
  const points = routePoints(link.from, link.to, laneOffset(link))
  return { d: ptsToPath(points), mid: pathMid(points) }
}

function fileStack(files: number): string {
  const left = Math.min(5, files)
  const right = Math.max(0, files - 5)
  const leftRects = Array.from({ length: left }, (_, i) => {
    const y = 20 - i * 7
    return `<rect class="file" x="-78" y="${y}" width="22" height="14" rx="2" transform="rotate(${-6 + i} -67 ${y + 7})"/>`
  }).join('')
  const rightRects = Array.from({ length: right }, (_, i) => {
    const y = 20 - i * 7
    return `<rect class="file overflow" x="56" y="${y}" width="22" height="14" rx="2" transform="rotate(${6 - i} 67 ${y + 7})"/>`
  }).join('')
  return `<g class="files">${leftRects}${rightRects}</g>`
}

function renderLinks(links: Link[]): string {
  return links
    .map((l) => {
      const { d, mid } = route(l)
      return `
        <path class="flow ${l.kind}" pathLength="100" d="${d}" />
        <circle class="packet ${l.kind}" r="5">
          <animateMotion dur="1.6s" repeatCount="indefinite" path="${d}" />
        </circle>
        <g class="chip ${l.kind}" transform="translate(${mid.x}, ${mid.y})">
          <rect x="-52" y="-12" width="104" height="24" rx="9"/>
          <text text-anchor="middle" y="5">${l.label}</text>
        </g>`
    })
    .join('')
}

function renderMap(): string {
  const fm = frontMood(state.desks)
  return `
  <svg class="floor-svg" viewBox="0 0 1200 640" role="img" aria-label="星期一作业户型图">
    <defs>
      <pattern id="floorTile" width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(148,163,184,.22)" stroke-width="1"/>
      </pattern>
      <marker id="arrowOpen" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#0d9488"/>
      </marker>
      <marker id="arrowDispatch" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706"/>
      </marker>
      <marker id="arrowBack" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1"/>
      </marker>
      <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="3.5" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <rect x="24" y="24" width="1152" height="592" rx="28" fill="url(#floorTile)"/>
    <rect x="24" y="24" width="1152" height="592" rx="28" fill="rgba(248,250,252,.9)"/>

    <!-- rooms: 财务部 | AI办公室 -->
    <rect class="room finance" x="48" y="48" width="420" height="544" rx="18"/>
    <rect class="room office" x="500" y="48" width="652" height="544" rx="18"/>

    <g class="walls" fill="none">
      <rect x="40" y="40" width="1120" height="560" rx="22"/>
      <!-- wall between finance and AI office, with front window gap -->
      <path d="M 484 56 L 484 230"/>
      <path d="M 484 370 L 484 584"/>
      <path class="window-sill" d="M 476 230 L 476 370"/>
    </g>

    <g class="room-label">
      <text x="258" y="84">财务部</text>
      <text class="sub" x="258" y="106">区域里有多名用户 · 产生业务才连线</text>
      <text x="840" y="84">AI 办公室 · 邮件助手</text>
      <text class="sub" x="840" y="106">前台在窗口 · 服务员桌旁用文件表示负载</text>
    </g>

    <!-- window frame for 前台 -->
    <g class="window" transform="translate(484, 300)">
      <rect x="-18" y="-78" width="36" height="156" rx="8"/>
      <text class="win-tag" text-anchor="middle" y="-88">窗口</text>
    </g>

    <!-- ephemeral lines only -->
    <g class="flows">${renderLinks(state.links)}</g>

    <!-- finance users -->
    ${state.users
      .map((u) => {
        const p = USER_POS[u.id]
        const active = state.links.some(
          (l) => l.from === u.id || l.to === u.id,
        )
        return `
        <g class="user-node ${active ? 'active' : ''}" transform="translate(${p.x}, ${p.y})">
          <circle class="halo" r="30"/>
          <circle class="body" r="22"/>
          <text text-anchor="middle" y="5">${u.name}</text>
        </g>`
      })
      .join('')}

    <!-- front at window -->
    <g class="front-node mood-${fm}" transform="translate(${FRONT.x}, ${FRONT.y})">
      <circle class="aura" r="58"/>
      <foreignObject x="-48" y="-70" width="96" height="120">
        <div xmlns="http://www.w3.org/1999/xhtml" class="fo-wrap">${mondaySvg(fm)}</div>
      </foreignObject>
      <text class="caption" text-anchor="middle" y="62">前台 · ${moodLabel(fm)}</text>
      <g class="speech">
        <rect x="42" y="-70" width="168" height="40" rx="12"/>
        <text x="126" y="-44" text-anchor="middle">${state.speech}</text>
      </g>
    </g>

    <!-- waiters -->
    ${state.desks
      .map((d) => {
        const p = DESKS[d.id]
        const mood = deskMood(d.files)
        return `
        <g class="desk-node mood-${mood}" transform="translate(${p.x}, ${p.y})">
          <rect class="desk-pad" x="-130" y="-88" width="260" height="168" rx="18"/>
          <foreignObject x="-70" y="-86" width="140" height="100">
            <div xmlns="http://www.w3.org/1999/xhtml" class="fo-wrap">${deskSvg(mood)}</div>
          </foreignObject>
          ${fileStack(d.files)}
          <text class="desk-title" text-anchor="middle" y="42">${d.label}</text>
          <text class="desk-meta" text-anchor="middle" y="62">${moodLabel(mood)} · 文件 ${d.files}</text>
          <text class="desk-hint" text-anchor="middle" y="80">${
            d.files === 0
              ? '桌旁无文件 · 空闲'
              : d.files <= 5
                ? '左侧堆文件 · 忙碌'
                : '右侧也有文件 · 抓狂'
          }</text>
        </g>`
      })
      .join('')}

    <g class="map-legend" transform="translate(70, 560)">
      <circle class="lg open" cx="0" cy="0" r="5"/><text x="12" y="4">开单（接单后消失）</text>
      <circle class="lg dispatch" cx="170" cy="0" r="5"/><text x="182" y="4">派单（数秒后消失）</text>
      <circle class="lg writeback" cx="360" cy="0" r="5"/><text x="372" y="4">结束→服务员→用户</text>
      <text class="sub" x="560" y="4">连线走窗口正交折线，不穿墙</text>
    </g>
  </svg>`
}

function render(): void {
  const fm = frontMood(state.desks)
  const files = state.desks.reduce((s, d) => s + d.files, 0)
  const clock = new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  app.innerHTML = `
    <div class="shell mood-${fm}">
      <header class="topbar">
        <div class="brand">
          <div class="logo-mark">一</div>
          <div>
            <div class="brand-title">星期一 <span>Monday</span></div>
            <div class="brand-sub">财务部区域 · 窗口前台 · 短暂连线 · 文件负载</div>
          </div>
        </div>
        <div class="top-stats">
          <div class="stat"><span class="k">进线</span><span class="v">${state.inboundPerMin}<small>/min</small></span></div>
          <div class="stat"><span class="k">桌上文件</span><span class="v">${files}</span></div>
          <div class="stat mood-pill mood-${fm}"><span class="k">前台</span><span class="v">${moodLabel(fm)}</span></div>
          <div class="stat clock">${clock}</div>
        </div>
      </header>

      <div class="map-wrap">
        <div class="demo-float">
          <span>演示</span>
          <button type="button" data-mode="calm">安静</button>
          <button type="button" data-mode="busy" class="primary">日常忙碌</button>
          <button type="button" data-mode="crazy" class="danger">爆单</button>
          <button type="button" data-spawn>再来一单</button>
        </div>
        ${renderMap()}
      </div>
    </div>
  `

  app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state = applyDemoMode(btn.dataset.mode as 'calm' | 'busy' | 'crazy')
      setupSpawn()
      render()
    })
  })
  app.querySelector<HTMLButtonElement>('[data-spawn]')?.addEventListener('click', () => {
    state = startBusiness(state)
    render()
  })
}

function setupSpawn(): void {
  window.clearInterval(spawnTimer)
  if (state.clockMode === 'calm') return
  const every = state.clockMode === 'crazy' ? 2200 : 4500
  spawnTimer = window.setInterval(() => {
    state = startBusiness(state)
    // don't full remount every spawn if possible — still remount for simplicity
    render()
  }, every)
}

function startTimers(): void {
  window.clearInterval(clockTimer)
  window.clearInterval(simTimer)
  clockTimer = window.setInterval(() => {
    const el = app.querySelector('.clock')
    if (el) {
      el.textContent = new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    }
  }, 1000)

  simTimer = window.setInterval(() => {
    const before = JSON.stringify({
      links: state.links.map((l) => l.id),
      pending: state.pending.map((p) => p.id),
      desks: state.desks,
      speech: state.speech,
    })
    state = tick(state)
    const after = JSON.stringify({
      links: state.links.map((l) => l.id),
      pending: state.pending.map((p) => p.id),
      desks: state.desks,
      speech: state.speech,
    })
    if (before !== after) render()
  }, 200)
}

render()
startTimers()
setupSpawn()
