# ShipRepo 内置部署任务链路

## 范围

本文只描述 ShipRepo 产品内置链路：从创建部署任务开始，到任务完成、失败、停止或清理结束。

不包含：

- `POST /api/deploy`
- GitHub 登录与仓库选择前置流程
- Devbox 内 `brain-github-deploy` skill 的内部实现细节

前置条件：

- 用户已登录 ShipRepo。
- 任务已拿到 GitHub 仓库 URL。
- 用户 GitHub token 已在 ShipRepo 服务端可解密读取。

## 主链路

### 1. 创建任务

浏览器调用：

- `POST /api/tasks`

请求关键字段：

- `prompt`
- `repoUrl`
- `selectedAgent: "codex"`
- `selectedModel`
- `maxDuration`

服务端动作：

- 校验登录态。
- 检查限流。
- 写入 `tasks`。
- 固定使用 Codex agent。
- 异步生成 branch name 和 title。
- 立即调用 `startTaskChatV2Turn()` 启动首轮 Codex turn。

代码入口：

- `/Users/che/Documents/GitHub/ShipRepo/app/api/tasks/route.ts`
- `/Users/che/Documents/GitHub/ShipRepo/lib/codex-gateway/chat-v2-service.ts`

### 2. 创建或复用 Devbox runtime

服务端内部调用：

- `ensureTaskDevboxRuntime(task, { logger })`

Devbox API：

- `GET /api/v1/devbox?upstreamID={upstreamID}`
- `POST /api/v1/devbox`
- `GET /api/v1/devbox/{name}`
- `POST /api/v1/devbox/{name}/resume`
- `POST /api/v1/devbox/{name}/pause/refresh`
- `POST /api/v1/devbox/{name}/exec`

创建 Devbox 时注入环境变量：

- `TASK_ID`
- `REPO_URL`
- `GITHUB_TOKEN`
- `CODEX_GATEWAY_HOST`
- `CODEX_GATEWAY_PORT`
- `CODEX_GATEWAY_MODEL`
- `CODEX_GATEWAY_CODEX_HOME`
- `CODEX_GATEWAY_SESSION_TTL_MS`
- `CODEX_GATEWAY_OPENAI_BASE_URL`
- `CODEX_GATEWAY_OPENAI_API_KEY`
- `CODEX_GATEWAY_JWT_SECRET`

Devbox bootstrap 脚本做三件事：

- 在 workspace 内 `git clone` 任务仓库。
- 切到 `task.branchName` 指定分支；远端没有该分支时创建本地分支。
- 安装并校验 `brain-github-deploy` skill。

成功后写回 `tasks`：

- `runtimeProvider`
- `runtimeName`
- `runtimeNamespace`
- `runtimeState`
- `workspacePreparedAt`
- `workspaceFingerprint`
- `runtimeCheckedAt`
- `gatewayUrl`

代码入口：

- `/Users/che/Documents/GitHub/ShipRepo/lib/devbox/runtime.ts`
- `/Users/che/Documents/GitHub/ShipRepo/lib/devbox/client.ts`

### 3. 启动 Codex Gateway session

服务端从 Devbox runtime 信息解析 gateway URL 和 auth token。

Codex Gateway API：

- `GET {gatewayUrl}/healthz`
- `GET {gatewayUrl}/readyz`
- `POST {gatewayUrl}/api/sessions`

创建 session 后写回 `tasks`：

- `gatewaySessionId`
- `gatewayReadyAt`
- `gatewayUrl`
- `selectedModel`

代码入口：

- `/Users/che/Documents/GitHub/ShipRepo/lib/codex-gateway/session.ts`
- `/Users/che/Documents/GitHub/ShipRepo/lib/codex-gateway/client.ts`

### 4. 发送首轮部署 prompt

服务端在首轮 prompt 前注入 ShipRepo/Sealos 上下文：

- region
- region URL
- namespace
- template API
- 任务契约：优先使用内置 Sealos deployment skill，只处理部署目标

Codex Gateway API：

- `POST {gatewayUrl}/api/sessions/{sessionId}/turn`

发送成功后写回 `tasks`：

- `status: "processing"`
- `progress: 0`
- `activeTurnSessionId`
- `activeTurnStartedAt`
- `activeTurnTranscriptCursor`
- `turnCompletionState: "pending"`
- `turnCompletionCheckedAt`

