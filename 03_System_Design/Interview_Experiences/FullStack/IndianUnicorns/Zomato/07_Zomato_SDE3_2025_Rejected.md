# Zomato — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | SDE-3 |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Gurugram, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/zomato-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 DS/Algo + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Machine Coding — Build a Real-Time Order Tracking Notification System
**Duration:** 90 minutes

### Problem
Design a notification system for food delivery tracking:
- Support multiple notification channels (Push, SMS, Email)
- Event types: ORDER_PLACED, PREPARING, PICKED_UP, EN_ROUTE, DELIVERED
- User preference management (opt-in/opt-out per channel)
- Template-based messages with variable substitution
- Rate limiting to avoid notification spam

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;

public class OrderNotificationSystem {

    enum NotificationChannel { PUSH, SMS, EMAIL }

    enum OrderEvent {
        ORDER_PLACED, PREPARING, PICKED_UP, EN_ROUTE,
        ARRIVING_SOON, DELIVERED, DELAYED, CANCELLED
    }

    static class UserPreferences {
        String userId;
        Map<NotificationChannel, Boolean> channelEnabled = new EnumMap<>(NotificationChannel.class);
        boolean quietHoursEnabled;
        int quietHourStart = 22; // 10 PM
        int quietHourEnd = 7;    // 7 AM

        UserPreferences(String userId) {
            this.userId = userId;
            // Defaults: push on, sms off, email on
            channelEnabled.put(NotificationChannel.PUSH, true);
            channelEnabled.put(NotificationChannel.SMS, false);
            channelEnabled.put(NotificationChannel.EMAIL, true);
        }
    }

    static class NotificationTemplate {
        String title;
        String body;

        NotificationTemplate(String title, String body) {
            this.title = title;
            this.body = body;
        }

        String renderTitle(Map<String, String> vars) { return substitute(title, vars); }
        String renderBody(Map<String, String> vars) { return substitute(body, vars); }

        private String substitute(String template, Map<String, String> vars) {
            String result = template;
            for (Map.Entry<String, String> entry : vars.entrySet()) {
                result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
            }
            return result;
        }
    }

    static class Notification {
        String id;
        String userId;
        NotificationChannel channel;
        String title;
        String body;
        long timestamp;
        boolean delivered;

        Notification(String id, String userId, NotificationChannel channel,
                     String title, String body) {
            this.id = id;
            this.userId = userId;
            this.channel = channel;
            this.title = title;
            this.body = body;
            this.timestamp = System.currentTimeMillis();
        }
    }

    // Templates per event
    private final Map<OrderEvent, NotificationTemplate> templates = new EnumMap<>(OrderEvent.class);
    private final Map<String, UserPreferences> userPrefs = new ConcurrentHashMap<>();
    private final Map<NotificationChannel, NotificationSender> senders = new EnumMap<>(NotificationChannel.class);

    // Rate limiting: userId -> deque of timestamps
    private final Map<String, Deque<Long>> notifHistory = new ConcurrentHashMap<>();
    private static final int MAX_NOTIFICATIONS_PER_MINUTE = 3;

    // Sent notifications log
    private final List<Notification> sentLog = new CopyOnWriteArrayList<>();
    private final ExecutorService executor;
    private int notifCounter = 0;

    @FunctionalInterface
    interface NotificationSender {
        boolean send(String userId, String title, String body);
    }

    public OrderNotificationSystem() {
        this.executor = Executors.newFixedThreadPool(8);
        initializeTemplates();
        initializeSenders();
    }

    private void initializeTemplates() {
        templates.put(OrderEvent.ORDER_PLACED, new NotificationTemplate(
            "Order Confirmed! 🎉",
            "Your order #{{orderId}} from {{restaurant}} has been placed. Estimated delivery: {{eta}} min."));
        templates.put(OrderEvent.PREPARING, new NotificationTemplate(
            "Being Prepared 👨‍🍳",
            "{{restaurant}} is preparing your order #{{orderId}}. Almost there!"));
        templates.put(OrderEvent.PICKED_UP, new NotificationTemplate(
            "On the Way! 🏍️",
            "{{rider}} picked up your order from {{restaurant}}. ETA: {{eta}} min."));
        templates.put(OrderEvent.EN_ROUTE, new NotificationTemplate(
            "Rider is Nearby 📍",
            "{{rider}} is {{distance}} km away. Your food is arriving soon!"));
        templates.put(OrderEvent.ARRIVING_SOON, new NotificationTemplate(
            "Almost There! 🏠",
            "{{rider}} will arrive in {{eta}} min. Please be ready to receive your order."));
        templates.put(OrderEvent.DELIVERED, new NotificationTemplate(
            "Delivered! ✅",
            "Your order #{{orderId}} has been delivered. Enjoy your meal! Rate your experience."));
        templates.put(OrderEvent.DELAYED, new NotificationTemplate(
            "Slight Delay ⏰",
            "Sorry, your order #{{orderId}} is delayed by {{delayMin}} min. New ETA: {{eta}} min."));
        templates.put(OrderEvent.CANCELLED, new NotificationTemplate(
            "Order Cancelled ❌",
            "Your order #{{orderId}} has been cancelled. Refund of ₹{{amount}} will be processed."));
    }

