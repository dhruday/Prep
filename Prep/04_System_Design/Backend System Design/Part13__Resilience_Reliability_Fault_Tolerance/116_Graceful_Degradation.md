# 116. Graceful Degradation

## 📌 Overview

**Graceful degradation** means reducing functionality when dependencies fail, while keeping core features working.

**Better to serve partial functionality than complete outage**.

```
Payment gateway down:
❌ Bad: Show error, can't checkout
✓ Good: Accept orders, process payments later
```

---

## 🎯 Why Graceful Degradation?

### **All-or-Nothing vs Partial Functionality**

```
Scenario: E-commerce site, recommendation engine down

All-or-Nothing:
Homepage → Load recommendations → Timeout ❌
Result: Entire homepage broken, users see error page

Graceful Degradation:
Homepage → Try load recommendations → Timeout → Show popular products ✓
Result: Homepage works, users can browse/buy (slightly worse UX)
```

---

## 🛠️ Degradation Strategies

### **1. Fallback to Cached Data**

```python
import redis
import requests
from datetime import timedelta

class ProductRecommendations:
    def __init__(self):
        self.cache = redis.Redis()
        self.ml_api_url = 'https://ml-api.com/recommend'
    
    def get_recommendations(self, user_id):
        """Get recommendations with graceful fallback"""
        cache_key = f"recommendations:{user_id}"
        
        try:
            # Try primary: ML-based recommendations
            response = requests.get(
                f"{self.ml_api_url}/{user_id}",
                timeout=2  # Fast timeout
            )
            response.raise_for_status()
            recommendations = response.json()
            
            # Cache for fallback
            self.cache.setex(
                cache_key,
                timedelta(hours=1),
                json.dumps(recommendations)
            )
            
            return {
                'recommendations': recommendations,
                'source': 'ml_api'  # Fresh data
            }
            
        except (requests.Timeout, requests.RequestException):
            # Fallback 1: Cached recommendations
            cached = self.cache.get(cache_key)
            if cached:
                return {
                    'recommendations': json.loads(cached),
                    'source': 'cache'  # Stale but better than nothing
                }
            
            # Fallback 2: Popular products (static)
            return {
                'recommendations': self.get_popular_products(),
                'source': 'popular'  # Generic fallback
            }
    
    def get_popular_products(self):
        """Static popular products (last resort)"""
        return [
            {'id': 1, 'name': 'Bestseller 1', 'price': 29.99},
            {'id': 2, 'name': 'Bestseller 2', 'price': 39.99},
            {'id': 3, 'name': 'Bestseller 3', 'price': 49.99}
        ]

# Usage
recommender = ProductRecommendations()
result = recommender.get_recommendations(user_id=123)

if result['source'] == 'ml_api':
    print("✓ Fresh recommendations")
elif result['source'] == 'cache':
    print("⚠️ Cached recommendations (ML API down)")
else:
    print("⚠️ Popular products (ML API down, cache empty)")
```

---

### **2. Partial Responses**