同时写入 task event：

- `user_message.created`
- `gateway.session.opened`
- `turn.started`

代码入口：

- `/Users/che/Documents/GitHub/ShipRepo/lib/codex-gateway/runner.ts`
- `/Users/che/Documents/GitHub/ShipRepo/lib/sealos-deploy-context.ts`
- `/Users/che/Documents/GitHub/ShipRepo/lib/codex-gateway/completion.ts`

### 5. 前端订阅执行流

浏览器通常先取任务聊天状态：

- `GET /api/tasks/{taskId}/chat/v2`

如果返回 active stream，浏览器订阅：

- `GET /api/tasks/{taskId}/chat/v2/stream?streamId={streamId}`

服务端再代理 Codex Gateway SSE：

- `GET {gatewayUrl}/api/sessions/{sessionId}/events`

流处理中服务端会落库 Gateway event：

- `gateway.session.opened`
- `gateway.state.snapshot`
- `gateway.notification`
- `gateway.server_request`
- `gateway.warning`
- `gateway.session.closed`

当 `gateway.state.snapshot` 显示没有 active turn 且已有 `lastTurnStatus`，服务端关闭 task stream，并触发 turn reconcile。

代码入口：

- `/Users/che/Documents/GitHub/ShipRepo/app/api/tasks/[taskId]/chat/v2/route.ts`
- `/Users/che/Documents/GitHub/ShipRepo/app/api/tasks/[taskId]/chat/v2/stream/route.ts`
- `/Users/che/Documents/GitHub/ShipRepo/lib/task-chat-v2.ts`

### 6. Turn 完成归档

完成状态来源：

- Gateway SSE terminal state。
- `GET /api/tasks/{taskId}` 时发现有未完成 checkpoint 后 reconcile。
- `GET /api/tasks/{taskId}/chat/v2` 时发现有未完成 checkpoint 后 reconcile。

Codex Gateway API：

- `GET {gatewayUrl}/api/sessions/{sessionId}/state`

成功条件：

- `lastTurnStatus` 是 `completed`
- `lastTurnStatus` 是 `succeeded`
- `lastTurnStatus` 是 `interrupted`

成功后写回 `tasks`：

- `status: "completed"`
- `progress: 100`
- `error: null`
- `activeTurnSessionId: null`
- `activeTurnStartedAt: null`
- `activeTurnTranscriptCursor: null`
- `turnCompletionState: "completed"`
- `turnCompletionCheckedAt`

失败后写回 `tasks`：

- `status: "error"`
- `progress: 0`
- `error`
- `activeTurnSessionId: null`
- `activeTurnStartedAt: null`
- `activeTurnTranscriptCursor: null`
- `turnCompletionState: "failed"`
- `turnCompletionCheckedAt`

同时投影 assistant message：

- `assistant.message.projected`

代码入口：

- `/Users/che/Documents/GitHub/ShipRepo/lib/codex-gateway/completion.ts`
- `/Users/che/Documents/GitHub/ShipRepo/lib/task-event-projection.ts`

## 任务结束后的常用接口

这些接口不发起部署，只读取或推进部署后的状态。

### 读取任务与聊天状态

- `GET /api/tasks/{taskId}`
- `GET /api/tasks/{taskId}/chat/v2`
- `GET /api/tasks/{taskId}/events`
- `GET /api/tasks/{taskId}/messages`
- `GET /api/tasks/{taskId}/runtime`
- `GET /api/tasks/{taskId}/files?mode={mode}`
- `GET /api/tasks/{taskId}/diff?path={path}`
- `GET /api/tasks/{taskId}/file-content?path={path}`

### GitHub PR 与检查

- `POST /api/tasks/{taskId}/pr`
- `POST /api/tasks/{taskId}/sync-pr`
- `POST /api/tasks/{taskId}/merge-pr`
- `POST /api/tasks/{taskId}/reopen-pr`
- `POST /api/tasks/{taskId}/close-pr`
- `GET /api/tasks/{taskId}/pr-comments`
- `GET /api/tasks/{taskId}/check-runs`

服务端通过 Octokit 调 GitHub：

- `GET https://api.github.com/repos/{owner}/{repo}/branches/{branch}`
- `GET https://api.github.com/repos/{owner}/{repo}/commits/{ref}/check-runs`
- `POST https://api.github.com/repos/{owner}/{repo}/pulls`
- `GET https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}`
- `PATCH https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}`
- `PUT https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}/merge`

