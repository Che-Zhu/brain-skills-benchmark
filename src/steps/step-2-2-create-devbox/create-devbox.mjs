import { provisionDevboxForRepo } from "../../lib/devbox/provision.mjs";

export async function run(ctx) {
  await provisionDevboxForRepo(ctx);
}
