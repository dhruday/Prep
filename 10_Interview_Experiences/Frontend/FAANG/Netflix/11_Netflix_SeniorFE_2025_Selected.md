# Netflix — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior Frontend Engineer |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | May 2025 |
| **Result** | ✅ Selected |
| **Location** | Remote |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 4 On-site)
- **Timeline:** 4 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — Video Player with Custom Controls

### Problem
Build a custom video player:
1. Play/Pause, Volume slider, Mute toggle
2. Progress bar with seek (click to jump, drag to scrub)
3. Time display: current / total duration
4. Playback speed selector (0.5x, 1x, 1.25x, 1.5x, 2x)
5. Fullscreen toggle
6. Keyboard shortcuts: Space (play/pause), M (mute), ←/→ (seek 10s), ↑/↓ (volume)
7. Auto-hide controls after 3s of inactivity, show on mouse move

Build with **vanilla JavaScript** only (simulate video with canvas animation).

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Video Player</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, sans-serif; }

.player-container { position: relative; width: 800px; max-width: 100vw; aspect-ratio: 16/9; background: #141414; border-radius: 4px; overflow: hidden; cursor: pointer; }

canvas { width: 100%; height: 100%; display: block; }

/* Controls */
.controls { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,.8)); padding: 12px 16px; transition: opacity 0.3s; }
.controls.hidden { opacity: 0; pointer-events: none; }

