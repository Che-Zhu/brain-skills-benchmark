# AGENTS.md

## 项目

**sealos-deploy** skill 的质量 benchmark：本机 CLI 驱动 Sealos Devbox 端到端跑测（克隆 → Gateway `/sealos-deploy` → apply），在本机 `.data/deploy-tasks/` 记录 **Token、耗时、成功率**。无第二条「离线跑 skill」产品路径。不启动 Brain UI。

## 命令

- `npm run deploy -- --namespace <ns> --repo <owner/repo> --project-name <name>` — **唯一跑测入口**
- `npm run cases:sync` — 从 skill 仓库同步 `cases/manifest.json`
- `npm run benchmark -- cases list` — 列出 manifest 用例

维护本仓库（非产品路径）：`npm test`、`npm run validate`、`npm run suite`、`npm run fixtures:generate`。

## 环境

复制 `.env.example` 为 `.env`。跑测必填通常包括：`SEALOS_HOST`、`DEVBOX_*`、`GITHUB_TOKEN`、`CODEX_GATEWAY_OPENAI_API_KEY`、`BRAIN_SANDBOX_SKILLS_GIT`。

## 代码边界

- `src/brain-deploy/` — Devbox 跑测流水线；与 Brain `apps/ui` deploy 对齐，改 runner/gateway 时 diff 主仓
- `src/lib/`、`fixtures/`、`validate`/`suite` — 仅本仓库契约回归与 golden，不参与 Devbox 跑测主路径

## 文档

用户面向说明用中文：`README.md`、`docs/部署流程.md`。
