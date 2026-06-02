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

| 能力 | 说明 |
|------|------|
| **跑测** `npm run deploy` | 对单个仓库走上述 Devbox 全流程并落盘指标 |
| **用例目录** `cases` | 从 skill 仓库同步 eval 元数据（`cases:sync`），支撑批量跑测规划 |

## 与 Brain UI 的关系

```text
Brain UI（用户产品）
        │
        │  同一套 Devbox + Gateway + skill + apply
        ▼
brain-skills-benchmark（CLI + 本地 task JSON，用于 benchmark）
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

## 命令一览

```bash
# 跑测（唯一产品路径）
npm run deploy -- --namespace <ns> --repo <owner/repo> --project-name <name> [--branch main]

# 用例清单（批量规划）
npm run cases:sync
npm run benchmark -- cases list
```

## 目录结构

```text
src/brain-deploy/     # Devbox 跑测流水线（task-store、runner、gateway）
src/lib/              # 仓库内契约检查实现（见下）
fixtures/             # 维护用 golden 样本
cases/manifest.json   # eval 用例元数据
docs/                 # 中文设计说明
```

### 关于 `validate` / `suite` / `npm test`

仓库里仍有对本机目录做 schema/契约检查的命令（`npm run validate`、`suite`、`npm test`），用于**维护本仓库的 fixture 与回归测试**，不是另一条「离线跑 skill」的产品路径。真实 skill 验证只通过 Devbox 跑测完成；runner 在 apply 前也会在 Devbox 内检查产物。

## 进一步阅读

- [docs/部署流程.md](./docs/部署流程.md) — Devbox 各阶段与故障排查
