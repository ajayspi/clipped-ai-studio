import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing scheduled post id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Scheduled post cancelled' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to cancel scheduled post' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing scheduled post id' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { scheduled_for, caption, platforms, status } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (scheduled_for !== undefined) updates.scheduled_for = scheduled_for;
    if (caption !== undefined) updates.caption = caption;
    if (platforms !== undefined) updates.platforms = platforms;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('scheduled_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update scheduled post' },
      { status: 500 }
    );
  }
}
