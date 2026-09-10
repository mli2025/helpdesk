import './style.css'
import { BoardEditor, type EditorTool } from './editor'
import { fetchAgents, fetchPeople, getSkillAdminConfig, setSkillAdminConfig } from './catalog'
import {
  createNewScheme,
  deleteScheme,
  ensureDefaultScheme,
  exportSchemeJson,
  getScheme,
  importSchemeJson,
  listSchemes,
  saveScheme,
  setActiveSchemeId,
} from './storage'
import type { BoardScheme, DeskNode, LinkEdge, RegionNode } from './types'
import { renderIsoPreview } from './isoPreview'

const app = document.querySelector<HTMLDivElement>('#app')!

let mode: 'edit' | 'view' = 'edit'
let scheme: BoardScheme = ensureDefaultScheme()
let editor: BoardEditor | null = null
let selectedId: string | null = null
let people = await fetchPeople()
let agents = await fetchAgents()

function toolBtn(tool: EditorTool, label: string, active: EditorTool): string {
  return `<button type="button" class="tool ${active === tool ? 'on' : ''}" data-tool="${tool}">${label}</button>`
}

function renderInspector(): string {
  if (!selectedId || !editor) {
    return `<div class="empty-insp">选中画布上的区域 / 工位 / 连线后，在此编辑属性</div>`
  }
  const item = editor.findNode(selectedId)
  if (!item) return `<div class="empty-insp">无选中项</div>`

  if (item.type === 'region') {
    const n = item as RegionNode
    const door = n.doors?.[0] ?? { edge: 's', t: 0.5, width: 56 }
    return `
      <h3>区域（图1 线框墙）</h3>
      <label>名称<input data-f="name" value="${escapeAttr(n.name)}" /></label>
      <label>门洞方向
        <select data-door-edge>
          <option value="n" ${door.edge === 'n' ? 'selected' : ''}>北墙</option>
          <option value="s" ${door.edge === 's' ? 'selected' : ''}>南墙</option>
          <option value="e" ${door.edge === 'e' ? 'selected' : ''}>东墙</option>
          <option value="w" ${door.edge === 'w' ? 'selected' : ''}>西墙</option>
        </select>
      </label>
      <label>门洞宽度<input data-door-w type="range" min="36" max="120" value="${door.width}" /></label>
      <p class="hint">设计态白线墙体+缺口；预览态渲染为图2立体墙。</p>
      <button type="button" class="danger" data-del>删除区域</button>`
  }

  if (item.type === 'desk') {
    const n = item as DeskNode
    const kindLabel =
      n.kind === 'front' ? '中继前台' : n.kind === 'agent' ? '智能体工位' : '人员工位'
    const bind =
      n.kind === 'human'
        ? `<label>绑定人员（skill-admin）
            <select data-f="personId">
              <option value="">未绑定</option>
              ${people
                .map(
                  (p) =>
                    `<option value="${p.id}" ${n.personId === p.id ? 'selected' : ''}>${p.name} · ${p.gender === 'female' ? '女' : '男'}${p.dept ? ' · ' + p.dept : ''}</option>`,
                )
                .join('')}
            </select>
          </label>
          <label>性别
            <select data-f="gender">
              <option value="male" ${n.gender === 'male' ? 'selected' : ''}>男</option>
              <option value="female" ${n.gender === 'female' ? 'selected' : ''}>女</option>
            </select>
          </label>`
        : n.kind === 'agent'
          ? `<label>绑定智能体（skill-admin）
              <select data-f="agentId">
                <option value="">未绑定</option>
                ${agents
                  .map(
                    (a) =>
                      `<option value="${a.id}" ${n.agentId === a.id ? 'selected' : ''}>${a.name} · ${a.skill}</option>`,
                  )
                  .join('')}
              </select>
            </label>`
          : `<p class="hint">前台也是办公桌样式，放在 AI 办公室窗口位置即可。</p>`

    return `
      <h3>${kindLabel}</h3>
      <label>显示名<input data-f="name" value="${escapeAttr(n.name)}" /></label>
      <label>工位样式
        <select data-f="style" disabled>
          <option value="desk-pc">办公桌+电脑（一类）</option>
        </select>
      </label>
      <label>办公状态
        <select data-f="status">
          <option value="idle" ${n.status === 'idle' ? 'selected' : ''}>空闲</option>
          <option value="busy" ${n.status === 'busy' ? 'selected' : ''}>忙碌</option>
          <option value="crazy" ${n.status === 'crazy' ? 'selected' : ''}>抓狂</option>
          <option value="offline" ${n.status === 'offline' ? 'selected' : ''}>离线</option>
        </select>
      </label>
      ${bind}
      <button type="button" class="danger" data-del>删除工位</button>`
  }

  const l = item as LinkEdge
  return `
    <h3>连线</h3>
    <label>颜色<input data-f="color" type="color" value="${toHex(l.color)}" /></label>
    <label>粗细<input data-f="width" type="range" min="1" max="12" value="${l.width}" /></label>
    <div class="hint">当前粗细：${l.width}px</div>
    <label>走线
      <select data-f="route">
        <option value="ortho" ${l.route !== 'straight' ? 'selected' : ''}>正交折线</option>
        <option value="straight" ${l.route === 'straight' ? 'selected' : ''}>直线</option>
      </select>
    </label>
    <label>标签<input data-f="label" value="${escapeAttr(l.label ?? '')}" /></label>
    <button type="button" class="danger" data-del>删除连线</button>`
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function toHex(c: string): string {
  if (c.startsWith('#') && c.length === 7) return c
  const map: Record<string, string> = {
    '#e0f2fe': '#e0f2fe',
    '#fef9c3': '#fef9c3',
  }
  return map[c] ?? (c.startsWith('#') ? c : '#38bdf8')
}

function schemeOptions(): string {
  return listSchemes()
    .map(
      (s) =>
        `<option value="${s.id}" ${s.id === scheme.id ? 'selected' : ''}>${s.name}</option>`,
    )
    .join('')
}

function renderEditShell(): void {
  app.innerHTML = `
    <div class="app-shell">
      <header class="bar">
        <div class="brand">
          <div class="logo">一</div>
          <div>
            <div class="title">星期一 · 看板绘图</div>
            <div class="sub">设计态图1线框 · 预览态图2立体墙</div>
          </div>
        </div>
        <div class="bar-actions">
          <input class="name-input" data-board-name value="${escapeAttr(scheme.name)}" />
          <select data-scheme-list>${schemeOptions()}</select>
          <button type="button" data-act="new">新建</button>
          <button type="button" class="primary" data-act="save">保存方案</button>
          <button type="button" data-act="export">导出 JSON</button>
          <button type="button" data-act="import">导入</button>
          <button type="button" data-act="delete">删除方案</button>
          <button type="button" class="accent" data-act="view">显示看板</button>
        </div>
      </header>
      <div class="workspace">
        <aside class="palette">
          <h3>工具</h3>
          ${toolBtn('select', '选择 / 拖拽', 'select')}
          ${toolBtn('region', '拖拽画区域', 'select')}
          ${toolBtn('desk-human', '人员工位', 'select')}
          ${toolBtn('desk-front', '中继前台桌', 'select')}
          ${toolBtn('desk-agent', '智能体机器人桌', 'select')}
          ${toolBtn('link', '连线（点A再点B）', 'select')}
          <h3>skill-admin</h3>
          <label class="stack">服务地址
            <input data-sa-url placeholder="留空=本地模拟" value="${escapeAttr(getSkillAdminConfig().baseUrl)}" />
          </label>
          <button type="button" data-act="reload-catalog">重新读取人员/智能体</button>
          <p class="hint">人员在 skill-admin 添加后，这里刷新，再到右侧下拉绑定进看板。</p>
        </aside>
        <main class="canvas-wrap"><div id="board-canvas"></div></main>
        <aside class="inspector" id="inspector">${renderInspector()}</aside>
      </div>
    </div>
    <input type="file" id="import-file" accept="application/json,.json" hidden />
  `

  const canvas = app.querySelector<HTMLDivElement>('#board-canvas')!
  editor?.destroy()
  editor = new BoardEditor(canvas, scheme, {
    onChange: (s) => {
      scheme = s
    },
    onSelect: (id) => {
      selectedId = id
      refreshInspector()
    },
  })
  editor.setCatalog(people, agents)

  app.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool as EditorTool
      editor?.setTool(tool)
      app.querySelectorAll('.tool').forEach((b) => b.classList.remove('on'))
      btn.classList.add('on')
    })
  })

  bindChrome()
  refreshInspector()
}

