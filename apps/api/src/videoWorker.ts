import { readFile } from "node:fs/promises";
import { createRenderPlan } from "@social-agents/remotion";
import type { ShortVideoRenderSpec } from "@social-agents/shared";

const specPath = process.argv[2];
if (!specPath) {
  throw new Error("Usage: pnpm --filter @social-agents/api video:worker <render-spec.json>");
}

const spec = JSON.parse(await readFile(specPath, "utf8")) as ShortVideoRenderSpec;
console.log(JSON.stringify(createRenderPlan(spec), null, 2));
