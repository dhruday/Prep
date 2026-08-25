# Netflix — L5 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior UI Engineer |
| **Level** | L5 (Senior) |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Los Gatos |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site)
- **Timeline:** 4 weeks
- **Format:** On-site

## Round 3: Frontend Coding — Video Streaming Player with Adaptive Quality Selector

### Problem
Build a Netflix-style video player UI with:
1. Play/pause overlay with fade-in/out on hover
2. Progress bar with buffered range indicator
3. Quality selector dropdown (Auto, 1080p, 720p, 480p, 360p)
4. Subtitle/CC toggle with selectable languages
5. Fullscreen toggle
6. Volume hover slider with smooth transition
7. 10-second skip forward/backward with animated feedback

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Video Player</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }

.video-player { position: relative; width: 800px; max-width: 100%; aspect-ratio: 16/9; background: #111; border-radius: 4px; overflow: hidden; cursor: pointer; user-select: none; }

.video-surface { width: 100%; height: 100%; background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460); display: flex; align-items: center; justify-content: center; color: #333; font-size: 48px; }

/* Controls overlay */
.controls-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.85)); padding: 40px 12px 12px; opacity: 0; transition: opacity 0.3s; }
.video-player:hover .controls-overlay,
.video-player.show-controls .controls-overlay { opacity: 1; }

