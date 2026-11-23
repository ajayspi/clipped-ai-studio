// lib/engine/2d-studio/procedural-audio-catalog.ts
// Client-safe procedural sound effect definitions and audio options.
// Auto-synced with aitrends-2d-studio/audio/sfx.py (69 broadcast synthesizers).

export const PROCEDURAL_SFX_CATALOG = [
  { name: 'whoosh', dur: 0.7, desc: 'air whoosh past camera / quick movement' },
  { name: 'swish', dur: 0.3, desc: 'short sharp swish (arm swing, card flick, whip pan)' },
  { name: 'impact', dur: 2.5, desc: 'deep cinematic boom / impact with tail' },
  { name: 'hit', dur: 0.6, desc: 'punchy short hit (body hit, ball strike, door slam)' },
  { name: 'riser', dur: 2.0, desc: 'rising tension sweep into a moment (use 1-3 s before a cut)' },
  { name: 'slowmo', dur: 2.2, desc: 'downward whoosh + low groan: time slowing down / slow motion begins' },
  { name: 'freeze', dur: 2.5, desc: 'time-freeze: reverse swell that snaps into a shimmering high tone' },
  { name: 'tick', dur: 0.12, desc: 'clock tick (single)' },
  { name: 'clock', dur: 4.0, desc: 'ticking clock loop (tick-tock every 0.5 s)' },
  { name: 'heartbeat', dur: 1.0, desc: 'heartbeat lub-dub (loops cleanly at 1 beat/s)' },
  { name: 'pop', dur: 0.15, desc: 'UI pop: graphic / label appears' },
  { name: 'blip', dur: 0.12, desc: 'soft UI blip / data beep' },
  { name: 'counter', dur: 1.5, desc: 'number counter ticking up (rapid blips)' },
  { name: 'ding', dur: 2.0, desc: 'bright bell ding / realisation / correct' },
  { name: 'shimmer', dur: 2.5, desc: 'magical shimmer / sparkle / superpower reveal' },
  { name: 'stinger', dur: 3.0, desc: 'dramatic stinger: big low chord hit for reveals / cliffhangers' },
  { name: 'footstep', dur: 0.3, desc: 'footstep (single)' },
  { name: 'kick', dur: 0.5, desc: 'ball kick / thud' },
  { name: 'whistle', dur: 1.2, desc: 'referee whistle (trill)' },
  { name: 'carpass', dur: 3.0, desc: 'car passing by (left to right)' },
  { name: 'phonebuzz', dur: 1.6, desc: 'phone vibrating buzz' },
  { name: 'phonering', dur: 2.0, desc: 'phone ringtone (two-tone)' },
  { name: 'cheer', dur: 4.0, desc: 'stadium crowd cheer / roar' },
  { name: 'applause', dur: 4.0, desc: 'applause / slow building clapping crowd' },
  { name: 'murmur', dur: 6.0, desc: 'crowd murmur bed (loopable)' },
  { name: 'rain', dur: 6.0, desc: 'rain ambience bed (loopable)' },
  { name: 'thunder', dur: 5.0, desc: 'thunder crack + long rumble' },
  { name: 'wind', dur: 6.0, desc: 'wind ambience (loopable)' },
  { name: 'roomtone', dur: 6.0, desc: 'quiet room tone / interior air (loopable)' },
  { name: 'city', dur: 6.0, desc: 'night city ambience: distant traffic hum (loopable)' },
  { name: 'hum', dur: 3.0, desc: 'electric hum / lab machine / power-up drone' },
  { name: 'powerup', dur: 2.0, desc: 'power-up: rising electric charge (gadget / machine start)' },
  { name: 'glitch', dur: 0.6, desc: 'glitch / digital stutter' },
  { name: 'flash', dur: 0.5, desc: 'camera flash / shutter + light pop' },
  { name: 'buzz', dur: 1.5, desc: 'insect / fly buzzing past (pans left to right)' },
  { name: 'wood_crack', dur: 0.5, desc: 'wood cracking under stress / structural break' },
  { name: 'timber_tear', dur: 0.8, desc: 'timber tearing / splintering wood failure' },
  { name: 'bubbles', dur: 2.0, desc: 'rising water bubbles / underwater effervescence' },
  { name: 'splash_big', dur: 1.5, desc: 'heavy water splash / massive impact in liquid' },
  { name: 'water_bed', dur: 4.0, desc: 'calm water surface bed / sloshing river wash' },
  { name: 'oof', dur: 0.3, desc: 'vocal effort grunt / sudden body impact oof' },
  { name: 'whoa', dur: 0.5, desc: 'vocal reaction gasp / whoa surprise' },
  { name: 'babble', dur: 4.0, desc: 'procedural crowd chatter / distant background babble' },
  { name: 'hurrah', dur: 1.2, desc: 'crowd celebratory hurrah / cheer shout' },
  { name: 'bird_chirps', dur: 4.0, desc: 'ambient nature bird chirps (sparrow/songbird)' },
  { name: 'crickets', dur: 4.0, desc: 'night crickets bed / outdoor evening atmosphere' },
  { name: 'breeze', dur: 4.0, desc: 'gentle wind breeze gust / rustling air' },
  { name: 'flag_flutter', dur: 2.0, desc: 'fabric banner / flag fluttering in wind' },
  { name: 'swing_squeak', dur: 0.6, desc: 'metal swing squeak / mechanical hinge friction' },
  { name: 'push_thump', dur: 0.4, desc: 'body shove / physical push thump' },
  { name: 'hammer_hit', dur: 0.4, desc: 'solid hammer strike / metal on wood impact' },
  { name: 'stroll_step', dur: 0.3, desc: 'natural casual strolling footstep on gravel/wood' },
  { name: 'creak', dur: 1.2, desc: 'slow organic creak / structural tension' },
  { name: 'clink', dur: 0.25, desc: 'metallic clink / coin or chain ring' },
  { name: 'rattle', dur: 1.5, desc: 'loose chain / fastener metal rattle' },
  { name: 'column_stomp', dur: 0.5, desc: 'synchronized regiment marching stomp' },
  { name: 'bolt_snap', dur: 0.4, desc: 'high-tension bolt or cable snap / ping' },
  { name: 'chain_whip', dur: 0.5, desc: 'metal chain lash / aggressive whip crack' },
  { name: 'brass_tuba', dur: 1.0, desc: 'synthesized bass brass / deep tuba stab' },
  { name: 'brass_horn', dur: 0.8, desc: 'punchy brass horn stab / heroic fanfare note' },
  { name: 'glock', dur: 1.8, desc: 'bright glockenspiel chime / magical bell' },
  { name: 'vibes', dur: 1.6, desc: 'warm vibraphone bar strike with acoustic tremolo' },
  { name: 'musicbox', dur: 1.6, desc: 'delicate music box tine pluck' },
  { name: 'triangle_ping', dur: 1.6, desc: 'acoustic orchestral triangle hit' },
  { name: 'timpani', dur: 2.0, desc: 'deep resonant orchestral timpani strike' },
  { name: 'snare_hit', dur: 0.35, desc: 'crisp acoustic field snare stroke' },
  { name: 'cymbal_clash', dur: 2.4, desc: 'dynamic orchestral crash cymbal clash' },
  { name: 'warm_pad', dur: 3.5, desc: 'cinematic warm analog synth pad chord' },
  { name: 'pluck_harp', dur: 1.0, desc: 'acoustic harp / guitar string pluck' },
] as const;

export type ProceduralSfxName = (typeof PROCEDURAL_SFX_CATALOG)[number]['name'];

export interface GenerateSfxOptions {
  name: ProceduralSfxName | string;
  dur?: number;
  gainDb?: number;
  seed?: number;
  pitch?: number;
}

export interface GenerateMusicOptions {
  mood?: 'dusk' | 'midnight' | 'golden' | 'neon' | 'storybook' | string;
  dur?: number;
  tempo?: number;
  gainDb?: number;
  seed?: number;
}
