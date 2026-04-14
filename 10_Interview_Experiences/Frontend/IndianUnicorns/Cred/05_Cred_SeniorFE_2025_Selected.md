# Cred — Senior Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | CRED |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/CRED-Interview-Questions-E3089841.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 120 minutes

### Challenge: Build an Animated Credit Card Rewards Shelf
- Horizontal scroll shelf with 3D card tilt effect (CSS perspective)
- Each card: reward name, coins needed, progress bar, claim button
- Card flip animation to reveal reward details on back
- Confetti explosion on reward claim
- Pull-to-refresh gesture (mobile-first)
- Coin balance with animated counter
- Categories filter with smooth scroll

```javascript
/**
 * Animated Credit Card Rewards Shelf:
 * - 3D card tilt effect on mousemove
 * - Card flip animation (front/back)
 * - Confetti on claim
 * - Animated coin counter
 * - Pull-to-refresh
 */
class RewardsShelf {
  constructor(container) {
    this.container = container;
    this.coins = 15000;
    this.rewards = [];
    this.category = 'all';
    this.displayCoins = 0; // For animated counter
    this.animatingCoins = false;
    
    this.render();
    this.animateCoinsTo(this.coins);
  }
  
  setRewards(rewards) {
    // rewards: [{ id, name, description, coins, category, image, claimed }]
    this.rewards = rewards;
    this.render();
  }
  
  get filteredRewards() {
    if (this.category === 'all') return this.rewards;
    return this.rewards.filter(r => r.category === this.category);
  }
  
  get categories() {
    return ['all', ...new Set(this.rewards.map(r => r.category))];
  }
  
  animateCoinsTo(target) {
    const start = this.displayCoins;
    const diff = target - start;
    const duration = 800;
    const startTime = performance.now();
    
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out: 1 - (1-t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      
      this.displayCoins = Math.round(start + diff * eased);
      
      const el = this.container.querySelector('.coin-count');
      if (el) el.textContent = this.displayCoins.toLocaleString('en-IN');
      
      if (progress < 1) requestAnimationFrame(tick);
    };
    
    requestAnimationFrame(tick);
  }
  
  render() {
    this.container.innerHTML = `
      <div class="rewards-shelf">
        <!-- Header with coin balance -->
        <header class="rewards-header">
          <h2>Rewards</h2>
          <div class="coin-balance">
            <span class="coin-icon">🪙</span>
            <span class="coin-count">${this.displayCoins.toLocaleString('en-IN')}</span>
            <span class="coin-label">coins</span>
          </div>
        </header>
        
        <!-- Category filters -->
        <nav class="category-tabs" role="tablist" aria-label="Reward categories">
          ${this.categories.map(cat => `
            <button class="cat-tab ${this.category === cat ? 'active' : ''}"
                    data-cat="${cat}" role="tab"
                    aria-selected="${this.category === cat}">
              ${cat === 'all' ? 'All' : this.sanitize(cat)}
            </button>
          `).join('')}
        </nav>
        
        <!-- Rewards scroll container -->
        <div class="rewards-scroll" style="overflow-x:auto; -webkit-overflow-scrolling:touch; perspective:1000px">
          <div class="rewards-track" style="display:flex; gap:20px; padding:20px">
            ${this.filteredRewards.map(reward => this.renderCard(reward)).join('')}
          </div>
        </div>
        
        <!-- Confetti canvas (hidden until triggered) -->
        <canvas id="confetti-canvas" style="position:fixed; top:0; left:0; width:100vw; height:100vh; pointer-events:none; z-index:100"></canvas>
      </div>
    `;
    
    this.attachListeners();
    this.setup3DTilt();
  }
  
  renderCard(reward) {
    const canClaim = this.coins >= reward.coins && !reward.claimed;
    const progress = Math.min(100, (this.coins / reward.coins) * 100);
    
    return `
      <div class="reward-card" data-id="${reward.id}"
           style="min-width:280px; height:380px; perspective:800px; flex-shrink:0">
        <div class="card-inner" style="position:relative; width:100%; height:100%; transition:transform 0.6s; transform-style:preserve-3d">
          
          <!-- Front -->
          <div class="card-front" style="position:absolute; width:100%; height:100%; backface-visibility:hidden; 
               border-radius:16px; background:linear-gradient(135deg, #1a1a2e, #16213e); color:#fff; padding:20px;
               display:flex; flex-direction:column; box-shadow:0 10px 40px rgba(0,0,0,0.3)">
            
            <div class="card-image" style="height:120px; display:flex; align-items:center; justify-content:center; font-size:48px">
              ${this.sanitize(reward.image || '🎁')}
            </div>
            
            <h3 class="card-title" style="margin:12px 0 4px; font-size:18px">${this.sanitize(reward.name)}</h3>
            
            <div class="card-coins" style="display:flex; align-items:center; gap:6px; margin:8px 0">
              <span>🪙</span>
              <span style="font-size:24px; font-weight:bold">${reward.coins.toLocaleString('en-IN')}</span>
              <span style="font-size:12px; opacity:0.6">coins</span>
            </div>
            
            <!-- Progress bar -->
            <div class="progress-bar" style="height:6px; background:rgba(255,255,255,0.2); border-radius:3px; margin:8px 0; overflow:hidden"
                 role="progressbar" aria-valuenow="${Math.round(progress)}" aria-valuemin="0" aria-valuemax="100">
              <div style="width:${progress}%; height:100%; background:linear-gradient(90deg, #fbbf24, #f59e0b); border-radius:3px; transition:width 0.5s"></div>
            </div>
            <span style="font-size:11px; opacity:0.5">${Math.round(progress)}% of required coins</span>
            
            <div style="flex:1"></div>
            
            ${reward.claimed 
              ? '<button class="btn-claimed" disabled style="opacity:0.5">✓ Claimed</button>'
              : canClaim 
                ? `<button class="btn-claim" data-id="${reward.id}">Claim Reward</button>`
                : `<button class="btn-locked" disabled>🔒 ${(reward.coins - this.coins).toLocaleString('en-IN')} more coins needed</button>`
            }
            
            <button class="btn-flip" style="position:absolute; top:10px; right:10px; background:none; border:none; color:#fff; cursor:pointer"
                    aria-label="View details">ℹ️</button>
          </div>
          
          <!-- Back -->
          <div class="card-back" style="position:absolute; width:100%; height:100%; backface-visibility:hidden;
               border-radius:16px; background:linear-gradient(135deg, #16213e, #0f3460); color:#fff; padding:20px;
               transform:rotateY(180deg); box-shadow:0 10px 40px rgba(0,0,0,0.3)">
            <h3>${this.sanitize(reward.name)}</h3>
            <p style="opacity:0.8; margin-top:12px; line-height:1.6">${this.sanitize(reward.description)}</p>
            <div style="margin-top:16px; font-size:13px; opacity:0.6">
              <p>Category: ${this.sanitize(reward.category)}</p>
              <p>Valid until: Dec 31, 2025</p>
            </div>
            <button class="btn-flip-back" style="position:absolute; bottom:20px; right:20px; background:none; border:1px solid rgba(255,255,255,0.3); color:#fff; padding:8px 16px; border-radius:8px; cursor:pointer">
              ← Back
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  attachListeners() {
    // Category filter
    this.container.querySelectorAll('.cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.category = tab.dataset.cat;
        this.render();
      });
    });
    
    // Claim reward
    this.container.querySelectorAll('.btn-claim').forEach(btn => {
      btn.addEventListener('click', () => {
        this.claimReward(btn.dataset.id);
      });
    });
    
    // Card flip
    this.container.querySelectorAll('.btn-flip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.reward-card');
        const inner = card.querySelector('.card-inner');
        inner.style.transform = 'rotateY(180deg)';
      });
    });
    
    this.container.querySelectorAll('.btn-flip-back').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.reward-card');
        const inner = card.querySelector('.card-inner');
        inner.style.transform = 'rotateY(0deg)';
      });
    });
  }
  
  /**
   * 3D tilt effect on mousemove.
   * Card tilts based on mouse position relative to card center.
   */
  setup3DTilt() {
    this.container.querySelectorAll('.reward-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate tilt: -15 to 15 degrees
        const tiltX = ((y / rect.height) - 0.5) * -15;
        const tiltY = ((x / rect.width) - 0.5) * 15;
        
        const inner = card.querySelector('.card-inner');
        const currentRotateY = inner.style.transform.includes('180') ? 180 : 0;
        inner.style.transform = `rotateY(${currentRotateY}deg) rotateX(${tiltX}deg) rotateY(${tiltY + currentRotateY}deg)`;
        inner.style.transition = 'none';
      });
      
      card.addEventListener('mouseleave', () => {
        const inner = card.querySelector('.card-inner');
        const currentRotateY = inner.style.transform.includes('180') ? 180 : 0;
        inner.style.transform = `rotateY(${currentRotateY}deg)`;
        inner.style.transition = 'transform 0.6s';
      });
    });
  }
  
  claimReward(rewardId) {
    const reward = this.rewards.find(r => r.id === rewardId);
    if (!reward || reward.claimed || this.coins < reward.coins) return;
    
    reward.claimed = true;
    this.coins -= reward.coins;
    
    this.render();
    this.animateCoinsTo(this.coins);
    this.fireConfetti();
  }
  
  /**
   * Confetti explosion using Canvas.
   * Particles: random colors, positions, velocities, gravity.
   */
  fireConfetti() {
    const canvas = this.container.querySelector('#confetti-canvas');
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    
    const particles = Array.from({ length: 100 }, () => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 1) * 15,
      size: Math.random() * 8 + 4,
      color: ['#fbbf24', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'][Math.floor(Math.random() * 5)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1
    }));
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let alive = false;
      for (const p of particles) {
        if (p.opacity <= 0) continue;
        alive = true;
        
        p.x += p.vx;
        p.vy += 0.5; // gravity
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.015;
        
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
        ctx.restore();
      }
      
      if (alive) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    
    animate();
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- CRED FE = **Animated rewards shelf with 3D tilt, card flip, confetti, coin counter**
- **3D card tilt**: `rotateX/Y` based on mouse position relative to card center — perspective on parent
- **Card flip**: `backface-visibility:hidden` + `transform:rotateY(180deg)` — two absolute-positioned faces
- **Confetti**: Canvas particles with random velocity + gravity + opacity fade — requestAnimationFrame
- **Animated counter**: ease-out `1 - (1-t)^3` interpolation — smooth coin decrease on claim
- **Horizontal scroll shelf**: `overflow-x:auto` + flex row + `min-width` per card — native scroll
- **Progress bar**: width percentage = `clamp(0, userCoins/requiredCoins * 100, 100)` — visual affordance
- CRED = **polish & animations** — they care deeply about micro-interactions, 3D effects, smooth transitions

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Very Hard | 3D CSS, Canvas Confetti, Animations |
| Technical 1 | Hard | JS Deep Dive, Performance |
| Technical 2 | Hard | React, State Management |
| HM | Medium | Culture Fit |
