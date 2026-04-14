# Netflix — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior UI Engineer |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Remote (US) |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/Interview/Netflix-Interview-Questions-E11891.htm) |
| **Author** | Anonymous |
| **Team** | Playback Experience |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone Screen + 3 Onsite)

---

## Round 1: JavaScript + Performance
**Duration:** 60 minutes

### Questions Asked
1. **Implement `requestIdleCallback` polyfill** using `MessageChannel` + `performance.now()`
2. **Follow-up: How does React's scheduler use a similar approach?**

### 💡 requestIdleCallback Polyfill

```javascript
// requestIdleCallback polyfill using MessageChannel
// MessageChannel is used because:
// 1. Runs after the current task (microtask queue already drained)
// 2. Runs before the next frame (unlike setTimeout which has 4ms minimum)
// 3. Not throttled in background tabs (unlike setTimeout/rAF)

const rICPolyfill = (() => {
  const FRAME_BUDGET = 16; // ~60fps = 16.67ms per frame
  const callbacks = [];
  let isRunning = false;
  let nextId = 0;
  
  const channel = new MessageChannel();
  
  channel.port2.onmessage = () => {
    const frameDeadline = performance.now() + FRAME_BUDGET;
    
    while (callbacks.length > 0 && performance.now() < frameDeadline) {
      const entry = callbacks.shift();
      if (entry.cancelled) continue;
      
      const deadline = {
        didTimeout: false,
        timeRemaining() {
          return Math.max(0, frameDeadline - performance.now());
        }
      };
      
      entry.callback(deadline);
    }
    
    // If there are remaining callbacks, schedule another round
    if (callbacks.length > 0) {
      channel.port1.postMessage(null);
    } else {
      isRunning = false;
    }
  };
  
  function requestIdleCallback(callback, options = {}) {
    const id = nextId++;
    const entry = { id, callback, cancelled: false };
    
    callbacks.push(entry);
    
    if (!isRunning) {
      isRunning = true;
      channel.port1.postMessage(null);
    }
    
    // Handle timeout option
    if (options.timeout) {
      setTimeout(() => {
        const idx = callbacks.indexOf(entry);
        if (idx !== -1 && !entry.cancelled) {
          callbacks.splice(idx, 1);
          entry.callback({ didTimeout: true, timeRemaining: () => 0 });
        }
      }, options.timeout);
    }
    
    return id;
  }
  
  function cancelIdleCallback(id) {
    const entry = callbacks.find(e => e.id === id);
    if (entry) entry.cancelled = true;
  }
  
  return { requestIdleCallback, cancelIdleCallback };
})();

// React's Scheduler uses a SIMILAR approach:
// - MessageChannel for yielding (not setTimeout — avoids 4ms delay)
// - 5ms time slices (not 16ms)
// - Priority lanes: Immediate > UserBlocking > Normal > Low > Idle
// - Expiration times for each priority to prevent starvation
// - Uses `performance.now()` for shouldYield() check
```

---

## Round 2: Machine Coding
**Duration:** 90 minutes

### Challenge
**Build a Netflix-style Video Player with Adaptive UI**
- Custom controls: play/pause, seekbar, volume, fullscreen, playback speed
- Keyboard shortcuts (Space = play/pause, F = fullscreen, M = mute, ← → = seek)
- Auto-hide controls on idle (3s timeout, show on mouse move)
- Picture-in-Picture (PiP) support
- Subtitle overlay with font size adjustment
- Double-tap to seek (mobile)

### 💡 Netflix Video Player

