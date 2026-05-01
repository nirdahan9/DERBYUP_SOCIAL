import React from "react";
import { Composition } from "remotion";
import { ShortSocialVideo } from "./ShortSocialVideo.js";

export function RemotionRoot() {
  return (
    <Composition
      id="ShortSocialVideo"
      component={ShortSocialVideo}
      durationInFrames={540}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        spec: {
          id: "demo",
          width: 1080,
          height: 1920,
          fps: 30,
          durationSeconds: 18,
          title: "Transformation proof",
          captions: ["Hook", "Research signal", "Draft ready for approval"],
          cta: "Send us a message",
          brand: {
            id: "demo",
            name: "Demo Brand",
            voice: ["clear"],
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
        }
      }}
    />
  );
}
