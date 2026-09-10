# 星期一 · Monday Helpdesk

看板 **绘图工具** + 方案保存 + 显示。

仓库：https://github.com/mli2025/helpdesk.git

## 你怎么用

```bash
npm install
npx vite --host 127.0.0.1 --port 5173
```

打开 http://127.0.0.1:5173

### 绘图

1. **拖拽画区域** → 拉出矩形 → 右侧改名称/颜色  
2. **人员工位 / 中继前台桌 / 智能体机器人桌** → 点画布摆放，再拖到位置  
3. 工位样式先做一类：**办公桌 + 电脑**  
4. 人员：从 **skill-admin** 读取后，在右侧下拉 **绑定**（男/女形象）  
5. 智能体：同样从 skill-admin 读取后绑定（卡通机器人）  
6. **连线**：点工具 → 先点 A 再点 B；右侧可调 **颜色 / 粗细 / 正交或直线**  
7. **保存方案** → **显示看板**

skill-admin 地址可在左侧填写；留空则用内置模拟数据。接口约定：

- `GET {base}/api/users` → `[{ id, name, gender, dept? }]`
- `GET {base}/api/agents` → `[{ id, name, skill }]`

方案存在浏览器 `localStorage`，可导出/导入 JSON。

## 后续

- 工位样式扩到三类  
- 显示态接真实开单连线动画（走窗口折线）  
- 对接真实 skill-admin
