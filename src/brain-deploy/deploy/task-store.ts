import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".."
);

export type DeployTaskPhase =
  | "queued"
  | "runtime"
  | "workspace"
  | "analyze"
  | "configure"
  | "generate"
  | "apply"
  | "preview"
  | "ship";

export type DeployTaskStatus =
  | "queued"
  | "running"
  | "blocked"
  | "applying"
  | "completed"
  | "failed"
  | "cancelled";

export interface DeployTaskRow {
  artifactSummary: Record<string, unknown>;
  blockingInputs: unknown[];
  branch: string | null;
  completedAt: Date | null;
  createdAt: Date;
  error: string | null;
  gatewaySessionId: string | null;
  gatewayThreadId: string | null;
  gatewayTurnId: string | null;
  gatewayUrl: string | null;
  heartbeatAt: Date | null;
  id: string;
  namespace: string;
  phase: DeployTaskPhase;
  previewUrl: string | null;
  projectName: string | null;
  projectUid: string | null;
  prompt: string | null;
  repoFullName: string;
  repoId: string | null;
  repoName: string;
  repoUrl: string;
  resultUrl: string | null;
  runtimeName: string | null;
  runtimeProvider: string | null;
  runtimeState: string | null;
  selectedWorkloadUid: string | null;
  startedAt: Date | null;
  status: DeployTaskStatus;
  updatedAt: Date;
}

export interface CreateDeployTaskInput {
  branch?: string;
  namespace: string;
  projectName?: string;
  projectUid?: string;
  prompt?: string;
  repo: {
    fullName: string;
    id?: string;
    name: string;
    url: string;
  };
  selectedWorkloadUid?: string;
}

export interface DeployTaskEventInput {
  kind: string;
  message?: string;
  payload?: Record<string, unknown>;
  phase?: DeployTaskPhase;
}

interface StoredTask extends Omit<DeployTaskRow, "createdAt" | "updatedAt" | "startedAt" | "completedAt" | "heartbeatAt"> {
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  heartbeatAt: string | null;
}

interface TaskBundle {
  events: {
    createdAt: string;
    kind: string;
    message: string | null;
    payload: Record<string, unknown>;
    phase: DeployTaskPhase | null;
    seq: number;
  }[];
  messages: {
    createdAt: string;
    id: string;
    parts: unknown[];
    role: string;
  }[];
  task: StoredTask;
}

function dataDir(): string {
  const configured = process.env.BENCHMARK_DATA_DIR?.trim();
  return configured
    ? path.resolve(configured)
    : path.join(REPO_ROOT, ".data");
}

function taskPath(taskId: string): string {
  return path.join(dataDir(), "deploy-tasks", `${taskId}.json`);
}

function compactOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseDate(value: string | null): Date | null {
  return value == null ? null : new Date(value);
}

function toRow(stored: StoredTask): DeployTaskRow {
  return {
    ...stored,
    completedAt: parseDate(stored.completedAt),
    createdAt: new Date(stored.createdAt),
    heartbeatAt: parseDate(stored.heartbeatAt),
    startedAt: parseDate(stored.startedAt),
    updatedAt: new Date(stored.updatedAt),
  };
}

