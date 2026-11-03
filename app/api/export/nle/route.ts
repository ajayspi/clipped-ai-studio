import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { exportToOtio, exportToFcpxml } from '@/lib/engine/otio-exporter';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobId, format = 'otio', timelineName } = body;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId is required' },
        { status: 400 }
      );
    }

    // Fetch the render job
    const { data: job, error } = await supabaseAdmin
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    const logs = typeof job.logs === 'string' ? JSON.parse(job.logs || '{}') : (job.logs || {});
    const beats = logs.beats || [];
    const audioUrl = logs.audioUrl || logs.voiceUrl || null;
    const name = timelineName || logs.prompt || `Clipped_${jobId.slice(0, 8)}`;

    const exportOptions = {
      timelineName: name,
      beats,
      audioUrl,
      fps: 30,
      width: job.aspect_ratio === '16:9' ? 1920 : 1080,
      height: job.aspect_ratio === '16:9' ? 1080 : 1920
    };

    if (format === 'fcpxml') {
      const xmlData = exportToFcpxml(exportOptions);
      return new NextResponse(xmlData, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="${name}.fcpxml"`
        }
      });
    }

    // Default to OTIO JSON
    const otioData = exportToOtio(exportOptions);
    return new NextResponse(otioData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${name}.otio"`
      }
    });

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to export timeline';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
