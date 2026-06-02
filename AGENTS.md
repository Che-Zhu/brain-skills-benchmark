# AGENTS.md

## 项目

**sealos-deploy** skill 的质量 benchmark：本机 CLI 驱动 Sealos Devbox 端到端跑测（克隆 → Gateway `/sealos-deploy` → apply），在本机 `.data/deploy-tasks/` 记录 **Token、耗时、成功率**。不启动 Brain UI。

## 命令

- `npm run deploy -- --namespace <ns> --repo <owner/repo> --project-name <name>` — 唯一入口

## 环境

复制 `.env.example` 为 `.env`。必填通常包括：`SEALOS_HOST`、`DEVBOX_*`、`GITHUB_TOKEN`、`CODEX_GATEWAY_OPENAI_API_KEY`、`BRAIN_SANDBOX_SKILLS_GIT`。

## 代码边界

- `src/brain-deploy/` — Devbox 跑测流水线；与 Brain `apps/ui` deploy 对齐，改 runner/gateway 时 diff 主仓

## 文档

用户面向说明用中文：`README.md`、`docs/部署流程.md`。
