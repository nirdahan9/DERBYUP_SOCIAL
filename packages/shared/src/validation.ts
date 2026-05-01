import type { ResearchEvidence, ResearchInsight, ResearchSourceType } from "./types.js";

export const allowedResearchSourceTypes: ResearchSourceType[] = [
  "serper_search",
  "google_trends",
  "youtube_api",
  "rss",
  "public_url",
  "manual_competitor_url",
  "uploaded_asset",
  "internal_analytics",
  "google_drive",
  "hypothesis"
];

export function validateResearchEvidence(evidence: ResearchEvidence): string[] {
  const errors: string[] = [];

  if (!allowedResearchSourceTypes.includes(evidence.sourceType)) {
    errors.push(`Unsupported source type: ${evidence.sourceType}`);
  }

  if (!evidence.evidenceNote.trim()) {
    errors.push("Evidence note is required.");
  }

  if (evidence.sourceType === "uploaded_asset" && !evidence.uploadedAssetId) {
    errors.push("Uploaded asset evidence requires uploadedAssetId.");
  }

  if (evidence.sourceType !== "uploaded_asset" && evidence.sourceType !== "hypothesis" && !evidence.sourceUrl) {
    errors.push(`${evidence.sourceType} evidence requires sourceUrl.`);
  }

  return errors;
}

export function validateResearchInsight(insight: ResearchInsight): string[] {
  const errors: string[] = [];

  if (!insight.id.trim()) errors.push("Insight id is required.");
  if (!insight.insight.trim()) errors.push("Insight text is required.");
  if (!insight.recommendedAction.trim()) errors.push("Recommended action is required.");

  if (insight.confidence !== "hypothesis" && insight.evidence.length === 0) {
    errors.push("Evidence-backed insight requires at least one evidence item.");
  }

  for (const item of insight.evidence) {
    errors.push(...validateResearchEvidence(item));
  }

  const hasOnlyHypothesisEvidence = insight.evidence.every((item) => item.sourceType === "hypothesis");
  if (hasOnlyHypothesisEvidence && insight.confidence !== "hypothesis") {
    errors.push("Insights without concrete sources must use hypothesis confidence.");
  }

  return errors;
}

export function assertValidResearchInsight(insight: ResearchInsight): void {
  const errors = validateResearchInsight(insight);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}
