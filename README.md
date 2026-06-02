# brain-skills-benchmark

**sealos-deploy** skill 的自动化验证与评估工具。项目目标不是对外「部署」业务仓库，而是在真实 GitHub 仓库上批量跑 skill，衡量其质量。

## 唯一路径

在本机发起命令，实际工作在 **Sealos Devbox** 内完成；结果与指标回写到本机：

```text
本机 CLI (npm run deploy)
        │
        ▼
Devbox：克隆仓库 → Codex Gateway 跑 /sealos-deploy → 沙箱内 kubectl apply
        │
        ▼
本机：.data/deploy-tasks/<id>.json（阶段、事件、token/耗时、成败）
```

面对 **2000+** 目标仓库，批量化回归是本项目的核心场景。流水线与 Brain UI 侧一致（本仓库从 `apps/ui` 抽出 deploy 逻辑），但**不启动 Next.js / Postgres**。

### 评估维度

| 维度 | 说明 |
|------|------|
| **AI Token 消费** | Codex / Gateway 侧 token 用量与对应金额 |
| **耗时** | 各阶段与端到端 wall time |
| **成功率** | 产物是否齐全、apply 是否成功、task 是否 `completed` |

## 能做什么

**跑测** `npm run deploy`：对单个仓库走上述 Devbox 全流程，在本机 `.data/deploy-tasks/` 落盘指标。批量 2000+ 仓的调度尚未实现，需自行包装 `deploy` 或后续加批跑脚本。

## 与 Brain UI 的关系

```text
Brain UI（用户产品）
        │
        │  同一套 Devbox + Gateway + skill + apply
        ▼
本仓库 CLI（`npm run deploy` + 本地 task JSON）
```

## 快速开始

### 1. 安装依赖

```bash
cd brain-skills-benchmark
npm install
cp .env.example .env
# SEALOS_HOST、DEVBOX_*、GITHUB_TOKEN、CODEX_GATEWAY_OPENAI_API_KEY、BRAIN_SANDBOX_SKILLS_GIT
```

### 2. 跑一个仓库

```bash
npm run deploy -- \
  --namespace your-namespace \
  --repo owner/repo \
  --branch main \
  --project-name my-brain-project
```

结束后查看 `.data/deploy-tasks/<taskId>.json`。

## 环境变量

见 [`.env.example`](./.env.example)。跑测必填通常包括：

- **Devbox**：`SEALOS_HOST` + `DEVBOX_TOKEN` 或 `DEVBOX_JWT_SIGNING_KEY`
- **GitHub**：`GITHUB_TOKEN`
- **Codex**：`CODEX_GATEWAY_OPENAI_API_KEY`（及可选 `CODEX_GATEWAY_OPENAI_BASE_URL`、`CODEX_GATEWAY_MODEL`）
- **Skill 安装**：`BRAIN_SANDBOX_SKILLS_GIT`（Devbox 内 `npx skills add` 用的 git URL）

## 命令

```bash
npm run deploy -- --namespace <ns> --repo <owner/repo> --project-name <name> [--branch main]
```

## 目录结构

```text
src/brain-deploy/     # Devbox 跑测流水线（task-store、runner、gateway）
docs/                 # 中文设计说明
```

## 进一步阅读

- [docs/部署流程.md](./docs/部署流程.md) — Devbox 各阶段与故障排查
