# Agent notes

## 端到端单仓 benchmark

指定单个仓库跑完整 benchmark（Devbox → skill turn → template YAML 落盘 → dryRun → CSV）：

```bash
BENCHMARK_REPO=owner/repo npm run benchmark
```

也可按 Sealos template 名称过滤（大小写不敏感）：

```bash
BENCHMARK_TEMPLATE_NAME=some-template-name npm run benchmark
```

**约束**

- `BENCHMARK_REPO` 格式为 `owner/repo`（与 GitHub `full_name` 一致）。
- 目标仓库必须出现在 `SEALOS_TEMPLATE_API_URL` 拉取的 template 队列中；未匹配到会直接报错退出。
- 单仓 Gateway turn 默认最长 30 分钟（`BENCHMARK_TURN_TIMEOUT_MS`）；跑之前确认 `.env` 中 Sealos / Devbox / Gateway / `BRAIN_SANDBOX_SKILLS_GIT` 等已配置。

**示例**

```bash
BENCHMARK_REPO=AykutSarac/jsoncrack.com npm run benchmark
```

结果 CSV 与 template YAML 落在 `.report/` 下。

## 端到端多仓 benchmark

按顺序逐个跑多个仓库，每次只设 `BENCHMARK_REPO`（仓间默认间隔 2 分钟，由 `src/run.mjs` 控制）：

```bash
REPOS=(
  "CorentinTh/it-tools"
  "AykutSarac/jsoncrack.com"
  "excalidraw/excalidraw"
  "lxfater/inpaint-web"
  "illacloud/illa-builder"
  "umami-software/umami"
)

LOG=".report/staged-simple-batch-$(date +%Y-%m-%d_%H-%M-%S).log"
mkdir -p .report

for repo in "${REPOS[@]}"; do
  echo "=== BENCHMARK_REPO=$repo $(date -Iseconds) ===" | tee -a "$LOG"
  BENCHMARK_REPO="$repo" npm run benchmark 2>&1 | tee -a "$LOG"
  echo "=== done $repo exit=$? $(date -Iseconds) ===" | tee -a "$LOG"
done
```

**说明**

- 仓库列表与 `staged-simple-projects/README.md` 一致；每个 `owner/repo` 须在 template 队列中。
- Skill 版本由 `.env` 的 `BRAIN_SANDBOX_SKILLS_GIT` 决定；分支名含 `/` 时（如 `feat/phase2-detect-priority`）bootstrap 会自动用 `--ref` 安装。
- 六仓端到端约 1–2 小时；单仓 turn 默认最长 30 分钟。
- 批量日志在 `.report/staged-simple-batch-*.log`；每仓 CSV 在 `.report/benchmark-*.csv`。
