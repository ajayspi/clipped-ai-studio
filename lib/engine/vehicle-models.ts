/**
 * lib/engine/vehicle-models.ts
 * 
 * Utkarsh Pathrabe 3D Vehicle Showcase & Spatial Previs Engine.
 * Implements 3D geometric meshes, automotive clearcoat shaders, and telemetry
 * for the 1967 Alfa Romeo 33 Stradale and the 1975 Porsche 911 (930) Turbo.
 * Zero external dependencies: pure 3D perspective projection and canvas rendering.
 */

export interface VehicleSpec {
  id: string;
  name: string;
  year: number;
  engine: string;
  power: string;
  weight: string;
  topSpeed: string;
  maxRpm: number;
  maxBoostBar?: number;
  defaultColor: string;
  designer: string;
  signatureFeature: string;
  wheelStyle: string;
}

export const VEHICLE_PRESETS: Record<string, VehicleSpec> = {
  stradale: {
    id: "stradale",
    name: "Alfa Romeo 33 Stradale",
    year: 1967,
    engine: "2.0L V8 Naturally Aspirated",
    power: "230 hp @ 8,800 RPM",
    weight: "700 kg",
    topSpeed: "260 km/h (160 mph)",
    maxRpm: 9800,
    defaultColor: "#c8102e", // Rosso Corsa
    designer: "Franco Scaglione",
    signatureFeature: "Ultra-low aerodynamic curves & bubble cockpit canopy",
    wheelStyle: "Vintage Campagnolo Gold Alloy",
  },
  porsche_930: {
    id: "porsche_930",
    name: "Porsche 911 (930) Turbo",
    year: 1975,
    engine: "3.0L Turbocharged Flat-6",
    power: "260 hp @ 5,500 RPM",
    weight: "1,195 kg",
    topSpeed: "250 km/h (155 mph)",
    maxRpm: 7200,
    maxBoostBar: 1.25,
    defaultColor: "#e11d48", // Guards Red
    designer: "Ernst Fuhrmann / Ferdinand Porsche",
    signatureFeature: "Whale Tail spoiler with intercooler louvers & flared turbo hips",
    wheelStyle: "Classic 5-Spoke Fuchs Alloy",
  },
};

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
}

export interface BoxMesh3D {
  center: Point3D;
  size: Point3D;
  rotation?: Point3D;
  color: string;
  wireframeOnly?: boolean;
}

/**
 * Generates 3D box component primitives for Alfa Romeo 33 Stradale.
 */
export function createStradaleGeometry(color: string = "#c8102e"): BoxMesh3D[] {
  return [
    // Main fuselage aerodynamic hull
    { center: { x: 0, y: 0.34, z: 0 }, size: { x: 1.68, y: 0.44, z: 3.8 }, color },
    // Aerodynamic curving nose
    { center: { x: 0, y: 0.28, z: 1.55 }, size: { x: 1.45, y: 0.32, z: 1.1 }, color },
    // Alfa triangular shield grille
    { center: { x: 0, y: 0.22, z: 2.12 }, size: { x: 0.24, y: 0.28, z: 0.1 }, color: "#f1f5f9" },
    // Bubble cockpit canopy (dark tinted glass)
    { center: { x: 0, y: 0.62, z: 0.05 }, size: { x: 1.32, y: 0.46, z: 1.8 }, color: "rgba(15, 23, 42, 0.75)" },
    // Rear engine cowl & louvers
    { center: { x: 0, y: 0.42, z: -1.35 }, size: { x: 1.52, y: 0.36, z: 1.2 }, color },
    // Front left fender flare
    { center: { x: -0.84, y: 0.36, z: 1.15 }, size: { x: 0.28, y: 0.48, z: 0.95 }, color },
    // Front right fender flare
    { center: { x: 0.84, y: 0.36, z: 1.15 }, size: { x: 0.28, y: 0.48, z: 0.95 }, color },
    // Rear left hip fender flare
    { center: { x: -0.86, y: 0.38, z: -1.05 }, size: { x: 0.32, y: 0.52, z: 1.05 }, color },
    // Rear right hip fender flare
    { center: { x: 0.86, y: 0.38, z: -1.05 }, size: { x: 0.32, y: 0.52, z: 1.05 }, color },
    // Quad exhaust tips
    { center: { x: -0.22, y: 0.18, z: -1.95 }, size: { x: 0.18, y: 0.08, z: 0.2 }, color: "#e2e8f0" },
    { center: { x: 0.22, y: 0.18, z: -1.95 }, size: { x: 0.18, y: 0.08, z: 0.2 }, color: "#e2e8f0" },
  ];
}