/* Center play button */
.center-play { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 72px; height: 72px; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; color: #fff; font-size: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; }
.video-player:hover .center-play,
.video-player.paused .center-play { opacity: 1; }
.center-play:hover { background: rgba(229,9,20,0.8); transform: translate(-50%, -50%) scale(1.1); }

/* Skip feedback */
.skip-feedback { position: absolute; top: 50%; font-size: 20px; color: #fff; font-weight: 700; opacity: 0; pointer-events: none; transition: opacity 0.15s, transform 0.3s; }
.skip-feedback.left { left: 20%; transform: translate(-50%, -50%); }
.skip-feedback.right { right: 20%; transform: translate(50%, -50%); }
.skip-feedback.show { opacity: 1; }
.skip-feedback.show.left { transform: translate(-50%, -50%) translateX(-20px); }
.skip-feedback.show.right { transform: translate(50%, -50%) translateX(20px); }

/* Progress bar */
.progress-container { padding: 0 0 8px; position: relative; }
.progress-bar { width: 100%; height: 3px; background: rgba(255,255,255,0.2); cursor: pointer; position: relative; border-radius: 2px; }
.progress-bar:hover { height: 5px; }
.progress-buffered { position: absolute; top: 0; left: 0; height: 100%; background: rgba(255,255,255,0.3); border-radius: 2px; }
.progress-played { position: absolute; top: 0; left: 0; height: 100%; background: #e50914; border-radius: 2px; }
.progress-thumb { position: absolute; top: 50%; right: -6px; transform: translateY(-50%); width: 12px; height: 12px; background: #e50914; border-radius: 50%; opacity: 0; transition: opacity 0.1s; }
.progress-bar:hover .progress-thumb { opacity: 1; }
.hover-time { position: absolute; bottom: 20px; background: rgba(0,0,0,0.8); color: #fff; padding: 3px 8px; border-radius: 3px; font-size: 12px; display: none; transform: translateX(-50%); pointer-events: none; }

/* Bottom controls */
.bottom-controls { display: flex; align-items: center; gap: 4px; }
.ctrl-btn { background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 6px 8px; border-radius: 4px; transition: background 0.15s; position: relative; }
.ctrl-btn:hover { background: rgba(255,255,255,0.1); }

.time-display { font-size: 13px; color: #ccc; margin: 0 8px; white-space: nowrap; font-variant-numeric: tabular-nums; }

.spacer { flex: 1; }

/* Volume */
.volume-group { display: flex; align-items: center; position: relative; }
.volume-slider-wrap { width: 0; overflow: hidden; transition: width 0.2s; }
.volume-group:hover .volume-slider-wrap { width: 80px; }
.volume-slider { width: 70px; height: 3px; appearance: none; -webkit-appearance: none; background: rgba(255,255,255,0.3); border-radius: 3px; margin-left: 4px; cursor: pointer; }
.volume-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; background: #fff; border-radius: 50%; cursor: pointer; }

/* Quality selector */
.quality-menu { position: absolute; bottom: 100%; right: 0; background: rgba(20,20,20,0.95); border-radius: 6px; padding: 6px 0; min-width: 150px; display: none; margin-bottom: 8px; }
.quality-menu.open { display: block; }
.quality-option { padding: 8px 16px; font-size: 13px; color: #ccc; cursor: pointer; display: flex; justify-content: space-between; }
.quality-option:hover { background: rgba(255,255,255,0.1); }
.quality-option.active { color: #fff; font-weight: 600; }
.quality-option.active::after { content: '✓'; color: #e50914; }

/* Subtitles menu */
.subtitle-menu { position: absolute; bottom: 100%; right: 0; background: rgba(20,20,20,0.95); border-radius: 6px; padding: 6px 0; min-width: 140px; display: none; margin-bottom: 8px; }
.subtitle-menu.open { display: block; }
.sub-option { padding: 8px 16px; font-size: 13px; color: #ccc; cursor: pointer; }
.sub-option:hover { background: rgba(255,255,255,0.1); }
.sub-option.active { color: #fff; font-weight: 600; }
.sub-option.active::after { content: ' ✓'; color: #e50914; }

/* Subtitle display */
.subtitle-display { position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.75); color: #fff; padding: 4px 16px; border-radius: 4px; font-size: 18px; display: none; text-align: center; max-width: 80%; }
.subtitle-display.visible { display: block; }

.title-overlay { position: absolute; top: 16px; left: 16px; color: #fff; font-size: 20px; font-weight: 700; opacity: 0; transition: opacity 0.3s; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.video-player:hover .title-overlay { opacity: 1; }
</style>
</head>
<body>
<div class="video-player" id="player">
  <div class="video-surface">🎬</div>
  <div class="title-overlay">The Design Interview — S01E03</div>
  <div class="subtitle-display" id="subtitleDisplay"></div>

  <button class="center-play" id="centerPlay">▶</button>

  <div class="skip-feedback left" id="skipLeft">⟲ 10s</div>
  <div class="skip-feedback right" id="skipRight">10s ⟳</div>

  <div class="controls-overlay">
    <div class="progress-container">
      <div class="hover-time" id="hoverTime">0:00</div>
      <div class="progress-bar" id="progressBar">
        <div class="progress-buffered" id="buffered" style="width:60%"></div>
        <div class="progress-played" id="played" style="width:0%">
          <div class="progress-thumb"></div>
        </div>
      </div>
    </div>
    <div class="bottom-controls">
      <button class="ctrl-btn" id="playBtn" title="Play (k)">▶</button>
      <button class="ctrl-btn" id="skipBackBtn" title="Rewind 10s (j)">⟲</button>
      <button class="ctrl-btn" id="skipFwdBtn" title="Forward 10s (l)">⟳</button>
      <div class="volume-group">
        <button class="ctrl-btn" id="muteBtn" title="Mute (m)">🔊</button>
        <div class="volume-slider-wrap">
          <input type="range" class="volume-slider" id="volumeSlider" min="0" max="1" step="0.01" value="1">
        </div>
      </div>
      <span class="time-display"><span id="curTime">0:00</span> / <span id="durTime">45:30</span></span>
      <div class="spacer"></div>
      <div style="position:relative;">
        <button class="ctrl-btn" id="subBtn" title="Subtitles (c)">CC</button>
        <div class="subtitle-menu" id="subMenu"></div>
      </div>
      <div style="position:relative;">
        <button class="ctrl-btn" id="qualityBtn" title="Quality">HD</button>
        <div class="quality-menu" id="qualityMenu"></div>
      </div>
      <button class="ctrl-btn" id="fullscreenBtn" title="Fullscreen (f)">⛶</button>
    </div>
  </div>
</div>

<script>
// ============================================================
// STATE
// ============================================================
const TOTAL_DURATION = 45 * 60 + 30; // 45:30
let currentTime = 0;
let isPlaying = false;
let volume = 1;
let isMuted = false;
let prevVolume = 1;
let activeQuality = 'auto';
let activeSubtitle = 'off';

const QUALITIES = [
  { id: 'auto', label: 'Auto', badge: '' },
  { id: '1080p', label: '1080p', badge: 'HD' },
  { id: '720p', label: '720p', badge: 'HD' },
  { id: '480p', label: '480p', badge: '' },
  { id: '360p', label: '360p', badge: '' }
];

const SUBTITLES = [
  { id: 'off', label: 'Off' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'ja', label: 'Japanese' }
];

const DEMO_SUBS = [
  { start: 5, end: 10, en: 'Welcome to the design interview series.', es: 'Bienvenido a la serie de entrevistas de diseño.', fr: "Bienvenue dans la série d'entretiens de conception.", ja: 'デザインインタビューシリーズへようこそ。' },
  { start: 12, end: 17, en: "Today we'll discuss system architecture.", es: 'Hoy discutiremos la arquitectura del sistema.', fr: "Aujourd'hui, nous discuterons de l'architecture système.", ja: '今日はシステムアーキテクチャについてお話しします。' },
  { start: 20, end: 25, en: "Let's start with the fundamentals.", es: 'Comencemos con los fundamentos.', fr: 'Commençons par les fondamentaux.', ja: '基本から始めましょう。' }
];

// DOM
const player = document.getElementById('player');
const playBtn = document.getElementById('playBtn');
const centerPlay = document.getElementById('centerPlay');
const progressBar = document.getElementById('progressBar');
const played = document.getElementById('played');
const buffered = document.getElementById('buffered');
const curTimeEl = document.getElementById('curTime');
const hoverTime = document.getElementById('hoverTime');
const muteBtn = document.getElementById('muteBtn');
const volumeSlider = document.getElementById('volumeSlider');
const qualityBtn = document.getElementById('qualityBtn');
const qualityMenu = document.getElementById('qualityMenu');
const subBtn = document.getElementById('subBtn');
const subMenu = document.getElementById('subMenu');
const subDisplay = document.getElementById('subtitleDisplay');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const skipLeft = document.getElementById('skipLeft');
const skipRight = document.getElementById('skipRight');

let lastFrame = 0;
let rafId = null;
let controlsTimeout = null;

// ============================================================
// PLAYBACK LOOP
// ============================================================
function tick(timestamp) {
  if (!isPlaying) return;
  if (lastFrame) {
    const delta = (timestamp - lastFrame) / 1000;
    currentTime = Math.min(currentTime + delta, TOTAL_DURATION);
  }
  lastFrame = timestamp;

  updateProgress();
  updateSubtitles();

  if (currentTime >= TOTAL_DURATION) {
    isPlaying = false;
    updatePlayState();
    return;
  }

  rafId = requestAnimationFrame(tick);
}

function updateProgress() {
  const pct = (currentTime / TOTAL_DURATION) * 100;
  played.style.width = pct + '%';
  curTimeEl.textContent = formatTime(currentTime);

  // Simulate buffering (always 30s ahead)
  const bufPct = Math.min(100, ((currentTime + 30) / TOTAL_DURATION) * 100);
  buffered.style.width = bufPct + '%';
}

function formatTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return h + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  return m + ':' + String(sec).padStart(2, '0');
}

// ============================================================
// PLAY/PAUSE
// ============================================================
function togglePlay() {
  isPlaying = !isPlaying;
  updatePlayState();
  if (isPlaying) {
    lastFrame = 0;
    rafId = requestAnimationFrame(tick);
  } else {
    cancelAnimationFrame(rafId);
  }
}

function updatePlayState() {
  playBtn.textContent = isPlaying ? '⏸' : '▶';
  centerPlay.textContent = isPlaying ? '⏸' : '▶';
  player.classList.toggle('paused', !isPlaying);
}

playBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
centerPlay.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
player.addEventListener('click', togglePlay);

// ============================================================
// SKIP 10s
// ============================================================
function skip(delta) {
  currentTime = Math.max(0, Math.min(TOTAL_DURATION, currentTime + delta));
  updateProgress();

  const el = delta > 0 ? skipRight : skipLeft;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 400);
}

document.getElementById('skipBackBtn').addEventListener('click', (e) => { e.stopPropagation(); skip(-10); });
document.getElementById('skipFwdBtn').addEventListener('click', (e) => { e.stopPropagation(); skip(10); });

// Double-click sides to skip
player.addEventListener('dblclick', (e) => {
  const rect = player.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  if (x < 0.3) skip(-10);
  else if (x > 0.7) skip(10);
});

// ============================================================
// SEEK
// ============================================================
progressBar.addEventListener('click', (e) => {
  e.stopPropagation();
  const rect = progressBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  currentTime = pct * TOTAL_DURATION;
  updateProgress();
});

progressBar.addEventListener('mousemove', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  const time = Math.max(0, Math.min(TOTAL_DURATION, pct * TOTAL_DURATION));
  hoverTime.textContent = formatTime(time);
  hoverTime.style.left = (pct * 100) + '%';
  hoverTime.style.display = 'block';
});

progressBar.addEventListener('mouseleave', () => { hoverTime.style.display = 'none'; });

// ============================================================
// VOLUME
// ============================================================
muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isMuted) { volume = prevVolume || 0.5; isMuted = false; }
  else { prevVolume = volume; volume = 0; isMuted = true; }
  volumeSlider.value = volume;
  muteBtn.textContent = isMuted ? '🔇' : volume < 0.5 ? '🔉' : '🔊';
});

volumeSlider.addEventListener('input', (e) => {
  e.stopPropagation();
  volume = parseFloat(volumeSlider.value);
  isMuted = volume === 0;
  muteBtn.textContent = volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';
});
volumeSlider.addEventListener('click', (e) => e.stopPropagation());

// ============================================================
// QUALITY MENU
// ============================================================
function renderQualityMenu() {
  qualityMenu.innerHTML = '';
  QUALITIES.forEach(q => {
    const opt = document.createElement('div');
    opt.className = 'quality-option' + (activeQuality === q.id ? ' active' : '');
    opt.textContent = q.label;
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      activeQuality = q.id;
      qualityBtn.textContent = q.badge || q.label;
      qualityMenu.classList.remove('open');
      renderQualityMenu();
    });
    qualityMenu.appendChild(opt);
  });
}

qualityBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  subMenu.classList.remove('open');
  qualityMenu.classList.toggle('open');
});

// ============================================================
// SUBTITLE MENU
// ============================================================
function renderSubMenu() {
  subMenu.innerHTML = '';
  SUBTITLES.forEach(s => {
    const opt = document.createElement('div');
    opt.className = 'sub-option' + (activeSubtitle === s.id ? ' active' : '');
    opt.textContent = s.label;
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      activeSubtitle = s.id;
      subMenu.classList.remove('open');
      subBtn.style.borderBottom = activeSubtitle !== 'off' ? '2px solid #e50914' : 'none';
      renderSubMenu();
      updateSubtitles();
    });
    subMenu.appendChild(opt);
  });
}

function updateSubtitles() {
  if (activeSubtitle === 'off') { subDisplay.classList.remove('visible'); return; }
  const sub = DEMO_SUBS.find(s => currentTime >= s.start && currentTime <= s.end);
  if (sub && sub[activeSubtitle]) {
    subDisplay.textContent = sub[activeSubtitle];
    subDisplay.classList.add('visible');
  } else {
    subDisplay.classList.remove('visible');
  }
}

subBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  qualityMenu.classList.remove('open');
  subMenu.classList.toggle('open');
});

