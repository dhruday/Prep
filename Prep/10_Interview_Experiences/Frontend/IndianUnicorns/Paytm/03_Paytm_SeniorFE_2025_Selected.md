# Paytm — Senior Frontend Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/paytm-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Build a QR Code Scanner + Payment UI** (Paytm-style)
- Camera access: scan QR code using `getUserMedia` + canvas
- Parse QR data: extract UPI ID, amount, merchant name
- Payment form: amount (pre-filled or editable), UPI PIN input
- Transaction status: processing → success/failed animation
- Fallback: manual UPI ID entry if camera not available

### 💡 QR Scanner + Payment UI

```javascript
class QRPayment {
  constructor(container) {
    this.container = container;
    this.state = 'scan'; // scan | form | processing | success | failed
    this.scannedData = null;
    this.videoStream = null;
    
    this.render();
  }
  
  render() {
    switch (this.state) {
      case 'scan': this.renderScanner(); break;
      case 'form': this.renderPaymentForm(); break;
      case 'processing': this.renderProcessing(); break;
      case 'success': this.renderSuccess(); break;
      case 'failed': this.renderFailed(); break;
    }
  }
  
  renderScanner() {
    this.container.innerHTML = `
      <div class="qr-scanner" role="region" aria-label="QR Code Scanner">
        <h2>Scan & Pay</h2>
        <div class="camera-viewport">
          <video id="qr-video" autoplay playsinline muted></video>
          <canvas id="qr-canvas" hidden></canvas>
          <div class="scan-overlay">
            <div class="scan-frame" aria-hidden="true"></div>
            <p>Point camera at QR code</p>
          </div>
        </div>
        <div class="scanner-actions">
          <button class="btn-manual">Enter UPI ID manually</button>
        </div>
      </div>
    `;
    
    this.container.querySelector('.btn-manual').addEventListener('click', () => {
      this.stopCamera();
      this.scannedData = {};
      this.state = 'form';
      this.render();
    });
    
    this.startCamera();
  }
  
  async startCamera() {
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Rear camera
      });
      
      const video = this.container.querySelector('#qr-video');
      video.srcObject = this.videoStream;
      
      // Start scanning frames
      this.scanInterval = setInterval(() => this.scanFrame(), 250); // 4 FPS scanning
      
    } catch (err) {
      // Camera not available: show manual entry
      console.warn('Camera access denied:', err.message);
      this.container.querySelector('.camera-viewport').innerHTML = `
        <div class="camera-error" role="alert">
          <p>📷 Camera not available</p>
          <p>Please enter UPI ID manually</p>
        </div>
      `;
    }
  }
  
  scanFrame() {
    const video = this.container.querySelector('#qr-video');
    const canvas = this.container.querySelector('#qr-canvas');
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // In production: use jsQR or ZXing library
    // const code = jsQR(imageData.data, imageData.width, imageData.height);
    // Simulated for interview:
    const code = this.mockQRDecode(imageData);
    
    if (code) {
      clearInterval(this.scanInterval);
      this.stopCamera();
      this.processQRData(code.data);
    }
  }
  
  processQRData(rawData) {
    // UPI QR format: upi://pay?pa=merchant@upi&pn=MerchantName&am=100&tn=Payment
    try {
      const url = new URL(rawData);
      
      if (url.protocol !== 'upi:') {
        throw new Error('Not a UPI QR code');
      }
      
      this.scannedData = {
        upiId: url.searchParams.get('pa') || '',
        merchantName: url.searchParams.get('pn') || 'Unknown Merchant',
        amount: url.searchParams.get('am') || '',
        transactionNote: url.searchParams.get('tn') || '',
        merchantCode: url.searchParams.get('mc') || ''
      };
      
      this.state = 'form';
      this.render();
      
    } catch (err) {
      // Not a valid UPI QR — show error and retry
      alert('Invalid QR code. Please scan a UPI payment QR code.');
      this.state = 'scan';
      this.render();
    }
  }
  
  renderPaymentForm() {
    const data = this.scannedData;
    const isAmountLocked = !!data.amount; // Pre-filled from QR
    
    this.container.innerHTML = `
      <div class="payment-form" role="form" aria-label="Payment form">
        <h2>Pay ${data.merchantName ? `to ${this._sanitize(data.merchantName)}` : ''}</h2>
        
        <div class="form-group">
          <label for="upi-id">UPI ID</label>
          <input id="upi-id" type="text" value="${this._sanitize(data.upiId || '')}" 
                 ${data.upiId ? 'readonly' : ''} 
                 placeholder="merchant@bank" 
                 pattern="[a-zA-Z0-9._-]+@[a-zA-Z]+"
                 required aria-required="true">
        </div>
        
        <div class="form-group amount-group">
          <label for="amount">Amount (₹)</label>
          <input id="amount" type="number" 
                 value="${data.amount || ''}" 
                 ${isAmountLocked ? 'readonly' : ''}
                 min="1" max="100000" step="0.01"
                 placeholder="Enter amount"
                 required aria-required="true"
                 inputmode="decimal">
        </div>
        
        <div class="form-group">
          <label for="note">Note (optional)</label>
          <input id="note" type="text" value="${this._sanitize(data.transactionNote || '')}" 
                 placeholder="Payment for..." maxlength="50">
        </div>
        
        <div class="upi-pin-group">
          <label>UPI PIN</label>
          <div class="pin-inputs" role="group" aria-label="Enter UPI PIN">
            ${Array.from({ length: 6 }, (_, i) => `
              <input type="password" class="pin-digit" maxlength="1" data-index="${i}"
                     inputmode="numeric" pattern="[0-9]" 
                     aria-label="PIN digit ${i + 1}"
                     autocomplete="off">
            `).join('')}
          </div>
        </div>
        
        <div class="form-errors" role="alert" aria-live="assertive"></div>
        
        <button class="btn-pay" disabled>Pay ₹${data.amount || '0'}</button>
        <button class="btn-back">← Back</button>
      </div>
    `;
    
    this.setupPinInput();
    this.setupFormValidation();
    
    this.container.querySelector('.btn-back').addEventListener('click', () => {
      this.state = 'scan';
      this.render();
    });
  }
  
  setupPinInput() {
    const pinInputs = this.container.querySelectorAll('.pin-digit');
    
    pinInputs.forEach((input, i) => {
      input.addEventListener('input', (e) => {
        // Only allow digits
        e.target.value = e.target.value.replace(/\D/g, '');
        
        // Auto-advance to next input
        if (e.target.value && i < pinInputs.length - 1) {
          pinInputs[i + 1].focus();
        }
        
        this.validateForm();
      });
      
      input.addEventListener('keydown', (e) => {
        // Backspace: clear and go to previous
        if (e.key === 'Backspace' && !e.target.value && i > 0) {
          pinInputs[i - 1].focus();
          pinInputs[i - 1].value = '';
        }
      });
      
      // Paste: distribute digits across inputs
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        
        for (let j = 0; j < Math.min(paste.length, pinInputs.length - i); j++) {
          pinInputs[i + j].value = paste[j];
        }
        
        const lastFilled = Math.min(i + paste.length, pinInputs.length) - 1;
        pinInputs[lastFilled].focus();
        this.validateForm();
      });
    });
  }
  
  setupFormValidation() {
    const amountInput = this.container.querySelector('#amount');
    const payBtn = this.container.querySelector('.btn-pay');
    
    amountInput.addEventListener('input', () => {
      payBtn.textContent = `Pay ₹${amountInput.value || '0'}`;
      this.validateForm();
    });
    
    payBtn.addEventListener('click', () => this.processPayment());
  }
  
  validateForm() {
    const upiId = this.container.querySelector('#upi-id').value;
    const amount = parseFloat(this.container.querySelector('#amount').value);
    const pin = Array.from(this.container.querySelectorAll('.pin-digit'))
      .map(i => i.value).join('');
    
    const isValid = 
      upiId.match(/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/) &&
      amount > 0 && amount <= 100000 &&
      pin.length >= 4; // UPI PIN is 4 or 6 digits
    
    this.container.querySelector('.btn-pay').disabled = !isValid;
  }
  
  async processPayment() {
    this.state = 'processing';
    this.render();
    
    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Simulate 90% success rate
      if (Math.random() < 0.9) {
        this.state = 'success';
      } else {
        this.state = 'failed';
      }
    } catch {
      this.state = 'failed';
    }
    
    this.render();
  }
  
  renderProcessing() {
    this.container.innerHTML = `
      <div class="processing" role="status" aria-label="Processing payment">
        <div class="spinner-large" aria-hidden="true"></div>
        <p>Processing your payment...</p>
        <p class="processing-note">Please do not close this page</p>
      </div>
    `;
  }
  
  renderSuccess() {
    this.container.innerHTML = `
      <div class="success" role="alert">
        <div class="success-icon" aria-hidden="true">✓</div>
        <h2>Payment Successful!</h2>
        <p class="amount">₹${this.scannedData.amount}</p>
        <p>Paid to ${this._sanitize(this.scannedData.merchantName || this.scannedData.upiId)}</p>
        <button class="btn-done">Done</button>
      </div>
    `;
    
    this.container.querySelector('.btn-done').addEventListener('click', () => {
      this.state = 'scan';
      this.render();
    });
  }
  
  renderFailed() {
    this.container.innerHTML = `
      <div class="failed" role="alert">
        <div class="failed-icon" aria-hidden="true">✗</div>
        <h2>Payment Failed</h2>
        <p>Something went wrong. Please try again.</p>
        <button class="btn-retry">Retry</button>
        <button class="btn-back-home">Back to Home</button>
      </div>
    `;
    
    this.container.querySelector('.btn-retry').addEventListener('click', () => {
      this.state = 'form';
      this.render();
    });
    this.container.querySelector('.btn-back-home').addEventListener('click', () => {
      this.state = 'scan';
      this.render();
    });
  }
  
  stopCamera() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- Paytm FE = **QR Scanner + UPI Flow + Camera API + PIN Input**
- **`getUserMedia`**: request rear camera with `{ facingMode: 'environment' }`, handle denial gracefully
- **QR scanning loop**: draw video frame to canvas every 250ms → decode using jsQR library
- **UPI QR format**: `upi://pay?pa=merchant@upi&pn=Name&am=100&tn=Note` — standard URL format
- **PIN input UX**: auto-advance on digit, backspace goes back, paste distributes across inputs
- **State machine**: scan → form → processing → success/failed — clear transitions
- **Camera cleanup**: `stream.getTracks().forEach(track => track.stop())` — stop camera when leaving scanner
- Paytm interviews: **fintech UX** — know UPI flows, QR codes, security considerations

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | QR Scanner, Camera API, UPI Flow |
| Technical | Medium-Hard | React, Performance |
| HM | Medium | Culture Fit |
