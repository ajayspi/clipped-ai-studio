// lib/engine/2d-studio/filters/shockwave.ts
// Acoustic Shockwave & Blast Refraction Compositor (WebGL2)
// Creates a radial refractive displacement wave linked to audio transients (explosions,
// door breaches, heavy bass drops), warping the underlying scene with chromatic fringe.

const VS = `#version 300 es
in vec2 position;
out vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uCenter;       // Normalized impact center (0..1, 0..1)
uniform float uProgress;    // Shockwave progress (0.0 = impact, 1.0 = dissipated)
uniform float uMaxRadius;   // Max radius reached by shockwave
uniform float uThickness;   // Width of the compression ring
uniform float uRefract;     // Peak refractive displacement strength
uniform float uChroma;      // Chromatic RGB dispersion

void main() {
  vec2 uv = vUv;

  vec2 delta = (uv - uCenter) * vec2(uRes.x / uRes.y, 1.0);
  float dist = length(delta);

  float currentRadius = uProgress * uMaxRadius;
  float halfThick = uThickness * 0.5;

  float diff = dist - currentRadius;
  float inWave = step(-halfThick, diff) * step(diff, halfThick);

  vec2 displacedUv = uv;

  if (inWave > 0.0 && uProgress < 0.99) {
    float wavePhase = diff / halfThick;
    float displacementFactor = sin(wavePhase * 3.14159265);
    float decay = (1.0 - uProgress) * (1.0 - uProgress);
    float force = displacementFactor * uRefract * decay;

    vec2 dir = normalize(delta);
    dir.x *= uRes.y / uRes.x;
    displacedUv = uv - dir * force;
  }

  float chromaDist = uChroma * (1.0 - uProgress) * inWave;
  vec2 normDir = length(delta) > 0.0001 ? normalize(delta) : vec2(0.0);
  normDir.x *= uRes.y / uRes.x;

  float r = texture(uTex, displacedUv + normDir * chromaDist).r;
  float g = texture(uTex, displacedUv).g;
  float b = texture(uTex, displacedUv - normDir * chromaDist).b;

  vec3 col = vec3(r, g, b);

  if (inWave > 0.0) {
    float highlight = pow(clamp(1.0 - abs(diff) / halfThick, 0.0, 1.0), 3.0);
    col += highlight * 0.15 * (1.0 - uProgress);
  }

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export interface ShockwaveOptions {
  center?: [number, number];
  progress?: number;
  maxRadius?: number;
  thickness?: number;
  refract?: number;
  chroma?: number;
}

export class ShockwaveFilter {
  width: number;
  height: number;
  canvas: HTMLCanvasElement | null = null;
  gl: WebGL2RenderingContext | null = null;
  program: WebGLProgram | null = null;
  tex: WebGLTexture | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl = this.canvas.getContext('webgl2', { alpha: false, depth: false, antialias: false });
      this.initGL();
    }
  }

  private initGL(): void {
    const gl = this.gl;
    if (!gl) return;

    const compile = (type: number, src: string): WebGLShader | null => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('ShockwaveFilter Shader compile error:', gl.getShaderInfoLog(s));
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, VS);
    const fs = compile(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    this.program = program;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  render(sourceCanvas: HTMLCanvasElement, targetCanvas: HTMLCanvasElement, options: ShockwaveOptions = {}): void {
    const gl = this.gl;
    if (!gl || !this.program) {
      const targetCtx = targetCanvas.getContext('2d');
      if (targetCtx) targetCtx.drawImage(sourceCanvas, 0, 0);
      return;
    }

    const {
      center = [0.5, 0.5],
      progress = 0.0,
      maxRadius = 1.25,
      thickness = 0.12,
      refract = 0.06,
      chroma = 0.02
    } = options;

    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.program);

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    gl.uniform2f(gl.getUniformLocation(this.program, 'uRes'), this.width, this.height);
    gl.uniform2f(gl.getUniformLocation(this.program, 'uCenter'), center[0], center[1]);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uProgress'), progress);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uMaxRadius'), maxRadius);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uThickness'), thickness);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uRefract'), refract);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uChroma'), chroma);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const targetCtx = targetCanvas.getContext('2d');
    if (targetCtx && this.canvas) {
      targetCtx.drawImage(this.canvas, 0, 0);
    }
  }
}
