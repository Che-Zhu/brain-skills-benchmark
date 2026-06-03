# Devbox 链路移植（ShipRepo → Benchmark）

跟踪 ShipRepo 内置部署链路到本仓库的移植进度。产品参考见根目录 [`shiprepo-internal-deploy-flow.md`](../shiprepo-internal-deploy-flow.md)。

**原则**：移植 **库能力**（Devbox API、Gateway API），不移植 ShipRepo HTTP/DB/前端；**step 保持薄**，业务进 `src/lib/`。

---

## 已锁定决策

| 项 | 决定 |
|----|------|
| Skill 来源 | 使用 `BRAIN_SANDBOX_SKILLS_GIT`（`npx skills add …`），**不使用** ShipRepo 的 `brain-github-deploy` |
| Turn 完成判据 | **暂时与 ShipRepo 一致**：以 Codex Gateway `lastTurnStatus` 为准（`completed` / `succeeded` / `interrupted` 视为成功） |
| 运行形态 | Node CLI 批跑，无 `tasks` 表、无 `/api/tasks` |
| Devbox 生命周期 | **每仓创建、每仓结束必删**（与 ShipRepo「completed 不删」不同，避免批跑泄漏） |
| 队列 | 已有 `step-1-load-queue` + `BENCHMARK_LIMIT`，不变 |
| 目标仓库 | **均为 public**；bootstrap `git clone` 用 `https://github.com/{full_name}.git`（无 token） |
| `GITHUB_TOKEN` | **必填**，创建 Devbox 时注入 `env`，供内置 skill 推镜像（GHCR 等） |
| `kubeAccess` | **不传**（API 上为 optional；ShipRepo 为部署 skill 开启，benchmark sandbox 不需要访问 K8s） |

后续若 sandbox skill 产出物与 ShipRepo 的 `.sealos/deployment-output.json` 契约不一致，在阶段 4 单独加「产物校验」；当前不阻塞 Gateway 判据。

### Codex Gateway 是什么（避免目录误解）

- **Gateway 进程在 Devbox 镜像/运行时里**，创建 Devbox 时通过 `CODEX_GATEWAY_*` 环境变量启动（与 ShipRepo `ensureTaskDevboxRuntime` 一致）。
- Benchmark **不会**也**不需要**再装一份 Gateway，更不会在仓库里维护 Gateway 源码。
- ShipRepo 的 `lib/codex-gateway/` **不是空的**（含 `client.ts`、`session.ts`、`completion.ts` 等）：那是 **跑在 ShipRepo 服务端、去调用 Devbox 里 Gateway HTTP API** 的编排代码。
- 本仓库对应物放在 **`src/lib/devbox/gateway/`**（调用方客户端），命名刻意不用顶层 `codex-gateway/`，以免和「Gateway 本体」混淆。

---

## 目标代码结构

保持与现有 benchmark 分层一致：总控不写业务，step 只改 `ctx`，可复用逻辑全部在 `src/lib/`。

```text
src/
├── context.mjs
├── run.mjs
├── lib/
│   ├── load-env.mjs              # 已有
│   ├── deployable-queue.mjs      # 已有
│   └── devbox/
│       ├── config.mjs            # SEALOS_HOST、JWT、namespace、image
│       ├── client.mjs            # Devbox API：create / get / exec / delete …
│       ├── naming.mjs            # runId + full_name → name、upstreamID
│       ├── repo-url.mjs          # full_name → https://github.com/…git（仅 public）
│       ├── wait-running.mjs
│       ├── bootstrap.mjs         # exec：git clone + skills add（BRAIN_SANDBOX_SKILLS_GIT）
│       ├── gateway-url.mjs       # 从 DevboxInfo 解析内置 Gateway 的 URL / token
│       └── gateway/              # 调用 Devbox **内置** Gateway 的 HTTP 客户端（非 Gateway 本体）
│           ├── client.mjs        # healthz、readyz、sessions、turn、state
│           ├── session.mjs       # ensure session（无 DB）
│           ├── turn.mjs          # 发 turn + 轮询完成（无 SSE）
│           └── prompt.mjs        # benchmark 专用 prompt（非 brain-github-deploy）
└── steps/
    ├── step-1-load-queue/
    ├── step-2-1-mark-started/
    ├── step-2-2-create-devbox/     # 调 lib/devbox：create + wait + bootstrap
    ├── step-2-3-run-skill/         # 调 lib/devbox/gateway：session + turn + wait
    │   └── run-skill.mjs           # 仅编排；子模块放 lib，不放 step 目录深处
    ├── step-2-4-finalize-outcome/
    ├── step-2-5-append-csv-row/
    └── step-2-6-delete-devbox/

scripts/                            # 冒烟与手工调试（不进入 benchmark 主路径）
├── filter-top1000-deployable.mjs   # 已有
├── devbox-health.mjs               # 待建
└── devbox-smoke-one-repo.mjs       # 待建：单仓 create → delete
```

