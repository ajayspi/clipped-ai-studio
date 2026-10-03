import { NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/db';
import { getBrandKit } from '@/lib/engine/brand-kit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const brandKit = await getBrandKit('default');
    return NextResponse.json({ success: true, brandKit });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch brand kit' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const brandKit = body.brandKit;
    const dbClient = supabaseAdmin || supabase;
    
    const { data: existing } = await dbClient
      .from('settings')
      .select('id')
      .eq('provider', 'brand_kit')
      .limit(1)
      .maybeSingle();

    const dataToSave = {
      api_key: JSON.stringify(brandKit),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await dbClient
        .from('settings')
        .update(dataToSave)
        .eq('id', existing.id);
    } else {
      await dbClient
        .from('settings')
        .insert({ provider: 'brand_kit', user_id: body.userId || null, ...dataToSave });
    }
    
    return NextResponse.json({ success: true, brandKit });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save brand kit' }, { status: 500 });
  }
}
