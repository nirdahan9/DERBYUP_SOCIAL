import test from "node:test";
import assert from "node:assert/strict";
import { validateResearchInsight } from "./validation.js";
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
