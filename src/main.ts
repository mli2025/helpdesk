import './style.css'
import {
  createInitialState,
  bumpDemo,
  deriveMondayMood,
  type BoardState,
  type DemandSource,
  type Ticket,
} from './mock'
import { deskSvg, mondaySvg, moodLabel } from './sprites'

const app = document.querySelector<HTMLDivElement>('#app')!

let state: BoardState = createInitialState()
let clockTimer: number | undefined
let ageTimer: number | undefined

/** Floor coordinates in viewBox 0..1200 x 0..720 */
const POS = {
  people: {
    业务: { x: 170, y: 170 },
    财务: { x: 150, y: 320 },
    老板: { x: 280, y: 240 },
  } as Record<DemandSource, { x: number; y: number }>,
  session: { x: 240, y: 250 },
  monday: { x: 580, y: 250 },
  desks: {
    'mail-1': { x: 900, y: 180 },
    'mail-2': { x: 900, y: 380 },
  } as Record<'mail-1' | 'mail-2', { x: number; y: number }>,
  share: { x: 430, y: 520 },
  doneTray: { x: 1050, y: 560 },
}

function fmtAge(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m${s.toString().padStart(2, '0')}s`
}

function pathDemand(from: DemandSource): string {
  const a = POS.people[from]
  const b = POS.monday
  const midX = (a.x + b.x) / 2
  return `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`
}

function pathDispatch(to: 'mail-1' | 'mail-2'): string {
  const a = POS.monday
  const b = POS.desks[to]
  const midX = (a.x + b.x) / 2
  return `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`
}

function pathWriteback(from: 'mail-1' | 'mail-2'): string {
  const a = POS.desks[from]
  const b = POS.session
  return `M ${a.x} ${a.y} C 700 ${a.y + 80}, 420 ${b.y + 120}, ${b.x} ${b.y}`
}

function midPoint(d: string): { x: number; y: number } {
  // rough label anchor from cubic control points in our paths
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
  if (nums.length >= 8) {
    return { x: (nums[0] + nums[nums.length - 2]) / 2, y: (nums[1] + nums[nums.length - 1]) / 2 - 18 }
  }
  return { x: 600, y: 200 }
}

function flowLines(tickets: Ticket[]): string {
  const todo = tickets.filter((t) => t.status === 'todo')
  const processing = tickets.filter((t) => t.status === 'processing')
  const recentDone = tickets.filter((t) => t.status === 'done').slice(0, 2)

  const demandPaths = todo.map((t, i) => {
    const d = pathDemand(t.source)
    const mid = midPoint(d)
    return `
      <path class="flow demand" pathLength="100" style="animation-delay:${i * 0.35}s"
        d="${d}" />
      <circle class="packet demand" r="5">
        <animateMotion dur="${2.4 + i * 0.2}s" repeatCount="indefinite" path="${d}" />
      </circle>
      <g class="chip demand" transform="translate(${mid.x}, ${mid.y})">
        <rect x="-54" y="-14" width="108" height="28" rx="10"/>
        <text text-anchor="middle" y="5">${t.id} 开单</text>
      </g>`
  })

  const procPaths = processing.map((t, i) => {
    if (!t.assignee) return ''
    const d = pathDispatch(t.assignee)
    const mid = midPoint(d)
    return `
      <path class="flow processing" pathLength="100" style="animation-delay:${i * 0.25}s"
        d="${d}" />
      <circle class="packet processing" r="6">
        <animateMotion dur="${1.8 + i * 0.15}s" repeatCount="indefinite" path="${d}" />
      </circle>
      <g class="chip processing" transform="translate(${mid.x}, ${mid.y})">
        <rect x="-70" y="-14" width="140" height="28" rx="10"/>
        <text text-anchor="middle" y="5">${t.id} 处理中 · ${fmtAge(t.ageSec)}</text>
      </g>`
  })

  const doneHints = recentDone.map((t, i) => {
    if (!t.assignee) return ''
    const d = pathWriteback(t.assignee)
    return `
      <path class="flow done" pathLength="100" style="animation-delay:${i * 0.4}s" d="${d}" />
      <circle class="packet done" r="4">
        <animateMotion dur="3.2s" repeatCount="indefinite" path="${d}" />
      </circle>`
  })

  return [...demandPaths, ...procPaths, ...doneHints].join('')
}

function personNode(name: DemandSource, active: boolean): string {
  const p = POS.people[name]
  return `
    <g class="person-node ${active ? 'active' : ''}" transform="translate(${p.x}, ${p.y})">
      <circle class="halo" r="34"/>
      <circle class="body" r="22"/>
      <text text-anchor="middle" y="5">${name}</text>
    </g>`
}

function renderMap(): string {
  const todoSources = new Set(
    state.tickets.filter((t) => t.status === 'todo').map((t) => t.source),
  )
  const w1 = state.workstations[0]
  const w2 = state.workstations[1]
  const speech =
    state.mondayMood === 'crazy'
      ? '工单在飞！派最闲工位'
      : state.mondayMood === 'busy'
        ? '收到，已连线派单'
        : '安静待命'

  return `
  <svg class="floor-svg" viewBox="0 0 1200 720" role="img" aria-label="星期一作业户型图">
    <defs>
      <pattern id="floorTile" width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(148,163,184,.25)" stroke-width="1"/>
      </pattern>
      <marker id="arrowTeal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#0d9488"/>
      </marker>
      <marker id="arrowAmber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706"/>
      </marker>
      <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- whole floor -->
    <rect class="floor-base" x="24" y="24" width="1152" height="672" rx="28" fill="url(#floorTile)"/>
    <rect class="floor-base-fill" x="24" y="24" width="1152" height="672" rx="28"/>

    <!-- room walls: one continuous plan -->
    <g class="walls" fill="none" stroke-linejoin="round">
      <!-- outer wall -->
      <rect x="40" y="40" width="1120" height="640" rx="22"/>

      <!-- vertical divider: 客户 | 星期一+办公室 -->
      <path d="M 390 56 L 390 500"/>
      <!-- door gap on vertical -->
      <path class="door-gap" d="M 390 230 L 390 310"/>

      <!-- horizontal divider: 前台 | 共享盘走廊 / AI办公室 -->
      <path d="M 406 500 L 1144 500"/>
      <path class="door-gap" d="M 560 500 L 650 500"/>

      <!-- AI office inner split between two desks -->
      <path d="M 740 56 L 740 500"/>
      <path class="door-gap" d="M 740 230 L 740 310"/>
    </g>

    <!-- room labels -->
    <g class="room-label">
      <text x="215" y="78">客户侧</text>
      <text class="sub" x="215" y="98">对话在客户服务器 · 有活再开单</text>

      <text x="565" y="78">星期一前台</text>
      <text class="sub" x="565" y="98">调度最闲工位 · 完成回写会话</text>

      <text x="970" y="78">AI 办公室 · 邮件助手</text>
      <text class="sub" x="970" y="98">同类型负载均衡 · 阈值 ${state.crazyThreshold} 爆单</text>

      <text x="215" y="540">共享盘 / 附件走廊</text>
      <text class="sub" x="215" y="560">开单携带附件路径</text>
    </g>

    <!-- soft room fills -->
    <rect class="room-fill client" x="48" y="48" width="334" height="444" rx="16"/>
    <rect class="room-fill front" x="398" y="48" width="334" height="444" rx="16"/>
    <rect class="room-fill office" x="748" y="48" width="396" height="444" rx="16"/>
    <rect class="room-fill corridor" x="48" y="508" width="1096" height="156" rx="16"/>

    <!-- static backbone guides (always faint) -->
    <g class="backbone">
      <path d="M 240 250 L 580 250" />
      <path d="M 580 250 L 900 180" />
      <path d="M 580 250 L 900 380" />
      <path d="M 240 250 L 430 520" />
    </g>

    <!-- live animated demand / processing lines -->
    <g class="flows">
      ${flowLines(state.tickets)}
    </g>

    <!-- session hub -->
    <g class="session-node" transform="translate(${POS.session.x}, ${POS.session.y})">
      <circle class="ring" r="48"/>
      <circle class="core" r="34"/>
      <text text-anchor="middle" y="5">会话</text>
    </g>

    ${personNode('业务', todoSources.has('业务'))}
    ${personNode('财务', todoSources.has('财务'))}
    ${personNode('老板', todoSources.has('老板'))}

    <!-- Monday -->
    <g class="monday-node mood-${state.mondayMood}" transform="translate(${POS.monday.x}, ${POS.monday.y})">
      <circle class="aura" r="70"/>
      <foreignObject x="-55" y="-78" width="110" height="130">
        <div xmlns="http://www.w3.org/1999/xhtml" class="fo-wrap">${mondaySvg(state.mondayMood)}</div>
      </foreignObject>
      <g class="speech">
        <rect x="48" y="-78" width="150" height="44" rx="12"/>
        <text x="123" y="-51" text-anchor="middle">${speech}</text>
      </g>
      <text class="caption" text-anchor="middle" y="78">${moodLabel(state.mondayMood)}</text>
    </g>

    <!-- desks -->
    ${[w1, w2]
      .map((w) => {
        const p = POS.desks[w.id]
        return `
        <g class="desk-node mood-${w.mood}" transform="translate(${p.x}, ${p.y})">
          <rect class="desk-pad" x="-120" y="-78" width="240" height="150" rx="18"/>
          <foreignObject x="-80" y="-78" width="160" height="110">
            <div xmlns="http://www.w3.org/1999/xhtml" class="fo-wrap">${deskSvg(w.mood, w.id === 'mail-1' ? 0 : 1)}</div>
          </foreignObject>
          <text class="desk-title" text-anchor="middle" y="48">${w.label}</text>
          <text class="desk-meta" text-anchor="middle" y="68">${moodLabel(w.mood)} · 负载 ${w.load}</text>
          <text class="desk-task" text-anchor="middle" y="88">${w.currentTask ?? '等待派单…'}</text>
        </g>`
      })
      .join('')}

    <!-- share disk -->
    <g class="share-node" transform="translate(${POS.share.x}, ${POS.share.y})">
      <rect x="-70" y="-36" width="140" height="72" rx="16"/>
      <text text-anchor="middle" y="-4">共享盘</text>
      <text class="sub" text-anchor="middle" y="18">附件落盘</text>
    </g>

    <!-- status trays on corridor as spatial kanban, not side columns -->
    <g class="tray todo" transform="translate(700, 580)">
      <rect x="-90" y="-40" width="180" height="80" rx="14"/>
      <text text-anchor="middle" y="-16">待办 ${state.tickets.filter((t) => t.status === 'todo').length}</text>
      <text class="sub" text-anchor="middle" y="8">${state.tickets
        .filter((t) => t.status === 'todo')
        .slice(0, 2)
        .map((t) => t.id)
        .join(' · ') || '—'}</text>
    </g>
    <g class="tray processing" transform="translate(900, 580)">
      <rect x="-90" y="-40" width="180" height="80" rx="14"/>
      <text text-anchor="middle" y="-16">处理中 ${state.tickets.filter((t) => t.status === 'processing').length}</text>
      <text class="sub" text-anchor="middle" y="8">${state.tickets
        .filter((t) => t.status === 'processing')
        .map((t) => t.id)
        .join(' · ') || '—'}</text>
    </g>
    <g class="tray done" transform="translate(1100, 580)">
      <rect x="-90" y="-40" width="180" height="80" rx="14"/>
      <text text-anchor="middle" y="-16">已完成 ${state.tickets.filter((t) => t.status === 'done').length}</text>
      <text class="sub" text-anchor="middle" y="8">${state.tickets
        .filter((t) => t.status === 'done')
        .slice(0, 2)
        .map((t) => t.id)
        .join(' · ') || '—'}</text>
    </g>

    <!-- legend on floor -->
    <g class="map-legend" transform="translate(70, 620)">
      <circle class="lg demand" cx="0" cy="0" r="5"/><text x="12" y="4">开单连线</text>
      <circle class="lg processing" cx="110" cy="0" r="5"/><text x="122" y="4">处理中连线</text>
      <circle class="lg done" cx="240" cy="0" r="5"/><text x="252" y="4">完成回写</text>
    </g>
  </svg>`
}

function render(): void {
  state = { ...state, mondayMood: deriveMondayMood(state) }
  const pending = state.tickets.filter((t) => t.status !== 'done').length
  const clock = new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  app.innerHTML = `
    <div class="shell mood-${state.mondayMood}">
      <header class="topbar">
        <div class="brand">
          <div class="logo-mark" aria-hidden="true">一</div>
          <div>
            <div class="brand-title">星期一 <span>Monday</span></div>
            <div class="brand-sub">整张作业户型图 · 开单/处理连线动画</div>
          </div>
        </div>
        <div class="top-stats">
          <div class="stat"><span class="k">进线</span><span class="v">${state.inboundPerMin}<small>/min</small></span></div>
          <div class="stat"><span class="k">在途工单</span><span class="v">${pending}</span></div>
          <div class="stat mood-pill mood-${state.mondayMood}"><span class="k">星期一状态</span><span class="v">${moodLabel(state.mondayMood)}</span></div>
          <div class="stat clock">${clock}</div>
        </div>
      </header>

      <div class="map-wrap">
        <div class="demo-float">
          <span>演示</span>
          <button type="button" data-mode="calm">安静</button>
          <button type="button" data-mode="busy" class="primary">日常忙碌</button>
          <button type="button" data-mode="crazy" class="danger">爆单</button>
        </div>
        ${renderMap()}
      </div>
    </div>
  `

  app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state = bumpDemo(state, btn.dataset.mode as 'calm' | 'busy' | 'crazy')
      render()
    })
  })
}

function startTimers(): void {
  window.clearInterval(clockTimer)
  window.clearInterval(ageTimer)
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
  ageTimer = window.setInterval(() => {
    state = {
      ...state,
      tickets: state.tickets.map((t) =>
        t.status === 'done' ? t : { ...t, ageSec: t.ageSec + 1 },
      ),
    }
    // refresh processing chip ages without full remount of SVG animations when possible
    const chips = app.querySelectorAll('.chip.processing text')
    const processing = state.tickets.filter((t) => t.status === 'processing')
    chips.forEach((node, i) => {
      const t = processing[i]
      if (t) node.textContent = `${t.id} 处理中 · ${fmtAge(t.ageSec)}`
    })
  }, 1000)
}

render()
startTimers()
