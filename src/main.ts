import './style.css'
import { createInitialState, bumpDemo, deriveMondayMood, type BoardState, type TicketStatus } from './mock'
import { deskSvg, mondaySvg, moodLabel } from './sprites'

const app = document.querySelector<HTMLDivElement>('#app')!

let state: BoardState = createInitialState()
let clockTimer: number | undefined
let ageTimer: number | undefined

function fmtAge(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

function ticketColumn(status: TicketStatus, title: string): string {
  const items = state.tickets.filter((t) => t.status === status)
  return `
    <section class="ticket-col status-${status}">
      <header>
        <h3>${title}</h3>
        <span class="count">${items.length}</span>
      </header>
      <ul>
        ${items
          .map(
            (t) => `
          <li class="ticket-card" data-id="${t.id}">
            <div class="tid">${t.id}</div>
            <div class="ttitle">${t.title}</div>
            <div class="tmeta">
              <span>${t.assignee ?? '未分配'}</span>
              <span class="tage">${fmtAge(t.ageSec)}</span>
            </div>
          </li>`,
          )
          .join('')}
      </ul>
    </section>`
}

function coverageDots(): string {
  const n = Math.min(24, 4 + state.inboundPerMin)
  return Array.from({ length: n }, (_, i) => {
    const left = 8 + ((i * 37) % 84)
    const top = 12 + ((i * 53) % 70)
    const delay = (i % 7) * 0.25
    return `<span class="signal-dot" style="left:${left}%;top:${top}%;animation-delay:${delay}s"></span>`
  }).join('')
}

function render(): void {
  state = { ...state, mondayMood: deriveMondayMood(state) }
  const pending = state.tickets.filter((t) => t.status !== 'done').length
  const now = new Date()
  const clock = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  app.innerHTML = `
    <div class="shell mood-${state.mondayMood}">
      <header class="topbar">
        <div class="brand">
          <div class="logo-mark" aria-hidden="true">一</div>
          <div>
            <div class="brand-title">星期一 <span>Monday</span></div>
            <div class="brand-sub">Helpdesk 看板原型 · 户型图办公层</div>
          </div>
        </div>
        <div class="top-stats">
          <div class="stat">
            <span class="k">进线</span>
            <span class="v">${state.inboundPerMin}<small>/min</small></span>
          </div>
          <div class="stat">
            <span class="k">在途工单</span>
            <span class="v">${pending}</span>
          </div>
          <div class="stat mood-pill mood-${state.mondayMood}">
            <span class="k">星期一状态</span>
            <span class="v">${moodLabel(state.mondayMood)}</span>
          </div>
          <div class="stat clock">${clock}</div>
        </div>
      </header>

      <main class="layout">
        <section class="floorplan" aria-label="星期一办公层户型图">
          <div class="floor-grid"></div>

          <article class="zone people-zone">
            <header class="zone-head">
              <h2>客户侧</h2>
              <p>对话仍在客户服务器 · 有活再开单</p>
            </header>
            <div class="coverage-map">
              ${coverageDots()}
              <div class="router-node">
                <div class="router-ring"></div>
                <div class="router-core">会话</div>
              </div>
              <div class="people-chip p1">业务</div>
              <div class="people-chip p2">财务</div>
              <div class="people-chip p3">老板</div>
            </div>
            <div class="pipe">
              <span class="packet"></span>
              <span class="packet delay"></span>
              <span class="packet delay2"></span>
              <label>自动开单 → 共享盘附件</label>
            </div>
          </article>

          <article class="zone monday-zone mood-${state.mondayMood}">
            <header class="zone-head">
              <h2>星期一前台</h2>
              <p>调度到最闲工位 · 完成即回写会话</p>
            </header>
            <div class="monday-stage">
              ${mondaySvg(state.mondayMood)}
              <div class="speech ${state.mondayMood}">
                ${
                  state.mondayMood === 'crazy'
                    ? '工单在飞！先派最闲的两位…'
                    : state.mondayMood === 'busy'
                      ? '收到，已派给邮件助手。'
                      : '今天还挺安静，随时待命。'
                }
              </div>
              <div class="aura aura-${state.mondayMood}"></div>
            </div>
          </article>

          <article class="zone office-zone">
            <header class="zone-head">
              <h2>AI 办公室 · 邮件助手</h2>
              <p>同类型工位负载均衡 · 阈值 ${state.crazyThreshold} 进「爆单」</p>
            </header>
            <div class="desks">
              ${state.workstations
                .map(
                  (w, i) => `
                <div class="desk-card mood-${w.mood}">
                  <div class="desk-visual">${deskSvg(w.mood, i)}</div>
                  <div class="desk-info">
                    <div class="desk-name">${w.label}</div>
                    <div class="desk-mood">${moodLabel(w.mood)} · 负载 ${w.load}</div>
                    <div class="desk-task">${w.currentTask ?? '等待派单…'}</div>
                  </div>
                </div>`,
                )
                .join('')}
            </div>
          </article>

          <article class="zone legend-zone">
            <h3>状态动画图例</h3>
            <ul class="legend">
              <li><i class="dot idle"></i>空闲 — 呼吸光 + 轻微晃动</li>
              <li><i class="dot busy"></i>忙碌 — 屏幕滚码 + 心跳光环</li>
              <li><i class="dot crazy"></i>爆单 — 抖动、火花、红橙预警</li>
            </ul>
            <p class="hint">视觉原型 · 无后端。确认观感后再接开单/回写流程。</p>
          </article>
        </section>

        <aside class="side">
          <div class="demo-bar">
            <span>演示情景</span>
            <button type="button" data-mode="calm">安静</button>
            <button type="button" data-mode="busy" class="primary">日常忙碌</button>
            <button type="button" data-mode="crazy" class="danger">爆单</button>
          </div>
          <div class="tickets">
            ${ticketColumn('todo', '待办')}
            ${ticketColumn('processing', '处理中')}
            ${ticketColumn('done', '已完成')}
          </div>
        </aside>
      </main>
    </div>
  `

  app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode as 'calm' | 'busy' | 'crazy'
      state = bumpDemo(state, mode)
      render()
    })
  })
}

function startTimers(): void {
  window.clearInterval(clockTimer)
  window.clearInterval(ageTimer)
  clockTimer = window.setInterval(() => {
    const el = app.querySelector('.clock')
    if (el) {
      el.textContent = new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    }
  }, 1000)
  ageTimer = window.setInterval(() => {
    state = {
      ...state,
      tickets: state.tickets.map((t) =>
        t.status === 'done' ? t : { ...t, ageSec: t.ageSec + 1 },
      ),
    }
    for (const t of state.tickets) {
      if (t.status === 'done') continue
      const node = app.querySelector(`.ticket-card[data-id="${t.id}"] .tage`)
      if (node) node.textContent = fmtAge(t.ageSec)
    }
  }, 1000)
}

render()
startTimers()
