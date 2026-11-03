/**
 * Fallback sample-clip and curated stock video catalog for dry-run / mock / free video generation.
 *
 * Provides curated Mixkit stock video clips under the Mixkit Video Free License:
 * - Free for commercial and non-commercial projects
 * - Stable, direct MP4 delivery from assets.mixkit.co
 * - Tag-based heuristic matching for beat-to-video alignment
 */

export type MixkitOrientation = 'vertical' | 'horizontal' | 'square';

export interface MixkitClip {
  id: string;
  url: string;
  orientation: MixkitOrientation;
  title?: string;
  tags: string[];
}

export const MIXKIT_CLIPS: MixkitClip[] = [
  {
    id: 'mixkit-ocean-waves',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
    orientation: 'horizontal',
    title: 'Waves in the water',
    tags: ['ocean', 'waves', 'water', 'sea', 'nature']
  },
  {
    id: 'mixkit-mountain-clouds',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4',
    orientation: 'horizontal',
    title: 'Clouds and blue sky',
    tags: ['mountain', 'clouds', 'sky', 'landscape', 'nature']
  },
  {
    id: 'mixkit-city-traffic',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-traffic-at-night-in-a-busy-avenue-4286-large.mp4',
    orientation: 'horizontal',
    title: 'Traffic at night',
    tags: ['city', 'traffic', 'urban', 'night', 'cars', 'technology']
  },
  {
    id: 'mixkit-person-walking',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-silhouette-of-a-person-walking-in-the-city-4328-large.mp4',
    orientation: 'horizontal',
    title: 'Person walking silhouette',
    tags: ['person', 'walking', 'city', 'silhouette', 'drama', 'mood']
  },
  {
    id: 'mixkit-forest-trees',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4',
    orientation: 'horizontal',
    title: 'Forest stream',
    tags: ['forest', 'trees', 'green', 'woods', 'nature', 'peaceful']
  },
  {
    id: 'mixkit-coffee-pour',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-pouring-coffee-into-a-cup-4245-large.mp4',
    orientation: 'horizontal',
    title: 'Pouring coffee',
    tags: ['coffee', 'morning', 'drink', 'work', 'lifestyle']
  },
  {
    id: 'mixkit-typing-keyboard',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-4171-large.mp4',
    orientation: 'horizontal',
    title: 'Typing on laptop',
    tags: ['coding', 'computer', 'typing', 'work', 'office', 'tech']
  },
  {
    id: 'mixkit-vertical-fitness',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-doing-lunges-in-gym-40544-large.mp4',
    orientation: 'vertical',
    title: 'Gym workout lunges',
    tags: ['fitness', 'gym', 'workout', 'sports', 'health', 'shorts']
  },
  {
    id: 'mixkit-vertical-sunset',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-sunset-over-the-sea-seen-from-a-beach-40578-large.mp4',
    orientation: 'vertical',
    title: 'Sunset over the sea',
    tags: ['sunset', 'beach', 'sea', 'romantic', 'nature', 'shorts']
  },
  {
    id: 'mixkit-vertical-dance',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-in-a-neon-room-41012-large.mp4',
    orientation: 'vertical',
    title: 'Neon dance',
    tags: ['dance', 'neon', 'party', 'music', 'energy', 'shorts']
  },
  {
    id: 'mixkit-vertical-city-night',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-night-city-street-timelapse-40552-large.mp4',
    orientation: 'vertical',
    title: 'Night city street timelapse',
    tags: ['city', 'timelapse', 'night', 'urban', 'lights', 'shorts']
  },
  {
    id: 'mixkit-vertical-chef',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-chef-slicing-fresh-vegetables-40530-large.mp4',
    orientation: 'vertical',
    title: 'Chef slicing vegetables',
    tags: ['food', 'cooking', 'kitchen', 'chef', 'restaurant', 'shorts']
  },
  {
    id: 'mixkit-abstract-particles',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-gold-dust-particles-flowing-in-air-4252-large.mp4',
    orientation: 'horizontal',
    title: 'Gold dust particles',
    tags: ['abstract', 'particles', 'gold', 'space', 'magic', 'luxury']
  },
  {
    id: 'mixkit-fire-flames',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-flames-of-a-burning-fire-1249-large.mp4',
    orientation: 'horizontal',
    title: 'Burning fire',
    tags: ['fire', 'flames', 'heat', 'energy', 'danger', 'power']
  },
  {
    id: 'mixkit-money-falling',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-falling-dollar-bills-in-slow-motion-4281-large.mp4',
    orientation: 'horizontal',
    title: 'Falling dollar bills',
    tags: ['money', 'finance', 'cash', 'business', 'wealth', 'success']
  },
  {
    id: 'mixkit-rain-window',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-rain-drops-falling-on-glass-window-1215-large.mp4',
    orientation: 'horizontal',
    title: 'Rain on glass window',
    tags: ['rain', 'sad', 'storm', 'weather', 'melancholy', 'glass']
  },
  {
    id: 'mixkit-space-stars',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-flight-through-galaxy-stars-4267-large.mp4',
    orientation: 'horizontal',
    title: 'Flight through stars',
    tags: ['space', 'galaxy', 'stars', 'universe', 'scifi', 'cosmos']
  },
  {
    id: 'mixkit-square-dog',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-cute-dog-looking-at-camera-4299-large.mp4',
    orientation: 'square',
    title: 'Cute dog looking at camera',
    tags: ['dog', 'animal', 'pet', 'cute', 'friendly']
  },
  {
    id: 'mixkit-square-coffee',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-latte-art-being-poured-4310-large.mp4',
    orientation: 'square',
    title: 'Latte art poured',
    tags: ['coffee', 'art', 'cafe', 'breakfast', 'barista']
  },
  {
    id: 'mixkit-square-fireworks',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-fireworks-bursting-in-the-night-sky-4275-large.mp4',
    orientation: 'square',
    title: 'Fireworks celebration',
    tags: ['fireworks', 'celebration', 'party', 'festival', 'newyear']
  }
];

/**
 * Matches a Mixkit clip based on keyword overlap
 */
export function matchMixkitClip(keywords: string[]): MixkitClip | undefined {
  if (!keywords || keywords.length === 0) return undefined;

  const normalized = keywords.map(k => k.toLowerCase().trim());
  let bestClip: MixkitClip | undefined;
  let bestScore = 0;

  for (const clip of MIXKIT_CLIPS) {
    let score = 0;
    for (const kw of normalized) {
      if (clip.tags.some(t => t.includes(kw) || kw.includes(t))) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestClip = clip;
    }
  }

  return bestClip;
}
