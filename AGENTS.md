# AGENTS.md

## 项目

**sealos-deploy** 的自动化 benchmark：端到端部署（Devbox + deploy task + Codex）与离线契约验证。不启动 Brain UI。

## 命令

- `npm run deploy -- --namespace <ns> --repo <owner/repo> --project-name <name>` — 完整自动化部署
- `npm test` — fixture 契约套件
- `npm run validate -- <workspace>` — 验证 `.sealos` 工作区
- `npm run suite` — 验证 `fixtures/*`
- `npm run cases:sync` — 从 brain-sandbox-skills 同步 eval 列表
- `npm run fixtures:generate` — 用 skill 脚本重建 fixture

## 环境

复制 `.env.example` 为 `.env`。必填通常包括：`SEALOS_HOST`、`DEVBOX_*`、`GITHUB_TOKEN`、`CODEX_GATEWAY_OPENAI_API_KEY`、`BRAIN_SANDBOX_SKILLS_GIT`。

## 代码边界

- `src/brain-deploy/` — 与 Brain `apps/ui` deploy 流水线对齐（tsx 运行）
- `src/lib/`、`fixtures/` — 仅契约验证，不连 Devbox
- 改 runner/gateway 时与 brain 主仓 diff 同步

## 文档

用户面向说明用中文：`README.md`、`docs/部署流程.md`。
