import './style.css'
import { mountEasyFloorEditor, loadEasyFloorConfig, saveEasyFloorConfig, resetEasyFloorConfig } from './easyFloorHost'
import { mountEfpDemoPreview } from './efpDemoPreview'

type Mode = 'design' | 'preview'

const app = document.querySelector<HTMLDivElement>('#app')!
let mode: Mode = 'preview'
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
              <div class="title">星期一 · 办公平面设计</div>
              <div class="sub">基于 <a href="https://github.com/nicosandller/easy-floorplan" target="_blank" rel="noreferrer">easy-floorplan</a> · <strong>单层</strong>办公平面 · 画墙/门窗（已隐藏楼层）</div>
            </div>
          </div>
          <div class="bar-actions">
            <button type="button" data-act="reset">重置精致办公示例</button>
            <button type="button" class="accent" data-act="preview">打开看板演示（人/文件/动画）</button>
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
      if (!confirm('清除已保存平面并恢复高对比示例？')) return
      resetEasyFloorConfig()
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
            <div class="sub">工位上的人 / 文件堆 / 智能体 · 单据沿门洞往复动画</div>
          </div>
        </div>
        <div class="bar-actions">
          <button type="button" class="primary" data-act="design">编辑户型</button>
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
