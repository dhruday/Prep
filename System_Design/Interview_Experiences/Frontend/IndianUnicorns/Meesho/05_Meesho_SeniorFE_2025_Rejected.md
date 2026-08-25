# Meesho — Senior Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/meesho-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Build a Social Commerce Share Card Generator
- Select product → generate shareable card image
- Card templates with customizable text, price, discount
- Add reseller's own WhatsApp watermark
- Download as image (Canvas → PNG)
- Multiple card sizes (WhatsApp status, Instagram story, Square)
- Text overlay with automatic font sizing

```javascript
/**
 * Social Commerce Share Card Generator:
 * - Product → shareable image card
 * - Templates for WhatsApp/Instagram
 * - Canvas-based rendering with text overlay
 * - Reseller branding (WhatsApp number, shop name)
 * - Download as PNG
 */
class ShareCardGenerator {
  constructor(container) {
    this.container = container;
    this.product = null;
    this.template = 'whatsapp'; // 'whatsapp' | 'instagram' | 'square'
    this.branding = { shopName: '', whatsapp: '' };
    this.canvas = null;
    this.ctx = null;
    
    this.templates = {
      whatsapp: { width: 800, height: 800, label: 'WhatsApp' },
      instagram: { width: 1080, height: 1920, label: 'Instagram Story' },
      square: { width: 1080, height: 1080, label: 'Square Post' }
    };
    
    this.render();
  }
  
  setProduct(product) {
    // product: { name, price, originalPrice, discount, image, description, category }
    this.product = product;
    this.generateCard();
  }
  
  setBranding(branding) {
    this.branding = { ...this.branding, ...branding };
    if (this.product) this.generateCard();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="card-generator">
        <div class="controls">
          <fieldset>
            <legend>Template Size</legend>
            ${Object.entries(this.templates).map(([key, tmpl]) => `
              <label>
                <input type="radio" name="template" value="${key}" 
                       ${this.template === key ? 'checked' : ''}>
                ${tmpl.label} (${tmpl.width}×${tmpl.height})
              </label>
            `).join('')}
          </fieldset>
          
          <fieldset>
            <legend>Your Branding</legend>
            <label>Shop Name
              <input type="text" id="shop-name" value="${this.sanitize(this.branding.shopName)}" 
                     placeholder="My Shop">
            </label>
            <label>WhatsApp Number
              <input type="tel" id="whatsapp" value="${this.sanitize(this.branding.whatsapp)}"
                     placeholder="+91 XXXXX XXXXX">
            </label>
          </fieldset>
          
          <button id="btn-download" ${!this.product ? 'disabled' : ''}>📥 Download Card</button>
        </div>
        
        <div class="preview">
          <canvas id="card-canvas" style="max-width:100%; border:1px solid #e5e7eb"></canvas>
          ${!this.product ? '<p class="hint">Select a product to generate card</p>' : ''}
        </div>
      </div>
    `;
    
    this.canvas = this.container.querySelector('#card-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Template change
    this.container.querySelectorAll('input[name="template"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.template = radio.value;
        if (this.product) this.generateCard();
      });
    });
    
    // Branding inputs
    this.container.querySelector('#shop-name')?.addEventListener('input', (e) => {
      this.branding.shopName = e.target.value;
      if (this.product) this.generateCard();
    });
    this.container.querySelector('#whatsapp')?.addEventListener('input', (e) => {
      this.branding.whatsapp = e.target.value;
      if (this.product) this.generateCard();
    });
    
    // Download
    this.container.querySelector('#btn-download')?.addEventListener('click', () => {
      this.downloadCard();
    });
    
    if (this.product) this.generateCard();
  }
  
  async generateCard() {
    const tmpl = this.templates[this.template];
    this.canvas.width = tmpl.width;
    this.canvas.height = tmpl.height;
    
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    // Product image
    try {
      const img = await this.loadImage(this.product.image);
      const imgSize = Math.min(w * 0.8, h * 0.45);
      const imgX = (w - imgSize) / 2;
      const imgY = h * 0.08;
      
      // White card background for image
      ctx.fillStyle = '#fff';
      this.roundRect(ctx, imgX - 10, imgY - 10, imgSize + 20, imgSize + 20, 12);
      ctx.fill();
      
      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
      ctx.shadowColor = 'transparent';
    } catch (err) {
      // Placeholder if image fails
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(w * 0.1, h * 0.08, w * 0.8, h * 0.4);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Product Image', w / 2, h * 0.28);
    }
    
    // Product name
    const nameY = h * 0.58;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    const nameFontSize = this.fitText(ctx, this.product.name, w * 0.85, 32, 18);
    ctx.font = `bold ${nameFontSize}px -apple-system, sans-serif`;
    this.wrapText(ctx, this.product.name, w / 2, nameY, w * 0.85, nameFontSize * 1.3);
    
    // Price section
    const priceY = h * 0.72;
    
    // Original price (strikethrough)
    if (this.product.originalPrice && this.product.originalPrice > this.product.price) {
      ctx.font = '22px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      const origText = `₹${this.product.originalPrice.toLocaleString('en-IN')}`;
      const origWidth = ctx.measureText(origText).width;
      ctx.fillText(origText, w / 2 - 60, priceY);
      
      // Strikethrough line
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 60 - origWidth / 2, priceY - 4);
      ctx.lineTo(w / 2 - 60 + origWidth / 2, priceY - 4);
      ctx.stroke();
    }
    
    // Sale price
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 48px -apple-system, sans-serif';
    ctx.fillText(`₹${this.product.price.toLocaleString('en-IN')}`, w / 2, priceY + 50);
    
    // Discount badge
    if (this.product.discount) {
      const badgeX = w / 2 + 100;
      const badgeY = priceY + 30;
      ctx.fillStyle = '#ef4444';
      this.roundRect(ctx, badgeX, badgeY, 80, 30, 15);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`${this.product.discount}% OFF`, badgeX + 40, badgeY + 20);
    }
    
    // Branding footer
    if (this.branding.shopName || this.branding.whatsapp) {
      const footerY = h * 0.88;
      
      // Semi-transparent footer bar
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, footerY - 15, w, h - footerY + 30);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      
      if (this.branding.shopName) {
        ctx.fillText(this.branding.shopName, w / 2, footerY + 10);
      }
      if (this.branding.whatsapp) {
        ctx.font = '16px sans-serif';
        ctx.fillText(`📱 ${this.branding.whatsapp}`, w / 2, footerY + 35);
      }
    }
    
    // Watermark
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Made with Meesho', w - 20, h - 15);
  }
  
  /**
   * Find largest font size that fits text within maxWidth.
   * Binary search between minSize and maxSize.
   */
  fitText(ctx, text, maxWidth, maxSize, minSize) {
    let size = maxSize;
    while (size > minSize) {
      ctx.font = `bold ${size}px sans-serif`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    return size;
  }
  
  /**
   * Word-wrap text on canvas.
   */
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }
  
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  
  downloadCard() {
    const link = document.createElement('a');
    link.download = `${this.product?.name || 'card'}_${this.template}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
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
- Meesho FE = **Social commerce share card generator — Canvas image generation + download**
- **Canvas to PNG**: `canvas.toDataURL('image/png')` → `<a download>` click — no server needed
- **Text auto-sizing**: binary search between min/max font size — `measureText().width <= maxWidth`
- **Word wrap**: split by spaces, accumulate until `measureText > maxWidth` — then break line
- **Gradient background**: `createLinearGradient` + `addColorStop` — brand-appropriate visuals
- **roundRect**: `quadraticCurveTo` at corners — CSS border-radius equivalent for Canvas
- **Cross-origin images**: `img.crossOrigin = 'anonymous'` — required for `toDataURL` to work
- **Rejection reason**: machine coding was fine but struggled with JavaScript closures + async deep dive in technical round
- Meesho FE = **social commerce** — share cards, WhatsApp integration, reseller tools

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Canvas, Image Generation |
| Technical | Hard | JS Deep Dive, Closures |
| HM | Medium | Culture Fit |
