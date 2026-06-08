# Task: 改用 Sealos Template 列表作为 benchmark 测试集

> 分支：`feat/sealos-template-benchmark-queue`  
> 对应 ROADMAP：[ROADMAP.md § 测试集与 Skill 质量](./ROADMAP.md)（P0 下一步）

## 背景

当前 benchmark 队列来自本地 JSON：`2000-repos/top1000-representative-deployable-apps.json`（约 1000 条，经人工/脚本筛选的「可部署代表性仓库」）。

ROADMAP 提议改为 **Sealos App Store 已上架 template** 作为测试集——认为其部署形态更成熟、质量更高，更适合评估 sandbox skill 能否产出 Sealos 可消费的 template。

## 现状（代码触点）

| 位置 | 作用 |
|------|------|
| `src/steps/step-1-load-queue/load-templates-from-sealos.mjs` | fetch API → filter GitHub → `{ full_name }[]` |
| `src/steps/step-1-load-queue/index.mjs` | benchmark 第一步：加载队列到 `ctx.queue` |
| `src/lib/load-env.mjs` | `validateBenchmarkEnv()` 含 `SEALOS_TEMPLATE_API_URL` 等必填项 |
| 下游 | 整条 Devbox 链路依赖 `ctx.current.full_name`（`owner/repo`）构建 clone URL、日志、CSV |

队列条目：`{ full_name }`；CSV 的 `category` / `deploy_difficulty` 列为空。

## 数据源

```
GET https://template.usw-1.sealos.io/api/listTemplate?language=en
```

响应结构：

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "templates": [ /* Template CRD 对象 */ ],
    "menuKeys": [ /* ... */ ]
  }
}
```

每个 template 关键字段（实测）：

- `metadata.name` — template 标识（如 `Reactive-Resume`）
- `spec.title`, `spec.description`, `spec.categories[]`
- `spec.gitRepo` — 源码仓库 URL（GitHub / Codeberg / 其他）
- `spec.author`, `spec.deployCount`, `spec.templateType`, …

当前约 **162** 个 template（数量会随 App Store 变化）。

## 目标

1. benchmark 启动时 **运行时 `fetch`** Sealos Template API，不再读本地 top1000 JSON。
2. 队列项仅含下游必需字段：`{ full_name }`（从 `spec.gitRepo` 解析，**仅 GitHub**）。
3. 保持 `BENCHMARK_LIMIT`、现有 CSV 列、Devbox 流程不变。
4. 删除 `2000-repos/top1000-representative-deployable-apps.json`；无 top1000 fallback、无队列缓存文件。

## 已确认决策

### 1. 加载策略 → **运行时 fetch API**

每次 `npm run benchmark` 第一步向 API 拉取最新 template 列表，在内存中映射为队列。不提交、不生成本地队列 JSON。

代价：需要网络；离线/无 API 时 benchmark 无法启动（启动即 fail fast）。

### 2. 非 GitHub `gitRepo` → **仅保留 GitHub**

`gitRepo` 非 `github.com` 的 template 直接过滤，不进入队列。下游 `repo-url.mjs` 零改动。启动日志可打印过滤数量（API 总数 vs 入队数）。

### 3. 队列项形状 → **最小兼容**

```json
{ "full_name": "AmruthPillai/Reactive-Resume" }
```

不扩展 CSV 列；`category`、`deploy_difficulty` 等旧 top1000 字段在 CSV 中留空或沿用现有列的默认空值（实现时对齐 `csv-report.mjs`）。

### 4. 旧 top1000 → **删除默认源文件**

- 删除 `2000-repos/top1000-representative-deployable-apps.json`
- 不设 `BENCHMARK_QUEUE_SOURCE` 切换；Sealos API 为唯一队列源
- `2000-repos/` 下其他分析用 JSON 可保留，与 benchmark 队列无关

### 5. 缓存文件 → **不需要**

「缓存」是决策 1 里 **方案 B/C** 的概念：把 API 响应写成 repo 内 JSON，便于离线跑和 git diff。你已选 **方案 A（运行时 fetch）**，因此：

- **不需要** `data/sealos-templates-queue.json` 或类似落盘文件
- **不需要** `npm run fetch-templates` 生成脚本
- 队列只在进程内存里存在，跑完即释放

若日后需要可复现快照（例如 CI 固定用例集），可再加可选 env（如 `BENCHMARK_QUEUE_FILE`）读本地 JSON；**本次不做**。

## 建议实施步骤（草案）

以下顺序可在讨论后调整：

- [x] **Step 0 — 对齐决策**（2026-06-08）

- [x] **Step 1 — API 客户端 & 映射**（2026-06-08）  
  - `load-templates-from-sealos.mjs` — fetch → filter GitHub → `{ full_name }[]`  
  - `index.mjs` 调用 `loadTemplatesFromSealos`

- [x] **Step 2 — 清理旧队列**（2026-06-08）  
  - 删除 `deployable-queue.mjs`、`top1000-representative-deployable-apps.json`  
  - 删除依赖 top1000 的 `enrich-benchmark-csv.mjs`、`patch-queue-deploy-difficulty.mjs`

- [x] **Step 3 — 文档**（2026-06-08）  
  - 更新 `README.md`、`scripts/README.md`、`ROADMAP.md`

- [ ] **Step 4 — 验证**  
  - `BENCHMARK_LIMIT=1` 冒烟一条 GitHub template。  
  - 确认 CSV、`full_name` 日志、Devbox clone URL 正确。

- [ ] **Step 5 — ROADMAP**  
  - 勾选 ROADMAP 对应 checkbox（交付时）。

## 决策记录

| 议题 | 决定 | 日期 |
|------|------|------|
| 加载策略 | 运行时 fetch API；无本地队列文件 | 2026-06-08 |
| 非 GitHub 仓库 | 过滤，仅 `github.com` 入队 | 2026-06-08 |
| 队列 / CSV | 队列项仅 `{ full_name }`；CSV 不增列 | 2026-06-08 |
| 旧 top1000 | 删除 `top1000-representative-deployable-apps.json`；无 fallback | 2026-06-08 |
| 缓存文件 | 不需要（与运行时 fetch 一致） | 2026-06-08 |

## 验收标准（草案）

1. `npm run benchmark` 默认处理 Sealos template 队列（条数 ≈ API 可映射 GitHub 数，或文档写明过滤规则）。
2. `BENCHMARK_LIMIT=N` 仍只取前 N 条。
3. 至少 1 条 end-to-end 跑通（Devbox 创建 → skill → CSV 行）。
4. README / `.env.example` 反映新数据源；top1000 队列文件已删除。

## 参考

- ROADMAP 条目：[`ROADMAP.md`](./ROADMAP.md)
- 队列加载：[`src/steps/step-1-load-queue/`](./src/steps/step-1-load-queue/)

---

**下一步：** Step 4 — `BENCHMARK_LIMIT=1` 端到端冒烟验证。