/* Progress Bar */
.progress-bar { position: relative; height: 4px; background: rgba(255,255,255,.2); border-radius: 2px; margin-bottom: 10px; cursor: pointer; transition: height 0.15s; }
.progress-bar:hover { height: 6px; }
.progress-buffered { position: absolute; height: 100%; background: rgba(255,255,255,.3); border-radius: 2px; }
.progress-played { position: absolute; height: 100%; background: #e50914; border-radius: 2px; }
.progress-handle { position: absolute; width: 12px; height: 12px; background: #e50914; border-radius: 50%; top: 50%; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.15s; }
.progress-bar:hover .progress-handle { opacity: 1; }
.progress-tooltip { position: absolute; bottom: 20px; transform: translateX(-50%); background: rgba(0,0,0,.8); color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 11px; display: none; white-space: nowrap; }

/* Control Buttons Row */
.controls-row { display: flex; align-items: center; gap: 12px; }
.ctrl-btn { background: none; border: none; color: #fff; font-size: 16px; cursor: pointer; padding: 4px; opacity: 0.9; }
.ctrl-btn:hover { opacity: 1; }

/* Volume */
.volume-group { display: flex; align-items: center; gap: 4px; }
.volume-slider { width: 60px; height: 3px; -webkit-appearance: none; background: rgba(255,255,255,.3); border-radius: 2px; outline: none; cursor: pointer; }
.volume-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; background: #fff; border-radius: 50%; cursor: pointer; }

.time-display { font-size: 12px; color: rgba(255,255,255,.8); font-family: 'SF Mono', monospace; }

.spacer { flex: 1; }

/* Speed */
.speed-btn { font-size: 12px; color: rgba(255,255,255,.8); background: rgba(255,255,255,.1); border: none; padding: 3px 8px; border-radius: 3px; cursor: pointer; }
.speed-btn:hover { background: rgba(255,255,255,.2); }
.speed-menu { position: absolute; bottom: 50px; right: 50px; background: rgba(20,20,20,.95); border-radius: 4px; overflow: hidden; display: none; }
.speed-menu.visible { display: block; }
.speed-option { padding: 8px 16px; font-size: 12px; color: #fff; cursor: pointer; white-space: nowrap; }
.speed-option:hover { background: rgba(255,255,255,.1); }
.speed-option.active { color: #e50914; font-weight: 700; }

/* Title */
.player-title { position: absolute; top: 16px; left: 16px; color: #fff; font-size: 16px; font-weight: 600; text-shadow: 0 1px 4px rgba(0,0,0,.5); transition: opacity 0.3s; }
.player-title.hidden { opacity: 0; }
</style>
</head>
<body>

<div class="player-container" id="player">
  <canvas id="videoCanvas"></canvas>
  <div class="player-title" id="playerTitle">The Frontend Engineer</div>
  <div class="controls" id="controls">
    <div class="progress-bar" id="progressBar">
      <div class="progress-buffered" id="buffered" style="width:60%"></div>
      <div class="progress-played" id="played" style="width:0%"></div>
      <div class="progress-handle" id="handle" style="left:0%"></div>
      <div class="progress-tooltip" id="tooltip">0:00</div>
    </div>
    <div class="controls-row">
      <button class="ctrl-btn" id="playBtn">▶</button>
      <div class="volume-group">
        <button class="ctrl-btn" id="muteBtn">🔊</button>
        <input type="range" class="volume-slider" id="volumeSlider" min="0" max="100" value="80">
      </div>
      <span class="time-display" id="timeDisplay">0:00 / 2:00</span>
      <div class="spacer"></div>
      <button class="speed-btn" id="speedBtn">1x</button>
      <button class="ctrl-btn" id="fullscreenBtn">⛶</button>
    </div>
    <div class="speed-menu" id="speedMenu"></div>
  </div>
</div>

<script>
// ============================================================
// STATE
// ============================================================
const TOTAL_DURATION = 120; // 2 minutes (simulated)
let currentTime = 0;
let isPlaying = false;
let volume = 80;
let isMuted = false;
let playbackSpeed = 1;
let hideTimer = null;
let isDragging = false;

const canvas = document.getElementById('videoCanvas');
const ctx = canvas.getContext('2d');

// ============================================================
// SIMULATED VIDEO (Canvas Animation)
// ============================================================
function resizeCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function drawFrame() {
  const W = canvas.width, H = canvas.height;
  const t = currentTime;

  // Background gradient shifts with time
  const hue = (t * 3) % 360;
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, `hsl(${hue}, 60%, 15%)`);
  grad.addColorStop(1, `hsl(${(hue + 120) % 360}, 60%, 10%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Floating circles
  for (let i = 0; i < 5; i++) {
    const x = W * 0.5 + Math.sin(t * 0.3 + i * 1.2) * (W * 0.3);
    const y = H * 0.5 + Math.cos(t * 0.4 + i * 0.8) * (H * 0.25);
    const r = 20 + Math.sin(t * 0.5 + i) * 10;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${(hue + i * 60) % 360}, 70%, 50%, 0.3)`;
    ctx.fill();
  }

  // Time text
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.font = `bold ${H * 0.15}px -apple-system`;
  ctx.textAlign = 'center';
  ctx.fillText(formatTime(currentTime), W / 2, H / 2 + H * 0.05);
}

let animFrame;
function tickPlay() {
  if (!isPlaying) return;
  currentTime = Math.min(currentTime + (1 / 60) * playbackSpeed, TOTAL_DURATION);
  updateUI();
  drawFrame();
  if (currentTime >= TOTAL_DURATION) { isPlaying = false; updateUI(); return; }
  animFrame = requestAnimationFrame(tickPlay);
}

// ============================================================
// FORMAT
// ============================================================
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ============================================================
// UI UPDATE
// ============================================================
function updateUI() {
  const pct = (currentTime / TOTAL_DURATION) * 100;
  document.getElementById('played').style.width = pct + '%';
  document.getElementById('handle').style.left = pct + '%';
  document.getElementById('timeDisplay').textContent = `${formatTime(currentTime)} / ${formatTime(TOTAL_DURATION)}`;
  document.getElementById('playBtn').textContent = isPlaying ? '⏸' : '▶';
  document.getElementById('muteBtn').textContent = isMuted || volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊';
}

// ============================================================
// CONTROLS
// ============================================================
// Play/Pause
document.getElementById('playBtn').addEventListener('click', togglePlay);
document.getElementById('videoCanvas').addEventListener('click', togglePlay);

function togglePlay() {
  isPlaying = !isPlaying;
  if (isPlaying) {
    if (currentTime >= TOTAL_DURATION) currentTime = 0;
    tickPlay();
  } else {
    cancelAnimationFrame(animFrame);
  }
  updateUI();
}

// Volume
document.getElementById('volumeSlider').addEventListener('input', e => {
  volume = parseInt(e.target.value);
  isMuted = false;
  updateUI();
});

document.getElementById('muteBtn').addEventListener('click', () => {
  isMuted = !isMuted;
  document.getElementById('volumeSlider').value = isMuted ? 0 : volume;
  updateUI();
});

// Progress bar seek
const progressBar = document.getElementById('progressBar');
function seekTo(e) {
  const rect = progressBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  currentTime = pct * TOTAL_DURATION;
  updateUI();
  drawFrame();
}

progressBar.addEventListener('mousedown', e => { isDragging = true; seekTo(e); });
document.addEventListener('mousemove', e => {
  if (isDragging) seekTo(e);

  // Tooltip
  const rect = progressBar.getBoundingClientRect();
  if (e.clientY >= rect.top - 20 && e.clientY <= rect.bottom + 20 && e.clientX >= rect.left && e.clientX <= rect.right) {
    const pct = (e.clientX - rect.left) / rect.width;
    const tooltip = document.getElementById('tooltip');
    tooltip.textContent = formatTime(pct * TOTAL_DURATION);
    tooltip.style.left = (pct * 100) + '%';
    tooltip.style.display = 'block';
  } else {
    document.getElementById('tooltip').style.display = 'none';
  }
});
document.addEventListener('mouseup', () => { isDragging = false; });

// Speed
const speeds = [0.5, 1, 1.25, 1.5, 2];
document.getElementById('speedMenu').innerHTML = speeds.map(s =>
  `<div class="speed-option${s === playbackSpeed ? ' active' : ''}" data-speed="${s}">${s}x</div>`
).join('');

document.getElementById('speedBtn').addEventListener('click', () => {
  document.getElementById('speedMenu').classList.toggle('visible');
});

document.querySelectorAll('.speed-option').forEach(opt => {
  opt.addEventListener('click', () => {
    playbackSpeed = parseFloat(opt.dataset.speed);
    document.getElementById('speedBtn').textContent = playbackSpeed + 'x';
    document.getElementById('speedMenu').classList.remove('visible');
    document.querySelectorAll('.speed-option').forEach(o => o.classList.toggle('active', parseFloat(o.dataset.speed) === playbackSpeed));
  });
});

// Fullscreen
document.getElementById('fullscreenBtn').addEventListener('click', () => {
  const el = document.getElementById('player');
  if (document.fullscreenElement) document.exitFullscreen();
  else el.requestFullscreen();
});

// ============================================================
// AUTO-HIDE CONTROLS
// ============================================================
function showControls() {
  document.getElementById('controls').classList.remove('hidden');
  document.getElementById('playerTitle').classList.remove('hidden');
  document.body.style.cursor = 'default';
  clearTimeout(hideTimer);
  if (isPlaying) {
    hideTimer = setTimeout(() => {
      document.getElementById('controls').classList.add('hidden');
      document.getElementById('playerTitle').classList.add('hidden');
      document.body.style.cursor = 'none';
    }, 3000);
  }
}

document.getElementById('player').addEventListener('mousemove', showControls);
document.getElementById('player').addEventListener('mouseleave', () => {
  if (isPlaying) {
    document.getElementById('controls').classList.add('hidden');
    document.getElementById('playerTitle').classList.add('hidden');
  }
});

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.key) {
    case ' ': e.preventDefault(); togglePlay(); break;
    case 'm': case 'M': isMuted = !isMuted; document.getElementById('volumeSlider').value = isMuted ? 0 : volume; updateUI(); break;
    case 'ArrowRight': currentTime = Math.min(currentTime + 10, TOTAL_DURATION); updateUI(); drawFrame(); break;
    case 'ArrowLeft': currentTime = Math.max(currentTime - 10, 0); updateUI(); drawFrame(); break;
    case 'ArrowUp': e.preventDefault(); volume = Math.min(volume + 10, 100); document.getElementById('volumeSlider').value = volume; isMuted = false; updateUI(); break;
    case 'ArrowDown': e.preventDefault(); volume = Math.max(volume - 10, 0); document.getElementById('volumeSlider').value = volume; updateUI(); break;
    case 'f': case 'F': document.getElementById('fullscreenBtn').click(); break;
  }
  showControls();
});

// ============================================================
// INIT
// ============================================================
drawFrame();
updateUI();
showControls();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- **Custom video controls**: play/pause, volume, seek, speed, fullscreen — all custom-built over canvas
- **Progress bar**: mousedown to seek, mousemove for tooltip preview, drag to scrub
- **Auto-hide**: controls fade out after 3s of inactivity, re-appear on mousemove, cursor hidden
- **Keyboard shortcuts**: Space=play, M=mute, ←/→=seek 10s, ↑/↓=volume, F=fullscreen
- **Playback speed**: menu overlay, adjusts `requestAnimationFrame` tick rate
- **Canvas simulation**: gradient background + floating circles + time display in place of real video
- Netflix red (#e50914) accent on progress bar and active speed

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS Fundamentals |
| On-site 1 | Medium | DOM, CSS |
| On-site 2 | Hard | Custom Video Player, Canvas, Keyboard |
| On-site 3 | Hard | System Design |
| On-site 4 | Hard | Culture Fit |
