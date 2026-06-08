# Roadmap

brain-skills-benchmark 当前能在 Sealos Devbox 上批量跑 sandbox skill 并产出 CSV。以下是我们认为接下来需要推进的方向；完成一项可在对应 checkbox 打勾。

## P0 — Sealos 集成

- [ ] **确保 skill 生成的 templates 可被 Sealos consume**
  - 校验 skill 产出的 template 格式、字段与 Sealos 消费端要求一致（非仅「文件生成成功」）
  - 与 template 导入 / 部署链路联调，覆盖简单 / 中等 / 复杂用例
  - 当前最高优先级：skill 的价值最终要体现在 Sealos 能消费并部署

## 测试集与 Skill 质量

- [x] **改用 Sealos Template 列表作为 benchmark 测试集**
  - 运行时从 `SEALOS_TEMPLATE_API_URL` 拉取用例（见 `src/steps/step-1-load-queue/`）
  - 仅保留 `gitRepo` 为 GitHub 的 template，映射为 `{ full_name }` 供 Devbox 链路使用
  - 已移除 `top1000-representative-deployable-apps.json` 与 `loadDeployableRepos`

- [ ] **根据 transcript 优化 skill 流程**
  - 从 benchmark 的 Gateway transcript（见 `src/lib/devbox/gateway/transcript-log.mjs`）归纳失败模式与卡点
  - 在技能仓库（`BRAIN_SANDBOX_SKILLS_GIT`）中改进 prompt / 步骤顺序 / 工具使用，减少重复试错与超时
  - 用同一批代表性用例复跑，对比 `status`、耗时与 token 成本

## 执行环境与成本

- [ ] **尝试 local Docker build 链路**
  - 在本地（或 CI）独立完成 clone → build → 镜像产出，不依赖当前远程 Devbox 控制面
  - 用途：更快迭代 skill、降低单次 benchmark 成本、与 Devbox 链路结果做对照
  - 需定义与现有 benchmark CSV 可对比的指标（成功/失败、耗时、镜像大小等）

- [ ] **测试更低成本模型**
  - 在相同用例子集上对比不同 Gateway 模型（`CODEX_GATEWAY_MODEL` 等）
  - 记录成功率、turn 时长、`api_tokens` / `api_cost_usd`，找出可接受的成本–质量平衡点

---

有新项直接追加到对应章节，或新建章节；若某项已交付，保留条目并勾选，便于回顾进度。
