# Research V1

The Research Agent is evidence-based and deliberately avoids aggressive scraping.

## Approved Sources

- `serper_search`: search result snippets and public pages fetched through Serper.
- `google_trends`: trend signals and related search topics.
- `youtube_api`: videos, titles, descriptions, channel metadata, and stats available through YouTube Data API quota.
- `rss`: feeds from public blogs/news sources.
- `public_url`: stable public web pages.
- `manual_competitor_url`: URLs provided by the operator.
- `uploaded_asset`: screenshots, exports, and documents uploaded by the operator.
- `internal_analytics`: owned channel metrics after publishing starts.
- `google_drive`: internal Docs/Sheets/Slides connected later.
- `hypothesis`: a useful guess that needs validation.

## Contract

Every insight must include:

- `source_type`
- `source_url` or `uploaded_asset_id`, unless it is a hypothesis
- `confidence`
- `evidence_note`
- `recommended_action`

Any insight without concrete evidence must use `confidence: "hypothesis"` and should not be treated as publishable fact.
