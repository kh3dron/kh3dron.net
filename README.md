# kh3dron.net

welcome to my web site

- writing new posts:
  - write to blog/$title/$title.md
  - run generator.py
  - commit to main

- pages
  - `index.html` + `css/lamp.css` + `lamp.js`: landing page; bio, projects and contact links over the simulation
  - `writing.html` + `css/styles.css`: blog and fiction index; `generate_blog.py` rewrites its post lists
  - posts link back to `writing.html`
- `lamp.js`
  - boids: separation from all neighbours, alignment and cohesion with same-color neighbours only; 6 ANSI colors, flat triangles, no glow
  - one boid per 2,200 square CSS pixels (cap 1,200), edges wrap, spatial grid for neighbour lookup, pointer repels
  - tuning constants at the top of the file
  - text has no panel: every `[data-clear]` element's line boxes are drawn into a mask and boids behind them are dimmed; new landing text needs the attribute
  - LIMIT: requires WebGL; without it the page shows a static dark background
  - NOTE: `boids.js` at the repo root is an older, unreferenced implementation
- local preview: `python3 -m http.server 8137`
