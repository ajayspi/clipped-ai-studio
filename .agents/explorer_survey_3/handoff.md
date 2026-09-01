# Handoff Report — Database, Queries, and Seeder Architecture

**Agent**: `explorer_survey_3`  
**Working Directory**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_3`  
**Target Milestone**: Survey Database, Query Contracts, Scripts & Seeder Design

---

## 1. Observation

1. **Supabase Environment & Configuration**:
   - `file:///C:/Users/vigilare/.gemini/antigravity/scratch/clipped/.env.local`:
     - Line 1: `NEXT_PUBLIC_SUPABASE_URL=https://agafustlankeieewtvck.supabase.co`
     - Line 2: `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`
     - Line 3: `SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...`
   - `lib/db.ts`: Standard client initialized with `createClient(supabaseUrl, supabaseAnonKey)`.
   - `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`: SSR client utilities.

2. **Database Schemas**:
   - `schema.sql`: Lines 6–98 define tables:
     - `users` (id UUID PK, email TEXT, name TEXT, tier TEXT, created_at TIMESTAMPTZ)
     - `videos` (id UUID PK, user_id UUID FK->users(id), title TEXT, script TEXT, workflow TEXT, status TEXT, created_at, updated_at)
     - `render_jobs` (id UUID PK, video_id UUID FK->videos(id), status TEXT, progress INTEGER, error_message TEXT, logs TEXT, created_at)
     - `api_credits`, `published_videos`, `settings`
   - `supabase/migrations/20260831_create_scheduled_posts.sql`: Lines 1–13 define:
     - `scheduled_posts` (id UUID PK, job_id UUID FK->render_jobs(id), platforms JSONB, caption TEXT, scheduled_for TIMESTAMPTZ, status VARCHAR(50), result_urls JSONB, created_at, updated_at)

3. **Library Query Implementation (`app/(app)/library/page.tsx`)**:
   - Lines 10–16: Queries `supabase.from('videos').select('*, render_jobs (*)').order('created_at', { ascending: false })`
   - Lines 19–56: Iterates videos, extracts `job = videoRecord.render_jobs[videoRecord.render_jobs.length - 1]`, parses `job.logs`, extracts `thumbnail` from `firstClip?.thumbnail || firstClip?.previewUrl`, `clipCount`, `workflowType`.
   - Lines 59–83: Fallback query for `supabase.from('render_jobs').select('*').is('video_id', null)`.
   - Lines 114–118: Renders `<DashboardCard key={video.id} video={video} />`.

4. **Planner Query Implementation (`app/(app)/planner/page.tsx`)**:
   - Lines 11–14: Queries `supabase.from('scheduled_posts').select('*, render_jobs(logs)').order('scheduled_for', { ascending: true })`
   - Lines 17–19: Generates 7-day calendar array from `today = new Date()`.
   - Lines 36–85: Filters `posts` by `isSameDay(new Date(post.scheduled_for), day)`, renders time, status icons (`CheckCircle2`, `Clock`, `XCircle`), caption, and platform badges.

5. **Package and Script Infrastructure (`package.json`)**:
   - Lines 24–40: Dependencies include `"tsx": "^4.23.13"`, `"dotenv": "^17.4.2"`, `"@supabase/supabase-js": "^2.112.4"`.
   - Lines 12–15: Uses `tsx scripts/render-worker.ts` and `tsx scripts/publish-worker.ts`.
   - Root files `seed_videos.js` and `create_user.js` demonstrate basic database connectivity and user creation.

---

## 2. Logic Chain

1. **Schema Linkage**:
   - A video in Library originates from `videos` table linked to `users.id`.
   - Its render metadata is stored in `render_jobs` linked to `videos.id` (or direct `render_jobs` with `video_id: null`).
   - The Library view parses `job.logs` as a JSON object containing `{ subject, workflowType, videos: [{ video: { thumbnail, previewUrl } }], ... }`.
   - Therefore, to display realistic cards with thumbnails, titles, workflow tags, and clip counts, the seeder must populate `videos`, `render_jobs`, and ensure `logs` contains a valid JSON structure with image URLs and scene details.

