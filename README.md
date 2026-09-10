# 星期一 · Monday Helpdesk

户型设计直接采用开源 [**easy-floorplan**](https://github.com/nicosandller/easy-floorplan)（MIT，Nicolas Sandller）。

## 本地运行

需同时存在：

- `E:\helpdesk`（本仓库）
- `E:\easy-floorplan`（`git clone https://github.com/nicosandller/easy-floorplan.git`）

```bash
cd E:\helpdesk
npm install
npx vite --host 127.0.0.1 --port 5173
```

打开 http://127.0.0.1:5173

## 怎么用

1. **户型设计**：真实 easy-floorplan 编辑器  
   - 画墙、放门/窗、门口吸附墙体、旋转/翻转  
2. **显示看板演示**：用已保存户型 + 定时开单/派单/回写连线（走门口）

## 说明

- easy-floorplan 通过 Vite alias 引用本地源码，不整仓 fork 进 helpdesk  
- 设计器配置存在浏览器 `localStorage`（`monday.easyFloorplan.config`）  
- 工位/人员演示层后续会接到 skill-admin；当前为演示叠层
