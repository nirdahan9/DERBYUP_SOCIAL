import type { BrandGuideline, ContentAngle } from "@social-agents/shared";

export interface CompetitorSource {
  id: string;
  name: string;
  url: string;
  notes: string;
}

export const defaultBrand: BrandGuideline = {
  id: "derbyup",
  name: "DerbyUp",
  voice: ["Hebrew-first", "competitive", "direct", "social", "playful", "football-native"],
  visualRules: [
    "Use Heebo for Hebrew UI and campaign assets when possible",
    "Use mobile-first football match cards, prediction slips, points, leaderboards, and private league visuals",
    "Show friends, group competition, WhatsApp-style reminders, fan clubs, offices, and matchday energy",
    "Avoid casino imagery, cash, betting chips, roulette, slot machines, and luxury payout visuals",
    "Keep the stakes social: points, rankings, crowns, trophies, pride, and bragging rights"
  ],
  requiredClaims: ["No real-money gambling when content could be confused with betting"],
  bannedClaims: [
    "real-money gambling",
    "win money",
    "guaranteed win",
    "guaranteed profit",
    "sure bet",
    "risk-free bet",
    "free money",
    "beat the bookies",
    "cash out",
    "payout"
  ],
  preferredWords: [
    "DerbyUp",
    "ניחוש תוצאה",
    "ליגה פרטית",
    "טבלת דירוג",
    "נקודות",
    "יום משחקים",
    "זכויות התרברבות",
    "תובנות AI",
    "predict",
    "compete",
    "leaderboard",
    "private leagues",
    "bragging rights"
  ],
  bannedWords: ["באנקר", "כסף קל", "זכייה בטוחה", "רווח מובטח", "הימור בטוח"],
  colors: {
    primary: "#101820",
    secondary: "#F2AA4C",
    accent: "#2EC4B6"
  }
};

export const defaultPlatforms: ContentAngle["platform"][] = ["linkedin", "instagram", "tiktok"];

export const defaultCompetitorSources: CompetitorSource[] = [
  {
    id: "9cat",
    name: "9 קטגוריות",
    url: "https://9cat.co.il/en/basketball/nba-103",
    notes: "Sports categories and prediction-style market/category browsing."
  },
  {
    id: "sport5",
    name: "ערוץ הספורט / Sport 5",
    url: "https://www.sport5.co.il/",
    notes: "Israeli sports news, live results, video, sports TV, and prediction-adjacent programming."
  },
  {
    id: "one",
    name: "ONE",
    url: "https://www.one.co.il/",
    notes: "Major Israeli sports portal with live results, video, league coverage, podcasts, and fantasy/prediction-adjacent content."
  },
  {
    id: "sport1",
    name: "ספורט 1 / Kicker",
    url: "https://sport1.maariv.co.il/",
    notes: "Israeli sports news, summaries, live results, video, and broadcast ecosystem."
  },
  {
    id: "hapodium",
    name: "הפודיום",
    url: "https://hapodium.com/",
    notes: "Sports podcast network, talent-led content, live events, social reach, and football fan community."
  }
];
