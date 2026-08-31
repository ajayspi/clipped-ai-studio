import { Composition } from 'remotion';
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
      />
      <Composition
        id="MainRender-16x9"
        component={MainComposition}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
      <Composition
        id="MainRender-1x1"
        component={MainComposition}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={defaultProps}
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
      />
    </>
  );
};
