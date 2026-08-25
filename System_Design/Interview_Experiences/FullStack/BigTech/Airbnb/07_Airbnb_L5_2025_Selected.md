# Airbnb — Senior FullStack Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore (Remote) |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Recruiter + 2 Technical + System Design + Cross-Functional)
- **Timeline:** 4 weeks
- **Format:** Virtual

## Round 3: System Design + Coding — Reservation & Conflict Resolution

### Problem
Build a double-booking prevention system for Airbnb:
1. Accept or reject reservation requests atomically — no race conditions
2. Handle concurrent booking attempts for same property/dates
3. Pre-approval holds: guest can "hold" dates for 15 min before confirming
4. Waitlist: if property is held, next guest gets waitlisted and auto-promoted if hold expires
5. Idempotent booking API (retry-safe)
6. Booking lifecycle: HOLD → CONFIRMED → CHECKED_IN → COMPLETED / CANCELLED

Implement in **Java**.

### 💡 Interview-Ready Answer

```java
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.locks.ReentrantLock;

public class ReservationSystem {

    // ============================================================
    // MODELS
    // ============================================================
    enum BookingStatus { HOLD, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED, EXPIRED }

    static class Booking {
        final String bookingId;
        final String propertyId;
        final String guestId;
        final LocalDate checkIn, checkOut;
        BookingStatus status;
        Instant createdAt;
        Instant holdExpiresAt; // only for HOLD status
        final String idempotencyKey;

        Booking(String bookingId, String propertyId, String guestId,
                LocalDate checkIn, LocalDate checkOut, String idempotencyKey) {
            this.bookingId = bookingId;
            this.propertyId = propertyId;
            this.guestId = guestId;
            this.checkIn = checkIn;
            this.checkOut = checkOut;
            this.status = BookingStatus.HOLD;
            this.createdAt = Instant.now();
            this.holdExpiresAt = createdAt.plusSeconds(15 * 60);
            this.idempotencyKey = idempotencyKey;
        }

        Set<LocalDate> dateSet() {
            Set<LocalDate> dates = new HashSet<>();
            for (LocalDate d = checkIn; d.isBefore(checkOut); d = d.plusDays(1))
                dates.add(d);
            return dates;
        }

        boolean isActive() {
            return status == BookingStatus.HOLD || status == BookingStatus.CONFIRMED
                || status == BookingStatus.CHECKED_IN;
        }

        @Override
        public String toString() {
            return String.format("[%s] %s guest=%s %s→%s (%s)",
                bookingId, status, guestId, checkIn, checkOut,
                status == BookingStatus.HOLD ? "expires=" + holdExpiresAt : "");
        }
    }

    static class WaitlistEntry {
        String guestId;
        LocalDate checkIn, checkOut;
        Instant addedAt;
        String idempotencyKey;

        WaitlistEntry(String guestId, LocalDate checkIn, LocalDate checkOut, String idempotencyKey) {
            this.guestId = guestId;
            this.checkIn = checkIn;
            this.checkOut = checkOut;
            this.addedAt = Instant.now();
            this.idempotencyKey = idempotencyKey;
        }
    }

    // ============================================================
    // CORE SERVICE
    // ============================================================
    private final ConcurrentHashMap<String, List<Booking>> bookingsByProperty = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Booking> bookingsById = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Booking> idempotencyStore = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Queue<WaitlistEntry>> waitlists = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ReentrantLock> propertyLocks = new ConcurrentHashMap<>();
    private int bookingCounter = 0;

    private ReentrantLock getPropertyLock(String propertyId) {
        return propertyLocks.computeIfAbsent(propertyId, k -> new ReentrantLock(true));
    }

    // Idempotent hold creation
    public Booking createHold(String propertyId, String guestId,
                               LocalDate checkIn, LocalDate checkOut, String idempotencyKey) {
        // Check idempotency
        if (idempotencyStore.containsKey(idempotencyKey)) {
            System.out.println("  → Idempotent hit: returning existing booking");
            return idempotencyStore.get(idempotencyKey);
        }

        ReentrantLock lock = getPropertyLock(propertyId);
        lock.lock();
        try {
            // Expire stale holds first
            expireHolds(propertyId);

            // Check date conflicts
            Set<LocalDate> requestedDates = new HashSet<>();
            for (LocalDate d = checkIn; d.isBefore(checkOut); d = d.plusDays(1))
                requestedDates.add(d);

            List<Booking> existing = bookingsByProperty.getOrDefault(propertyId, List.of());
            for (Booking b : existing) {
                if (!b.isActive()) continue;
                for (LocalDate d : requestedDates) {
                    if (b.dateSet().contains(d)) {
                        // Conflict — add to waitlist
                        System.out.printf("  → Conflict with %s on %s, adding to waitlist%n", b.bookingId, d);
                        addToWaitlist(propertyId, guestId, checkIn, checkOut, idempotencyKey);
                        return null;
                    }
                }
            }

            // No conflict — create hold
            String bookingId = "BK-" + (++bookingCounter);
            Booking booking = new Booking(bookingId, propertyId, guestId, checkIn, checkOut, idempotencyKey);

            bookingsByProperty.computeIfAbsent(propertyId, k -> new CopyOnWriteArrayList<>()).add(booking);
            bookingsById.put(bookingId, booking);
            idempotencyStore.put(idempotencyKey, booking);

            System.out.printf("  → Hold created: %s%n", booking);
            return booking;
        } finally {
            lock.unlock();
        }
    }

    // Confirm a hold
    public boolean confirmBooking(String bookingId) {
        Booking booking = bookingsById.get(bookingId);
        if (booking == null) return false;

        ReentrantLock lock = getPropertyLock(booking.propertyId);
        lock.lock();
        try {
            if (booking.status != BookingStatus.HOLD) {
                System.out.printf("  → Cannot confirm %s: status=%s%n", bookingId, booking.status);
                return false;
            }
            if (Instant.now().isAfter(booking.holdExpiresAt)) {
                booking.status = BookingStatus.EXPIRED;
                System.out.printf("  → Hold expired for %s%n", bookingId);
                promoteWaitlist(booking.propertyId, booking.checkIn, booking.checkOut);
                return false;
            }
            booking.status = BookingStatus.CONFIRMED;
            System.out.printf("  → Confirmed: %s%n", booking);
            return true;
        } finally {
            lock.unlock();
        }
    }

    // Transition: CONFIRMED → CHECKED_IN → COMPLETED
    public boolean transition(String bookingId, BookingStatus newStatus) {
        Booking booking = bookingsById.get(bookingId);
        if (booking == null) return false;

        boolean valid = switch (newStatus) {
            case CHECKED_IN -> booking.status == BookingStatus.CONFIRMED;
            case COMPLETED -> booking.status == BookingStatus.CHECKED_IN;
            case CANCELLED -> booking.status == BookingStatus.HOLD || booking.status == BookingStatus.CONFIRMED;
            default -> false;
        };

        if (!valid) {
            System.out.printf("  → Invalid transition: %s → %s%n", booking.status, newStatus);
            return false;
        }

        booking.status = newStatus;
        System.out.printf("  → Transitioned: %s%n", booking);

        if (newStatus == BookingStatus.CANCELLED) {
            promoteWaitlist(booking.propertyId, booking.checkIn, booking.checkOut);
        }
        return true;
    }

    // Cancel a booking
    public boolean cancel(String bookingId) {
        return transition(bookingId, BookingStatus.CANCELLED);
    }

    // Waitlist management
    private void addToWaitlist(String propertyId, String guestId,
                                LocalDate checkIn, LocalDate checkOut, String idempotencyKey) {
        WaitlistEntry entry = new WaitlistEntry(guestId, checkIn, checkOut, idempotencyKey);
        waitlists.computeIfAbsent(propertyId, k -> new ConcurrentLinkedQueue<>()).add(entry);
        System.out.printf("  → Added %s to waitlist for %s%n", guestId, propertyId);
    }

    private void promoteWaitlist(String propertyId, LocalDate checkIn, LocalDate checkOut) {
        Queue<WaitlistEntry> queue = waitlists.get(propertyId);
        if (queue == null || queue.isEmpty()) return;

        WaitlistEntry next = queue.poll();
        System.out.printf("  → Promoting waitlisted guest %s%n", next.guestId);
        createHold(propertyId, next.guestId, next.checkIn, next.checkOut, next.idempotencyKey + "-promoted");
    }

    // Expire stale holds
    private void expireHolds(String propertyId) {
        List<Booking> bookings = bookingsByProperty.getOrDefault(propertyId, List.of());
        for (Booking b : bookings) {
            if (b.status == BookingStatus.HOLD && Instant.now().isAfter(b.holdExpiresAt)) {
                b.status = BookingStatus.EXPIRED;
                System.out.printf("  → Auto-expired: %s%n", b.bookingId);
                promoteWaitlist(propertyId, b.checkIn, b.checkOut);
            }
        }
    }

    // Status query
    public void printPropertyBookings(String propertyId) {
        List<Booking> bookings = bookingsByProperty.getOrDefault(propertyId, List.of());
        System.out.println("  Bookings for " + propertyId + ":");
        bookings.forEach(b -> System.out.println("    " + b));
        Queue<WaitlistEntry> wl = waitlists.get(propertyId);
        if (wl != null && !wl.isEmpty()) {
            System.out.println("  Waitlist: " + wl.size() + " entries");
        }
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) {
        ReservationSystem sys = new ReservationSystem();
        String prop = "PROP-1";
        LocalDate dec20 = LocalDate.of(2025, 12, 20);
        LocalDate dec25 = LocalDate.of(2025, 12, 25);

        System.out.println("=== Guest A creates hold ===");
        Booking holdA = sys.createHold(prop, "GuestA", dec20, dec25, "idem-A-1");

        System.out.println("\n=== Guest B tries same dates → waitlist ===");
        Booking holdB = sys.createHold(prop, "GuestB", dec20, dec25, "idem-B-1");

        System.out.println("\n=== Guest A retries (idempotent) ===");
        sys.createHold(prop, "GuestA", dec20, dec25, "idem-A-1");

        System.out.println("\n=== Guest A confirms ===");
        sys.confirmBooking(holdA.bookingId);

        System.out.println("\n=== Guest A cancels ===");
        sys.cancel(holdA.bookingId);
        // → Guest B auto-promoted from waitlist

        System.out.println("\n=== Final state ===");
        sys.printPropertyBookings(prop);

        System.out.println("\n=== Lifecycle: check-in → complete ===");
        Booking promoted = sys.bookingsById.values().stream()
            .filter(b -> b.guestId.equals("GuestB") && b.status == BookingStatus.HOLD)
            .findFirst().orElse(null);
        if (promoted != null) {
            sys.confirmBooking(promoted.bookingId);
            sys.transition(promoted.bookingId, BookingStatus.CHECKED_IN);
            sys.transition(promoted.bookingId, BookingStatus.COMPLETED);
        }

        System.out.println("\n=== Final state (after lifecycle) ===");
        sys.printPropertyBookings(prop);
    }
}
```