```python
import asyncio
from typing import Dict, Any, Optional

class UserProfile:
    """User profile aggregated from multiple services"""
    
    async def get_full_profile(self, user_id: int) -> Dict[str, Any]:
        """Get profile with graceful degradation"""
        
        # Call services in parallel
        results = await asyncio.gather(
            self.get_basic_info(user_id),
            self.get_preferences(user_id),
            self.get_order_history(user_id),
            self.get_recommendations(user_id),
            return_exceptions=True  # Don't fail entire request
        )
        
        basic_info, preferences, orders, recommendations = results
        
        # Build profile from available data
        profile = {
            'user_id': user_id,
            'status': 'partial' if any(isinstance(r, Exception) for r in results) else 'complete'
        }
        
        # Add basic info (required)
        if isinstance(basic_info, Exception):
            raise Exception("Basic info required")  # Can't proceed
        profile['basic_info'] = basic_info
        
        # Add optional fields (graceful fallback)
        if not isinstance(preferences, Exception):
            profile['preferences'] = preferences
        else:
            profile['preferences'] = self.get_default_preferences()
            profile['warnings'] = ['preferences_unavailable']
        
        if not isinstance(orders, Exception):
            profile['orders'] = orders
        else:
            profile['orders'] = []
            profile['warnings'] = profile.get('warnings', []) + ['orders_unavailable']
        
        if not isinstance(recommendations, Exception):
            profile['recommendations'] = recommendations
        else:
            profile['recommendations'] = []
            profile['warnings'] = profile.get('warnings', []) + ['recommendations_unavailable']
        
        return profile
    
    async def get_basic_info(self, user_id: int):
        """Required: User basic info"""
        await asyncio.sleep(0.1)  # Simulate API call
        return {'name': 'John Doe', 'email': 'john@example.com'}
    
    async def get_preferences(self, user_id: int):
        """Optional: User preferences"""
        await asyncio.sleep(0.2)
        # raise Exception("Preferences service down")  # Simulated failure
        return {'theme': 'dark', 'notifications': True}
    
    async def get_order_history(self, user_id: int):
        """Optional: Order history"""
        await asyncio.sleep(0.3)
        return [{'order_id': 1, 'total': 99.99}]
    
    async def get_recommendations(self, user_id: int):
        """Optional: Recommendations"""
        await asyncio.sleep(0.5)
        return [{'product_id': 1, 'score': 0.9}]
    
    def get_default_preferences(self):
        """Default preferences fallback"""
        return {'theme': 'light', 'notifications': False}

# Usage
async def main():
    profile_service = UserProfile()
    profile = await profile_service.get_full_profile(user_id=123)
    
    if profile['status'] == 'partial':
        print(f"⚠️ Partial profile: {profile['warnings']}")
    else:
        print("✓ Complete profile")
    
    print(json.dumps(profile, indent=2))

asyncio.run(main())
```

**Output (when preferences service down):**
```json
{
  "user_id": 123,
  "status": "partial",
  "basic_info": {"name": "John Doe", "email": "john@example.com"},
  "preferences": {"theme": "light", "notifications": false},
  "orders": [{"order_id": 1, "total": 99.99}],
  "recommendations": [{"product_id": 1, "score": 0.9}],
  "warnings": ["preferences_unavailable"]
}
```

---

### **3. Feature Toggles**

```python
class FeatureFlags:
    """Dynamic feature toggles for degradation"""
    
    def __init__(self):
        self.flags = {
            'recommendations': True,
            'reviews': True,
            'related_products': True,
            'search_filters': True,
            'advanced_search': True
        }
    
    def is_enabled(self, feature: str) -> bool:
        """Check if feature enabled"""
        return self.flags.get(feature, False)
    
    def disable_feature(self, feature: str):
        """Disable non-critical feature"""
        print(f"⚠️ Disabling {feature} (graceful degradation)")
        self.flags[feature] = False
    
    def enable_feature(self, feature: str):
        """Re-enable feature"""
        print(f"✓ Enabling {feature}")
        self.flags[feature] = True

# Global feature flags
feature_flags = FeatureFlags()

class ProductPage:
    def render(self, product_id: int):
        """Render product page with conditional features"""
        page = {
            'product': self.get_product(product_id),  # Core (always)
            'price': self.get_price(product_id),      # Core (always)
            'add_to_cart': True                       # Core (always)
        }
        
        # Optional: Recommendations
        if feature_flags.is_enabled('recommendations'):
            try:
                page['recommendations'] = self.get_recommendations(product_id)
            except Exception:
                feature_flags.disable_feature('recommendations')
                page['recommendations'] = []
        
        # Optional: Reviews
        if feature_flags.is_enabled('reviews'):
            try:
                page['reviews'] = self.get_reviews(product_id)
            except Exception:
                feature_flags.disable_feature('reviews')
                page['reviews'] = []
        
        # Optional: Related products
        if feature_flags.is_enabled('related_products'):
            try:
                page['related'] = self.get_related_products(product_id)
            except Exception:
                feature_flags.disable_feature('related_products')
                page['related'] = []
        
        return page
    
    def get_product(self, product_id):
        return {'id': product_id, 'name': 'Product A'}
    
    def get_price(self, product_id):
        return 99.99
    
    def get_recommendations(self, product_id):
        # Simulate failure
        raise Exception("Recommendations service down")
    
    def get_reviews(self, product_id):
        return [{'rating': 5, 'text': 'Great!'}]
    
    def get_related_products(self, product_id):
        return [{'id': 2, 'name': 'Product B'}]

# Usage
page_renderer = ProductPage()
page = page_renderer.render(product_id=1)
print(json.dumps(page, indent=2))
```