**整洁性约定**

1. **一个 concern 一个文件**：`client.mjs` 只做 HTTP；`bootstrap.mjs` 只拼脚本与 exec；不在 step 里写 `fetch`。
2. **step 目录内单入口**：每个 step 目录仅暴露 `run(ctx)`（一个 `.mjs`），除非该 step 确有大量私有辅助且不愿进 `lib`（当前无此需求）。
3. **不从 ShipRepo 整文件复制**：按模块摘录、去掉 Drizzle/Task/logger/DB；TypeScript → 原生 ESM `.mjs`。
4. **环境变量**：集中在 `.env.example` 与 `lib/*/config.mjs` 读取，不散落 magic string。
5. **错误向上抛**：step 不吞异常；`src/run.mjs` 用 `try/finally` 保证删 Devbox（实现阶段 5 时加）。

---

## `ctx` 字段（计划扩展）

| 字段 | 设置于 | 说明 |
|------|--------|------|
| `queue`, `current`, `csvPath`, … | 已有 | 见 `src/context.mjs` |
| `runId` | `createContext` | 本次批跑 ID，用于 Devbox 命名 |
| `repoUrl` | `mark-started` 或 `create-devbox` | public clone URL，`https://github.com/{full_name}.git` |
| `runtimeName` | `create-devbox` | Devbox 名称（替代 stub `devboxId`） |
| `runtimeNamespace` | `create-devbox` | |
| `gatewayUrl` | `create-devbox` | 从 runtime 解析 |
| `gatewaySessionId` | `run-skill` | |
| `status` | `run-skill` / `finalize-outcome` | `success` \| `failed` |
| `error` | 任一步失败 | 简短错误信息 |
| `cleanupError` | `delete-devbox` | 删除失败时记录，不覆盖 `status` |

`devboxId` 可弃用或作为 `runtimeName` 别名，实现时统一为 `runtimeName`。

---

## 环境变量

| 变量 | 状态 | 说明 |
|------|------|------|
| `SEALOS_HOST` | 已有 | Devbox API base |
| `DEVBOX_JWT_SIGNING_KEY` | 已有 | Bearer JWT |
| `DEVBOX_RUNTIME_IMAGE` | 可选 | 覆盖默认镜像 |
| `GITHUB_TOKEN` | 必填 | 传入 Devbox `env`（与 ShipRepo 一致）；bootstrap clone 不使用 |
| `CODEX_GATEWAY_OPENAI_API_KEY` | 已有 | 创建 Devbox 时注入，供**内置** Gateway 使用 |
| `CODEX_GATEWAY_OPENAI_BASE_URL` | 可选 | |
| `CODEX_GATEWAY_MODEL` | 可选 | |
| `CODEX_GATEWAY_JWT_SECRET` | 可选 | 与 ShipRepo 一致时设置 |
| `BRAIN_SANDBOX_SKILLS_GIT` | 已有 | bootstrap `npx skills add` |
| `BENCHMARK_LIMIT` | 已有 | 队列长度 |
| `BENCHMARK_DATA_DIR` | 已有 | CSV 目录 |
| `BENCHMARK_DEVBOX_BOOTSTRAP_TIMEOUT_MS` | 待加 | 默认 60000 |
| `BENCHMARK_TURN_TIMEOUT_MS` | 待加 | 默认与 ShipRepo maxDuration 量级一致 |

---

## 与 ShipRepo 步骤对照（我们要什么）

| ShipRepo 段 | 移植 | Benchmark 落点 |
|-------------|------|----------------|
| §1 创建任务 / DB | 否 | `step-1-load-queue` |
| §2 Devbox create + bootstrap | 是（改 skill） | `lib/devbox/*` + `step-2-2` |
| §3 Gateway session | 是 | `lib/devbox/gateway/session.mjs`（调 Devbox 内 Gateway） |
| §4 发 turn + prompt | 是（prompt 改 sandbox） | `lib/devbox/gateway/prompt.mjs` + `turn.mjs` |
| §5 SSE / chat v2 | 否 | 轮询 `GET .../state` |
| §6 Turn 完成归档 | 是（无 DB） | `run-skill` 内映射 `lastTurnStatus` |
| PR / deployment API | 否 | — |
| 停止 / merge 清 Devbox | 部分 | 仅 `DELETE devbox`，且**每仓必做** |