/**
 * Generates 3D box component primitives for Porsche 911 (930) Turbo.
 */
export function createPorsche930Geometry(color: string = "#e11d48"): BoxMesh3D[] {
  return [
    // Main 911 monocoque chassis
    { center: { x: 0, y: 0.38, z: 0 }, size: { x: 1.64, y: 0.46, z: 3.9 }, color },
    // Sloping front hood
    { center: { x: 0, y: 0.38, z: 1.35 }, size: { x: 1.54, y: 0.26, z: 1.35 }, color },
    // Sloping fastback rear engine deck
    { center: { x: 0, y: 0.42, z: -1.35 }, size: { x: 1.62, y: 0.28, z: 1.25 }, color },
    // Cabin greenhouse glass
    { center: { x: 0, y: 0.76, z: -0.1 }, size: { x: 1.34, y: 0.54, z: 1.8 }, color: "rgba(17, 24, 39, 0.7)" },
    // Upright front left bug-eye headlamp
    { center: { x: -0.64, y: 0.58, z: 1.9 }, size: { x: 0.28, y: 0.28, z: 0.22 }, color: "#f8fafc" },
    // Upright front right bug-eye headlamp
    { center: { x: 0.64, y: 0.58, z: 1.9 }, size: { x: 0.28, y: 0.28, z: 0.22 }, color: "#f8fafc" },
    // Flared widebody rear left turbo hips
    { center: { x: -0.92, y: 0.46, z: -1.05 }, size: { x: 0.34, y: 0.52, z: 1.3 }, color },
    // Flared widebody rear right turbo hips
    { center: { x: 0.92, y: 0.46, z: -1.05 }, size: { x: 0.34, y: 0.52, z: 1.3 }, color },
    // THE ICONIC WHALE TAIL SPOILER
    { center: { x: 0, y: 0.72, z: -1.75 }, size: { x: 1.72, y: 0.1, z: 0.8 }, color: "#09090b" },
    // Intercooler louvered vent on spoiler
    { center: { x: 0, y: 0.77, z: -1.72 }, size: { x: 1.18, y: 0.04, z: 0.48 }, color: "#38bdf8" },
    // Front black accordion bumper
    { center: { x: 0, y: 0.24, z: 2.05 }, size: { x: 1.72, y: 0.16, z: 0.24 }, color: "#18181b" },
    // Rear black accordion bumper
    { center: { x: 0, y: 0.26, z: -2.02 }, size: { x: 1.82, y: 0.18, z: 0.26 }, color: "#18181b" },
  ];
}

/**
 * 3D Point Perspective Projection onto 2D Canvas Viewport.
 */
export function projectPoint3D(
  x: number,
  y: number,
  z: number,
  camX: number,
  camY: number,
  camZ: number,
  width: number,
  height: number,
  fov: number = 460
): ProjectedPoint | null {
  const dx = x - camX;
  const dy = y - camY;
  const dz = z - camZ;

  const angle = Math.atan2(camX, camZ);
  const rotX = dx * Math.cos(-angle) - dz * Math.sin(-angle);
  const rotZ = dx * Math.sin(-angle) + dz * Math.cos(-angle);

  if (rotZ <= 0.1) return null;

  const scale = fov / rotZ;
  return {
    x: width / 2 + rotX * scale,
    y: height / 2 - dy * scale,
    depth: rotZ,
  };
}

export interface RenderVehicleOptions {
  model: "stradale" | "porsche_930" | "match_cut";
  color?: string;
  camRadius?: number;
  camHeight?: number;
  time?: number;
  spinWheels?: boolean;
  showTelemetry?: boolean;
  rpm?: number;
  boostBar?: number;
  speedKmh?: number;
}

