import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    // In a real app with auth, we would get the user_id from the session.
    // For local dev, we fetch all settings or use a fixed UUID.
    const { data: keys, error } = await supabase
      .from('settings')
      .select('provider, api_key, is_active, updated_at')
      // .eq('user_id', '00000000-0000-0000-0000-000000000000') 

    if (error) throw error;

    // Mask keys before sending to the frontend for security
    const maskedKeys = (keys || []).reduce((acc: any, row) => {
      acc[row.provider] = {
        isConfigured: row.api_key && row.api_key.length > 0,
        maskedValue: row.api_key ? `••••••••••••${row.api_key.slice(-4)}` : '',
        isActive: row.is_active,
        updatedAt: row.updated_at
      };
      return acc;
    }, {});

    return NextResponse.json({ keys: maskedKeys });
  } catch (error: any) {
    console.error('Failed to list keys:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { provider, apiKey, isActive } = await req.json();

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('provider', provider)
      .limit(1)
      .single();

    let result;
    if (existing) {
      // Update
      const updateData: any = {};
      if (apiKey !== undefined && apiKey !== '') updateData.api_key = apiKey;
      if (isActive !== undefined) updateData.is_active = isActive;
      
      const { data, error } = await supabase
        .from('settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('settings')
        .insert({
          provider,
          api_key: apiKey || '',
          is_active: isActive !== undefined ? isActive : true
        })
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, setting: result });
  } catch (error: any) {
    console.error('Failed to update key:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
