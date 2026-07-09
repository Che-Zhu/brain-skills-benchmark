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

如果目标 public GitHub repo 不在当前 Sealos template queue 中，但仍需要作为 validation / exploratory 样本跑完整流程，可以显式开启 direct repo fallback：

```bash
BENCHMARK_ALLOW_DIRECT_REPO=1 BENCHMARK_REPO=owner/repo npm run benchmark
```

**约束**

- `BENCHMARK_REPO` 格式为 `owner/repo`（与 GitHub `full_name` 一致）。
- 默认情况下，目标仓库必须出现在 `SEALOS_TEMPLATE_API_URL` 拉取的 template 队列中；未匹配到会直接报错退出。
- 只有设置 `BENCHMARK_ALLOW_DIRECT_REPO=1` 时，未命中 template queue 的 `BENCHMARK_REPO` 才会作为 direct synthetic queue item 运行。结果应标注它不是 Sealos template queue 样本，避免和 queue 覆盖率混淆。
- 单仓 Gateway turn 默认最长 30 分钟（`BENCHMARK_TURN_TIMEOUT_MS`）；跑之前确认 `.env` 中 Sealos / Devbox / Gateway / `BRAIN_SANDBOX_SKILLS_GIT` 等已配置。

**示例**

```bash
BENCHMARK_REPO=AykutSarac/jsoncrack.com npm run benchmark
```

结果 CSV 与 template YAML 落在 `.report/` 下。

## Benchmark 结果记录方式

如果本轮 benchmark 已指定 Google Drive 文档（Google Doc / Sheet，以用户给出的载体为准），该 Drive 文档是结果事实源；仓库内的 `test-set.md`、`validation-set.md`、`production-test.md`、CSV 和 `.report/` 文件只作为本地快照、导出或排障证据。

记录要求：

- 每个项目跑完后立即把结果写回 Drive 文档对应行的 comment / result 区域，不要等整轮结束后凭记忆批量补。
- comment 必须区分 runner 状态、skill 语义结果、fresh build / reuse-image 决策、Kaniko / GHCR / dryRun / checker 结果；dryRun 成功不能等同于镜像构建成功或应用可运行。
- 若发生失败、超时、Gateway 503、模型容量、Kaniko OOM / timeout、checker 缺依赖、template renderer 报错等，需要写清楚根因证据和下一步优化点。
- 若样本不是 Sealos template queue 正常来源，而是 `BENCHMARK_ALLOW_DIRECT_REPO=1` 的 direct fallback，必须在结果中标注，避免混入 queue 覆盖率判断。
- Drive 文档不可访问、连接器不可用或无法确认目标文档时，先停止并向用户确认；不要静默改写本地 md/csv 当作最终事实源。
- 不要在 Drive 文档、仓库文件或回复中写入 Google OAuth token、GitHub token、kubeconfig secret、registry secret 等凭据内容。

## Staged Simple 小批回归 benchmark

这个流程只用于小批量回归验证，不作为任意多仓 benchmark 模板扩展。测试仓库固定为下面的 `REPOS`：

按顺序逐个跑这些仓库，每次只设 `BENCHMARK_REPO`（仓间默认间隔 2 分钟，由 `src/run.mjs` 控制）：

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

- 这批 repo 就是该 benchmark 的固定输入；调整覆盖范围时直接改这里的 `REPOS`。
- 每个 `owner/repo` 须在 `SEALOS_TEMPLATE_API_URL` 拉取的 template 队列中。
- Skill 版本由 `.env` 的 `BRAIN_SANDBOX_SKILLS_GIT` 决定；分支名含 `/` 时（如 `feat/phase2-detect-priority`）bootstrap 会自动用 `--ref` 安装。
- 六仓端到端约 1–2 小时；单仓 turn 默认最长 30 分钟。
- 批量日志在 `.report/staged-simple-batch-*.log`；每仓 CSV 在 `.report/benchmark-*.csv`。

## 集群与 Devbox 访问方式

首选通过项目封装的 Devbox exec API 进入目标 Devbox，不直接 ssh：

