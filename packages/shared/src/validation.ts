import type { ResearchEvidence, ResearchInsight, ResearchSourceType } from "./types.js";

export interface ManualSourceValidationResult {
  errors: string[];
  sources: string[];
}

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

export function normalizeManualSourceUrls(value: unknown, maxSources = 10): ManualSourceValidationResult {
  const errors: string[] = [];
  const sources: string[] = [];
  const seen = new Set<string>();

  if (value === undefined) return { errors, sources };
  if (!Array.isArray(value)) return { errors: ["manualSources must be an array of URLs."], sources };
  if (value.length > maxSources) {
    errors.push(`manualSources cannot include more than ${maxSources} URLs.`);
  }

  value.forEach((item, index) => {
    if (typeof item !== "string") {
      errors.push(`manualSources[${index}] must be a URL string.`);
      return;
    }

    const trimmed = item.trim();
    if (!trimmed) {
      errors.push(`manualSources[${index}] cannot be empty.`);
      return;
    }

    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      errors.push(`manualSources[${index}] must be a valid URL.`);
      return;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      errors.push(`manualSources[${index}] must use http or https.`);
      return;
    }

    if (url.username || url.password) {
      errors.push(`manualSources[${index}] cannot include credentials.`);
      return;
    }

    if (isBlockedManualSourceHost(url.hostname)) {
      errors.push(`manualSources[${index}] cannot point to localhost or private network hosts.`);
      return;
    }

    url.hash = "";
    const normalized = url.toString();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      sources.push(normalized);
    }
  });

  return { errors, sources };
}

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

function isBlockedManualSourceHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;

  const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;

  const first = octets[0]!;
  const second = octets[1]!;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    first === 0
  );
}
