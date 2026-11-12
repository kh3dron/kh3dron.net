(() => {
  const canvas = document.getElementById("lamp");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false, depth: true, powerPreference: "low-power" });
  if (!gl) {
    canvas.remove();
    return;
  }

  // Units: CSS pixels at the front face of the volume, and seconds.
  // The camera sits CAMERA_DISTANCE in front of the volume; z runs 0 (front) to DEPTH (back).
  const CAMERA_DISTANCE = 700;
  const DEPTH = 520;
  const AREA_PER_BOID = 1100;
  const MAX_BOIDS = 1500;
  const PERCEPTION = 120;
  const SEPARATION_RADIUS = 34;
  const ALIGNMENT = 1.5;
  const COHESION = 0.45;
  const SEPARATION = 300;
  const MIN_SPEED = 45;
  const MAX_SPEED = 95;
  const DEPTH_MARGIN = 90;
  const DEPTH_PUSH = 3;
  const LENS_RADIUS = 150;
  const MAX_LINKS = 6;
  const BOID_LENGTH = 17;
  const BOID_HALF_SPAN = 5.5;
  const BOID_FIN = 6;
  const FAR_SHADE = 0.6;
  const AMBIENT = 0.62;
  const LIGHT = [-0.41, -0.71, -0.57];
  const WARMUP_STEPS = 300;
  const CLEAR_SELECTOR = "[data-clear], .prose p, .prose li, .prose h2, .prose h3, .prose h4";
  const CLEAR_PAD_X = 16;
  const CLEAR_PAD_Y = 6;
  const CLEAR_BLUR = 22;
  const CLEAR_DIM = 0.88;

  // ANSI red, green, yellow, blue, magenta, cyan. Boids flock with their own color only.
  const HUES = ["#cd3131", "#0dbc79", "#e5e510", "#2472c8", "#bc3fbc", "#11a8cd"];
  const BG = [0.024, 0.02, 0.05];

  const VERT = `
attribute vec4 pos;
attribute vec3 color;
uniform vec2 view;
uniform float camera;
uniform float depth;
uniform float farShade;
varying vec3 vColor;
void main() {
  float zc = camera + pos.z;
  float near = camera * 0.4, far = camera + depth * 1.3;
  float t = clamp(pos.z / depth, 0.0, 1.0);
  vColor = color * pos.w * mix(1.0, farShade, t);
  gl_Position = vec4(pos.x * camera / (view.x * 0.5), -pos.y * camera / (view.y * 0.5),
    ((zc - near) / (far - near) * 2.0 - 1.0) * zc, zc);
}`;

  const FRAG = `
precision mediump float;
uniform sampler2D mask;
uniform vec2 res;
uniform float dim;
uniform vec3 bg;
varying vec3 vColor;
void main() {
  float clear = min(texture2D(mask, gl_FragCoord.xy / res).g * 2.2, 1.0);
  gl_FragColor = vec4(mix(vColor, bg, dim * clear), 1.0);
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
  for (const n of ["view", "camera", "depth", "farShade", "mask", "res", "dim", "bg"]) U[n] = gl.getUniformLocation(prog, n);

  const posBuf = gl.createBuffer();
  const colBuf = gl.createBuffer();
  const maskTex = gl.createTexture();
  const maskCanvas = document.createElement("canvas");

  const VERTS_PER_BOID = 12;
  let N = 0, W = 0, H = 0, BX = 0, BY = 0;
  let px, py, pz, vx, vy, vz, ax, ay, az, kind, verts;
  let cols = 0, rows = 0, layers = 0, cellW = 0, cellH = 0, cellD = 0, cellStart, cellItems, cellOf;
  let pointer = null;

  function build() {
    W = innerWidth;
    H = innerHeight;
    // The volume is as wide as the view frustum at its back face, so wrapping happens off screen.
    const spread = (CAMERA_DISTANCE + DEPTH) / CAMERA_DISTANCE;
    BX = W * spread + 80;
    BY = H * spread + 80;
    N = Math.min(MAX_BOIDS, Math.round((W * H) / AREA_PER_BOID));
    px = new Float32Array(N); py = new Float32Array(N); pz = new Float32Array(N);
    vx = new Float32Array(N); vy = new Float32Array(N); vz = new Float32Array(N);
    ax = new Float32Array(N); ay = new Float32Array(N); az = new Float32Array(N);
    kind = new Uint8Array(N);
    verts = new Float32Array(N * VERTS_PER_BOID * 4);
    const colors = new Float32Array(N * VERTS_PER_BOID * 3);
    for (let i = 0; i < N; i++) {
      px[i] = Math.random() * BX;
      py[i] = Math.random() * BY;
      pz[i] = DEPTH_MARGIN + Math.random() * (DEPTH - 2 * DEPTH_MARGIN);
      const a = Math.random() * Math.PI * 2;
      const s = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      vx[i] = Math.cos(a) * s;
      vy[i] = Math.sin(a) * s * 0.5;
      vz[i] = (Math.random() - 0.5) * s * 0.5;
      kind[i] = i % HUES.length;
      const hex = parseInt(HUES[kind[i]].slice(1), 16);
      for (let k = 0; k < VERTS_PER_BOID; k++) {
        const o = (i * VERTS_PER_BOID + k) * 3;
        colors[o] = ((hex >> 16) & 255) / 255;
        colors[o + 1] = ((hex >> 8) & 255) / 255;
        colors[o + 2] = (hex & 255) / 255;
      }
    }

    cols = Math.max(3, Math.floor(BX / PERCEPTION));
    rows = Math.max(3, Math.floor(BY / PERCEPTION));
    layers = Math.max(1, Math.floor(DEPTH / PERCEPTION));
    cellW = BX / cols;
    cellH = BY / rows;
    cellD = DEPTH / layers;
    cellStart = new Int32Array(cols * rows * layers + 1);
    cellItems = new Int32Array(N);
    cellOf = new Int32Array(N);

    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 4, gl.FLOAT, false, 0, 0);

    for (let i = 0; i < WARMUP_STEPS; i++) stepSim(0.033);
  }

  function stepSim(dt) {
    const nCells = cols * rows * layers;
    cellStart.fill(0);
    for (let i = 0; i < N; i++) {
      const cx = Math.min(cols - 1, Math.floor(px[i] / cellW));
      const cy = Math.min(rows - 1, Math.floor(py[i] / cellH));
      const cz = Math.min(layers - 1, Math.max(0, Math.floor(pz[i] / cellD)));
      const c = (cz * rows + cy) * cols + cx;
      cellOf[i] = c;
      cellStart[c + 1]++;
    }
    for (let c = 0; c < nCells; c++) cellStart[c + 1] += cellStart[c];
    const fill = cellStart.slice(0, nCells);
    for (let i = 0; i < N; i++) cellItems[fill[cellOf[i]]++] = i;

    const per2 = PERCEPTION * PERCEPTION;
    const halfX = BX / 2, halfY = BY / 2;
    for (let i = 0; i < N; i++) {
      const xi = px[i], yi = py[i], zi = pz[i], ki = kind[i];
      const cx = cellOf[i] % cols;
      const cyz = (cellOf[i] - cx) / cols;
      const cy = cyz % rows, cz = (cyz - cy) / rows;
      let sx = 0, sy = 0, sz = 0, mvx = 0, mvy = 0, mvz = 0, mx = 0, my = 0, mz = 0, n = 0;
      for (let oz = -1; oz <= 1; oz++) {
        const nz = cz + oz;
        if (nz < 0 || nz >= layers) continue;
        for (let oy = -1; oy <= 1; oy++) {
          const ny = (cy + oy + rows) % rows;
          for (let ox = -1; ox <= 1; ox++) {
            const c = (nz * rows + ny) * cols + ((cx + ox + cols) % cols);
            for (let k = cellStart[c]; k < cellStart[c + 1]; k++) {
              const j = cellItems[k];
              if (j === i) continue;
              let dx = px[j] - xi, dy = py[j] - yi;
              const dz = pz[j] - zi;
              if (dx > halfX) dx -= BX; else if (dx < -halfX) dx += BX;
              if (dy > halfY) dy -= BY; else if (dy < -halfY) dy += BY;
              const d2 = dx * dx + dy * dy + dz * dz;
              if (d2 > per2 || d2 < 1e-6) continue;
              const d = Math.sqrt(d2);
              if (d < SEPARATION_RADIUS) {
                const f = (1 - d / SEPARATION_RADIUS) / d;
                sx -= dx * f; sy -= dy * f; sz -= dz * f;
              }
              if (kind[j] === ki) {
                mvx += vx[j]; mvy += vy[j]; mvz += vz[j];
                mx += dx; my += dy; mz += dz;
                n++;
              }
            }
          }
        }
      }
      let fx = sx * SEPARATION, fy = sy * SEPARATION, fz = sz * SEPARATION;
      if (n > 0) {
        fx += (mvx / n - vx[i]) * ALIGNMENT + (mx / n) * COHESION;
        fy += (mvy / n - vy[i]) * ALIGNMENT + (my / n) * COHESION;
        fz += (mvz / n - vz[i]) * ALIGNMENT + (mz / n) * COHESION;
      }
      if (zi < DEPTH_MARGIN) fz += (DEPTH_MARGIN - zi) * DEPTH_PUSH;
      else if (zi > DEPTH - DEPTH_MARGIN) fz -= (zi - (DEPTH - DEPTH_MARGIN)) * DEPTH_PUSH;
      ax[i] = fx; ay[i] = fy; az[i] = fz;
    }

    for (let i = 0; i < N; i++) {
      let u = vx[i] + ax[i] * dt, v = vy[i] + ay[i] * dt, w = vz[i] + az[i] * dt;
      const s = Math.sqrt(u * u + v * v + w * w) || 1e-6;
      const t = Math.min(MAX_SPEED, Math.max(MIN_SPEED, s)) / s;
      u *= t; v *= t; w *= t;
      vx[i] = u; vy[i] = v; vz[i] = w;
      let x = px[i] + u * dt, y = py[i] + v * dt;
      x -= Math.floor(x / BX) * BX;
      y -= Math.floor(y / BY) * BY;
      px[i] = x;
      py[i] = y;
      pz[i] = Math.min(DEPTH, Math.max(0, pz[i] + w * dt));
    }
  }

  // Neighbour data for one boid, from the grid left by the last stepSim.
  function inspect(i) {
    const xi = px[i], yi = py[i], zi = pz[i], ki = kind[i];
    const cx = cellOf[i] % cols;
    const cyz = (cellOf[i] - cx) / cols;
    const cy = cyz % rows, cz = (cyz - cy) / rows;
    const halfX = BX / 2, halfY = BY / 2;
    const out = { mates: [], close: [], sep: [0, 0, 0], heading: [0, 0, 0], centre: [0, 0, 0] };
    for (let oz = -1; oz <= 1; oz++) {
      const nz = cz + oz;
      if (nz < 0 || nz >= layers) continue;
      for (let oy = -1; oy <= 1; oy++) {
        const ny = (cy + oy + rows) % rows;
        for (let ox = -1; ox <= 1; ox++) {
          const c = (nz * rows + ny) * cols + ((cx + ox + cols) % cols);
          for (let k = cellStart[c]; k < cellStart[c + 1]; k++) {
            const j = cellItems[k];
            if (j === i) continue;
            let dx = px[j] - xi, dy = py[j] - yi;
            const dz = pz[j] - zi;
            if (dx > halfX) dx -= BX; else if (dx < -halfX) dx += BX;
            if (dy > halfY) dy -= BY; else if (dy < -halfY) dy += BY;
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d > PERCEPTION || d < 1e-3) continue;
            if (d < SEPARATION_RADIUS) {
              const f = (1 - d / SEPARATION_RADIUS) / d;
              out.sep[0] -= dx * f; out.sep[1] -= dy * f; out.sep[2] -= dz * f;
              out.close.push([dx, dy, dz]);
            }
            if (kind[j] === ki) {
              out.heading[0] += vx[j]; out.heading[1] += vy[j]; out.heading[2] += vz[j];
              out.centre[0] += dx; out.centre[1] += dy; out.centre[2] += dz;
              out.mates.push([dx, dy, dz]);
            }
          }
        }
      }
    }
    const n = out.mates.length;
    if (n > 0) for (let k = 0; k < 3; k++) { out.heading[k] /= n; out.centre[k] /= n; }
    return out;
  }

  // Volume coordinates to CSS pixels; third element is the perspective scale.
  function project(x, y, z) {
    const k = CAMERA_DISTANCE / (CAMERA_DISTANCE + z);
    return [W / 2 + (x - BX / 2) * k, H / 2 + (y - BY / 2) * k, k];
  }

  const overlay = document.getElementById("lamp-overlay");
  const octx = overlay ? overlay.getContext("2d") : null;
  const PAPER = "253, 253, 253";
  let focus = -1;

  function line(a, b) {
    octx.beginPath();
    octx.moveTo(a[0], a[1]);
    octx.lineTo(b[0], b[1]);
    octx.stroke();
  }

  // Arrow from a toward b, drawn at a fixed screen length so depth does not foreshorten it away.
  function arrow(a, b, len) {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const tip = [a[0] + Math.cos(ang) * len, a[1] + Math.sin(ang) * len];
    line(a, tip);
    octx.beginPath();
    octx.moveTo(tip[0] - 6 * Math.cos(ang - 0.45), tip[1] - 6 * Math.sin(ang - 0.45));
    octx.lineTo(tip[0], tip[1]);
    octx.lineTo(tip[0] - 6 * Math.cos(ang + 0.45), tip[1] - 6 * Math.sin(ang + 0.45));
    octx.stroke();
  }

  function label(text, x, y, alignRight) {
    octx.textAlign = alignRight ? "right" : "left";
    octx.fillStyle = `rgba(${PAPER}, 0.9)`;
    octx.fillText(text, x, y);
  }

  function unit(v, len) {
    const m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [(v[0] / m) * len, (v[1] / m) * len, (v[2] / m) * len];
  }

  function drawOverlay() {
    if (!octx) return;
    octx.setTransform(overlay.width / innerWidth, 0, 0, overlay.height / innerHeight, 0, 0);
    octx.clearRect(0, 0, innerWidth, innerHeight);
    if (!pointer) {
      focus = -1;
      return;
    }

    let best = -1, bestD = Infinity, focusInside = false;
    for (let i = 0; i < N; i++) {
      const p = project(px[i], py[i], pz[i]);
      const dx = p[0] - pointer.x, dy = p[1] - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > LENS_RADIUS * LENS_RADIUS) continue;
      if (i === focus) focusInside = true;
      if (d2 < bestD) { bestD = d2; best = i; }
    }
    if (!focusInside) focus = best;

    octx.lineWidth = 1;
    octx.font = '10px "Berkeley Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    octx.textBaseline = "middle";

    if (focus < 0) return;
    const i = focus;
    const info = inspect(i);
    const here = [px[i], py[i], pz[i]];
    const p = project(here[0], here[1], here[2]);
    const at = (d) => project(here[0] + d[0], here[1] + d[1], here[2] + d[2]);

    const DASH = { separation: [1, 3], alignment: [], cohesion: [6, 3], heading: [] };
    const radius = PERCEPTION * p[2];
    const n = info.mates.length;

    octx.strokeStyle = `rgba(${PAPER}, 0.55)`;
    octx.setLineDash([2, 3]);
    octx.beginPath();
    octx.arc(p[0], p[1], SEPARATION_RADIUS * p[2], 0, Math.PI * 2);
    octx.stroke();
    octx.setLineDash([]);

    octx.strokeStyle = HUES[kind[i]];
    octx.globalAlpha = 0.75;
    const nearest = info.mates
      .map((d) => [d[0] * d[0] + d[1] * d[1] + d[2] * d[2], d])
      .sort((m, k) => m[0] - k[0])
      .slice(0, MAX_LINKS);
    for (const m of nearest) line(p, at(m[1]));
    octx.globalAlpha = 1;

    octx.strokeStyle = `rgba(${PAPER}, 0.95)`;
    octx.lineWidth = 1.5;
    if (n > 0) {
      const c = at(info.centre);
      octx.beginPath();
      octx.moveTo(c[0] - 5, c[1]); octx.lineTo(c[0] + 5, c[1]);
      octx.moveTo(c[0], c[1] - 5); octx.lineTo(c[0], c[1] + 5);
      octx.stroke();
      octx.setLineDash(DASH.cohesion);
      line(p, c);
      octx.setLineDash([]);
      arrow(p, at(unit(info.heading, 60)), 58);
    }
    if (info.close.length > 0) {
      octx.setLineDash(DASH.separation);
      arrow(p, at(unit(info.sep, 60)), 44);
      octx.setLineDash([]);
    }
    octx.strokeStyle = HUES[kind[i]];
    arrow(p, at(unit([vx[i], vy[i], vz[i]], 60)), 30);
    octx.lineWidth = 1;

    const legend = [
      ["heading", "this boid's heading", HUES[kind[i]]],
      ["separation", `separation: ${info.close.length} within ${SEPARATION_RADIUS}`, `rgba(${PAPER}, 0.95)`],
      ["alignment", n > 0 ? `alignment: mean heading of ${n}` : "alignment: no flockmates", `rgba(${PAPER}, 0.95)`],
      ["cohesion", n > 0 ? `cohesion: centre of ${n}` : "cohesion: no flockmates", `rgba(${PAPER}, 0.95)`],
    ];
    const onLeft = p[0] + radius + 230 > innerWidth;
    const lx = onLeft ? p[0] - radius - 14 : p[0] + radius + 14;
    let ly = p[1] - 38;
    for (const [key, text, color] of legend) {
      ly += 15;
      octx.strokeStyle = color;
      octx.setLineDash(DASH[key]);
      line([lx, ly], [lx + (onLeft ? -22 : 22), ly]);
      octx.setLineDash([]);
      label(text, lx + (onLeft ? -28 : 28), ly, onLeft);
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
    for (const el of document.querySelectorAll(CLEAR_SELECTOR)) {
      const box = el.getBoundingClientRect();
      if (box.bottom < -CLEAR_BLUR * 2 || box.top > innerHeight + CLEAR_BLUR * 2) continue;
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

  function put(o, x, y, z, lum) {
    verts[o] = x; verts[o + 1] = y; verts[o + 2] = z; verts[o + 3] = lum;
  }

  function draw() {
    for (let i = 0; i < N; i++) {
      const s = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]) || 1;
      const fx = vx[i] / s, fy = vy[i] / s, fz = vz[i] / s;
      // right = forward x world-up (0, -1, 0 on screen), up = right x forward
      let rx = fz, rz = -fx;
      const rl = Math.sqrt(rx * rx + rz * rz) || 1;
      rx /= rl; rz /= rl;
      const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
      const x = px[i] - BX / 2, y = py[i] - BY / 2, z = pz[i];
      const nx = x + fx * BOID_LENGTH * 0.6, ny = y + fy * BOID_LENGTH * 0.6, nz = z + fz * BOID_LENGTH * 0.6;
      const bx = x - fx * BOID_LENGTH * 0.4, by = y - fy * BOID_LENGTH * 0.4, bz = z - fz * BOID_LENGTH * 0.4;
      const lx = bx - rx * BOID_HALF_SPAN, lz = bz - rz * BOID_HALF_SPAN;
      const qx = bx + rx * BOID_HALF_SPAN, qz = bz + rz * BOID_HALF_SPAN;
      const tx = bx + ux * BOID_FIN, ty = by + uy * BOID_FIN, tz = bz + uz * BOID_FIN;
      // face brightness from a fixed light above, left of and in front of the scene
      const lu = ux * LIGHT[0] + uy * LIGHT[1] + uz * LIGHT[2];
      const lr = rx * LIGHT[0] + rz * LIGHT[2];
      const lf = fx * LIGHT[0] + fy * LIGHT[1] + fz * LIGHT[2];
      const left = AMBIENT + (1 - AMBIENT) * Math.max(0, (lu - lr) * 0.707);
      const right = AMBIENT + (1 - AMBIENT) * Math.max(0, (lu + lr) * 0.707);
      const under = AMBIENT + (1 - AMBIENT) * Math.max(0, -lu);
      const back = AMBIENT + (1 - AMBIENT) * Math.max(0, -lf);
      let o = i * VERTS_PER_BOID * 4;
      put(o, nx, ny, nz, left); put(o + 4, lx, by, lz, left); put(o + 8, tx, ty, tz, left);
      o += 12;
      put(o, nx, ny, nz, right); put(o + 4, qx, by, qz, right); put(o + 8, tx, ty, tz, right);
      o += 12;
      put(o, nx, ny, nz, under); put(o + 4, lx, by, lz, under); put(o + 8, qx, by, qz, under);
      o += 12;
      put(o, lx, by, lz, back); put(o + 4, qx, by, qz, back); put(o + 8, tx, ty, tz, back);
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(BG[0], BG[1], BG[2], 1);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
    gl.uniform2f(U.view, W, H);
    gl.uniform1f(U.camera, CAMERA_DISTANCE);
    gl.uniform1f(U.depth, DEPTH);
    gl.uniform1f(U.farShade, FAR_SHADE);
    gl.uniform2f(U.res, canvas.width, canvas.height);
    gl.uniform3f(U.bg, BG[0], BG[1], BG[2]);
    gl.uniform1i(U.mask, 0);
    gl.uniform1f(U.dim, CLEAR_DIM);
    gl.drawArrays(gl.TRIANGLES, 0, N * VERTS_PER_BOID);
    drawOverlay();
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    if (overlay) {
      overlay.width = canvas.width;
      overlay.height = canvas.height;
    }
    if (innerWidth !== W || Math.abs(innerHeight - H) > 120) build();
    drawMask();
    draw();
  }

  const running = !matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.querySelector(".stage");
  addEventListener("pointermove", (ev) => {
    const r = stage ? stage.getBoundingClientRect() : null;
    const overText = r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    pointer = overText ? null : { x: ev.clientX, y: ev.clientY };
    if (!running) drawOverlay();
  });
  document.addEventListener("pointerleave", () => {
    pointer = null;
    if (!running) drawOverlay();
  });
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

  function refreshMask() {
    drawMask();
    if (!running) draw();
  }
  addEventListener("load", refreshMask);
  if (stage && window.ResizeObserver) new ResizeObserver(refreshMask).observe(stage);

  addEventListener("resize", resize);
  resize();
  if (running) requestAnimationFrame(tick);
})();
