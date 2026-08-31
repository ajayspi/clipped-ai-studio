"use client";

import { useState, useEffect } from "react";
import { Key, CheckCircle2, XCircle, Loader2, PlayCircle, Settings, Image as ImageIcon, Mic, Layout, PieChart, Palette, HelpCircle, Save, AlertCircle, Play, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/db";

interface ApiKeyData {
  isConfigured: boolean;
  maskedValue: string;
  isActive: boolean;
  updatedAt: string;
}

const PROVIDERS = [
  { id: "api_openai", name: "OpenAI", category: "AI Models" },
  { id: "api_gemini", name: "Google Gemini", category: "AI Models" },
  { id: "api_anthropic", name: "Anthropic Claude", category: "AI Models" },
  { id: "api_openrouter", name: "OpenRouter", category: "AI Models" },
  { id: "api_pexels", name: "Pexels", category: "Stock Media" },
  { id: "api_pixabay", name: "Pixabay", category: "Stock Media" },
  { id: "api_kling", name: "Kling Video", category: "Stock Media" },
  { id: "api_luma", name: "Luma Dream Machine", category: "Stock Media" },
  { id: "api_huggingface", name: "Hugging Face (Free AI Video)", category: "Stock Media" },
  { id: "api_deepgram", name: "Deepgram", category: "Voice & Audio" },
];

const CATEGORIES = ["AI Models", "Stock Media", "Voice & Audio", "Brand Kits", "Usage & Quotas"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("AI Models");
  const [keys, setKeys] = useState<Record<string, ApiKeyData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean, message: string }>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/keys");
      const data = await res.json();
      if (data.keys) {
        setKeys(data.keys);
      }
    } catch (err) {
      console.error("Failed to load keys", err);
    } finally {
      setLoading(false);
    }
  }

  async function testKey(providerId: string) {
    setTesting(providerId);
    try {
      const res = await fetch("/api/settings/keys/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [providerId]: { success: data.success, message: data.message || data.error } }));
      return data.success;
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [providerId]: { success: false, message: "Network error" } }));
      return false;
    } finally {
      setTesting(null);
    }
  }

  async function testAll() {
    setTestingAll(true);
    const promises = PROVIDERS.filter(p => keys[p.id]?.isConfigured).map(p => testKey(p.id));
    await Promise.all(promises);
    setTestingAll(false);
  }

  async function saveKey(providerId: string) {
    const value = inputs[providerId];
    if (!value) return;

    setSaving(providerId);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, apiKey: value }),
      });
      
      if (res.ok) {
        setInputs(prev => ({ ...prev, [providerId]: "" }));
        await fetchKeys(); 
      }
    } catch (err) {
      console.error("Failed to save key", err);
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your API keys and system configuration.
          </p>
        </div>
        <button
          onClick={testAll}
          disabled={testingAll}
          className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-10 px-6 py-2"
        >
          {testingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          Run System Diagnostics
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Vertical Tabs */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-4 md:pb-0 relative">
            {CATEGORIES.map(category => {
              const isActive = activeTab === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveTab(category)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-tab"
                      className="absolute inset-0 bg-primary/10 rounded-md -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {category === "AI Models" && <Settings className="w-4 h-4" />}
                    {category === "Stock Media" && <ImageIcon className="w-4 h-4" />}
                    {category === "Voice & Audio" && <Mic className="w-4 h-4" />}
                    {category === "Brand Kits" && <Layout className="w-4 h-4" />}
                    {category === "Usage & Quotas" && <PieChart className="w-4 h-4" />}
                    {category}
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Tab Content */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "Usage & Quotas" ? (
                 <div className="rounded-lg border bg-card shadow-sm">
                   <div className="p-6 border-b">
                     <h2 className="text-lg font-semibold flex items-center gap-2">
                       <PieChart className="w-5 h-5 text-primary" />
                       Monthly Usage & Quotas
                 </h2>
               </div>
               <div className="p-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="p-6 border rounded-xl flex flex-col items-center justify-center text-center">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path className="text-muted/20" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className="text-primary" strokeDasharray="66, 100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-bold">2/3</span>
                        </div>
                      </div>
                      <h3 className="mt-4 font-semibold">Video Generations</h3>
                      <p className="text-sm text-muted-foreground">Free Tier Limit</p>
                    </div>

                    <div className="p-6 border rounded-xl flex flex-col items-center justify-center text-center">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path className="text-muted/20" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className="text-blue-500" strokeDasharray="30, 100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-xl font-bold">1.2M</span>
                        </div>
                      </div>
                      <h3 className="mt-4 font-semibold">LLM Tokens</h3>
                      <p className="text-sm text-muted-foreground">Across all models</p>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-muted/20 rounded-lg text-sm text-muted-foreground text-center">
                    Quotas automatically reset on the 1st of every month. Upgrade your plan to increase limits.
                  </div>
               </div>
             </div>
          ) : activeTab === "Brand Kits" ? (
             <div className="rounded-lg border bg-card shadow-sm">
               <div className="p-6 border-b">
                 <h2 className="text-lg font-semibold flex items-center gap-2">
                   <Palette className="w-5 h-5 text-primary" />
                   Brand Kits
                 </h2>
               </div>
               <div className="p-6 space-y-6">
                 <div className="space-y-4 max-w-xl">
                   <div>
                     <label className="text-sm font-medium">Global Primary Color</label>
                     <p className="text-xs text-muted-foreground mb-2">Used for subtitles and highlights.</p>
                     <div className="flex gap-4 items-center">
                       <input type="color" className="w-12 h-12 rounded border p-1 cursor-pointer" defaultValue="#ffffff" />
                       <span className="font-mono text-sm border px-3 py-1.5 rounded-md">#FFFFFF</span>
                     </div>
                   </div>
                   
                   <div>
                     <label className="text-sm font-medium">Default Subtitle Preset</label>
                     <p className="text-xs text-muted-foreground mb-2">The default styling applied to new generated videos.</p>
                     <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                       <option>Clean (Hormozi style)</option>
                       <option>Bold Pop</option>
                       <option>Minimalist</option>
                       <option>Cinematic</option>
                     </select>
                   </div>
                   
                   <div>
                     <label className="text-sm font-medium">Default Subtitle Position</label>
                     <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-2">
                       <option>Bottom (Recommended)</option>
                       <option>Center</option>
                       <option>Top</option>
                     </select>
                   </div>
                   
                   <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium shadow hover:bg-primary/90">
                     Save Brand Kit
                   </button>
                 </div>
               </div>
             </div>
          ) : (
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  {activeTab} Integrations
                </h2>
              </div>
              <div className="p-0 grid divide-y">
                {PROVIDERS.filter(p => p.category === activeTab).map((provider) => {
                  const keyData = keys[provider.id];
                  const isConfigured = keyData?.isConfigured;
                  const testState = testResults[provider.id];
                  const isTesting = testing === provider.id || testingAll;
                  
                  return (
                    <div key={provider.id} className="p-6 flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="space-y-1 min-w-[200px]">
                        <div className="font-medium flex items-center gap-2">
                          {provider.name}
                          {isConfigured ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {isConfigured ? `Last updated: ${new Date(keyData.updatedAt).toLocaleDateString()}` : 'Not configured'}
                        </div>
                        {testState && (
                          <div className={`text-xs mt-2 ${testState.success ? 'text-green-500' : 'text-red-500'}`}>
                            {testState.message}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 w-full max-w-xl flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="password"
                              placeholder={isConfigured ? keyData.maskedValue : "Enter API Key"}
                              value={inputs[provider.id] || ""}
                              onChange={(e) => setInputs(prev => ({ ...prev, [provider.id]: e.target.value }))}
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveKey(provider.id)}
                              disabled={!inputs[provider.id] || saving === provider.id}
                              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 w-20"
                            >
                              {saving === provider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                            </button>
                            <button
                              onClick={() => testKey(provider.id)}
                              disabled={!isConfigured || isTesting}
                              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-24"
                            >
                              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test API"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
