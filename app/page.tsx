"use client";

import Link from "next/link";
import { Video, Zap, Shield, ExternalLink, Play, Sparkles, Wand2, Rocket, Layers, Scissors, Clapperboard, CheckCircle2, Activity, Cpu, Globe, Languages, Database, Gauge } from "lucide-react";
import { Particles } from "@/components/ui/particles";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white overflow-hidden selection:bg-primary/30">
      
      {/* Absolute Backgrounds */}
      <div className="fixed inset-0 z-0 h-screen">
        <div className="absolute inset-0 bg-black/70 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent z-20" />
        <img 
          src="/hero-bg.jpg" 
          alt="Cinematic abstract AI nodes" 
          className="w-full h-full object-cover opacity-60"
        />
        <Particles className="z-30 opacity-70" />
      </div>

      {/* Navbar */}
      <header className="relative z-50 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Video className="h-4 w-4 text-white" />
            </div>
            Clipped
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-lg hover:bg-white/90 transition-all hover:scale-105 active:scale-95"
            >
              Start Creating
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-40 flex flex-1 flex-col items-center pt-24 sm:pt-32 pb-20">
        
        <div className="flex flex-col items-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-white/80 mb-8 shadow-2xl"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            The Open-Source AI Video Studio
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
            className="max-w-5xl text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 pb-2 drop-shadow-sm"
          >
            Clip ideas into <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-blue-500 animate-gradient-x">
              viral videos.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="mt-8 max-w-2xl text-lg sm:text-xl text-white/60 leading-relaxed font-light"
          >
            Turn simple text prompts into polished short-form videos. Powered by 8 AI workflows, fully automated subtitles, and a 100% keyless fallback engine.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            className="mt-12 flex flex-col sm:flex-row gap-5 items-center justify-center"
          >
            <Link
              href="/create/auto"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-primary to-purple-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <Wand2 className="mr-2 h-5 w-5" />
              Try Auto-Pilot
            </Link>
            
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-8 py-4 text-base font-medium text-white shadow-lg transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
            >
              <Play className="mr-2 h-5 w-5 fill-white/20" />
              View Dashboard
            </Link>
          </motion.div>
        </div>

        {/* Feature Highlights */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
          className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full px-6"
        >
          {[
            { icon: Zap, title: "100% Keyless Mode", desc: "No API keys needed. Fallbacks gracefully use free open-source models." },
            { icon: Scissors, title: "Hormozi Captions", desc: "Dynamic word-by-word highlighted subtitles powered by Remotion physics." },
            { icon: Rocket, title: "Social Scheduler", desc: "Plan and auto-publish to TikTok (9:16) and YouTube directly from the app." },
          ].map((feat, i) => (
            <div key={i} className="flex flex-col items-center text-center p-8 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-md transition-all hover:bg-white/[0.04] hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-6 text-primary ring-1 ring-primary/30">
                <feat.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feat.title}</h3>
              <p className="text-base text-white/50 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* How It Works Section */}
        <div className="w-full max-w-7xl mx-auto px-6 mt-40">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Create at the speed of thought.</h2>
            <p className="text-white/50 max-w-2xl mx-auto text-lg">Our multi-stage AI orchestrator handles the heavy lifting. You just provide the vision.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Write a Prompt", desc: "Describe your video idea. Our LLM will break it down into scenes, narration, and visual beats.", icon: Layers },
              { step: "02", title: "AI Generation", desc: "Our engine simultaneously generates TTS audio, background music, and hyper-realistic scene images.", icon: Wand2 },
              { step: "03", title: "Render & Publish", desc: "Remotion stitches everything together with dynamic captions. Schedule it directly to your socials.", icon: Clapperboard },
            ].map((s, i) => (
              <div key={i} className="relative p-8 rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10">
                <div className="absolute top-6 right-8 text-5xl font-black text-white/5">{s.step}</div>
                <s.icon className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-2xl font-bold mb-3">{s.title}</h3>
                <p className="text-white/60 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Performance & Data Showcase */}
        <div className="w-full max-w-7xl mx-auto px-6 mt-40">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Unmatched AI Performance.</h2>
            <p className="text-white/50 max-w-2xl mx-auto text-lg">Clipped isn't just a wrapper. We orchestrate a pipeline of 7 specialized models to render studio-quality output in seconds.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Cpu, label: "Models Supported", value: "5+", desc: "OpenAI, Anthropic, Gemini, Luma, Kling" },
              { icon: Gauge, label: "Render Speed", value: "10x", desc: "Faster than manual Premiere Pro editing" },
              { icon: Languages, label: "TTS Languages", value: "50+", desc: "Featuring native 11Labs & Coqui clones" },
              { icon: Database, label: "Video Formats", value: "4K", desc: "Lossless 9:16 and 16:9 MP4 exports" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <stat.icon className="w-40 h-40" />
                </div>
                <stat.icon className="w-8 h-8 text-primary mb-4" />
                <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
                <div className="text-sm font-bold text-white/80 mb-1 tracking-wider uppercase">{stat.label}</div>
                <div className="text-xs text-white/40 leading-relaxed">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Types Showcase */}
        <div className="w-full bg-black/50 border-y border-white/5 mt-40 py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Endless Content Possibilities.</h2>
              <p className="text-white/50 max-w-2xl mx-auto text-lg">From educational shorts to cinematic micro-dramas, Clipped adapts to your niche.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="group relative rounded-3xl overflow-hidden border border-white/10 aspect-[9/16] bg-zinc-900">
                <img src="/thumbnail_history.jpg" alt="History Short" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="inline-flex px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-md border border-primary/30">History Shorts</div>
                  <h3 className="text-2xl font-bold text-white mb-2">The Fall of Rome</h3>
                  <p className="text-white/70 text-sm line-clamp-2">Generate hyper-realistic historical recountings with dramatic voiceovers.</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="group relative rounded-3xl overflow-hidden border border-white/10 aspect-[9/16] bg-zinc-900 md:translate-y-12">
                <img src="/thumbnail_drama.jpg" alt="Cyberpunk Drama" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="inline-flex px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-md border border-purple-500/30">Micro-Dramas</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Neon Nights</h3>
                  <p className="text-white/70 text-sm line-clamp-2">Create consistent character stories in a rainy cyberpunk universe.</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="group relative rounded-3xl overflow-hidden border border-white/10 aspect-[9/16] bg-zinc-900">
                <img src="/thumbnail_brain.jpg" alt="Educational Brain" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="inline-flex px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-md border border-blue-500/30">Educational</div>
                  <h3 className="text-2xl font-bold text-white mb-2">How Memory Works</h3>
                  <p className="text-white/70 text-sm line-clamp-2">Break down complex science topics using gorgeous abstract 3D visuals.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="w-full max-w-4xl mx-auto px-6 mt-40 text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6">Ready to go viral?</h2>
          <p className="text-xl text-white/60 mb-10">Stop spending hours editing. Start generating in seconds.</p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-white px-10 py-5 text-lg font-bold text-black shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:bg-white/90 transition-all hover:scale-105 active:scale-95"
          >
            Create Your First Video
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12 relative z-40 mt-32">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white/50">
            <Video className="h-5 w-5" />
            Clipped
          </div>
          <p className="text-sm text-white/40">
            © 2026 Clipped AI. Designed for Creators.
          </p>
          <div className="flex gap-4 text-sm font-medium text-white/40">
            <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
            <Link href="#" className="hover:text-white transition-colors">Discord</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
