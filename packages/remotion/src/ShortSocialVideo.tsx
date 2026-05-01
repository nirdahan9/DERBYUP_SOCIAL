import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import type { ShortVideoRenderSpec } from "@social-agents/shared";

export function ShortSocialVideo({ spec }: { spec: ShortVideoRenderSpec }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const captionDuration = Math.max(1, Math.floor((spec.durationSeconds * fps) / spec.captions.length));
  const activeCaption = spec.captions[Math.min(spec.captions.length - 1, Math.floor(frame / captionDuration))] ?? spec.title;
  const progress = interpolate(frame, [0, spec.durationSeconds * fps], [0, 100], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: spec.brand.colors.primary,
        color: "white",
        fontFamily: "Inter, Arial, sans-serif",
        padding: 84,
        justifyContent: "space-between"
      }}
    >
      <div style={{ fontSize: 42, color: spec.brand.colors.accent, fontWeight: 700 }}>{spec.brand.name}</div>
      <div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.06 }}>{spec.title}</div>
        <Sequence from={0}>
          <div style={{ marginTop: 72, fontSize: 56, lineHeight: 1.15, color: spec.brand.colors.secondary }}>
            {activeCaption}
          </div>
        </Sequence>
      </div>
      <div>
        <div style={{ fontSize: 36, lineHeight: 1.2 }}>{spec.cta}</div>
        <div style={{ height: 10, background: "rgba(255,255,255,0.18)", marginTop: 32 }}>
          <div style={{ width: `${progress}%`, height: "100%", background: spec.brand.colors.accent }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