2. **Planner Linkage**:
   - The Planner view reads `scheduled_posts` joined with `render_jobs(logs)`.
   - The view renders posts whose `scheduled_for` dates fall within `[today, today + 6 days]`.
   - Therefore, the seeder must calculate `scheduled_for` dynamically relative to `new Date()` so the Planner calendar is immediately filled with items regardless of when the script is executed.
   - Posts should link to the generated `render_jobs.id` so the fallback subject and logs relation resolves properly.

3. **Execution Robustness**:
   - Running with `tsx scripts/seed.ts` loads TypeScript natively using the existing `tsx` dependency.
   - Using `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` bypasses RLS, ensuring uninterrupted inserts across `users`, `videos`, `render_jobs`, and `scheduled_posts`.
   - Ensuring the user record `admin@prostudio.com` exists avoids foreign key constraint failures on `videos.user_id`.

---

## 3. Caveats

1. **Remote Network Availability**: The Supabase instance is hosted at `https://agafustlankeieewtvck.supabase.co`. The seeder requires internet connectivity to communicate with this REST endpoint.
2. **Table Existence**: If `scheduled_posts` table is not yet created on the remote Supabase project, the migration in `supabase/migrations/20260831_create_scheduled_posts.sql` must be applied or the seeder should output a descriptive warning.
3. **Dynamic Dates**: `scheduled_for` timestamps must be generated dynamically using offsets from `Date.now()` rather than static hardcoded dates, ensuring the 7-day week view in `planner/page.tsx` always shows active items.

---

## 4. Conclusion & Recommended Implementation

A complete standalone seeder script should be placed at `scripts/seed.ts` and registered in `package.json` under `"scripts": { "seed": "tsx scripts/seed.ts" }`.

### Seeder Script Design (`scripts/seed.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 1. Load environment variables
const envPath = fs.existsSync(path.resolve(process.cwd(), '.env.local'))
  ? path.resolve(process.cwd(), '.env.local')
  : path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Mock Data Definitions (6 Rich Items across Diverse Workflows)
