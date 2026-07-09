import assert from "node:assert/strict";
import test from "node:test";
import { loadTemplatesFromSealos } from "./load-templates-from-sealos.mjs";

function makeTemplate(gitRepo, name = "sample") {
  return {
    metadata: { name },
    spec: { gitRepo },
  };
}

async function withMockedFetch(fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      code: 200,
      data: {
        templates: [
          makeTemplate("https://github.com/example/existing.git", "existing"),
        ],
      },
    }),
  });
  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("keeps failing for missing BENCHMARK_REPO unless direct repo mode is enabled", async () => {
  await withMockedFetch(async () => {
    assert.rejects(
      () =>
        loadTemplatesFromSealos({
          env: {
            SEALOS_TEMPLATE_API_URL: "https://templates.example.test",
            BENCHMARK_REPO: "owner/missing",
          },
        }),
      /matched no queue entry/,
    );
  });
});

test("allows a valid direct BENCHMARK_REPO when explicitly enabled", async () => {
  await withMockedFetch(async () => {
    const queue = await loadTemplatesFromSealos({
      env: {
        SEALOS_TEMPLATE_API_URL: "https://templates.example.test",
        BENCHMARK_REPO: "owner/missing",
        BENCHMARK_ALLOW_DIRECT_REPO: "1",
      },
    });

    assert.deepEqual(queue, [
      {
        full_name: "owner/missing",
        template_name: null,
        queue_source: "direct",
      },
    ]);
  });
});

test("applies BENCHMARK_OFFSET before BENCHMARK_LIMIT", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      code: 200,
      data: {
        templates: [
          makeTemplate("https://github.com/example/one.git", "one"),
          makeTemplate("https://github.com/example/two.git", "two"),
          makeTemplate("https://github.com/example/three.git", "three"),
          makeTemplate("https://github.com/example/four.git", "four"),
        ],
      },
    }),
  });
  try {
    const queue = await loadTemplatesFromSealos({
      env: {
        SEALOS_TEMPLATE_API_URL: "https://templates.example.test",
        BENCHMARK_OFFSET: "2",
        BENCHMARK_LIMIT: "1",
      },
    });

    assert.deepEqual(queue, [
      {
        full_name: "example/three",
        template_name: "three",
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
