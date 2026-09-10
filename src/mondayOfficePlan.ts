import type { FloorplanCardConfig } from 'easy-floorplan/types'
import { emptyConfig, newPlanConfig } from 'easy-floorplan/types'

type Furn = {
  id: string
  type: 'desk' | 'chair' | 'plant' | 'roundTable'
  x: number
  y: number
  w: number
  h: number
  angle?: number
  color?: string
}

/** 工位：桌 + 椅（椅在桌南侧） */
function workstation(
  prefix: string,
  deskX: number,
  deskY: number,
  opts?: { deskW?: number; deskH?: number; color?: string; angle?: number },
): Furn[] {
  const dw = opts?.deskW ?? 70
  const dh = opts?.deskH ?? 34
  const color = opts?.color
  const angle = opts?.angle ?? 0
  const chair = 26
  return [
    { id: `${prefix}_desk`, type: 'desk', x: deskX, y: deskY, w: dw, h: dh, angle, color },
    {
      id: `${prefix}_chair`,
      type: 'chair',
      x: deskX + (dw - chair) / 2,
      y: deskY + dh + 6,
      w: chair,
      h: chair,
      angle,
      color,
    },
  ]
}

/**
 * 精致示例户型：
 * 上：财务 / 采购 / 销售 / 生产（各部门 3 工位）
 * 下：AI 办公室（最左接单台 + 3 个智能体工位）
 */
