# Netflix — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior UI Engineer |
| **Level** | L5 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Los Gatos, CA (Remote) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 2 Technical + System Design + Culture)
- **Timeline:** 3 weeks

---

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Implement a Lazy Image Loader** with IntersectionObserver, placeholder, error handling
2. **Follow-up: Progressive image loading (blur-up technique)**

### 💡 Interview-Ready Answer

```javascript
class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: options.rootMargin || '200px 0px', // Start loading 200px before visible
      threshold: options.threshold || 0.01,
      placeholder: options.placeholder || 'data:image/svg+xml,...', // Gray box SVG
      blurUp: options.blurUp ?? true, // Progressive blur-up effect
      retries: options.retries || 2,
    };
    
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      { rootMargin: this.options.rootMargin, threshold: this.options.threshold }
    );
    
    this.loadingImages = new WeakSet();
  }
  
  observe(container = document) {
    const images = container.querySelectorAll('img[data-src]');
    images.forEach(img => {
      // Set placeholder
      if (!img.src) img.src = this.options.placeholder;
      img.style.filter = 'blur(10px)';
      img.style.transition = 'filter 0.3s ease';
      
      // Set low-quality preview if available
      if (this.options.blurUp && img.dataset.preview) {
        img.src = img.dataset.preview; // Tiny ~1KB base64 image
      }
      
      this.observer.observe(img);
    });
  }
  
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target);
        this.observer.unobserve(entry.target);
      }
    });
  }
  
  loadImage(img, attempt = 0) {
    if (this.loadingImages.has(img)) return;
    this.loadingImages.add(img);
    
    const highResSrc = img.dataset.src;
    const srcset = img.dataset.srcset; // Responsive images
    
    // Preload in background
    const preloader = new Image();
    
    preloader.onload = () => {
      img.src = highResSrc;
      if (srcset) img.srcset = srcset;
      
      // Remove blur effect (blur-up transition)
      requestAnimationFrame(() => {
        img.style.filter = 'blur(0)';
      });
      
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');
      img.removeAttribute('data-preview');
      this.loadingImages.delete(img);
      
      img.dispatchEvent(new CustomEvent('lazyloaded'));
    };
    
    preloader.onerror = () => {
      this.loadingImages.delete(img);
      
      if (attempt < this.options.retries) {
        // Retry with exponential backoff
        setTimeout(() => this.loadImage(img, attempt + 1), 1000 * Math.pow(2, attempt));
      } else {
        // Show error state
        img.src = this.options.placeholder;
        img.alt = `Failed to load: ${img.alt || 'image'}`;
        img.style.filter = 'grayscale(1) opacity(0.5)';
        img.dispatchEvent(new CustomEvent('lazyerror'));
      }
    };
    
    preloader.src = highResSrc;
  }
  
  // Add new images dynamically (SPA navigation)
  refresh(container) {
    this.observe(container);
  }
  
  destroy() {
    this.observer.disconnect();
  }
}

// Integration with React
function useLazyImage(src, previewSrc) {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const preloader = new Image();
          preloader.onload = () => {
            img.src = src;
            setLoaded(true);
          };
          preloader.src = src;
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    
    observer.observe(img);
    return () => observer.disconnect();
  }, [src]);
  
  return { imgRef, loaded };
}
```

---

## Round 2: Technical 1
**Duration:** 60 minutes

### Questions Asked
1. **Build a Video Player Controls Component**
   - Play/pause, seek bar, volume, speed control, fullscreen, keyboard shortcuts
   - Must handle buffering states gracefully

### 💡 Video Player Controls

