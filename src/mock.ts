/** Ephemeral link + desk-file board model for Monday floor plan */

export type AgentMood = 'idle' | 'busy' | 'crazy'

export type LinkKind = 'open' | 'dispatch' | 'finish-in' | 'writeback'

export interface UserNode {
  id: string
  name: string
}

export interface DeskState {
  id: 'w1' | 'w2'
  label: string
  /** pending file count at this waiter desk */
  files: number
}

export interface Link {
  id: string
  kind: LinkKind
  from: string
  to: string
  label: string
  /** epoch ms when link should vanish */
  until: number
}

export interface BoardState {
  users: UserNode[]
  desks: DeskState[]
  links: Link[]
  /** ticket counter for labels */
  seq: number
  /** human-readable front speech */
  speech: string
  inboundPerMin: number
  clockMode: 'calm' | 'busy' | 'crazy'
}

export function deskMood(files: number): AgentMood {
  if (files <= 0) return 'idle'
  if (files > 5) return 'crazy'
  return 'busy'
}

export function frontMood(desks: DeskState[]): AgentMood {
  const total = desks.reduce((s, d) => s + d.files, 0)
  if (desks.some((d) => d.files > 5) || total >= 8) return 'crazy'
  if (total > 0) return 'busy'
  return 'idle'
}