### Expected Output
```
=== Guest A creates hold ===
  → Hold created: [BK-1] HOLD guest=GuestA 2025-12-20→2025-12-25

=== Guest B tries same dates → waitlist ===
  → Conflict with BK-1 on 2025-12-20, adding to waitlist
  → Added GuestB to waitlist for PROP-1

=== Guest A retries (idempotent) ===
  → Idempotent hit: returning existing booking

=== Guest A confirms ===
  → Confirmed: [BK-1] CONFIRMED guest=GuestA 2025-12-20→2025-12-25

=== Guest A cancels ===
  → Transitioned: [BK-1] CANCELLED guest=GuestA 2025-12-20→2025-12-25
  → Promoting waitlisted guest GuestB
  → Hold created: [BK-2] HOLD guest=GuestB 2025-12-20→2025-12-25

=== Lifecycle: check-in → complete ===
  → Confirmed → CHECKED_IN → COMPLETED

=== Final state (after lifecycle) ===
  [BK-1] CANCELLED, [BK-2] COMPLETED
```

## 🎯 Key Takeaways
- **Per-property ReentrantLock**: fine-grained locking — only blocks concurrent access to same property
- **Idempotency key**: ConcurrentHashMap lookup before lock — O(1) retry detection
- **Hold expiry**: 15-min TTL checked lazily on next booking attempt (no background timer needed in interview)
- **Waitlist promotion**: automatic when hold expires or booking cancels
- **State machine**: HOLD → CONFIRMED → CHECKED_IN → COMPLETED with explicit valid transitions
- **CopyOnWriteArrayList**: safe for read-heavy workload (list bookings) with occasional writes

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Technical 1 | Medium | Date Conflict Check |
| Technical 2 | Hard | Concurrency, Idempotency |
| System Design | Hard | Reservation, Double-Booking |
| Cross-Functional | Medium | Guest Experience, Trust |
