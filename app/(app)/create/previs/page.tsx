"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Clapperboard, Compass, ArrowRight, Car } from "lucide-react";
import { renderVehicle3D, VEHICLE_PRESETS } from "@/lib/engine/vehicle-models";

export default function PrevisPage() {
  const [script, setScript] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [stagingModel, setStagingModel] = useState<"actors" | "stradale" | "porsche_930" | "match_cut">("stradale");
  const [vehicleColor, setVehicleColor] = useState("#c8102e");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stagingModelRef = useRef(stagingModel);
  const vehicleColorRef = useRef(vehicleColor);

  useEffect(() => {
    stagingModelRef.current = stagingModel;
    vehicleColorRef.current = vehicleColor;
  }, [stagingModel, vehicleColor]);

  // Native 3D Perspective Projection Engine (Zero-dependency WebGL/Canvas Blockout)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // 3D Point Projection Helper
    const project = (
      x: number,
      y: number,
      z: number,
      camX: number,
      camY: number,
      camZ: number,
      width: number,
      height: number
    ) => {
      // Relative to camera
      const dx = x - camX;
      const dy = y - camY;
      const dz = z - camZ;

      // Camera yaw angle towards (0, 0, 0)
      const angle = Math.atan2(camX, camZ);
      const rotX = dx * Math.cos(-angle) - dz * Math.sin(-angle);
      const rotZ = dx * Math.sin(-angle) + dz * Math.cos(-angle);

      if (rotZ <= 0.1) return null; // Behind camera

      const fov = 450;
      const scale = fov / rotZ;
      return {
        x: width / 2 + rotX * scale,
        y: height / 2 - dy * scale,
        depth: rotZ,
      };
    };

    // Render loop
    const render = () => {
      time += 0.02;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      // Dark Tech Viewport Background
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, width, height);

      // Orbiting Camera Position
      const camRadius = 9;
      const camX = Math.sin(time * 0.4) * camRadius;
      const camY = 3.5;
      const camZ = Math.cos(time * 0.4) * camRadius;

      // 1. Draw 3D Ground Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;

      const gridSize = 6;
      const gridStep = 1.2;

      for (let i = -gridSize; i <= gridSize; i++) {
        // Z lines
        const p1 = project(i * gridStep, 0, -gridSize * gridStep, camX, camY, camZ, width, height);
        const p2 = project(i * gridStep, 0, gridSize * gridStep, camX, camY, camZ, width, height);
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        // X lines
        const p3 = project(-gridSize * gridStep, 0, i * gridStep, camX, camY, camZ, width, height);
        const p4 = project(gridSize * gridStep, 0, i * gridStep, camX, camY, camZ, width, height);
        if (p3 && p4) {
          ctx.beginPath();
          ctx.moveTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.stroke();
        }
      }

      // 2. Draw Stand-in Geometry or 3D Automotive Rig
      const currentModel = stagingModelRef.current;
      const currentColor = vehicleColorRef.current;

      if (currentModel === "actors") {
        const drawBox = (cx: number, cy: number, cz: number, w: number, h: number, d: number, color: string) => {
          const hw = w / 2;
          const hh = h;
          const hd = d / 2;

          const vertices = [
            [-hw, 0, -hd],
            [hw, 0, -hd],
            [hw, hh, -hd],
            [-hw, hh, -hd],
            [-hw, 0, hd],
            [hw, 0, hd],
            [hw, hh, hd],
            [-hw, hh, hd],
          ].map(([vx, vy, vz]) => project(cx + vx, cy + vy, cz + vz, camX, camY, camZ, width, height));

          if (vertices.some((v) => v === null)) return;

          // Draw wireframe + translucent faces
          ctx.fillStyle = color;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 1.5;

          // Front face (4, 5, 6, 7)
          ctx.beginPath();
          ctx.moveTo(vertices[4]!.x, vertices[4]!.y);
          ctx.lineTo(vertices[5]!.x, vertices[5]!.y);
          ctx.lineTo(vertices[6]!.x, vertices[6]!.y);
          ctx.lineTo(vertices[7]!.x, vertices[7]!.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Top face (3, 2, 6, 7)
          ctx.beginPath();
          ctx.moveTo(vertices[3]!.x, vertices[3]!.y);
          ctx.lineTo(vertices[2]!.x, vertices[2]!.y);
          ctx.lineTo(vertices[6]!.x, vertices[6]!.y);
          ctx.lineTo(vertices[7]!.x, vertices[7]!.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Connect back pillars
          ctx.beginPath();
          ctx.moveTo(vertices[0]!.x, vertices[0]!.y);
          ctx.lineTo(vertices[1]!.x, vertices[1]!.y);
          ctx.lineTo(vertices[2]!.x, vertices[2]!.y);
          ctx.lineTo(vertices[3]!.x, vertices[3]!.y);
          ctx.closePath();
          ctx.stroke();
        };

        // Stand-in Actor 1: Lead (Violet/Hotpink)
        drawBox(-1.8, 0, 0, 0.9, 1.8, 0.9, "rgba(236, 72, 153, 0.25)");

        // Stand-in Actor 2: Counterpart (Cyan)
        drawBox(1.8, 0, 0, 0.9, 1.8, 0.9, "rgba(6, 182, 212, 0.25)");
      } else {
        renderVehicle3D(ctx, width, height, {
          model: currentModel,
          color: currentColor,
          time,
          showTelemetry: true,
        });
      }

      // 3. Viewport HUD Overlays
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "10px monospace";
      ctx.fillText(`CAM ORBIT: [X: ${camX.toFixed(1)} Y: ${camY.toFixed(1)} Z: ${camZ.toFixed(1)}]`, 16, 24);
      ctx.fillText(`LENS: 35mm Prime · FOV: 50° · SHUTTER: 180°`, 16, 40);

      // Center crosshair
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.beginPath();
      ctx.moveTo(width / 2 - 12, height / 2);
      ctx.lineTo(width / 2 + 12, height / 2);
      ctx.moveTo(width / 2, height / 2 - 12);
      ctx.lineTo(width / 2, height / 2 + 12);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/workflows/previs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      setMessage("Previs scene queued successfully! ID: " + data.jobId);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage("Error: " + err.message);
      } else {
        setMessage("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-6 max-w-7xl mx-auto w-full gap-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary" />
            3D Previs & Spatial Blockout Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Pre-visualize staging, camera focal lengths, and actor blocking before initiating final AI renders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full">
            Local Spatial Viewport
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        {/* Form section */}
        <div className="w-full lg:w-1/3 p-5 bg-card/80 border border-border/40 backdrop-blur-xl rounded-2xl flex flex-col justify-between shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-foreground">
                Scene Script & Staging Prompt
              </label>
              <textarea
                className="w-full p-3 bg-background text-foreground text-xs rounded-xl border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary min-h-[160px] resize-none"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Describe scene blocking, lighting, and camera orbit..."
                required
              />
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-primary" />
                Spatial Rig / 3D Asset
              </label>
              <select
                className="w-full p-2.5 bg-background text-foreground text-xs rounded-xl border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary"
                value={stagingModel}
                onChange={(e) => {
                  const val = e.target.value as "actors" | "stradale" | "porsche_930" | "match_cut";
                  setStagingModel(val);
                  if (val === "stradale") setVehicleColor(VEHICLE_PRESETS.stradale.defaultColor);
                  else if (val === "porsche_930") setVehicleColor(VEHICLE_PRESETS.porsche_930.defaultColor);
                }}
              >
                <option value="stradale">1967 Alfa Romeo 33 Stradale (Utkarsh Pathrabe 3D)</option>
                <option value="porsche_930">1975 Porsche 911 (930) Turbo (Utkarsh Pathrabe 3D)</option>
                <option value="match_cut">Symmetrical Match-Cut: Stradale vs 930 Turbo</option>
                <option value="actors">Actors: Standard Graybox Cubes</option>
              </select>
            </div>

            {stagingModel !== "actors" && (
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-foreground">
                  Automotive Clearcoat Paint Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-border/40 cursor-pointer bg-transparent"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { name: "Rosso Corsa", color: "#c8102e" },
                      { name: "Guards Red", color: "#e11d48" },
                      { name: "Grand Prix White", color: "#f8fafc" },
                      { name: "Campagnolo Gold", color: "#d4af37" },
                      { name: "Nero Deep", color: "#18181b" },
                    ].map((p) => (
                      <button
                        type="button"
                        key={p.name}
                        onClick={() => setVehicleColor(p.color)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          vehicleColor.toLowerCase() === p.color.toLowerCase()
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block mb-1.5 text-xs font-semibold text-foreground">
                Target Composition Aspect Ratio
              </label>
              <select
                className="w-full p-2.5 bg-background text-foreground text-xs rounded-xl border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="16:9">16:9 (Cinematic Widescreen)</option>
                <option value="9:16">9:16 (Vertical Mobile Reel)</option>
                <option value="1:1">1:1 (Square Feed)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 px-4 rounded-xl text-xs font-semibold shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Queueing Scene..." : "Queue Spatial Previs"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {message && (
              <div className="p-3 bg-muted/60 border border-border/40 rounded-xl text-xs text-foreground/80 mt-1">
                {message}
              </div>
            )}
          </form>

          <div className="mt-6 pt-4 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clapperboard className="w-3.5 h-3.5 text-primary" />
              Director Gray-Box Mode
            </span>
            <span>$0 Compute</span>
          </div>
        </div>

        {/* 3D Canvas Viewport section */}
        <div className="w-full lg:w-2/3 min-h-[480px] bg-zinc-950 border border-border/40 rounded-2xl overflow-hidden relative shadow-inner flex flex-col">
          <canvas ref={canvasRef} className="w-full h-full flex-1" />

          {/* Viewport Floating Info Pill */}
          <div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-[10px] text-white/90 flex items-center gap-2 shadow-lg">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Interactive Real-Time Orbit Projection</span>
          </div>
        </div>
      </div>
    </div>
  );
}
