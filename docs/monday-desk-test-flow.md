# Monday 接单配置 · 安全测试流程

拓扑（本轮）：

| 角色 | 在哪 | 端口 / 盘 |
|------|------|-----------|
| 客户端（设计页） | **本机** helpdesk `:5173` | 浏览器 |
| Desk Agent | **本机** | **`18765` only**（不是 8081/38080/8082） |
| 中继服务 | **226** ASK | `8081`（只读探测允许） |
| ASK 共享盘 | 226 / `Z:` | **本轮禁止写入** |
| DEV sidecar | 38080 | **禁止填写** |
| 邮件桥 | ~8082 | **本轮不测** |

原则：**不改用户级 `BRIDGE_*` / `BRIDGE_DEV_*`，不启停 ASK `support_desk` watch，不用 `Z:`。**

---

## 阶段 0 · 确认没伤到 ASK/DEV（30 秒）

本机 PowerShell：

```powershell
# ASK / DEV 用户环境应仍是原值（Monday 不会改）
[Environment]::GetEnvironmentVariable('BRIDGE_BASE_URL','User')
[Environment]::GetEnvironmentVariable('BRIDGE_DEV_BASE_URL','User')

# 226 ASK 是否活着（只读）
curl.exe -s http://192.168.99.226:8081/health
```

期望：health 有 JSON；User 环境变量与测前一致。

---

## 阶段 1 · 本机拉起 Desk Agent（只占 18765）

```powershell
cd E:\cursor-bridge\skills\support_desk\desk_agent
.\install_desk_agent.ps1 -Port 18765
curl.exe -s http://127.0.0.1:18765/v1/health
```

期望：`service=monday-desk-agent`。

若绑定失败，按脚本提示做 `urlacl`，或临时：

```powershell
.\desk_agent.ps1 -Port 18765
```

---

## 阶段 2 · 设计页「只探测」（推荐先做）

1. 打开本机 `http://127.0.0.1:5173` → 登录设计  
2. 点开 **接单台** 卡片  
3. 确认默认：
   - Agent URL = `http://127.0.0.1:18765`
   - 中继 URL = `http://192.168.99.226:8081`
   - 共享根 **留空**（用本机 sandbox，不是 Z:）  
4. 填 ASK 的 Token（若 `/health` 要鉴权）  
5. 点 **探测状态**（不要急着点应用）

期望探测里看到：

- `✓ 中继`（226）
- `✓ 共享盘`（sandbox 路径，且无 Z: 警告）
- `isolation.askEnvShadow` 里仍是原来的 ASK/DEV（只读）
- **未**改 User `BRIDGE_*`

可用另一窗口再确认：

```powershell
curl.exe -s http://127.0.0.1:18765/v1/probe
type $env:LOCALAPPDATA\monday-desk\profile.json
# 阶段 2 若没点「应用」，profile 可能还不存在，属正常
```

---

## 阶段 3 · 应用档案 + 热启 Monday watch（仍隔离）

设计页点 **应用并热启**。

会发生的：

1. 写入 `%LOCALAPPDATA%\monday-desk\profile.json`  
2. 确保 sandbox 目录 `requirements/drop/archive`  
3. 启停的是 **`monday_watch_loop.ps1`**，不是 ASK 的 `support_desk\scripts\watch_loop.ps1`

验收：

```powershell
# Monday 档案
type $env:LOCALAPPDATA\monday-desk\profile.json

# User 级 ASK 地址应不变
[Environment]::GetEnvironmentVariable('BRIDGE_BASE_URL','User')

# 只有 monday-watch，不应误杀 ASK watch
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
  Where-Object { $_.CommandLine -match 'watch_loop' } |
  Select-Object ProcessId, CommandLine
```

期望：Monday 行含 `monday_watch_loop.ps1`；若本机本来有 ASK desk，其 CommandLine 仍是 `support_desk\scripts\watch_loop.ps1` 且还在。

---

## 阶段 4 · 对照：什么叫「测邮件」那种难点

| 系统 | 怎么知道测通了 | 本轮 Monday |
|------|----------------|-------------|
| 邮件桥 | 发信 → 共享盘出现文件 → desk 认领 | **先不做** |
| ASK | 同事 ask → 看板有单 → desk claim | 本轮只用 `/health` 探活 |
| Monday 配置 | 设计页探测绿 → profile 落盘 → monday-watch 进程在 | **本轮目标** |

先把「配置通道」跑通，再谈真实开单联调。

---

## 红线（踩了就停）

- 共享根填 `Z:\` → Agent 会 **拒绝**  
- 中继填 `38080` / 新加坡 DEV → Agent 会 **拒绝**  
- 去动 `manage_watch_loop.ps1`（ASK）→ 不要；用设计页或 `/v1/watch`  
- 端口改成 8081/8082/38080 → 不要；Desk Agent 固定 **18765**

---

## 设计页 Agent URL → desk_agent 探测

接单台配置的 **Agent URL** 应指向本机 Desk 监视器（不是 7900 / 不是 ASK 8081 / 不是 DEV 38080）：

```text
http://127.0.0.1:18765
```

探测步骤：

1. 启动 Desk Agent（新加坡示例路径）：

```powershell
cd C:\cursor-bridge\skills\support_desk\desk_agent
.\install_desk_agent.ps1 -Port 18765
curl.exe -s http://127.0.0.1:18765/v1/health
curl.exe -s http://127.0.0.1:18765/v1/threads
curl.exe -s "http://127.0.0.1:18765/v1/jobs?service=mail"
```

2. 设计页打开接单台（Desk 监视）卡片，填入上述 Agent URL，点「探测状态」。
3. 期望：`service=monday-desk-agent`；`/v1/threads` 返回 mail/project 两槽；User 级 `BRIDGE_*` 不被改写。

共享盘任务包骨架（本机/SG）：

```powershell
cd C:\projects\helpdesk
powershell -NoProfile -File .\scripts\init-cursor-job-dirs.ps1
powershell -NoProfile -File .\scripts\drop-sample-task.ps1
```

默认根：`%LOCALAPPDATA%\monday-desk\shared-sandbox`（可用 `MONDAY_SHARED_ROOT` 覆盖）。

---

1. `install_desk_agent.ps1` + `curl health`  
2. 设计页接单台 **只点探测**  
3. 把探测结果（或截图文字）发我，我们再决定是否点「应用并热启」
