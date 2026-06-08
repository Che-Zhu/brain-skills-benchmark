#!/usr/bin/env node
/**
 * One-off: add deploy_difficulty to queue JSON after manual repo code review.
 * Values are Chinese assessments for CSV reporting.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const QUEUE_FILE = new URL(
  "../2000-repos/top1000-representative-deployable-apps.json",
  import.meta.url,
);

/** @type {Record<string, string>} */
const DEPLOY_DIFFICULTY = {
  "ollama/ollama":
    "简单 — 根目录单一 Dockerfile，Go 单二进制；官方镜像可单容器运行（GPU/模型卷为可选配置）",
  "open-webui/open-webui":
    "中等 — 根目录 Dockerfile + compose 默认捆绑 Ollama 双服务；可选 GPU、向量库与多种 compose 变体",
  "home-assistant/core":
    "复杂 — 超大型 Python monorepo，Dockerfile 依赖 hassfest 生成流程与外置 base 镜像；集成生态重，配置面广",
  "louislam/uptime-kuma":
    "简单 — compose.yaml 仅 1 个服务；Node 单体应用，docker/ 下有标准构建路径",
  "Stirling-Tools/Stirling-PDF":
    "中等 — 官方预构建镜像可单容器；仓库内 8+ Dockerfile 与多套 lite/fat/split compose，从源码自建较复杂",
  "go-gitea/gitea":
    "中等 — 多阶段 Dockerfile（前端 pnpm + Go 编译）；生产需外置 PostgreSQL/MySQL 与持久化",
  "minio/minio":
    "简单 — 根目录 Dockerfile，Go 单进程 S3；单节点部署只需 access/secret key 与数据卷",
  "n8n-io/n8n":
    "简单 — docker/images/n8n 官方构建链路；默认 SQLite 单容器，可选外置 Postgres",
  "supabase/supabase":
    "复杂 — docker/docker-compose.yml 编排 11 个服务（Kong、Postgres、Auth、Realtime、Storage 等），Env/JWT 配置多",
  "immich-app/immich":
    "复杂 — docker compose 固定 4 服务（server + ML + Redis + Postgres），多 Dockerfile 分模块构建",
  "grafana/grafana":
    "简单 — 根目录发布用 Dockerfile；生产部署为单容器 Grafana 服务（devenv compose 仅开发用）",
  "nocodb/nocodb":
    "中等 — 仓库无 Dockerfile（镜像外挂发布）；compose 示例含 PostgreSQL/Traefik，SQLite 单镜像路径较简单",
  "excalidraw/excalidraw":
    "简单 — 根目录 Dockerfile + compose 单服务静态前端",
  "CorentinTh/it-tools":
    "简单 — 单一 Dockerfile，构建 Vue 静态站由 nginx 托管",
  "kamranahmedse/developer-roadmap":
    "中等 — Astro 静态站 monorepo，仓库无 Dockerfile；需自写 node build + 静态服务器镜像",
  "PDFMathTranslate/PDFMathTranslate":
    "中等 — Dockerfile + 单服务 compose，但 Python ML/PDF 依赖重且需外接翻译 API",
  "2noise/ChatTTS":
    "复杂 — 无 Dockerfile；HF 模型权重 + GPU/CUDA，仓库是推理库而非可直接暴露的 HTTP 服务",
  "Pythagora-io/gpt-pilot":
    "复杂 — Dockerfile 集成 code-server、MongoDB 与多端口开发环境，非最小化应用部署",
  "ToolJet/ToolJet":
    "中等 — 官方 tooljet/try 一体化镜像（内嵌 Postgres）；从本仓库源码构建为大型 JS monorepo",
  "xuxueli/xxl-job":
    "中等 — Java 调度平台：管理端 + MySQL，完整分布式还需独立 executor；官方提供 admin 镜像",
};

const repos = JSON.parse(readFileSync(QUEUE_FILE, "utf8"));
let missing = 0;
for (const repo of repos) {
  const assessment = DEPLOY_DIFFICULTY[repo.full_name];
  if (!assessment) {
    console.error(`missing assessment: ${repo.full_name}`);
    missing += 1;
    continue;
  }
  repo.deploy_difficulty = assessment;
}
if (missing > 0) process.exit(1);
writeFileSync(QUEUE_FILE, `${JSON.stringify(repos, null, 2)}\n`);
console.info(`patched ${repos.length} repos in ${fileURLToPath(QUEUE_FILE)}`);
