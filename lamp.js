(() => {
  const canvas = document.getElementById("lamp");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false, powerPreference: "low-power" });
  if (!gl) {
    canvas.remove();
    return;
  }

  // Units: CSS pixels and seconds.
  const AREA_PER_BOID = 2200;
  const MAX_BOIDS = 1200;
  const PERCEPTION = 64;
  const SEPARATION_RADIUS = 22;
  const ALIGNMENT = 1.6;
  const COHESION = 0.55;
  const SEPARATION = 260;
  const MIN_SPEED = 38;
  const MAX_SPEED = 78;
  const POINTER_RADIUS = 110;
  const POINTER_PUSH = 900;
  const BOID_LENGTH = 10;
  const BOID_HALF_WIDTH = 3.5;
  const WARMUP_STEPS = 300;
  const CLEAR_PAD_X = 16;
  const CLEAR_PAD_Y = 6;
  const CLEAR_BLUR = 22;
  const CLEAR_DIM = 0.88;

  // ANSI red, green, yellow, blue, magenta, cyan. Boids flock with their own color only.
  const HUES = ["#cd3131", "#0dbc79", "#e5e510", "#2472c8", "#bc3fbc", "#11a8cd"];

  const VERT = `
attribute vec2 pos;
attribute vec3 color;
uniform vec2 view;
varying vec3 vColor;
void main() {
  vColor = color;
  vec2 p = pos / view * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
}`;

  const FRAG = `
precision mediump float;
uniform sampler2D mask;
uniform vec2 res;
uniform float dim;
varying vec3 vColor;
void main() {
  float clear = min(texture2D(mask, gl_FragCoord.xy / res).g * 2.2, 1.0);
  gl_FragColor = vec4(vColor * (1.0 - dim * clear), 1.0);
}`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const aPos = gl.getAttribLocation(prog, "pos");
  const aColor = gl.getAttribLocation(prog, "color");
  const U = {};
  for (const n of ["view", "mask", "res", "dim"]) U[n] = gl.getUniformLocation(prog, n);

  const posBuf = gl.createBuffer();
  const colBuf = gl.createBuffer();
  const maskTex = gl.createTexture();
  const maskCanvas = document.createElement("canvas");

  let N = 0, W = 0, H = 0;
  let px, py, vx, vy, ax, ay, kind, verts;
  let cols = 0, rows = 0, cellW = 0, cellH = 0, cellStart, cellItems, cellOf;
  let pointer = null;

  function build() {
    W = innerWidth;
    H = innerHeight;
    N = Math.min(MAX_BOIDS, Math.round((W * H) / AREA_PER_BOID));
    px = new Float32Array(N);
    py = new Float32Array(N);
    vx = new Float32Array(N);
    vy = new Float32Array(N);
    ax = new Float32Array(N);
    ay = new Float32Array(N);
    kind = new Uint8Array(N);
    verts = new Float32Array(N * 6);
    const colors = new Float32Array(N * 9);
    for (let i = 0; i < N; i++) {
      px[i] = Math.random() * W;
      py[i] = Math.random() * H;
      const a = Math.random() * Math.PI * 2;
      const s = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      vx[i] = Math.cos(a) * s;
      vy[i] = Math.sin(a) * s;
      kind[i] = i % HUES.length;
      const hex = parseInt(HUES[kind[i]].slice(1), 16);
      for (let k = 0; k < 3; k++) {
        colors[i * 9 + k * 3] = ((hex >> 16) & 255) / 255;
        colors[i * 9 + k * 3 + 1] = ((hex >> 8) & 255) / 255;
        colors[i * 9 + k * 3 + 2] = (hex & 255) / 255;
      }
    }

    cols = Math.max(3, Math.floor(W / PERCEPTION));
    rows = Math.max(3, Math.floor(H / PERCEPTION));
    cellW = W / cols;
    cellH = H / rows;
    cellStart = new Int32Array(cols * rows + 1);
    cellItems = new Int32Array(N);
    cellOf = new Int32Array(N);

    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    for (let i = 0; i < WARMUP_STEPS; i++) stepSim(0.033);
  }

  function stepSim(dt) {
    const nCells = cols * rows;
    cellStart.fill(0);
    for (let i = 0; i < N; i++) {
      const cx = Math.min(cols - 1, Math.floor(px[i] / cellW));
      const cy = Math.min(rows - 1, Math.floor(py[i] / cellH));
      const c = cy * cols + cx;
      cellOf[i] = c;
      cellStart[c + 1]++;
    }
    for (let c = 0; c < nCells; c++) cellStart[c + 1] += cellStart[c];
    const fill = cellStart.slice(0, nCells);
    for (let i = 0; i < N; i++) cellItems[fill[cellOf[i]]++] = i;

    const per2 = PERCEPTION * PERCEPTION;
    const halfW = W / 2, halfH = H / 2;
    for (let i = 0; i < N; i++) {
      const xi = px[i], yi = py[i], ki = kind[i];
      const cx = cellOf[i] % cols, cy = (cellOf[i] - cx) / cols;
      let sx = 0, sy = 0, mvx = 0, mvy = 0, mx = 0, my = 0, n = 0;
      for (let oy = -1; oy <= 1; oy++) {
        const ny = (cy + oy + rows) % rows;
        for (let ox = -1; ox <= 1; ox++) {
          const c = ny * cols + ((cx + ox + cols) % cols);
          for (let k = cellStart[c]; k < cellStart[c + 1]; k++) {
            const j = cellItems[k];
            if (j === i) continue;
            let dx = px[j] - xi, dy = py[j] - yi;
            if (dx > halfW) dx -= W; else if (dx < -halfW) dx += W;
            if (dy > halfH) dy -= H; else if (dy < -halfH) dy += H;
            const d2 = dx * dx + dy * dy;
            if (d2 > per2 || d2 < 1e-6) continue;
            const d = Math.sqrt(d2);
            if (d < SEPARATION_RADIUS) {
              const f = 1 - d / SEPARATION_RADIUS;
              sx -= (dx / d) * f;
              sy -= (dy / d) * f;
            }
            if (kind[j] === ki) {
              mvx += vx[j];
              mvy += vy[j];
              mx += dx;
              my += dy;
              n++;
            }
          }
        }
      }
      let fx = sx * SEPARATION, fy = sy * SEPARATION;
      if (n > 0) {
        fx += (mvx / n - vx[i]) * ALIGNMENT + (mx / n) * COHESION;
        fy += (mvy / n - vy[i]) * ALIGNMENT + (my / n) * COHESION;
      }
      if (pointer) {
        const dx = xi - pointer.x, dy = yi - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < POINTER_RADIUS * POINTER_RADIUS && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const f = POINTER_PUSH * (1 - d / POINTER_RADIUS);
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        }
      }
      ax[i] = fx;
      ay[i] = fy;
    }

    for (let i = 0; i < N; i++) {
      let u = vx[i] + ax[i] * dt, v = vy[i] + ay[i] * dt;
      const s = Math.sqrt(u * u + v * v) || 1e-6;
      const t = Math.min(MAX_SPEED, Math.max(MIN_SPEED, s)) / s;
      u *= t;
      v *= t;
      vx[i] = u;
      vy[i] = v;
      let x = px[i] + u * dt, y = py[i] + v * dt;
      x -= Math.floor(x / W) * W;
      y -= Math.floor(y / H) * H;
      px[i] = x;
      py[i] = y;
    }
  }

  function drawMask() {
    const MW = Math.max(2, Math.round(innerWidth / 2));
    const MH = Math.max(2, Math.round(innerHeight / 2));
    maskCanvas.width = MW;
    maskCanvas.height = MH;
    const ctx = maskCanvas.getContext("2d");
    const sx = MW / innerWidth, sy = MH / innerHeight;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, MW, MH);
    ctx.globalCompositeOperation = "lighter";

    const FAR = 20000;
    ctx.fillStyle = "#0f0";
    ctx.shadowColor = "#0f0";
    ctx.shadowBlur = CLEAR_BLUR * sx;
    ctx.shadowOffsetX = FAR;
    const range = document.createRange();
    for (const el of document.querySelectorAll("[data-clear]")) {
      range.selectNodeContents(el);
      for (const r of range.getClientRects()) {
        if (r.bottom < -CLEAR_BLUR * 2 || r.top > innerHeight + CLEAR_BLUR * 2 || r.width === 0) continue;
        ctx.beginPath();
        ctx.rect((r.left - CLEAR_PAD_X) * sx - FAR, (r.top - CLEAR_PAD_Y) * sy,
          (r.width + 2 * CLEAR_PAD_X) * sx, (r.height + 2 * CLEAR_PAD_Y) * sy);
        ctx.fill();
      }
    }

    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  function draw() {
    for (let i = 0; i < N; i++) {
      const s = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]) || 1;
      const dx = vx[i] / s, dy = vy[i] / s;
      const x = px[i], y = py[i];
      const bx = x - dx * BOID_LENGTH * 0.4, by = y - dy * BOID_LENGTH * 0.4;
      const o = i * 6;
      verts[o] = x + dx * BOID_LENGTH * 0.6;
      verts[o + 1] = y + dy * BOID_LENGTH * 0.6;
      verts[o + 2] = bx - dy * BOID_HALF_WIDTH;
      verts[o + 3] = by + dx * BOID_HALF_WIDTH;
      verts[o + 4] = bx + dy * BOID_HALF_WIDTH;
      verts[o + 5] = by - dx * BOID_HALF_WIDTH;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.024, 0.02, 0.05, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
    gl.uniform2f(U.view, W, H);
    gl.uniform2f(U.res, canvas.width, canvas.height);
    gl.uniform1i(U.mask, 0);
    gl.uniform1f(U.dim, CLEAR_DIM);
    gl.drawArrays(gl.TRIANGLES, 0, N * 3);
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    if (innerWidth !== W || Math.abs(innerHeight - H) > 120) build();
    drawMask();
    draw();
  }

  addEventListener("pointermove", (ev) => {
    pointer = { x: ev.clientX * (W / innerWidth), y: ev.clientY * (H / innerHeight) };
  });
  document.addEventListener("pointerleave", () => { pointer = null; });

  const running = !matchMedia("(prefers-reduced-motion: reduce)").matches;

  let maskDirty = false;
  addEventListener("scroll", () => {
    if (maskDirty) return;
    maskDirty = true;
    requestAnimationFrame(() => {
      maskDirty = false;
      drawMask();
      if (!running) draw();
    });
  }, { passive: true });

  let last = 0;
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    stepSim(dt);
    draw();
    requestAnimationFrame(tick);
  }

  addEventListener("resize", resize);
  resize();
  if (running) requestAnimationFrame(tick);
})();
