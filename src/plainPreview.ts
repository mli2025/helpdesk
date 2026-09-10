import type { BoardScheme, DeskNode, RegionNode } from './types'
import { ensureDoors, wallSegments, type DoorSpec, type Edge } from './floorRender'
import { deskPcSvg, frontBadgeSvg, personSvg, robotSvg, svgToDataUrl } from './icons'

type Pt = { x: number; y: number }

interface LiveLink {
  id: string
  kind: 'open' | 'dispatch' | 'finish' | 'writeback'
  points: Pt[]
  color: string
  width: number
  label: string
  until: number
}

interface DemoState {
  files: Record<string, number>
  links: LiveLink[]
  speech: string
  seq: number
}

function doorPoint(rect: RegionNode['rect'], door: DoorSpec): Pt {
  const { x, y, w, h } = rect
  if (door.edge === 'n') return { x: x + w * door.t, y }
  if (door.edge === 's') return { x: x + w * door.t, y: y + h }
  if (door.edge === 'w') return { x, y: y + h * door.t }
  return { x: x + w, y: y + h * door.t }
}

function deskCenter(d: DeskNode): Pt {
  return { x: d.x + 70, y: d.y + 64 }
}

function simplify(points: Pt[]): Pt[] {
  const out: Pt[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (last && last.x === p.x && last.y === p.y) continue
    if (out.length >= 2) {
      const a = out[out.length - 2]
      const b = last
      if ((a.x === b.x && b.x === p.x) || (a.y === b.y && b.y === p.y)) {
        out[out.length - 1] = p
        continue
      }
    }
    out.push(p)
  }
  return out
}

function pathD(points: Pt[]): string {
  return simplify(points)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
}

/** Route via nearest door openings — orthogonal, no wall punch-through */
function routeViaDoors(
  from: Pt,
  to: Pt,
  regions: RegionNode[],
): Pt[] {
  // Collect door portals
  const portals = regions.flatMap((r) =>
    ensureDoors(r).map((d) => ({ regionId: r.id, p: doorPoint(r.rect, d), edge: d.edge as Edge })),
  )
  if (!portals.length) {
    const midX = (from.x + to.x) / 2
    return [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to]
  }

  // Prefer portals closest to both endpoints (finance↔office gap)
  let best: { a: Pt; b: Pt; score: number } | null = null
  for (const pa of portals) {
    for (const pb of portals) {
      if (pa.regionId === pb.regionId) continue
      const score =
        Math.hypot(from.x - pa.p.x, from.y - pa.p.y) +
        Math.hypot(pa.p.x - pb.p.x, pa.p.y - pb.p.y) +
        Math.hypot(pb.p.x - to.x, pb.p.y - to.y)
      if (!best || score < best.score) best = { a: pa.p, b: pb.p, score }
    }
  }
  // same-room: no portal needed
  const sameRoom = regions.find(
    (r) =>
      from.x >= r.rect.x &&
      from.x <= r.rect.x + r.rect.w &&
      from.y >= r.rect.y &&
      from.y <= r.rect.y + r.rect.h &&
      to.x >= r.rect.x &&
      to.x <= r.rect.x + r.rect.w &&
      to.y >= r.rect.y &&
      to.y <= r.rect.y + r.rect.h,
  )
  if (sameRoom) {
    const midX = (from.x + to.x) / 2
    return simplify([from, { x: midX, y: from.y }, { x: midX, y: to.y }, to])
  }

  if (!best) {
    const midX = (from.x + to.x) / 2
    return [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to]
  }

  // approach door A vertically/horizontally, cross to door B, then to target
  return simplify([
    from,
    { x: from.x, y: best.a.y },
    best.a,
    best.b,
    { x: to.x, y: best.b.y },
    to,
  ])
}

function fileStackHtml(count: number): string {
  const left = Math.min(5, count)
  const right = Math.max(0, count - 5)
  const mk = (n: number, side: 'l' | 'r') =>
    Array.from({ length: n }, (_, i) => {
      const x = side === 'l' ? 8 : 112
      const y = 78 - i * 7
      const fill = side === 'r' ? '#fda4af' : '#fde68a'
      const stroke = side === 'r' ? '#e11d48' : '#d97706'
      return `<rect x="${x}" y="${y}" width="20" height="12" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`
    }).join('')
  return `<g class="files">${mk(left, 'l')}${mk(right, 'r')}</g>`
}

function moodOf(files: number): string {
  if (files <= 0) return '空闲'
  if (files > 5) return '抓狂'
  return '忙碌'
}

