LineWaves — Selected Work patch

Files:
  assets/js/work-line-waves.js
  assets/css/work-line-waves.css

1. Copy both files into the matching assets folders.
2. In index.html, replace ONLY these three direct children inside <section class="work ...">:
     <div class="section-grid-base" aria-hidden="true"></div>
     <canvas class="section-grid-canvas" aria-hidden="true"></canvas>
     <div class="section-grid-matte" aria-hidden="true"></div>
   with:
     <div class="work-line-waves" aria-hidden="true"><canvas></canvas></div>

3. Add these references alongside the existing stylesheet/script references:
     <link rel="stylesheet" href="assets/css/work-line-waves.css">
     <script src="assets/js/work-line-waves.js" defer></script>

Do not remove section-grid-background.js or shared grid CSS: About and Approach still use them.
The LineWaves render loop is frozen at uTime=0 and uCycle=0. It redraws only for pointer movement/settling, resize, or visibility changes. Click ripples and intro reveal are disabled.
No React dependency is required.
