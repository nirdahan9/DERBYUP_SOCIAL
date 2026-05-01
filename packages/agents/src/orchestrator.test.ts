import test from "node:test";
import assert from "node:assert/strict";
import { runSocialPipeline } from "./orchestrator.js";

test("runs MVP pipeline and returns drafts awaiting approval", async () => {
  const result = await runSocialPipeline({
    goal: "Create social pack",
    platforms: ["linkedin", "instagram"],
    manualSources: ["https://example.com/competitor"],
    brand: {
      id: "brand",
      name: "Brand",
      voice: ["clear"],
      visualRules: [],
      requiredClaims: [],
      bannedClaims: ["100% success"],
      preferredWords: [],
      bannedWords: ["magic"],
      colors: {
        primary: "#101820",
        secondary: "#F2AA4C",
        accent: "#2EC4B6"
      }
    }
  });

  assert.equal(result.run.status, "awaiting_approval");
  assert.equal(result.run.drafts.length, 2);
  assert.ok(result.events.some((event) => event.type === "approval_needed"));
});
