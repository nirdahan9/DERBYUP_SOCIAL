import test from "node:test";
import assert from "node:assert/strict";
import { defaultBrand, defaultCompetitorSources } from "./defaults.js";

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

test("configures DerbyUp default competitor sources", () => {
  assert.deepEqual(
    defaultCompetitorSources.map((source) => source.id),
    ["9cat", "sport5", "one", "sport1", "hapodium"]
  );
  assert.ok(defaultCompetitorSources.every((source) => source.url.startsWith("https://")));
  assert.equal(defaultCompetitorSources.find((source) => source.id === "sport5")?.url, "https://www.sport5.co.il/");
  assert.equal(defaultCompetitorSources.find((source) => source.id === "one")?.url, "https://www.one.co.il/");
  assert.equal(defaultCompetitorSources.find((source) => source.id === "hapodium")?.url, "https://hapodium.com/");
});
