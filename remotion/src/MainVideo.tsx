import React from "react";
import { AbsoluteFill, Series, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { anton, inter } from "./fonts";
import { SceneHook } from "./scenes/SceneHook";
import { SceneAscensao } from "./scenes/SceneAscensao";
import { SceneImersao } from "./scenes/SceneImersao";
import { SceneClimax } from "./scenes/SceneClimax";
import { SceneLogo } from "./scenes/SceneLogo";
import { SceneCTA } from "./scenes/SceneCTA";
import { GrainOverlay } from "./components/GrainOverlay";
import { VignetteOverlay } from "./components/VignetteOverlay";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0A0A", fontFamily: inter }}>
      <Series>
        <Series.Sequence durationInFrames={90}><SceneHook /></Series.Sequence>
        <Series.Sequence durationInFrames={150}><SceneAscensao /></Series.Sequence>
        <Series.Sequence durationInFrames={210}><SceneImersao /></Series.Sequence>
        <Series.Sequence durationInFrames={210}><SceneClimax /></Series.Sequence>
        <Series.Sequence durationInFrames={150}><SceneLogo /></Series.Sequence>
        <Series.Sequence durationInFrames={90}><SceneCTA /></Series.Sequence>
      </Series>
      <VignetteOverlay />
      <GrainOverlay />
    </AbsoluteFill>
  );
};
