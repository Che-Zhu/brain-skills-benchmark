# brain-skills-benchmark

**sealos-deploy** 的自动化部署与契约验证工具 —— **不依赖 Brain UI**，但走与产品相同的运行时链路：**Devbox → deploy task → Codex Gateway → skill → kubectl apply**。

## 能做什么

| 能力 | 说明 |
|------|------|
| **自动化部署** `deploy run` | 创建 deploy task、起 Devbox、克隆仓库、调 Codex 跑 `/sealos-deploy`、在沙箱内 apply AP |
| **契约验证** `validate` / `suite` | 校验 `.sealos/deployment-output.json` 与 Crossplane YAML（离线 fixture 或手工跑完后的工作区） |
| **用例目录** `cases` | 从 `brain-sandbox-skills` 同步 eval 元数据，便于 CI / 批跑规划 |

## 与 Brain UI 的关系

```text
Brain UI（创建项目、侧栏、轮询）
        │
        │  同一套服务端逻辑（本仓库从 apps/ui 抽出）
        ▼
Devbox API ──► deploy task（本地 JSON 落盘）──► Codex Gateway ──► sealos-deploy
        │
        ▼
kubectl apply（在 Devbox 内，对用户 namespace 有 edit 权限）
```

本仓库 **不启动 Next.js**，也不要求 Postgres；deploy task 状态写在 `.data/deploy-tasks/<id>.json`。

## 快速开始

### 1. 安装依赖

```bash
cd brain-skills-benchmark
npm install
cp .env.example .env
# 编辑 .env：SEALOS_HOST、DEVBOX_TOKEN 或 DEVBOX_JWT_SIGNING_KEY、GITHUB_TOKEN、CODEX_GATEWAY_OPENAI_API_KEY
```

也可复用 `../brain/apps/ui/.env.local`（`load-env` 会自动尝试加载）。

### 2. 自动化部署一个仓库

```bash
npm run deploy -- \
  --namespace your-namespace \
  --repo owner/repo \
  --branch main \
  --project-name my-brain-project
```

或使用 CLI 入口：

```bash
node bin/benchmark.mjs deploy run \
  --namespace your-namespace \
  --repo https://github.com/owner/repo \
  --project-name my-brain-project
```

成功后可在 `.data/deploy-tasks/<taskId>.json` 查看阶段、事件与 artifact 摘要。

### 3. 仅验证已有产物（不调 Devbox）

```bash
npm test
npm run validate -- fixtures/succeeded-minimal
npm run validate -- /path/to/repo-with-.sealos
```

## 环境变量

见 [`.env.example`](./.env.example)。要点：

- **Devbox**：`SEALOS_HOST` + `DEVBOX_TOKEN` 或 `DEVBOX_JWT_SIGNING_KEY`
- **GitHub**：`GITHUB_TOKEN`（私有库克隆、GHCR 推送；benchmark 不读 UI OAuth 库）
- **Codex**：`CODEX_GATEWAY_OPENAI_API_KEY`（以及可选 `CODEX_GATEWAY_OPENAI_BASE_URL`、`CODEX_GATEWAY_MODEL`）
- **沙箱技能仓库**：`BRAIN_SANDBOX_SKILLS_GIT`（必填；Devbox 内 `npx skills add`，示例见 `.env.example`）

## 命令一览

```bash
# 端到端部署（Devbox + Codex + skill + apply）
npm run deploy -- --namespace <ns> --repo <owner/repo> --project-name <name> [--branch main]

# 契约验证
npm run validate -- [--profile contract|full] <workspace>
npm run suite

# 用例 / fixture
npm run cases:sync
npm run fixtures:generate
node bin/benchmark.mjs cases list
```

## 目录结构

```text
src/brain-deploy/     # 从 Brain apps/ui 抽出的 deploy 流水线（TypeScript + tsx）
  devbox/               # Devbox HTTP 客户端
  deploy/               # task-store、runner、gateway、artifacts
src/lib/                # 契约验证（纯 Node）
fixtures/               # 离线 golden workspace
cases/manifest.json     # eval 用例元数据
docs/                   # 中文设计说明
```

## Skill 源码位置

契约校验会加载 sibling 仓库中的 `artifact-validator.mjs`：

1. `BRAIN_SANDBOX_SKILLS`
2. `../brain-sandbox-skills`
3. `../brain/brain-sandbox-skills`

沙箱内安装 skill 使用 `BRAIN_SANDBOX_SKILLS_GIT`（见 `.env.example`）；离线契约校验仍用本地 `BRAIN_SANDBOX_SKILLS` 路径。

## 进一步阅读

- [docs/部署流程.md](./docs/部署流程.md) — 各阶段说明与故障排查
