import type { ResearchEvidence } from "@social-agents/shared";

export interface YouTubeConnectorOptions {
  apiKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface YouTubeSearchOptions {
  maxResults?: number;
  publishedAfter?: string;
  regionCode?: string;
  relevanceLanguage?: string;
}

export interface YouTubeSearchVideo {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  sourceUrl: string;
  thumbnailUrl?: string;
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
  error?: {
    message?: string;
  };
}

interface YouTubeSearchItem {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      default?: {
        url?: string;
      };
      medium?: {
        url?: string;
      };
      high?: {
        url?: string;
      };
    };
  };
}

export class YouTubeConnector {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: YouTubeConnectorOptions) {
    if (!options.apiKey.trim()) throw new Error("YOUTUBE_API_KEY is required.");

    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://www.googleapis.com/youtube/v3";
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async searchVideos(query: string, options: YouTubeSearchOptions = {}): Promise<YouTubeSearchVideo[]> {
    if (!query.trim()) throw new Error("YouTube search query is required.");

    const maxResults = options.maxResults ?? 5;
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 50) {
      throw new Error("YouTube maxResults must be an integer between 1 and 50.");
    }

    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("q", query.trim());
    url.searchParams.set("maxResults", String(maxResults));
    url.searchParams.set("key", this.apiKey);

    if (options.publishedAfter) url.searchParams.set("publishedAfter", options.publishedAfter);
    if (options.regionCode) url.searchParams.set("regionCode", options.regionCode);
    if (options.relevanceLanguage) url.searchParams.set("relevanceLanguage", options.relevanceLanguage);

    const response = await this.fetchFn(url);
    const body = (await response.json()) as YouTubeSearchResponse;

    if (!response.ok) {
      throw new Error(body.error?.message ?? `YouTube API request failed with ${response.status}.`);
    }

    return (body.items ?? []).flatMap(mapSearchItem);
  }
}

export function createDefaultYouTubeConnector(env: NodeJS.ProcessEnv = process.env): YouTubeConnector | undefined {
  if (!env.YOUTUBE_API_KEY) return undefined;
  return new YouTubeConnector({ apiKey: env.YOUTUBE_API_KEY });
}

export function youtubeVideoToEvidence(video: YouTubeSearchVideo, evidenceNote: string): ResearchEvidence {
  return {
    sourceType: "youtube_api",
    sourceUrl: video.sourceUrl,
    evidenceNote
  };
}

function mapSearchItem(item: YouTubeSearchItem): YouTubeSearchVideo[] {
  const videoId = item.id?.videoId;
  const snippet = item.snippet;
  if (!videoId || !snippet) return [];

  return [
    {
      videoId,
      title: snippet.title ?? "",
      description: snippet.description ?? "",
      channelId: snippet.channelId ?? "",
      channelTitle: snippet.channelTitle ?? "",
      publishedAt: snippet.publishedAt ?? "",
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url
    }
  ];
}
