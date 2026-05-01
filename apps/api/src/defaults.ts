import type { BrandGuideline, ContentAngle } from "@social-agents/shared";

export const defaultBrand: BrandGuideline = {
  id: "default-brand",
  name: "Default Social Brand",
  voice: ["clear", "useful", "confident", "Hebrew-first"],
  visualRules: ["Use strong contrast", "Avoid generic stock-photo language", "Prefer concrete process visuals"],
  requiredClaims: [],
  bannedClaims: ["guaranteed results", "100% success"],
  preferredWords: ["תהליך", "מדיד", "ברור"],
  bannedWords: ["קסם", "מובטח"],
  colors: {
    primary: "#101820",
    secondary: "#F2AA4C",
    accent: "#2EC4B6"
  }
};

export const defaultPlatforms: ContentAngle["platform"][] = ["linkedin", "instagram", "tiktok"];
