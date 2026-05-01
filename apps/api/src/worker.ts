import { runSocialPipeline } from "@social-agents/agents";
import { defaultBrand, defaultPlatforms } from "./defaults.js";

const result = await runSocialPipeline({
  goal: process.argv.slice(2).join(" ") || "Create a mocked worker run",
  platforms: defaultPlatforms,
  brand: defaultBrand,
  manualSources: []
});

console.log(JSON.stringify(result, null, 2));
