/** Public GitHub clone URL for benchmark queue entries (no token). */
export function buildPublicRepoUrl(fullName) {
  const slug = fullName?.trim();
  if (!slug || !slug.includes("/")) {
    throw new Error(`Invalid repo full_name: ${fullName}`);
  }
  return `https://github.com/${slug}.git`;
}
