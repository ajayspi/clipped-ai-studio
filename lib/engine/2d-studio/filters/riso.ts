// lib/engine/2d-studio/filters/riso.ts
// Physical Risograph Spot-Ink Compositor (WebGL2)
// Simulates 3-drum spot ink printing (Federal Blue, Yellow, Fluorescent Pink)
// with plate misregistration, rotated halftone dot screens, and roller ink grain.

export const RISO_INK = {
  blue: [0, 120, 191] as [number, number, number],
  yellow: [255, 232, 0] as [number, number, number],
  pink: [255, 72, 176] as [number, number, number],
  black: [24, 24, 30] as [number, number, number]
};
export const RISO_PAPER = [246, 241, 230] as [number, number, number];

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
uniform vec2 uOff[3];      // Plate misregistration offsets (px)
uniform float uAng[3];     // Halftone dot screen angles (rad)
uniform vec3 uInk[3];      // Spot ink colors (0..1)
uniform vec3 uPaper;       // Paper color (0..1)
uniform float uSeed;       // Animation seed for boiling ink grain
uniform float uPeriod;     // Halftone dot period in pixels
uniform float uGrain;      // Ink pinhole grain strength (0..1)

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

mat2 rotate2d(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float halftone(vec2 px, float angle, float period, float density) {
  vec2 rotPx = rotate2d(angle) * px;
  vec2 grid = fract(rotPx / period) - 0.5;
  float dist = length(grid);
  float radius = sqrt(clamp(density, 0.0, 1.0)) * 0.58;
  return smoothstep(radius + 0.08, radius - 0.08, dist);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec3 composite = uPaper;

  for (int i = 0; i < 3; i++) {
    vec2 plateUv = vUv + uOff[i] / uRes;
    plateUv = clamp(plateUv, 0.0, 1.0);
    vec4 src = texture(uTex, plateUv);

    float channelDensity = 0.0;
    if (i == 0) channelDensity = 1.0 - src.b;
    else if (i == 1) channelDensity = 1.0 - src.r;
    else if (i == 2) channelDensity = 1.0 - src.g;

    float pinhole = hash21(px + float(i) * 31.7 + uSeed * 13.0);
    if (pinhole < uGrain * 0.15) {
      channelDensity *= 0.5;
    }

    float dotVal = halftone(px, uAng[i], uPeriod, channelDensity);
    composite = mix(composite, composite * uInk[i], dotVal);
  }

  fragColor = vec4(clamp(composite, 0.0, 1.0), 1.0);
}
`;

export interface RisoOptions {
  period?: number;
  seed?: number;
  grain?: number;
  offsets?: [[number, number], [number, number], [number, number]];
  angles?: [number, number, number];
  inks?: [[number, number, number], [number, number, number], [number, number, number]];
  paper?: [number, number, number];
}

export class RisoFilter {
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
        console.error('RisoFilter Shader compile error:', gl.getShaderInfoLog(s));
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

  render(sourceCanvas: HTMLCanvasElement, targetCanvas: HTMLCanvasElement, options: RisoOptions = {}): void {
    const gl = this.gl;
    if (!gl || !this.program) {
      const targetCtx = targetCanvas.getContext('2d');
      if (targetCtx) targetCtx.drawImage(sourceCanvas, 0, 0);
      return;
    }

    const {
      period = 5.0,
      seed = 0.0,
      grain = 0.15,
      offsets = [[-1.5, 0.5], [1.0, -1.0], [0.0, 1.5]],
      angles = [0.26, 1.31, 0.78],
      inks = [
        [0.0, 0.47, 0.75],
        [1.0, 0.91, 0.0],
        [1.0, 0.28, 0.69]
      ],
      paper = [0.965, 0.945, 0.902]
    } = options;

    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.program);

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    gl.uniform2f(gl.getUniformLocation(this.program, 'uRes'), this.width, this.height);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uPeriod'), period);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uSeed'), seed);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uGrain'), grain);

    const offFlat = new Float32Array([offsets[0][0], offsets[0][1], offsets[1][0], offsets[1][1], offsets[2][0], offsets[2][1]]);
    gl.uniform2fv(gl.getUniformLocation(this.program, 'uOff'), offFlat);
    gl.uniform1fv(gl.getUniformLocation(this.program, 'uAng'), new Float32Array(angles));

    const inkFlat = new Float32Array([
      inks[0][0], inks[0][1], inks[0][2],
      inks[1][0], inks[1][1], inks[1][2],
      inks[2][0], inks[2][1], inks[2][2]
    ]);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uInk'), inkFlat);
    gl.uniform3f(gl.getUniformLocation(this.program, 'uPaper'), paper[0], paper[1], paper[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const targetCtx = targetCanvas.getContext('2d');
    if (targetCtx && this.canvas) {
      targetCtx.drawImage(this.canvas, 0, 0);
    }
  }
}
