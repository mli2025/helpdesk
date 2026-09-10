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
  /** 墙体开口（门/窗口）；缺省南墙居中一门 */
  doors?: { edge: 'n' | 's' | 'e' | 'w'; t: number; width: number }[]
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
    rect: { x: 60, y: 60, w: 380, h: 640 },
    fill: 'transparent',
    stroke: '#f8fafc',
    doors: [{ edge: 'e', t: 0.48, width: 64 }],
  }
  const office: RegionNode = {
    id: uid('r'),
    type: 'region',
    name: 'AI 办公室',
    rect: { x: 520, y: 60, w: 760, h: 640 },
    fill: 'transparent',
    stroke: '#f8fafc',
    doors: [{ edge: 'w', t: 0.48, width: 64 }],
  }
  const front: DeskNode = {
    id: uid('d'),
    type: 'desk',
    kind: 'front',
    style: 'desk-pc',
    name: '中继前台',
    x: 540,
    y: 320,
    status: 'idle',
  }
  const a1: DeskNode = {
    id: uid('d'),
    type: 'desk',
    kind: 'agent',
    style: 'desk-pc',
    name: '邮件助手-1',
    x: 880,
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
    x: 880,
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