function refreshInspector(): void {
  const el = app.querySelector('#inspector')
  if (!el) return
  el.innerHTML = renderInspector()
  el.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-f]').forEach((input) => {
    const apply = () => {
      const key = input.dataset.f!
      let value: string | number = input.value
      if (key === 'width') value = Number(value)
      if (key === 'personId' && value) {
        const p = people.find((x) => x.id === value)
        const cur = editor!.findNode(selectedId!) as DeskNode
        editor!.updateSelected({
          personId: value || undefined,
          gender: p?.gender,
          name: p?.name ?? cur.name,
        })
        refreshInspector()
        return
      }
      if (key === 'agentId' && value) {
        const a = agents.find((x) => x.id === value)
        const cur = editor!.findNode(selectedId!) as DeskNode
        editor!.updateSelected({
          agentId: value || undefined,
          name: a?.name ?? cur.name,
        })
        refreshInspector()
        return
      }
      editor!.updateSelected({ [key]: value || undefined })
      if (key === 'width' || key === 'name') refreshInspector()
    }
    input.addEventListener('change', apply)
    if (input instanceof HTMLInputElement && input.type === 'range') {
      input.addEventListener('input', apply)
    }
  })

  const applyDoor = () => {
    if (!editor || !selectedId) return
    const edge = (el.querySelector('[data-door-edge]') as HTMLSelectElement | null)?.value ?? 's'
    const width = Number((el.querySelector('[data-door-w]') as HTMLInputElement | null)?.value ?? 56)
    editor.updateSelected({
      doors: [{ edge, t: 0.5, width }],
    })
  }
  el.querySelector('[data-door-edge]')?.addEventListener('change', applyDoor)
  el.querySelector('[data-door-w]')?.addEventListener('input', applyDoor)

  el.querySelector('[data-del]')?.addEventListener('click', () => {
    editor?.deleteSelected()
    selectedId = null
    refreshInspector()
  })
}

