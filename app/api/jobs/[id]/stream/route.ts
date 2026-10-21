import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_service_key';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await params;
  const jobId = resolvedParams.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          // Stream likely closed
        }
      };

      // Initial fetch to get current status
      const { data: initialJob, error: initialError } = await supabase
        .from('render_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (initialError || !initialJob) {
        sendEvent('error', { message: 'Job not found' });
        controller.close();
        return;
      }

      sendEvent('init', initialJob);

      // Subscribe to changes on this specific row
      const channel = supabase
        .channel(`render_jobs_stream_${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'render_jobs',
            filter: `id=eq.${jobId}`
          },
          (payload) => {
            sendEvent('update', payload.new);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`SSE subscribed to job ${jobId}`);
          }
        });

      // Keep connection alive
      const keepAlive = setInterval(() => {
        sendEvent('ping', { time: new Date().toISOString() });
      }, 15000);

      req.signal.addEventListener('abort', () => {
        console.log(`SSE aborted for job ${jobId}`);
        clearInterval(keepAlive);
        supabase.removeChannel(channel);
        try {
          controller.close();
        } catch (e) {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
