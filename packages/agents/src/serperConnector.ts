import type { ResearchEvidence } from "@social-agents/shared";

export interface SerperConnectorOptions {
  apiKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface SerperSearchOptions {
  num?: number;
  gl?: string;
  hl?: string;
}

export interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  position?: number;
}

interface SerperSearchResponse {
  organic?: SerperOrganicResult[];
  message?: string;
}

interface SerperOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
}

export class SerperConnector {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: SerperConnectorOptions) {
    if (!options.apiKey.trim()) throw new Error("SERPER_API_KEY is required.");

    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://google.serper.dev";
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async search(query: string, options: SerperSearchOptions = {}): Promise<SerperSearchResult[]> {
    if (!query.trim()) throw new Error("Serper search query is required.");

    const num = options.num ?? 5;
    if (!Number.isInteger(num) || num < 1 || num > 20) {
      throw new Error("Serper num must be an integer between 1 and 20.");
    }

    const response = await this.fetchFn(`${this.baseUrl}/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey
      },
      body: JSON.stringify({
        q: query.trim(),
        num,
        ...(options.gl ? { gl: options.gl } : {}),
        ...(options.hl ? { hl: options.hl } : {})
      })
    });
    const body = (await response.json()) as SerperSearchResponse;

    if (!response.ok) {
      throw new Error(body.message ?? `Serper API request failed with ${response.status}.`);
    }

    return (body.organic ?? []).flatMap(mapOrganicResult);
  }
}

export function createDefaultSerperConnector(env: NodeJS.ProcessEnv = process.env): SerperConnector | undefined {
  if (!env.SERPER_API_KEY) return undefined;
  return new SerperConnector({ apiKey: env.SERPER_API_KEY });
}

export function serperResultToEvidence(result: SerperSearchResult, evidenceNote: string): ResearchEvidence {
  return {
    sourceType: "serper_search",
    sourceUrl: result.link,
    evidenceNote
  };
}

function mapOrganicResult(result: SerperOrganicResult): SerperSearchResult[] {
  if (!result.link) return [];

  return [
    {
      title: result.title ?? "",
      link: result.link,
      snippet: result.snippet ?? "",
      position: result.position
    }
  ];
}
