// liquidbg.ts — "Liquid Plasma" background
// Warped FBM noise + metaball energy field
// Palette: Deep Void → Electric Violet → Cyber Blue
// Ultra-smooth, organic, cinematic

export function initLiquidBackground() {
  const canvas = document.createElement('canvas');
  canvas.className = 'liquid-bg-canvas';
  document.body.prepend(canvas);

  const gl = canvas.getContext('webgl');
  if (!gl) {
    console.warn('WebGL unavailable');
    return;
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // perf cap
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener('resize', resize);

  const vsSource = `
    attribute vec2 aPosition;
    void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
  `;

  const fsSource = `
    precision highp float;
    uniform vec2  uRes;
    uniform float uTime;

    // ── Noise primitives ──
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 rot = mat2(0.8, 0.6, -0.6, 0.8); // domain rotation for variety
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
      }
      return v;
    }

    // ── Smooth min (metaball blend) ──
    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / uRes.y;
      vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

      float t = uTime * 0.08; // ultra slow drift

      // ── Warped domain (gives organic plasma feel) ──
      float warp1 = fbm(p * 2.5 + vec2(t * 0.7, t * 0.3));
      float warp2 = fbm(p * 2.5 - vec2(t * 0.4, t * 0.6));
      vec2 warped = p + 0.3 * vec2(warp1, warp2);

      // ── Metaball energy field ──
      vec2 b1 = vec2(sin(t * 1.1) * 0.4,  cos(t * 0.7) * 0.35);
      vec2 b2 = vec2(cos(t * 0.8) * 0.45, sin(t * 1.2) * 0.30);
      vec2 b3 = vec2(sin(t * 0.6 + 2.5) * 0.35, cos(t * 1.0 + 1.5) * 0.40);
      vec2 b4 = vec2(cos(t * 1.3 + 4.0) * 0.30, sin(t * 0.5 + 3.0) * 0.35);
      vec2 b5 = vec2(sin(t * 0.9 + 5.0) * 0.28, cos(t * 0.6 + 0.5) * 0.42);

      float d1 = length(warped - b1) - 0.22;
      float d2 = length(warped - b2) - 0.26;
      float d3 = length(warped - b3) - 0.19;
      float d4 = length(warped - b4) - 0.24;
      float d5 = length(warped - b5) - 0.20;

      float k = 0.55; // very soft blend
      float d = d1;
      d = smin(d, d2, k);
      d = smin(d, d3, k);
      d = smin(d, d4, k);
      d = smin(d, d5, k);

      // ── Palette: Deep Void → Electric Violet → Cyber Blue ──
      vec3 deepVoid     = vec3(0.059, 0.047, 0.161);  // #0f0c29
      vec3 midViolet    = vec3(0.188, 0.169, 0.388);  // #302b63
      vec3 cyberBlue    = vec3(0.141, 0.141, 0.243);  // #24243e
      vec3 neonViolet   = vec3(0.698, 0.286, 0.973);  // #b249f8
      vec3 electricCyan = vec3(0.310, 0.941, 1.000);  // #4ff0ff
      vec3 warmGlow     = vec3(0.95, 0.55, 0.90);     // pink-violet highlight

      // Energy field bands
      float core   = 1.0 - smoothstep(-0.08, 0.12, d);
      float halo   = 1.0 - smoothstep(-0.02, 0.35, d);
      float aura   = 1.0 - smoothstep(0.05,  0.65, d);

      // Proximity weighting for color
      float cyanWeight =
        (0.22 / max(length(warped - b1), 0.01)) +
        (0.19 / max(length(warped - b3), 0.01));
      float violetWeight =
        (0.26 / max(length(warped - b2), 0.01)) +
        (0.24 / max(length(warped - b4), 0.01)) +
        (0.20 / max(length(warped - b5), 0.01));
      float cmix = cyanWeight / (cyanWeight + violetWeight + 0.001);

      vec3 orbColor = mix(neonViolet, electricCyan, cmix);

      // ── Background: FBM-driven gradient ──
      float bgNoise = fbm(p * 1.8 + vec2(t * 0.2, -t * 0.15));
      vec3 bg = mix(deepVoid, midViolet, bgNoise * 0.6);
      bg = mix(bg, cyberBlue, smoothstep(0.3, 0.7, bgNoise) * 0.4);

      // ── Composite ──
      vec3 color = bg;
      color = mix(color, midViolet * 1.5, aura * 0.5);
      color = mix(color, orbColor * 0.7, halo * 0.6);
      color = mix(color, orbColor, core * 0.85);
      color += warmGlow * core * core * 0.12; // hot center bloom

      // Subtle scanline texture (very faint)
      float scan = 0.98 + 0.02 * sin(gl_FragCoord.y * 1.5);
      color *= scan;

      // Vignette
      float vig = 1.0 - smoothstep(0.3, 1.2, length((uv - 0.5) * 1.9));
      color *= mix(0.35, 1.0, vig);

      // Floor
      color = max(color, deepVoid * 0.4);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  };

  const vs = compile(gl.VERTEX_SHADER, vsSource);
  const fs = compile(gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1
  ]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'aPosition');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes  = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');

  const t0 = performance.now();
  let raf: number;

  const render = () => {
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (performance.now() - t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    raf = requestAnimationFrame(render);
  };
  render();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.deleteBuffer(buf);
  };
}
