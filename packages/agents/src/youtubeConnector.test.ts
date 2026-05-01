import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultYouTubeConnector, YouTubeConnector, youtubeVideoToEvidence } from "./youtubeConnector.js";

test("creates no default YouTube connector without an API key", () => {
  assert.equal(createDefaultYouTubeConnector({}), undefined);
});

test("creates default YouTube connector when API key is configured", () => {
  assert.ok(createDefaultYouTubeConnector({ YOUTUBE_API_KEY: "test-key" }));
});

test("searches YouTube videos through the Data API v3 search endpoint", async () => {
  const requestedUrls: string[] = [];
  const connector = new YouTubeConnector({
    apiKey: "test-key",
    baseUrl: "https://youtube.test/v3",
    fetchFn: (async (url: URL) => {
      requestedUrls.push(url.toString());
      return jsonResponse({
        items: [
          {
            id: { videoId: "abc123" },
            snippet: {
              title: "Proof-led hook",
              description: "A short competitor format example.",
              channelId: "channel-1",
              channelTitle: "Competitor Channel",
              publishedAt: "2026-04-01T08:00:00Z",
              thumbnails: {
                high: { url: "https://img.example/high.jpg" }
              }
            }
          },
          {
            id: {},
            snippet: {
              title: "Missing id"
            }
          }
        ]
      });
    }) as typeof fetch
  });

  const videos = await connector.searchVideos("derby marketing", {
    maxResults: 3,
    publishedAfter: "2026-01-01T00:00:00Z",
    regionCode: "IL",
    relevanceLanguage: "he"
  });
  const url = new URL(requestedUrls[0]!);

  assert.equal(url.pathname, "/v3/search");
  assert.equal(url.searchParams.get("part"), "snippet");
  assert.equal(url.searchParams.get("type"), "video");
  assert.equal(url.searchParams.get("q"), "derby marketing");
  assert.equal(url.searchParams.get("maxResults"), "3");
  assert.equal(url.searchParams.get("key"), "test-key");
  assert.equal(url.searchParams.get("publishedAfter"), "2026-01-01T00:00:00Z");
  assert.equal(url.searchParams.get("regionCode"), "IL");
  assert.equal(url.searchParams.get("relevanceLanguage"), "he");
  assert.deepEqual(videos, [
    {
      videoId: "abc123",
      title: "Proof-led hook",
      description: "A short competitor format example.",
      channelId: "channel-1",
      channelTitle: "Competitor Channel",
      publishedAt: "2026-04-01T08:00:00Z",
      sourceUrl: "https://www.youtube.com/watch?v=abc123",
      thumbnailUrl: "https://img.example/high.jpg"
    }
  ]);
});

test("converts YouTube videos to evidence records", () => {
  const evidence = youtubeVideoToEvidence(
    {
      videoId: "abc123",
      title: "Proof-led hook",
      description: "",
      channelId: "channel-1",
      channelTitle: "Competitor Channel",
      publishedAt: "2026-04-01T08:00:00Z",
      sourceUrl: "https://www.youtube.com/watch?v=abc123"
    },
    "Video title and metadata were collected through YouTube Data API v3."
  );

  assert.deepEqual(evidence, {
    sourceType: "youtube_api",
    sourceUrl: "https://www.youtube.com/watch?v=abc123",
    evidenceNote: "Video title and metadata were collected through YouTube Data API v3."
  });
});

test("validates YouTube search inputs", async () => {
  const connector = new YouTubeConnector({
    apiKey: "test-key",
    fetchFn: (async () => jsonResponse({ items: [] })) as typeof fetch
  });

  await assert.rejects(() => connector.searchVideos(""), /query is required/);
  await assert.rejects(() => connector.searchVideos("x", { maxResults: 0 }), /between 1 and 50/);
  assert.throws(() => new YouTubeConnector({ apiKey: "   " }), /YOUTUBE_API_KEY/);
});

test("surfaces YouTube API errors", async () => {
  const connector = new YouTubeConnector({
    apiKey: "test-key",
    fetchFn: (async () => jsonResponse({ error: { message: "quota exceeded" } }, 403)) as typeof fetch
  });

  await assert.rejects(() => connector.searchVideos("derby"), /quota exceeded/);
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response;
}
