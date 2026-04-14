# Paytm — SDE-2 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm |
| **Role** | SDE-2 FullStack |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/paytm-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)

---

## Round 1: Coding + LLD
**Duration:** 60 minutes

### Questions Asked
1. **Design a Notification System** (LLD — Java/Spring)
   - Support: push, SMS, email, in-app notifications
   - Template-based messages with variables (${userName}, ${amount})
   - Priority levels: P0 (immediate), P1 (within 5 min), P2 (batched hourly)
   - Rate limiting per user (max 5 push/hour)
   - Delivery tracking: sent, delivered, read, failed

### 💡 Notification System LLD

```java
interface NotificationChannel {
    DeliveryResult send(Notification notification);
    ChannelType getType();
}

class PushNotificationChannel implements NotificationChannel {
    private final FCMClient fcmClient;
    
    public DeliveryResult send(Notification notification) {
        try {
            String token = deviceTokenService.getToken(notification.getUserId());
            if (token == null) return DeliveryResult.failed("No device token");
            
            var message = FCMMessage.builder()
                .token(token)
                .title(notification.getTitle())
                .body(notification.getBody())
                .data(notification.getMetadata())
                .build();
            
            fcmClient.send(message);
            return DeliveryResult.sent();
        } catch (FCMException e) {
            return DeliveryResult.failed(e.getMessage());
        }
    }
    
    public ChannelType getType() { return ChannelType.PUSH; }
}

class SMSNotificationChannel implements NotificationChannel {
    private final TwilioClient twilioClient;
    
    public DeliveryResult send(Notification notification) {
        String phone = userService.getPhoneNumber(notification.getUserId());
        twilioClient.sendSMS(phone, notification.getBody());
        return DeliveryResult.sent();
    }
    
    public ChannelType getType() { return ChannelType.SMS; }
}

// Template Engine
class TemplateEngine {
    String render(String template, Map<String, String> variables) {
        String result = template;
        for (var entry : variables.entrySet()) {
            // Sanitize value to prevent injection
            String safeValue = HtmlUtils.htmlEscape(entry.getValue());
            result = result.replace("${" + entry.getKey() + "}", safeValue);
        }
        return result;
    }
}

// Rate Limiter (Sliding Window Counter in Redis)
class NotificationRateLimiter {
    private final RedisTemplate<String, String> redis;
    
    boolean isAllowed(String userId, ChannelType channel, int maxPerHour) {
        String key = "ratelimit:notif:" + userId + ":" + channel;
        long now = System.currentTimeMillis();
        long windowStart = now - 3600_000; // 1 hour ago
        
        // Remove old entries
        redis.opsForZSet().removeRangeByScore(key, 0, windowStart);
        
        // Count current window
        long count = redis.opsForZSet().zCard(key);
        
        if (count >= maxPerHour) return false;
        
        // Add current timestamp
        redis.opsForZSet().add(key, String.valueOf(now), now);
        redis.expire(key, Duration.ofHours(1));
        
        return true;
    }
}

// Main Service
class NotificationService {
    private final Map<ChannelType, NotificationChannel> channels;
    private final TemplateEngine templateEngine;
    private final NotificationRateLimiter rateLimiter;
    private final NotificationRepository repo;
    private final KafkaTemplate<String, NotificationEvent> kafka;
    
    void send(NotificationRequest request) {
        // 1. Render template
        String title = templateEngine.render(request.getTitleTemplate(), request.getVariables());
        String body = templateEngine.render(request.getBodyTemplate(), request.getVariables());
        
        // 2. Check user preferences (opt-out)
        var prefs = userPrefsService.getPreferences(request.getUserId());
        List<ChannelType> enabledChannels = request.getChannels().stream()
            .filter(prefs::isChannelEnabled)
            .toList();
        
        // 3. Create notification
        var notification = Notification.builder()
            .userId(request.getUserId())
            .title(title)
            .body(body)
            .priority(request.getPriority())
            .channels(enabledChannels)
            .status(NotificationStatus.PENDING)
            .metadata(request.getMetadata())
            .build();
        
        repo.save(notification);
        
        // 4. Route by priority
        switch (request.getPriority()) {
            case P0:
                // Immediate: send synchronously
                sendToAllChannels(notification);
                break;
            case P1:
                // Within 5 min: enqueue to priority queue
                kafka.send("notification.urgent", NotificationEvent.from(notification));
                break;
            case P2:
                // Batched: collect and send hourly
                kafka.send("notification.batch", NotificationEvent.from(notification));
                break;
        }
    }
    
    private void sendToAllChannels(Notification notification) {
        for (ChannelType channel : notification.getChannels()) {
            // Rate limit check
            if (!rateLimiter.isAllowed(notification.getUserId(), channel, 5)) {
                updateStatus(notification, channel, NotificationStatus.RATE_LIMITED);
                continue;
            }
            
            NotificationChannel handler = channels.get(channel);
            DeliveryResult result = handler.send(notification);
            
            updateStatus(notification, channel,
                result.isSuccess() ? NotificationStatus.SENT : NotificationStatus.FAILED);
            
            if (!result.isSuccess()) {
                // Schedule retry (exponential backoff, max 3 retries)
                scheduleRetry(notification, channel, 1);
            }
        }
    }
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Paytm's QR Code Payment System**

### 💡 Key Points

```
QR Payment Flow:
1. Merchant displays static QR (contains merchant_id + UPI VPA)
   or dynamic QR (contains amount + order_id + expiry)
2. Customer scans → app decodes QR → pre-fills payment details
3. Customer enters UPI PIN → app sends to NPCI
4. NPCI routes to payer's bank + payee's bank
5. Both banks settle → callback to Paytm → update status

Static vs Dynamic QR:
- Static: reusable, customer enters amount manually
  Format: upi://pay?pa=merchant@paytm&pn=ShopName
- Dynamic: one-time, amount pre-filled, expires in 10 min
  Format: upi://pay?pa=merchant@paytm&pn=ShopName&am=500&tr=TXN123&cu=INR

Security:
- QR content signed with merchant's key → prevent tampering
- Amount in dynamic QR is verified server-side (not just from QR)
- Transaction PIN encrypted with device binding (SRSA)
- Replay protection: transaction_id is unique + TTL
```

---

## 🎯 Key Takeaways
- Paytm = **payments + UPI + notification systems + scale at India-level**
- **Strategy Pattern for channels**: each channel implements `NotificationChannel` interface
- **Template rendering**: variable substitution with `${key}` → sanitize values to prevent injection
- **Rate limiting with Redis Sorted Set**: sliding window counter → `ZREMRANGEBYSCORE` + `ZCARD`
- **Priority-based routing**: P0 (sync), P1 (Kafka urgent), P2 (Kafka batch) — different SLAs
- **User preference check**: always respect opt-out before sending
- **UPI QR codes**: static (reusable, no amount) vs dynamic (one-time, pre-filled amount, expiring)
- Paytm interview = mix of **fintech domain + solid engineering + LLD patterns**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Array, String |
| Coding + LLD | Hard | Notification System, Strategy Pattern |
| System Design | Hard | QR Payment, UPI Architecture |
| HM | Medium | Fintech Domain, Leadership |
