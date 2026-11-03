// lib/engine/2d-studio/procedural-audio-catalog.ts
// Client-safe procedural sound effect definitions and audio options.

export const PROCEDURAL_SFX_CATALOG = [
  { name: 'whoosh', dur: 0.7, desc: 'Air whoosh past camera / quick motion' },
  { name: 'swish', dur: 0.3, desc: 'Sharp swish (arm swing, card flick, whip pan)' },
  { name: 'impact', dur: 2.5, desc: 'Deep cinematic boom / bass impact' },
  { name: 'hit', dur: 0.6, desc: 'Punchy hit (strike, door slam)' },
  { name: 'riser', dur: 2.0, desc: 'Rising tension sweep into a climax / cut' },
  { name: 'slowmo', dur: 2.2, desc: 'Downward whoosh + low groan (time dilation)' },
  { name: 'freeze', dur: 2.5, desc: 'Time-freeze: reverse swell snapping to shimmer' },
  { name: 'tick', dur: 0.1, desc: 'Clock tick (single)' },
  { name: 'clock', dur: 4.0, desc: 'Ticking clock loop (tick-tock at 0.5s)' },
  { name: 'heartbeat', dur: 1.0, desc: 'Heartbeat lub-dub loop' },
  { name: 'pop', dur: 0.1, desc: 'UI pop / graphic reveal' },
  { name: 'blip', dur: 0.1, desc: 'Soft UI data blip' },
  { name: 'counter', dur: 1.5, desc: 'Rapid number counter ticking' },
  { name: 'ding', dur: 2.0, desc: 'Bright bell ding / eureka moment' },
  { name: 'shimmer', dur: 2.5, desc: 'Magical sparkle / insight reveal' },
  { name: 'stinger', dur: 3.0, desc: 'Dramatic low chord reveal / cliffhanger' },
  { name: 'footstep', dur: 0.3, desc: 'Footstep on floor' },
  { name: 'kick', dur: 0.5, desc: 'Ball kick / thud' },
  { name: 'whistle', dur: 1.2, desc: 'Referee trill whistle' },
  { name: 'carpass', dur: 3.0, desc: 'Car passing stereo pan' },
  { name: 'phonebuzz', dur: 1.6, desc: 'Vibrating phone buzz' },
  { name: 'phonering', dur: 2.0, desc: 'Classic two-tone phone ring' },
  { name: 'cheer', dur: 4.0, desc: 'Stadium crowd cheer' },
  { name: 'applause', dur: 4.0, desc: 'Audience applause' },
  { name: 'murmur', dur: 6.0, desc: 'Ambient crowd murmur' },
  { name: 'rain', dur: 6.0, desc: 'Loopable rain ambience' },
  { name: 'thunder', dur: 5.0, desc: 'Thunder crack and rumble' },
  { name: 'wind', dur: 6.0, desc: 'Wind atmosphere' },
  { name: 'roomtone', dur: 6.0, desc: 'Interior quiet room tone' },
  { name: 'city', dur: 6.0, desc: 'Night city traffic hum' },
  { name: 'hum', dur: 3.0, desc: 'Electric drone / lab machine' },
  { name: 'powerup', dur: 2.0, desc: 'Rising electric charge / power up' },
  { name: 'glitch', dur: 0.6, desc: 'Digital stutter / glitch' },
  { name: 'flash', dur: 0.5, desc: 'Camera shutter + light pop' },
  { name: 'buzz', dur: 1.5, desc: 'Fly / insect buzzing stereo pan' },
] as const;

export type ProceduralSfxName = (typeof PROCEDURAL_SFX_CATALOG)[number]['name'];

export interface GenerateSfxOptions {
  name: ProceduralSfxName | string;
  dur?: number;
  gainDb?: number;
  seed?: number;
}

export interface GenerateMusicOptions {
  mood?: 'mystery' | 'ambient' | 'lofi' | 'dramatic' | 'chill' | string;
  dur?: number;
  intensity?: number;
  gainDb?: number;
}
