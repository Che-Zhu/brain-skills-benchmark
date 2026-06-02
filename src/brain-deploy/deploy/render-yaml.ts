/** Concatenate manifests for kubectl apply-style multi-document YAML. */
export function joinKubeYamlDocuments(docs: string[]): string {
  return docs
    .map((s) => s.trimEnd())
    .filter((s) => s.length > 0)
    .join("\n---\n");
}