export function createInitialState(): BoardState {
  return {
    users: [
      { id: 'u1', name: '张三' },
      { id: 'u2', name: '李四' },
      { id: 'u3', name: '王五' },
      { id: 'u4', name: '赵六' },
      { id: 'u5', name: '钱七' },
    ],
    desks: [
      { id: 'w1', label: '服务员 1', files: 0 },
      { id: 'w2', label: '服务员 2', files: 0 },
    ],
    links: [],
    seq: 1040,
    speech: '窗口待命',
    inboundPerMin: 0,
    clockMode: 'calm',
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

function pickLeastBusy(desks: DeskState[]): DeskState {
  return [...desks].sort((a, b) => a.files - b.files || a.id.localeCompare(b.id))[0]
}

export interface PendingAction {
  id: string
  at: number
  type: 'accept' | 'dispatch-end' | 'finish-in' | 'writeback' | 'writeback-end'
  userId: string
  deskId: 'w1' | 'w2'
  ticket: string
}

export interface LiveState extends BoardState {
  pending: PendingAction[]
}

export function createLiveState(): LiveState {
  return { ...createInitialState(), pending: [] }
}

export function startBusiness(state: LiveState, now = Date.now()): LiveState {
  const user = state.users[Math.floor(Math.random() * state.users.length)]
  const desk = pickLeastBusy(state.desks)
  const ticket = `T-${state.seq + 1}`

  const openUntil = now + 1600
  const dispatchEnd = openUntil + 2000
  const workMs = state.clockMode === 'crazy' ? 1800 : state.clockMode === 'busy' ? 3200 : 4500
  const finishInAt = dispatchEnd + workMs
  const writebackAt = finishInAt + 1100
  const writebackEnd = writebackAt + 2200

  const openLink: Link = {
    id: uid('open'),
    kind: 'open',
    from: user.id,
    to: 'front',
    label: `${ticket} 开单`,
    until: openUntil,
  }

  const pending: PendingAction[] = [
    {
      id: uid('p'),
      at: openUntil,
      type: 'accept',
      userId: user.id,
      deskId: desk.id,
      ticket,
    },
    {
      id: uid('p'),
      at: dispatchEnd,
      type: 'dispatch-end',
      userId: user.id,
      deskId: desk.id,
      ticket,
    },
    {
      id: uid('p'),
      at: finishInAt,
      type: 'finish-in',
      userId: user.id,
      deskId: desk.id,
      ticket,
    },
    {
      id: uid('p'),
      at: writebackAt,
      type: 'writeback',
      userId: user.id,
      deskId: desk.id,
      ticket,
    },
    {
      id: uid('p'),
      at: writebackEnd,
      type: 'writeback-end',
      userId: user.id,
      deskId: desk.id,
      ticket,
    },
  ]

  return {
    ...state,
    seq: state.seq + 1,
    speech: '来单了，接单中…',
    links: [...state.links, openLink],
    pending: [...state.pending, ...pending],
  }
}

export function tick(state: LiveState, now = Date.now()): LiveState {
  let next: LiveState = {
    ...state,
    links: state.links.filter((l) => l.until > now),
    pending: [...state.pending],
    desks: state.desks.map((d) => ({ ...d })),
  }

  const due = next.pending.filter((p) => p.at <= now)
  next.pending = next.pending.filter((p) => p.at > now)

  for (const p of due) {
    if (p.type === 'accept') {
      // open line already expires via until; add dispatch line + put file on desk
      next.links = [
        ...next.links.filter((l) => !(l.kind === 'open' && l.label.startsWith(p.ticket))),
        {
          id: uid('dispatch'),
          kind: 'dispatch',
          from: 'front',
          to: p.deskId,
          label: `${p.ticket} 派单`,
          until: now + 2000,
        },
      ]
      next.desks = next.desks.map((d) =>
        d.id === p.deskId ? { ...d, files: d.files + 1 } : d,
      )
      next.speech = `已派给${next.desks.find((d) => d.id === p.deskId)?.label}`
    }

    if (p.type === 'dispatch-end') {
      next.links = next.links.filter(
        (l) => !(l.kind === 'dispatch' && l.label.startsWith(p.ticket)),
      )
      next.speech = '窗口继续接单'
    }

    if (p.type === 'finish-in') {
      // completion signal line toward AI waiter
      next.links = [
        ...next.links,
        {
          id: uid('fin'),
          kind: 'finish-in',
          from: 'front',
          to: p.deskId,
          label: `${p.ticket} 结束`,
          until: now + 1100,
        },
      ]
      next.speech = '收到完成信号'
    }

    if (p.type === 'writeback') {
      next.links = next.links.filter(
        (l) => !(l.kind === 'finish-in' && l.label.startsWith(p.ticket)),
      )
      // remove one file from desk, then line waiter → user
      next.desks = next.desks.map((d) =>
        d.id === p.deskId ? { ...d, files: Math.max(0, d.files - 1) } : d,
      )
      next.links = [
        ...next.links,
        {
          id: uid('wb'),
          kind: 'writeback',
          from: p.deskId,
          to: p.userId,
          label: `${p.ticket} 回写`,
          until: now + 2200,
        },
      ]
      next.speech = '服务员回写用户'
    }

    if (p.type === 'writeback-end') {
      next.links = next.links.filter(
        (l) => !(l.kind === 'writeback' && l.label.startsWith(p.ticket)),
      )
      if (next.links.length === 0 && next.pending.length === 0) {
        next.speech = '窗口待命'
      }
    }
  }

  return next
}

export function applyDemoMode(mode: 'calm' | 'busy' | 'crazy'): LiveState {
  const base = createLiveState()
  base.clockMode = mode
  if (mode === 'calm') {
    base.inboundPerMin = 0
    base.speech = '窗口待命'
    return base
  }
  if (mode === 'busy') {
    base.inboundPerMin = 3
    base.desks = [
      { id: 'w1', label: '服务员 1', files: 2 },
      { id: 'w2', label: '服务员 2', files: 0 },
    ]
    base.speech = '日常接单中'
    return startBusiness(base)
  }
  base.inboundPerMin = 12
  base.desks = [
    { id: 'w1', label: '服务员 1', files: 6 },
    { id: 'w2', label: '服务员 2', files: 7 },
  ]
  base.speech = '爆单！两边都在堆文件'
  let s = startBusiness(base)
  s = startBusiness(s, Date.now() + 50)
  s = startBusiness(s, Date.now() + 100)
  return s
}
