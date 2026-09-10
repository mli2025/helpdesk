import 'easy-floorplan/floorplan-card'
import type { FloorplanCardConfig } from 'easy-floorplan/types'
import { activeFloor, portals, routeViaPortals } from './efpBridge'
import { deskPcSvg, frontBadgeSvg, personSvg, robotSvg, svgToDataUrl } from './icons'

type Pt = { x: number; y: number }

interface LiveLink {
  id: string
  kind: string
  points: Pt[]
  color: string
  width: number
  label: string
  until: number
}

function pathD(points: Pt[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function moodOf(n: number): string {
  if (n <= 0) return '空闲'
  if (n > 5) return '抓狂'
  return '忙碌'
}

/**
 * Preview: real easy-floorplan card + Monday demo overlays (desks + timed links)
 */
export function mountEfpDemoPreview(cfg: FloorplanCardConfig, host: HTMLElement): () => void {
  const floor = activeFloor(cfg)
  const doors = portals(floor.openings ?? [])
  const W = cfg.width || 1200
  const H = cfg.height || 720

  // Demo desks inside AI office / finance — relative to sample layout
  const actors = [
    { id: 'u1', name: '张三', gender: 'male' as const, x: 140, y: 200 },
    { id: 'u2', name: '李四', gender: 'female' as const, x: 240, y: 360 },
    { id: 'u3', name: '王五', gender: 'male' as const, x: 160, y: 500 },
  ]
  const front = { id: 'front', name: '中继前台', x: 560, y: 300 }
  const agents = [
    { id: 'a1', name: '邮件助手-1', x: 880, y: 180 },
    { id: 'a2', name: '邮件助手-2', x: 880, y: 420 },
  ]

  const files: Record<string, number> = { a1: 0, a2: 0 }
  let links: LiveLink[] = []
  let speech = '窗口待命'
  let seq = 1040
  let demoOn = true
  const timers: number[] = []
  let spawnTimer = 0
  let tickTimer = 0

  host.innerHTML = `
    <div class="efp-preview-stage">
      <div class="demo-bar">
        <label><input type="checkbox" data-demo checked /> 定时演示往复</label>
        <button type="button" data-once>再来一单</button>
        <span class="demo-speech" data-speech>${speech}</span>
      </div>
      <div class="efp-card-slot" id="efp-card-slot"></div>
      <svg class="demo-overlay" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        <g data-links></g>
        <g data-nodes></g>
      </svg>
      <div class="plain-hint">户型来自 easy-floorplan · 门口可在设计器里旋转/吸附墙体</div>
    </div>
  `

  const slot = host.querySelector('#efp-card-slot')!
  const card = document.createElement('easy-floorplan-card') as unknown as HTMLElement & {
    hass?: unknown
    setConfig: (c: FloorplanCardConfig) => void
  }
  card.hass = {
    states: {},
    entities: {},
    locale: { language: 'zh-CN' },
    themes: { darkMode: false },
    formatEntityState: (s: { state?: string }) => s?.state ?? '',
  }
  const previewCfg = {
    ...cfg,
    skin: cfg.skin || 'odnetnin',
    background: cfg.background || '#fffdf7',
    height: H,
    width: W,
  }
  card.setConfig(previewCfg)
  slot.appendChild(card)

  const linksG = host.querySelector('[data-links]')!
  const nodesG = host.querySelector('[data-nodes]')!

  function paintNodes(): void {
    const actorHtml = actors
      .map(
        (a) => `<g transform="translate(${a.x},${a.y})">
        <image href="${svgToDataUrl(personSvg(a.gender))}" width="48" height="54"/>
        <text x="24" y="68" text-anchor="middle" fill="#334155" font-size="12" font-weight="600">${a.name}</text>
      </g>`,
      )
      .join('')

    const desk = (x: number, y: number, name: string, kind: string, meta: string, fig: string) =>
      `<g transform="translate(${x},${y})">
        <rect width="140" height="120" rx="10" fill="rgba(255,255,255,0.92)" stroke="${kind}" stroke-width="2"/>
        <text x="8" y="16" fill="#0f172a" font-size="12" font-weight="700">${name}</text>
        <image href="${svgToDataUrl(deskPcSvg())}" x="10" y="22" width="110" height="82"/>
        <image href="${fig}" x="95" y="8" width="40" height="44"/>
        <text x="70" y="112" text-anchor="middle" fill="#64748b" font-size="10">${meta}</text>
      </g>`

    nodesG.innerHTML =
      actorHtml +
      desk(front.x, front.y, front.name, '#0f766e', speech, svgToDataUrl(frontBadgeSvg())) +
      agents
        .map((a) =>
          desk(
            a.x,
            a.y,
            a.name,
            '#d97706',
            `${moodOf(files[a.id] ?? 0)} · 文件 ${files[a.id] ?? 0}`,
            svgToDataUrl(robotSvg()),
          ),
        )
        .join('')
  }

  function paintLinks(): void {
    linksG.innerHTML = links
      .map((l) => {
        const d = pathD(l.points)
        const mid = l.points[Math.floor(l.points.length / 2)] ?? l.points[0]
        return `<g>
          <path d="${d}" fill="none" stroke="${l.color}" stroke-width="${l.width}" stroke-dasharray="8 6" class="flow-${l.kind}"/>
          <circle r="5" fill="${l.color}"><animateMotion dur="1.5s" repeatCount="indefinite" path="${d}"/></circle>
          <g transform="translate(${mid.x},${(mid.y ?? 0) - 12})">
            <rect x="-48" y="-10" width="96" height="20" rx="8" fill="${l.color}"/>
            <text text-anchor="middle" y="4" fill="#fff" font-size="10">${l.label}</text>
          </g>
        </g>`
      })
      .join('')
  }

  function paint(): void {
    paintNodes()
    paintLinks()
    const sp = host.querySelector('[data-speech]')
    if (sp) sp.textContent = speech
  }

  function clearTimers(): void {
    while (timers.length) window.clearTimeout(timers.pop())
  }

  function startCycle(): void {
    const actor = actors[Math.floor(Math.random() * actors.length)]
    const agent = [...agents].sort((a, b) => (files[a.id] ?? 0) - (files[b.id] ?? 0))[0]
    const ticket = `T-${++seq}`
    const from = { x: actor.x + 24, y: actor.y + 28 }
    const frontPt = { x: front.x + 70, y: front.y + 60 }
    const agentPt = { x: agent.x + 70, y: agent.y + 60 }

    links.push({
      id: `o_${ticket}`,
      kind: 'open',
      points: routeViaPortals(from, frontPt, doors),
      color: '#14b8a6',
      width: 3,
      label: `${ticket} 开单`,
      until: Date.now() + 1800,
    })
    speech = `${actor.name} 来单`
    paint()

    timers.push(
      window.setTimeout(() => {
        links = links.filter((l) => l.id !== `o_${ticket}`)
        links.push({
          id: `d_${ticket}`,
          kind: 'dispatch',
          points: routeViaPortals(frontPt, agentPt, doors),
          color: '#f59e0b',
          width: 3.5,
          label: `${ticket} 派单`,
          until: Date.now() + 2000,
        })
        files[agent.id] = (files[agent.id] ?? 0) + 1
        speech = `已派给 ${agent.name}`
        paint()
      }, 1800),
    )

    timers.push(
      window.setTimeout(() => {
        links = links.filter((l) => l.id !== `d_${ticket}`)
        speech = `${agent.name} 处理中…`
        paint()
      }, 3800),
    )

    timers.push(
      window.setTimeout(() => {
        files[agent.id] = Math.max(0, (files[agent.id] ?? 0) - 1)
        links.push({
          id: `w_${ticket}`,
          kind: 'writeback',
          points: routeViaPortals(agentPt, from, doors),
          color: '#818cf8',
          width: 3,
          label: `${ticket} 回写`,
          until: Date.now() + 2200,
        })
        speech = `${agent.name} → ${actor.name}`
        paint()
      }, 5600),
    )

    timers.push(
      window.setTimeout(() => {
        links = links.filter((l) => l.id !== `w_${ticket}`)
        if (!links.length) speech = '窗口待命'
        paint()
      }, 7800),
    )
  }

  function setupSpawn(): void {
    window.clearInterval(spawnTimer)
    if (!demoOn) return
    startCycle()
    spawnTimer = window.setInterval(() => startCycle(), 9000)
  }

  tickTimer = window.setInterval(() => {
    const now = Date.now()
    const n = links.length
    links = links.filter((l) => l.until > now)
    if (links.length !== n) paint()
  }, 200)

  host.querySelector('[data-demo]')?.addEventListener('change', (e) => {
    demoOn = (e.target as HTMLInputElement).checked
    if (!demoOn) {
      window.clearInterval(spawnTimer)
      clearTimers()
      links = []
      speech = '演示已暂停'
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
    card.remove()
  }
}
