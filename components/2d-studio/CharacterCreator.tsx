'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CHARACTERS,
  CharacterConfig,
  drawCharacter,
  drawDog,
  drawCat,
  drawCar,
  drawFloatingCash,
  drawCashStack,
  drawLaptop,
  drawSword,
  drawLabFlask,
  STYLES,
  setStyle,
  mood,
  E,
  POSES,
  breathe,
  walkPose,
  AGE_POSES,
} from '@/lib/engine/2d-studio';
import { Button } from '@/components/ui/button';
import {
  User,
  Sparkles,
  Palette,
  Check,
  Copy,
  RotateCcw,
  Shield,
  Briefcase,
  Play,
  Pause,
} from 'lucide-react';

interface CharacterCreatorProps {
  initialConfig?: CharacterConfig;
  onSave?: (config: CharacterConfig) => void;
  className?: string;
}

export function CharacterCreator({
  initialConfig = CHARACTERS.man_casual,
  onSave,
  className = '',
}: CharacterCreatorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Configuration state
  const [config, setConfig] = useState<CharacterConfig>({ ...initialConfig });
  const [characterName, setCharacterName] = useState<string>('My Custom Character');
  const [selectedStyle, setSelectedStyle] = useState<string>('dusk');
  const [selectedPose, setSelectedPose] = useState<'stand' | 'walk' | 'age'>('stand');
  const [activeTab, setActiveTab] = useState<'presets' | 'body' | 'hair' | 'outfit' | 'props' | 'staging'>('body');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Staging extras
  const [companion, setCompanion] = useState<'none' | 'dog_labrador' | 'dog_husky' | 'dog_shiba' | 'cat'>('none');
  const [vehicle, setVehicle] = useState<'none' | 'sports' | 'sedan' | 'suv'>('none');
  const [activeProp, setActiveProp] = useState<'none' | 'cash' | 'laptop' | 'sword' | 'flask'>('none');
  const [moneyRain, setMoneyRain] = useState<boolean>(false);

  // Palette presets
  const COLOR_PALETTES = [
    '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6',
    '#ec4899', '#06b6d4', '#475569', '#1e293b', '#ffffff',
  ];

  // Set style
  useEffect(() => {
    setStyle(selectedStyle);
  }, [selectedStyle]);

  // Render Loop
  const render = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentMood = mood(
        selectedStyle === 'midnight' ? 'night' : selectedStyle === 'golden' ? 'golden' : 'dusk'
      );
      const styleObj = STYLES[selectedStyle] || STYLES.dusk;

      E.W = 1920;
      E.H = 1080;
      E.style = styleObj;

      ctx.save();
      const scale = canvas.width / E.W;
      ctx.scale(scale, scale);

      // 1. Atmospheric Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, E.H);
      const sky = currentMood.sky || ['#1e142e', '#3a2042', '#e8956b'];
      sky.forEach((col, i) => {
        bgGrad.addColorStop(i / Math.max(1, sky.length - 1), col);
      });
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, E.W, E.H);

      // 2. Horizon Floor
      const horizonY = E.H * 0.72;
      ctx.fillStyle = currentMood.floor || '#2a1a2e';
      ctx.fillRect(0, horizonY, E.W, E.H - horizonY);

      // Horizon glow
      const fogGrad = ctx.createLinearGradient(0, horizonY - 140, 0, horizonY + 80);
      fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
      fogGrad.addColorStop(0.5, currentMood.fog ? `${currentMood.fog}33` : 'rgba(255,180,140,0.18)');
      fogGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, horizonY - 140, E.W, 220);

      // 3. Staged Vehicle (behind character)
      if (vehicle !== 'none') {
        drawCar(ctx, {
          x: E.W * 0.28,
          y: horizonY + 25,
          s: 1.6,
          facing: 1,
          type: vehicle,
          lightsOn: true,
          speed: isPlaying ? 5 : 0,
          t,
        });
      }

      // 4. Staged Props on Ground
      if (activeProp === 'cash') {
        drawCashStack(ctx, E.W * 0.62, horizonY + 25, 1.4);
      } else if (activeProp === 'laptop') {
        drawLaptop(ctx, E.W * 0.62, horizonY + 15, 1.3);
      } else if (activeProp === 'sword') {
        drawSword(ctx, E.W * 0.62, horizonY - 10, 1.2, 0.4);
      } else if (activeProp === 'flask') {
        drawLabFlask(ctx, E.W * 0.62, horizonY + 20, 1.4, '#10b981');
      }

      // Money Rain FX
      if (moneyRain) {
        drawFloatingCash(ctx, t, { x0: 0, y0: 0, w: E.W, h: E.H }, 35);
      }

      // 5. Pose Computation
      let currentPose = POSES.stand;
      if (selectedPose === 'walk') {
        currentPose = walkPose(t * 2.8 * Math.PI);
      } else if (selectedPose === 'age') {
        if (config.age === 'elderly') {
          currentPose = AGE_POSES.elderlyWalk(t);
        } else if (config.age === 'child') {
          currentPose = AGE_POSES.childSkip(t);
        } else if (config.age === 'toddler') {
          currentPose = AGE_POSES.toddlerCrawl;
        } else {
          currentPose = breathe(POSES.stand, t * 1.5, 0.4);
        }
      } else {
        currentPose = isPlaying ? breathe(POSES.stand, t * 1.5, 0.4) : POSES.stand;
      }

      // 6. Draw Custom Character
      const charX = E.W * 0.5;
      const charY = horizonY + 35;

      drawCharacter(ctx, {
        x: charX,
        y: charY,
        s: 1.65,
        facing: 1,
        pose: currentPose,
        char: config,
        age: config.age,
        gender: config.gender,
        cane: config.cane,
        backpack: config.backpack,
        talk: isPlaying ? Math.abs(Math.sin(t * 8)) * 0.35 : 0,
      });

      // 7. Companion Animal (in front of character)
      if (companion !== 'none') {
        const compX = charX + 180;
        const compY = horizonY + 35;
        if (companion.startsWith('dog_')) {
          const breed = companion.replace('dog_', '') as 'labrador' | 'husky' | 'shiba';
          drawDog(ctx, {
            x: compX,
            y: compY,
            s: 1.4,
            facing: -1,
            breed,
            pose: isPlaying ? (t % 4 < 2 ? 'play' : 'stand') : 'stand',
            t,
          });
        } else if (companion === 'cat') {
          drawCat(ctx, {
            x: compX,
            y: compY,
            s: 1.35,
            facing: -1,
            pose: 'sit',
            t,
          });
        }
      }

      // 8. Letterbox Bars
      const barHeight = E.H * 0.05;
      ctx.fillStyle = '#08060c';
      ctx.fillRect(0, 0, E.W, barHeight);
      ctx.fillRect(0, E.H - barHeight, E.W, barHeight);

      ctx.restore();
    },
    [selectedStyle, selectedPose, config, companion, vehicle, activeProp, moneyRain, isPlaying]
  );

  // RAF loop
  useEffect(() => {
    let animId: number;
    let startTime: number | null = null;

    const frameLoop = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      render(elapsed);
      if (isPlaying) {
        animId = requestAnimationFrame(frameLoop);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(frameLoop);
    } else {
      render(0);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, render]);

  // Load Preset
  const applyPreset = (presetKey: string) => {
    const p = CHARACTERS[presetKey];
    if (p) {
      setConfig({ ...p });
      setCharacterName(presetKey.replace(/_/g, ' '));
    }
  };

  // Copy Config
  const copyConfigJson = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 w-full ${className}`}>
      {/* Left Area: Live Interactive Stage (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-slate-950 shadow-2xl flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            className="w-full h-auto max-w-full block aspect-video object-contain"
          />

          {/* Floating Controls */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-8 px-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
              <span className="text-xs">{isPlaying ? 'Pause' : 'Play'}</span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setConfig({ ...CHARACTERS.man_casual });
                setSelectedPose('stand');
                setCompanion('none');
                setVehicle('none');
                setActiveProp('none');
                setMoneyRain(false);
              }}
              className="h-8 px-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10"
              title="Reset Character"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Title Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold text-amber-400 capitalize">
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span>{characterName}</span>
          </div>

          <div className="absolute bottom-2 left-3 text-[11px] font-mono text-white/60 pointer-events-none drop-shadow">
            2D Modular Character Rig · 1920x1080 Native · Zero Compute
          </div>
        </div>

        {/* Action Buttons & Pose Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/70">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Action Pose:</span>
            {(['stand', 'walk', 'age'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPose(p)}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-all ${
                  selectedPose === p
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-muted-foreground'
                }`}
              >
                {p === 'age' ? 'Special / Age' : p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={copyConfigJson}
              className="h-8 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
            >
              {hasCopied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              <span>{hasCopied ? 'Copied JSON!' : 'Copy Config'}</span>
            </Button>

            {onSave && (
              <Button
                size="sm"
                onClick={() => onSave(config)}
                className="h-8 text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold"
              >
                Use in Scene
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right Area: Modular Studio Customization Drawer (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/60 border border-border rounded-xl">
          {[
            { id: 'presets', label: 'Presets' },
            { id: 'body', label: 'Body & Age' },
            { id: 'hair', label: 'Hair & Head' },
            { id: 'outfit', label: 'Outfit' },
            { id: 'props', label: 'Props & Gear' },
            { id: 'staging', label: 'Staging' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Presets Catalog */}
        {activeTab === 'presets' && (
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border/80 max-h-[460px] overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Multi-Generational & Genre Presets
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(CHARACTERS).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => applyPreset(k)}
                  className="p-2.5 rounded-xl border border-border/70 hover:border-amber-500/50 bg-background/50 hover:bg-amber-500/5 text-left transition-all"
                >
                  <div className="text-xs font-bold capitalize truncate">{k.replace(/_/g, ' ')}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {CHARACTERS[k].age} · {CHARACTERS[k].gender}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Body & Age */}
        {activeTab === 'body' && (
          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-card border border-border/80">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Age Group
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['toddler', 'child', 'teen', 'adult', 'elderly'] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        age: a,
                        scale: a === 'toddler' ? 0.48 : a === 'child' ? 0.68 : a === 'teen' ? 0.85 : a === 'elderly' ? 0.92 : 1.0,
                        headRatio: a === 'toddler' ? 1.25 : 1.0,
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg text-xs capitalize text-center border transition-all ${
                      config.age === a
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                        : 'border-border/60 hover:border-border text-muted-foreground'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Gender & Features
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['male', 'female', 'neutral'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        gender: g,
                        eyelashes: g === 'female',
                        top: g === 'female' ? 'dress' : prev.top === 'dress' ? 'tshirt' : prev.top,
                      }))
                    }
                    className={`py-2 px-3 rounded-lg text-xs capitalize text-center border transition-all ${
                      config.gender === g
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                        : 'border-border/60 hover:border-border text-muted-foreground'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!config.eyelashes}
                  onChange={(e) => setConfig((prev) => ({ ...prev, eyelashes: e.target.checked }))}
                  className="rounded border-border text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <span>Flutter Eyelashes</span>
              </label>

              {config.age === 'elderly' && (
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!config.cane}
                    onChange={(e) => setConfig((prev) => ({ ...prev, cane: e.target.checked }))}
                    className="rounded border-border text-amber-500 focus:ring-amber-500 w-4 h-4"
                  />
                  <span>Walking Cane</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Hair & Headwear */}
        {activeTab === 'hair' && (
          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-card border border-border/80">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Headwear & Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['none', 'spiky', 'ponytail', 'bun', 'headband', 'cap', 'beanie', 'fedora', 'hood'] as const).map(
                  (h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, head: h }))}
                      className={`p-2 rounded-lg text-xs capitalize text-center border transition-all ${
                        config.head === h
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                          : 'border-border/60 hover:border-border text-muted-foreground'
                      }`}
                    >
                      {h}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                Headwear Color
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PALETTES.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, headColor: col }))}
                    className={`w-6 h-6 rounded-full border transition-all ${
                      config.headColor === col ? 'ring-2 ring-amber-500 scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.face === 'glasses'}
                  onChange={(e) => setConfig((prev) => ({ ...prev, face: e.target.checked ? 'glasses' : null }))}
                  className="rounded border-border text-amber-500 w-3.5 h-3.5"
                />
                <span>Glasses</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.face === 'sunglasses'}
                  onChange={(e) => setConfig((prev) => ({ ...prev, face: e.target.checked ? 'sunglasses' : null }))}
                  className="rounded border-border text-amber-500 w-3.5 h-3.5"
                />
                <span>Sunglasses</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!config.beard}
                  onChange={(e) => setConfig((prev) => ({ ...prev, beard: e.target.checked }))}
                  className="rounded border-border text-amber-500 w-3.5 h-3.5"
                />
                <span>Beard</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!config.mustache}
                  onChange={(e) => setConfig((prev) => ({ ...prev, mustache: e.target.checked }))}
                  className="rounded border-border text-amber-500 w-3.5 h-3.5"
                />
                <span>Mustache</span>
              </label>
            </div>
          </div>
        )}

        {/* Tab 4: Outfit */}
        {activeTab === 'outfit' && (
          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-card border border-border/80">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Top Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['tshirt', 'hoodie', 'suit', 'dress', 'labcoat', 'trench', 'jersey', 'tracksuit', 'none'] as const).map(
                  (topStyle) => (
                    <button
                      key={topStyle}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, top: topStyle }))}
                      className={`p-2 rounded-lg text-xs capitalize text-center border transition-all ${
                        config.top === topStyle
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                          : 'border-border/60 hover:border-border text-muted-foreground'
                      }`}
                    >
                      {topStyle}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                Outfit Color
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PALETTES.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, color: col }))}
                    className={`w-6 h-6 rounded-full border transition-all ${
                      config.color === col ? 'ring-2 ring-amber-500 scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                Legs / Pants Color
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PALETTES.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, legs: col }))}
                    className={`w-6 h-6 rounded-full border transition-all ${
                      config.legs === col ? 'ring-2 ring-amber-500 scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Props & Accessories */}
        {activeTab === 'props' && (
          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-card border border-border/80">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                Character Hand Props
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'cash', label: 'Cash Stack' },
                  { id: 'laptop', label: 'Laptop' },
                  { id: 'sword', label: 'Sword' },
                  { id: 'flask', label: 'Lab Flask' },
                ].map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setActiveProp(pr.id as typeof activeProp)}
                    className={`p-2 rounded-lg text-xs text-center border transition-all ${
                      activeProp === pr.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                        : 'border-border/60 hover:border-border text-muted-foreground'
                    }`}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!config.backpack}
                  onChange={(e) => setConfig((prev) => ({ ...prev, backpack: e.target.checked }))}
                  className="rounded border-border text-amber-500 w-4 h-4"
                />
                <span>Backpack (School / Hiker)</span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!config.tie}
                  onChange={(e) => setConfig((prev) => ({ ...prev, tie: e.target.checked }))}
                  className="rounded border-border text-amber-500 w-4 h-4"
                />
                <span>Business Necktie</span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!config.knightHelmet}
                  onChange={(e) => setConfig((prev) => ({ ...prev, knightHelmet: e.target.checked }))}
                  className="rounded border-border text-amber-500 w-4 h-4"
                />
                <span>Knight Armor Helmet</span>
              </label>
            </div>
          </div>
        )}

        {/* Tab 6: Staging & Companions */}
        {activeTab === 'staging' && (
          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-card border border-border/80">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Companion Animal
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'dog_labrador', label: 'Labrador Dog' },
                  { id: 'dog_husky', label: 'Husky Dog' },
                  { id: 'dog_shiba', label: 'Shiba Dog' },
                  { id: 'cat', label: 'Cat' },
                ].map((co) => (
                  <button
                    key={co.id}
                    type="button"
                    onClick={() => setCompanion(co.id as typeof companion)}
                    className={`p-2 rounded-lg text-xs text-center border transition-all ${
                      companion === co.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                        : 'border-border/60 hover:border-border text-muted-foreground'
                    }`}
                  >
                    {co.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Staged Vehicle
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'sports', label: 'Sports Car' },
                  { id: 'sedan', label: 'Sedan' },
                  { id: 'suv', label: 'SUV' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicle(v.id as typeof vehicle)}
                    className={`p-2 rounded-lg text-xs text-center border transition-all ${
                      vehicle === v.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                        : 'border-border/60 hover:border-border text-muted-foreground'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={moneyRain}
                  onChange={(e) => setMoneyRain(e.target.checked)}
                  className="rounded border-border text-amber-500 w-4 h-4"
                />
                <span className="font-semibold text-emerald-400">Animated Money Rain FX</span>
              </label>
            </div>
          </div>
        )}

        {/* Global Mood Environment Selector */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>Lighting Mood:</span>
          </div>
          <div className="flex items-center gap-1">
            {Object.keys(STYLES).map((sKey) => (
              <button
                key={sKey}
                type="button"
                onClick={() => setSelectedStyle(sKey)}
                className={`text-[11px] px-2 py-0.5 rounded capitalize transition-all ${
                  selectedStyle === sKey
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {sKey}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
