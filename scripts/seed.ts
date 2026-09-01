import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 1. Resolve environment variables from .env.local or .env
const ROOT_DIR = fs.existsSync(path.resolve(process.cwd(), 'package.json'))
  ? process.cwd()
  : path.resolve(__dirname, '..');

const envLocalPath = path.resolve(ROOT_DIR, '.env.local');
const envPath = path.resolve(ROOT_DIR, '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase key in environment variables (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  process.exit(1);
}

console.log(`🔌 Connecting to Supabase at: ${supabaseUrl}`);
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// 2. Define rich, diverse mock video dataset across all workflows
export interface MockVideoItem {
  title: string;
  script: string;
  workflow: string;
  workflowType: string;
  duration: number;
  thumbnail: string;
  clips: Array<{
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    platform?: string;
  }>;
  scheduleDayOffset: number;
  scheduleHour: number;
  platforms: string[];
  caption: string;
  postStatus: 'pending' | 'published' | 'failed';
  viewCount: number;
}

export const MOCK_VIDEOS: MockVideoItem[] = [
  {
    title: "The Roman Colosseum: Engineering Marvels",
    script: "The Colosseum stands as a monumental feat of ancient engineering. Over 50,000 spectators once gathered here to witness gladiatorial combat, naval battles, and grand spectacles of imperial power.",
    workflow: "Footage",
    workflowType: "Footage",
    duration: 45.0,
    thumbnail: "/thumbnail_history.jpg",
    clips: [
      {
        id: "clip-history-1",
        title: "Colosseum Exterior Sunrise",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        thumbnail: "/thumbnail_history.jpg",
        platform: "local"
      },
      {
        id: "clip-history-2",
        title: "Ancient Roman Arches & Arena",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        thumbnail: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop&q=80",
        platform: "unsplash"
      }
    ],
    scheduleDayOffset: 0, // Today
    scheduleHour: 14, // 2:00 PM
    platforms: ["youtube", "tiktok", "instagram"],
    caption: "Unveiling the ancient engineering secrets of the Roman Colosseum 🏛️✨ #history #romanempire #engineering #shorts #clipped",
    postStatus: "published",
    viewCount: 14250
  },
  {
    title: "Cyberpunk 2099: Neo-Tokyo Underground",
    script: "Rain poured through neon holograms in Sector 4. Kael adjusted his neural implant as syndicate drones swept the perimeter. The contraband memory drive felt heavy in his trenchcoat.",
    workflow: "AI Videos",
    workflowType: "AI Videos",
    duration: 32.0,
    thumbnail: "/thumbnail_drama.jpg",
    clips: [
      {
        id: "clip-cyber-1",
        title: "Neon Rain Cyber Cityscape",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        thumbnail: "/thumbnail_drama.jpg",
        platform: "local"
      },
      {
        id: "clip-cyber-2",
        title: "Futuristic Cyber Hacker Alley",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
        platform: "unsplash"
      }
    ],
    scheduleDayOffset: 1, // Tomorrow (+1 day)
    scheduleHour: 11, // 11:00 AM
    platforms: ["youtube", "tiktok"],
    caption: "Step into Neo-Tokyo 2099. What lies beneath the neon glow? 🤖⚡ #cyberpunk #scifi #aivideo #cinematic #clipped",
    postStatus: "pending",
    viewCount: 8920
  },
  {
    title: "How Memory Works: Neuroscience Unlocked",
    script: "Have you ever wondered how your brain stores memories? It begins in the hippocampus where synapses fire in rhythmic frequencies. Through long-term potentiation, fleeting moments become permanent.",
    workflow: "Stories",
    workflowType: "Stories",
    duration: 38.0,
    thumbnail: "/thumbnail_brain.jpg",
    clips: [
      {
        id: "clip-brain-1",
        title: "Neural Network Synapse Firing",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        thumbnail: "/thumbnail_brain.jpg",
        platform: "local"
      },
      {
        id: "clip-brain-2",
        title: "Human Brain Glow Hologram",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
        thumbnail: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&auto=format&fit=crop&q=80",
        platform: "unsplash"
      }
    ],
    scheduleDayOffset: 2, // Day 2
    scheduleHour: 16, // 4:00 PM
    platforms: ["youtube", "instagram"],
    caption: "How does your brain keep memories forever? Neuroscience explained in 40 seconds 🧠⚡ #neuroscience #brain #psychology #facts #clipped",
    postStatus: "pending",
    viewCount: 5400
  },
  {
    title: "Whispers in the Mist: The Vanishing Keeper",
    script: "For forty years, the Blackwood Lighthouse guided sailors away from the jagged reefs. But on a freezing November night, the beacon suddenly died. When rescuers arrived, only an open journal remained.",
    workflow: "Micro-Drama",
    workflowType: "Micro-Drama",
    duration: 50.0,
    thumbnail: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80",
    clips: [
      {
        id: "clip-drama-1",
        title: "Misty Lighthouse on Cliff",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        thumbnail: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80",
        platform: "unsplash"
      },
      {
        id: "clip-drama-2",
        title: "Storm Waves Crashing Rocks",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
        thumbnail: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&auto=format&fit=crop&q=80",
        platform: "unsplash"
      }
    ],
    scheduleDayOffset: 3, // Day 3
    scheduleHour: 19, // 7:00 PM
    platforms: ["tiktok", "instagram"],
    caption: "Episode 1: The beacon went dark, and the keeper vanished into the fog... 🌊🕯️ #microdrama #mystery #thriller #cinematic #clipped",
    postStatus: "pending",
    viewCount: 19800
  },
  {
    title: "Morning Power Protein Smoothie in 60s",
    script: "Supercharge your morning with this 500-calorie high-protein power smoothie: Greek yogurt, wild blueberries, chia seeds, oat milk, and one scoop of vanilla whey isolate.",
    workflow: "Bulk Plan",
    workflowType: "Bulk Plan",
    duration: 26.0,
    thumbnail: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&auto=format&fit=crop&q=80",
    clips: [
      {
        id: "clip-smoothie-1",
        title: "Fresh Blueberries & Smoothie Prep",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        thumbnail: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&auto=format&fit=crop&q=80",
        platform: "unsplash"
      }
    ],
    scheduleDayOffset: 4, // Day 4
    scheduleHour: 8, // 8:00 AM
    platforms: ["instagram", "tiktok"],
    caption: "The ultimate 60-second breakfast smoothie for all-day energy 🫐🥤 #nutrition #smoothierecipe #fitness #wellness #breakfast #clipped",
    postStatus: "pending",
    viewCount: 7120
  },
  {
    title: "Deep Sea Wonders: Mariana Trench Abyss",
    script: "Over 80% of the ocean remains completely unmapped. In the crushing dark of the Mariana Trench, bioluminescent siphonophores and colossal squids rule an alien underwater kingdom.",
    workflow: "Footage",
    workflowType: "Footage",
    duration: 40.0,
    thumbnail: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80",
    clips: [
      {
        id: "clip-ocean-1",
        title: "Bioluminescent Deep Sea Life",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4",
        thumbnail: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80",
        platform: "unsplash"
      },
      {
        id: "clip-ocean-2",
        title: "Coral Reef & Deep Abyss Dropoff",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        thumbnail: "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=800&auto=format&fit=crop&q=80",
        platform: "unsplash"
      }
    ],
    scheduleDayOffset: 5, // Day 5
    scheduleHour: 13, // 1:00 PM
    platforms: ["youtube", "tiktok", "instagram"],
    caption: "The ocean floor is wilder than deep space 🌊🐙 Which creature surprised you most? #ocean #nature #marianatrench #deepsea #facts #clipped",
    postStatus: "pending",
    viewCount: 16400
  },
  {
    title: "Space Exploration 2050: The Mars Colony",
    script: "Humanity's next giant leap is taking root on the crimson plains of Mars. Pressurized biodomes and orbital solar arrays are laying the foundation for our multi-planetary future.",
    workflow: "AI Videos",
    workflowType: "AI Videos",
    duration: 36.0,
    thumbnail: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=80",
    clips: [
      {
        id: "clip-mars-1",
        title: "Martian Horizon & Habitat Colony",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        thumbnail: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=80",
        platform: "unsplash"
      }
    ],
    scheduleDayOffset: 6, // Day 6
    scheduleHour: 17, // 5:00 PM
    platforms: ["youtube", "tiktok"],
    caption: "Will humans live permanently on Mars by 2050? Here is the technological roadmap 🚀🔴 #space #mars #astronomy #scifi #clipped",
    postStatus: "pending",
    viewCount: 11200
  }
];

