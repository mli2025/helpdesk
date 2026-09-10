# 星期一 · Monday Helpdesk

看板 **绘图工具** + 方案保存 + 显示。

仓库：https://github.com/mli2025/helpdesk.git

## 你怎么用

```bash
npm install
npx vite --host 127.0.0.1 --port 5173
```

打开 http://127.0.0.1:5173

### 墙体两套皮

- **设计态（图1）**：深色底 + 白线框墙体，门洞是墙线上的缺口，可在右侧改门洞方向/宽度  
- **预览态（图2）**：同一方案渲染成等距立体半透明墙 + 地面色块  

点「显示看板」切换预览；「返回绘图」回到线框编辑。

skill-admin 地址可在左侧填写；留空则用内置模拟数据。接口约定：

- `GET {base}/api/users` → `[{ id, name, gender, dept? }]`
- `GET {base}/api/agents` → `[{ id, name, skill }]`

方案存在浏览器 `localStorage`，可导出/导入 JSON。

## 后续

- 工位样式扩到三类  
- 显示态接真实开单连线动画（走窗口折线）  
- 对接真实 skill-admin
