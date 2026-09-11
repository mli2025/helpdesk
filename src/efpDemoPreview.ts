import 'easy-floorplan/floorplan-card'
import type { FloorplanCardConfig } from 'easy-floorplan/types'
import { activeFloor, portals, routeViaPortals } from './efpBridge'
import {
  deskPcSvg,
  fileStackSvg,
  frontBadgeSvg,
  personSvg,
  robotSvg,
  svgToDataUrl,
  ticketPacketSvg,
} from './icons'
import { buildMondayScene, type SceneStation } from './mondayScene'

type Pt = { x: number; y: number }

interface LiveLink {
  id: string
  kind: 'open' | 'dispatch' | 'writeback'
  points: Pt[]
  color: string
  label: string
  until: number
}

function pathD(points: Pt[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function moodOf(n: number): { text: string; color: string } {
  if (n <= 0) return { text: '空闲', color: '#64748b' }
  if (n >= 5) return { text: '爆单', color: '#dc2626' }
  if (n >= 3) return { text: '忙碌', color: '#d97706' }
  return { text: '处理中', color: '#0d9488' }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Live board: easy-floorplan card + people / desks / files / ticket flow animation
 */
export function mountEfpDemoPreview(cfg: FloorplanCardConfig, host: HTMLElement): () => void {
  const floor = activeFloor(cfg)
  const doors = portals(floor.openings ?? [])
  const scene = buildMondayScene()
  const W = cfg.width || scene.width
  const H = cfg.height || scene.height

  const files: Record<string, number> = Object.fromEntries(scene.agents.map((a) => [a.id, 0]))
  const humanBusy: Record<string, boolean> = {}
  let links: LiveLink[] = []
  let speech = '看板待命 · 人在工位 · 文件在流转'
  let seq = 2040
  let demoOn = true
  const timers: number[] = []
  let spawnTimer = 0
  let tickTimer = 0

  host.innerHTML = `
    <div class="efp-preview-stage">
      <div class="demo-bar">
        <label><input type="checkbox" data-demo checked /> 自动演示</label>
        <button type="button" data-once>再来一单</button>
        <span class="demo-speech" data-speech>${speech}</span>
      </div>
      <div class="efp-card-slot" id="efp-card-slot"></div>
      <svg class="demo-overlay" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="deskShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.18"/>
          </filter>
        </defs>
        <g data-links></g>
        <g data-nodes></g>
      </svg>
      <div class="plain-hint">接单台→Desk监视(Agent URL) · 助手→mail/project 线程 · 点「再来一单」看动画</div>
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
  card.setConfig({
    ...cfg,
    skin: cfg.skin || 'odnetnin',
    background: cfg.background || '#faf8f4',
    width: W,
    height: H,
    compactHeader: true,
  })
  slot.appendChild(card)

  const linksG = host.querySelector('[data-links]')!
  const nodesG = host.querySelector('[data-nodes]')!

  function stationChip(st: SceneStation, meta: string, fig: string, fileCount = 0): string {
    const accent = st.color
    const padX = st.role === 'front' ? -8 : -6
    const padY = st.role === 'human' ? -8 : -10
    const boxW = Math.max(78, st.w + 16)
    const boxH = st.role === 'human' ? 78 : 96
    return `<g class="station" transform="translate(${st.x + padX},${st.y + padY})" filter="url(#deskShadow)">
      <rect width="${boxW}" height="${boxH}" rx="10"
        fill="rgba(255,255,255,0.94)" stroke="${accent}" stroke-width="2"/>
      <text x="8" y="14" fill="${accent}" font-size="11" font-weight="700">${escapeXml(st.name)}</text>
      <image href="${svgToDataUrl(deskPcSvg(accent))}" x="6" y="18" width="54" height="40"/>
      <image href="${fig}" x="${boxW - 42}" y="16" width="34" height="40"/>
      <image href="${svgToDataUrl(fileStackSvg(fileCount, accent))}" x="8" y="${boxH - 42}" width="32" height="36"/>
      <text x="${boxW - 8}" y="${boxH - 10}" text-anchor="end" fill="#64748b" font-size="9">${escapeXml(meta)}</text>
      ${
        humanBusy[st.id]
          ? `<circle cx="${boxW - 10}" cy="10" r="5" fill="#f59e0b"><animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite"/></circle>`
          : ''
      }
    </g>`
  }

  function paintNodes(): void {
    const humans = scene.humans
      .map((h) =>
        stationChip(
          h,
          humanBusy[h.id] ? '提单中' : h.dept ?? '',
          svgToDataUrl(personSvg(h.gender ?? 'male')),
          humanBusy[h.id] ? 1 : 0,
        ),
      )
      .join('')

    const front = stationChip(
      scene.front,
      speech.includes('派') || speech.includes('来单') ? '接单中' : '窗口',
      svgToDataUrl(frontBadgeSvg()),
      Object.values(files).reduce((a, b) => a + b, 0) > 0 ? 2 : 0,
    )

    const agents = scene.agents
      .map((a) => {
        const n = files[a.id] ?? 0
        const mood = moodOf(n)
        return stationChip(a, `${mood.text} · ${n}件`, svgToDataUrl(robotSvg(a.color)), n)
      })
      .join('')

    nodesG.innerHTML = humans + front + agents
  }

  function paintLinks(): void {
    linksG.innerHTML = links
      .map((l) => {
        const d = pathD(l.points)
        const mid = l.points[Math.floor(l.points.length / 2)] ?? l.points[0]
        const packet = svgToDataUrl(ticketPacketSvg(l.color))
        return `<g class="flow-line">
          <path d="${d}" fill="none" stroke="${l.color}" stroke-width="3.2" stroke-dasharray="10 7" opacity="0.9" class="flow-${l.kind}"/>
          <image href="${packet}" width="28" height="22" x="-14" y="-11">
            <animateMotion dur="1.6s" repeatCount="indefinite" path="${d}" rotate="auto"/>
          </image>
          <g transform="translate(${mid.x},${(mid?.y ?? 0) - 16})">
            <rect x="-52" y="-11" width="104" height="20" rx="10" fill="${l.color}"/>
            <text text-anchor="middle" y="4" fill="#fff" font-size="10" font-weight="600">${escapeXml(l.label)}</text>
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
    const actor = scene.humans[Math.floor(Math.random() * scene.humans.length)]
    const agent = [...scene.agents].sort((a, b) => (files[a.id] ?? 0) - (files[b.id] ?? 0))[0]
    const ticket = `T-${++seq}`
    const from = { x: actor.cx, y: actor.cy }
    const frontPt = { x: scene.front.cx, y: scene.front.cy }
    const agentPt = { x: agent.cx, y: agent.cy }

    humanBusy[actor.id] = true
    links.push({
      id: `o_${ticket}`,
      kind: 'open',
      points: routeViaPortals(from, frontPt, doors),
      color: '#14b8a6',
      label: `${ticket} 开单`,
      until: Date.now() + 2000,
    })
    speech = `${actor.dept}·${actor.name} 提交需求`
    paint()

    timers.push(
      window.setTimeout(() => {
        links = links.filter((l) => l.id !== `o_${ticket}`)
        links.push({
          id: `d_${ticket}`,
          kind: 'dispatch',
          points: routeViaPortals(frontPt, agentPt, doors),
          color: '#f59e0b',
          label: `${ticket} 派单`,
          until: Date.now() + 2200,
        })
        files[agent.id] = (files[agent.id] ?? 0) + 1
        speech = `接单台 → ${agent.name}`
        paint()
      }, 2000),
    )

    timers.push(
      window.setTimeout(() => {
        links = links.filter((l) => l.id !== `d_${ticket}`)
        speech = `${agent.name} 处理文件中…`
        paint()
      }, 4200),
    )

    timers.push(
      window.setTimeout(() => {
        files[agent.id] = Math.max(0, (files[agent.id] ?? 0) - 1)
        links.push({
          id: `w_${ticket}`,
          kind: 'writeback',
          points: routeViaPortals(agentPt, from, doors),
          color: '#818cf8',
          label: `${ticket} 回写`,
          until: Date.now() + 2400,
        })
        speech = `${agent.name} 完成 → ${actor.name}`
        paint()
      }, 6000),
    )

    timers.push(
      window.setTimeout(() => {
        links = links.filter((l) => l.id !== `w_${ticket}`)
        humanBusy[actor.id] = false
        if (!links.length) speech = '看板待命 · 人在工位 · 文件在流转'
        paint()
      }, 8400),
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
