# 重构计划

## 目标

当前 `brain-skills-benchmark` 是一条长流水线：

1. 加载仓库队列。
2. 创建 Devbox。
3. 初始化 workspace。
4. 通过 Codex Gateway 运行 skill。
5. 定位生成的 template YAML。
6. 对 template 执行 Sealos dry-run。
7. 写入 CSV。
8. 删除 Devbox。

这条路径能跑通，但它把仓库收集、远程执行、产物获取、Sealos 校验、报告和清理都耦合在同一个可变 `ctx` 对象里。

目标架构应该拆成三个独立阶段。阶段之间只通过磁盘上的稳定文件交接，每个阶段都可以单独重跑，不需要知道上一个阶段的内部实现。

## 目标架构

```text
阶段 1：收集并整理仓库列表
  输入：来源相关配置
  输出：manifests/<manifest_id>/repos.jsonl

阶段 2：运行 skill 并获取产物
  输入：repos.jsonl + skill spec + runner config
  输出：runs/<run_id>/<repo_slug>/result.json
        runs/<run_id>/<repo_slug>/artifact/index.yaml
        runs/<run_id>/<repo_slug>/transcript.json
        runs/<run_id>/<repo_slug>/logs.txt

阶段 3：部署或校验到 Sealos
  输入：阶段 2 的运行结果 bundle
  输出：deployments/<deploy_id>/results.jsonl
        deployments/<deploy_id>/results.csv
```

关键边界不是目录怎么放，而是谁拥有哪类数据：

- 阶段 1 只负责发现仓库、整理仓库列表、去重和标准化。
- 阶段 2 只负责运行 skill，并把产物和运行证据保存下来。
- 阶段 3 只负责消费产物，在 Sealos 上 dry-run 或真实部署。

任何阶段都不应该 import 另一个阶段的内部文件来恢复隐藏状态。

## 阶段 1：收集并整理仓库列表

职责：

- 从一个或多个来源获取候选仓库。
- 标准化仓库身份和元数据。
- 去重。
- 写出稳定的 manifest 文件。

初始数据源：

- Sealos Template API。
- 本地 JSON 或 JSONL 文件。
- 已有 benchmark CSV，后续需要时再支持。

输出：`repos.jsonl`

```json
{"repo":"owner/name","repo_url":"https://github.com/owner/name","source":"sealos-template-api","template_name":"app-template","metadata":{}}
```

必填字段：

- `repo`：标准 `owner/name`。
- `repo_url`：可 clone 的仓库 URL。
- `source`：该条目来自哪里。

可选字段：

- `template_name`
- `category`
- `deploy_difficulty`
- `metadata`

阶段 1 不能知道 skill 怎么运行，也不能知道 Devbox、Gateway、YAML 产物路径或 Sealos 部署逻辑。

## 阶段 2：运行 skill 并获取产物

职责：

- 读取 `repos.jsonl`。
- 通过 runner adapter 创建远程或本地执行环境。
- 初始化目标仓库和 skill。
- 运行 skill。
- 获取最终产物和运行证据。
- 为每个仓库写出一个结果 bundle。

当前阶段 2 依赖远程 Devbox。这个依赖应该变成一个 runner 实现，而不是阶段本身的身份。

Runner 接口：

```text
RunnerProvider
  create(repo, runConfig) -> runtime
  bootstrap(runtime, repo, skillSpec) -> workspace
  runSkill(runtime, workspace, promptSpec) -> skillResult
  fetchArtifact(runtime, workspace, artifactSpec) -> artifactFiles
  cleanup(runtime) -> cleanupResult
```

初始实现：

```text
DevboxRunner
```

后续可以新增：

```text
SshRunner
KubernetesJobRunner
DockerRemoteRunner
GitHubActionsRunner
LocalDockerRunner
```

阶段 2 输出：`result.json`

```json
{
  "schema_version": 1,
  "repo": "owner/name",
  "repo_url": "https://github.com/owner/name",
  "run_id": "2026-06-11_10-30-00",
  "status": "success",
  "started_at": "2026-06-11T02:30:00.000Z",
  "finished_at": "2026-06-11T02:48:12.000Z",
  "runner": "devbox",
  "artifact": {
    "type": "sealos-template-yaml",
    "path": "artifact/index.yaml",
    "found": true
  },
  "transcript_path": "transcript.json",
  "logs_path": "logs.txt",
  "usage": {
    "api_requests": 0,
    "api_tokens": 0,
    "api_cost_usd": 0
  },
  "runner_metadata": {
    "runtime_name": "benchmark-...",
    "gateway_session_id": "...",
    "gateway_thread_id": "..."
  },
  "error": null
}
```

规则：

- `runner_metadata` 可以包含 Devbox 特有字段。
- 顶层字段必须保持 runner 无关。
- 阶段 3 只能依赖 `artifact.path`、`status` 和仓库身份。
- 产物获取必须发生在 cleanup 之前。
- cleanup 失败要记录下来，但不能覆盖已经获取到的产物。