function bindChrome(): void {
  app.querySelector<HTMLInputElement>('[data-board-name]')?.addEventListener('change', (e) => {
    scheme.name = (e.target as HTMLInputElement).value
  })

  app.querySelector<HTMLSelectElement>('[data-scheme-list]')?.addEventListener('change', (e) => {
    const id = (e.target as HTMLSelectElement).value
    const s = getScheme(id)
    if (!s) return
    scheme = s
    setActiveSchemeId(id)
    renderEditShell()
  })

  app.querySelector('[data-act="new"]')?.addEventListener('click', () => {
    const name = prompt('新方案名称', '新看板方案')
    if (!name) return
    scheme = createNewScheme(name)
    renderEditShell()
  })

  app.querySelector('[data-act="save"]')?.addEventListener('click', () => {
    if (!editor) return
    scheme = editor.getScheme()
    const nameInput = app.querySelector<HTMLInputElement>('[data-board-name]')
    if (nameInput) scheme.name = nameInput.value
    scheme = saveScheme(scheme)
    alert(`已保存：${scheme.name}`)
    renderEditShell()
  })

  app.querySelector('[data-act="export"]')?.addEventListener('click', () => {
    if (!editor) return
    const s = editor.getScheme()
    const blob = new Blob([exportSchemeJson(s)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${s.name || 'board'}.json`
    a.click()
  })

  app.querySelector('[data-act="import"]')?.addEventListener('click', () => {
    app.querySelector<HTMLInputElement>('#import-file')?.click()
  })
  app.querySelector<HTMLInputElement>('#import-file')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      scheme = importSchemeJson(await file.text())
      renderEditShell()
    } catch (err) {
      alert(String(err))
    }
  })

  app.querySelector('[data-act="delete"]')?.addEventListener('click', () => {
    if (!confirm(`删除方案「${scheme.name}」？`)) return
    deleteScheme(scheme.id)
    scheme = ensureDefaultScheme()
    renderEditShell()
  })

  app.querySelector('[data-act="view"]')?.addEventListener('click', () => {
    if (editor) {
      scheme = editor.getScheme()
      saveScheme(scheme)
    }
    mode = 'view'
    render()
  })

  app.querySelector('[data-act="reload-catalog"]')?.addEventListener('click', async () => {
    const url = app.querySelector<HTMLInputElement>('[data-sa-url]')?.value.trim() ?? ''
    setSkillAdminConfig({ baseUrl: url })
    people = await fetchPeople()
    agents = await fetchAgents()
    editor?.setCatalog(people, agents)
    editor?.rebuild()
    refreshInspector()
    alert(`已读取人员 ${people.length}、智能体 ${agents.length}`)
  })
}

function renderViewer(): void {
  app.innerHTML = `
    <div class="app-shell view-mode">
      <header class="bar dark">
        <div class="brand">
          <div class="logo">一</div>
          <div>
            <div class="title">${escapeAttr(scheme.name)}</div>
            <div class="sub">预览看板 · 图2 等距立体墙体</div>
          </div>
        </div>
        <div class="bar-actions">
          <button type="button" class="primary" data-act="edit">返回绘图（图1线框）</button>
        </div>
      </header>
      <div class="view-canvas iso" id="view-canvas"></div>
    </div>
  `

  renderIsoPreview(scheme, app.querySelector('#view-canvas')!)

  app.querySelector('[data-act="edit"]')?.addEventListener('click', () => {
    mode = 'edit'
    render()
  })
}

function render(): void {
  if (mode === 'view') renderViewer()
  else renderEditShell()
}

render()
