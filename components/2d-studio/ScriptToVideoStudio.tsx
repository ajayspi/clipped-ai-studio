'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  analyzeScriptToBeats,
  ScriptDirectorProject,
  ScriptDirectorBeat,
  SCRIPT_DIRECTOR_PRESETS,
  drawFigure,
  POSES,
  walkPose,
  breathe,
  STYLES,
  setStyle,
  mood,
  E,
  drawProceduralProp,
  drawFloatingCash,
  drawDog,
  drawCat,
  drawCar,
  parseScreenplayChoreography,
  evaluateChoreographyFrame,
  ChoreographyBeat,
  ScreenplayChoreographyProject,
} from '@/lib/engine/2d-studio';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  Sparkles,
  Volume2,
  SkipForward,
  SkipBack,
  FileText,
  Layers,
  Zap,
  CheckCircle2,
  Copy,
  Package,
} from 'lucide-react';

export function ScriptToVideoStudio() {
  const [scriptText, setScriptText] = useState<string>(SCRIPT_DIRECTOR_PRESETS[0].script);
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [activeBeatIndex, setActiveBeatIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Analyze script into beats whenever text changes
  const project: ScriptDirectorProject = useMemo(() => {
    return analyzeScriptToBeats(scriptText);
  }, [scriptText]);

  // Analyze screenplay choreography whenever text changes
  const choreoProject: ScreenplayChoreographyProject = useMemo(() => {
    return parseScreenplayChoreography(scriptText);
  }, [scriptText]);

  const currentBeat: ScriptDirectorBeat | undefined = project.beats[activeBeatIndex] || project.beats[0];
  const currentChoreoBeat: ChoreographyBeat | undefined =
    choreoProject.beats[activeBeatIndex] || choreoProject.beats[0];

  // Set active style for current beat
  useEffect(() => {
    if (currentBeat?.mood) {
      setStyle(currentBeat.mood);
    }
  }, [currentBeat?.mood]);

  // Audio trigger
  const playSfx = useCallback(async (sfxName: string) => {
    try {
      const res = await fetch('/api/audio/procedural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sfx', name: sfxName }),
      });
      const data = await res.json();
      if (data.success && (data.audioUrl || data.audioBase64)) {
        const audio = new Audio(data.audioUrl || `data:audio/wav;base64,${data.audioBase64}`);
        audio.volume = 0.6;
        audio.play().catch(() => {});
      }
    } catch {
      // Audio fallback silent
    }
  }, []);

  // Main 24 FPS Canvas Render Function
  const renderBeat = useCallback(
    (elapsedSeconds: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const beat = currentBeat;
      if (!beat) return;

      const styleObj = STYLES[beat.mood] || STYLES.dusk;
      const currentMood = mood();

      ctx.save();
      ctx.clearRect(0, 0, E.W, E.H);

      // Evaluate Choreography
      const progress = Math.min(1.0, elapsedSeconds / (beat.duration || 6));
      const choreoFrame = currentChoreoBeat
        ? evaluateChoreographyFrame(currentChoreoBeat, progress)
        : null;

      // 1. World-Space Transformations (Camera Zoom, Pan, Tilt, Shake)
      ctx.save();
      if (choreoFrame) {
        ctx.translate(E.W / 2, E.H / 2);
        ctx.scale(choreoFrame.camera.zoom, choreoFrame.camera.zoom);
        if (choreoFrame.camera.rotateDeg !== 0) {
          ctx.rotate((choreoFrame.camera.rotateDeg * Math.PI) / 180);
        }
        ctx.translate(
          -E.W / 2 + choreoFrame.camera.panX + choreoFrame.camera.shakeX,
          -E.H / 2 + choreoFrame.camera.panY + choreoFrame.camera.shakeY
        );
      }

      // 1. Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, E.H * 0.72);
      skyGrad.addColorStop(0, currentMood.sky[0]);
      skyGrad.addColorStop(1, currentMood.sky[1]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, E.W, E.H);

      // 2. Horizon Floor
      const horizonY = E.H * 0.74;
      ctx.fillStyle = currentMood.floor || '#1a1025';
      ctx.fillRect(0, horizonY, E.W, E.H - horizonY);

      // Atmospheric Horizon Fog Glow
      const fogGrad = ctx.createLinearGradient(0, horizonY - 140, 0, horizonY + 80);
      fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
      fogGrad.addColorStop(0.5, currentMood.fog ? `${currentMood.fog}33` : 'rgba(255,180,140,0.18)');
      fogGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, horizonY - 140, E.W, 220);

      // 3. Ambient Prop: Floating Cash Rain (if detected in script!)
      if (beat.props.ambient === 'cashRain') {
        drawFloatingCash(ctx, elapsedSeconds, { x0: 0, y0: 0, w: E.W, h: E.H }, 40);
      }

      // 4. Staging: Vehicles (if detected in script!)
      if (beat.vehicle.type !== 'none') {
        const carX = E.W * 0.22;
        const carY = horizonY + 8;
        drawCar(ctx, {
          x: carX,
          y: carY,
          s: 1.4,
          type: beat.vehicle.type === 'sportsCar' ? 'sports' : beat.vehicle.type,
          color: beat.vehicle.color,
          lightsOn: true,
          speed: 10,
        });
      }

      // 5. Staging: Companion Animals (if detected in script!)
      if (beat.companion.type === 'dog') {
        const dogX = E.W * 0.36;
        const dogY = horizonY + 22;
        drawDog(ctx, {
          x: dogX,
          y: dogY,
          s: 1.3,
          breed: beat.companion.breed || 'labrador',
          pose: beat.companion.pose === 'loaf' ? 'sit' : beat.companion.pose || 'stand',
          t: elapsedSeconds,
        });
      } else if (beat.companion.type === 'cat') {
        const catX = E.W * 0.38;
        const catY = horizonY + 24;
        drawCat(ctx, {
          x: catX,
          y: catY,
          s: 1.3,
          pose: beat.companion.pose === 'loaf' ? 'loaf' : 'sit',
          t: elapsedSeconds,
        });
      }

      // 6. Figure Kinematic Pose
      let currentPosePoints = POSES.stand;
      const isWalking =
        beat.character.pose === 'walk' ||
        currentChoreoBeat?.action === 'walk_left' ||
        currentChoreoBeat?.action === 'walk_right' ||
        currentChoreoBeat?.action === 'sprint';

      if (isWalking) {
        const walkSpeed = currentChoreoBeat?.action === 'sprint' ? 5.2 : 2.8;
        const walkPhase = elapsedSeconds * walkSpeed * Math.PI;
        currentPosePoints = walkPose(walkPhase);
      } else if (currentChoreoBeat?.pose) {
        let choreoBase = POSES.stand;
        if (currentChoreoBeat.pose === 'facepalm') choreoBase = POSES.facepalm;
        else if (currentChoreoBeat.pose === 'hands_up' || currentChoreoBeat.pose === 'victory') choreoBase = POSES.shrug;
        else if (currentChoreoBeat.pose === 'pointing' || currentChoreoBeat.pose === 'eureka' || currentChoreoBeat.pose === 'explaining') choreoBase = POSES.holdFront;
        else if (currentChoreoBeat.pose === 'sitting' || currentChoreoBeat.pose === 'reading') choreoBase = POSES.sit;
        else if (currentChoreoBeat.pose === 'ready') choreoBase = POSES.ready;
        else if (currentChoreoBeat.pose === 'sad') choreoBase = POSES.sad;
        currentPosePoints = breathe(choreoBase, elapsedSeconds * 1.5, 0.4);
      } else {
        const poseKey = beat.character.pose === 'walk' ? 'stand' : beat.character.pose;
        const base = POSES[poseKey] || POSES.stand;
        currentPosePoints = breathe(base, elapsedSeconds * 1.5, 0.4);
      }

      // Proportional scale by age tier
      const ageScale =
        beat.character.ageTier === 'toddler'
          ? 0.7
          : beat.character.ageTier === 'child'
          ? 0.95
          : beat.character.ageTier === 'elderly'
          ? 1.35
          : 1.5;

      const figureX = choreoFrame
        ? E.W * choreoFrame.xPercent
        : (beat.vehicle.type !== 'none' ? E.W * 0.65 : E.W * 0.5);
      const figureY = horizonY + 45;
      const figureFacing = choreoFrame ? (choreoFrame.facing === 'left' ? -1 : 1) : 1;

      // 7. Draw Character
      drawFigure(ctx, {
        x: figureX,
        y: figureY,
        s: ageScale,
        facing: figureFacing,
        pose: currentPosePoints,
        expr: currentChoreoBeat?.reaction === 'jaw_drop' ? 'shocked' : (currentChoreoBeat?.reaction === 'anger_vein' ? 'angry' : beat.character.expression),
        talk: isPlaying ? Math.abs(Math.sin(elapsedSeconds * 7)) * 0.35 : 0,
        rim: {
          dir: [-0.8, -0.6],
          w: styleObj.rimWidth * 1.2,
          color: currentMood.rim || styleObj.feature || '#ffc68a',
        },
        outfit: {
          top: beat.character.outfit.top,
          color: beat.character.outfit.color,
          head: beat.character.outfit.head,
        },
      });

      // 7b. Draw Reaction Symbols above head
      if (currentChoreoBeat?.reaction && currentChoreoBeat.reaction !== 'none') {
        ctx.save();
        const rxY = figureY - 260 * (ageScale / 1.5);
        if (currentChoreoBeat.reaction === 'jaw_drop') {
          ctx.fillStyle = '#ef4444';
          ctx.font = '800 36px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('! !', figureX, rxY);
        } else if (currentChoreoBeat.reaction === 'sweat_drop') {
          ctx.font = '700 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💧', figureX + 35, rxY + 10);
        } else if (currentChoreoBeat.reaction === 'lightbulb') {
          ctx.font = '700 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💡', figureX, rxY);
        } else if (currentChoreoBeat.reaction === 'question_marks') {
          ctx.font = '800 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('???', figureX, rxY);
        } else if (currentChoreoBeat.reaction === 'anger_vein') {
          ctx.font = '800 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💢', figureX + 25, rxY);
        }
        ctx.restore();
      }

      // 8. CRITICAL: Draw Auto-Generated Prop in Hand or Scene!
      if (beat.props.held !== 'none') {
        // Place prop at right-hand position or in front
        const handX = figureX + 75 * (ageScale / 1.5);
        const handY = figureY - 145 * (ageScale / 1.5);

        if (beat.props.held === 'laptop') {
          // Place laptop in front at working height
          drawProceduralProp(ctx, 'laptop', figureX + 45, figureY - 110, 1.4);
        } else if (beat.props.held === 'phone') {
          // Smartphone in raised hand with subtle screen glow
          drawProceduralProp(ctx, 'phone', handX, handY - 15, 1.25);
        } else if (beat.props.held === 'sword') {
          // Sword in hand
          drawProceduralProp(ctx, 'sword', handX + 15, handY - 20, 1.35);
        } else if (beat.props.held === 'flask') {
          // Conical bubbling flask in hand
          drawProceduralProp(ctx, 'flask', handX, handY, 1.3);
        } else if (beat.props.held === 'coffee') {
          // Steaming mug
          drawProceduralProp(ctx, 'coffee', handX, handY, 1.3);
        } else if (beat.props.held === 'ideaBulb') {
          // Eureka lightbulb floating above head
          drawProceduralProp(ctx, 'ideaBulb', figureX, figureY - 280, 1.4);
        } else if (beat.props.held === 'cash') {
          // Money stack
          drawProceduralProp(ctx, 'cash', handX, handY, 1.3);
        } else if (beat.props.held === 'coinTower') {
          // Coin tower on ground
          drawProceduralProp(ctx, 'coinTower', figureX + 110, horizonY + 30, 1.5);
        } else {
          // Generic procedural prop routing for any other detected item
          drawProceduralProp(ctx, beat.props.held, handX, handY, 1.3);
        }
      }

      // Secondary prop on ground / desk
      if (beat.props.secondary !== 'none' && beat.props.secondary !== beat.props.held) {
        drawProceduralProp(ctx, beat.props.secondary, figureX - 110, horizonY + 25, 1.4);
      }

      // 9. Overlay Infographics (Game theory matrix, ratio counters, timers)
      if (beat.overlay === 'matrix') {
        // 2x2 Matrix HUD
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(E.W * 0.08, E.H * 0.12, 340, 220, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = '700 16px sans-serif';
        ctx.fillText('GAME THEORY PAYOFF', E.W * 0.08 + 24, E.H * 0.12 + 36);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 13px sans-serif';
        ctx.fillText('Cooperate: +5 / +5', E.W * 0.08 + 24, E.H * 0.12 + 80);
        ctx.fillText('Defect: +10 / -10', E.W * 0.08 + 24, E.H * 0.12 + 115);
        ctx.fillStyle = '#ef4444';
        ctx.fillText('Nash Equilibrium: Conflict', E.W * 0.08 + 24, E.H * 0.12 + 160);
        ctx.restore();
      } else if (beat.overlay === 'counter') {
        // Population / Ratio Counter HUD
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(E.W * 0.08, E.H * 0.12, 300, 110, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.font = '800 28px monospace';
        ctx.fillText('RATIO 1,000 : 1', E.W * 0.08 + 24, E.H * 0.12 + 48);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 14px sans-serif';
        ctx.fillText('Population Divergence Metric', E.W * 0.08 + 24, E.H * 0.12 + 82);
        ctx.restore();
      }

      // Restore camera world-space before drawing HUD subtitles & letterboxes
      ctx.restore();

      // 10. Live Narrative Subtitle Bar
      ctx.save();
      const subGrad = ctx.createLinearGradient(0, E.H - 140, 0, E.H);
      subGrad.addColorStop(0, 'rgba(0,0,0,0)');
      subGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = subGrad;
      ctx.fillRect(0, E.H - 160, E.W, 160);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 8;
      ctx.fillText(beat.text, E.W * 0.5, E.H - 65);
      ctx.restore();

      // 11. Cinematic Letterbox Bars
      const barH = E.H * 0.05;
      ctx.fillStyle = '#08060c';
      ctx.fillRect(0, 0, E.W, barH);
      ctx.fillRect(0, E.H - barH, E.W, barH);

      ctx.restore();
    },
    [currentBeat, currentChoreoBeat, isPlaying]
  );

  // RAF Animation Loop
  useEffect(() => {
    let animId: number;
    let startTime: number | null = null;
    let lastBeatAdvanceTime = 0;

    const frameLoop = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
        lastBeatAdvanceTime = timestamp;
      }
      const elapsed = (timestamp - startTime) / 1000;
      renderBeat(elapsed);

      // Auto-advance beats based on target duration
      if (isPlaying && autoAdvance && project.beats.length > 1) {
        const beatDurationMs = (currentBeat?.duration || 6) * 1000;
        if (timestamp - lastBeatAdvanceTime >= beatDurationMs) {
          lastBeatAdvanceTime = timestamp;
          setActiveBeatIndex((prev) => {
            const nextIdx = (prev + 1) % project.beats.length;
            if (project.beats[nextIdx]?.sfx) {
              playSfx(project.beats[nextIdx].sfx);
            }
            return nextIdx;
          });
        }
      }

      if (isPlaying) {
        animId = requestAnimationFrame(frameLoop);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(frameLoop);
    } else {
      renderBeat(0);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, autoAdvance, currentBeat, project.beats, renderBeat, playSfx]);

  const loadPreset = (idx: number) => {
    setSelectedPreset(idx);
    setScriptText(SCRIPT_DIRECTOR_PRESETS[idx].script);
    setActiveBeatIndex(0);
    if (SCRIPT_DIRECTOR_PRESETS[idx]) {
      const p = analyzeScriptToBeats(SCRIPT_DIRECTOR_PRESETS[idx].script);
      if (p.beats[0]?.sfx) {
        playSfx(p.beats[0].sfx);
      }
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(project, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* LEFT COLUMN: SCRIPT INPUT & AUTOMATED BEAT INSPECTOR */}
      <div className="w-full lg:w-[480px] shrink-0 flex flex-col gap-5">
        {/* Presets Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" />
              1-Click Story Presets
            </span>
            <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Auto-Director Active
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {SCRIPT_DIRECTOR_PRESETS.map((preset, idx) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => loadPreset(idx)}
                className={`text-left p-3 rounded-xl border text-xs transition-all flex flex-col gap-1 ${
                  selectedPreset === idx
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>{preset.name}</span>
                  {selectedPreset === idx && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <span className="text-[11px] text-slate-400 font-normal line-clamp-1">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Script Editor Area */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label htmlFor="script-input" className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-sky-400" />
              Narration / Script Input
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">
                {project.totalDuration}s total • {project.beats.length} beats
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Type or paste your narrative. The Auto-Director parses keywords on the fly, generating characters, props, vehicles, companion pets, and sound cues with zero manual menus!
          </p>

          <textarea
            id="script-input"
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            rows={7}
            placeholder="[Scene 1] A Wall Street trader sat at his laptop staring at stock charts...&#10;[Scene 2] Suddenly money began raining down..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all resize-y"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              {project.extractedPropsCount} Props Synthesized
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyJson}
              className="text-xs border-slate-800 gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedJson ? 'Copied Timeline!' : 'Export Timeline JSON'}
            </Button>
          </div>
        </div>

        {/* Extracted Beats Inspector */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-orange-400" />
              Auto-Extracted Story Beats ({project.beats.length})
            </span>
            <span className="text-[10px] text-slate-400">Click to scrub</span>
          </div>

          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
            {project.beats.map((beat, idx) => {
              const isSelected = activeBeatIndex === idx;
              return (
                <div
                  key={beat.id}
                  onClick={() => {
                    setActiveBeatIndex(idx);
                    if (beat.sfx) playSfx(beat.sfx);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/60 shadow-lg'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono text-amber-400">
                        {idx + 1}
                      </span>
                      Beat {idx + 1} ({beat.duration}s)
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800/90 text-slate-400">
                      Mood: {beat.mood}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 italic">
                    &ldquo;{beat.text}&rdquo;
                  </p>

                  {/* Auto-Extracted Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {beat.props.held !== 'none' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                        <Package className="w-3 h-3" />
                        Prop: {beat.props.held}
                      </span>
                    )}

                    {beat.props.ambient === 'cashRain' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                        💰 Cash Rain
                      </span>
                    )}

                    {beat.vehicle.type !== 'none' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                        🚗 Vehicle: {beat.vehicle.type}
                      </span>
                    )}

                    {beat.companion.type !== 'none' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 text-[10px] font-semibold border border-violet-500/30">
                        🐕 {beat.companion.breed || beat.companion.type}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
                      {beat.character.role} ({beat.character.pose})
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-950/60 text-sky-400 text-[10px] border border-sky-800/40">
                      <Volume2 className="w-2.5 h-2.5" />
                      SFX: {beat.sfx}
                    </span>

                    {choreoProject.beats[idx] && (
                      <>
                        {choreoProject.beats[idx].action !== 'idle' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 text-[10px] font-semibold border border-sky-500/30">
                            🏃 {choreoProject.beats[idx].action}
                          </span>
                        )}
                        {choreoProject.beats[idx].camera !== 'static' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-semibold border border-purple-500/30">
                            🎥 {choreoProject.beats[idx].camera}
                          </span>
                        )}
                        {choreoProject.beats[idx].reaction !== 'none' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                            ⚡ {choreoProject.beats[idx].reaction}
                          </span>
                        )}
                        {choreoProject.beats[idx].pauseDurationSec > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-300 text-[10px] font-semibold border border-yellow-500/30">
                            ⏱️ Pause {choreoProject.beats[idx].pauseDurationSec}s
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: LIVE 24 FPS CANVAS STORY PLAYER */}
      <div className="flex-1 flex flex-col gap-4 w-full">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Staged Story Viewport (24 FPS)
              </h2>
              <p className="text-xs text-slate-400">
                Rendering Beat {activeBeatIndex + 1} of {project.beats.length} • Generated Prop:{' '}
                <span className="text-amber-400 font-bold">{currentBeat?.props.held || 'none'}</span>
              </p>
            </div>

            {/* Transport Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prev = (activeBeatIndex - 1 + project.beats.length) % project.beats.length;
                  setActiveBeatIndex(prev);
                  if (project.beats[prev]?.sfx) playSfx(project.beats[prev].sfx);
                }}
                className="border-slate-800 text-slate-300 h-8 w-8 p-0"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold h-8 px-4 gap-1.5 shadow-md"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                {isPlaying ? 'Pause' : 'Play Sequence'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = (activeBeatIndex + 1) % project.beats.length;
                  setActiveBeatIndex(next);
                  if (project.beats[next]?.sfx) playSfx(project.beats[next].sfx);
                }}
                className="border-slate-800 text-slate-300 h-8 w-8 p-0"
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              <Button
                variant={autoAdvance ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoAdvance(!autoAdvance)}
                className={`text-xs h-8 ${autoAdvance ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'border-slate-800 text-slate-400'}`}
              >
                Auto-Scrub {autoAdvance ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>

          {/* 1920x1080 Aspect Canvas */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800/90 bg-slate-950 shadow-2xl flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={1920}
              height={1080}
              className="w-full h-auto max-w-full block aspect-video object-contain"
            />
          </div>

          {/* Current Beat Narration Callout */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300">
                  Current Beat {activeBeatIndex + 1}: {currentBeat?.character.role}
                </span>
                <span className="text-[11px] font-mono text-amber-400">
                  Target Duration: {currentBeat?.duration}s
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                &ldquo;{currentBeat?.text}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