**Output:**
```
⚠️ Disabling recommendations (graceful degradation)
{
  "product": {"id": 1, "name": "Product A"},
  "price": 99.99,
  "add_to_cart": true,
  "recommendations": [],  ← Empty (degraded)
  "reviews": [{"rating": 5, "text": "Great!"}],
  "related": [{"id": 2, "name": "Product B"}]
}
```

---

### **4. Queue for Later Processing**

```python
import queue
import threading
import time

class PaymentProcessor:
    """Process payments with graceful degradation"""
    
    def __init__(self):
        self.payment_queue = queue.Queue()
        self.start_background_processor()
    
    def start_background_processor(self):
        """Background thread processes queued payments"""
        def process_queue():
            while True:
                try:
                    payment = self.payment_queue.get(timeout=1)
                    self.process_payment_sync(payment)
                    self.payment_queue.task_done()
                except queue.Empty:
                    pass
        
        thread = threading.Thread(target=process_queue, daemon=True)
        thread.start()
    
    def checkout(self, order_id, amount, card):
        """Process checkout with graceful degradation"""
        try:
            # Try immediate payment
            result = self.process_payment_immediately(order_id, amount, card)
            return {
                'status': 'completed',
                'order_id': order_id,
                'message': 'Payment processed'
            }
        
        except Exception as e:
            # Fallback: Queue for later processing
            print(f"⚠️ Payment gateway down: {e}")
            
            payment_data = {
                'order_id': order_id,
                'amount': amount,
                'card': card,
                'timestamp': time.time()
            }
            self.payment_queue.put(payment_data)
            
            return {
                'status': 'pending',
                'order_id': order_id,
                'message': 'Order accepted, payment will be processed shortly'
            }
    
    def process_payment_immediately(self, order_id, amount, card):
        """Try to process payment immediately"""
        response = requests.post(
            'https://payment-gateway.com/charge',
            json={'order_id': order_id, 'amount': amount, 'card': card},
            timeout=5
        )
        response.raise_for_status()
        return response.json()
    
    def process_payment_sync(self, payment_data):
        """Process queued payment (background)"""
        print(f"Processing queued payment: {payment_data['order_id']}")
        try:
            result = self.process_payment_immediately(
                payment_data['order_id'],
                payment_data['amount'],
                payment_data['card']
            )
            print(f"✓ Payment processed: {payment_data['order_id']}")
        except Exception as e:
            # Requeue or alert
            print(f"✗ Payment failed: {e}")
            time.sleep(60)  # Wait before retry

# Usage
processor = PaymentProcessor()

# Payment gateway down
result = processor.checkout(
    order_id='ORDER-123',
    amount=99.99,
    card='4111-1111-1111-1111'
)

if result['status'] == 'completed':
    print("✓ Payment completed immediately")
elif result['status'] == 'pending':
    print("⚠️ Order accepted, payment queued")
    print(f"Message: {result['message']}")
```

---

## 🎯 Real-World Examples

### **1. Netflix: Video Quality Degradation**

