# 星期一 · Monday Helpdesk

看板 **绘图工具** + 方案保存 + 显示。

仓库：https://github.com/mli2025/helpdesk.git

## 你怎么用

```bash
npm install
npx vite --host 127.0.0.1 --port 5173
```

打开 http://127.0.0.1:5173

## 门洞

选中区域后：
- 右侧 **旋转门口 90°**（或画布上 **双击蓝点**）
- 拖蓝点沿墙移动缺口
- 可再加门洞

Git 上可参考的现成户型/门洞交互（未整仓迁入，避免绑死 React/HA）：

- [BipulRaman/Khaaka](https://github.com/BipulRaman/Khaaka) — 门/窗可旋转，单页户型编辑
- [nicosandller/easy-floorplan](https://github.com/nicosandller/easy-floorplan) — 门吸附墙体、可翻面
- [cvdlab/react-planner](https://github.com/cvdlab/react-planner) — 成熟 2D/3D 平面图（体量大，React）
- [@opengeometry/openplans](https://www.npmjs.com/package/@opengeometry/openplans) — BIM 向门窗 API

skill-admin 地址可在左侧填写；留空则用内置模拟数据。接口约定：

- `GET {base}/api/users` → `[{ id, name, gender, dept? }]`
- `GET {base}/api/agents` → `[{ id, name, skill }]`

方案存在浏览器 `localStorage`，可导出/导入 JSON。

## 后续

- 工位样式扩到三类  
- 显示态接真实开单连线动画（走窗口折线）  
- 对接真实 skill-admin
