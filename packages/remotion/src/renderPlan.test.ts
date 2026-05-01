import test from "node:test";
import assert from "node:assert/strict";
import { createRenderPlan } from "./renderPlan.js";

test("creates render plan for short social video", () => {
  const plan = createRenderPlan({
    id: "demo",
    width: 1080,
    height: 1920,
    fps: 30,
    durationSeconds: 18,
    title: "Demo",
    captions: ["A", "B"],
    cta: "CTA",
    brand: {
      id: "brand",
      name: "Brand",
      voice: [],
      visualRules: [],
      requiredClaims: [],
      bannedClaims: [],
      preferredWords: [],
      bannedWords: [],
      colors: {
        primary: "#101820",
        secondary: "#F2AA4C",
        accent: "#2EC4B6"
      }
    }
  });

  assert.equal(plan.frames, 540);
  assert.equal(plan.outputName, "demo.mp4");
});
