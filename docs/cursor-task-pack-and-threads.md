# 中继 → Cursor 线程：任务包与线程模型（建议稿）

## 已锁定

| 项 | 约定 |
|----|------|
| 智能体服务数 | **2**（例：邮件助手 / 项目助手） |
| Cursor 线程 | **正好 2 条常驻**，一对一绑定服务 |
| Desk | **只监视这两条线程**（健康、是否在忙、结果是否交还），不做「用 CLI 去 claim」 |
| 用户记忆 | **共享盘按用户分目录**（用户本身已分开，不再在线程里混记） |

```text
用户客户端
  → 平台智能体（模型+记忆：把关 / 能回就回 / 整理任务包）
  → 中继队列（状态：接单 → 处理）
  → Cursor 线程 A 或 B（Desk 监视）
  → 结果回 server/worker → 平台确认 → 用户窗口
```

---

## 1. 任务包约定（推荐）

原则：**一个任务 = 共享盘上一个目录 + 一个 `task.json`**。  
Cursor 读目录即可，不必先学一堆私有 RPC。旁路（无盘）时同一套 JSON 打进 zip。

### 路径（与用户隔离）

```text
{SHARED_ROOT}/
  cursor-jobs/
    {serviceId}/                 # mail | project（对应两条线程）
      inbox/                     # 待接单
        {userId}/
          task.json
          in/                    # 用户附件（平台已放好）
      processing/                # 处理中（线程认领后移入）
        {taskId}/
      done/                      # 成功交还
        {taskId}/
          task.json              # 含 result
          out/                   # Cursor 产出
      failed/
        {taskId}/
  memory/
    {userId}/                   # 仅该用户
      {serviceId}/
        profile.md               # 可选：稳定偏好
        recent.jsonl             # 可选：近期摘要，追加写
```

> 平台把关后**只往对应 `serviceId/inbox` 丢包**；无关内容根本不进另一条线程的盘。

### `task.json`（最小够用）

```json
{
  "schema": "monday.cursor-task.v1",
  "taskId": "20260911-t9f2a1",
  "serviceId": "mail",
  "userId": "u_123",
  "conversationId": "c_456",
  "createdAt": "2026-09-11T03:00:00Z",
  "priority": "normal",
  "title": "一句话标题",
  "instruction": "平台整理后给 Cursor 的明确任务（中文即可）",
  "context": {
    "summary": "平台深度思考后的背景摘要",
    "constraints": ["只动邮件相关", "不要改无关仓库"],
    "memoryHints": ["memory/u_123/mail/recent.jsonl 最近 20 行"]
  },
  "inputs": [
    { "path": "in/mail.eml", "kind": "file" },
    { "path": "in/shot.png", "kind": "image" }
  ],
  "expect": {
    "replyToUser": true,
    "artifacts": ["out/**"]
  },
  "callback": {
    "channel": "bridge",
    "askId": "可选-若走中继单号",
    "statusPath": "status.json"
  },
  "result": null
}
```

完成后 Cursor（或 Desk 代写）把 `result` 填上，目录挪到 `done/`：

```json
"result": {
  "ok": true,
  "summary": "给平台看的摘要",
  "userMessage": "可直接展示给用户的回复草稿",
  "artifacts": ["out/note.md"],
  "finishedAt": "2026-09-11T03:05:00Z"
}
```

处理中可写同级 `status.json`：`{"state":"claimed|running","threadId":"mail","at":"..."}` —— 对应好看的「接单 / 处理」，也方便以后多线程抢单（谁写下 claimed 谁拿走）。

### 旁路无盘

同一 `task.json` + `in/` 打成 `{taskId}.zip`，经现有发版/旁路通道丢到 Desk；Desk 解压进本地等价目录即可。字段不变。

---

## 2. 两条常驻线程 + Desk 监视（锁定）

| 线程 | 监视什么 | 干活时读哪里 |
|------|----------|--------------|
| Thread-mail | 进程在不在、是否 processing、最后心跳 | `cursor-jobs/mail/inbox` → `processing` |
| Thread-project | 同上 | `cursor-jobs/project/...` |

Desk（轻量，**不是** Cursor）只做：

1. 心跳 / 线程存活  
2. inbox 有包 → 若线程空闲则「叫醒」或确认线程自己在盯盘  
3. `processing` 超时告警  
4. `done/failed` → 通知 server/worker 拉取，**平台确认后再进用户对话**

用户记忆：Cursor 需要时读 `memory/{userId}/{serviceId}/`；平台也可在组任务包时把摘要写进 `context.summary`，减少线程冷启动成本。

---

## 3. 和「接单 / 处理」状态对齐

| 中继/看板状态 | 盘上动作 |
|---------------|----------|
| 接单 | 包在 `inbox/` 或刚写入 `processing/` + `status=claimed` |
| 处理 | `processing/` + `status=running` |
| （隐式）完成 | `done/` + `result` → 等平台确认 |

---

## 4. 刻意不做的事

- 不让 Cursor CLI 去跑 claim API「当接单员」  
- 不把两个服务挤进一条线程  
- 不用全局一份聊天记忆；**按 `userId` 分目录**

---

## 5. 建议下一步实现顺序

1. 共享盘目录骨架 + `task.json` 样例（可先手工丢一个 inbox 包）  
2. Desk 监视器：只看两线程 + 两 inbox（仍不调用大模型）  
3. 平台组包接口（把关后写入对应 `serviceId/inbox`）  
4. 再接「常驻 Cursor 线程」怎么挂（桌面会话 / 常驻 agent 进程读盘）

任务包本身到此可定稿；若要改字段名，优先保持 `schema/taskId/serviceId/userId/instruction/result` 五件套稳定。
