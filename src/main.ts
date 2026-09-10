import './style.css'
import { mountEasyFloorEditor, loadEasyFloorConfig, saveEasyFloorConfig } from './easyFloorHost'
import { mountEfpDemoPreview } from './efpDemoPreview'

type Mode = 'design' | 'preview'

const app = document.querySelector<HTMLDivElement>('#app')!
let mode: Mode = 'design'
let destroyDesign: (() => void) | null = null
let destroyPreview: (() => void) | null = null

function render(): void {
  destroyDesign?.()
  destroyPreview?.()
  destroyDesign = null
  destroyPreview = null

  if (mode === 'design') {
    app.innerHTML = `
      <div class="app-shell efp-mode">
        <header class="bar">
          <div class="brand">
            <div class="logo">一</div>
            <div>
              <div class="title">星期一 · 户型设计</div>
              <div class="sub">基于 <a href="https://github.com/nicosandller/easy-floorplan" target="_blank" rel="noreferrer">easy-floorplan</a>（MIT）· 画墙 / 放门窗 / 旋转门口</div>
            </div>
          </div>
          <div class="bar-actions">
            <button type="button" data-act="reset">重置示例户型</button>
            <button type="button" class="accent" data-act="preview">显示看板演示</button>
          </div>
        </header>
        <div class="efp-wrap" id="efp-wrap"></div>
      </div>
    `
    const host = mountEasyFloorEditor(app.querySelector('#efp-wrap')!)
    destroyDesign = host.destroy

    app.querySelector('[data-act="preview"]')?.addEventListener('click', () => {
      saveEasyFloorConfig(host.getConfig())
      mode = 'preview'
      render()
    })
    app.querySelector('[data-act="reset"]')?.addEventListener('click', () => {
      if (!confirm('清除已保存户型并恢复示例？')) return
      localStorage.removeItem('monday.easyFloorplan.config')
      render()
    })
    return
  }

  // preview
  app.innerHTML = `
    <div class="app-shell view-mode">
      <header class="bar">
        <div class="brand">
          <div class="logo">一</div>
          <div>
            <div class="title">星期一 · 看板演示</div>
            <div class="sub">easy-floorplan 户型 + 定时往复连线</div>
          </div>
        </div>
        <div class="bar-actions">
          <button type="button" class="primary" data-act="design">返回户型设计</button>
        </div>
      </header>
      <div class="view-canvas plain" id="view-canvas"></div>
    </div>
  `
  destroyPreview = mountEfpDemoPreview(loadEasyFloorConfig(), app.querySelector('#view-canvas')!)
  app.querySelector('[data-act="design"]')?.addEventListener('click', () => {
    destroyPreview?.()
    mode = 'design'
    render()
  })
}

render()