export async function seedDatabase() {
  console.log('================================================================');
  console.log('🌱 [Clipped AI Studio] Seeding Supabase Database...');
  console.log('================================================================');

  // 1. Ensure default user exists
  let userId: string;
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);

  if (userError) {
    console.warn('⚠️ Warning checking users table:', userError.message);
  }

  if (users && users.length > 0) {
    userId = users[0].id;
    console.log(`👤 Using existing user record: [${users[0].email}] (ID: ${userId})`);
  } else {
    console.log('👤 Creating default admin user in public.users...');
    const defaultUserId = '00000000-0000-0000-0000-000000000001';
    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .upsert({
        id: defaultUserId,
        email: 'admin@prostudio.com',
        name: 'Studio Admin',
        tier: 'pro',
        niches: ['Technology', 'History', 'Sci-Fi', 'Health'],
        storage_preference: 'cloud'
      })
      .select()
      .single();

    if (createError) {
      console.warn('⚠️ Could not insert admin user directly, falling back to dummy UUID:', createError.message);
      userId = defaultUserId;
    } else {
      userId = createdUser.id;
      console.log(`✅ Created default admin user: ${createdUser.email} (ID: ${userId})`);
    }
  }

  // 2. Iterate and seed videos, render jobs, and scheduled posts
  let videosInserted = 0;
  let jobsInserted = 0;
  let postsInserted = 0;

  for (const item of MOCK_VIDEOS) {
    console.log(`\n🎬 Seeding Video: "${item.title}" [Workflow: ${item.workflowType}]...`);

    // Insert record into `videos` table
    const { data: videoRecord, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: userId,
        title: item.title,
        script: item.script,
        workflow: item.workflow,
        status: 'completed',
        view_count: item.viewCount
      })
      .select()
      .single();

    if (videoError) {
      console.error(`❌ Failed inserting video "${item.title}":`, videoError.message);
      continue;
    }
    videosInserted++;

    // Prepare rich logs JSON for `render_jobs`
    const durationInFrames = Math.floor(item.duration * 30);
    const logsPayload = {
      subject: item.title,
      workflowType: item.workflowType,
      finalVideoUrl: `/renders/${videoRecord.id}.mp4`,
      duration: item.duration,
      durationInFrames: durationInFrames,
      videos: item.clips.map(c => ({
        video: {
          id: c.id,
          url: c.url,
          thumbnail: c.thumbnail,
          previewUrl: c.thumbnail,
          title: c.title,
          platform: c.platform || 'unsplash'
        }
      })),
      analysis: {
        title: item.title,
        scenes: item.clips.map((c, idx) => ({
          id: `scene-${idx + 1}`,
          text: `Scene ${idx + 1}: ${item.script.slice(idx * 60, (idx + 1) * 60) || item.title}`,
          duration: item.duration / item.clips.length,
          selectedVideo: {
            url: c.url,
            thumbnail: c.thumbnail
          }
        }))
      }
    };

    // Insert record into `render_jobs` table
    const { data: jobRecord, error: jobError } = await supabase
      .from('render_jobs')
      .insert({
        video_id: videoRecord.id,
        status: 'completed',
        progress: 100,
        logs: JSON.stringify(logsPayload),
        completed_at: new Date().toISOString(),
        started_at: new Date(Date.now() - item.duration * 1000).toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error(`❌ Failed inserting render_job for video "${item.title}":`, jobError.message);
      continue;
    }
    jobsInserted++;
    console.log(`   ✅ Video ID: ${videoRecord.id} | Render Job ID: ${jobRecord.id}`);

    // Calculate dynamic 7-day rolling window timestamp for Planner
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + item.scheduleDayOffset);
    targetDate.setHours(item.scheduleHour, 0, 0, 0);

    // Insert record into `scheduled_posts` table
    const { data: postRecord, error: postError } = await supabase
      .from('scheduled_posts')
      .insert({
        job_id: jobRecord.id,
        platforms: item.platforms,
        caption: item.caption,
        scheduled_for: targetDate.toISOString(),
        status: item.postStatus,
        result_urls: item.postStatus === 'published'
          ? { [item.platforms[0]]: `https://${item.platforms[0]}.com/watch?v=mock-${videoRecord.id.slice(0, 8)}` }
          : {}
      })
      .select()
      .single();

    if (postError) {
      console.warn(`   ⚠️ Warning inserting scheduled_post:`, postError.message);
    } else {
      postsInserted++;
      console.log(`   📅 Scheduled Post ID: ${postRecord.id} for ${targetDate.toDateString()} @ ${item.scheduleHour}:00 [Platforms: ${item.platforms.join(', ')}]`);
    }
  }

  console.log('\n================================================================');
  console.log(`🎉 [Clipped AI Studio] Seeding Complete Summary:`);
  console.log(`   - Videos Created: ${videosInserted}`);
  console.log(`   - Render Jobs Completed: ${jobsInserted}`);
  console.log(`   - Scheduled Posts Created: ${postsInserted}`);
  console.log('================================================================\n');

  return {
    videosInserted,
    jobsInserted,
    postsInserted
  };
}

// Unconditional execution when run directly
seedDatabase()
  .then(() => {
    console.log('✨ Seed process finished successfully.');
  })
  .catch((err) => {
    console.error('💥 Fatal error during seeding:', err);
    process.exit(1);
  });
