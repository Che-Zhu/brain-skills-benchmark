/**
 * Benchmark 环境不读 Brain UI 的 GitHub OAuth 库；使用环境变量 GITHUB_TOKEN。
 */
export async function getGithubAccessToken(
  _namespace: string
): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN?.trim();
  return token ? token : null;
}
