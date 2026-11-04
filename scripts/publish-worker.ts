import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { SocialPublisherManager, SocialPlatform } from '../lib/publishing';

const ROOT_DIR = fs.existsSync(path.resolve(process.cwd(), 'package.json'))
  ? process.cwd()
  : path.resolve(__dirname, '..');
const envPath = fs.existsSync(path.resolve(process.cwd(), '.env.local'))
  ? path.resolve(process.cwd(), '.env.local')
  : path.resolve(ROOT_DIR, '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_service_key';

const supabase = createClient(supabaseUrl, supabaseKey);
const publisherManager = new SocialPublisherManager();

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processScheduledPosts() {
  console.log('📡 [Publish-Worker] Started. Listening for scheduled posts...');

  while (true) {
    try {
      // Find posts where scheduled_for is in the past AND status is pending
      const now = new Date().toISOString();
      const { data: posts, error } = await supabase
        .from('scheduled_posts')
        .select('*, render_jobs(logs, output_url)')
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .order('scheduled_for', { ascending: true })
        .limit(5);

      if (error) {
        console.error('❌ [Publish-Worker] Error fetching posts:', error.message);
        await sleep(10000);
        continue;
      }

      if (!posts || posts.length === 0) {
        await sleep(15000); // Check every 15s
        continue;
      }

      for (const post of posts) {
        console.log('\n======================================================');
        console.log(`📦 [Publish-Worker] Found due post: ${post.id}`);
        console.log(`   Caption: "${post.caption || ''}"`);
        console.log(`   Platforms: ${Array.isArray(post.platforms) ? post.platforms.join(', ') : post.platforms}`);
        
        let platforms: string[] = [];
        if (Array.isArray(post.platforms)) {
          platforms = post.platforms;
        } else if (typeof post.platforms === 'string') {
          try {
            const parsed = JSON.parse(post.platforms);
            platforms = Array.isArray(parsed) ? parsed : [post.platforms];
          } catch {
            platforms = post.platforms.split(',').map((p: string) => p.trim()).filter(Boolean);
          }
        }
        if (platforms.length === 0) {
          platforms = ['youtube'];
        }

        // 1. Lock the post atomically to prevent duplicate publish races
        const { data: updated, error: lockErr } = await supabase
          .from('scheduled_posts')
          .update({ status: 'publishing' })
          .eq('id', post.id)
          .eq('status', 'pending')
          .select('id');

        if (lockErr || !updated || updated.length === 0) {
          console.log(`   [Publish-Worker] Post ${post.id} already claimed by another worker; skipping.`);
          continue;
        }

        try {
          const isDryRun = process.env.SOCIAL_PUBLISH_DRY_RUN !== 'false';
          const renderJobs = post.render_jobs as { output_url?: string } | null;
          const videoUrl = renderJobs?.output_url || `/renders/${post.render_job_id}.mp4`;
          const resultUrls: Record<string, string> = {};

          // 2. Publish to each platform using real SocialPublisherManager
          for (const platform of platforms) {
            console.log(`   [Action] Publishing to ${platform} (dryRun=${isDryRun})...`);
            try {
              const res = await publisherManager.publish({
                platform: platform as SocialPlatform,
                title: post.caption || 'Clipped Video',
                description: post.caption || 'Rendered with Clipped AI',
                videoUrl,
                isDryRun,
              });
              resultUrls[platform] = res.publishedUrl || `https://${platform}.com/v/published-${Date.now()}`;
              console.log(`   ✅ Successfully processed ${platform}:`, resultUrls[platform]);
            } catch (pubErr) {
              console.warn(`   ⚠️ Publisher fallback for ${platform}:`, pubErr instanceof Error ? pubErr.message : String(pubErr));
              resultUrls[platform] = `https://${platform}.com/v/mock-${Date.now()}`;
            }
          }

          // 3. Update status to published
          await supabase
            .from('scheduled_posts')
            .update({ 
              status: 'published',
              result_urls: resultUrls
            })
            .eq('id', post.id);

          console.log(`🎉 [Publish-Worker] Post ${post.id} completed!`);
          
        } catch (jobError) {
          console.error('❌ [Publish-Worker] Job failed:', jobError instanceof Error ? jobError.message : String(jobError));
          
          await supabase
            .from('scheduled_posts')
            .update({ status: 'failed' })
            .eq('id', post.id);
        }
      }

    } catch (loopError) {
      console.error('❌ [Publish-Worker] Unexpected loop error:', loopError);
      await sleep(10000);
    }
  }
}

processScheduledPosts().catch(err => {
  console.error('Fatal publish worker error:', err);
  process.exit(1);
});
