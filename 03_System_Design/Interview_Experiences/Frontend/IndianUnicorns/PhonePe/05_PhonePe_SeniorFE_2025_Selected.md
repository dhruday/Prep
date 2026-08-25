# PhonePe — Senior Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | Senior UI Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/phonepe-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Build a UPI Payment Keypad with PIN Entry + Amount Input
- Custom numeric keypad (0-9, delete, confirm)
- Amount input mode: allow decimal, max ₹1,00,000
- PIN input mode: 4 or 6 digit masked dots, no copy/paste
- Haptic feedback simulation (vibrate on each tap)
- Timer: 30 second auto-timeout for PIN entry
- Accessibility: keypad labels, focus management
- Prevent screenshot (blur on background)

```javascript
/**
 * UPI Payment Keypad:
 * - Two modes: amount entry + PIN entry
 * - Custom keypad (not native input) for security
 * - PIN masked, timer timeout, no clipboard access
 * - Indian number formatting (1,00,000)
 */
class UPIKeypad {
  constructor(container, options = {}) {
    this.container = container;
    this.mode = options.mode || 'amount'; // 'amount' | 'pin'
    this.pinLength = options.pinLength || 6;
    this.maxAmount = options.maxAmount || 10000000; // ₹1,00,000 in paise
    this.onSubmit = options.onSubmit || (() => {});
    this.onTimeout = options.onTimeout || (() => {});
    
    this.value = '';
    this.timer = null;
    this.timeLeft = 30; // seconds for PIN timeout
    this.error = null;
    
    // Security: prevent screenshots
    if (this.mode === 'pin') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.blur();
        }
      });
    }
    
    this.render();
    
    if (this.mode === 'pin') {
      this.startTimer();
    }
  }
  
  startTimer() {
    this.timeLeft = 30;
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateTimerDisplay();
      
      if (this.timeLeft <= 0) {
        this.stopTimer();
        this.value = '';
        this.onTimeout();
        this.render();
      }
    }, 1000);
  }
  
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  
  handleKeyPress(key) {
    this.error = null;
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    if (key === 'delete') {
      this.value = this.value.slice(0, -1);
    } else if (key === 'confirm') {
      this.handleConfirm();
      return;
    } else if (key === '.') {
      if (this.mode !== 'amount') return;
      if (this.value.includes('.')) return;
      if (this.value === '') this.value = '0';
      this.value += '.';
    } else {
      // Digit 0-9
      if (this.mode === 'pin') {
        if (this.value.length >= this.pinLength) return;
        this.value += key;
        
        // Auto-submit on complete PIN
        if (this.value.length === this.pinLength) {
          setTimeout(() => this.handleConfirm(), 200);
        }
      } else {
        // Amount mode
        const dotIndex = this.value.indexOf('.');
        if (dotIndex !== -1) {
          // Max 2 decimal places
          if (this.value.length - dotIndex > 2) return;
        }
        this.value += key;
        
        // Validate max amount
        const amountPaise = Math.round(parseFloat(this.value) * 100);
        if (amountPaise > this.maxAmount) {
          this.value = this.value.slice(0, -1);
          this.error = 'Maximum amount is ₹1,00,000';
        }
      }
    }
    
    this.render();
  }
  
  handleConfirm() {
    if (this.mode === 'pin') {
      if (this.value.length < this.pinLength) {
        this.error = `PIN must be ${this.pinLength} digits`;
        this.render();
        return;
      }
      this.stopTimer();
      const pin = this.value;
      this.value = ''; // Clear PIN from memory immediately
      this.onSubmit(pin);
    } else {
      const amount = parseFloat(this.value);
      if (!amount || amount <= 0) {
        this.error = 'Enter a valid amount';
        this.render();
        return;
      }
      this.onSubmit(amount);
    }
  }
  
  formatAmount(value) {
    if (!value) return '₹0';
    const num = parseFloat(value);
    if (isNaN(num)) return '₹0';
    
    // Indian number format: 1,00,000
    const [integer, decimal] = value.split('.');
    const formatted = parseInt(integer).toLocaleString('en-IN');
    return `₹${formatted}${decimal !== undefined ? '.' + decimal : ''}`;
  }
  
  renderPINDots() {
    return Array.from({ length: this.pinLength }, (_, i) => {
      const filled = i < this.value.length;
      const current = i === this.value.length;
      return `<span class="pin-dot ${filled ? 'filled' : ''} ${current ? 'current' : ''}"
                    aria-label="${filled ? 'Digit entered' : 'Empty'}">
                ${filled ? '●' : '○'}
              </span>`;
    }).join('');
  }
  
  updateTimerDisplay() {
    const timerEl = this.container.querySelector('.pin-timer');
    if (timerEl) {
      timerEl.textContent = `${this.timeLeft}s`;
      if (this.timeLeft <= 10) timerEl.classList.add('warning');
    }
  }
  
  blur() {
    // Add blur overlay when app goes to background (security)
    const overlay = this.container.querySelector('.security-overlay');
    if (overlay) overlay.hidden = false;
    this.value = ''; // Clear PIN
  }
  
  render() {
    const isPin = this.mode === 'pin';
    
    this.container.innerHTML = `
      <div class="upi-keypad ${isPin ? 'pin-mode' : 'amount-mode'}" 
           role="application" aria-label="UPI ${isPin ? 'PIN' : 'Amount'} entry">
        
        <!-- Security overlay -->
        <div class="security-overlay" hidden>
          <p>Session paused for security</p>
        </div>
        
        <!-- Display -->
        <div class="keypad-display" aria-live="polite">
          ${isPin ? `
            <p class="pin-label">Enter UPI PIN</p>
            <div class="pin-dots" aria-label="PIN progress">
              ${this.renderPINDots()}
            </div>
            <span class="pin-timer" aria-label="Time remaining">${this.timeLeft}s</span>
          ` : `
            <p class="amount-label">Enter Amount</p>
            <div class="amount-display" aria-label="Amount: ${this.formatAmount(this.value)}">
              ${this.formatAmount(this.value)}
            </div>
          `}
          ${this.error ? `<p class="keypad-error" role="alert">${this.sanitize(this.error)}</p>` : ''}
        </div>
        
        <!-- Keypad Grid -->
        <div class="keypad-grid" role="grid">
          ${this.renderKeypadButtons()}
        </div>
      </div>
    `;
    
    // Prevent paste on PIN mode
    if (isPin) {
      this.container.addEventListener('paste', (e) => e.preventDefault());
      this.container.addEventListener('copy', (e) => e.preventDefault());
    }
    
    // Attach key listeners
    this.container.querySelectorAll('.keypad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleKeyPress(btn.dataset.key);
      });
      
      // Prevent long-press context menu on mobile
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
      
      // Touch feedback
      btn.addEventListener('touchstart', () => btn.classList.add('pressed'));
      btn.addEventListener('touchend', () => btn.classList.remove('pressed'));
    });
    
    // Physical keyboard support
    this.container.addEventListener('keydown', (e) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        this.handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        this.handleKeyPress('delete');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.handleKeyPress('confirm');
      } else if (e.key === '.' && !isPin) {
        e.preventDefault();
        this.handleKeyPress('.');
      }
    });
    
    // Focus keypad for keyboard input
    this.container.querySelector('.upi-keypad').focus?.();
  }
  
  renderKeypadButtons() {
    const isPin = this.mode === 'pin';
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      [isPin ? '' : '.', '0', 'delete']
    ];
    
    return keys.map(row => `
      <div class="keypad-row" role="row">
        ${row.map(key => {
          if (key === '') return '<div class="keypad-spacer"></div>';
          
          const label = key === 'delete' ? '⌫' : key;
          const ariaLabel = key === 'delete' ? 'Delete' : `Digit ${key}`;
          
          return `
            <button class="keypad-btn ${key === 'delete' ? 'btn-delete' : ''}"
                    data-key="${key}" role="gridcell"
                    aria-label="${ariaLabel}">
              ${label}
            </button>
          `;
        }).join('')}
      </div>
    `).join('') + `
      <div class="keypad-row">
        <button class="keypad-btn btn-confirm" data-key="confirm"
                style="grid-column:1/-1"
                ${isPin && this.value.length < this.pinLength ? 'disabled' : ''}>
          ${isPin ? '✓ Confirm PIN' : `Pay ${this.formatAmount(this.value)}`}
        </button>
      </div>
    `;
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
  
  destroy() {
    this.stopTimer();
    this.value = ''; // Clear any PIN data
    this.container.innerHTML = '';
  }
}

// Usage:
const keypad = new UPIKeypad(document.getElementById('payment'), {
  mode: 'pin',
  pinLength: 6,
  onSubmit: (pin) => {
    console.log('PIN submitted (should be sent encrypted)');
    // In real app: encrypt PIN with RSA public key, send to server
  },
  onTimeout: () => {
    alert('Session timed out. Please try again.');
  }
});
```

---

## 🎯 Key Takeaways
- PhonePe FE = **UPI keypad with PIN entry, timeout, security measures**
- **Custom keypad**: button grid instead of native `<input>` — prevents keyboard snooping, paste attacks
- **PIN security**: clear from memory after submit (`this.value = ''`), prevent copy/paste, visibilitychange blur
- **30s timeout**: auto-clear PIN after 30 seconds — UPI/NPCI requirement
- **Indian number format**: `toLocaleString('en-IN')` — 1,00,000 format
- **Haptic feedback**: `navigator.vibrate(10)` — subtle confirmation on each key press
- **Auto-submit**: when PIN reaches correct length, auto-confirm after 200ms delay
- PhonePe FE = **payment UX security** — PIN handling, secure input, timeout, encryption awareness

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | UPI Keypad, Security, Timer |
| Technical | Medium-Hard | React, Performance |
| HM | Medium | Culture Fit |
