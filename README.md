# 星期一 · Monday Helpdesk

独立中继看板 / 工单调度产品线（P0 视觉原型）。

仓库：https://github.com/mli2025/helpdesk.git

## 当前阶段

先做 **看板样式与状态动画**，确认观感后再接真实开单 / 回写流程。

- 户型图 / 家庭网络覆盖风格：客户侧会话区 → 自动开单管道 → 星期一前台 → AI 办公室工位
- 状态：`空闲` / `忙碌` / `爆单`
- 工单三列：待办 / 处理中 / 已完成
- 右侧可切换演示情景（安静 / 日常忙碌 / 爆单）

视觉灵感参考（自研 SVG，未拷贝对方资产）：

- [KbWen/agent-virtual-office](https://github.com/KbWen/agent-virtual-office) — SVG 工位动画
- [prantikmedhi/ClawNexus](https://github.com/prantikmedhi/ClawNexus) — SVG 户型办公层
- [masakav3/Agent-Office-Dashboard](https://github.com/masakav3/Agent-Office-Dashboard) — Agent 办公看板

## 本地预览

```bash
npm install
npm run dev
```

浏览器打开终端提示的本地地址（通常是 `http://localhost:5173`）。

## 下一步（你确认看板后）

1. FastAPI / 配置：端口、token、共享盘、工位数、爆单阈值
2. 开单 API + 最闲工位调度
3. 完成即回写客户会话（握手方案 A）
4. 邮件助手作为第一个 Agent 类型

## 技术栈（原型）

Vite + TypeScript + 纯 CSS/SVG 动画（无后端依赖）。
