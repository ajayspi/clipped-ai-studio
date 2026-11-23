// lib/engine/2d-studio/filters/crt-surveillance.ts
// Surveillance CCTV & Analog CRT Compositor (WebGL2)
// Simulates CCTV camera sensors: barrel curvature, raster scanlines, RGB chromatic split,
// phosphor noise, analog flicker, and edge vignette.

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
uniform float uCurvature;         // Barrel lens distortion (0.0 = flat, 0.15 = security fisheye)
uniform float uScanlineDensity;   // Frequency of horizontal scanlines
uniform float uScanlineStrength;  // Darkness of scanline gaps (0.0..1.0)
uniform float uChromaOffset;      // RGB channel separation distance
uniform float uNoiseStrength;     // High-frequency sensor grain
uniform float uVignette;          // Corner darkening strength (0.0..1.0)
uniform float uMonochrome;        // 0.0 = full color, 1.0 = surveillance B&W / green tint
uniform vec3 uTint;               // Color tint multiplier (e.g. green phosphor vec3(0.7, 1.0, 0.75))

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

vec2 barrelDistort(vec2 uv, float k) {
  if (k <= 0.001) return uv;
  vec2 coord = uv * 2.0 - 1.0;
  coord.x *= uRes.x / uRes.y;
  float r2 = dot(coord, coord);
  coord *= 1.0 + k * r2;
  coord.x *= uRes.y / uRes.x;
  return coord * 0.5 + 0.5;
}

void main() {
  vec2 uv = barrelDistort(vUv, uCurvature);

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float rOffset = uChromaOffset * (1.0 + 0.2 * sin(uTime * 3.0));
  float r = texture(uTex, uv + vec2(rOffset, 0.0)).r;
  float g = texture(uTex, uv).g;
  float b = texture(uTex, uv - vec2(rOffset, 0.0)).b;
  vec3 col = vec3(r, g, b);

  float scanline = sin((uv.y + uTime * 0.05) * uRes.y * uScanlineDensity);
  scanline = 0.5 + 0.5 * scanline;
  col *= mix(1.0, scanline, uScanlineStrength);

  float noise = (hash(uv * uRes + uTime * 60.0) - 0.5) * uNoiseStrength;
  col += vec3(noise);

  vec2 vigCoord = uv * (1.0 - uv.yx);
  float vig = vigCoord.x * vigCoord.y * 16.0;
  vig = clamp(pow(vig, mix(0.1, 0.45, uVignette)), 0.0, 1.0);
  col *= vig;

  if (uMonochrome > 0.01) {
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 mono = lum * uTint;
    col = mix(col, mono, uMonochrome);
  }

  col = clamp(col, 0.0, 1.0);
  fragColor = vec4(col, 1.0);
}
`;

export interface CRTOptions {
  time?: number;
  curvature?: number;
  scanlineDensity?: number;
  scanlineStrength?: number;
  chromaOffset?: number;
  noiseStrength?: number;
  vignette?: number;
  monochrome?: number;
  tint?: [number, number, number];
}

export class CRTFilter {
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
        console.error('CRTFilter Shader compile error:', gl.getShaderInfoLog(s));
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

  render(sourceCanvas: HTMLCanvasElement, targetCanvas: HTMLCanvasElement, options: CRTOptions = {}): void {
    const gl = this.gl;
    if (!gl || !this.program) {
      const targetCtx = targetCanvas.getContext('2d');
      if (targetCtx) targetCtx.drawImage(sourceCanvas, 0, 0);
      return;
    }

    const {
      time = 0.0,
      curvature = 0.08,
      scanlineDensity = 0.75,
      scanlineStrength = 0.35,
      chromaOffset = 0.0035,
      noiseStrength = 0.08,
      vignette = 0.4,
      monochrome = 0.0,
      tint = [0.85, 1.0, 0.85]
    } = options;

    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.program);

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    gl.uniform2f(gl.getUniformLocation(this.program, 'uRes'), this.width, this.height);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uTime'), time);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uCurvature'), curvature);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uScanlineDensity'), scanlineDensity);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uScanlineStrength'), scanlineStrength);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uChromaOffset'), chromaOffset);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uNoiseStrength'), noiseStrength);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uVignette'), vignette);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uMonochrome'), monochrome);
    gl.uniform3f(gl.getUniformLocation(this.program, 'uTint'), tint[0], tint[1], tint[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const targetCtx = targetCanvas.getContext('2d');
    if (targetCtx && this.canvas) {
      targetCtx.drawImage(this.canvas, 0, 0);
    }
  }
}