function toStored(row: DeployTaskRow): StoredTask {
  return {
    ...row,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    heartbeatAt: row.heartbeatAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function readBundle(taskId: string): TaskBundle {
  const raw = fs.readFileSync(taskPath(taskId), "utf8");
  return JSON.parse(raw) as TaskBundle;
}

function writeBundle(bundle: TaskBundle): void {
  fs.mkdirSync(path.dirname(taskPath(bundle.task.id)), { recursive: true });
  fs.writeFileSync(taskPath(bundle.task.id), `${JSON.stringify(bundle, null, 2)}\n`);
}

export async function createDeployTask(
  input: CreateDeployTaskInput
): Promise<DeployTaskRow> {
  const id = randomUUID();
  const now = new Date();
  const title = compactOptional(input.projectName)
    ? `Deploy ${input.repo.fullName} into ${input.projectName}`
    : `Deploy ${input.repo.fullName}`;

  const row: DeployTaskRow = {
    artifactSummary: {},
    blockingInputs: [],
    branch: compactOptional(input.branch),
    completedAt: null,
    createdAt: now,
    error: null,
    gatewaySessionId: null,
    gatewayThreadId: null,
    gatewayTurnId: null,
    gatewayUrl: null,
    heartbeatAt: now,
    id,
    namespace: input.namespace.trim(),
    phase: "queued",
    previewUrl: null,
    projectName: compactOptional(input.projectName),
    projectUid: compactOptional(input.projectUid),
    prompt: compactOptional(input.prompt) ?? title,
    repoFullName: input.repo.fullName.trim(),
    repoId: compactOptional(input.repo.id),
    repoName: input.repo.name.trim(),
    repoUrl: input.repo.url.trim(),
    resultUrl: null,
    runtimeName: null,
    runtimeProvider: null,
    runtimeState: null,
    selectedWorkloadUid: compactOptional(input.selectedWorkloadUid),
    startedAt: null,
    status: "queued",
    updatedAt: now,
  };

  writeBundle({
    events: [],
    messages: [
      {
        createdAt: now.toISOString(),
        id: randomUUID(),
        parts: [{ text: row.prompt, type: "text" }],
        role: "user",
      },
    ],
    task: toStored(row),
  });

  await recordDeployTaskEvent(id, {
    kind: "deploy_task.created",
    message: "Deploy task queued.",
    payload: { repoFullName: row.repoFullName, projectUid: row.projectUid },
    phase: "queued",
  });

  return row;
}

export async function getDeployTaskById(
  taskId: string
): Promise<DeployTaskRow | null> {
  const file = taskPath(taskId);
  if (!fs.existsSync(file)) {
    return null;
  }
  return toRow(readBundle(taskId).task);
}

export async function recordDeployTaskEvent(
  taskId: string,
  input: DeployTaskEventInput
): Promise<void> {
  const bundle = readBundle(taskId);
  const seq = bundle.events.length + 1;
  bundle.events.push({
    createdAt: new Date().toISOString(),
    kind: input.kind,
    message: compactOptional(input.message),
    payload: input.payload ?? {},
    phase: input.phase ?? null,
    seq,
  });
  const row = toRow(bundle.task);
  row.updatedAt = new Date();
  row.heartbeatAt = new Date();
  if (input.phase != null) {
    row.phase = input.phase;
  }
  bundle.task = toStored(row);
  writeBundle(bundle);
}

export async function updateDeployTaskState(
  taskId: string,
  input: Partial<{
    artifactSummary: Record<string, unknown>;
    completedAt: Date | null;
    error: string | null;
    gatewaySessionId: string | null;
    gatewayThreadId: string | null;
    gatewayTurnId: string | null;
    gatewayUrl: string | null;
    phase: DeployTaskPhase;
    previewUrl: string | null;
    resultUrl: string | null;
    runtimeName: string | null;
    runtimeProvider: string | null;
    runtimeState: string | null;
    startedAt: Date | null;
    status: DeployTaskStatus;
  }>
): Promise<DeployTaskRow | null> {
  const bundle = readBundle(taskId);
  const row = toRow(bundle.task);
  const now = new Date();
  const isTerminal =
    input.status === "completed" ||
    input.status === "failed" ||
    input.status === "cancelled";

  Object.assign(row, input);
  row.updatedAt = now;
  row.heartbeatAt = now;
  if (input.status === "running" && row.startedAt == null) {
    row.startedAt = now;
  }
  if (isTerminal) {
    row.completedAt = now;
  }

  bundle.task = toStored(row);
  writeBundle(bundle);
  return row;
}

export async function appendDeployTaskMessage(input: {
  id?: string;
  parts: unknown[];
  role: string;
  taskId: string;
}): Promise<void> {
  const bundle = readBundle(input.taskId);
  const messageId = input.id ?? randomUUID();
  const existingIndex = bundle.messages.findIndex((m) => m.id === messageId);
  const entry = {
    createdAt: new Date().toISOString(),
    id: messageId,
    parts: input.parts,
    role: input.role,
  };
  if (existingIndex >= 0) {
    bundle.messages[existingIndex] = entry;
  } else {
    bundle.messages.push(entry);
  }
  writeBundle(bundle);
}

export function getDeployTaskSnapshotPath(taskId: string): string {
  return taskPath(taskId);
}
