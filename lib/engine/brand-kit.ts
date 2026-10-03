import { supabaseAdmin as supabase } from "@/lib/db"

export interface BrandKit {
  watermarkUrl?: string;
  watermarkPosition?: 'Top Left' | 'Top Right' | 'Bottom Left' | 'Bottom Right';
  customFontUrl?: string;
  customSubtitleColor?: string;
}

export async function getBrandKit(userId: string | null): Promise<BrandKit | null> {
  let query = supabase
    .from('settings')
    .select('api_key')
    .eq('provider', 'brand_kit');

  if (userId && userId !== 'default') {
    query = query.eq('user_id', userId);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data || !data.api_key) {
    return null;
  }

  try {
    return JSON.parse(data.api_key) as BrandKit;
  } catch (e) {
    return null;
  }
}
