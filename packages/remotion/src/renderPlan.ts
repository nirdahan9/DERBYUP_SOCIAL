import type { ShortVideoRenderSpec } from "@social-agents/shared";

export interface RenderPlan {
  compositionId: "ShortSocialVideo";
  outputName: string;
  codec: "h264";
  format: "mp4";
  inputProps: ShortVideoRenderSpec;
  frames: number;
}

export function createRenderPlan(spec: ShortVideoRenderSpec): RenderPlan {
  return {
    compositionId: "ShortSocialVideo",
    outputName: `${spec.id}.mp4`,
    codec: "h264",
    format: "mp4",
    inputProps: spec,
    frames: spec.durationSeconds * spec.fps
  };
}
