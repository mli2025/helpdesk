# 星期一 · Monday Helpdesk

看板 **绘图工具** + 方案保存 + 显示。

仓库：https://github.com/mli2025/helpdesk.git

## 你怎么用

```bash
npm install
npx vite --host 127.0.0.1 --port 5173
```

打开 http://127.0.0.1:5173

### 墙体与预览

- **设计态**：深色底 + 白线框墙体，门洞是墙线缺口  
- **预览态**：同一套 **平民 2D**（不要 3D），可开 **定时演示往复**  
  - 开单：用户 → 门洞折线 → 前台（数秒消失）  
  - 派单：前台 → 智能体（桌上堆文件）  
  - 结束/回写：智能体 → 用户  

skill-admin 地址可在左侧填写；留空则用内置模拟数据。接口约定：

- `GET {base}/api/users` → `[{ id, name, gender, dept? }]`
- `GET {base}/api/agents` → `[{ id, name, skill }]`

方案存在浏览器 `localStorage`，可导出/导入 JSON。

## 后续

- 工位样式扩到三类  
- 显示态接真实开单连线动画（走窗口折线）  
- 对接真实 skill-admin
