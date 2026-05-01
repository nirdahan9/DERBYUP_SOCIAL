import test from "node:test";
import assert from "node:assert/strict";
import { defaultBrand } from "./defaults.js";

test("uses DerbyUp as the default brand profile", () => {
  assert.equal(defaultBrand.id, "derbyup");
  assert.equal(defaultBrand.name, "DerbyUp");
  assert.ok(defaultBrand.voice.includes("Hebrew-first"));
  assert.ok(defaultBrand.voice.includes("football-native"));
  assert.ok(defaultBrand.preferredWords.includes("ליגה פרטית"));
  assert.ok(defaultBrand.preferredWords.includes("bragging rights"));
});

test("default DerbyUp brand blocks real-money gambling language", () => {
  assert.ok(defaultBrand.requiredClaims.some((claim) => claim.includes("No real-money gambling")));
  assert.ok(defaultBrand.bannedClaims.includes("win money"));
  assert.ok(defaultBrand.bannedClaims.includes("cash out"));
  assert.ok(defaultBrand.bannedWords.includes("באנקר"));
});
