import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultSerperConnector, SerperConnector, serperResultToEvidence } from "./serperConnector.js";

test("creates no default Serper connector without an API key", () => {
  assert.equal(createDefaultSerperConnector({}), undefined);
});

test("creates default Serper connector when API key is configured", () => {
  assert.ok(createDefaultSerperConnector({ SERPER_API_KEY: "test-key" }));
});

test("searches Serper using Google search endpoint", async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const connector = new SerperConnector({
    apiKey: "test-key",
    baseUrl: "https://serper.test",
    fetchFn: (async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      return jsonResponse({
        organic: [
          {
            title: "Marketing hooks that work",
            link: "https://example.com/hooks",
            snippet: "A useful public source.",
            position: 1
          },
          {
            title: "Missing link",
            snippet: "Dropped because evidence needs a URL."
          }
        ]
      });
    }) as typeof fetch
  });

  const results = await connector.search("marketing hooks", { num: 3, gl: "il", hl: "he" });
  const requestBody = JSON.parse(String(requests[0]?.init.body)) as Record<string, unknown>;

  assert.equal(requests[0]?.url, "https://serper.test/search");
  assert.equal(requests[0]?.init.method, "POST");
  assert.deepEqual(requests[0]?.init.headers, {
    "content-type": "application/json",
    "x-api-key": "test-key"
  });
  assert.deepEqual(requestBody, {
    q: "marketing hooks",
    num: 3,
    gl: "il",
    hl: "he"
  });
  assert.deepEqual(results, [
    {
      title: "Marketing hooks that work",
      link: "https://example.com/hooks",
      snippet: "A useful public source.",
      position: 1
    }
  ]);
});

test("converts Serper results to evidence records", () => {
  const evidence = serperResultToEvidence(
    {
      title: "Marketing hooks that work",
      link: "https://example.com/hooks",
      snippet: "A useful public source.",
      position: 1
    },
    "Public search result collected through Serper."
  );

  assert.deepEqual(evidence, {
    sourceType: "serper_search",
    sourceUrl: "https://example.com/hooks",
    evidenceNote: "Public search result collected through Serper."
  });
});

test("validates Serper search inputs", async () => {
  const connector = new SerperConnector({
    apiKey: "test-key",
    fetchFn: (async () => jsonResponse({ organic: [] })) as typeof fetch
  });

  await assert.rejects(() => connector.search(""), /query is required/);
  await assert.rejects(() => connector.search("x", { num: 0 }), /between 1 and 20/);
  assert.throws(() => new SerperConnector({ apiKey: "   " }), /SERPER_API_KEY/);
});

test("surfaces Serper API errors", async () => {
  const connector = new SerperConnector({
    apiKey: "test-key",
    fetchFn: (async () => jsonResponse({ message: "invalid api key" }, 401)) as typeof fetch
  });

  await assert.rejects(() => connector.search("marketing"), /invalid api key/);
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response;
}
