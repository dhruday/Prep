# Zomato — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | SDE-3 Frontend |
| **Level** | Lead |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Gurugram, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/zomato-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Rejection Reason:** System Design — didn't handle restaurant photo upload with compression pipeline

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Restaurant Review Page with Photo Upload and Rating**
   - Star rating with hover preview (4.3 → fill 4 stars + 30% of 5th)
   - Photo upload with preview, crop, and multiple images
   - Review text with character count
   - "Was this review helpful?" voting system

### 💡 Interview-Ready Answer

```jsx
function RestaurantReview({ restaurantId }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [photos, setPhotos] = useState([]); // { file, preview, uploading }
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  
  const MAX_CHARS = 500;
  const MAX_PHOTOS = 5;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  
  // Star rating with fractional support
  const StarRating = ({ value, onChange, onHover, interactive = true }) => {
    return (
      <div className="star-rating" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map(star => {
          const displayValue = hoverRating || value;
          const fillPercent = Math.min(Math.max((displayValue - star + 1) * 100, 0), 100);
          
          return (
            <button
              key={star}
              role="radio"
              aria-checked={Math.round(value) === star}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              className="star-btn"
              onClick={() => interactive && onChange(star)}
              onMouseEnter={() => interactive && onHover(star)}
              onMouseLeave={() => interactive && onHover(0)}
              disabled={!interactive}
            >
              <svg viewBox="0 0 24 24" width="32" height="32">
                <defs>
                  <linearGradient id={`fill-${star}`}>
                    <stop offset={`${fillPercent}%`} stopColor="#FFB800" />
                    <stop offset={`${fillPercent}%`} stopColor="#E0E0E0" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={`url(#fill-${star})`}
                  stroke="#FFB800"
                  strokeWidth="0.5"
                />
              </svg>
            </button>
          );
        })}
        
        <span className="rating-text" aria-live="polite">
          {(hoverRating || value) > 0 && getRatingLabel(hoverRating || value)}
        </span>
      </div>
    );
  };
  
  const getRatingLabel = (val) => {
    if (val >= 5) return 'Excellent!';
    if (val >= 4) return 'Great';
    if (val >= 3) return 'Good';
    if (val >= 2) return 'Fair';
    return 'Poor';
  };
  
  // Photo upload with client-side compression
  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    const remaining = MAX_PHOTOS - photos.length;
    const selected = files.slice(0, remaining);
    
    for (const file of selected) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} exceeds 5MB limit`);
        continue;
      }
      
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image`);
        continue;
      }
      
      // Create preview + compress
      const preview = URL.createObjectURL(file);
      const compressed = await compressImage(file, 800, 800, 0.8);
      
      setPhotos(prev => [...prev, { file: compressed, preview, uploading: false, id: crypto.randomUUID() }]);
    }
    
    e.target.value = ''; // Reset input
  };
  
  // Client-side image compression using Canvas
  const compressImage = (file, maxWidth, maxHeight, quality) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Scale down maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removePhoto = (photoId) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo) URL.revokeObjectURL(photo.preview); // Prevent memory leak
      return prev.filter(p => p.id !== photoId);
    });
  };
  
  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setSubmitting(true);
    
    const formData = new FormData();
    formData.append('rating', rating);
    formData.append('text', reviewText);
    formData.append('restaurantId', restaurantId);
    
    photos.forEach((photo, i) => {
      formData.append(`photo_${i}`, photo.file);
    });
    
    try {
      await fetch('/api/reviews', { method: 'POST', body: formData });
      // Reset form
      setRating(0);
      setReviewText('');
      setPhotos([]);
    } catch (error) {
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <form className="review-form" onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
      <h2>Write a Review</h2>
      
      <StarRating value={rating} onChange={setRating} onHover={setHoverRating} />
      
      {/* Review Text */}
      <div className="review-text-section">
        <textarea
          value={reviewText}
          onChange={e => setReviewText(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Share your experience..."
          maxLength={MAX_CHARS}
          rows={4}
          aria-label="Review text"
        />
        <span className="char-count" aria-live="polite">
          {reviewText.length}/{MAX_CHARS}
        </span>
      </div>
      
      {/* Photo Upload */}
      <div className="photo-upload">
        <div className="photo-grid">
          {photos.map(photo => (
            <div key={photo.id} className="photo-preview">
              <img src={photo.preview} alt="Review photo" />
              <button type="button" onClick={() => removePhoto(photo.id)} aria-label="Remove photo">✕</button>
            </div>
          ))}
          
          {photos.length < MAX_PHOTOS && (
            <button type="button" className="add-photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={`Add photo (${photos.length}/${MAX_PHOTOS})`}>
              📷 Add Photo
            </button>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoSelect}
          className="hidden"
          aria-hidden="true"
        />
      </div>
      
      <button type="submit" disabled={rating === 0 || submitting} className="submit-btn">
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
```

---

## 🎯 Key Takeaways
- Zomato FE = **food-tech UI** — review page, rating, photo upload
- **Fractional star rating**: SVG with linearGradient fill percentage — elegant approach
- **Client-side image compression**: Canvas API → `toBlob` with quality parameter
- **Memory leak prevention**: `URL.revokeObjectURL` when removing photo previews
- **FormData**: multipart upload for mixed text + file submission
- Zomato rejected on **photo upload pipeline** in system design — should have covered:
  - Client-side compression → pre-signed S3 URL → CDN invalidation
  - Server-side: generate thumbnails (150x150, 400x400, original), EXIF strip, content moderation
  - NSFW detection using ML model before publishing
- **Star rating a11y**: role="radiogroup" with role="radio" per star

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Star Rating, Photo Upload, Canvas Compress |
| JavaScript | Medium | Promises, Closures, Event Loop |
| System Design | Hard | Photo Pipeline, CDN, Content Moderation |
| HM | Medium | Behavioral |
