import type { ResearchBrief, ResearchEvidence, ResearchInsight, ResearchSourceType } from "@social-agents/shared";

export interface ResearchSourceRecord {
  id: string;
  runId: string;
  sourceType: ResearchSourceType;
  sourceUrl?: string;
  uploadedAssetId?: string;
  evidenceNote: string;
}

type ResearchSection = "marketSignals" | "audienceInsights" | "competitorPatterns" | "riskFlags";

const researchSections: ResearchSection[] = ["marketSignals", "audienceInsights", "competitorPatterns", "riskFlags"];

export function collectResearchSourceRecords(runId: string, brief?: ResearchBrief): ResearchSourceRecord[] {
  if (!brief) return [];

  return researchSections.flatMap((section) =>
    brief[section].flatMap((insight, insightIndex) =>
      insight.evidence.map((evidence, evidenceIndex) => toResearchSourceRecord(runId, section, insight, insightIndex, evidence, evidenceIndex))
    )
  );
}

function toResearchSourceRecord(
  runId: string,
  section: ResearchSection,
  insight: ResearchInsight,
  insightIndex: number,
  evidence: ResearchEvidence,
  evidenceIndex: number
): ResearchSourceRecord {
  return {
    id: makeResearchSourceId(runId, section, insight.id, insightIndex, evidenceIndex),
    runId,
    sourceType: evidence.sourceType,
    sourceUrl: evidence.sourceUrl,
    uploadedAssetId: evidence.uploadedAssetId,
    evidenceNote: evidence.evidenceNote
  };
}

function makeResearchSourceId(runId: string, section: ResearchSection, insightId: string, insightIndex: number, evidenceIndex: number): string {
  const safeInsightId = insightId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return `research_source_${runId}_${section}_${safeInsightId}_${insightIndex}_${evidenceIndex}`;
}
