import type { BoardScheme, DeskNode, RegionNode } from './types'
import { ensureDoors, isoFloorPath, isoWallFaces, toIso, wallSegments } from './floorRender'
import { deskPcSvg, frontBadgeSvg, personSvg, robotSvg, svgToDataUrl } from './icons'

/** 图2：等距 3D 墙体预览 */
export function renderIsoPreview(scheme: BoardScheme, host: HTMLElement): void {
  const regions = scheme.nodes.filter((n): n is RegionNode => n.type === 'region')
  const desks = scheme.nodes.filter((n): n is DeskNode => n.type === 'desk')

  const ox = 560
  const oy = 70
  const wallH = 32

  // compute bounds for svg size
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const consider = (x: number, y: number, z = 0) => {
    const p = toIso(x, y, z, ox, oy)
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  for (const r of regions) {
    const { x, y, w, h } = r.rect
    ;[
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ].forEach(([px, py]) => {
      consider(px, py, 0)
      consider(px, py, wallH)
    })
  }
  for (const d of desks) {
    consider(d.x, d.y, 0)
    consider(d.x + 140, d.y + 128, wallH)
  }
  if (!Number.isFinite(minX)) {
    minX = 0
    minY = 0
    maxX = 1200
    maxY = 700
  }
  const pad = 48
  const width = Math.max(1100, maxX - minX + pad * 2)
  const height = Math.max(640, maxY - minY + pad * 2)
  const shiftX = pad - minX
  const shiftY = pad - minY

  const floors = regions
    .map((r, i) => {
      const colors = ['rgba(52,211,153,0.22)', 'rgba(250,204,21,0.18)', 'rgba(56,189,248,0.2)']
      const d = isoFloorPath(r.rect, ox, oy)
      return `<path d="${d}" fill="${colors[i % colors.length]}" stroke="rgba(255,255,255,0.08)" stroke-width="1" transform="translate(${shiftX},${shiftY})"/>`
    })
    .join('')

  // walls sorted roughly back-to-front by iso y
  const wallParts: { y: number; html: string }[] = []
  for (const r of regions) {
    const segs = wallSegments(r.rect, ensureDoors(r))
    for (const s of segs) {
      const { side, top } = isoWallFaces(s, wallH, ox, oy)
      const mid = toIso((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, wallH / 2, ox, oy)
      wallParts.push({
        y: mid.y,
        html: `<g transform="translate(${shiftX},${shiftY})">
          <path d="${side}" fill="rgba(180,190,200,0.28)" stroke="rgba(220,230,240,0.55)" stroke-width="1"/>
          <path d="${top}" fill="rgba(210,220,230,0.45)" stroke="rgba(240,245,250,0.35)" stroke-width="0.8"/>
        </g>`,
      })
    }
  }
  wallParts.sort((a, b) => a.y - b.y)

  const labels = regions
    .map((r) => {
      const c = toIso(r.rect.x + r.rect.w / 2, r.rect.y + 36, 0, ox, oy)
      return `<g transform="translate(${c.x + shiftX},${c.y + shiftY})">
        <rect x="-48" y="-14" width="96" height="28" rx="14" fill="rgba(37,99,235,0.85)"/>
        <text text-anchor="middle" y="5" fill="#fff" font-size="13" font-family="Noto Sans SC,sans-serif">${escapeXml(r.name)}</text>
      </g>`
    })
    .join('')

  const linkHtml = scheme.links
    .map((l) => {
      const a = center(scheme, l.fromId)
      const b = center(scheme, l.toId)
      const pa = toIso(a.x, a.y, 2, ox, oy)
      const pb = toIso(b.x, b.y, 2, ox, oy)
      const mid = toIso((a.x + b.x) / 2, a.y, 2, ox, oy)
      const mid2 = toIso((a.x + b.x) / 2, b.y, 2, ox, oy)
      return `<path transform="translate(${shiftX},${shiftY})" d="M ${pa.x} ${pa.y} L ${mid.x} ${mid.y} L ${mid2.x} ${mid2.y} L ${pb.x} ${pb.y}" fill="none" stroke="${l.color}" stroke-width="${l.width}" stroke-linejoin="miter"/>`
    })
    .join('')

  const deskHtml = desks
    .map((d) => {
      const p = toIso(d.x + 70, d.y + 64, 0, ox, oy)
      const fig =
        d.kind === 'agent'
          ? robotSvg()
          : d.kind === 'human'
            ? personSvg(d.gender ?? 'male')
            : frontBadgeSvg()
      return `<g transform="translate(${p.x + shiftX - 40},${p.y + shiftY - 50})">
        <image href="${svgToDataUrl(deskPcSvg())}" width="80" height="60" />
        <image href="${svgToDataUrl(fig)}" width="36" height="40" x="48" y="-8" />
        <text x="40" y="72" text-anchor="middle" fill="#e2e8f0" font-size="11">${escapeXml(d.name)}</text>
      </g>`
    })
    .join('')

  host.innerHTML = `
    <div class="iso-stage">
      <svg class="iso-svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <rect width="100%" height="100%" fill="#050505"/>
        ${floors}
        ${wallParts.map((w) => w.html).join('')}
        ${linkHtml}
        ${labels}
        ${deskHtml}
      </svg>
      <div class="iso-hint">预览 · 图2 等距立体墙体（设计态为图1 线框）</div>
    </div>
  `
}

function center(scheme: BoardScheme, id: string): { x: number; y: number } {
  const n = scheme.nodes.find((x) => x.id === id)
  if (!n) return { x: 0, y: 0 }
  if (n.type === 'region') return { x: n.rect.x + n.rect.w / 2, y: n.rect.y + n.rect.h / 2 }
  return { x: n.x + 70, y: n.y + 64 }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
