# TODO

完成本列表 = 主流程可跑通（不含 API usage 记录）。

**Devbox / Gateway 移植进度**（决策、阶段清单、目录约定）：[`docs/devbox-port.md`](docs/devbox-port.md)

## 架构（分层）

```text
npm run benchmark
    → run.mjs（根目录，极薄，只启动总控）
        → src/run.mjs（总控：排顺序、跑循环，不写业务）
            → src/steps/step-*/*.mjs（每一步一个目录，如 step-1-load-queue/load-queue.mjs）
```

| 文件 | 职责 |
|------|------|
| `package.json` | `"benchmark": "node run.mjs"` |
| `run.mjs` | npm 唯一入口，`import` 总控并 `await main()` |
| `src/run.mjs` | 建 `context`，按顺序调 step；单仓 `while` 循环 |
| `src/context.mjs` | 批跑共享状态（队列、当前仓、devbox、时间戳、成败、csv 路径） |
| `src/steps/step-*/*.mjs` | 每步 `export async function run(ctx)`，由总控调用 |
| `scripts/filter-top1000-deployable.mjs` | 保留作 reference / 手工调试；队列逻辑与 step 共用一份实现 |

Step 之间只传 `ctx`，总控不出现 clone / skill / CSV 细节。

---

## 0. 入口

- [x] `package.json`：`npm run benchmark` → `node run.mjs`
- [x] 根目录 `run.mjs`：只调用 `src/run.mjs` 的 `main()`

## 1. 组队列

对应 `src/steps/step-1-load-queue/load-queue.mjs`

- [x] 读取/复用 filter 逻辑，得到待遍历的目标仓库列表
- [x] 写入 `ctx.queue`，按顺序逐个消费

## 2. 单仓循环（重复直到 `ctx.queue` 空）

总控 `src/run.mjs` 内：`while` 取下一项 → 依次调 2.1～2.6 的 step → 再下一轮。

### 2.1 开始

对应 `src/steps/step-2-1-mark-started/mark-started.mjs`

- [x] 从 `ctx.queue` 取出当前仓库 → `ctx.current`
- [x] 记录开始时间戳 → `ctx.startedAt`

### 2.2 创建 Devbox

对应 `src/steps/step-2-2-create-devbox/create-devbox.mjs`

- [x] 创建 Devbox，传入本仓所需信息（仓库标识等）— 见 `docs/devbox-port.md` 阶段 2
- [x] 记录 `ctx.runtimeName` / `ctx.gatewayUrl` 等

### 2.3 Devbox 内执行 Skill

对应 `src/steps/step-2-3-run-skill/run-skill.mjs`

- [x] 在 Devbox 内调用 skill（`BRAIN_SANDBOX_SKILLS_GIT` + Gateway turn）— 见 `docs/devbox-port.md` 阶段 3

### 2.4 记录结果

对应 `src/steps/step-2-4-finalize-outcome/finalize-outcome.mjs`

- [x] 记录本仓成功或失败 → `ctx.status`
- [x] 记录结束时间戳 → `ctx.finishedAt`

### 2.5 写 CSV + 本仓 API 用量

对应 `src/steps/step-2-5-append-csv-row/append-csv-row.mjs`

- [x] 拉取 overview，按本仓时间窗汇总用量，追加 CSV 一行

### 2.6 清理

对应 `src/steps/step-2-6-delete-devbox/delete-devbox.mjs`

- [x] 删除 Devbox（每仓必删，`run.mjs` finally）— 见 `docs/devbox-port.md` 阶段 5

### 2.7 下一轮

- [x] 由总控 `while` 处理：队列非空则回到 **2.1**；否则结束
