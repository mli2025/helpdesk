/** Shared geometry for Monday office plan + live board scene */

export const OFFICE = {
  W: 1200,
  H: 720,
  ox: 40,
  oy: 36,
  deptBottom: 340,
  aiTop: 400,
  aiBottom: 680,
  right: 1160,
} as const

export const DEPTS = [
  { id: 'finance', name: '财务部', color: '#dbeafe', ink: '#1e3a8a' },
  { id: 'purchase', name: '采购部', color: '#dcfce7', ink: '#14532d' },
  { id: 'sales', name: '销售部', color: '#ffedd5', ink: '#9a3412' },
  { id: 'prod', name: '生产部', color: '#f3e8ff', ink: '#6b21a8' },
] as const

export const DEPT_PEOPLE: Record<(typeof DEPTS)[number]['id'], string[]> = {
  finance: ['赵会计', '钱出纳', '孙审核'],
  purchase: ['周采购', '吴询价', '郑仓管'],
  sales: ['冯销售', '陈客户', '褚跟单'],
  prod: ['卫生产', '蒋质检', '沈排程'],
}

/** Cursor thread slots — serviceId reserved for mail/project binding (not 7900 brain). */
export const AGENTS = [
  { id: 'agent_mail', name: '邮件线程', serviceId: 'mail' as const, color: '#4f46e5' },
  { id: 'agent_project', name: '项目线程', serviceId: 'project' as const, color: '#0d9488' },
  { id: 'agent_reserve', name: '预留槽位', serviceId: '' as const, color: '#db2777' },
] as const

export type SceneRole = 'human' | 'front' | 'agent'

export interface SceneStation {
  id: string
  role: SceneRole
  name: string
  dept?: string
  /** Desk top-left in plan coords */
  x: number
  y: number
  w: number
  h: number
  /** Anchor for routing / person (center of desk) */
  cx: number
  cy: number
  color: string
  gender?: 'male' | 'female'
}

export function deptWidth(): number {
  return (OFFICE.right - OFFICE.ox) / 4
}

/** Build live-board stations locked to the same desk positions as the floorplan */
export function buildMondayScene(): {
  width: number
  height: number
  humans: SceneStation[]
  front: SceneStation
  agents: SceneStation[]
} {
  const { ox, oy, aiTop, right } = OFFICE
  const deptW = deptWidth()
  const humans: SceneStation[] = []

  DEPTS.forEach((d, i) => {
    const x0 = ox + i * deptW
    const deskW = 68
    const deskH = 32
    const gap = (deptW - 24 - deskW * 3) / 4
    const names = DEPT_PEOPLE[d.id]
    for (let k = 0; k < 3; k++) {
      const dx = x0 + 12 + gap + k * (deskW + gap)
      const dy = oy + 100
      humans.push({
        id: `${d.id}_${k + 1}`,
        role: 'human',
        name: names[k] ?? `${d.name}${k + 1}`,
        dept: d.name,
        x: dx,
        y: dy,
        w: deskW,
        h: deskH + 40,
        cx: dx + deskW / 2,
        cy: dy + deskH / 2,
        color: d.ink,
        gender: k % 2 === 0 ? 'male' : 'female',
      })
    }
  })

  const recvRight = ox + 250
  const front: SceneStation = {
    id: 'recv',
    role: 'front',
    name: '接单台·Desk监视',
    x: ox + 70,
    y: aiTop + 130,
    w: 88,
    h: 110,
    cx: ox + 70 + 44,
    cy: aiTop + 130 + 44,
    color: '#b45309',
    gender: 'female',
  }

  const agentZoneLeft = recvRight + 30
  const agentZoneW = right - agentZoneLeft - 20
  const slotW = agentZoneW / 3
  const agents: SceneStation[] = AGENTS.map((a, i) => {
    const zx = agentZoneLeft + i * slotW
    const deskW = 86
    const deskH = 38
    const dx = zx + (slotW - deskW) / 2
    const dy = aiTop + 130
    return {
      id: a.id,
      role: 'agent' as const,
      name: a.name,
      x: dx,
      y: dy,
      w: deskW,
      h: deskH + 44,
      cx: dx + deskW / 2,
      cy: dy + deskH / 2,
      color: a.color,
    }
  })

  return { width: OFFICE.W, height: OFFICE.H, humans, front, agents }
}
