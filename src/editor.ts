import Konva from 'konva'
import type { BoardScheme, BoardNode, DeskNode, LinkEdge, RegionNode, DeskKind } from './types'
import { uid } from './types'
import { deskPcSvg, personSvg, robotSvg, frontBadgeSvg, svgToDataUrl } from './icons'
import type { CatalogAgent, CatalogPerson } from './catalog'
import { ensureDoors, wallSegments, doorCenter, doorSwingPoints, projectToEdge, rotateDoorEdge } from './floorRender'

export type EditorTool = 'select' | 'region' | 'desk-human' | 'desk-front' | 'desk-agent' | 'link'

export interface EditorCallbacks {
  onChange: (scheme: BoardScheme) => void
  onSelect: (id: string | null) => void
}

export class BoardEditor {
  stage: Konva.Stage
  layerGrid: Konva.Layer
  layerRegion: Konva.Layer
  layerLink: Konva.Layer
  layerDesk: Konva.Layer
  layerUi: Konva.Layer
  scheme: BoardScheme
  tool: EditorTool = 'select'
  selectedId: string | null = null
  linkFromId: string | null = null
  people: CatalogPerson[] = []
  agents: CatalogAgent[] = []
  private cb: EditorCallbacks
  private drawingRegion: Konva.Rect | null = null
  private regionStart: { x: number; y: number } | null = null
  private nodeMap = new Map<string, Konva.Group | Konva.Rect>()

  constructor(container: HTMLDivElement, scheme: BoardScheme, cb: EditorCallbacks) {
    this.scheme = structuredClone(scheme)
    this.cb = cb
    this.stage = new Konva.Stage({
      container,
      width: container.clientWidth,
      height: Math.max(640, container.clientHeight),
      draggable: false,
    })
    this.layerGrid = new Konva.Layer()
    this.layerRegion = new Konva.Layer()
    this.layerLink = new Konva.Layer()
    this.layerDesk = new Konva.Layer()
    this.layerUi = new Konva.Layer()
    this.stage.add(this.layerGrid, this.layerRegion, this.layerLink, this.layerDesk, this.layerUi)
    this.drawGrid()
    this.bindStage()
    this.rebuild()
    window.addEventListener('resize', () => this.fit())
  }

  setCatalog(people: CatalogPerson[], agents: CatalogAgent[]): void {
    this.people = people
    this.agents = agents
  }

  setTool(tool: EditorTool): void {
    this.tool = tool
    this.linkFromId = null
    this.stage.container().style.cursor =
      tool === 'select' ? 'default' : tool === 'link' ? 'crosshair' : 'crosshair'
  }

  getScheme(): BoardScheme {
    return structuredClone(this.scheme)
  }

  loadScheme(scheme: BoardScheme): void {
    this.scheme = structuredClone(scheme)
    this.selectedId = null
    this.rebuild()
    this.cb.onSelect(null)
  }

  select(id: string | null): void {
    this.selectedId = id
    this.highlight()
    this.cb.onSelect(id)
  }

  updateSelected(patch: Record<string, unknown>): void {
    if (!this.selectedId) return
    const node = this.scheme.nodes.find((n) => n.id === this.selectedId)
    if (node) {
      Object.assign(node, patch)
      this.rebuild()
      this.select(this.selectedId)
      this.emit()
      return
    }
    const link = this.scheme.links.find((l) => l.id === this.selectedId)
    if (link) {
      Object.assign(link, patch)
      this.rebuild()
      this.select(this.selectedId)
      this.emit()
    }
  }

  deleteSelected(): void {
    if (!this.selectedId) return
    const id = this.selectedId
    this.scheme.nodes = this.scheme.nodes.filter((n) => n.id !== id)
    this.scheme.links = this.scheme.links.filter(
      (l) => l.id !== id && l.fromId !== id && l.toId !== id,
    )
    this.selectedId = null
    this.rebuild()
    this.cb.onSelect(null)
    this.emit()
  }

  fit(): void {
    const c = this.stage.container()
    this.stage.width(c.clientWidth)
    this.stage.height(Math.max(640, c.clientHeight))
    this.drawGrid()
  }

  destroy(): void {
    this.stage.destroy()
  }

  private emit(): void {
    this.cb.onChange(this.getScheme())
  }

