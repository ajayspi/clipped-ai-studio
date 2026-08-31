import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processScheduledPosts() {
  console.log('?? [Publish-Worker] Started. Listening for scheduled posts...');

  while (true) {
    try {
      // Find posts where scheduled_for is in the past AND status is pending
      const now = new Date().toISOString();
      const { data: posts, error } = await supabase
        .from('scheduled_posts')
        .select('*, render_jobs(logs)')
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .order('scheduled_for', { ascending: true })
        .limit(5);

      if (error) {
        console.error('? [Publish-Worker] Error fetching posts:', error.message);
        await sleep(10000);
        continue;
      }

      if (!posts || posts.length === 0) {
        await sleep(15000); // Check every 15s
        continue;
      }

      for (const post of posts) {
        console.log(\n======================================================);
        console.log(? [Publish-Worker] Found due post: );
        console.log(   Caption: "");
        console.log(   Platforms: );
        
        // 1. Lock the post
        await supabase
          .from('scheduled_posts')
          .update({ status: 'publishing' })
          .eq('id', post.id);

        try {
          // 2. Fetch the video file (simulation in dry-run mode)
          console.log(   [Action] Fetching rendered video from local storage...);
          await sleep(2000); 

          const resultUrls: Record<string, string> = {};

          // 3. Publish to each platform
          for (const platform of post.platforms) {
            console.log(   [Action] Uploading to  API (DRY RUN)...);
            await sleep(1500); // Simulate API latency
            
            // Mock Success URL
            resultUrls[platform] = https://.com/v/mock-;
            console.log(   ? Successfully published to !);
          }

          // 4. Update status to published
          await supabase
            .from('scheduled_posts')
            .update({ 
              status: 'published',
              result_urls: resultUrls
            })
            .eq('id', post.id);

          console.log(? [Publish-Worker] Post  completed!);
          
        } catch (jobError: any) {
          console.error(? [Publish-Worker] Job failed:, jobError.message);
          await supabase
            .from('scheduled_posts')
            .update({ status: 'failed' })
            .eq('id', post.id);
        }
      }
    } catch (e: any) {
      console.error('? [Publish-Worker] Fatal error:', e.message);
      await sleep(10000);
    }
  }
}

// Ensure the table exists for local development, otherwise the worker will crash constantly
async function verifyTableExists() {
  const { error } = await supabase.from('scheduled_posts').select('id').limit(1);
  if (error && error.code === '42P01') {
     console.error('? [Publish-Worker] Table "scheduled_posts" does not exist!');
     console.log('   Please run the SQL migration in database/scheduled_posts.sql first.');
     process.exit(1);
  }
}

verifyTableExists().then(() => {
  processScheduledPosts();
});