export function mountPlainPreview(scheme: BoardScheme, host: HTMLElement): () => void {
  const regions = scheme.nodes.filter((n): n is RegionNode => n.type === 'region')
  const desks = scheme.nodes.filter((n): n is DeskNode => n.type === 'desk')
  const humans = desks.filter((d) => d.kind === 'human')
  const front = desks.find((d) => d.kind === 'front')
  const agents = desks.filter((d) => d.kind === 'agent')

  // virtual people if none placed
  const actors: { id: string; name: string; gender: 'male' | 'female'; x: number; y: number }[] =
    humans.length > 0
      ? humans.map((h) => ({
          id: h.id,
          name: h.name,
          gender: h.gender ?? 'male',
          x: h.x,
          y: h.y,
        }))
      : [
          { id: 'demo_u1', name: '张三', gender: 'male', x: 120, y: 180 },
          { id: 'demo_u2', name: '李四', gender: 'female', x: 220, y: 320 },
          { id: 'demo_u3', name: '王五', gender: 'male', x: 150, y: 480 },
        ]

  const demo: DemoState = {
    files: Object.fromEntries(agents.map((a) => [a.id, 0])),
    links: [],
    speech: '窗口待命',
    seq: 1040,
  }

  let demoOn = true
  let timers: number[] = []
  let tickTimer = 0
  let spawnTimer = 0

  const w = Math.max(scheme.canvas.width, 1200)
  const h = Math.max(scheme.canvas.height, 760)

  host.innerHTML = `
    <div class="plain-stage">
      <div class="demo-bar">
        <label><input type="checkbox" data-demo checked /> 定时演示往复</label>
        <button type="button" data-once>再来一单</button>
        <span class="demo-speech" data-speech>${demo.speech}</span>
      </div>
      <svg class="plain-svg" viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">
        <rect width="100%" height="100%" fill="#141416"/>
        <g data-walls></g>
        <g data-links></g>
        <g data-actors></g>
        <g data-desks></g>
      </svg>
      <div class="iso-hint">平民 2D 预览 · 连线走门洞折线 · 文件堆=负载</div>
    </div>
  `

  const wallsG = host.querySelector('[data-walls]')!
  const linksG = host.querySelector('[data-links]')!
  const actorsG = host.querySelector('[data-actors]')!
  const desksG = host.querySelector('[data-desks]')!

  // static walls
  wallsG.innerHTML = regions
    .map((r) => {
      const segs = wallSegments(r.rect, ensureDoors(r))
      const lines = segs
        .map(
          (s) =>
            `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#f1f5f9" stroke-width="2.5" stroke-linecap="square"/>`,
        )
        .join('')
      return `${lines}<text x="${r.rect.x + 16}" y="${r.rect.y + 28}" fill="#cbd5e1" font-size="16" font-weight="700">${r.name}</text>`
    })
    .join('')

  function paintActors(): void {
    if (humans.length > 0) {
      actorsG.innerHTML = ''
      return
    }
    actorsG.innerHTML = actors
      .map((a) => {
        return `<g transform="translate(${a.x},${a.y})">
          <image href="${svgToDataUrl(personSvg(a.gender))}" width="48" height="54"/>
          <text x="24" y="68" text-anchor="middle" fill="#94a3b8" font-size="11">${a.name}</text>
        </g>`
      })
      .join('')
  }

  function paintDesks(): void {
    desksG.innerHTML = desks
      .map((d) => {
        const files = demo.files[d.id] ?? 0
        const fig =
          d.kind === 'agent'
            ? robotSvg()
            : d.kind === 'front'
              ? frontBadgeSvg()
              : personSvg(d.gender ?? 'male')
        const badge =
          d.kind === 'front'
            ? demo.speech
            : d.kind === 'agent'
              ? `${moodOf(files)} · 文件 ${files}`
              : ''
        return `<g transform="translate(${d.x},${d.y})" class="desk-g kind-${d.kind} ${files > 5 ? 'crazy' : files > 0 ? 'busy' : ''}">
          <rect width="140" height="128" rx="12" fill="#1e222a" stroke="${d.kind === 'front' ? '#14b8a6' : d.kind === 'agent' ? '#f59e0b' : '#38bdf8'}" stroke-width="2"/>
          <text x="10" y="18" fill="#e2e8f0" font-size="12" font-weight="700">${d.name}</text>
          <image href="${svgToDataUrl(deskPcSvg(d.kind === 'front' ? '#14b8a6' : '#64748b'))}" x="10" y="28" width="120" height="90"/>
          <image href="${svgToDataUrl(fig)}" x="${d.kind === 'front' ? 104 : 78}" y="6" width="${d.kind === 'front' ? 28 : 48}" height="${d.kind === 'front' ? 28 : 54}"/>
          ${d.kind === 'agent' ? fileStackHtml(files) : ''}
          <text x="70" y="120" text-anchor="middle" fill="#94a3b8" font-size="10">${badge}</text>
        </g>`
      })
      .join('')
  }

  function paintLinks(): void {
    linksG.innerHTML = demo.links
      .map((l) => {
        const d = pathD(l.points)
        const mid = l.points[Math.floor(l.points.length / 2)] ?? l.points[0]
        return `<g>
          <path d="${d}" fill="none" stroke="${l.color}" stroke-width="${l.width}" stroke-linejoin="miter" stroke-dasharray="8 6" class="flow-${l.kind}"/>
          <circle r="5" fill="${l.color}">
            <animateMotion dur="1.5s" repeatCount="indefinite" path="${d}"/>
          </circle>
          <g transform="translate(${mid.x},${mid.y - 14})">
            <rect x="-50" y="-11" width="100" height="22" rx="8" fill="${l.color}"/>
            <text text-anchor="middle" y="5" fill="#fff" font-size="11">${l.label}</text>
          </g>
        </g>`
      })
      .join('')
  }

  function paint(): void {
    paintActors()
    paintDesks()
    paintLinks()
    const sp = host.querySelector('[data-speech]')
    if (sp) sp.textContent = demo.speech
  }

  function clearTimers(): void {
    timers.forEach((t) => window.clearTimeout(t))
    timers = []
  }

  function startCycle(): void {
    if (!front || !agents.length || !actors.length) return
    const actor = actors[Math.floor(Math.random() * actors.length)]
    const agent = [...agents].sort(
      (a, b) => (demo.files[a.id] ?? 0) - (demo.files[b.id] ?? 0),
    )[0]
    const ticket = `T-${++demo.seq}`
    const now = Date.now()
    const from = { x: actor.x + 24, y: actor.y + 30 }
    const frontPt = deskCenter(front)
    const agentPt = deskCenter(agent)

    // 1) open: user → front via doors
    const openPts = routeViaDoors(from, frontPt, regions)
    demo.links.push({
      id: `open_${ticket}`,
      kind: 'open',
      points: openPts,
      color: '#14b8a6',
      width: 3,
      label: `${ticket} 开单`,
      until: now + 1800,
    })
    demo.speech = `${actor.name} 来单，接单中…`
    paint()

    timers.push(
      window.setTimeout(() => {
        demo.links = demo.links.filter((l) => l.id !== `open_${ticket}`)
        // 2) dispatch front → agent
        const dispatchPts = routeViaDoors(frontPt, agentPt, regions)
        demo.links.push({
          id: `dispatch_${ticket}`,
          kind: 'dispatch',
          points: dispatchPts,
          color: '#f59e0b',
          width: 3.5,
          label: `${ticket} 派单`,
          until: now + 1800 + 2000,
        })
        demo.files[agent.id] = (demo.files[agent.id] ?? 0) + 1
        demo.speech = `已派给 ${agent.name}`
        paint()
      }, 1800),
    )

    timers.push(
      window.setTimeout(() => {
        demo.links = demo.links.filter((l) => l.id !== `dispatch_${ticket}`)
        demo.speech = `${agent.name} 处理中…`
        paint()
      }, 3800),
    )

    timers.push(
      window.setTimeout(() => {
        // 3) finish signal to agent
        demo.links.push({
          id: `finish_${ticket}`,
          kind: 'finish',
          points: routeViaDoors(frontPt, agentPt, regions),
          color: '#f43f5e',
          width: 2.5,
          label: `${ticket} 结束`,
          until: Date.now() + 1200,
        })
        demo.speech = '收到完成'
        paint()
      }, 5200),
    )

    timers.push(
      window.setTimeout(() => {
        demo.links = demo.links.filter((l) => l.id !== `finish_${ticket}`)
        demo.files[agent.id] = Math.max(0, (demo.files[agent.id] ?? 0) - 1)
        // 4) writeback agent → user
        demo.links.push({
          id: `wb_${ticket}`,
          kind: 'writeback',
          points: routeViaDoors(agentPt, from, regions),
          color: '#818cf8',
          width: 3,
          label: `${ticket} 回写`,
          until: Date.now() + 2200,
        })
        demo.speech = `${agent.name} → ${actor.name}`
        paint()
      }, 6400),
    )

    timers.push(
      window.setTimeout(() => {
        demo.links = demo.links.filter((l) => l.id !== `wb_${ticket}`)
        if (!demo.links.length) demo.speech = '窗口待命'
        paint()
      }, 8600),
    )
  }

  function setupSpawn(): void {
    window.clearInterval(spawnTimer)
    if (!demoOn) return
    startCycle()
    spawnTimer = window.setInterval(() => startCycle(), 9500)
  }

  tickTimer = window.setInterval(() => {
    const now = Date.now()
    const before = demo.links.length
    demo.links = demo.links.filter((l) => l.until > now)
    if (demo.links.length !== before) paint()
  }, 200)

  host.querySelector('[data-demo]')?.addEventListener('change', (e) => {
    demoOn = (e.target as HTMLInputElement).checked
    if (!demoOn) {
      window.clearInterval(spawnTimer)
      clearTimers()
      demo.links = []
      demo.speech = '演示已暂停'
      paint()
    } else setupSpawn()
  })
  host.querySelector('[data-once]')?.addEventListener('click', () => startCycle())

  paint()
  setupSpawn()

  return () => {
    window.clearInterval(tickTimer)
    window.clearInterval(spawnTimer)
    clearTimers()
  }
}