```bash
node --input-type=module <<'NODE'
import { loadEnvFile } from './src/lib/load-env.mjs'
import { execDevbox } from './src/lib/devbox/client.mjs'

loadEnvFile()

const result = await execDevbox('<devbox-name>', {
  command: ['bash', '-lc', '<command>'],
  timeoutSeconds: 120,
})

console.log(result.data.stdout || '')
console.error(result.data.stderr || '')
if (result.data.exitCode !== 0) process.exit(result.data.exitCode || 1)
NODE
```

只有在 Devbox 创建失败、节点容量、旧 Pod 堆积等基础设施问题需要排查时，才使用本地 kubeconfig 查集群状态：

```bash
KUBECONFIG=.kube/189-admin.yaml kubectl ...
```

注意：业务流程中的 Kaniko Job / Secret / Pod 日志应在 Devbox 内使用 sandbox-provided kubeconfig 和当前 service account 操作，不要用 admin kubeconfig 替代 sandbox 权限模型。避免直接打印可能包含敏感环境变量的 `kubectl describe pod`；优先用 `kubectl get ... -o jsonpath`、自定义列和 `kubectl logs`。

## Benchmark 后集群清理检查

benchmark 跑完后需要把“还在运行的东西”和“静态临时垃圾”分开确认。先用项目 Devbox API 确认没有残留 Devbox：

```bash
node --input-type=module -e "import { loadEnvFile } from './src/lib/load-env.mjs'; import { listDevboxes } from './src/lib/devbox/client.mjs'; loadEnvFile(); const r = await listDevboxes(); const items = r?.data?.items ?? []; console.log('total=' + items.length);"
```

再从本轮日志或 dryRun 输出确认目标 namespace。只有排查基础设施残留时使用本地 admin kubeconfig，例如：

```bash
KUBECONFIG=.kube/189-admin.yaml kubectl -n <namespace> get pods -o 'custom-columns=NAME:.metadata.name,PHASE:.status.phase,RESTARTS:.status.containerStatuses[*].restartCount,JOB:.metadata.labels.job-name,CREATED:.metadata.creationTimestamp' --no-headers
KUBECONFIG=.kube/189-admin.yaml kubectl -n <namespace> get jobs -o 'custom-columns=NAME:.metadata.name,STATUS:.status.conditions[*].type,ACTIVE:.status.active,SUCCEEDED:.status.succeeded,FAILED:.status.failed,CREATED:.metadata.creationTimestamp' --no-headers
KUBECONFIG=.kube/189-admin.yaml kubectl -n <namespace> get configmap,pvc,svc,deploy,statefulset,ingress -o name | rg 'bm-20|seakills|kaniko|jsoncrack|inpaint|illa|excalidraw|it-tools|umami'
```

Secret 只能看名字、类型、创建时间、label / owner，不要打印 data：

```bash
KUBECONFIG=.kube/189-admin.yaml kubectl -n <namespace> get secrets -o 'custom-columns=NAME:.metadata.name,TYPE:.type,CREATED:.metadata.creationTimestamp,LABELS:.metadata.labels' --no-headers | rg '^seakills-(ghcr-auth|kaniko-s3)-'
```

清理边界：

- 目标 namespace 内，`seakills-ghcr-auth-*`、`seakills-kaniko-s3-*` 这类 benchmark 临时 Secret 若无 owner、无业务 label，且未被 Pod / Deployment / StatefulSet / Job / CronJob 引用，可以删除。
- 删除前先确认引用关系：

```bash
KUBECONFIG=.kube/189-admin.yaml kubectl get pods,deploy,statefulset,job,cronjob --all-namespaces -o json | jq -r '.. | objects | select(has("secretName")) | .secretName? // empty' | sort -u | rg '^seakills-(ghcr-auth|kaniko-s3)-'
```

- 跨 namespace 发现的 Running 应用、Instance、Deployment、Service、Ingress 默认只报告，不直接删除；除非能证明属于本轮 benchmark 且用户确认清理。
- 已清理后复查目标 namespace 的 Pod / Job / Secret，确认没有 benchmark 命名模式的残留对象。
