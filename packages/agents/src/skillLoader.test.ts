import test from "node:test";
import assert from "node:assert/strict";
import { parseSkillMarkdown } from "./skillLoader.js";

test("parses skill markdown frontmatter", () => {
  const parsed = parseSkillMarkdown(`---
name: research-agent
description: Use when evidence-backed market research is needed.
metadata:
  version: 1.0.0
---

Body text`);

  assert.equal(parsed.frontmatter.name, "research-agent");
  assert.deepEqual(parsed.frontmatter.metadata, { version: "1.0.0" });
  assert.equal(parsed.body.trim(), "Body text");
});
