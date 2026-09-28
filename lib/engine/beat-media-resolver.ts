import { videoSourcer } from './video-sourcer';
import { matchMixkitClip } from '../media/mixkit-catalog';

export interface ResolvedBeatMedia {
  url: string;
  kind: 'video' | 'image';
  provider: 'pexels' | 'pixabay' | 'mixkit' | 'pollinations';
  license: string;
  attribution?: string;
  query?: string;
  attempts?: string[];
}

export async function resolveBeatMedia(beat: {
  text?: string;
  searchQuery?: string;
  keywords?: string[];
}): Promise<ResolvedBeatMedia | null> {
  const attempts: string[] = [];

  const query = beat.searchQuery || (beat.keywords && beat.keywords.length > 0 ? beat.keywords.join(' ') : beat.text);
  
  if (!query) {
    return null;
  }

  let keywordsToSearch = beat.keywords || [];
  if (keywordsToSearch.length === 0) {
    keywordsToSearch = query.split(/\s+/).filter(Boolean);
  }

  try {
    const foundVideos = await videoSourcer.searchForKeywords(keywordsToSearch);
    if (foundVideos && foundVideos.length > 0) {
      const best = foundVideos[0];
      return {
        url: best.url,
        kind: 'video',
        provider: best.platform as 'pexels' | 'pixabay',
        license: best.platform === 'pexels' ? 'Pexels License' : 'Pixabay License',
        query,
        attempts: ['videoSourcer'],
      };
    }
  } catch (err) {
    attempts.push(`videoSourcer error: ${err}`);
  }

  const mixkitClip = matchMixkitClip(keywordsToSearch);
  if (mixkitClip) {
    return {
      url: mixkitClip.url,
      kind: 'video',
      provider: 'mixkit',
      license: mixkitClip.license,
      attribution: undefined,
      query,
      attempts: [...attempts, 'mixkitMatch'],
    };
  }

  return null;
}