const MOCK_VIDEOS = [
  {
    title: "The Roman Colosseum: Engineering Marvels",
    script: "The Colosseum stands as a monumental feat of ancient engineering. Over 50,000 spectators once gathered here to witness gladiatorial combat, naval battles, and grand spectacles of imperial power.",
    workflow: "footage",
    workflowType: "Footage",
    duration: 42.5,
    thumbnail: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop&q=80",
    clips: [
      { id: "clip-1", title: "Colosseum Exterior Sunset", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", thumbnail: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop&q=80" },
      { id: "clip-2", title: "Ancient Arches", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", thumbnail: "https://images.unsplash.com/photo-1543429776-2782fc8e1acd?w=800&auto=format&fit=crop&q=80" }
    ],
    scheduleDayOffset: 0, // Today
    scheduleHour: 14, // 2:00 PM
    platforms: ["youtube", "tiktok", "instagram"],
    caption: "Unveiling the ancient engineering secrets of the Roman Colosseum 🏛️✨ #history #romanempire #shorts #clipped",
    postStatus: "published"
  },
  {
    title: "Cyberpunk 2099: Neo-Tokyo Underground",
    script: "Rain poured through neon holograms in Sector 4. Kael adjusted his neural implant as the syndicate's drones swept the perimeter.",
    workflow: "ai-videos",
    workflowType: "AI Videos",
    duration: 28.0,
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    clips: [
      { id: "clip-3", title: "Neon Skyline", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80" }
    ],
    scheduleDayOffset: 1, // Tomorrow
    scheduleHour: 11, // 11:00 AM
    platforms: ["youtube", "tiktok"],
    caption: "Step into Neo-Tokyo 2099. What lies beneath the neon glow? 🤖⚡ #cyberpunk #scifi #aivideo #clipped",
    postStatus: "pending"
  },
  {
    title: "Whispers in the Mist: The Vanishing Lighthouse",
    script: "For forty years, the Blackwood Lighthouse guided ships safely. But on a stormy Tuesday in November, the beacon went dark, and the keeper disappeared without a trace.",
    workflow: "micro-drama",
    workflowType: "Micro-Drama",
    duration: 55.0,
    thumbnail: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80",
    clips: [
      { id: "clip-4", title: "Foggy Lighthouse", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", thumbnail: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80" }
    ],
    scheduleDayOffset: 2, // Day 2
    scheduleHour: 18, // 6:00 PM
    platforms: ["tiktok", "instagram"],
    caption: "Episode 1: The keeper was gone. Only his journal remained on the desk... 🌊🕯️ #microdrama #mystery #thriller #clipped",
    postStatus: "pending"
  },
  {
    title: "3 Mind-Blowing Facts About Deep Ocean Creatures",
    script: "Did you know that 80% of the ocean remains unexplored? Deep-sea anglerfish create their own light in pitch black waters, and giant squids have eyes the size of dinner plates!",
    workflow: "stories",
    workflowType: "Stories",
    duration: 35.0,
    thumbnail: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80",
    clips: [
      { id: "clip-5", title: "Deep Sea Bioluminescence", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", thumbnail: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80" }
    ],
    scheduleDayOffset: 3, // Day 3
    scheduleHour: 13, // 1:00 PM
    platforms: ["youtube", "tiktok", "instagram"],
    caption: "The ocean is wilder than outer space 🌊🐙 Which fact surprised you most? #ocean #nature #mindblown #facts",
    postStatus: "pending"
  },
  {
    title: "Morning Power Protein Smoothie in 60s",
    script: "Fuel your day with this 500-calorie high-protein power smoothie: Greek yogurt, frozen blueberries, chia seeds, almond milk, and one scoop of vanilla whey.",
    workflow: "bulk-plan",
    workflowType: "Bulk Plan",
    duration: 24.0,
    thumbnail: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&auto=format&fit=crop&q=80",
    clips: [
      { id: "clip-6", title: "Smoothie Bowl & Berries", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4", thumbnail: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&auto=format&fit=crop&q=80" }
    ],
    scheduleDayOffset: 4, // Day 4
    scheduleHour: 8, // 8:00 AM
    platforms: ["instagram"],
    caption: "The ultimate 60-second breakfast smoothie for high energy all morning 🫐🥤 #nutrition #smoothierecipe #fitness #wellness",
    postStatus: "pending"
  },
  {
    title: "Space Exploration 2050: Colonizing Mars",
    script: "Humanity's journey to become a multi-planetary species begins on the red sands of Mars. Self-sustaining domes and solar arrays will pave the way.",
    workflow: "footage",
    workflowType: "Footage",
    duration: 38.0,
    thumbnail: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=80",
    clips: [
      { id: "clip-7", title: "Mars Landscape", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4", thumbnail: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=80" }
    ],
    scheduleDayOffset: 5, // Day 5
    scheduleHour: 17, // 5:00 PM
    platforms: ["youtube"],
    caption: "Will humans live on Mars by 2050? Here is the roadmap 🚀🔴 #space #mars #astronomy #science",
    postStatus: "pending"
  }
];

async function seed() {
  console.log('🌱 [Clipped Seeder] Initializing database seeding...');
  
  // 1. Ensure user exists
  let userId: string;
  const { data: users, error: userError } = await supabase.from('users').select('id').limit(1);
  if (users && users.length > 0) {
    userId = users[0].id;
    console.log(`👤 Using existing user ID: ${userId}`);
  } else {
    console.log('👤 Creating default admin user in public.users...');
    const newUserId = '00000000-0000-0000-0000-000000000001';
    const { data: createdUser, error: createError } = await supabase.from('users').upsert({
      id: newUserId,
      email: 'admin@prostudio.com',
      name: 'Studio Admin',
      tier: 'pro'
    }).select().single();

    if (createError) {
      console.warn('⚠️ Warning on user upsert:', createError.message);
      userId = newUserId;
    } else {
      userId = createdUser.id;
    }
  }

  // 2. Iterate and Seed Videos, Render Jobs, and Scheduled Posts
  for (const item of MOCK_VIDEOS) {
    console.log(`\n🎬 Seeding: "${item.title}" [${item.workflowType}]...`);

    // Insert Video record
    const { data: videoRecord, error: videoError } = await supabase.from('videos').insert({
      user_id: userId,
      title: item.title,
      script: item.script,
      workflow: item.workflow,
      status: 'completed'
    }).select().single();

    if (videoError) {
      console.error(`❌ Error inserting video:`, videoError.message);
      continue;
    }

    // Build rich logs JSON payload for render_jobs
    const logsPayload = {
      subject: item.title,
      workflowType: item.workflowType,
      finalVideoUrl: `/renders/${videoRecord.id}.mp4`,
      duration: item.duration,
      durationInFrames: Math.floor(item.duration * 30),
      videos: item.clips.map(c => ({
        video: {
          id: c.id,
          url: c.url,
          thumbnail: c.thumbnail,
          previewUrl: c.thumbnail,
          title: c.title,
          platform: 'pexels'
        }
      })),
      analysis: {
        title: item.title,
        scenes: item.clips.map((c, i) => ({
          id: `scene-${i + 1}`,
          text: `Scene ${i + 1} narration for ${item.title}`,
          duration: item.duration / item.clips.length,
          selectedVideo: { url: c.url, thumbnail: c.thumbnail }
        }))
      }
    };

    // Insert Render Job record
    const { data: jobRecord, error: jobError } = await supabase.from('render_jobs').insert({
      video_id: videoRecord.id,
      status: 'completed',
      progress: 100,
      logs: JSON.stringify(logsPayload),
      completed_at: new Date().toISOString()
    }).select().single();

    if (jobError) {
      console.error(`❌ Error inserting render_job:`, jobError.message);
      continue;
    }

    console.log(`   ✅ Video ID: ${videoRecord.id} | Render Job ID: ${jobRecord.id}`);

    // Insert Scheduled Post for Planner
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + item.scheduleDayOffset);
    targetDate.setHours(item.scheduleHour, 0, 0, 0);

    const { data: postRecord, error: postError } = await supabase.from('scheduled_posts').insert({
      job_id: jobRecord.id,
      platforms: item.platforms,
      caption: item.caption,
      scheduled_for: targetDate.toISOString(),
      status: item.postStatus,
      result_urls: item.postStatus === 'published' ? { [item.platforms[0]]: `https://${item.platforms[0]}.com/mock-url` } : {}
    }).select().single();

    if (postError) {
      console.warn(`   ⚠️ Warning scheduling post:`, postError.message);
    } else {
      console.log(`   📅 Scheduled Post ID: ${postRecord.id} for ${targetDate.toDateString()} @ ${item.scheduleHour}:00`);
    }
  }

  console.log('\n🎉 [Clipped Seeder] Database seeding completed successfully!');
}

seed().catch(err => {
  console.error('Fatal seeder error:', err);
  process.exit(1);
});
```

---

## 5. Verification Method

1. **Script Validation**:
   - Run `npx tsx scripts/seed.ts` (or `npm run seed`).
   - Verify output logs show successful insertion of user, 6 videos, 6 render_jobs, and 6 scheduled_posts.
2. **Library View Verification**:
   - Navigate to `/library`.
   - Verify all 6 mock videos are rendered with thumbnails, titles, workflow badges, clip counts, and completed status.
   - Verify no empty placeholder state is displayed.
3. **Planner View Verification**:
   - Navigate to `/planner`.
   - Verify the 7-day calendar view renders scheduled cards with corresponding timestamps, captions, platform badges, and status icons across the week.
   - Verify no column shows a broken or empty state.
