/** Demo mock for Monday board visual prototype */

export type AgentMood = 'idle' | 'busy' | 'crazy'

export type TicketStatus = 'todo' | 'processing' | 'done'

export interface Ticket {
  id: string
  title: string
  status: TicketStatus
  assignee?: string
  ageSec: number
}

export interface Workstation {
  id: string
  label: string
  mood: AgentMood
  load: number
  currentTask?: string
}

export interface BoardState {
  mondayMood: AgentMood
  workstations: Workstation[]
  tickets: Ticket[]
  inboundPerMin: number
  crazyThreshold: number
}

export function createInitialState(): BoardState {
  return {
    mondayMood: 'idle',
    inboundPerMin: 2,
    crazyThreshold: 8,
    workstations: [
      {
        id: 'mail-1',
        label: '邮件助手 · 工位 1',
        mood: 'busy',
        load: 2,
        currentTask: '整理客户附件清单',
      },
      {
        id: 'mail-2',
        label: '邮件助手 · 工位 2',
        mood: 'idle',
        load: 0,
      },
    ],
    tickets: [
      { id: 'T-1042', title: '导出上周对账邮件包', status: 'processing', assignee: '工位 1', ageSec: 86 },
      { id: 'T-1041', title: '补发合同 PDF 到共享盘', status: 'todo', ageSec: 210 },
      { id: 'T-1040', title: '按标签归档供应商来信', status: 'todo', ageSec: 420 },
      { id: 'T-1038', title: '生成拜访纪要草稿', status: 'done', assignee: '工位 2', ageSec: 12 },
      { id: 'T-1037', title: '清理重复抄送线程', status: 'done', assignee: '工位 1', ageSec: 55 },
    ],
  }
}

export function deriveMondayMood(state: BoardState): AgentMood {
  const totalLoad = state.workstations.reduce((s, w) => s + w.load, 0)
  const pending = state.tickets.filter((t) => t.status !== 'done').length
  if (pending >= state.crazyThreshold || totalLoad >= state.crazyThreshold) return 'crazy'
  if (totalLoad > 0 || pending > 0) return 'busy'
  return 'idle'
}

export function bumpDemo(state: BoardState, mode: 'calm' | 'busy' | 'crazy'): BoardState {
  if (mode === 'calm') {
    return {
      ...state,
      inboundPerMin: 0,
      mondayMood: 'idle',
      workstations: state.workstations.map((w) => ({
        ...w,
        mood: 'idle' as const,
        load: 0,
        currentTask: undefined,
      })),
      tickets: state.tickets.map((t, i) =>
        i < 2 ? { ...t, status: 'done' as const } : { ...t, status: 'done' as const },
      ),
    }
  }
  if (mode === 'busy') {
    return {
      ...state,
      inboundPerMin: 4,
      mondayMood: 'busy',
      workstations: [
        {
          ...state.workstations[0],
          mood: 'busy',
          load: 2,
          currentTask: '整理客户附件清单',
        },
        {
          ...state.workstations[1],
          mood: 'idle',
          load: 0,
          currentTask: undefined,
        },
      ],
      tickets: [
        { id: 'T-1042', title: '导出上周对账邮件包', status: 'processing', assignee: '工位 1', ageSec: 86 },
        { id: 'T-1041', title: '补发合同 PDF 到共享盘', status: 'todo', ageSec: 210 },
        { id: 'T-1040', title: '按标签归档供应商来信', status: 'todo', ageSec: 420 },
        { id: 'T-1038', title: '生成拜访纪要草稿', status: 'done', assignee: '工位 2', ageSec: 12 },
        { id: 'T-1037', title: '清理重复抄送线程', status: 'done', assignee: '工位 1', ageSec: 55 },
      ],
    }
  }
  return {
    ...state,
    inboundPerMin: 18,
    mondayMood: 'crazy',
    workstations: state.workstations.map((w, i) => ({
      ...w,
      mood: 'crazy' as const,
      load: 6 + i,
      currentTask: i === 0 ? '批量回填 12 封工单…' : '共享盘同步风暴…',
    })),
    tickets: [
      { id: 'T-1055', title: '紧急：老板要全部往来邮件', status: 'todo', ageSec: 40 },
      { id: 'T-1054', title: '批量改密通知群发', status: 'todo', ageSec: 55 },
      { id: 'T-1053', title: '附件超限拆包', status: 'todo', ageSec: 70 },
      { id: 'T-1052', title: '跨盘镜像失败重试', status: 'processing', assignee: '工位 1', ageSec: 120 },
      { id: 'T-1051', title: '客户侧会话结果回写', status: 'processing', assignee: '工位 2', ageSec: 95 },
      { id: 'T-1049', title: '清理重复抄送线程', status: 'done', assignee: '工位 1', ageSec: 20 },
      { id: 'T-1048', title: '生成拜访纪要草稿', status: 'done', assignee: '工位 2', ageSec: 33 },
      { id: 'T-1047', title: '补发合同 PDF', status: 'done', assignee: '工位 1', ageSec: 48 },
      { id: 'T-1046', title: '归档供应商来信', status: 'todo', ageSec: 200 },
      { id: 'T-1045', title: '对账邮件包二次导出', status: 'todo', ageSec: 260 },
    ],
  }
}
