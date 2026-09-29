import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('auto_pipelines')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Minimal validation
    if (!body.pipeline_name || !body.niche || !body.schedule) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('auto_pipelines')
      .insert({
        pipeline_name: body.pipeline_name,
        niche: body.niche,
        schedule: body.schedule,
        source_strategy: body.source_strategy || 'trending-rss',
        visual_pipeline: body.visual_pipeline || 'ai-videos',
        target_platforms: body.target_platforms || ['youtube'],
        voice: body.voice || 'alloy',
        visual_style: body.visual_style || null,
        aspect_ratio: body.aspect_ratio || '9:16',
        auto_publish: Boolean(body.auto_publish),
        is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
        next_run: body.next_run || new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing pipeline id' }, { status: 400 });
    }

    const body = await req.json();
    const updates: Record<string, any> = {};

    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
    if (body.pipeline_name !== undefined) updates.pipeline_name = body.pipeline_name;
    if (body.schedule !== undefined) updates.schedule = body.schedule;

    const { data, error } = await supabaseAdmin
      .from('auto_pipelines')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing pipeline id' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('auto_pipelines')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