    private void initializeSenders() {
        senders.put(NotificationChannel.PUSH, (userId, title, body) -> {
            System.out.printf("[PUSH → %s] %s: %s%n", userId, title, body);
            return true;
        });
        senders.put(NotificationChannel.SMS, (userId, title, body) -> {
            System.out.printf("[SMS → %s] %s%n", userId, body);
            return true;
        });
        senders.put(NotificationChannel.EMAIL, (userId, title, body) -> {
            System.out.printf("[EMAIL → %s] Subject: %s%n", userId, title);
            return true;
        });
    }

    public void setUserPreferences(UserPreferences prefs) {
        userPrefs.put(prefs.userId, prefs);
    }

    /**
     * Send notification for an order event.
     * Respects user preferences, rate limits, and quiet hours.
     */
    public List<Notification> notify(String userId, OrderEvent event,
                                      Map<String, String> variables) {
        UserPreferences prefs = userPrefs.computeIfAbsent(userId, UserPreferences::new);
        NotificationTemplate template = templates.get(event);
        if (template == null) return Collections.emptyList();

        // Rate limit check
        if (!checkRateLimit(userId)) {
            System.out.printf("[RATE_LIMITED] Skipping notification for %s%n", userId);
            return Collections.emptyList();
        }

        String title = template.renderTitle(variables);
        String body = template.renderBody(variables);

        List<Notification> sent = new ArrayList<>();

        for (NotificationChannel channel : NotificationChannel.values()) {
            if (!prefs.channelEnabled.getOrDefault(channel, false)) continue;

            // Skip SMS/Push during quiet hours (email is always ok)
            if (channel != NotificationChannel.EMAIL
                && prefs.quietHoursEnabled && isQuietHour(prefs)) {
                continue;
            }

            String notifId = "notif_" + (++notifCounter);
            Notification notif = new Notification(notifId, userId, channel, title, body);

            // Send asynchronously
            executor.submit(() -> {
                NotificationSender sender = senders.get(channel);
                if (sender != null) {
                    notif.delivered = sender.send(userId, title, body);
                }
            });

            sent.add(notif);
            sentLog.add(notif);
        }

        return sent;
    }

    private boolean checkRateLimit(String userId) {
        long now = System.currentTimeMillis();
        Deque<Long> history = notifHistory.computeIfAbsent(
            userId, k -> new ConcurrentLinkedDeque<>());

        // Remove entries older than 1 minute
        while (!history.isEmpty() && history.peekFirst() < now - 60_000) {
            history.pollFirst();
        }

        if (history.size() >= MAX_NOTIFICATIONS_PER_MINUTE) {
            return false;
        }

        history.addLast(now);
        return true;
    }

    private boolean isQuietHour(UserPreferences prefs) {
        int currentHour = java.time.LocalTime.now().getHour();
        if (prefs.quietHourStart > prefs.quietHourEnd) {
            // Wraps midnight: e.g., 22:00 - 07:00
            return currentHour >= prefs.quietHourStart || currentHour < prefs.quietHourEnd;
        }
        return currentHour >= prefs.quietHourStart && currentHour < prefs.quietHourEnd;
    }

    public void shutdown() { executor.shutdown(); }

    public static void main(String[] args) throws Exception {
        OrderNotificationSystem system = new OrderNotificationSystem();

        // Set user preferences
        UserPreferences prefs = new UserPreferences("user_42");
        prefs.channelEnabled.put(NotificationChannel.PUSH, true);
        prefs.channelEnabled.put(NotificationChannel.SMS, true);
        prefs.channelEnabled.put(NotificationChannel.EMAIL, true);
        system.setUserPreferences(prefs);

        Map<String, String> vars = new HashMap<>();
        vars.put("orderId", "ZMT-98765");
        vars.put("restaurant", "Biryani Blues");
        vars.put("eta", "35");
        vars.put("rider", "Rahul");
        vars.put("distance", "1.2");
        vars.put("amount", "450");

        // Simulate order lifecycle
        System.out.println("=== Order Placed ===");
        system.notify("user_42", OrderEvent.ORDER_PLACED, vars);
        Thread.sleep(200);

        System.out.println("\n=== Preparing ===");
        system.notify("user_42", OrderEvent.PREPARING, vars);
        Thread.sleep(200);

        System.out.println("\n=== Picked Up ===");
        vars.put("eta", "15");
        system.notify("user_42", OrderEvent.PICKED_UP, vars);
        Thread.sleep(200);

        System.out.println("\n=== Delivered ===");
        system.notify("user_42", OrderEvent.DELIVERED, vars);
        Thread.sleep(500);

        system.shutdown();
    }
}
```

## 🎯 Key Takeaways
- Zomato asks **food-tech notification** problems — multi-channel, template-based
- Template engine with `{{variable}}` substitution is simple and effective
- User preferences per channel + quiet hours is production-realistic
- Rate limiting prevents notification spam (max 3/minute)
- Async sending via ExecutorService — don't block the main thread
- State machine for order lifecycle events

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Template Engine, Multi-Channel, Rate Limiting |
| DS/Algo 1 | Hard | Graph, DP |
| DS/Algo 2 | Medium | Binary Search Tree |
| HM | Medium | Behavioral |