```javascript
class NetflixPlayer {
  constructor(container, videoSrc, options = {}) {
    this.container = container;
    this.controlsTimeout = null;
    this.isControlsVisible = true;
    
    this.container.innerHTML = `
      <div class="player-wrapper" tabindex="0" role="region" aria-label="Video player">
        <video class="player-video" preload="metadata">
          <source src="${this._sanitize(videoSrc)}" type="video/mp4">
          ${options.subtitleSrc ? `<track kind="subtitles" src="${this._sanitize(options.subtitleSrc)}" 
            srclang="en" label="English" default>` : ''}
        </video>
        <div class="player-overlay">
          <div class="player-controls">
            <div class="progress-bar" role="slider" aria-label="Seek" 
                 aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
              <div class="progress-buffered"></div>
              <div class="progress-played"></div>
              <div class="progress-thumb"></div>
            </div>
            <div class="controls-row">
              <button class="btn-play" aria-label="Play">▶</button>
              <span class="time-display">0:00 / 0:00</span>
              <div class="volume-control">
                <button class="btn-mute" aria-label="Mute">🔊</button>
                <input type="range" class="volume-slider" min="0" max="1" step="0.05" 
                       value="1" aria-label="Volume">
              </div>
              <select class="speed-select" aria-label="Playback speed">
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1" selected>1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
              <button class="btn-subtitles" aria-label="Toggle subtitles" aria-pressed="true">CC</button>
              <button class="btn-pip" aria-label="Picture in Picture">⧉</button>
              <button class="btn-fullscreen" aria-label="Fullscreen">⛶</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.video = this.container.querySelector('.player-video');
    this.wrapper = this.container.querySelector('.player-wrapper');
    this.controlsEl = this.container.querySelector('.player-controls');
    
    this.setupControls();
    this.setupKeyboard();
    this.setupAutoHide();
    this.setupDoubleTapSeek();
  }
  
  setupControls() {
    const video = this.video;
    
    // Play/Pause
    this.container.querySelector('.btn-play').addEventListener('click', () => this.togglePlay());
    video.addEventListener('click', () => this.togglePlay());
    
    // Progress bar seeking
    const progressBar = this.container.querySelector('.progress-bar');
    let isSeeking = false;
    
    const seek = (e) => {
      const rect = progressBar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      video.currentTime = ratio * video.duration;
    };
    
    progressBar.addEventListener('pointerdown', (e) => {
      isSeeking = true;
      seek(e);
      progressBar.setPointerCapture(e.pointerId);
    });
    progressBar.addEventListener('pointermove', (e) => { if (isSeeking) seek(e); });
    progressBar.addEventListener('pointerup', () => { isSeeking = false; });
    
    // Volume
    const volumeSlider = this.container.querySelector('.volume-slider');
    volumeSlider.addEventListener('input', (e) => {
      video.volume = parseFloat(e.target.value);
      video.muted = video.volume === 0;
      this._updateMuteIcon();
    });
    
    this.container.querySelector('.btn-mute').addEventListener('click', () => {
      video.muted = !video.muted;
      this._updateMuteIcon();
    });
    
    // Playback speed
    this.container.querySelector('.speed-select').addEventListener('change', (e) => {
      video.playbackRate = parseFloat(e.target.value);
    });
    
    // Fullscreen
    this.container.querySelector('.btn-fullscreen').addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        this.wrapper.requestFullscreen();
      }
    });
    
    // Picture-in-Picture
    this.container.querySelector('.btn-pip').addEventListener('click', async () => {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    });
    
    // Subtitles toggle
    this.container.querySelector('.btn-subtitles').addEventListener('click', (e) => {
      const track = video.textTracks[0];
      if (track) {
        const isShowing = track.mode === 'showing';
        track.mode = isShowing ? 'hidden' : 'showing';
        e.target.setAttribute('aria-pressed', !isShowing);
      }
    });
    
    // Time update
    video.addEventListener('timeupdate', () => {
      const played = (video.currentTime / video.duration) * 100;
      this.container.querySelector('.progress-played').style.width = `${played}%`;
      this.container.querySelector('.progress-thumb').style.left = `${played}%`;
      progressBar.setAttribute('aria-valuenow', Math.round(played));
      this.container.querySelector('.time-display').textContent = 
        `${this._formatTime(video.currentTime)} / ${this._formatTime(video.duration)}`;
    });
    
    // Buffered
    video.addEventListener('progress', () => {
      if (video.buffered.length > 0) {
        const buffered = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100;
        this.container.querySelector('.progress-buffered').style.width = `${buffered}%`;
      }
    });
  }
  
  setupKeyboard() {
    this.wrapper.addEventListener('keydown', (e) => {
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); this.togglePlay(); break;
        case 'f': this.container.querySelector('.btn-fullscreen').click(); break;
        case 'm': this.container.querySelector('.btn-mute').click(); break;
        case 'ArrowRight': this.video.currentTime += 10; break;
        case 'ArrowLeft': this.video.currentTime -= 10; break;
        case 'ArrowUp': e.preventDefault(); this.video.volume = Math.min(1, this.video.volume + 0.1); break;
        case 'ArrowDown': e.preventDefault(); this.video.volume = Math.max(0, this.video.volume - 0.1); break;
      }
      this.showControls();
    });
  }
  
  setupAutoHide() {
    this.wrapper.addEventListener('pointermove', () => this.showControls());
    this.wrapper.addEventListener('pointerleave', () => this.hideControlsAfterDelay());
  }
  
  setupDoubleTapSeek() {
    let lastTap = 0;
    let tapTimeout;
    
    this.video.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        clearTimeout(tapTimeout);
        const rect = this.video.getBoundingClientRect();
        const x = e.changedTouches[0].clientX - rect.left;
        if (x < rect.width / 2) {
          this.video.currentTime -= 10; // Double-tap left = rewind 10s
        } else {
          this.video.currentTime += 10; // Double-tap right = forward 10s
        }
      }
      lastTap = now;
      tapTimeout = setTimeout(() => { lastTap = 0; }, 300);
    });
  }
  
  togglePlay() {
    if (this.video.paused) {
      this.video.play();
      this.container.querySelector('.btn-play').textContent = '⏸';
      this.container.querySelector('.btn-play').setAttribute('aria-label', 'Pause');
    } else {
      this.video.pause();
      this.container.querySelector('.btn-play').textContent = '▶';
      this.container.querySelector('.btn-play').setAttribute('aria-label', 'Play');
    }
  }
  
  showControls() {
    this.controlsEl.classList.remove('hidden');
    this.isControlsVisible = true;
    this.hideControlsAfterDelay();
  }
  
  hideControlsAfterDelay() {
    clearTimeout(this.controlsTimeout);
    if (!this.video.paused) {
      this.controlsTimeout = setTimeout(() => {
        this.controlsEl.classList.add('hidden');
        this.isControlsVisible = false;
      }, 3000);
    }
  }
  
  _formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  _updateMuteIcon() {
    const btn = this.container.querySelector('.btn-mute');
    btn.textContent = this.video.muted || this.video.volume === 0 ? '🔇' : '🔊';
  }
}
```

---

## 🎯 Key Takeaways
- Netflix = **video player UI + performance + requestIdleCallback + keyboard shortcuts**
- **requestIdleCallback polyfill**: `MessageChannel` (not setTimeout) → no 4ms delay, runs between frames
- **React's scheduler**: similar pattern, 5ms time slices, priority lanes, `shouldYield()` with `performance.now()`
- **Video player controls**: pointer events for cross-platform, `setPointerCapture` for reliable drag
- **Auto-hide**: 3s timeout on idle, show on pointer move, don't hide while paused
- **Double-tap seek**: mobile gesture, detect 300ms double-tap, left/right halves = rewind/forward
- **PiP**: `video.requestPictureInPicture()` + `document.pictureInPictureEnabled` feature detection
- Netflix UI interviews: heavy focus on **performance, streaming, and smooth interactions**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS Fundamentals |
| JS + Performance | Hard | requestIdleCallback, React Scheduler |
| Machine Coding | Hard | Custom Video Player, Keyboard, PiP |
| System Design | Medium-Hard | Streaming Architecture |
