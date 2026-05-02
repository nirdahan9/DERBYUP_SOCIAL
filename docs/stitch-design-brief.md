# Stitch Design Brief - DerbyUp Social Agent Control Plane

Last updated: 2026-05-02

## Purpose

Use this brief to generate the first professional admin UI in Stitch for the DerbyUp Social Agent Control Plane.

The UI should control autonomous social/content agents that research public sources, plan campaigns, validate brand guidelines, create Hebrew drafts, prepare video specs, and send drafts to approval.

Do not include API keys, database URLs, tokens, or MCP secrets in the design prompt or generated code.

## Product Context

DerbyUp is a Hebrew-first social football prediction platform.

Users predict match outcomes, earn points, compete in private leagues, climb leaderboards, and claim bragging rights. DerbyUp is not real-money gambling. The product is about prediction gaming, football knowledge, friends, rankings, and social competition.

## Brand Direction

Use DerbyUp's brand system:

- Primary dark: `#101820`
- Gold accent: `#F2AA4C`
- Teal accent: `#2EC4B6`
- Background: deep navy or near-black based on `#101820`
- Surfaces: slightly lighter navy panels
- Text: white and soft gray
- Success: teal
- Warning and approval states: gold

Avoid purple as the dominant color. The interface should feel like a serious sports-tech AI operations dashboard, not a generic purple SaaS template.

Typography:

- Use Heebo or a similar Hebrew-friendly sans-serif font.
- Entire UI should be RTL.
- Visible product labels should be in Hebrew.

## Stitch Prompt

```text
Design a professional RTL Hebrew admin dashboard for “DerbyUp Social Agent Control Plane”.

Product context:
DerbyUp is a Hebrew-first social football prediction platform. Users predict match results, compete in private leagues, climb leaderboards, and earn bragging rights. This dashboard controls autonomous social media agents that research trends, create content drafts, check brand guidelines, generate video specs, and prepare posts for approval.

Important brand rule:
DerbyUp is prediction gaming, not real-money gambling. Do not use casino, sportsbook, cash, roulette, chips, payout, or money-winning imagery.

Visual style:
Create a polished dark SaaS dashboard inspired by premium AI control panels and sports analytics products. It should feel sharp, confident, modern, and operational. Build the actual admin screen, not a marketing landing page.

Use DerbyUp brand colors:
- Primary dark: #101820
- Gold accent: #F2AA4C
- Teal accent: #2EC4B6
- Background: deep navy / near black based on #101820
- Surfaces: slightly lighter navy panels
- Text: white / soft gray
- Success: teal
- Pending approval / attention: gold
- Avoid purple as the dominant color.

Typography:
Use Heebo or a similar Hebrew-friendly sans-serif font.
The entire interface should be RTL.
All visible labels should be in Hebrew.

Main screen title:
מרכז שליטה לסוכני סושיאל

Navigation items:
- סקירה
- הרצות
- אייגנטים
- מחקר
- טיוטות
- אישורים
- Brand Guidelines
- וידאו
- מקורות מידע
- הגדרות

Layout:
Use a desktop-first admin layout with an RTL sidebar, top bar, dense operational cards, and clear approval actions.
Do not use a landing page hero.
Do not place cards inside cards.
Use clean panels with subtle borders and max 8px border radius.

Top operational band:
- Status card: מערכת פעילה
- Current workflow: Research → Strategy → Brand → Creative → Packager
- Primary button: הרץ Workflow
- Secondary button: הוסף מקור מחקר
- Connector indicators: Groq, Serper, YouTube, Postgres

Primary dashboard sections:

1. Agent Roster
Show agent cards with status, role, last run time, and action icon:
- CMO Orchestrator
- Research Agent
- Strategy Agent
- Brand Guideline Agent
- Creative Content Agent
- Visual Agent
- Video Agent
- SEO/GEO Agent
- Packager Agent
- Publisher Agent

Statuses:
- פעיל
- מושהה
- ממתין לאישור
- שגיאה

2. Live Workflow Timeline
Show pipeline progress:
- Research completed
- Strategy completed
- Brand check pending
- Creative draft generated
- Waiting for approval

Use teal for completed, gold for pending approval, gray for waiting, and red only for errors.

3. Research Brief Panel
Show evidence-based insights:
- Insight title
- Source type badge: Serper, YouTube, URL, Upload
- Confidence score
- Source link icon
- Recommended action

Example Hebrew labels:
- תובנות מחקר
- מקור
- רמת ביטחון
- פעולה מומלצת

4. Draft Approval Queue
Show social post draft cards:
- Platform badge: Instagram / TikTok / LinkedIn
- Hook
- Caption preview
- Brand guideline result: עבר / אזהרה / נכשל
- Buttons: אשר, דחה, ערוך
- Preview area for image or video

5. Brand Guidelines Panel
Show DerbyUp brand rules:
- Tone: תחרותי, ישיר, חברתי, קליל
- Required rule: ללא הימורים בכסף אמיתי
- Banned claims: זכייה בטוחה, כסף קל, רווח מובטח
- Visual rules: football, private leagues, leaderboards, WhatsApp, prediction slips

6. Metrics Strip
Small cards:
- הרצות היום
- טיוטות לאישור
- מקורות מחקר נסרקו
- בדיקות מותג שעברו
- תקציב חודשי משוער

Design details:
- Use icons for actions where appropriate.
- Use subtle borders, restrained shadows, and strong spacing discipline.
- Use gold for primary call-to-action and approval attention.
- Use teal for active and success states.
- Include subtle sports prediction cues: match cards, score, leaderboard, prediction slip, trophy/bragging rights.
- The product should feel premium, trustworthy, and operational.

Generate one complete desktop dashboard screen with realistic Hebrew microcopy.
```

## Component Contract For Stitch Export

Ask Stitch to generate reusable React components with mock data shaped like API responses:

```text
Create the UI as reusable React components:
- Sidebar
- TopBar
- MetricsStrip
- AgentRoster
- WorkflowTimeline
- ResearchBrief
- DraftApprovalQueue
- BrandGuidelinesPanel
- RunActionBar

Use mock data shaped like an API response so the UI can later connect to:
GET /api/agents
GET /api/runs
GET /api/events
GET /api/drafts
POST /api/runs
POST /api/drafts/:id/approve
POST /api/drafts/:id/reject
PATCH /api/drafts/:id
```

## API Data Shapes

The frontend should be easy to wire to these local API surfaces:

- `GET /api/agents`: agent roster, status, model, budget.
- `POST /api/runs`: starts a workflow.
- `GET /api/runs`: returns workflow runs with research brief and drafts.
- `GET /api/events`: live event history.
- `POST /api/drafts/:id/approve`: approves a draft.
- `POST /api/drafts/:id/reject`: rejects a draft.
- `PATCH /api/drafts/:id`: edits a draft once implemented.

## MCP Notes

The Stitch MCP key should be stored outside the repo, for example:

- `STITCH_API_KEY` in the local MCP host environment.
- `STITCH_API_KEY` in Railway service variables only when that service actually needs it.

Never commit the raw key.
