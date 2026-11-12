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
  - 3D boids: separation from all neighbours, alignment and cohesion with same-color neighbours only; 6 ANSI colors
  - volume: 520 units deep behind the page, perspective camera 700 units in front; far boids are smaller and darker
  - each boid is a 4-face dart with flat per-face lighting; depth buffer, no glow
  - one boid per 1,100 square CSS pixels of viewport (cap 1,500); x and y wrap off screen, z has soft walls
  - hover inspection, drawn on `#lamp-overlay` (2D canvas): the boid nearest the pointer (within 150 px) shows links to its 6 nearest same-color neighbours (`MAX_LINKS`), its separation radius, heading, and the separation, alignment and cohesion vectors with a legend; off while the pointer is over the text column (`.stage`)
  - tuning constants at the top of the file
  - text has no panel: every `[data-clear]` element's line boxes are drawn into a mask and boids behind them are dimmed; new landing text needs the attribute
  - LIMIT: requires WebGL; without it the page shows a static dark background
  - NOTE: `boids.js` at the repo root is an older, unreferenced implementation
- local preview: `python3 -m http.server 8137`
