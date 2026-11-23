// lib/engine/2d-studio/filters/woodblock.ts
// Woodcut & Japanese Woodblock Compositor (WebGL2)
// Simulates carved woodblock printing: ragged knife-edge boundaries,
// horizontal cherry-wood grain streaks, laid paper fibers, and uneven ink pull.

export const WOODBLOCK_PALETTE = {
  ink: [18, 16, 22] as [number, number, number],
  paper: [248, 243, 230] as [number, number, number],
  accent: [195, 65, 50] as [number, number, number]
};

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
uniform float uSeed;
uniform float uEdge;      // Ragged knife edge roughness (0..2.0)
uniform float uGrain;     // Wood grain streak strength (0..1.0)
uniform vec3 uInkColor;
uniform vec3 uPaperColor;

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
  for (int i = 0; i < 4; i++) {
    v += a * valueNoise(p);
    p = p * 2.05 + 17.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = vUv;

  vec2 woodCoord = vec2(px.x * 0.05, px.y * 0.8) + uSeed * 3.1;
  float woodGrain = fbm(woodCoord) * uGrain;

  float knifeRough = (fbm(px * 0.15) - 0.5) * (uEdge * 0.015);
  vec2 warpedUv = uv + vec2(knifeRough, knifeRough * 0.5);

  vec4 src = texture(uTex, clamp(warpedUv, 0.0, 1.0));
  float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));

  float threshold = 0.5 + (woodGrain - 0.5) * 0.2;
  float inkMask = smoothstep(threshold - 0.08, threshold + 0.08, 1.0 - lum);

  vec3 col = mix(uPaperColor, uInkColor, inkMask);

  float paperFibers = (hash21(px + uSeed) - 0.5) * 0.04;
  col += vec3(paperFibers);

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export interface WoodblockOptions {
  seed?: number;
  edge?: number;
  grain?: number;
  inkColor?: [number, number, number];
  paperColor?: [number, number, number];
}

export class WoodblockFilter {
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
        console.error('WoodblockFilter Shader compile error:', gl.getShaderInfoLog(s));
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

  render(sourceCanvas: HTMLCanvasElement, targetCanvas: HTMLCanvasElement, options: WoodblockOptions = {}): void {
    const gl = this.gl;
    if (!gl || !this.program) {
      const targetCtx = targetCanvas.getContext('2d');
      if (targetCtx) targetCtx.drawImage(sourceCanvas, 0, 0);
      return;
    }

    const {
      seed = 0.0,
      edge = 0.8,
      grain = 0.5,
      inkColor = [0.07, 0.06, 0.08],
      paperColor = [0.97, 0.95, 0.9]
    } = options;

    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.program);

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    gl.uniform2f(gl.getUniformLocation(this.program, 'uRes'), this.width, this.height);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uSeed'), seed);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uEdge'), edge);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uGrain'), grain);
    gl.uniform3f(gl.getUniformLocation(this.program, 'uInkColor'), inkColor[0], inkColor[1], inkColor[2]);
    gl.uniform3f(gl.getUniformLocation(this.program, 'uPaperColor'), paperColor[0], paperColor[1], paperColor[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const targetCtx = targetCanvas.getContext('2d');
    if (targetCtx && this.canvas) {
      targetCtx.drawImage(this.canvas, 0, 0);
    }
  }
}