```python
class VideoStreaming:
    """Degrade video quality when bandwidth low"""
    
    def select_bitrate(self, available_bandwidth):
        """Select video quality based on bandwidth"""
        if available_bandwidth > 5_000_000:  # >5 Mbps
            return {
                'quality': '4K',
                'bitrate': 15_000_000,
                'resolution': '3840x2160'
            }
        elif available_bandwidth > 2_000_000:  # >2 Mbps
            return {
                'quality': '1080p',
                'bitrate': 5_000_000,
                'resolution': '1920x1080'
            }
        elif available_bandwidth > 1_000_000:  # >1 Mbps
            return {
                'quality': '720p',
                'bitrate': 2_500_000,
                'resolution': '1280x720'
            }
        else:
            return {
                'quality': '480p',
                'bitrate': 1_000_000,
                'resolution': '854x480'
            }
    
    def stream_video(self, video_id, user_bandwidth):
        """Stream video with adaptive quality"""
        video_config = self.select_bitrate(user_bandwidth)
        
        if video_config['quality'] != '4K':
            print(f"⚠️ Degraded quality: {video_config['quality']} (bandwidth limited)")
        
        return {
            'video_id': video_id,
            'quality': video_config['quality'],
            'stream_url': f"https://cdn.netflix.com/{video_id}/{video_config['quality']}.m3u8"
        }

# Usage
streamer = VideoStreaming()

# High bandwidth → 4K
stream = streamer.stream_video('movie-123', user_bandwidth=6_000_000)
print(f"Streaming {stream['quality']}")  # 4K

# Low bandwidth → 720p (degraded)
stream = streamer.stream_video('movie-123', user_bandwidth=1_500_000)
print(f"Streaming {stream['quality']}")  # 720p
```

### **2. AWS: S3 Reduced Redundancy**

```python
# Normal: High durability (expensive)
s3.put_object(
    Bucket='my-bucket',
    Key='important.pdf',
    Body=data,
    StorageClass='STANDARD'  # 99.999999999% durability
)

# Degraded: Lower durability (cheaper)
s3.put_object(
    Bucket='my-bucket',
    Key='temporary.log',
    Body=data,
    StorageClass='REDUCED_REDUNDANCY'  # 99.99% durability (degraded)
)
```

### **3. Google: Search Degradation**

```python
class SearchService:
    """Degrade search features when overloaded"""
    
    def search(self, query, load_level):
        """Adjust search features based on system load"""
        results = self.basic_search(query)  # Always do basic search
        
        if load_level < 0.5:  # <50% load (normal)
            # Full features
            results['spelling_correction'] = self.spell_check(query)
            results['autocomplete'] = self.get_suggestions(query)
            results['related_searches'] = self.get_related(query)
            results['featured_snippets'] = self.get_snippets(query)
        
        elif load_level < 0.8:  # 50-80% load (light degradation)
            # Disable expensive features
            results['spelling_correction'] = self.spell_check(query)
            results['autocomplete'] = self.get_suggestions(query)
            # Skip: related_searches, featured_snippets
        
        else:  # >80% load (heavy degradation)
            # Only basic search
            # Skip all extra features
            pass
        
        return results
```

---

## ✅ Best Practices

### **1. Prioritize Core Functionality**

```python
# Define criticality levels
CRITICAL = [
    'user_authentication',
    'product_catalog',
    'checkout',
    'payment_processing'
]

NON_CRITICAL = [
    'recommendations',
    'reviews',
    'related_products',
    'wish_list'
]

# Degrade non-critical first
def handle_overload(load_level):
    if load_level > 0.8:
        for feature in NON_CRITICAL:
            disable_feature(feature)
    
    if load_level > 0.95:
        # Extreme: Rate limit even critical features
        enable_rate_limiting()
```

### **2. Communicate Degradation to Users**

```python
def render_page(context):
    """Render page with degradation warnings"""
    page = generate_page(context)
    
    # Add warning if degraded
    if context.get('degraded_features'):
        page['warnings'] = {
            'type': 'degraded_service',
            'message': 'Some features temporarily unavailable',
            'details': context['degraded_features']
        }
    
    return page

# Frontend displays banner:
# "⚠️ Recommendations temporarily unavailable. Showing popular products instead."
```

