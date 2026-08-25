# Apple — ICT4 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Frontend Engineer |
| **Level** | ICT4 (Senior) |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Cupertino |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site: 3 Coding + Manager)
- **Timeline:** 5 weeks
- **Format:** On-site

## Round 2: Frontend Coding — Music Player with Waveform Visualization

### Problem
Build a music player UI with:
1. Play/pause, skip prev/next, volume with mute toggle
2. Progress bar with seek (click/drag to seek)
3. Audio waveform visualization using Canvas API
4. Playlist panel with track listing and current-track highlight
5. Keyboard shortcuts (Space=play/pause, arrows=seek, M=mute)
6. Responsive design — adapts to narrow screens

Build with **vanilla JavaScript** only (use Web Audio API for visualization).

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Music Player</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; display: flex; justify-content: center; align-items: center; }

.player { width: 420px; background: #16213e; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }

.artwork-area { position: relative; width: 100%; height: 200px; background: linear-gradient(135deg, #0f3460, #533483); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.album-art { font-size: 64px; opacity: 0.3; }
canvas#waveform { position: absolute; inset: 0; width: 100%; height: 100%; }

.track-info { padding: 16px 20px 8px; text-align: center; }
.track-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.track-artist { font-size: 14px; color: #8e8ea0; }

.progress-section { padding: 12px 20px; }
.progress-bar { width: 100%; height: 4px; background: #333; border-radius: 4px; cursor: pointer; position: relative; }
.progress-bar:hover { height: 6px; }
.progress-fill { height: 100%; background: #e94560; border-radius: 4px; position: relative; transition: none; }
.progress-thumb { position: absolute; right: -6px; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; background: #e94560; border-radius: 50%; opacity: 0; transition: opacity 0.15s; }
.progress-bar:hover .progress-thumb { opacity: 1; }
.time-display { display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: #8e8ea0; }

.controls { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 8px 20px 16px; }
.ctrl-btn { background: none; border: none; color: #ccc; cursor: pointer; font-size: 20px; padding: 8px; border-radius: 50%; transition: all 0.15s; }
.ctrl-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
.ctrl-btn.play-btn { font-size: 28px; background: #e94560; color: #fff; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; }
.ctrl-btn.play-btn:hover { background: #ff6b6b; transform: scale(1.05); }

.volume-section { display: flex; align-items: center; gap: 8px; padding: 0 20px 12px; }
.volume-icon { cursor: pointer; font-size: 16px; background: none; border: none; color: #8e8ea0; }
.volume-slider { flex: 1; appearance: none; -webkit-appearance: none; height: 3px; background: #333; border-radius: 3px; outline: none; cursor: pointer; }
.volume-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: #e94560; border-radius: 50%; cursor: pointer; }

.playlist { border-top: 1px solid #1a1a2e; max-height: 200px; overflow-y: auto; }
.playlist-header { padding: 10px 20px; font-size: 13px; font-weight: 600; color: #8e8ea0; text-transform: uppercase; letter-spacing: 1px; }
.playlist-item { display: flex; align-items: center; gap: 12px; padding: 10px 20px; cursor: pointer; transition: background 0.15s; }
.playlist-item:hover { background: rgba(255,255,255,0.05); }
.playlist-item.active { background: rgba(233,69,96,0.15); }
.playlist-item .track-num { width: 20px; font-size: 13px; color: #555; text-align: center; }
.playlist-item.active .track-num { color: #e94560; }
.playlist-item .track-details { flex: 1; }
.playlist-item .pl-title { font-size: 14px; }
.playlist-item .pl-artist { font-size: 12px; color: #8e8ea0; }
.playlist-item .pl-duration { font-size: 12px; color: #555; }

.playlist::-webkit-scrollbar { width: 4px; }
.playlist::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
</style>
</head>
<body>
<div class="player">
  <div class="artwork-area">
    <div class="album-art">🎵</div>
    <canvas id="waveform"></canvas>
  </div>
  <div class="track-info">
    <div class="track-title" id="trackTitle">No Track Selected</div>
    <div class="track-artist" id="trackArtist">—</div>
  </div>
  <div class="progress-section">
    <div class="progress-bar" id="progressBar">
      <div class="progress-fill" id="progressFill" style="width:0%">
        <div class="progress-thumb"></div>
      </div>
    </div>
    <div class="time-display">
      <span id="currentTime">0:00</span>
      <span id="totalTime">0:00</span>
    </div>
  </div>
  <div class="controls">
    <button class="ctrl-btn" id="prevBtn" title="Previous (←)">⏮</button>
    <button class="ctrl-btn play-btn" id="playBtn" title="Play/Pause (Space)">▶</button>
    <button class="ctrl-btn" id="nextBtn" title="Next (→)">⏭</button>
  </div>
  <div class="volume-section">
    <button class="volume-icon" id="muteBtn" title="Mute (M)">🔊</button>
    <input type="range" class="volume-slider" id="volumeSlider" min="0" max="1" step="0.01" value="0.7">
  </div>
  <div class="playlist" id="playlist">
    <div class="playlist-header">Playlist</div>
  </div>
</div>

<script>
// ============================================================
// MOCK PLAYLIST (using oscillator for demo since no real audio files)
// ============================================================
const TRACKS = [
  { title: 'Midnight Drive', artist: 'Synthwave Collective', duration: 245, freq: 440 },
  { title: 'Neon Dreams', artist: 'Retr0', duration: 198, freq: 523 },
  { title: 'Digital Rain', artist: 'CyberPulse', duration: 312, freq: 349 },
  { title: 'Starlight Echoes', artist: 'Nova', duration: 267, freq: 392 },
  { title: 'Velocity', artist: 'Turbo Kid', duration: 189, freq: 587 },
  { title: 'Ocean Waves', artist: 'Deep Blue', duration: 278, freq: 330 },
];

// ============================================================
// STATE
// ============================================================
let currentTrackIdx = -1;
let isPlaying = false;
let volume = 0.7;
let prevVolume = 0.7;
let isMuted = false;
let currentTimeMs = 0;
let animationFrame = null;

// Web Audio API
let audioCtx = null;
let oscillator = null;
let gainNode = null;
let analyser = null;

// DOM
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');
const muteBtn = document.getElementById('muteBtn');
const playlistEl = document.getElementById('playlist');
const canvas = document.getElementById('waveform');
const ctx = canvas.getContext('2d');

// ============================================================
// AUDIO ENGINE (Oscillator-based demo)
// ============================================================
function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  gainNode = audioCtx.createGain();
  gainNode.gain.value = volume;
  gainNode.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function playTrack(idx) {
  initAudio();
  stopAudio();

  currentTrackIdx = idx;
  const track = TRACKS[idx];
  currentTimeMs = 0;

  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  totalTimeEl.textContent = formatTime(track.duration);

  // Create oscillator (simulates audio source)
  oscillator = audioCtx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = track.freq;
  oscillator.connect(gainNode);
  oscillator.start();

  isPlaying = true;
  playBtn.textContent = '⏸';
  lastTimestamp = performance.now();
  tick();
  renderPlaylist();
}

function stopAudio() {
  if (oscillator) {
    try { oscillator.stop(); } catch (e) {}
    oscillator.disconnect();
    oscillator = null;
  }
  if (animationFrame) cancelAnimationFrame(animationFrame);
}

function togglePlay() {
  if (currentTrackIdx === -1) { playTrack(0); return; }

  if (isPlaying) {
    isPlaying = false;
    playBtn.textContent = '▶';
    if (oscillator) {
      try { oscillator.stop(); } catch (e) {}
      oscillator.disconnect();
      oscillator = null;
    }
  } else {
    initAudio();
    const track = TRACKS[currentTrackIdx];
    oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = track.freq;
    oscillator.connect(gainNode);
    oscillator.start();
    isPlaying = true;
    playBtn.textContent = '⏸';
    lastTimestamp = performance.now();
    tick();
  }
}

// ============================================================
// PROGRESS & TIMING
// ============================================================
let lastTimestamp = 0;

function tick() {
  if (!isPlaying) return;
  const now = performance.now();
  currentTimeMs += (now - lastTimestamp) / 1000;
  lastTimestamp = now;

  const track = TRACKS[currentTrackIdx];
  if (currentTimeMs >= track.duration) {
    // Auto-next
    nextTrack();
    return;
  }

  const pct = (currentTimeMs / track.duration) * 100;
  progressFill.style.width = pct + '%';
  currentTimeEl.textContent = formatTime(Math.floor(currentTimeMs));

  drawWaveform();
  animationFrame = requestAnimationFrame(tick);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

// ============================================================
// WAVEFORM VISUALIZATION
// ============================================================
function drawWaveform() {
  if (!analyser) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, w, h);

  // Gradient bars
  const barWidth = (w / bufferLength) * 2.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * h * 0.8;

    const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
    gradient.addColorStop(0, 'rgba(233, 69, 96, 0.8)');
    gradient.addColorStop(0.5, 'rgba(233, 69, 96, 0.4)');
    gradient.addColorStop(1, 'rgba(83, 52, 131, 0.2)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);

    // Mirror reflection
    ctx.fillStyle = 'rgba(233, 69, 96, 0.1)';
    ctx.fillRect(x, h, barWidth - 1, barHeight * 0.3);

    x += barWidth;
    if (x > w) break;
  }
}

// ============================================================
// CONTROLS
// ============================================================
function nextTrack() {
  stopAudio();
  const next = (currentTrackIdx + 1) % TRACKS.length;
  playTrack(next);
}

function prevTrack() {
  stopAudio();
  if (currentTimeMs > 3) {
    playTrack(currentTrackIdx); // restart current if >3s in
  } else {
    const prev = (currentTrackIdx - 1 + TRACKS.length) % TRACKS.length;
    playTrack(prev);
  }
}

playBtn.addEventListener('click', togglePlay);
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);

// Seek
progressBar.addEventListener('click', (e) => {
  if (currentTrackIdx === -1) return;
  const rect = progressBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  currentTimeMs = pct * TRACKS[currentTrackIdx].duration;
  progressFill.style.width = (pct * 100) + '%';
  currentTimeEl.textContent = formatTime(Math.floor(currentTimeMs));
});

// Volume
volumeSlider.addEventListener('input', () => {
  volume = parseFloat(volumeSlider.value);
  isMuted = volume === 0;
  muteBtn.textContent = volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';
  if (gainNode) gainNode.gain.value = volume;
});

muteBtn.addEventListener('click', () => {
  if (isMuted) {
    volume = prevVolume || 0.5;
    isMuted = false;
  } else {
    prevVolume = volume;
    volume = 0;
    isMuted = true;
  }
  volumeSlider.value = volume;
  muteBtn.textContent = isMuted ? '🔇' : volume < 0.5 ? '🔉' : '🔊';
  if (gainNode) gainNode.gain.value = volume;
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.key) {
    case ' ': e.preventDefault(); togglePlay(); break;
    case 'ArrowRight':
      e.preventDefault();
      if (currentTrackIdx >= 0) { currentTimeMs = Math.min(currentTimeMs + 5, TRACKS[currentTrackIdx].duration); }
      break;
    case 'ArrowLeft':
      e.preventDefault();
      currentTimeMs = Math.max(0, currentTimeMs - 5);
      break;
    case 'ArrowUp': e.preventDefault(); volume = Math.min(1, volume + 0.1); volumeSlider.value = volume; if (gainNode) gainNode.gain.value = volume; break;
    case 'ArrowDown': e.preventDefault(); volume = Math.max(0, volume - 0.1); volumeSlider.value = volume; if (gainNode) gainNode.gain.value = volume; break;
    case 'm': case 'M': muteBtn.click(); break;
    case 'n': case 'N': nextTrack(); break;
    case 'p': case 'P': prevTrack(); break;
  }
});

// ============================================================
// PLAYLIST RENDER
// ============================================================
function renderPlaylist() {
  const header = playlistEl.querySelector('.playlist-header');
  playlistEl.innerHTML = '';
  playlistEl.appendChild(header);

  TRACKS.forEach((track, idx) => {
    const item = document.createElement('div');
    item.className = 'playlist-item' + (idx === currentTrackIdx ? ' active' : '');
    item.innerHTML = `
      <span class="track-num">${idx === currentTrackIdx && isPlaying ? '♫' : idx + 1}</span>
      <div class="track-details">
        <div class="pl-title">${track.title}</div>
        <div class="pl-artist">${track.artist}</div>
      </div>
      <span class="pl-duration">${formatTime(track.duration)}</span>
    `;
    item.addEventListener('click', () => { stopAudio(); playTrack(idx); });
    playlistEl.appendChild(item);
  });
}

// Initial render
renderPlaylist();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Apple FE interviews value **polished, pixel-perfect UI** with smooth interactions
- **Web Audio API**: AudioContext → Oscillator → GainNode → AnalyserNode chain
- Canvas waveform: `getByteFrequencyData()` → draw gradient bars per frequency bin
- `devicePixelRatio` scaling for crisp canvas on Retina displays
- Progress bar seek: `(clientX - rect.left) / rect.width` → time position
- Previous track logic: if >3s into song, restart; else go to prior track (standard behavior)
- requestAnimationFrame for smooth progress updates synchronized with visualization
- Volume icon changes dynamically based on level: 🔇/🔉/🔊

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS Fundamentals, Async |
| Coding 1 | Medium | DOM, CSS Animation |
| Coding 2 | Hard | Web Audio API, Canvas, Player State Machine |
| Coding 3 | Medium-Hard | Performance, Memory Management |
| Manager | Medium | Culture Fit, Design Thinking |
