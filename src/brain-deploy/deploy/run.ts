import { pathToFileURL } from "node:url";

import { loadBenchmarkEnv } from "../load-env.js";
import { createDeployTask, getDeployTaskById } from "./task-store.js";
import { startDeployTaskRunner } from "./runner.js";

loadBenchmarkEnv();

export interface RunGithubDeployInput {
  branch?: string;
  namespace: string;
  projectName: string;
  projectUid?: string;
  prompt?: string;
  repoFullName: string;
  repoUrl: string;
}

function parseRepoFullName(fullName: string): { name: string; fullName: string } {
  const trimmed = fullName.trim();
  const slash = trimmed.indexOf("/");
  if (slash <= 0) {
    throw new Error(`无效的仓库名: ${fullName}，应为 owner/repo`);
  }
  return {
    fullName: trimmed,
    name: trimmed.slice(slash + 1),
  };
}

export async function runGithubDeploy(
  input: RunGithubDeployInput
): Promise<{ taskId: string }> {
  const { name, fullName } = parseRepoFullName(input.repoFullName);
  const task = await createDeployTask({
    branch: input.branch,
    namespace: input.namespace,
    projectName: input.projectName,
    projectUid: input.projectUid,
    prompt: input.prompt,
    repo: {
      fullName,
      name,
      url: input.repoUrl,
    },
  });

  console.log(`[deploy] 已创建任务 ${task.id}`);
  console.log(`[deploy] 状态文件: .data/deploy-tasks/${task.id}.json`);

  await startDeployTaskRunner({ taskId: task.id });

  const finalTask = await getDeployTaskById(task.id);
  if (finalTask?.status === "completed") {
    console.log(`[deploy] 完成: ${finalTask.status} (${finalTask.phase})`);
    return { taskId: task.id };
  }

  const message = finalTask?.error ?? `任务结束状态: ${finalTask?.status ?? "unknown"}`;
  throw new Error(message);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };

  const namespace = getArg("--namespace")?.trim();
  const repo = getArg("--repo")?.trim();
  const projectName = getArg("--project-name")?.trim();

  if (!namespace || !repo || !projectName) {
    console.error(`用法:
  npx tsx src/brain-deploy/deploy/run.ts \\
    --namespace <k8s-namespace> \\
    --repo <owner/repo 或 https://github.com/owner/repo> \\
    --project-name <brain-project-name> \\
    [--branch main] \\
    [--project-uid <uid>] \\
    [--prompt "..."]`);
    process.exit(1);
  }

  const branch = getArg("--branch");
  const projectUid = getArg("--project-uid");
  const prompt = getArg("--prompt");

  let repoFullName = repo.trim();
  let repoUrl = repo.trim();
  if (repoUrl.startsWith("http://") || repoUrl.startsWith("https://")) {
    const url = new URL(repoUrl);
    const parts = url.pathname.replace(/^\/+/, "").split("/");
    if (parts.length < 2) {
      throw new Error(`无法从 URL 解析 owner/repo: ${repoUrl}`);
    }
    repoFullName = `${parts[0]}/${parts[1]}`;
  } else {
    repoUrl = `https://github.com/${repoFullName}`;
  }

  const { taskId } = await runGithubDeploy({
    branch,
    namespace,
    projectName,
    projectUid,
    prompt,
    repoFullName,
    repoUrl,
  });

  console.log(JSON.stringify({ ok: true, taskId }, null, 2));
}

const isMain =
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
