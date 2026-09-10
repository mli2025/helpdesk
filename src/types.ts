/** Board scheme model for Monday helpdesk layout editor */

export type Gender = 'male' | 'female'

export type DeskKind =
  | 'human' // 人员工位
  | 'front' // 中继前台
  | 'agent' // 智能体 / AI 服务员（机器人）

/** 工位样式：先做 desk-pc 一类，后续扩三类 */
export type DeskStyle = 'desk-pc'

export type OfficeStatus = 'idle' | 'busy' | 'crazy' | 'offline'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface RegionNode {
  id: string
  type: 'region'
  name: string
  rect: Rect
  fill: string
  stroke: string
}

export interface DeskNode {
  id: string
  type: 'desk'
  kind: DeskKind
  style: DeskStyle
  name: string
  x: number
  y: number
  /** bind person from skill-admin */
  personId?: string
  gender?: Gender
  /** bind agent from skill-admin */
  agentId?: string
  status: OfficeStatus
}

export interface LinkEdge {
  id: string
  type: 'link'
  fromId: string
  toId: string
  color: string
  width: number
  /** orthogonal via window points optional; editor stores simple ortho */
  route?: 'ortho' | 'straight'
  label?: string
}

export type BoardNode = RegionNode | DeskNode

export interface BoardScheme {
  id: string
  name: string
  version: 1
  updatedAt: string
  canvas: { width: number; height: number }
  nodes: BoardNode[]
  links: LinkEdge[]
}

export function uid(prefix = 'n'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function emptyScheme(name = '未命名看板'): BoardScheme {
  return {
    id: uid('board'),
    name,
    version: 1,
    updatedAt: new Date().toISOString(),
    canvas: { width: 1400, height: 800 },
    nodes: [],
    links: [],
  }
}

export function sampleScheme(): BoardScheme {
  const finance: RegionNode = {
    id: uid('r'),
    type: 'region',
    name: '财务部',
    rect: { x: 40, y: 40, w: 420, h: 700 },
    fill: '#e0f2fe',
    stroke: '#0284c7',
  }
  const office: RegionNode = {
    id: uid('r'),
    type: 'region',
    name: 'AI 办公室',
    rect: { x: 500, y: 40, w: 820, h: 700 },
    fill: '#fef9c3',
    stroke: '#ca8a04',
  }
  const front: DeskNode = {
    id: uid('d'),
    type: 'desk',
    kind: 'front',
    style: 'desk-pc',
    name: '中继前台',
    x: 520,
    y: 320,
    status: 'idle',
  }
  const a1: DeskNode = {
    id: uid('d'),
    type: 'desk',
    kind: 'agent',
    style: 'desk-pc',
    name: '邮件助手-1',
    x: 860,
    y: 180,
    agentId: 'agent_mail_1',
    status: 'idle',
  }
  const a2: DeskNode = {
    id: uid('d'),
    type: 'desk',
    kind: 'agent',
    style: 'desk-pc',
    name: '邮件助手-2',
    x: 860,
    y: 420,
    agentId: 'agent_mail_2',
    status: 'idle',
  }
  return {
    id: uid('board'),
    name: '默认财务中继方案',
    version: 1,
    updatedAt: new Date().toISOString(),
    canvas: { width: 1400, height: 800 },
    nodes: [finance, office, front, a1, a2],
    links: [],
  }
}