## 阶段 3：部署或校验到 Sealos

职责：

- 读取阶段 2 的结果 bundle。
- 选出成功运行且已经获取 Sealos template 产物的仓库。
- 在 Sealos 上对 template 执行 dry-run 或真实部署。
- 写出部署结果。

输入：

```text
runs/<run_id>/<repo_slug>/result.json
runs/<run_id>/<repo_slug>/artifact/index.yaml
```

输出：`results.jsonl`

```json
{"repo":"owner/name","run_id":"2026-06-11_10-30-00","status":"success","mode":"dry-run","artifact_path":"runs/.../artifact/index.yaml","sealos_instance_name":"...","error":null}
```

阶段 3 不能知道产物来自 Devbox、SSH、Kubernetes、Local Docker 还是 GitHub Actions。

## 建议的 CLI

保留一个仓库和一个 package，不拆成多个服务。

```text
npm run collect
npm run run-skill
npm run deploy-sealos
npm run benchmark
```

`npm run benchmark` 可以继续作为一键命令，把三个阶段串起来：

```text
collect -> run-skill -> deploy-sealos
```

但实现上应该调用阶段入口，并显式传入输入、输出路径，不能继续共享一个进程级可变 `ctx`。

## 建议的目录结构

```text
src/
  stages/
    collect/
      cli.mjs
      collect-from-sealos.mjs
      manifest.mjs
    run-skill/
      cli.mjs
      run-stage.mjs
      result-bundle.mjs
      runners/
        devbox-runner.mjs
        runner-contract.mjs
    deploy-sealos/
      cli.mjs
      deploy-stage.mjs
      deployment-result.mjs
  lib/
    devbox/
    gateway/
    sealos/
    report/
    schema/
```

现有 `src/lib/devbox/*` 可以保留，但应该只被 `DevboxRunner` 使用。

## 迁移计划

### 第一步：定义数据契约

先为下面这些文件格式增加纯 helper：

- `repos.jsonl`
- 阶段 2 的 `result.json`
- 阶段 3 的 `results.jsonl`

这一步要先于代码搬迁。第一目标是把阶段之间的数据契约固定下来。

### 第二步：抽出阶段 1

把当前 Sealos template 队列逻辑从：

```text
src/steps/step-1-load-queue/
```

迁移到：

```text
src/stages/collect/
```

新的命令只负责写出 manifest 文件，然后退出。

### 第三步：用 DevboxRunner 抽出阶段 2

把现有 Devbox 流程包在 `DevboxRunner` 后面：

- 创建 Devbox。
- 等待 Running。
- 初始化 workspace。
- 创建 Gateway session。
- 运行 turn。
- 定位 template YAML。
- 获取 artifact。
- 清理环境。

阶段 2 应该为每个仓库写出结果 bundle，不应该调用 Sealos dry-run。

### 第四步：抽出阶段 3

把 template dry-run 逻辑从：

```text
src/steps/step-2-6-dryrun-template/
src/lib/sealos/
```

迁移到独立 deploy stage。这个阶段只消费阶段 2 的 result bundle。

### 第五步：重建 `benchmark`

把当前端到端行为重新实现为阶段组合：

```text
collect manifest -> run skill -> deploy sealos -> write aggregate CSV
```

聚合 CSV 应该从已经保存的阶段输出生成，不能依赖实时内存里的可变 `ctx`。

## 重构时必须顺手修的问题

当前每个仓库开始时没有重置 template 和 dry-run 字段。如果某个仓库没有生成新产物，下一次 dry-run 可能误用上一个仓库的 `templateYamlContent`。

这个问题要在阶段 2 抽出前或抽出过程中修掉。做法是不要复用批次级 `ctx` 字段，而是为每个仓库创建新的 per-repo state。

## 设计决策

1. 阶段之间用文件作为契约。
   原因：benchmark 运行时间长、成本高、失败概率也高。文件契约可以让重试和审计变得明确。

2. runner 特有数据只能放在 `runner_metadata`。
   原因：Devbox 只是一个环境实现。新增 runner 时，阶段 3 不应该跟着改。

3. 不拆成多个仓库或多个服务。
   原因：这个项目本质上还是 CLI benchmark 工具。进程级拆分会增加运维成本，但不能解决核心耦合。

4. `benchmark` 保留为组合命令。
   原因：用户仍然需要一键运行，但内部必须能按阶段恢复和重跑。

5. 先做小的纯 schema helper，再移动大量代码。
   原因：主要风险是状态耦合，不是文件位置。先固定契约，可以降低后续搬代码的风险。

## 成功标准

- 仓库 manifest 可以生成一次，并被多次 skill run 复用。
- 阶段 2 可以只重跑失败仓库，不需要重新收集队列。
- 阶段 3 可以基于已有 artifact 重跑，不需要重新创建远程环境。
- 新增第二个 runner 时，不需要改阶段 1 和阶段 3。
- 远程环境删除后，`result.json` 仍然保留足够的审计证据。
- 聚合报告来自已保存的阶段输出，而不是临时内存状态。