/**
 * Renders a full 3D vehicle or side-by-side match-cut on an HTML5 canvas context.
 */
export function renderVehicle3D(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: RenderVehicleOptions
) {
  const time = options.time || 0;
  const camRadius = options.camRadius || 9.2;
  const camHeight = options.camHeight || 3.4;
  const camX = Math.sin(time * 0.45) * camRadius;
  const camY = camHeight;
  const camZ = Math.cos(time * 0.45) * camRadius;

  const modelKey = options.model;

  // Helper to draw a single 3D Box primitive with perspective projection
  const draw3DBox = (box: BoxMesh3D, offsetX = 0, offsetZ = 0) => {
    const hw = box.size.x / 2;
    const hh = box.size.y;
    const hd = box.size.z / 2;
    const cx = box.center.x + offsetX;
    const cy = box.center.y;
    const cz = box.center.z + offsetZ;

    const corners: [number, number, number][] = [
      [-hw, 0, -hd],
      [hw, 0, -hd],
      [hw, hh, -hd],
      [-hw, hh, -hd],
      [-hw, 0, hd],
      [hw, 0, hd],
      [hw, hh, hd],
      [-hw, hh, hd],
    ];

    const projected = corners.map(([vx, vy, vz]) =>
      projectPoint3D(cx + vx, cy + vy, cz + vz, camX, camY, camZ, width, height)
    );

    if (projected.some((p) => p === null)) return;

    ctx.fillStyle = box.color;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1.2;

    // Front Face (4, 5, 6, 7)
    ctx.beginPath();
    ctx.moveTo(projected[4]!.x, projected[4]!.y);
    ctx.lineTo(projected[5]!.x, projected[5]!.y);
    ctx.lineTo(projected[6]!.x, projected[6]!.y);
    ctx.lineTo(projected[7]!.x, projected[7]!.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Top Face (3, 2, 6, 7)
    ctx.beginPath();
    ctx.moveTo(projected[3]!.x, projected[3]!.y);
    ctx.lineTo(projected[2]!.x, projected[2]!.y);
    ctx.lineTo(projected[6]!.x, projected[6]!.y);
    ctx.lineTo(projected[7]!.x, projected[7]!.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Side Face (1, 2, 6, 5)
    ctx.beginPath();
    ctx.moveTo(projected[1]!.x, projected[1]!.y);
    ctx.lineTo(projected[2]!.x, projected[2]!.y);
    ctx.lineTo(projected[6]!.x, projected[6]!.y);
    ctx.lineTo(projected[5]!.x, projected[5]!.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // Helper to draw rotating 3D wheels
  const drawWheel = (wx: number, wz: number, radius = 0.34, wheelColor = "#d4af37") => {
    const wheelCenter = projectPoint3D(wx, radius, wz, camX, camY, camZ, width, height);
    if (!wheelCenter) return;

    const wheelScale = 460 / wheelCenter.depth;
    const rPixels = radius * wheelScale;

    // Tire outer ring
    ctx.fillStyle = "#18181b";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(wheelCenter.x, wheelCenter.y, rPixels, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rim inner hub
    ctx.fillStyle = wheelColor;
    ctx.beginPath();
    ctx.arc(wheelCenter.x, wheelCenter.y, rPixels * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Rotating wheel spokes
    const spin = time * 8;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      ctx.beginPath();
      ctx.moveTo(wheelCenter.x, wheelCenter.y);
      ctx.lineTo(
        wheelCenter.x + Math.cos(a + spin) * rPixels * 0.6,
        wheelCenter.y + Math.sin(a + spin) * rPixels * 0.6
      );
      ctx.stroke();
    }
  };

  if (modelKey === "stradale") {
    const color = options.color || VEHICLE_PRESETS.stradale.defaultColor;
    const meshes = createStradaleGeometry(color);
    meshes.forEach((m) => draw3DBox(m));

    drawWheel(-0.84, 1.15, 0.32, "#d4af37"); // Front Left (Campagnolo gold)
    drawWheel(0.84, 1.15, 0.32, "#d4af37"); // Front Right
    drawWheel(-0.86, -1.05, 0.34, "#d4af37"); // Rear Left
    drawWheel(0.86, -1.05, 0.34, "#d4af37"); // Rear Right
  } else if (modelKey === "porsche_930") {
    const color = options.color || VEHICLE_PRESETS.porsche_930.defaultColor;
    const meshes = createPorsche930Geometry(color);
    meshes.forEach((m) => draw3DBox(m));

    drawWheel(-0.88, 1.15, 0.33, "#f1f5f9"); // Front Left (Fuchs Chrome/Black)
    drawWheel(0.88, 1.15, 0.33, "#f1f5f9"); // Front Right
    drawWheel(-0.92, -1.05, 0.35, "#f1f5f9"); // Rear Left (Widebody flare)
    drawWheel(0.92, -1.05, 0.35, "#f1f5f9"); // Rear Right
  } else if (modelKey === "match_cut") {
    // Symmetrical Split-Screen / Dual Staging: Stradale on left, Porsche 930 on right
    const stradaleMeshes = createStradaleGeometry(VEHICLE_PRESETS.stradale.defaultColor);
    stradaleMeshes.forEach((m) => draw3DBox(m, -2.5, 0));
    drawWheel(-2.5 - 0.84, 1.15, 0.32, "#d4af37");
    drawWheel(-2.5 + 0.84, 1.15, 0.32, "#d4af37");
    drawWheel(-2.5 - 0.86, -1.05, 0.34, "#d4af37");
    drawWheel(-2.5 + 0.86, -1.05, 0.34, "#d4af37");

    const porscheMeshes = createPorsche930Geometry(VEHICLE_PRESETS.porsche_930.defaultColor);
    porscheMeshes.forEach((m) => draw3DBox(m, 2.5, 0));
    drawWheel(2.5 - 0.88, 1.15, 0.33, "#f1f5f9");
    drawWheel(2.5 + 0.88, 1.15, 0.33, "#f1f5f9");
    drawWheel(2.5 - 0.92, -1.05, 0.35, "#f1f5f9");
    drawWheel(2.5 + 0.92, -1.05, 0.35, "#f1f5f9");
  }

  // Draw Real-time Telemetry HUD
  if (options.showTelemetry !== false) {
    renderTelemetryHUD(ctx, width, height, modelKey, options);
  }
}

/**
 * Telemetry HUD Overlay
 * Renders RPM dials, Turbo Boost gauges, and aero telemetry.
 */
function renderTelemetryHUD(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: "stradale" | "porsche_930" | "match_cut",
  options: RenderVehicleOptions
) {
  const time = options.time || 0;

  ctx.save();

  if (model === "stradale") {
    const spec = VEHICLE_PRESETS.stradale;
    const rpm = options.rpm || Math.round(4200 + Math.sin(time * 2.5) * 4500);

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.strokeStyle = "rgba(200, 16, 46, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(16, 16, 280, 84, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText(`${spec.name} (${spec.year})`, 28, 38);

    ctx.fillStyle = "#c8102e";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`${rpm.toLocaleString()} RPM`, 28, 62);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "10px monospace";
    ctx.fillText(`AERO: 700 KG · REDLINE: 9,800 RPM · SCAGLIONE`, 28, 80);
  } else if (model === "porsche_930") {
    const spec = VEHICLE_PRESETS.porsche_930;
    const boost = options.boostBar || (0.2 + (Math.sin(time * 2) * 0.5 + 0.5) * 1.05);

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(16, 16, 280, 84, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText(`${spec.name} (${spec.year})`, 28, 38);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`BOOST: ${boost.toFixed(2)} BAR`, 28, 62);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "10px monospace";
    ctx.fillText(`KKK TURBOCHARGER · 1,195 KG · THE WIDOWMAKER`, 28, 80);
  } else if (model === "match_cut") {
    // Symmetrical Dual Telemetry Header
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(width / 2 - 200, 16, 400, 48, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SYMMETRICAL TELEMETRY MATCH-CUT", width / 2, 34);

    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText("1967 STRADALE (700 KG NA)  vs  1975 930 TURBO (1.25 BAR)", width / 2, 48);
    ctx.textAlign = "start";
  }

  ctx.restore();
}
