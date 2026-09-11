# DEV 工单任务书：Monday 中继任务包 + Desk 监视两线程（骨架）

> 给新加坡 remote：按本文实现；默认在 **helpdesk** 仓库 `main` 上改（主人约定：能合 main 就合，勿乱开 feat 除非工单指定分支）。
> cursor-bridge 侧若 SG 只有发版包同步目录 `C:\cursor-bridge`，desk_agent 相关改动可一并提交说明，或只改 helpdesk 文档/客户端，bridge 脚本由平台机另合。

## 背景（不要理解错）

- **不是**用 Cursor CLI 去当接单员 claim API。
- **是**：平台智能体把关 → 中继任务包上盘 → **常驻 Cursor 线程**干活 → 交还平台确认 → 用户窗口。
- 两个智能体服务 = **两条** Cursor 线程；Desk **只监视**这两条；用户记忆在共享盘按 `userId` 隔离。
- 接单/处理是队列状态（好看 + 以后抢单），接单本身用轻量逻辑。

权威说明（若仓库里已有则以其为准）：

- `docs/cursor-task-pack-and-threads.md`
- `docs/monday-desk-test-flow.md`

## 本单范围（第一刀，可验收）

### A. 共享盘任务包骨架（helpdesk 内脚本或文档+样例）

在约定根下生成（默认可用环境变量 `MONDAY_SHARED_ROOT`，否则 `%LOCALAPPDATA%\monday-desk\shared-sandbox`）：

```text
cursor-jobs/{mail,project}/{inbox,processing,done,failed}/
memory/{userId}/{serviceId}/   # 样例用户即可
```

提供：

1. `scripts/init-cursor-job-dirs.ps1`（或 node/ts 等价）一键建目录  
2. `docs/samples/cursor-task.v1.example.json` 符合 `monday.cursor-task.v1`  
3. `scripts/drop-sample-task.ps1`：往 `mail/inbox/{taskId}/` 丢样例包（含空 `in/`）

### B. Desk 监视器（轻量，不调大模型）

扩展已有 `cursor-bridge/skills/support_desk/desk_agent/`（若 SG 改 bridge：改完说明如何打进 pack；若只动 helpdesk：做 HTTP 客户端+本地监视原型亦可，但优先 bridge）：

- `GET /v1/threads`：固定返回两条服务线程槽位 `mail` / `project` 的状态（alive/busy/idle/unknown + 最后心跳时间）  
- `GET /v1/jobs?service=mail|project`：扫描对应 `inbox/processing/done` 计数  
- **禁止**写入用户级 `BRIDGE_*`；**禁止**启停 ASK `support_desk` watch  
- 继续默认监听 `127.0.0.1:18765`

### C. 设计页文案/绑定语义（小改）

helpdesk 接单台/助手侧栏提示改为：

- 接单台 → Desk 监视（配置 Agent URL）  
- 助手 → 对应 Cursor 线程服务（mail/project），不是「7900 智能体大脑」  
不必一次做完路由，文案与数据字段预留 `serviceId` 即可。

## 非本单

- 真·常驻 Cursor 桌面会话挂载  
- 平台大模型把关逻辑  
- 邮件端到端  
- 动 ASK 226 / DEV 38080 端口与 Z: 盘

## 验收

1. 本机/SG 跑 `init-cursor-job-dirs` 后目录存在  
2. `drop-sample-task` 后 `mail/inbox/.../task.json` 可读  
3. desk_agent `/v1/health` 通；`/v1/threads` 与 `/v1/jobs` 有合理 JSON  
4. 文档写明：如何用设计页 Agent URL 指向 desk_agent 做探测  
5. `REMOTE_DONE` + commit sha；平台审阅

## 仓库

- 主改：`https://github.com/mli2025/helpdesk.git`  
- 旁路相关：`C:\cursor-bridge`（发版包）若需改 desk_agent，在工单留言列出文件清单
