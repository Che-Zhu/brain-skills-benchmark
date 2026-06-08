# scripts

benchmark 主流程（`npm run benchmark`）之外的独立工具脚本。多数脚本读取仓库根目录的 `.env`，可直接用 `node scripts/<file>` 运行。

| 文件 | 作用 | 典型用法 |
|------|------|----------|
| [`devbox-health.mjs`](devbox-health.mjs) | 检查 Devbox API 连通性；加 `--auth` 时顺带验证 JWT 能否列出 Devbox | `npm run devbox:health` / `npm run devbox:health:auth` |
| [`devbox-smoke-one-repo.mjs`](devbox-smoke-one-repo.mjs) | 单仓冒烟：创建 Devbox → bootstrap → 校验工作区 → 删除（不跑 Gateway turn） | `SMOKE_REPO=ollama/ollama npm run devbox:smoke` |
| [`fetch-overview-records.mjs`](fetch-overview-records.mjs) | 拉取 Codex Gateway overview 用量记录（与 benchmark CSV 汇总同源） | `node scripts/fetch-overview-records.mjs` |

## 建议使用顺序

调试 Sealos / Devbox 链路时，建议由浅入深：

1. `devbox-health.mjs` — 控制面是否可达  
2. `devbox-smoke-one-repo.mjs` — 单仓创建与 bootstrap 是否正常  
3. `npm run benchmark`（`BENCHMARK_LIMIT=1`）— 端到端含 Gateway turn  

分析 API 用量明细 → `fetch-overview-records.mjs`
