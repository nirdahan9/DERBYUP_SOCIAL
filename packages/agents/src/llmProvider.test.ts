import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultLlmProvider, GroqProvider, parseJsonObject } from "./llmProvider.js";

test("parses plain JSON responses", () => {
  assert.deepEqual(parseJsonObject<{ ok: boolean }>('{"ok":true}'), { ok: true });
});

test("parses JSON surrounded by model prose", () => {
  assert.deepEqual(parseJsonObject<{ value: number }>('Here is the JSON:\n{"value":42}\nDone.'), { value: 42 });
});

test("returns no default provider when Groq API key is absent", () => {
  assert.equal(createDefaultLlmProvider({}), undefined);
});

test("creates default Groq provider when API key is present", () => {
  assert.ok(createDefaultLlmProvider({ GROQ_API_KEY: "test-key" }));
});

test("Groq provider posts chat completion requests and parses JSON", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '{"result":"ok"}'
            }
          }
        ]
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const provider = new GroqProvider("test-key", "llama-test", fetcher);
  const result = await provider.generateJson<{ result: string }>({
    system: "You are a test agent.",
    prompt: "Return JSON."
  });

  assert.deepEqual(result, { result: "ok" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal((calls[0]?.init?.headers as Record<string, string>).authorization, "Bearer test-key");
  assert.match(String(calls[0]?.init?.body), /llama-test/);
});
