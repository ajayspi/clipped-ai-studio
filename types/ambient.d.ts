/**
 * Ambient declarations for modules without published typings.
 *
 * fluent-ffmpeg ships no type definitions (runtime package only). The
 * render worker drives it purely via command chaining
 * (input/inputOptions/videoFilters/outputOptions/save/on); keeping the
 * export as a loosely-typed value preserves that untyped surface without
 * polluting app code.
 */
declare module 'fluent-ffmpeg' {
  const ffmpeg: any;
  export = ffmpeg;
}

/**
 * node-edge-tts: untyped runtime package used lazily (dynamic import) by the
 * keyless TTS fallback. The surface exercised here is a constructor with
 * synthesis options plus a single ttsPromise(text, outputPath) call.
 */
declare module 'node-edge-tts' {
  export interface EdgeTTSOptions {
    voice: string;
    lang: string;
    outputFormat: string;
    rate: string;
    pitch: string;
    volume: string;
    timeout?: number;
  }
  export class EdgeTTS {
    constructor(options: EdgeTTSOptions);
    ttsPromise(text: string, outputPath: string): Promise<void>;
  }
}

/**
 * youtube-transcript: untyped runtime package used lazily (dynamic import) by
 * the shorts extractor to fetch caption segments for a video id.
 */
declare module 'youtube-transcript' {
  export interface TranscriptSegment {
    text: string;
    duration: number;
    offset: number;
  }
  export const YoutubeTranscript: {
    fetchTranscript(videoId: string): Promise<TranscriptSegment[]>;
  };
}