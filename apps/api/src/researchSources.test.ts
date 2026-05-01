import test from "node:test";
import assert from "node:assert/strict";
import { collectResearchSourceRecords } from "./researchSources.js";
import type { ResearchBrief } from "@social-agents/shared";

test("collects research source records from all evidence-backed brief sections", () => {
  const brief: ResearchBrief = {
    marketSignals: [
      {
        id: "signal one!",
        insight: "Market signal",
        confidence: "medium",
        recommendedAction: "Use the signal",
        evidence: [
          {
            sourceType: "manual_competitor_url",
            sourceUrl: "https://example.com/post",
            evidenceNote: "Competitor post supplied manually."
          }
        ]
      }
    ],
    audienceInsights: [
      {
        id: "audience-clarity",
        insight: "Audience insight",
        confidence: "hypothesis",
        recommendedAction: "Validate it",
        evidence: [
          {
            sourceType: "hypothesis",
            evidenceNote: "Derived from goal only."
          }
        ]
      }
    ],
    competitorPatterns: [],
    riskFlags: [
      {
        id: "asset-risk",
        insight: "Uploaded proof needs review",
        confidence: "high",
        recommendedAction: "Review asset",
        evidence: [
          {
            sourceType: "uploaded_asset",
            uploadedAssetId: "asset_123",
            evidenceNote: "Screenshot uploaded by operator."
          }
        ]
      }
    ],
    platformNotes: {}
  };

  const records = collectResearchSourceRecords("run_123", brief);

  assert.equal(records.length, 3);
  assert.deepEqual(records.map((record) => record.sourceType), ["manual_competitor_url", "hypothesis", "uploaded_asset"]);
  assert.equal(records[0]?.sourceUrl, "https://example.com/post");
  assert.equal(records[1]?.sourceUrl, undefined);
  assert.equal(records[2]?.uploadedAssetId, "asset_123");
  assert.match(records[0]?.id ?? "", /^research_source_run_123_marketSignals_signal_one__0_0$/);
});

test("returns no records when a run has no research brief", () => {
  assert.deepEqual(collectResearchSourceRecords("run_123"), []);
});