// Close menus on outside click
document.addEventListener('click', () => {
  qualityMenu.classList.remove('open');
  subMenu.classList.remove('open');
});

// ============================================================
// FULLSCREEN
// ============================================================
fullscreenBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (document.fullscreenElement) {
    document.exitFullscreen();
    fullscreenBtn.textContent = '⛶';
  } else {
    player.requestFullscreen();
    fullscreenBtn.textContent = '⛶';
  }
});

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case ' ': case 'k': e.preventDefault(); togglePlay(); break;
    case 'j': skip(-10); break;
    case 'l': skip(10); break;
    case 'ArrowLeft': e.preventDefault(); skip(-5); break;
    case 'ArrowRight': e.preventDefault(); skip(5); break;
    case 'ArrowUp': e.preventDefault(); volume = Math.min(1, volume + 0.1); volumeSlider.value = volume; muteBtn.textContent = '🔊'; break;
    case 'ArrowDown': e.preventDefault(); volume = Math.max(0, volume - 0.1); volumeSlider.value = volume; break;
    case 'm': case 'M': muteBtn.click(); break;
    case 'f': case 'F': fullscreenBtn.click(); break;
    case 'c': case 'C':
      const subs = SUBTITLES.map(s => s.id);
      const nextIdx = (subs.indexOf(activeSubtitle) + 1) % subs.length;
      activeSubtitle = subs[nextIdx];
      subBtn.style.borderBottom = activeSubtitle !== 'off' ? '2px solid #e50914' : 'none';
      renderSubMenu();
      break;
  }
});

// Auto-hide controls
player.addEventListener('mousemove', () => {
  player.classList.add('show-controls');
  clearTimeout(controlsTimeout);
  controlsTimeout = setTimeout(() => {
    if (isPlaying) player.classList.remove('show-controls');
  }, 3000);
});

// Init
renderQualityMenu();
renderSubMenu();
updateProgress();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Netflix FE expects **media player expertise** — core to their product
- Controls auto-hide after 3s of no mouse movement during playback
- Buffered range indicator (`progress-buffered`) — distinct visual from played range
- Double-click left/right thirds of video for 10s skip (YouTube/Netflix pattern)
- Skip animation: CSS class toggling with `setTimeout` for removal
- Subtitle engine: time-window matching with multi-language support
- Quality selector modal positioned with `position: absolute; bottom: 100%`
- Volume slider reveal on hover using `width` transition (not opacity)
- `requestAnimationFrame` for frame-accurate playback timing

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS, Promises, Event Loop |
| Technical 1 | Medium-Hard | Performance, Virtual DOM |
| Technical 2 | Hard | Video Player, Media APIs, Complex UI State |
| System Design | Hard | Video Streaming Architecture |
| Culture Fit | Medium | Netflix Values, Radical Candor |
