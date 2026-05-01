import test from "node:test";
import assert from "node:assert/strict";
import { normalizeManualSourceUrls, validateResearchInsight } from "./validation.js";
import type { ResearchInsight } from "./types.js";

test("rejects evidence-backed insight without a concrete source", () => {
  const insight: ResearchInsight = {
    id: "test",
    insight: "A claim",
    confidence: "medium",
    evidence: [{ sourceType: "serper_search", evidenceNote: "Missing URL" }],
    recommendedAction: "Do something"
  };

  assert.match(validateResearchInsight(insight).join(" "), /requires sourceUrl/);
});

test("allows hypothesis insight without concrete source", () => {
  const insight: ResearchInsight = {
    id: "test",
    insight: "A hypothesis",
    confidence: "hypothesis",
    evidence: [{ sourceType: "hypothesis", evidenceNote: "Needs validation" }],
    recommendedAction: "Validate before publishing"
  };

  assert.deepEqual(validateResearchInsight(insight), []);
});

test("normalizes manual source URLs with trimming, hash removal, and dedupe", () => {
  const result = normalizeManualSourceUrls([
    " https://derbyup.bet/path#section ",
    "https://derbyup.bet/path",
    "http://example.com/source?x=1"
  ]);

  assert.deepEqual(result, {
    errors: [],
    sources: ["https://derbyup.bet/path", "http://example.com/source?x=1"]
  });
});

test("rejects unsafe or malformed manual source URLs", () => {
  const result = normalizeManualSourceUrls([
    "",
    "not-a-url",
    "ftp://example.com/file",
    "https://user:pass@example.com/private",
    "http://localhost:3000",
    "http://192.168.1.10/source",
    123
  ]);

  assert.match(result.errors.join(" "), /cannot be empty/);
  assert.match(result.errors.join(" "), /valid URL/);
  assert.match(result.errors.join(" "), /http or https/);
  assert.match(result.errors.join(" "), /credentials/);
  assert.match(result.errors.join(" "), /private network/);
  assert.match(result.errors.join(" "), /must be a URL string/);
  assert.deepEqual(result.sources, []);
});

test("limits manual source URL count", () => {
  const result = normalizeManualSourceUrls(["https://a.com", "https://b.com"], 1);

  assert.match(result.errors.join(" "), /more than 1 URLs/);
  assert.deepEqual(result.sources, ["https://a.com/", "https://b.com/"]);
});