---

## 进度清单

完成一项请将 `[ ]` 改为 `[x]`，并在 PR/commit 中引用阶段号。

### 阶段 0 — 契约（本文档）

- [x] 锁定 skill：`BRAIN_SANDBOX_SKILLS_GIT`
- [x] 锁定完成判据：Gateway `lastTurnStatus`（与 ShipRepo 一致）
- [x] 文档与目录约定（本文档）

### 阶段 1 — Devbox 客户端

- [x] `src/lib/devbox/config.mjs`
- [x] `src/lib/devbox/client.mjs`（create / get / list / exec / delete）
- [x] `src/lib/devbox/naming.mjs`
- [x] `src/lib/devbox/wait-running.mjs`
- [x] `scripts/devbox-health.mjs`
- [ ] 验收：healthz 通过（本机执行，见下）

#### 阶段 1 怎么验收？

**`healthz` 是什么**  
Devbox 控制面提供的**免登录**健康检查（无 `/api/v1/devbox` 前缀、无 Bearer）。只证明：网络可达、Devbox API 进程活着——**不**证明 JWT 正确，也**不**创建 Devbox。

**实际请求 URL（默认规则，与 ShipRepo 一致）**

| 用途 | URL |
|------|-----|
| healthz | `https://devbox-server.{SEALOS_HOST}/healthz` |
| 其它 API | `https://devbox-server.{SEALOS_HOST}/api/v1/devbox/...` |

例：`.env` 里 `SEALOS_HOST=192.168.10.189.nip.io` →  
`https://devbox-server.192.168.10.189.nip.io/healthz`

若集群 Devbox 入口不是这个 host，设 `DEVBOX_BASE_URL` 覆盖整段 origin。  
`fetch failed` = 连不上（DNS/TLS/超时/拒绝），不是 HTTP 4xx；脚本会打印 `Request URL` 与 `error.cause`。

**浏览器能开、Node 失败**：常见为 **自签证书**（`Cause: self-signed certificate`）。浏览器可能已点「继续访问」，Node 默认仍校验。本地开发在 `.env` 设 `DEVBOX_TLS_INSECURE=1`（仅 dev 集群；生产勿开）。

**怎么跑**

```bash
cp .env.example .env   # 填 SEALOS_HOST
npm install
npm run devbox:health
```

**通过长什么样**（exit code 0）

```text
Devbox base URL: https://devbox-server.<your-host>
GET /healthz (no auth)
OK  healthz: status=ok
```

**建议多做一步（鉴权）**  
阶段 2 起所有 create/get 都要 JWT，建议同一 `.env` 配好 `DEVBOX_JWT_SIGNING_KEY` 后：

```bash
npm run devbox:health:auth
```

应看到 `OK list devboxes: N item(s)`。若 healthz 过、auth 失败，说明 host 对但密钥/namespace 不对。

**常见失败**

| 现象 | 可能原因 |
|------|----------|
| `Missing SEALOS_HOST` | `.env` 未加载或未配置 |
| `fetch failed` / 超时 | 网络、VPN、`SEALOS_HOST` 写错 |
| HTTP 4xx/5xx on healthz | Devbox 服务未部署或 region 不对 |
| healthz OK，`--auth` 401 | JWT 签名 key 与集群不一致 |

### 阶段 2 — 创建 Devbox + Bootstrap

`POST /api/v1/devbox` 请求体：**省略 `kubeAccess`**（与 ShipRepo 的 `{ enabled: true, roleTemplate: 'edit' }` 刻意区分）。

- [x] `src/lib/devbox/repo-url.mjs`（public `https://github.com/{full_name}.git`）
- [x] `src/lib/devbox/bootstrap.mjs`（`git clone` 公网 URL + `skills add` + 校验 SKILL 存在）
- [x] `src/lib/devbox/provision.mjs`、`create-input.mjs`、`gateway-url.mjs`
- [x] `step-2-2-create-devbox` 接真实现
- [x] 扩展 `context.mjs`（`runId`, `runtimeName`, `gatewayUrl`, …）
- [x] `scripts/devbox-smoke-one-repo.mjs`（provision + verify + delete）
- [x] 验收：本机 `npm run devbox:smoke` 全部 OK

#### 阶段 2 怎么验收？

```bash
# .env: SEALOS_HOST, DEVBOX_JWT_SIGNING_KEY, DEVBOX_TLS_INSECURE=1,
#       CODEX_GATEWAY_OPENAI_API_KEY, BRAIN_SANDBOX_SKILLS_GIT

SMOKE_REPO=ollama/ollama npm run devbox:smoke
```

