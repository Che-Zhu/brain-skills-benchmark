# brain-skills-benchmark

在 Sealos Devbox 上对一批可部署的 GitHub 仓库批量跑 sandbox skill（Codex Gateway turn），并把每仓结果写入 CSV。

## 快速开始

```bash
npm install
cp .env.example .env
# 编辑 .env，填入 Sealos / Devbox、GitHub、Gateway、技能仓库等必填项
npm run benchmark
```

主入口就是 **`npm run benchmark`**（内部执行 `node run.mjs` → `src/run.mjs`）。

## 流程概览

1. 从 `2000-repos/top1000-analysis-v3.json` 读取 `deployable === true` 的仓库，按 `BENCHMARK_LIMIT`（默认 5）取前 N 个。
2. 对每个仓库：创建 Devbox → bootstrap → Gateway turn → **拉取本仓 API 用量并追加 CSV 一行** → 删除 Devbox。
3. 若队列里还有下一个仓库，**等待 2 分钟** 再开始下一仓。

更细的 Devbox / Gateway 移植说明见 [`docs/devbox-port.md`](docs/devbox-port.md)。

## 环境变量

复制 [`.env.example`](.env.example) 后至少配置：

| 变量 | 说明 |
|------|------|
| `SEALOS_HOST` | Sealos 集群主机名 |
| `DEVBOX_TLS_INSECURE` | 自签证书集群时设为 `1` |
| `DEVBOX_JWT_SIGNING_KEY` 或 `DEVBOX_TOKEN` | Devbox API 认证（二选一） |
| `GITHUB_TOKEN` | 注入 Devbox，供 skill 推镜像等 |
| `CODEX_GATEWAY_OPENAI_API_KEY` | Devbox 内 Codex Gateway |
| `BRAIN_SANDBOX_SKILLS_GIT` | `npx skills add` 的技能仓库 URL |
| `BENCHMARK_LIMIT` | 本次批跑仓库数量（默认 `5`） |

常用可选项：`BENCHMARK_TURN_TIMEOUT_MS`（turn 超时，默认 30 分钟）、`BENCHMARK_TURN_POLL_MS`、`BENCHMARK_DEVBOX_BOOTSTRAP_TIMEOUT_MS` 等，见 `.env.example`。

## 结果

批跑结束后，终端会打印 CSV 路径。文件写在仓库根目录 **`.report/`** 下，例如：

```text
.report/benchmark-2026-06-04_11-02-33.csv
```

列：`full_name`, `status`, `error`, `started_at`, `finished_at`, `runtime_name`, `gateway_session_id`, `duration`, `api_requests`, `api_tokens`, `api_cost_usd`。每仓跑完后立即追加一行；用量按该仓 `started_at`～`finished_at` 从 overview API 汇总（与 `scripts/fetch-overview-records.mjs` 同源）。

`.report/` 已在 `.gitignore` 中忽略。

## 调试命令

在跑完整批跑前，可先验证控制面与单仓链路：

```bash
npm run devbox:health:auth    # Devbox API + JWT
SMOKE_REPO=ollama/ollama npm run devbox:smoke   # 单仓 create → bootstrap → delete（无 turn）
BENCHMARK_LIMIT=1 npm run benchmark             # 端到端单仓（含 turn，可能较久）
```

## 项目结构

```text
run.mjs              # npm 入口
src/run.mjs          # 总控循环
src/context.mjs      # 批跑共享状态
src/steps/step-*     # 各步骤（队列、Devbox、skill、CSV、清理）
src/lib/             # Devbox API、Gateway 客户端、队列加载等
2000-repos/          # 仓库列表与分析 JSON
```