### 预览部署查询

- `GET /api/tasks/{taskId}/deployment`

该接口只查状态，不创建部署。

查询顺序：

- 优先返回 `tasks.previewUrl`
- 查 GitHub Checks API
- 查 GitHub Deployments API
- 查 GitHub commit statuses

服务端通过 Octokit 调 GitHub：

- `GET https://api.github.com/repos/{owner}/{repo}/branches/{branch}`
- `GET https://api.github.com/repos/{owner}/{repo}/commits/{ref}/check-runs`
- `GET https://api.github.com/repos/{owner}/{repo}/deployments`
- `GET https://api.github.com/repos/{owner}/{repo}/deployments/{deployment_id}/statuses`
- `GET https://api.github.com/repos/{owner}/{repo}/commits/{ref}/statuses`

代码入口：

- `/Users/che/Documents/GitHub/ShipRepo/app/api/tasks/[taskId]/deployment/route.ts`

## 停止与清理

### 停止当前 turn

浏览器调用：

- `POST /api/tasks/{taskId}/chat/interrupt`

服务端调用 Codex Gateway：

- `POST {gatewayUrl}/api/sessions/{sessionId}/turn/interrupt`

结果：

- 本地将 active turn finalize 为 interrupted。
- task 通常进入 `completed`。
- 可选择清空 `gatewaySessionId`。

代码入口：

- `/Users/che/Documents/GitHub/ShipRepo/app/api/tasks/[taskId]/chat/interrupt/route.ts`

### 停止任务

浏览器调用：

- `PATCH /api/tasks/{taskId}`

请求体：

```json
{
  "action": "stop"
}
```

服务端调用：

- `DELETE {gatewayUrl}/api/sessions/{sessionId}`
- `DELETE /api/v1/devbox/{name}`

结果：

- `tasks.status = "stopped"`
- 清空 runtime、workspace、gateway、sandbox 字段。
- 关闭 active chat stream。

代码入口：

- `/Users/che/Documents/GitHub/ShipRepo/app/api/tasks/[taskId]/route.ts`

### 停止 Devbox runtime

浏览器调用：

- `DELETE /api/tasks/{taskId}/runtime`

服务端调用：

- `DELETE /api/v1/devbox/{name}`

结果：

- 清空 runtime、workspace、gateway 字段。
- 不把 task 标记为 stopped。

代码入口：

- `/Users/che/Documents/GitHub/ShipRepo/app/api/tasks/[taskId]/runtime/route.ts`

### 合并 PR 后清理

浏览器调用：

- `POST /api/tasks/{taskId}/merge-pr`

服务端调用：

- `PUT https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}/merge`
- `DELETE /api/v1/devbox/{name}`

结果：

- `tasks.prStatus = "merged"`
- 写入 `prMergeCommitSha`
- 清空 runtime、workspace、gateway、sandbox 字段。

代码入口：

- `/Users/che/Documents/GitHub/ShipRepo/app/api/tasks/[taskId]/merge-pr/route.ts`

## 结束条件

任务结束状态：

- `completed`：Gateway turn 成功、被 interrupt 后按成功收敛，或 reconcile 后确认成功。
- `error`：Gateway turn 失败、Gateway session 丢失、stream 上游失败且无法恢复。
- `stopped`：用户明确停止任务。

Devbox 生命周期：

- 任务自然 `completed` 不主动删除 Devbox。
- 用户停止任务会删除 Devbox。
- 用户停止 runtime 会删除 Devbox。
- PR 合并成功后会删除 Devbox。
- 创建 Devbox 时会设置 `pauseAt` 和 `archiveAfterPauseTime`；默认 pause 后 `24h` 归档。

## 最小 benchmark 对接点

如果 benchmark 只想模拟内置链路的核心，应对齐这些步骤：

1. `POST /api/tasks`
2. 等待 `GET /api/tasks/{taskId}/chat/v2/stream?streamId={streamId}` 或轮询 `GET /api/tasks/{taskId}`
3. 判断 `tasks.status`
4. 需要 PR 时调用 `POST /api/tasks/{taskId}/pr`
5. 需要清理时调用 `DELETE /api/tasks/{taskId}/runtime`

