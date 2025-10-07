# Circus Challenge (Angular)

A lightweight runner inspired by Circus Charlie, built with Angular standalone components.

Features:
- Ocean Professional theme (blue/amber, modern UI)
- Topbar + sidebar shell
- Canvas-based game (requestAnimationFrame loop)
- Keyboard controls: Space/ArrowUp to jump
- Levels (1..3) with increasing difficulty
- Local high scores using localStorage

Development:
1) Install dependencies:
   npm install
2) Start dev server (port 3000):
   npm start
3) Open http://localhost:3000

Notes:
- No external APIs or environment variables required.
- Works with SSR; browser globals are guarded.
- If Angular packages become mismatched, align all @angular/* versions to the same exact version (19.2.1).