  private drawGrid(): void {
    this.layerGrid.destroyChildren()
    const w = this.stage.width()
    const h = this.stage.height()
    // 图1：深色户型底
    this.layerGrid.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width: w,
        height: h,
        fill: '#141416',
        listening: false,
      }),
    )
    const step = 40
    for (let x = 0; x < w; x += step) {
      this.layerGrid.add(
        new Konva.Line({
          points: [x, 0, x, h],
          stroke: 'rgba(255,255,255,0.04)',
          strokeWidth: 1,
          listening: false,
        }),
      )
    }
    for (let y = 0; y < h; y += step) {
      this.layerGrid.add(
        new Konva.Line({
          points: [0, y, w, y],
          stroke: 'rgba(255,255,255,0.04)',
          strokeWidth: 1,
          listening: false,
        }),
      )
    }
    this.layerGrid.batchDraw()
  }

  private bindStage(): void {
    this.stage.on('mousedown', (e) => {
      if (e.target !== this.stage && e.target.getLayer() !== this.layerGrid) return
      if (this.tool === 'region') {
        const pos = this.stage.getPointerPosition()
        if (!pos) return
        this.regionStart = pos
        this.drawingRegion = new Konva.Rect({
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          fill: 'rgba(59,130,246,0.08)',
          stroke: '#3b82f6',
          strokeWidth: 2,
          dash: [6, 4],
        })
        this.layerUi.add(this.drawingRegion)
      } else if (this.tool === 'select') {
        this.select(null)
      }
    })

    this.stage.on('mousemove', () => {
      if (!this.drawingRegion || !this.regionStart) return
      const pos = this.stage.getPointerPosition()
      if (!pos) return
      const x = Math.min(this.regionStart.x, pos.x)
      const y = Math.min(this.regionStart.y, pos.y)
      const w = Math.abs(pos.x - this.regionStart.x)
      const h = Math.abs(pos.y - this.regionStart.y)
      this.drawingRegion.setAttrs({ x, y, width: w, height: h })
      this.layerUi.batchDraw()
    })

    this.stage.on('mouseup', () => {
      if (this.drawingRegion && this.regionStart) {
        const r = this.drawingRegion
        const w = Math.max(40, r.width())
        const h = Math.max(40, r.height())
        if (w > 20 && h > 20) {
          const region: RegionNode = {
            id: uid('r'),
            type: 'region',
            name: '未命名区域',
            rect: { x: r.x(), y: r.y(), w, h },
            fill: 'transparent',
            stroke: '#f8fafc',
            doors: [{ edge: 's', t: 0.5, width: 56 }],
          }
          this.scheme.nodes.push(region)
          this.emit()
          this.rebuild()
          this.select(region.id)
        }
        r.destroy()
        this.drawingRegion = null
        this.regionStart = null
        this.setTool('select')
        return
      }
    })

    this.stage.on('dblclick dbltap', (e) => {
      const id = e.target.getParent()?.id() || e.target.id()
      // handled on nodes
      void id
    })

    this.stage.on('click tap', (e) => {
      if (this.tool !== 'desk-human' && this.tool !== 'desk-front' && this.tool !== 'desk-agent')
        return
      if (e.target !== this.stage && e.target.getLayer() !== this.layerGrid && e.target.getLayer() !== this.layerRegion)
        return
      const pos = this.stage.getPointerPosition()
      if (!pos) return
      this.placeDesk(this.tool, pos.x, pos.y)
    })
  }

  private placeDesk(tool: EditorTool, x: number, y: number): void {
    const kind: DeskKind =
      tool === 'desk-front' ? 'front' : tool === 'desk-agent' ? 'agent' : 'human'
    const desk: DeskNode = {
      id: uid('d'),
      type: 'desk',
      kind,
      style: 'desk-pc',
      name:
        kind === 'front' ? '接单台·Desk监视' : kind === 'agent' ? 'Cursor线程工位' : '人员工位',
      x: x - 60,
      y: y - 45,
      gender: kind === 'human' ? 'male' : undefined,
      status: 'idle',
    }
    this.scheme.nodes.push(desk)
    this.emit()
    this.rebuild()
    this.select(desk.id)
    this.setTool('select')
  }

  rebuild(): void {
    this.layerRegion.destroyChildren()
    this.layerLink.destroyChildren()
    this.layerDesk.destroyChildren()
    this.nodeMap.clear()

    for (const n of this.scheme.nodes) {
      if (n.type === 'region') this.renderRegion(n)
    }
    for (const l of this.scheme.links) this.renderLink(l)
    for (const n of this.scheme.nodes) {
      if (n.type === 'desk') this.renderDesk(n)
    }
    this.highlight()
    this.layerRegion.batchDraw()
    this.layerLink.batchDraw()
    this.layerDesk.batchDraw()
  }

  private renderRegion(n: RegionNode): void {
    const g = new Konva.Group({ id: n.id, draggable: true })
    // hit area (invisible fill for select/drag)
    const hit = new Konva.Rect({
      x: n.rect.x,
      y: n.rect.y,
      width: n.rect.w,
      height: n.rect.h,
      fill: 'rgba(255,255,255,0.03)',
      name: 'body',
    })
    g.add(hit)

    if (!n.doors?.length) n.doors = ensureDoors(n)

    // 白线墙体 + 门洞缺口
    const doors = ensureDoors(n)
    const segs = wallSegments(n.rect, doors)
    for (const s of segs) {
      g.add(
        new Konva.Line({
          points: [s.x1, s.y1, s.x2, s.y2],
          stroke: '#f1f5f9',
          strokeWidth: this.selectedId === n.id ? 3.5 : 2.25,
          lineCap: 'square',
          listening: false,
        }),
      )
    }

    // 门口可视件：摆动弧 + 可拖把手（参考 Khaaka / easy-floorplan）
    doors.forEach((door, doorIdx) => {
      const c = doorCenter(n.rect, door)
      const swing = doorSwingPoints(n.rect, door)
      const flat = swing.flatMap((p) => [p.x, p.y])
      g.add(
        new Konva.Line({
          points: flat,
          stroke: '#60a5fa',
          strokeWidth: 1.5,
          dash: [4, 3],
          listening: false,
        }),
      )
      const knob = new Konva.Circle({
        x: c.x,
        y: c.y,
        radius: 9,
        fill: '#3b82f6',
        stroke: '#93c5fd',
        strokeWidth: 2,
        name: 'door-knob',
        draggable: true,
        dragBoundFunc: (pos) => {
          // keep on current wall while dragging
          const t = projectToEdge(n.rect, door.edge, pos)
          const p = doorCenter(n.rect, { ...door, t })
          return p
        },
      })
      const tag = new Konva.Text({
        x: c.x + 10,
        y: c.y - 8,
        text: '门',
        fontSize: 11,
        fill: '#93c5fd',
        listening: false,
      })
      knob.on('dragmove', () => {
        const t = projectToEdge(n.rect, door.edge, { x: knob.x(), y: knob.y() })
        door.t = t
        n.doors = doors.map((d, i) => (i === doorIdx ? { ...d, t } : d))
        tag.position({ x: knob.x() + 10, y: knob.y() - 8 })
      })
      knob.on('dragend', () => {
        this.rebuild()
        this.emit()
        this.select(n.id)
      })
      knob.on('dblclick dbltap', (e) => {
        e.cancelBubble = true
        // 双击门口 = 旋转 90°
        const next = rotateDoorEdge(door.edge, 1)
        n.doors = doors.map((d, i) => (i === doorIdx ? { ...d, edge: next, t: 0.5 } : d))
        this.rebuild()
        this.emit()
        this.select(n.id)
      })
      knob.on('click tap', (e) => {
        e.cancelBubble = true
        this.select(n.id)
      })
      g.add(knob, tag)
    })

    const label = new Konva.Text({
      x: n.rect.x + 16,
      y: n.rect.y + 16,
      text: n.name,
      fontSize: 18,
      fontFamily: 'Noto Sans SC, DM Sans, sans-serif',
      fill: '#e2e8f0',
      listening: false,
    })
    const handle = new Konva.Rect({
      x: n.rect.x + n.rect.w - 14,
      y: n.rect.y + n.rect.h - 14,
      width: 14,
      height: 14,
      fill: '#3b82f6',
      cornerRadius: 2,
      name: 'resize',
      draggable: true,
    })
    g.add(label, handle)
    this.layerRegion.add(g)
    this.nodeMap.set(n.id, g)

    g.on('click tap', (e) => {
      e.cancelBubble = true
      if (this.tool === 'link') {
        this.handleLinkClick(n.id)
        return
      }
      if (this.tool === 'desk-human' || this.tool === 'desk-front' || this.tool === 'desk-agent') {
        const pos = this.stage.getPointerPosition()
        if (pos) this.placeDesk(this.tool, pos.x, pos.y)
        return
      }
      this.select(n.id)
    })

    let dragging = false
    g.on('dragstart', () => {
      dragging = true
    })
    g.on('dragend', () => {
      if (!dragging) return
      dragging = false
      const dx = g.x()
      const dy = g.y()
      n.rect.x += dx
      n.rect.y += dy
      g.position({ x: 0, y: 0 })
      this.rebuild()
      this.emit()
    })

    handle.on('dragmove', () => {
      const nx = handle.x()
      const ny = handle.y()
      n.rect.w = Math.max(80, nx - n.rect.x + 14)
      n.rect.h = Math.max(80, ny - n.rect.y + 14)
      hit.width(n.rect.w)
      hit.height(n.rect.h)
      handle.position({ x: n.rect.x + n.rect.w - 14, y: n.rect.y + n.rect.h - 14 })
      this.layerRegion.batchDraw()
    })
    handle.on('dragend', () => {
      this.rebuild()
      this.emit()
    })
  }

  /** 选中区域的门口旋转 90° */
  rotateSelectedDoor(): void {
    if (!this.selectedId) return
    const node = this.scheme.nodes.find((n) => n.id === this.selectedId)
    if (!node || node.type !== 'region') return
    const doors = ensureDoors(node)
    if (!doors.length) return
    doors[0] = { ...doors[0], edge: rotateDoorEdge(doors[0].edge, 1), t: 0.5 }
    node.doors = doors
    this.rebuild()
    this.emit()
    this.select(node.id)
  }

  addDoorToSelected(): void {
    if (!this.selectedId) return
    const node = this.scheme.nodes.find((n) => n.id === this.selectedId)
    if (!node || node.type !== 'region') return
    const doors = ensureDoors(node)
    const used = new Set(doors.map((d) => d.edge))
    const next = (['n', 'e', 's', 'w'] as const).find((e) => !used.has(e)) ?? 's'
    doors.push({ edge: next, t: 0.5, width: 56 })
    node.doors = doors
    this.rebuild()
    this.emit()
    this.select(node.id)
  }

  private renderDesk(n: DeskNode): void {
    const g = new Konva.Group({
      id: n.id,
      x: n.x,
      y: n.y,
      draggable: true,
    })
    const card = new Konva.Rect({
      width: 140,
      height: 128,
      fill: '#fff',
      stroke: this.kindColor(n.kind),
      strokeWidth: 2,
      cornerRadius: 14,
      shadowColor: 'rgba(15,23,42,0.15)',
      shadowBlur: 10,
      shadowOffsetY: 4,
    })
    g.add(card)

    const deskImg = new Image()
    deskImg.onload = () => {
      const kimg = new Konva.Image({
        image: deskImg,
        x: 10,
        y: 28,
        width: 120,
        height: 90,
        listening: false,
      })
      g.add(kimg)
      this.layerDesk.batchDraw()
    }
    deskImg.src = svgToDataUrl(deskPcSvg(this.kindColor(n.kind)))

    if (n.kind === 'human') {
      const p = new Image()
      p.onload = () => {
        g.add(
          new Konva.Image({
            image: p,
            x: 78,
            y: 8,
            width: 48,
            height: 54,
            listening: false,
          }),
        )
        this.layerDesk.batchDraw()
      }
      p.src = svgToDataUrl(personSvg(n.gender ?? 'male'))
    } else if (n.kind === 'agent') {
      const r = new Image()
      r.onload = () => {
        g.add(
          new Konva.Image({
            image: r,
            x: 74,
            y: 2,
            width: 54,
            height: 63,
            listening: false,
          }),
        )
        this.layerDesk.batchDraw()
      }
      r.src = svgToDataUrl(robotSvg())
    } else if (n.kind === 'front') {
      const b = new Image()
      b.onload = () => {
        g.add(
          new Konva.Image({
            image: b,
            x: 104,
            y: 8,
            width: 28,
            height: 28,
            listening: false,
          }),
        )
        this.layerDesk.batchDraw()
      }
      b.src = svgToDataUrl(frontBadgeSvg())
    }

    const title = new Konva.Text({
      x: 10,
      y: 8,
      width: 90,
      text: n.name,
      fontSize: 12,
      fontStyle: 'bold',
      fill: '#0f172a',
      listening: false,
    })
    const sub = new Konva.Text({
      x: 10,
      y: 110,
      width: 120,
      text: this.deskSub(n),
      fontSize: 10,
      fill: '#64748b',
      listening: false,
    })
    g.add(title, sub)
    this.layerDesk.add(g)
    this.nodeMap.set(n.id, g)

    g.on('click tap', (e) => {
      e.cancelBubble = true
      if (this.tool === 'link') {
        this.handleLinkClick(n.id)
        return
      }
      this.select(n.id)
    })
    g.on('dragend', () => {
      n.x = g.x()
      n.y = g.y()
      this.rebuild()
      this.emit()
    })
    g.on('dragmove', () => {
      n.x = g.x()
      n.y = g.y()
      this.redrawLinksOnly()
    })
  }

  private deskSub(n: DeskNode): string {
    if (n.kind === 'human') {
      const person = this.people.find((p) => p.id === n.personId)
      return person ? `${person.name} · ${n.gender === 'female' ? '女' : '男'}` : '未绑定人员'
    }
    if (n.kind === 'agent') {
      const ag = this.agents.find((a) => a.id === n.agentId)
      const sid = n.serviceId || ag?.serviceId
      if (ag && sid) return `${ag.name} · ${sid}`
      return ag ? ag.name : '未绑定 Cursor 线程'
    }
    return n.agentUrl ? `Desk监视 · ${n.agentUrl}` : 'Desk监视 · 配置 Agent URL'
  }

  private kindColor(kind: DeskKind): string {
    if (kind === 'front') return '#0f766e'
    if (kind === 'agent') return '#d97706'
    return '#0284c7'
  }

  private centerOf(id: string): { x: number; y: number } {
    const n = this.scheme.nodes.find((x) => x.id === id)
    if (!n) return { x: 0, y: 0 }
    if (n.type === 'region') {
      return { x: n.rect.x + n.rect.w / 2, y: n.rect.y + n.rect.h / 2 }
    }
    return { x: n.x + 70, y: n.y + 64 }
  }

  private orthoPoints(a: { x: number; y: number }, b: { x: number; y: number }): number[] {
    const midX = (a.x + b.x) / 2
    return [a.x, a.y, midX, a.y, midX, b.y, b.x, b.y]
  }

  private renderLink(l: LinkEdge): void {
    const a = this.centerOf(l.fromId)
    const b = this.centerOf(l.toId)
    const points = l.route === 'straight' ? [a.x, a.y, b.x, b.y] : this.orthoPoints(a, b)
    const line = new Konva.Arrow({
      id: l.id,
      points,
      stroke: l.color,
      fill: l.color,
      strokeWidth: l.width,
      pointerLength: 10,
      pointerWidth: 10,
      hitStrokeWidth: 16,
      lineJoin: 'miter',
      lineCap: 'square',
    })
    line.on('click tap', (e) => {
      e.cancelBubble = true
      this.select(l.id)
    })
    this.layerLink.add(line)
    if (l.label) {
      this.layerLink.add(
        new Konva.Text({
          x: (a.x + b.x) / 2 - 30,
          y: (a.y + b.y) / 2 - 18,
          text: l.label,
          fontSize: 11,
          fill: l.color,
          listening: false,
        }),
      )
    }
  }

  private redrawLinksOnly(): void {
    this.layerLink.destroyChildren()
    for (const l of this.scheme.links) this.renderLink(l)
    this.layerLink.batchDraw()
  }

  private handleLinkClick(id: string): void {
    if (!this.linkFromId) {
      this.linkFromId = id
      return
    }
    if (this.linkFromId === id) {
      this.linkFromId = null
      return
    }
    const link: LinkEdge = {
      id: uid('l'),
      type: 'link',
      fromId: this.linkFromId,
      toId: id,
      color: '#0d9488',
      width: 3,
      route: 'ortho',
    }
    this.scheme.links.push(link)
    this.linkFromId = null
    this.emit()
    this.rebuild()
    this.select(link.id)
    this.setTool('select')
  }

  private highlight(): void {
    for (const [, node] of this.nodeMap) {
      if (node instanceof Konva.Group) {
        const body = node.findOne('.body') as Konva.Rect | undefined
        const card = node.findOne('Rect') as Konva.Rect | undefined
        if (body) body.strokeWidth(node.id() === this.selectedId ? 4 : 2)
        if (card && !body) card.strokeWidth(node.id() === this.selectedId ? 4 : 2)
      }
    }
    this.layerLink.find('Arrow').forEach((arrow) => {
      const a = arrow as Konva.Arrow
      a.opacity(a.id() === this.selectedId ? 1 : 0.85)
      a.shadowEnabled(a.id() === this.selectedId)
      a.shadowColor('#f59e0b')
      a.shadowBlur(a.id() === this.selectedId ? 8 : 0)
    })
    this.layerRegion.batchDraw()
    this.layerDesk.batchDraw()
    this.layerLink.batchDraw()
  }

  findNode(id: string): BoardNode | LinkEdge | null {
    return (
      this.scheme.nodes.find((n) => n.id === id) ||
      this.scheme.links.find((l) => l.id === id) ||
      null
    )
  }
}