```javascript
class VideoPlayer {
  constructor(container, videoSrc) {
    this.container = container;
    
    container.innerHTML = `
      <div class="video-wrapper" tabindex="0" role="application" 
           aria-label="Video player">
        <video src="${videoSrc}" preload="metadata"></video>
        
        <div class="controls" role="toolbar" aria-label="Video controls">
          <button class="play-btn" aria-label="Play">▶</button>
          
          <div class="progress-bar" role="slider" aria-label="Seek"
               aria-valuemin="0" aria-valuenow="0" aria-valuemax="100"
               tabindex="0">
            <div class="buffered"></div>
            <div class="progress"></div>
            <div class="scrubber"></div>
            <div class="hover-time" hidden></div>
          </div>
          
          <span class="time-display" aria-live="off">0:00 / 0:00</span>
          
          <div class="volume-control">
            <button class="mute-btn" aria-label="Mute">🔊</button>
            <input type="range" class="volume-slider" min="0" max="1" step="0.05"
                   value="1" aria-label="Volume" />
          </div>
          
          <select class="speed-select" aria-label="Playback speed">
            <option value="0.5">0.5x</option>
            <option value="1" selected>1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
          
          <button class="fullscreen-btn" aria-label="Enter fullscreen">⛶</button>
        </div>
        
        <div class="loading-spinner" hidden>
          <div class="spinner"></div>
        </div>
      </div>
    `;
    
    this.video = container.querySelector('video');
    this.setupEvents();
    this.setupKeyboard();
  }
  
  setupEvents() {
    const playBtn = this.container.querySelector('.play-btn');
    const progressBar = this.container.querySelector('.progress-bar');
    const volumeSlider = this.container.querySelector('.volume-slider');
    const muteBtn = this.container.querySelector('.mute-btn');
    const speedSelect = this.container.querySelector('.speed-select');
    const fullscreenBtn = this.container.querySelector('.fullscreen-btn');
    const spinner = this.container.querySelector('.loading-spinner');
    
    // Play/Pause
    playBtn.addEventListener('click', () => this.togglePlay());
    this.video.addEventListener('click', () => this.togglePlay());
    
    this.video.addEventListener('play', () => {
      playBtn.textContent = '⏸';
      playBtn.setAttribute('aria-label', 'Pause');
    });
    this.video.addEventListener('pause', () => {
      playBtn.textContent = '▶';
      playBtn.setAttribute('aria-label', 'Play');
    });
    
    // Progress bar
    this.video.addEventListener('timeupdate', () => {
      const pct = (this.video.currentTime / this.video.duration) * 100;
      this.container.querySelector('.progress').style.width = `${pct}%`;
      progressBar.setAttribute('aria-valuenow', Math.round(pct));
      this.updateTimeDisplay();
    });
    
    // Buffered indicator
    this.video.addEventListener('progress', () => {
      if (this.video.buffered.length > 0) {
        const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
        const pct = (bufferedEnd / this.video.duration) * 100;
        this.container.querySelector('.buffered').style.width = `${pct}%`;
      }
    });
    
    // Seek on click
    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      this.video.currentTime = pct * this.video.duration;
    });
    
    // Hover time preview
    progressBar.addEventListener('mousemove', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const time = pct * this.video.duration;
      const hoverTime = this.container.querySelector('.hover-time');
      hoverTime.textContent = this.formatTime(time);
      hoverTime.style.left = `${e.clientX - rect.left}px`;
      hoverTime.hidden = false;
    });
    progressBar.addEventListener('mouseleave', () => {
      this.container.querySelector('.hover-time').hidden = true;
    });
    
    // Volume
    volumeSlider.addEventListener('input', (e) => {
      this.video.volume = e.target.value;
      this.updateMuteIcon();
    });
    muteBtn.addEventListener('click', () => {
      this.video.muted = !this.video.muted;
      this.updateMuteIcon();
    });
    
    // Speed
    speedSelect.addEventListener('change', (e) => {
      this.video.playbackRate = parseFloat(e.target.value);
    });
    
    // Fullscreen
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    
    // Buffering state
    this.video.addEventListener('waiting', () => spinner.hidden = false);
    this.video.addEventListener('canplay', () => spinner.hidden = true);
    
    // Auto-hide controls
    let hideTimeout;
    this.container.addEventListener('mousemove', () => {
      this.container.querySelector('.controls').style.opacity = '1';
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (!this.video.paused) {
          this.container.querySelector('.controls').style.opacity = '0';
        }
      }, 3000);
    });
  }
  
  setupKeyboard() {
    this.container.querySelector('.video-wrapper').addEventListener('keydown', (e) => {
      switch (e.key) {
        case ' ':
        case 'k': e.preventDefault(); this.togglePlay(); break;
        case 'ArrowRight': this.video.currentTime += 10; break; // Skip 10s
        case 'ArrowLeft': this.video.currentTime -= 10; break;
        case 'ArrowUp': e.preventDefault(); this.video.volume = Math.min(1, this.video.volume + 0.1); break;
        case 'ArrowDown': e.preventDefault(); this.video.volume = Math.max(0, this.video.volume - 0.1); break;
        case 'f': this.toggleFullscreen(); break;
        case 'm': this.video.muted = !this.video.muted; this.updateMuteIcon(); break;
        case 'j': this.video.currentTime -= 10; break; // YouTube-style
        case 'l': this.video.currentTime += 10; break;
      }
    });
  }
  
  togglePlay() {
    if (this.video.paused) this.video.play();
    else this.video.pause();
  }
  
  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else this.container.querySelector('.video-wrapper').requestFullscreen();
  }
  
  updateMuteIcon() {
    const btn = this.container.querySelector('.mute-btn');
    if (this.video.muted || this.video.volume === 0) btn.textContent = '🔇';
    else if (this.video.volume < 0.5) btn.textContent = '🔉';
    else btn.textContent = '🔊';
  }
  
  updateTimeDisplay() {
    const current = this.formatTime(this.video.currentTime);
    const total = this.formatTime(this.video.duration);
    this.container.querySelector('.time-display').textContent = `${current} / ${total}`;
  }
  
  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
```

---

## 🎯 Key Takeaways
- Netflix FE = **video player, images, performance** — core streaming UI expertise
- **Lazy loading with blur-up** = IntersectionObserver + tiny preview image → high-res crossfade
- **Video player**: buffer indicator, hover time preview, auto-hide controls, keyboard shortcuts
- `waiting` event for buffering spinner, `canplay` to hide it — critical UX for streaming
- **Keyboard shortcuts** matching YouTube/Netflix conventions (Space, J/K/L, M, F)
- Netflix FE interviews test **media API depth** (buffered ranges, playbackRate, fullscreen API)
- Netflix **culture fit** round is unique — prepare "Keeper Test" and "Freedom & Responsibility" stories

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | IntersectionObserver, Blur-up, Retry |
| Technical 1 | Hard | Video API, Seek, Buffer, Keyboard |
| Technical 2 | Hard | Virtual Scrolling, React Concurrent |
| System Design | Very Hard | Netflix Browse, Streaming UI |
| Culture | Hard | Netflix Values |
