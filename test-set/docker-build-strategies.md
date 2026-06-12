---
_organized: true
---
# Docker Build Strategies

## Summary

- Total repos checked: 152
- First-party Dockerfile: 24
- First-party compose: 87
- Release/CI provides image build path: 22
- Official image only: 3
- Inferred only: 16

## Strategy Taxonomy

| Type | Meaning | Recommended automation behavior |
|---|---|---|
| compose-first | 官方 compose 能启动完整服务 | 优先解析 compose，识别 build/image/service/env/volume |
| dockerfile-first | 官方 Dockerfile 可直接构建主服务 | 直接 docker build，补齐 tag/context/target |
| release-first | release/CI 定义了真实发布镜像流程 | 复用 release workflow 的 build context、args、tags |
| image-first | 官方只推荐使用预构建镜像 | 记录镜像名，不强行源码构建 |
| inferred | 无官方容器化路径，只能按技术栈推断 | 低置信度，进入人工复核队列 |

## Repositories

| Repo | Best path | Second path | Evidence | Confidence | Blocker |
|---|---|---|---|---|---|
| AmruthPillai/Reactive-Resume | compose-first: `compose.yml` | dockerfile-first: `Dockerfile` | `compose.yml`, `Dockerfile`, `.github/workflows/docker-build.yml` | high | none |
| AppFlowy-IO/AppFlowy | compose-first: `frontend/scripts/docker-buildfiles/docker-compose.yml` | release-first: `.github/workflows/docker_ci.yml` | `frontend/scripts/docker-buildfiles/README.md`, `frontend/scripts/docker-buildfiles/Dockerfile`, `.github/workflows/docker_ci.yml` | high | none |
| ArtalkJS/Artalk | compose-first: `docker-compose.yml` | release-first: `.github/workflows/build-docker.yml` | `docker-compose.yml`, `Dockerfile`, `.goreleaser.yml` | high | none |
| AykutSarac/jsoncrack.com | compose-first: `apps/www/docker-compose.yml` | dockerfile-first: `apps/www/Dockerfile` | `apps/www/docker-compose.yml`, `apps/www/Dockerfile`, `README.md` | high | none |
| Budibase/budibase | compose-first: `hosting/docker-compose.yaml` | dockerfile-first: `hosting/single/Dockerfile` | `hosting/docker-compose.yaml`, `hosting/single/Dockerfile`, `README.md` | high | multi-service image set |
| Byaidu/PDFMathTranslate | compose-first: `docker-compose.yml` | dockerfile-first: `Dockerfile` | `docker-compose.yml`, `Dockerfile`, `README.md` | high | none |
| Canner/WrenAI | inferred: package CLI/library into custom runtime image | none | `README.md`, `.github/workflows/release-please.yml`, `CHANGELOG.md` | low | current branch removed legacy docker/deployment |
| CapSoftware/Cap | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker-build-web.yml` | `docker-compose.yml`, `apps/web/Dockerfile`, `.github/workflows/docker-build-web.yml` | high | multi-service image set |
| ChatAnyTeam/ChatAny | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/docker.yml` | high | none |
| CorentinTh/it-tools | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/releases.yml` | `Dockerfile`, `.github/workflows/releases.yml`, `README.md` | high | none |
| DIYgod/RSSHub | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker-release.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/docker-release.yml` | high | none |
| Dolibarr/dolibarr-docker | compose-first: `docker-compose.yml` | dockerfile-first: `Dockerfile.template` | `README.md`, `docker-compose.yml`, `.github/workflows/build.yml` | high | versioned generated contexts |
| FlowiseAI/Flowise | compose-first: `docker/docker-compose.yml` | release-first: `.github/workflows/docker-image-dockerhub.yml` | `docker/README.md`, `docker/docker-compose.yml`, `.github/workflows/docker-image-dockerhub.yml` | high | multiple images including worker |
| ItzCrazyKns/Perplexica | compose-first: `docker-compose.yaml` | release-first: `.github/workflows/docker-build.yaml` | `docker-compose.yaml`, `Dockerfile`, `.github/workflows/docker-build.yaml` | high | none |
| OwO-Network/DeepLX | compose-first: `compose.yaml` | release-first: `.github/workflows/docker.yaml` | `compose.yaml`, `Dockerfile`, `.github/workflows/docker.yaml` | high | none |
| PostHog/posthog | compose-first: `docker-compose.hobby.yml` | release-first: `.github/workflows/container-images-cd.yml` | `docker-compose.hobby.yml`, `Dockerfile`, `.github/workflows/container-images-cd.yml` | medium | large dependency stack |
| PrestaShop/PrestaShop | compose-first: `docker-compose.yml` | dockerfile-first: `.docker/Dockerfile` | `docker-compose.yml`, `.docker/Dockerfile`, `.github/workflows/cron_docker_build.yml` | high | none |
| PrivateBin/PrivateBin | inferred: PHP web app image from release archive/source | none | `doc/Installation.md`, `doc/Release.md`, `.github/workflows/release.yml` | low | no production Dockerfile or image name in repo |
| QuantumNous/new-api | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker-build.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/docker-build.yml` | high | none |
| RedisInsight/RedisInsight | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/pipeline-build-docker.yml` | `Dockerfile`, `.github/workflows/pipeline-build-docker.yml`, `README.md` | high | none |
| RocketChat/Rocket.Chat | release-first: `.github/workflows/new-release.yml` | compose-first: `docker-compose-ci.yml` | `.github/workflows/new-release.yml`, `docker-compose-ci.yml`, `apps/meteor/.docker/Dockerfile.debian` | medium | release images depend on CI-produced tags |
| SigNoz/signoz | compose-first: `deploy/docker/docker-compose.yaml` | release-first: `.github/workflows/gor-signoz-community.yaml` | `deploy/docker/docker-compose.yaml`, `cmd/community/Dockerfile`, `.github/workflows/gor-signoz-community.yaml` | high | multi-service image set |
| SkardiLabs/skardi | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/release.yml` | `Dockerfile`, `.github/workflows/release.yml`, `README.md` | high | none |
| Stirling-Tools/Stirling-PDF | compose-first: `docker/compose/docker-compose.yml` | release-first: `.github/workflows/push-docker.yml` | `docker/README.md`, `docker/compose/docker-compose.yml`, `.github/workflows/push-docker.yml` | high | variant images need selection |
| TYPO3/typo3 | inferred: PHP/Composer CMS image around web root | none | `composer.json`, `README.md` | low | no official container path in repo |
| ToolJet/ToolJet | compose-first: `deploy/docker/docker-compose.yaml` | release-first: `.github/workflows/docker-release.yml` | `docs/docs/setup/docker.md`, `deploy/docker/docker-compose.yaml`, `.github/workflows/docker-release.yml` | high | none |
| Wei-Shaw/sub2api | compose-first: `deploy/docker-compose.yml` | release-first: `.goreleaser.yaml` | `deploy/DOCKER.md`, `deploy/docker-compose.yml`, `.goreleaser.yaml` | high | none |
| WordPress/WordPress | inferred: PHP Apache/FPM image from source checkout | none | `readme.html`, `package.json` | low | no Docker evidence in this source repo |
| YOURLS/YOURLS | inferred: PHP/Composer image from source checkout | none | `README.md`, `composer.json`, `.github/workflows/ci.yml` | low | no official container path in repo |
| ace-step/ACE-Step | compose-first: `docker-compose.yaml` | dockerfile-first: `Dockerfile` | `docker-compose.yaml`, `Dockerfile`, `README.md` | high | likely model/runtime assets required |
| adrianmusante/docker-pocketbase | compose-first: `docker-compose.yml` | release-first: `.github/workflows/publish-to-dockerhub.yml` | `README.md`, `docker-compose.yml`, `pocketbase/Dockerfile` | high | none |
| airbytehq/airbyte | release-first: `.github/workflows/connector-image-build.yml` | dockerfile-first: connector `Dockerfile` files | `.github/workflows/connector-image-build.yml`, `.github/workflows/publish_connectors.yml`, `README.md` | medium | platform compose deployment is deprecated |
| appsmithorg/appsmith | compose-first: `deploy/docker/docker-compose.yml` | release-first: `.github/workflows/github-release.yml` | `deploy/docker/README.md`, `deploy/docker/docker-compose.yml`, `Dockerfile` | high | CE/EE image choice required |
| bytebase/bytebase | release-first: `.github/workflows/build-push-release-image.yml` | dockerfile-first: `scripts/Dockerfile` | `.github/workflows/build-push-release-image.yml`, `scripts/Dockerfile`, `scripts/.goreleaser-release.yaml` | high | none |
| calcom/cal.com | compose-first: `docker-compose.yml` | dockerfile-first: `Dockerfile` | `docker-compose.yml`, `Dockerfile`, `README.md` | high | multiple app/API images |
| casdoor/casdoor | compose-first: `docker-compose.yml` | release-first: `.github/workflows/build.yml` | `docker-compose.yml`, `Dockerfile`, `.goreleaser.yaml` | high | none |
| chatwoot/chatwoot | compose-first: `docker-compose.production.yaml` | release-first: `.github/workflows/publish_foss_docker.yml` | `docker-compose.production.yaml`, `docker/Dockerfile`, `.github/workflows/publish_foss_docker.yml` | high | EE/FOSS image choice required |
| coaidev/coai | compose-first: `docker-compose.stable.yaml` | release-first: `.github/workflows/docker-cd.yaml` | `docker-compose.stable.yaml`, `Dockerfile`, `.github/workflows/docker-cd.yaml` | high | none |
| coder/code-server | release-first: `.github/workflows/publish.yaml` | dockerfile-first: `ci/release-image/Dockerfile` | `.github/workflows/publish.yaml`, `ci/release-image/Dockerfile`, `docs/README.md` | high | release image context under `ci/` |
| coze-dev/coze-studio | compose-first: `docker/docker-compose.yml` | dockerfile-first: `backend/Dockerfile` and `frontend/Dockerfile` | `docker/docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` | high | multi-service image set |
| dani-garcia/vaultwarden | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/release.yml` | `Dockerfile`, `docker/README.md`, `.github/workflows/release.yml` | high | none |
| danny-avila/LibreChat | compose-first: `deploy-compose.yml` | release-first: `.github/workflows/tag-images.yml` | `deploy-compose.yml`, `Dockerfile`, `.github/workflows/tag-images.yml` | high | registry image variants |
| dbgate/dbgate | dockerfile-first: `docker/Dockerfile` | release-first: `.github/workflows/build-docker.yaml` | `docker/Dockerfile`, `.github/workflows/build-docker.yaml`, `README.md` | high | CE/pro image choice required |
| devnen/Kitten-TTS-Server | compose-first: `docker-compose.yml` | dockerfile-first: `Dockerfile` | `docker-compose.yml`, `docker-compose-cpu.yml`, `Dockerfile` | high | CPU/GPU variant choice |
| dgtlmoon/changedetection.io | compose-first: `docker-compose.yml` | release-first: `.github/workflows/containers.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/containers.yml` | high | none |
| directus/directus | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/release.yml` | `Dockerfile`, `.github/workflows/release.yml`, `readme.md` | high | root compose is debug dependencies only |
| distribution/distribution | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/build.yml` | `Dockerfile`, `docs/content/about/deploying.md`, `.github/workflows/build.yml` | high | none |
| docusealco/docuseal | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/docker.yml` | high | none |
| drizzle-team/drizzle-orm | inferred: library package test image only if needed | none | `CONTRIBUTING.md`, `.github/workflows/release-latest.yaml`, `package.json` | low | not a standalone service image |
| elastic/elasticsearch | dockerfile-first: `distribution/docker/src/docker/dockerfiles/default/Dockerfile` | compose-first: `docs/reference/setup/install/docker/docker-compose.yml` | `distribution/docker/README.md`, `distribution/docker/src/docker/dockerfiles/default/Dockerfile`, `docs/reference/setup/install/docker/docker-compose.yml` | medium | image build normally depends on Gradle packaging |
| emqx/emqx | release-first: `.github/workflows/build_and_push_docker_images.yaml` | dockerfile-first: `deploy/docker/Dockerfile` | `.github/workflows/build_and_push_docker_images.yaml`, `deploy/docker/Dockerfile`, `deploy/docker/README.md` | high | package build precedes image build |
| ever-co/ever-gauzy | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker-build-publish-demo.yml` | `docker-compose.yml`, `docker-compose.build.yml`, `.github/workflows/docker-build-publish-demo.yml` | high | multi-service image set |
| excalidraw/excalidraw | compose-first: `docker-compose.yml` | release-first: `.github/workflows/publish-docker.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/publish-docker.yml` | high | none |
| fatedier/frp | release-first: `.github/workflows/build-and-push-image.yml` | dockerfile-first: `dockerfiles/Dockerfile-for-frps` | `.github/workflows/build-and-push-image.yml`, `dockerfiles/Dockerfile-for-frps`, `.goreleaser.yml` | high | two binaries/images |
| featbit/featbit | compose-first: `docker-compose.yml` | release-first: `.github/workflows/publish-docker-images.yml` | `docker-compose.yml`, `docker/ui-api-bundle/Dockerfile`, `.github/workflows/publish-docker-images.yml` | high | multi-service image set |
| flarum/framework | inferred: PHP framework package image only for downstream app | none | `README.md`, `.github/workflows/prepare-release.yml`, `composer.json` | low | framework repo is not a deployable app |
| formbricks/formbricks | compose-first: `docker/docker-compose.yml` | release-first: `.github/workflows/release-docker-github.yml` | `docker/README.md`, `docker/docker-compose.yml`, `apps/web/Dockerfile` | high | optional Hub image |
| fosrl/pangolin | compose-first: `docker-compose.yml` | release-first: `.github/workflows/cicd.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/cicd.yml` | high | compose uses dev Dockerfile by default |
| gitroomhq/postiz-app | release-first: `.github/workflows/build-containers.yml` | image-first: `docker-compose.yaml` uses `ghcr.io/gitroomhq/postiz-app` | `docker-compose.yaml`, `.github/workflows/build-containers.yml`, `Dockerfile.dev` | medium | production Dockerfile is only in workflow context |
| glanceapp/glance | release-first: `.goreleaser.yaml` | dockerfile-first: `Dockerfile.goreleaser` | `.goreleaser.yaml`, `Dockerfile.goreleaser`, `README.md` | high | none |
| go-gitea/gitea | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/release-tag-version.yml` | `Dockerfile`, `Dockerfile.rootless`, `.github/workflows/release-tag-version.yml` | high | rootless variant choice |
| goauthentik/authentik | release-first: `.github/workflows/release-publish.yml` | dockerfile-first: `lifecycle/container/Dockerfile` | `.github/workflows/release-publish.yml`, `lifecycle/container/Dockerfile`, `Makefile` | high | multiple image targets |
| goharbor/harbor | release-first: `.github/workflows/build-package.yml` | dockerfile-first: `make/photon/*/Dockerfile` | `Makefile`, `.github/workflows/build-package.yml`, `make/photon/core/Dockerfile` | high | many component images and installer artifacts |
| grafana/loki | compose-first: `production/docker-compose.yaml` | release-first: `.github/workflows/images.yml` | `production/docker/README.md`, `production/docker-compose.yaml`, `.github/workflows/images.yml` | high | multiple components |
| hasura/graphql-engine | compose-first: `docker-compose.yaml` | dockerfile-first: `packaging/graphql-engine/Dockerfile` | `docker-compose.yaml`, `packaging/graphql-engine/Dockerfile`, `frontend/docker/README.md` | medium | compose includes external database/agent files |
| heroiclabs/nakama | release-first: `.github/workflows/dockerhub-nakama.yaml` | dockerfile-first: `build/Dockerfile` | `.github/workflows/dockerhub-nakama.yaml`, `build/Dockerfile`, `docker-compose.yml` | high | release workflow controls tags |
| heyform/heyform | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/publish-docker-image.yml` | `Dockerfile`, `.github/workflows/publish-docker-image.yml`, `README.md` | high | compose file is test-only |
| illacloud/illa-builder | release-first: `.github/workflows/build-all-in-one-image.yml` | dockerfile-first: `Dockerfile` | `.github/workflows/build-all-in-one-image.yml`, `Dockerfile`, `apps/builder/Dockerfile` | high | all-in-one vs builder image choice |
| immich-app/immich | compose-first: `docker/docker-compose.yml` | release-first: `.github/workflows/docker.yml` | `docker/README.md`, `docker/docker-compose.yml`, `.github/workflows/docker.yml` | high | server and ML images both required |
| influxdata/influxdb | dockerfile-first: `Dockerfile` | dockerfile-first: `docker/Dockerfile.ci` | `Dockerfile`, `RELEASE.md`, `README.md` | medium | release image args not explicit in docs |
| insforge/insforge | compose-first: `deploy/docker-compose/docker-compose.yml` | dockerfile-first: `Dockerfile` | `deploy/docker-deploy.md`, `deploy/docker-compose/docker-compose.yml`, `Dockerfile` | high | multi-service image set |
| itzg/docker-minecraft-server | compose-first: `docker-compose.yml` | release-first: `.github/workflows/build.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/build.yml` | high | none |
| javahuang/SurveyKing | dockerfile-first: `server/api/Dockerfile` | none | `server/api/Dockerfile`, `website/blog/2022-03-11-docker-deploy.md`, `README.md` | medium | no root compose found |
| jhuckaby/Cronicle | inferred: Node app image from `package.json` start script | none | `README.md`, `package.json` | low | no official container path in repo |
| jlesage/docker-firefox | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/build-image.yml` | `Dockerfile`, `.github/workflows/build-image.yml`, `README.md` | high | none |
| juanfont/headscale | release-first: `.goreleaser.yml` | none | `.goreleaser.yml`, `.github/workflows/release.yml`, `README.md` | high | main image uses GoReleaser ko, not Dockerfile |
| jupyter/docker-stacks | release-first: `.github/workflows/docker-build-test-upload.yml` | dockerfile-first: `images/base-notebook/Dockerfile` | `.github/workflows/docker-build-test-upload.yml`, `images/base-notebook/Dockerfile`, `Makefile` | high | image matrix selection required |
| kanboard/kanboard | compose-first: `docker-compose.sqlite.yml` | release-first: `.github/workflows/docker.yml` | `docker-compose.sqlite.yml`, `Dockerfile`, `.github/workflows/docker.yml` | high | DB variant choice |
| keycloak/keycloak | dockerfile-first: `quarkus/container/Dockerfile` | dockerfile-first: `operator/Dockerfile` | `quarkus/container/Dockerfile`, `operator/Dockerfile`, `.github/workflows/operator-ci.yml` | medium | server/operator target choice |
| keystonejs/keystone | inferred: downstream app Dockerfile generated by user project | none | `README.md`, `.github/workflows/publish.yml`, `package.json` | low | framework repo is not a deployable app |
| knadh/listmonk | compose-first: `docker-compose.yml` | release-first: `.goreleaser.yml` | `docker-compose.yml`, `Dockerfile`, `.goreleaser.yml` | high | none |
| labring/FastGPT | compose-first: `deploy/version/main/docker-compose.template.yml` | release-first: `.github/workflows/build-fastgpt.yml` | `deploy/README.md`, `deploy/version/main/docker-compose.template.yml`, `.github/workflows/build-fastgpt.yml` | high | multi-service image set |
| labring/RuiQi | compose-first: `docker-compose.yaml` | release-first: `.github/workflows/docker-build.yml` | `docker-compose.yaml`, `Dockerfile`, `.github/workflows/docker-build.yml` | high | none |
| labring/tentix | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker-publish.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/docker-publish.yml` | high | migration image target |
| langflow-ai/langflow | compose-first: `deploy/docker-compose.yml` | release-first: `.github/workflows/docker-build.yml` | `deploy/README.md`, `deploy/docker-compose.yml`, `.github/workflows/docker-build.yml` | high | v1/v2 image workflow choice |
| langgenius/dify | compose-first: `docker/docker-compose.yaml` | release-first: `.github/workflows/build-push.yml` | `docker/README.md`, `docker/docker-compose.yaml`, `.github/workflows/build-push.yml` | high | many component images |
| linuxserver/docker-chrome | dockerfile-first: `Dockerfile` | image-first: `README.md` uses `lscr.io/linuxserver/chrome` | `Dockerfile`, `README.md`, `.github/workflows/external_trigger.yml` | high | linuxserver base image convention |
| lobehub/lobe-chat | compose-first: `docker-compose/deploy/docker-compose.yml` | release-first: `.github/workflows/release-docker.yml` | `docker-compose/deploy/docker-compose.yml`, `Dockerfile`, `.github/workflows/release-docker.yml` | high | service profile choice |
| logto-io/logto | compose-first: `docker-compose.yml` | release-first: `.github/workflows/release.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/release.yml` | high | none |
| louislam/uptime-kuma | compose-first: `compose.yaml` | release-first: `.github/workflows/build-docker-push.yml` | `compose.yaml`, `docker/dockerfile`, `.github/workflows/build-docker-push.yml` | high | v2 tag default |
| lxfater/inpaint-web | dockerfile-first: `Dockerfile` | none | `Dockerfile`, `README.md`, `package.json` | medium | no compose or release image workflow |
| mage-ai/mage-ai | compose-first: `docker-compose.yml` | release-first: `.github/workflows/publish_docker_image.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/publish_docker_image.yml` | high | image variant choice |
| matomo-org/matomo | inferred: PHP/Composer app image or DDEV dev environment only | none | `README.md`, `.ddev/README.md`, `.github/workflows/release.yml` | low | only DDEV/dev container evidence in repo |
| mautic/mautic | inferred: PHP/Composer app image or DDEV dev environment only | none | `README.md`, `.ddev/config.yaml`, `.github/workflows/release.yml` | low | only DDEV/dev compose evidence in repo |
| mckaywrigley/chatbot-ui | inferred: Next.js app image plus Supabase dependency | none | `README.md`, `package.json` | low | README only requires Docker for Supabase |
| meilisearch/meilisearch | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/publish-docker-images.yml` | `Dockerfile`, `.github/workflows/publish-docker-images.yml`, `README.md` | high | none |
| metabase/metabase | release-first: `.github/workflows/containerize-uberjar.yml` | dockerfile-first: `bin/docker/Dockerfile` | `.github/workflows/containerize-uberjar.yml`, `bin/docker/Dockerfile`, `docs/installation-and-operation/running-metabase-on-docker.md` | high | needs built uberjar artifact |
| minio/minio | dockerfile-first: `Dockerfile.release` | compose-first: `docs/orchestration/docker-compose/docker-compose.yaml` | `Dockerfile.release`, `docs/docker/README.md`, `docs/orchestration/docker-compose/docker-compose.yaml` | high | release vs source Dockerfile choice |
| mlflow/mlflow | compose-first: `docker-compose/docker-compose.yml` | release-first: `.github/workflows/push-images.yml` | `docker/README.md`, `docker-compose/docker-compose.yml`, `.github/workflows/push-images.yml` | high | image flavor choice |
| mongo-express/mongo-express | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/publish.yml` | `Dockerfile`, `.github/workflows/publish.yml`, `README.md` | high | none |
| msgbyte/tailchat | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker-publish.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/docker-publish.yml` | high | none |
| msgbyte/tianji | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker-publish.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/docker-publish.yml` | high | none |
| n8n-io/n8n | release-first: `.github/workflows/docker-build-push.yml` | dockerfile-first: `docker/images/n8n/Dockerfile` | `.github/workflows/docker-build-push.yml`, `docker/images/n8n/Dockerfile`, `docker/images/n8n/README.md` | high | base image must be built first |
| nacos-group/nacos-docker | dockerfile-first: `build/Dockerfile` | compose-first: `example/standalone-derby.yaml` | `README.md`, `build/Dockerfile`, `.github/workflows/build&push.yaml` | high | example compose selects deployment mode |
| netbirdio/netbird | release-first: `.goreleaser.yaml` | dockerfile-first: `management/Dockerfile` | `.goreleaser.yaml`, `management/Dockerfile`, `README.md` | high | multiple service images |
| nocodb/nocodb | image-first: `docker-compose/1_Auto_Upstall/docker-compose.yml` uses `nocodb/nocodb` | none | `docker-compose/1_Auto_Upstall/README.md`, `docker-compose/1_Auto_Upstall/docker-compose.yml`, `README.md` | medium | no source Dockerfile in repo |
| node-red/node-red | image-first: external `node-red/node-red-docker` release path | release-first: `.github/workflows/release.yml` updates Docker repo | `.github/workflows/release.yml`, `README.md`, `package.json` | medium | image build lives in separate repo |
| notifuse/notifuse | compose-first: `compose.yaml` | release-first: `.github/workflows/docker-release.yml` | `compose.yaml`, `Dockerfile`, `.github/workflows/docker-release.yml` | high | none |
| open-webui/open-webui | compose-first: `docker-compose.yaml` | release-first: `.github/workflows/docker.yaml` | `docker-compose.yaml`, `Dockerfile`, `.github/workflows/docker.yaml` | high | CPU/GPU profile choice |
| openagents-org/openagents | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker-publish.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/docker-publish.yml` | high | workspace vs root app choice |
| opencart/opencart | compose-first: `docker-compose.yml` | dockerfile-first: `docker/apache/Dockerfile` | `docker-compose.yml`, `docker/apache/Dockerfile`, `Makefile` | high | apache/nginx/php service split |
| openclaw/openclaw | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker-release.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/docker-release.yml` | high | none |
| openobserve/openobserve | release-first: `.github/workflows/build-pr-image.yml` | dockerfile-first: `deploy/build/Dockerfile` | `.github/workflows/build-pr-image.yml`, `deploy/build/Dockerfile`, `README.md` | medium | public release workflow not obvious locally |
| outline/outline | release-first: `.github/workflows/docker.yml` | dockerfile-first: `Dockerfile` | `.github/workflows/docker.yml`, `Dockerfile`, `docker-compose.yml` | high | base image built separately |
| overleaf/overleaf | compose-first: `docker-compose.yml` | dockerfile-first: `server-ce/Dockerfile` | `docker-compose.yml`, `server-ce/Dockerfile`, `server-ce/Makefile` | high | many service images |
| palacms/palacms | compose-first: `deployment/production/compose.yaml` | release-first: `.github/workflows/release.yml` | `deployment/production/compose.yaml`, `Dockerfile`, `.github/workflows/release.yml` | high | `DOCKER_IMAGE` env required |
| paperless-ngx/paperless-ngx | compose-first: `docker/compose/docker-compose.postgres.yml` | release-first: `.github/workflows/ci-docker.yml` | `docker/compose/docker-compose.postgres.yml`, `Dockerfile`, `.github/workflows/ci-docker.yml` | high | DB/Tika/Gotenberg variant choice |
| payloadcms/payload | dockerfile-first: `templates/blank/Dockerfile` | compose-first: `templates/blank/docker-compose.yml` | `templates/blank/Dockerfile`, `templates/blank/docker-compose.yml`, `README.md` | low | Dockerfiles are app templates, not core image |
| penpot/penpot | compose-first: `docker/images/docker-compose.yaml` | release-first: `.github/workflows/build-docker.yml` | `docs/technical-guide/getting-started/docker.md`, `docker/images/docker-compose.yaml`, `.github/workflows/build-docker.yml` | high | backend/frontend/exporter images |
| pgadmin-org/pgadmin4 | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/check-container-build.yml` | `Dockerfile`, `docs/en_US/container_deployment.rst`, `.github/workflows/check-container-build.yml` | high | none |
| photoprism/photoprism | compose-first: `compose.yaml` | dockerfile-first: `Dockerfile` | `compose.yaml`, `Dockerfile`, `docker/README.md` | high | profile/architecture variant choice |
| phpmyadmin/phpmyadmin | inferred: PHP app image from release/source tree | none | `README.rst`, `.github/workflows/daily-snapshots.yml`, `composer.json` | low | no container build path in this repo |
| plankanban/planka | compose-first: `docker-compose.yml` | release-first: `.github/workflows/build-and-push-docker-image.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/build-and-push-docker-image.yml` | high | none |
| plausible/analytics | release-first: `.github/workflows/build-public-images-ghcr.yml` | dockerfile-first: `Dockerfile` | `.github/workflows/build-public-images-ghcr.yml`, `Dockerfile`, `Makefile` | high | CE/private image split |
| pocket-id/pocket-id | compose-first: `docker-compose.yml` | release-first: `.github/workflows/release.yml` | `docker-compose.yml`, `docker/Dockerfile`, `.github/workflows/release.yml` | high | standard vs distroless/prebuilt choice |
| presenton/presenton | compose-first: `docker-compose.yml` | dockerfile-first: `Dockerfile` | `docker-compose.yml`, `Dockerfile`, `README.md` | high | none |
| project-zot/zot | release-first: `.github/workflows/publish.yaml` | dockerfile-first: `build/Dockerfile` | `.github/workflows/publish.yaml`, `build/stacker.yaml`, `build/Dockerfile` | high | stacker build path, not plain Dockerfile only |
| quay/quay | compose-first: `docker-compose.yaml` | release-first: `.github/workflows/build-and-publish.yaml` | `docker-compose.yaml`, `Dockerfile`, `.github/workflows/build-and-publish.yaml` | high | many dependent services |
| raphaelmansuy/edgequake | compose-first: `docker-compose.quickstart.yml` | release-first: `.github/workflows/release-docker.yml` | `DOCKER_QUICK_START.md`, `docker-compose.quickstart.yml`, `.github/workflows/release-docker.yml` | high | multi-image app |
| refly-ai/refly | compose-first: `deploy/docker/docker-compose.yml` | release-first: `.github/workflows/build-image-release.yml` | `deploy/docker/docker-compose.yml`, `apps/api/Dockerfile`, `.github/workflows/build-image-release.yml` | high | api/web/middleware image set |
| rustdesk/rustdesk-server | compose-first: `docker-compose.yml` | release-first: `.github/workflows/build.yaml` | `docker-compose.yml`, `docker/Dockerfile`, `.github/workflows/build.yaml` | high | classic vs current Dockerfile choice |
| rustfs/rustfs | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/docker.yml` | high | glibc/source variant choice |
| rybbit-io/rybbit | compose-first: `docker-compose.yml` | release-first: `.github/workflows/docker-publish.yml` | `docker-compose.yml`, `server/Dockerfile`, `.github/workflows/docker-publish.yml` | high | backend/client image set |
| shyamsitaula/samarium | compose-first: `docker-compose.yml` | dockerfile-first: `Dockerfile` | `docker-compose.yml`, `Dockerfile`, `README.md` | high | none |
| sonatype/nexus-public | inferred: build Java distribution then create custom image | none | `README.md`, `pom.xml` | low | repo points to downloadable CE binary, no Docker path |
| strapi/strapi | inferred: generate app Dockerfile with `@strapi-community/dockerize` | none | `README.md`, `docker-compose.dev.yml`, `.github/workflows/publish-release.yml` | low | README says no official Docker images |
| supabase/supabase | compose-first: `docker/docker-compose.yml` | release-first: `.github/workflows/publish_image.yml` | `docker/README.md`, `docker/docker-compose.yml`, `.github/workflows/publish_image.yml` | high | many pinned service images |
| teableio/teable | compose-first: `dockers/examples/standalone/docker-compose.yaml` | release-first: `.github/workflows/docker-push.yml` | `dockers/examples/standalone/README.md`, `dockers/examples/standalone/docker-compose.yaml`, `.github/workflows/docker-push.yml` | high | app and db-migrate image targets |
| toeverything/AFFiNE | compose-first: `.docker/selfhost/compose.yml` | release-first: `.github/workflows/build-images.yml` | `.docker/selfhost/compose.yml`, `.github/workflows/build-images.yml`, `.github/deployment/node/Dockerfile` | high | self-host image uses release tags |
| tolgee/tolgee-platform | compose-first: `docker/docker-compose.yml` | release-first: `.github/workflows/release.yml` | `docker/docker-compose.yml`, `docker/app/Dockerfile`, `.github/workflows/release.yml` | high | none |
| twentyhq/twenty | compose-first: `packages/twenty-docker/docker-compose.yml` | dockerfile-first: `packages/twenty-docker/twenty/Dockerfile` | `packages/twenty-docker/docker-compose.yml`, `packages/twenty-docker/twenty/Dockerfile`, `packages/twenty-docker/Makefile` | high | app plus custom postgres image |
| typesense/typesense | image-first: `README.md` uses `typesense/typesense` | none | `README.md`, `benchmark/Dockerfile`, `benchmark/docker-compose.yml` | medium | only benchmark Dockerfile in repo |
| umami-software/umami | compose-first: `docker-compose.yml` | release-first: `.github/workflows/cd.yml` | `docker-compose.yml`, `Dockerfile`, `.github/workflows/cd.yml` | high | none |
| usekaneo/kaneo | compose-first: `compose.yml` | release-first: `.github/workflows/docker.yml` | `compose.yml`, `Dockerfile.kaneo`, `.github/workflows/docker.yml` | high | all-in-one vs split api/web choice |
| usememos/memos | compose-first: `scripts/compose.yaml` | release-first: `.github/workflows/release.yml` | `scripts/compose.yaml`, `scripts/Dockerfile`, `.github/workflows/release.yml` | high | none |
| whyour/qinglong | compose-first: `docker/docker-compose.yml` | release-first: `.github/workflows/build-docker-image.yml` | `docker/docker-compose.yml`, `docker/Dockerfile`, `.github/workflows/build-docker-image.yml` | high | Debian/Alpine variant choice |
| woocommerce/woocommerce | inferred: plugin image by layering WooCommerce into WordPress | none | `plugins/woocommerce/client/blocks/docker-compose.yml`, `docs/contribution/releases/building-and-publishing.md`, `README.md` | low | Docker evidence is test/dev for plugin blocks |
| yangchuansheng/anki-sync-server | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/docker.yml` | `Dockerfile`, `.github/workflows/docker.yml`, `README.md` | high | none |
| yangchuansheng/derper | dockerfile-first: `Dockerfile` | release-first: `.github/workflows/main.yml` | `Dockerfile`, `.github/workflows/main.yml`, `README.md` | high | none |
| yangchuansheng/eaglercraft-server | release-first: `.github/workflows/main.yml` | image-first: workflow publishes `ghcr.io/.../eaglerx1.8server` | `.github/workflows/main.yml`, `README.md` | low | workflow builds a different checked-out repo |
| yangchuansheng/full-stack-fastapi-template | compose-first: `docker-compose.yml` | release-first: `.github/workflows/main.yml` | `docker-compose.yml`, `backend/Dockerfile`, `.github/workflows/main.yml` | high | backend/frontend image set |
| zitadel/zitadel | compose-first: `deploy/compose/docker-compose.yml` | release-first: `.github/workflows/pack.yml` | `deploy/compose/README.md`, `deploy/compose/docker-compose.yml`, `.github/workflows/pack.yml` | high | api/login image set |

## Conclusion: How to Build Images Fast and Well

- 先识别根目录、`deploy/`、`docker/`、`.docker/`、`hosting/`、`packages/*-docker/` 下的 compose；这些通常比散落的 Dockerfile 更接近可运行服务。
- compose 优先级高于 Dockerfile，但要过滤 `test`、`e2e`、`benchmark`、`.devcontainer`、`.ddev`、`examples` 中只服务测试或开发依赖的文件。
- compose 同时出现 `image:` 和 `build:` 时，记录两条路径：默认复用官方镜像，源码构建走 `build.context` 和 `dockerfile`。
- 没有生产 compose 时，再看根目录或部署目录 Dockerfile；如果 Dockerfile 位于 `tests/`、`benchmark/`、模板目录或子插件目录，不能当成主产品镜像。
- release workflow 中出现 `docker/build-push-action`、`docker buildx`、`goreleaser`、`ko`、`stacker`、`docker/metadata-action` 时，应该复用 workflow 的 context、file、args、tags。
- GoReleaser/ko/stacker 项目不要退化成普通 `docker build`；这些 workflow 通常编码了 base image、tag、multi-arch 和 provenance 规则。
- Harbor、Supabase、Dify、Signoz、Immich、Coze、Twenty 这类多服务项目必须输出 image matrix，而不是只挑第一个 Dockerfile。
- Metabase、Harbor、EMQX、Rocket.Chat 这类需要先产出 jar/package/binary 的项目，应以 release/Make workflow 为主入口。
- Node-RED、Typesense、NocoDB 这类仓库内只明确推荐预构建镜像或外部 Docker 仓库时，直接记录官方镜像，不强行源码构建。
- WordPress、TYPO3、phpMyAdmin、YOURLS、PrivateBin、Matomo、Mautic 这类当前仓库没有容器入口的 PHP 项目应进入人工复核，不自动编造 Dockerfile。
- 框架/库仓库如 Drizzle、Flarum、Keystone、Payload、Strapi、WooCommerce，只有下游应用才有真实镜像；自动化应标 `inferred` 或模板路径。
- 自动化输出的最小字段应是：repo、strategy type、entry file、build context、dockerfile、image tag、evidence files、confidence、blocker。
- blocker 只记录会阻止自动化的事实：没有官方路径、构建在外部仓库、需要预构建产物、需要选择多镜像/变体。
- 不要联网补全镜像名，除非本地文档已经指向官方镜像但缺少精确名称；任何联网结果都必须标成外部信息。
