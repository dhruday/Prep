# Swiggy — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (JS + Machine Coding + FE System Design + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Machine Coding — Star Rating with Review Submission

### Problem
Build a rating & review component:
- Interactive star rating (hover preview, click to set)
- Half-star support (click left half = 0.5, right half = 1.0)
- Review text with character count and minimum length validation
- Image upload preview (up to 3 images)
- Summary bar chart showing rating distribution
- Animated average score display

### 💡 Interview-Ready Answer

```javascript
class ReviewWidget {
  constructor(container, config = {}) {
    this.container = container;
    this.maxStars = config.maxStars || 5;
    this.minReviewLength = config.minLength || 20;
    this.maxReviewLength = config.maxLength || 500;
    this.maxImages = config.maxImages || 3;
    this.onSubmit = config.onSubmit || (() => {});

    this.selectedRating = 0;
    this.hoverRating = 0;
    this.reviewText = '';
    this.images = []; // { file, preview }
    this.existingReviews = config.reviews || [];

    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'review-widget';
    this.container.style.cssText = 'max-width:600px;font-family:system-ui;';

    this.renderSummary();
    this.renderRatingInput();
    this.renderTextInput();
    this.renderImageUpload();
    this.renderSubmitButton();
  }

  renderSummary() {
    if (this.existingReviews.length === 0) return;

    const summary = document.createElement('div');
    summary.className = 'review-summary';
    summary.style.cssText = 'display:flex;gap:24px;padding:16px;border:1px solid #eee;border-radius:12px;margin-bottom:16px;';

    // Average score
    const avg = this.existingReviews.reduce((s, r) => s + r.rating, 0) / this.existingReviews.length;
    const avgEl = document.createElement('div');
    avgEl.style.cssText = 'text-align:center;min-width:80px;';
    avgEl.innerHTML = `
      <div style="font-size:36px;font-weight:700;">${avg.toFixed(1)}</div>
      <div style="color:#f59e0b;font-size:20px;">${this.renderStarsHTML(avg)}</div>
      <div style="font-size:13px;color:#666;">${this.existingReviews.length} reviews</div>
    `;
    summary.appendChild(avgEl);

    // Distribution bar chart
    const dist = document.createElement('div');
    dist.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:4px;justify-content:center;';

    for (let stars = 5; stars >= 1; stars--) {
      const count = this.existingReviews.filter(r => Math.round(r.rating) === stars).length;
      const pct = (count / this.existingReviews.length * 100).toFixed(0);

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:13px;';

      row.innerHTML = `
        <span style="width:16px;text-align:right;">${stars}</span>
        <span style="color:#f59e0b;">★</span>
        <div style="flex:1;height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:#f59e0b;border-radius:4px;transition:width 0.5s;"></div>
        </div>
        <span style="width:32px;color:#666;">${count}</span>
      `;
      dist.appendChild(row);
    }
    summary.appendChild(dist);

    this.container.appendChild(summary);
  }

  renderRatingInput() {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:16px;';

    const label = document.createElement('div');
    label.textContent = 'Your Rating';
    label.style.cssText = 'font-weight:600;margin-bottom:8px;';
    section.appendChild(label);

    const starsContainer = document.createElement('div');
    starsContainer.className = 'star-input';
    starsContainer.setAttribute('role', 'radiogroup');
    starsContainer.setAttribute('aria-label', 'Rating');
    starsContainer.style.cssText = 'display:flex;gap:4px;cursor:pointer;';

    for (let i = 1; i <= this.maxStars; i++) {
      const starWrapper = document.createElement('div');
      starWrapper.style.cssText = 'position:relative;width:36px;height:36px;font-size:32px;line-height:36px;';

      // Left half (0.5)
      const leftHalf = document.createElement('div');
      leftHalf.style.cssText = 'position:absolute;left:0;top:0;width:50%;height:100%;z-index:1;';
      leftHalf.addEventListener('mouseenter', () => { this.hoverRating = i - 0.5; this.updateStars(starsContainer); });
      leftHalf.addEventListener('click', () => { this.selectedRating = i - 0.5; this.updateStars(starsContainer); });

      // Right half (1.0)
      const rightHalf = document.createElement('div');
      rightHalf.style.cssText = 'position:absolute;right:0;top:0;width:50%;height:100%;z-index:1;';
      rightHalf.addEventListener('mouseenter', () => { this.hoverRating = i; this.updateStars(starsContainer); });
      rightHalf.addEventListener('click', () => { this.selectedRating = i; this.updateStars(starsContainer); });

      const starEl = document.createElement('span');
      starEl.dataset.index = i;
      starEl.style.cssText = 'user-select:none;transition:transform 0.1s;';

      starWrapper.appendChild(leftHalf);
      starWrapper.appendChild(rightHalf);
      starWrapper.appendChild(starEl);
      starsContainer.appendChild(starWrapper);
    }

    starsContainer.addEventListener('mouseleave', () => {
      this.hoverRating = 0;
      this.updateStars(starsContainer);
    });

    this.updateStars(starsContainer);
    section.appendChild(starsContainer);

    // Rating text label
    this.ratingLabel = document.createElement('span');
    this.ratingLabel.style.cssText = 'font-size:14px;color:#666;margin-left:12px;';
    this.updateRatingLabel();
    section.appendChild(this.ratingLabel);

    this.container.appendChild(section);
  }

  updateStars(container) {
    const displayRating = this.hoverRating || this.selectedRating;
    const stars = container.querySelectorAll('[data-index]');

    stars.forEach(star => {
      const idx = parseInt(star.dataset.index);
      if (idx <= Math.floor(displayRating)) {
        star.textContent = '★';
        star.style.color = '#f59e0b';
      } else if (idx === Math.ceil(displayRating) && displayRating % 1 !== 0) {
        // Half star using CSS clip
        star.textContent = '★';
        star.style.color = '#f59e0b';
        star.style.clipPath = 'inset(0 50% 0 0)';
        // Add empty star behind
        const parent = star.parentElement;
        let bg = parent.querySelector('.star-bg');
        if (!bg) {
          bg = document.createElement('span');
          bg.className = 'star-bg';
          bg.textContent = '☆';
          bg.style.cssText = 'position:absolute;color:#ddd;user-select:none;';
          parent.appendChild(bg);
        }
      } else {
        star.textContent = '☆';
        star.style.color = '#ddd';
        star.style.clipPath = '';
        const bg = star.parentElement.querySelector('.star-bg');
        if (bg) bg.remove();
      }

      // Hover animation
      if (this.hoverRating && idx <= Math.ceil(this.hoverRating)) {
        star.style.transform = 'scale(1.15)';
      } else {
        star.style.transform = 'scale(1)';
      }
    });

    this.updateRatingLabel();
  }

  updateRatingLabel() {
    if (!this.ratingLabel) return;
    const labels = { 0.5: 'Terrible', 1: 'Poor', 1.5: 'Bad', 2: 'Below Average',
      2.5: 'Average', 3: 'Good', 3.5: 'Very Good', 4: 'Great', 4.5: 'Excellent', 5: 'Outstanding' };
    const rating = this.hoverRating || this.selectedRating;
    this.ratingLabel.textContent = rating ? `${rating} — ${labels[rating] || ''}` : 'Tap to rate';
  }

  renderStarsHTML(rating) {
    let html = '';
    for (let i = 1; i <= this.maxStars; i++) {
      if (i <= Math.floor(rating)) html += '★';
      else if (i === Math.ceil(rating) && rating % 1 >= 0.25) html += '★'; // Round half
      else html += '☆';
    }
    return html;
  }

  renderTextInput() {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:16px;';

    const label = document.createElement('label');
    label.textContent = 'Your Review';
    label.setAttribute('for', 'review-text');
    label.style.cssText = 'display:block;font-weight:600;margin-bottom:8px;';
    section.appendChild(label);

    this.textarea = document.createElement('textarea');
    this.textarea.id = 'review-text';
    this.textarea.placeholder = `Share your experience (min ${this.minReviewLength} characters)`;
    this.textarea.maxLength = this.maxReviewLength;
    this.textarea.style.cssText = 'width:100%;min-height:100px;padding:12px;border:1px solid #ddd;border-radius:8px;resize:vertical;font-family:inherit;font-size:14px;box-sizing:border-box;';

    this.textarea.addEventListener('input', (e) => {
      this.reviewText = e.target.value;
      this.updateCharCount();
    });
    section.appendChild(this.textarea);

    this.charCount = document.createElement('div');
    this.charCount.style.cssText = 'text-align:right;font-size:12px;margin-top:4px;';
    this.updateCharCount();
    section.appendChild(this.charCount);

    this.container.appendChild(section);
  }

  updateCharCount() {
    const len = this.reviewText.length;
    const remaining = this.maxReviewLength - len;
    const isShort = len < this.minReviewLength && len > 0;

    this.charCount.style.color = isShort ? '#e53e3e' : remaining < 50 ? '#f59e0b' : '#999';
    this.charCount.textContent = isShort
      ? `${this.minReviewLength - len} more characters needed`
      : `${remaining} characters remaining`;
  }

  renderImageUpload() {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:16px;';

    const label = document.createElement('div');
    label.textContent = `Add Photos (max ${this.maxImages})`;
    label.style.cssText = 'font-weight:600;margin-bottom:8px;';
    section.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'image-grid';
    grid.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

    // Existing previews
    this.images.forEach((img, i) => {
      const preview = document.createElement('div');
      preview.style.cssText = 'width:80px;height:80px;border-radius:8px;position:relative;overflow:hidden;';

      const imgEl = document.createElement('img');
      imgEl.src = img.preview;
      imgEl.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      imgEl.alt = `Upload ${i + 1}`;
      preview.appendChild(imgEl);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', `Remove image ${i + 1}`);
      removeBtn.style.cssText = 'position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(0,0,0,0.6);color:#fff;cursor:pointer;font-size:14px;line-height:1;';
      removeBtn.addEventListener('click', () => {
        URL.revokeObjectURL(img.preview);
        this.images.splice(i, 1);
        this.render();
      });
      preview.appendChild(removeBtn);

      grid.appendChild(preview);
    });

    // Upload button
    if (this.images.length < this.maxImages) {
      const uploadBtn = document.createElement('label');
      uploadBtn.style.cssText = 'width:80px;height:80px;border:2px dashed #ddd;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px;color:#999;';
      uploadBtn.textContent = '+';
      uploadBtn.setAttribute('aria-label', 'Upload image');

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) {
          alert('Image must be under 5MB');
          return;
        }
        const preview = URL.createObjectURL(file);
        this.images.push({ file, preview });
        this.render();
      });

      uploadBtn.appendChild(input);
      grid.appendChild(uploadBtn);
    }

    section.appendChild(grid);
    this.container.appendChild(section);
  }

  renderSubmitButton() {
    const btn = document.createElement('button');
    btn.textContent = 'Submit Review';
    btn.style.cssText = 'width:100%;padding:14px;background:#0f8a0f;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:background 0.2s;';

    btn.addEventListener('click', () => this.handleSubmit(btn));
    this.container.appendChild(btn);
  }

  handleSubmit(btn) {
    // Validate
    const errors = [];
    if (!this.selectedRating) errors.push('Please select a rating');
    if (this.reviewText.length < this.minReviewLength) {
      errors.push(`Review must be at least ${this.minReviewLength} characters`);
    }

    if (errors.length > 0) {
      this.showError(errors.join('. '));
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Submitting...';

    setTimeout(() => {
      this.onSubmit({
        rating: this.selectedRating,
        text: this.reviewText,
        images: this.images.map(i => i.file)
      });

      // Success feedback
      btn.textContent = '✓ Review Submitted!';
      btn.style.background = '#22c55e';
    }, 1000);
  }

  showError(message) {
    let errorEl = this.container.querySelector('.review-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'review-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.style.cssText = 'background:#fef2f2;color:#e53e3e;padding:10px;border-radius:8px;margin-bottom:12px;font-size:14px;';
      this.container.insertBefore(errorEl, this.container.lastChild);
    }
    errorEl.textContent = message;
    setTimeout(() => errorEl.remove(), 3000);
  }
}

// Usage:
// new ReviewWidget(document.getElementById('app'), {
//   reviews: [
//     { rating: 4.5, text: 'Great food!' },
//     { rating: 3, text: 'Average' },
//     { rating: 5, text: 'Amazing!' },
//   ],
//   onSubmit: (data) => console.log('Submitted:', data)
// });
```

## 🎯 Key Takeaways
- Swiggy FE focuses on **food-delivery UX components** — ratings, reviews, menus
- Half-star detection via overlapping left/right hit areas in each star wrapper
- Rating distribution bar chart with animated widths and counts
- Image upload with `URL.createObjectURL` for instant preview, `revokeObjectURL` on remove
- Character count shows "more needed" when below min, "remaining" when approaching max
- File validation (type + size) before accepting uploads

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| JS Fundamentals | Medium | Closures, Event Loop, Prototypes |
| Machine Coding | Medium | DOM, File API, State Management |
| FE System Design | Hard | Review Platform Architecture |
| HM | Medium | Behavioral, Product Sense |
