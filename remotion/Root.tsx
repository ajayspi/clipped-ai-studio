import React from 'react';
import { Composition, CalculateMetadataFunction, registerRoot } from 'remotion';
import { MainComposition, MainCompositionProps } from './Composition';

// Default props just for the Remotion Studio preview (if run directly via remotion cli)
const defaultProps: MainCompositionProps = {
  beats: [
    {
      id: "demo-1",
      text: "This is a test beat.",
      duration: 3,
      clipUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
    }
  ],
  burnSubtitles: true,
  subtitleStyle: {
    y: 78,
    color: "#ffffff",
    size: 5.2,
    outlineWidth: 2.5,
    outlineColor: "#000000",
    isBox: false,
    boxColor: "#000000",
    uppercase: false,
    maxWidth: 82
  }
};

const calculateCustomMetadata: CalculateMetadataFunction<MainCompositionProps> = ({ props }) => {
  const beats = props?.beats || [];
  const totalDuration = beats.length > 0
    ? beats.reduce((acc: number, b) => acc + (b.duration || 3), 0)
    : 3;
  return {
    durationInFrames: Math.max(1, Math.floor(totalDuration * 30)),
    props,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainRender-9x16"
        component={MainComposition}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        calculateMetadata={calculateCustomMetadata}
      />
      <Composition
        id="MainRender-16x9"
        component={MainComposition}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
        calculateMetadata={calculateCustomMetadata}
      />
      <Composition
        id="MainRender-1x1"
        component={MainComposition}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={defaultProps}
        calculateMetadata={calculateCustomMetadata}
      />
      {/* Keeping legacy ID just in case */}
      <Composition
        id="MainRender"
        component={MainComposition}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        calculateMetadata={calculateCustomMetadata}
      />
    </>
  );
};

registerRoot(RemotionRoot);
