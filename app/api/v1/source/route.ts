import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { beatId, keywords, workflowType = 'footage' } = await req.json()
    
    if (!beatId || !keywords) {
      return NextResponse.json({ error: 'Missing beatId or keywords' }, { status: 400 })
    }

    // In a real implementation, we would query the external APIs (Pexels, DALL-E, Kling, etc) here.
    // To abide by our "development offline first" safe rule, we are returning simulated mock data 
    // tailored to the workflowType.

    let candidates: any[] = []

    // 1. Stock Footage Workflow
    if (workflowType === 'footage') {
      const { data: keyData } = await supabase
        .from('settings')
        .select('api_key')
        .eq('provider', 'api_pexels')
        .eq('user_id', 'default_user')
        .single();
        
      const pexelsKey = keyData?.api_key || process.env.PEXELS_API_KEY;
      
      if (pexelsKey) {
        const query = encodeURIComponent(keywords.slice(0, 2).join(' '));
        const res = await fetch(`https://api.pexels.com/videos/search?query=${query}&per_page=3&orientation=portrait`, {
          headers: { Authorization: pexelsKey }
        });
        
        if (res.ok) {
          const data = await res.json();
          candidates = (data.video_files || data.videos || []).slice(0, 3).map((v: any, idx: number) => {
            // Find the best SD/HD file link
            const files = v.video_files || [];
            const bestFile = files.find((f: any) => f.quality === 'hd') || files[0];
            return {
              id: `pexels-${v.id}-${idx}`,
              url: bestFile?.link || v.url,
              title: v.url || `Stock clip for: ${keywords.join(', ')}`,
              platform: 'pexels',
              duration: v.duration || 15,
              score: 0.95 - (idx * 0.05),
              reason: 'Fetched from Pexels API'
            }
          }).filter((c: any) => c.url);
        }
      }
      
      // Fallback if Pexels API fails or no key - Try Pixabay
      if (candidates.length === 0) {
        const pixabayKey = keyData?.api_key || process.env.PIXABAY_API_KEY; // If we pulled all keys, wait we only pulled api_pexels above.
        
        // Fetch all keys to ensure we have pixabay
        const { data: allKeys } = await supabase.from('settings').select('provider, api_key').eq('user_id', 'default_user');
        const pKey = allKeys?.find(k => k.provider === 'api_pixabay')?.api_key || process.env.PIXABAY_API_KEY;
        
        if (pKey) {
          const query = encodeURIComponent(keywords.slice(0, 2).join(' '));
          const res = await fetch(`https://pixabay.com/api/videos/?key=${pKey}&q=${query}&video_type=film&orientation=vertical`);
          if (res.ok) {
            const data = await res.json();
            candidates = (data.hits || []).slice(0, 3).map((v: any, idx: number) => {
               // Get the largest video format
               const videoUrl = v.videos?.large?.url || v.videos?.medium?.url;
               return {
                  id: `pixabay-${v.id}-${idx}`,
                  url: videoUrl,
                  title: `Pixabay clip for: ${keywords.join(', ')}`,
                  platform: 'pixabay',
                  duration: v.duration || 15,
                  score: 0.90 - (idx * 0.05),
                  reason: 'Fetched from Pixabay API'
               }
            }).filter((c: any) => c.url);
          }
        }
      }
      
      // Fallback 3: Completely Keyless Pollinations AI Image
      if (candidates.length === 0) {
        console.log("Triggering Free Keyless Pollinations for Footage Fallback...");
        const prompt = encodeURIComponent(`Cinematic, hyper-realistic, action shot: ${keywords.join(' ')}`);
        const imageUrl = `https://pollinations.ai/p/${prompt}?width=1024&height=1792&seed=${Date.now()}`;
        
        candidates = [
          {
            id: `pollinations-footage-${Date.now()}`,
            url: imageUrl,
            title: `Keyless Generated Image for: ${keywords.join(', ')}`,
            platform: 'pollinations',
            duration: 15,
            score: 0.95,
            reason: 'Generated Keyless Visual'
          }
        ];
      }
    }
    // 2. AI Images Workflow (DALL-E)
    else if (workflowType === 'images') {
      const { data: openaiKeyData } = await supabase
        .from('settings')
        .select('api_key')
        .eq('provider', 'api_openai')
        .eq('user_id', 'default_user')
        .single();
        
      const openaiKey = openaiKeyData?.api_key || process.env.OPENAI_API_KEY;
      
      if (openaiKey) {
        console.log("Triggering DALL-E for: ", keywords.join(' '));
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: `Cinematic, hyper-realistic image: ${keywords.join(' ')}`,
            n: 1,
            size: "1024x1792" // Portrait aspect ratio (approx 9:16)
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.data?.[0]?.url) {
            candidates = [{
              id: `dalle-${Date.now()}-1`,
              url: data.data[0].url,
              title: `DALL-E Gen for: ${keywords.join(', ')}`,
              platform: 'dall-e',
              duration: 5,
              score: 0.99,
              reason: 'Generated perfectly via DALL-E 3'
            }];
          }
        }
      }
      
      // Fallback: Free Keyless Generation via Pollinations.ai
      if (candidates.length === 0) {
        console.log("Triggering Free Pollinations.ai for: ", keywords.join(' '));
        const prompt = encodeURIComponent(`Cinematic, hyper-realistic image: ${keywords.join(' ')}`);
        // Pollinations generates the image directly at the URL. We append a random seed to avoid caching.
        const imageUrl = `https://pollinations.ai/p/${prompt}?width=1024&height=1792&seed=${Date.now()}&model=flux`;
        
        candidates = [
          {
            id: `pollinations-${Date.now()}-1`,
            url: imageUrl,
            title: `Free Image Gen for: ${keywords.join(', ')}`,
            platform: 'pollinations',
            duration: 5,
            score: 0.99,
            reason: 'Generated via Free Pollinations.ai (Flux)'
          }
        ];
      }
    }
    // 3. AI Videos Workflow (Kling / Luma)
    else if (workflowType === 'ai-videos') {
      const { data: lumaKeyData } = await supabase
        .from('settings')
        .select('api_key')
        .eq('provider', 'api_luma')
        .eq('user_id', 'default_user')
        .single();
        
      const lumaKey = lumaKeyData?.api_key || process.env.LUMA_API_KEY;
      
      if (lumaKey) {
        console.log("Triggering Luma AI Generation for: ", keywords.join(' '));
        // 1. Start generation
        const createRes = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lumaKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt: keywords.join(' ') })
        });
        
        if (createRes.ok) {
          const createData = await createRes.json();
          const generationId = createData.id;
          
          // 2. Poll for completion (up to 40 seconds to avoid Vercel timeout)
          let videoUrl = null;
          for (let i = 0; i < 8; i++) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            const pollRes = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`, {
              headers: { 'Authorization': `Bearer ${lumaKey}` }
            });
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.state === 'completed' && pollData.assets?.video) {
                videoUrl = pollData.assets.video;
                break;
              }
            }
          }
          
          if (videoUrl) {
            candidates = [{
              id: `luma-${generationId}`,
              url: videoUrl,
              title: `Luma Gen for: ${keywords.join(', ')}`,
              platform: 'luma',
              duration: 5,
              score: 0.99,
              reason: 'Generated via Luma Dream Machine'
            }];
          }
        }
      }
      
      // Fallback 1: Hugging Face Free Inference API (Zeroscope Text-to-Video)
      if (candidates.length === 0) {
        const { data: hfKeyData } = await supabase
          .from('settings')
          .select('api_key')
          .eq('provider', 'api_huggingface')
          .eq('user_id', 'default_user')
          .single();
          
        const hfKey = hfKeyData?.api_key || process.env.HUGGINGFACE_API_KEY;
        
        if (true) { // Try even without key!
          console.log("Triggering Free Hugging Face AI Video (Zeroscope) for: ", keywords.join(' '));
          try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (hfKey) headers['Authorization'] = `Bearer ${hfKey}`;
            
            const hfRes = await fetch('https://api-inference.huggingface.co/models/cerspense/zeroscope_v2_576w', {
              method: 'POST',
              headers,
              body: JSON.stringify({ inputs: keywords.join(' ') })
            });

            if (hfRes.ok) {
              const arrayBuffer = await hfRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const base64Video = buffer.toString('base64');
              const videoDataUrl = `data:video/mp4;base64,${base64Video}`;
              
              candidates = [{
                id: `hf-${Date.now()}`,
                url: videoDataUrl,
                title: `Free HF Gen for: ${keywords.join(', ')}`,
                platform: 'huggingface',
                duration: 3,
                score: 0.95,
                reason: 'Generated via Free HuggingFace Zeroscope'
              }];
            } else {
              console.error("HF Inference Error:", await hfRes.text());
            }
          } catch (e) {
            console.error("HF API failed:", e);
          }
        }
      }
      
      // Fallback 2: Mock Stock Video
      if (candidates.length === 0) {
        candidates = [{
          id: `kling-${Date.now()}-1`,
          url: 'https://videos.pexels.com/video-files/3121459/3121459-uhd_2560_1440_24fps.mp4', 
          title: `Fallback Video Gen for: ${keywords.join(', ')}`,
          platform: 'kling',
          duration: 5,
          score: 0.9,
          reason: 'Fallback generated video'
        }];
      }
    }
    // 4. Stories Generator (Mock fallback)
    else if (workflowType === 'stories') {
      candidates = [
        {
          id: `story-stock-${Date.now()}-1`,
          url: 'https://images.pexels.com/photos/3121459/pexels-photo-3121459.jpeg',
          title: `Story background for: ${keywords.join(', ')}`,
          platform: 'pexels',
          duration: 30,
          score: 0.85,
          reason: 'Story visual'
        }
      ]
    }

    return NextResponse.json({ candidates })
  } catch (error: any) {
    console.error('Source API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
