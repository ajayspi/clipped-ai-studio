// lib/engine/2d-studio/filters/displacement.ts
// Liquid & Fluid Normal Map Displacement Compositor (WebGL2)
// Creates procedural fluid ripples, bathtub water triage distortion, and heat shimmers
// directly on the GPU without requiring external image assets.

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
uniform float uTime;
uniform float uScale;       // Ripple frequency
uniform float uSpeed;       // Flow velocity
uniform float uAmplitude;   // Refraction strength
uniform vec2 uDirection;    // Drift vector
uniform float uCaustics;    // Light caustic intensity on wave crests

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 3; ++i) {
    v += a * valueNoise(p);
    p = rot * p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 flow = uDirection * uTime * uSpeed;
  vec2 coord = uv * uScale + flow;

  float n1 = fbm(coord);
  float n2 = fbm(coord + vec2(5.2, 1.3));

  vec2 normal = vec2(
    fbm(coord + vec2(0.05, 0.0)) - n1,
    fbm(coord + vec2(0.0, 0.05)) - n1
  );

  vec2 displacedUv = uv + normal * uAmplitude;
  displacedUv = clamp(displacedUv, 0.0, 1.0);

  vec3 col = texture(uTex, displacedUv).rgb;

  if (uCaustics > 0.001) {
    float caustic = pow(clamp(n1 * n2 * 2.2, 0.0, 1.0), 3.5);
    col += caustic * uCaustics * vec3(0.7, 0.9, 1.0);
  }

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export interface DisplacementOptions {
  time?: number;
  scale?: number;
  speed?: number;
  amplitude?: number;
  direction?: [number, number];
  caustics?: number;
}

export class DisplacementFilter {
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
        console.error('DisplacementFilter Shader compile error:', gl.getShaderInfoLog(s));
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

  render(sourceCanvas: HTMLCanvasElement, targetCanvas: HTMLCanvasElement, options: DisplacementOptions = {}): void {
    const gl = this.gl;
    if (!gl || !this.program) {
      const targetCtx = targetCanvas.getContext('2d');
      if (targetCtx) targetCtx.drawImage(sourceCanvas, 0, 0);
      return;
    }

    const {
      time = 0.0,
      scale = 4.0,
      speed = 0.5,
      amplitude = 0.025,
      direction = [0.7, 0.7],
      caustics = 0.25
    } = options;

    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.program);

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    gl.uniform2f(gl.getUniformLocation(this.program, 'uRes'), this.width, this.height);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uTime'), time);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uScale'), scale);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uSpeed'), speed);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uAmplitude'), amplitude);
    gl.uniform2f(gl.getUniformLocation(this.program, 'uDirection'), direction[0], direction[1]);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uCaustics'), caustics);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const targetCtx = targetCanvas.getContext('2d');
    if (targetCtx && this.canvas) {
      targetCtx.drawImage(this.canvas, 0, 0);
    }
  }
}