### **3. Monitor Degradation Level**

```python
class DegradationMetrics:
    def __init__(self):
        self.degraded_features = set()
    
    def degrade_feature(self, feature):
        self.degraded_features.add(feature)
        emit_metric('degraded_features', len(self.degraded_features))
    
    def restore_feature(self, feature):
        self.degraded_features.discard(feature)
        emit_metric('degraded_features', len(self.degraded_features))
    
    def alert_if_excessive(self):
        if len(self.degraded_features) > 3:
            send_alert(f"⚠️ {len(self.degraded_features)} features degraded")
```

### **4. Automatic Recovery**

```python
import time

class AutoRecovery:
    def __init__(self):
        self.disabled_features = {}
    
    def disable_feature(self, feature, retry_after=60):
        """Disable feature temporarily"""
        self.disabled_features[feature] = time.time() + retry_after
        print(f"⚠️ Disabled {feature} for {retry_after}s")
    
    def try_enable_feature(self, feature):
        """Try to re-enable feature"""
        if feature in self.disabled_features:
            if time.time() > self.disabled_features[feature]:
                del self.disabled_features[feature]
                print(f"✓ Re-enabled {feature}")
                return True
        return False
```

---

## 🎓 Interview Tips

**Q: "What is graceful degradation?"**

A: "Graceful degradation reduces functionality when dependencies fail, keeping core features working.

Example: E-commerce site
- ML recommendations service down
- ❌ Bad: Show error, users can't browse
- ✓ Good: Show popular products instead, users can still browse/buy

Strategies:
1. **Fallback to cache**: Serve stale data (better than nothing)
2. **Partial responses**: Return available data, skip failed parts
3. **Feature toggles**: Disable non-critical features
4. **Queue for later**: Accept requests, process asynchronously

Benefits:
- Better UX (partial functionality > total failure)
- Maintain core business (users can still buy)
- Reduce cascading failures

Real-world: Netflix degrades video quality, Google disables search features under load"

**Q: "How do you decide what to degrade?"**

A: "Prioritize by criticality:

**CRITICAL** (never degrade):
- Authentication/authorization
- Core business (checkout, payment)
- Data consistency (database writes)

**NON-CRITICAL** (degrade first):
- Recommendations
- Reviews/ratings
- Social features
- Advanced search filters

Degradation order:
1. Disable ML/AI features (expensive, non-essential)
2. Serve cached data (stale > none)
3. Reduce response detail (summary > full)
4. Limit non-paying users (keep premium working)
5. Rate limit all users (slow > down)

Example: Payment gateway down
- ❌ Don't: Reject orders (lose revenue)
- ✓ Do: Accept orders, queue payments for later (maintain business)"

**Q: "What are risks of graceful degradation?"**

A: "Risks:

1. **Incorrect degradation**: Degrade critical feature
   - Example: Disable authentication → security breach

2. **Stale data issues**: Cached data inconsistent
   - Example: Show old price → customer complaints

3. **User confusion**: Unexpected behavior
   - Solution: Clear communication "Feature temporarily unavailable"

4. **Technical debt**: Degradation code paths rarely tested
   - Solution: Regular chaos testing, GameDays

5. **Revenue loss**: Degraded features → lower engagement
   - Example: No recommendations → fewer purchases

Mitigation:
- Define criticality levels (what never degrades)
- Monitor degradation metrics (alert if excessive)
- Communicate to users (show warnings)
- Test degradation paths (chaos engineering)
- Automatic recovery (try re-enable periodically)"

---

## 📚 Summary

**Graceful Degradation**: Reduce functionality, keep core working

**Strategies**: Cached fallback, partial responses, feature toggles, queue for later

**Prioritize**: Critical (never degrade) vs non-critical (degrade first)

**Communication**: Warn users about degraded features

**Best Practice**: Monitor degradation, auto-recover, test with chaos engineering 🚀