export function mondayOfficePlan(): FloorplanCardConfig {
  const W = 1200
  const H = 720
  const ox = 40
  const oy = 36
  const deptBottom = 340
  const aiTop = 400
  const aiBottom = 680
  const right = 1160
  const deptW = (right - ox) / 4
  const depts = [
    { id: 'finance', name: '财务部', color: '#dbeafe', ink: '#1e3a8a' },
    { id: 'purchase', name: '采购部', color: '#dcfce7', ink: '#14532d' },
    { id: 'sales', name: '销售部', color: '#ffedd5', ink: '#9a3412' },
    { id: 'prod', name: '生产部', color: '#f3e8ff', ink: '#6b21a8' },
  ] as const

  const walls: Array<{ id: string; x1: number; y1: number; x2: number; y2: number; thickness: number }> = []
  const openings: Array<Record<string, unknown>> = []
  const areas: Array<Record<string, unknown>> = []
  const texts: Array<Record<string, unknown>> = []
  const furniture: Furn[] = []

  walls.push(
    { id: 'outer_n', x1: ox, y1: oy, x2: right, y2: oy, thickness: 10 },
    { id: 'outer_e', x1: right, y1: oy, x2: right, y2: aiBottom, thickness: 10 },
    { id: 'outer_s', x1: right, y1: aiBottom, x2: ox, y2: aiBottom, thickness: 10 },
    { id: 'outer_w', x1: ox, y1: aiBottom, x2: ox, y2: oy, thickness: 10 },
    { id: 'sep_dept', x1: ox, y1: deptBottom, x2: right, y2: deptBottom, thickness: 8 },
    { id: 'sep_ai', x1: ox, y1: aiTop, x2: right, y2: aiTop, thickness: 8 },
  )

  depts.forEach((d, i) => {
    const x0 = ox + i * deptW
    const x1 = x0 + deptW
    if (i > 0) {
      walls.push({ id: `div_${d.id}`, x1: x0, y1: oy, x2: x0, y2: deptBottom, thickness: 8 })
    }

    const doorX = x0 + deptW / 2
    openings.push({
      id: `door_${d.id}`,
      type: 'door',
      x: doorX,
      y: deptBottom,
      length: 56,
      angle: 0,
      motion: 'swing',
    })
    openings.push({
      id: `win_${d.id}_n`,
      type: 'window',
      x: doorX,
      y: oy,
      length: 80,
      angle: 0,
      motion: 'fixed',
    })

    areas.push({
      id: `area_${d.id}`,
      name: d.name,
      showName: false,
      color: d.color,
      opacity: 0.35,
      points: [
        { x: x0 + 4, y: oy + 4 },
        { x: x1 - 4, y: oy + 4 },
        { x: x1 - 4, y: deptBottom - 4 },
        { x: x0 + 4, y: deptBottom - 4 },
      ],
    })

    texts.push({
      id: `label_${d.id}`,
      x: x0 + 18,
      y: oy + 22,
      text: d.name,
      size: 20,
      color: d.ink,
    })

    const deskW = 68
    const gap = (deptW - 24 - deskW * 3) / 4
    for (let k = 0; k < 3; k++) {
      const dx = x0 + 12 + gap + k * (deskW + gap)
      furniture.push(
        ...workstation(`${d.id}_${k + 1}`, dx, oy + 100, {
          deskW,
          deskH: 32,
          color: '#64748b',
        }),
      )
    }

    furniture.push({
      id: `plant_${d.id}`,
      type: 'plant',
      x: x1 - 48,
      y: oy + 18,
      w: 28,
      h: 28,
      color: '#16a34a',
    })
  })

  openings.push({
    id: 'door_entry',
    type: 'door',
    x: ox,
    y: (deptBottom + aiTop) / 2,
    length: 48,
    angle: 90,
    motion: 'swing',
  })

  texts.push({
    id: 'label_hall',
    x: ox + 16,
    y: deptBottom + 22,
    text: '走廊',
    size: 14,
    color: '#64748b',
  })

  areas.push({
    id: 'area_ai',
    name: 'AI 办公室',
    showName: false,
    color: '#e0e7ff',
    opacity: 0.4,
    points: [
      { x: ox + 4, y: aiTop + 4 },
      { x: right - 4, y: aiTop + 4 },
      { x: right - 4, y: aiBottom - 4 },
      { x: ox + 4, y: aiBottom - 4 },
    ],
  })

  openings.push({
    id: 'door_ai_main',
    type: 'door',
    x: ox + 120,
    y: aiTop,
    length: 64,
    angle: 0,
    motion: 'swing',
  })

  ;[280, 560, 840, 1040].forEach((x, i) => {
    openings.push({
      id: `win_ai_s_${i}`,
      type: 'window',
      x,
      y: aiBottom,
      length: 90,
      angle: 0,
      motion: 'fixed',
    })
  })

  texts.push({
    id: 'label_ai',
    x: ox + 18,
    y: aiTop + 22,
    text: 'AI 办公室',
    size: 22,
    color: '#312e81',
  })

  const recvRight = ox + 250
  walls.push({
    id: 'div_recv',
    x1: recvRight,
    y1: aiTop + 70,
    x2: recvRight,
    y2: aiBottom - 20,
    thickness: 6,
  })
  openings.push({
    id: 'door_recv',
    type: 'door',
    x: recvRight,
    y: aiTop + 120,
    length: 52,
    angle: 90,
    motion: 'swing',
    flipH: true,
  })

  texts.push({
    id: 'label_recv',
    x: ox + 24,
    y: aiTop + 58,
    text: '接单台',
    size: 16,
    color: '#b45309',
  })

  furniture.push(
    {
      id: 'recv_table',
      type: 'roundTable',
      x: ox + 70,
      y: aiTop + 130,
      w: 88,
      h: 88,
      color: '#d97706',
    },
    {
      id: 'recv_chair',
      type: 'chair',
      x: ox + 100,
      y: aiTop + 230,
      w: 28,
      h: 28,
      color: '#b45309',
    },
    {
      id: 'recv_plant',
      type: 'plant',
      x: ox + 28,
      y: aiBottom - 70,
      w: 32,
      h: 32,
      color: '#15803d',
    },
  )

  const agents = [
    { id: 'agent_mail', name: '邮件助手', color: '#4f46e5' },
    { id: 'agent_support', name: '客服助手', color: '#0d9488' },
    { id: 'agent_dev', name: '研发助手', color: '#db2777' },
  ] as const

  const agentZoneLeft = recvRight + 30
  const agentZoneW = right - agentZoneLeft - 20
  const slotW = agentZoneW / 3

  agents.forEach((a, i) => {
    const zx = agentZoneLeft + i * slotW
    if (i > 0) {
      walls.push({
        id: `div_agent_${i}`,
        x1: zx,
        y1: aiTop + 90,
        x2: zx,
        y2: aiBottom - 40,
        thickness: 4,
      })
    }
    texts.push({
      id: `label_${a.id}`,
      x: zx + 16,
      y: aiTop + 58,
      text: a.name,
      size: 15,
      color: a.color,
    })
    const deskW = 86
    furniture.push(
      ...workstation(a.id, zx + (slotW - deskW) / 2, aiTop + 130, {
        deskW,
        deskH: 38,
        color: a.color,
      }),
      {
        id: `${a.id}_plant`,
        type: 'plant',
        x: zx + slotW - 50,
        y: aiTop + 70,
        w: 26,
        h: 26,
        color: '#16a34a',
      },
    )
  })

  return {
    ...emptyConfig('custom:easy-floorplan-card'),
    ...newPlanConfig(),
    title: '星期一 · 办公平面',
    width: W,
    height: H,
    grid: 20,
    // 绝对吸附步长 5（网格 20 的 25%）— 鼠标拖动不再一格跳 20
    snap: 5,
    skin: 'odnetnin',
    background: '#faf8f4',
    compactHeader: true,
    floors: [
      {
        id: 'office',
        name: '办公平面',
        walls,
        openings,
        items: [],
        texts,
        furniture,
        trackers: [],
        areas,
      },
    ],
  } as unknown as FloorplanCardConfig
}