通过时应看到：`OK provision` → `OK verify workspace` → `OK delete devbox`（exit 0）。

可选：`BENCHMARK_LIMIT=1 npm run benchmark`（2.3 仍为 stub，但 2.2 会真创建 Devbox）。

### 阶段 3 — 调用 Devbox 内置 Gateway（session + turn）

- [x] `src/lib/devbox/gateway-url.mjs`（URL + auth token；阶段 2 `provision` 已写入 `ctx`）
- [x] `src/lib/devbox/gateway/*`（client、session、turn、prompt、completion；轮询 state，无 SSE/DB）
- [x] `step-2-3-run-skill` 接真实现
- [x] `finalize-outcome` / CSV 尊重 `ctx.status` 与 `ctx.error`
- [ ] 验收：本机 `BENCHMARK_LIMIT=1 npm run benchmark` turn 结束且 CSV 正确

#### 阶段 3 怎么验收？

```bash
BENCHMARK_LIMIT=1 npm run benchmark
```

查看 `.data/benchmark-*.csv`：`status` 为 `success` 或 `failed`，`gateway_session_id` 非空（turn 已发起）。  
单仓 turn 可能耗时较长（默认超时 `BENCHMARK_TURN_TIMEOUT_MS=1800000`）。

Turn 结束后会在终端打印完整 **`transcript`**（按条显示 role + 文本），以及最近若干条 `recentEvents`。

#### 推荐测试命令（本地自行执行）

```bash
cd /path/to/brain-skills-benchmark
npm install

# 1) 控制面 + JWT
npm run devbox:health:auth

# 2) 仅阶段 2（create → bootstrap → delete，无 turn，约 1～2 分钟）
SMOKE_REPO=ollama/ollama npm run devbox:smoke

# 3) 端到端单仓（含 turn + transcript 输出，可能 10～30+ 分钟）
BENCHMARK_LIMIT=1 npm run benchmark
```

`.env` 需配置：`SEALOS_HOST`、`DEVBOX_JWT_SIGNING_KEY`、`DEVBOX_TLS_INSECURE=1`、`CODEX_GATEWAY_OPENAI_API_KEY`、`GITHUB_TOKEN`、`BRAIN_SANDBOX_SKILLS_GIT`。

### 阶段 4 — 结果与 CSV

- [x] `finalize-outcome` 不再默认 success
- [x] `append-csv-row` 增加 `error`, `runtime_name`, `gateway_session_id`
- [ ] 验收：批跑 CSV 可追踪失败原因（`BENCHMARK_LIMIT>1`）

### 阶段 5 — 清理与总控

- [ ] `step-2-6-delete-devbox` 接 `DELETE`
- [ ] `src/run.mjs`：`try/finally` 保证删除
- [ ] 验收：批跑后无残留 Devbox（按 upstreamID 检查）

### 阶段 6 — 批跑与稳定性

- [ ] `BENCHMARK_LIMIT>1` 连续跑
- [ ] 文档补充：常见失败与超时调参
- [ ] 更新根目录 `TODO.md`（Devbox 项从 stub 改为 done）

---

## Prompt 与 Skill（阶段 3 实现时注意）

- Bootstrap：`npx --yes skills add "${BRAIN_SANDBOX_SKILLS_GIT}"`（与 `.env.example` 一致）。
- Turn prompt：**不要**引用 `/brain-github-deploy`；改为引导 agent 使用已安装的 sandbox skill（具体文案在 `lib/devbox/gateway/prompt.mjs` 实现时根据 SKILL.md 名称再定）。
- 完成判据仍以 Gateway 为准；是否在 prompt 中要求写 `.sealos/deployment-output.json` 取决于 sandbox skill 文档——**当前不强制**，与 ShipRepo 判据对齐仅指 Gateway 侧。

---

## 变更日志

| 日期 | 说明 |
|------|------|
| 2026-06-03 | 初版：决策锁定、目录约定、阶段 0 完成 |
| 2026-06-03 | public repo 无需 token；Gateway 客户端并入 `lib/devbox/gateway/` |
| 2026-06-03 | 阶段 1 实现：`lib/devbox/*`、`npm run devbox:health` |
| 2026-06-03 | 创建 Devbox 不传 `kubeAccess` |
| 2026-06-03 | 阶段 2 实现：`provision`、`devbox:smoke` |
| 2026-06-03 | 阶段 3 实现：`lib/devbox/gateway/*`、`run-skill` |
