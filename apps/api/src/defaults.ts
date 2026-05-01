import type { BrandGuideline, ContentAngle } from "@social-agents/shared";

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
