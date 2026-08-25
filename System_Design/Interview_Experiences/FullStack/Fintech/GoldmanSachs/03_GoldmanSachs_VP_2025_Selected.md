# Goldman Sachs — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | VP Engineering |
| **Level** | Vice President |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | GS Transaction Banking |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (HackerRank + 2 Technical + System Design + HM)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Design Twitter / X Feed** (Merge K Sorted Lists variant)
   - Follow relationships: user follows users
   - getNewsFeed returns 10 most recent tweets from followed users
   - postTweet, follow, unfollow

### 💡 Twitter Feed (LeetCode 355)

```java
class Twitter {
    private int timestamp = 0;
    private final Map<Integer, Set<Integer>> following = new HashMap<>(); // userId → Set<followeeIds>
    private final Map<Integer, List<int[]>> tweets = new HashMap<>(); // userId → List<[timestamp, tweetId]>
    
    void postTweet(int userId, int tweetId) {
        tweets.computeIfAbsent(userId, k -> new ArrayList<>()).add(new int[]{timestamp++, tweetId});
    }
    
    List<Integer> getNewsFeed(int userId) {
        // Merge K sorted lists (K = number of followees + self)
        PriorityQueue<int[]> maxHeap = new PriorityQueue<>((a, b) -> b[0] - a[0]); // Most recent first
        
        Set<Integer> followees = following.getOrDefault(userId, new HashSet<>());
        
        // Add self
        List<int[]> selfTweets = tweets.getOrDefault(userId, List.of());
        if (!selfTweets.isEmpty()) {
            int idx = selfTweets.size() - 1;
            maxHeap.offer(new int[]{selfTweets.get(idx)[0], selfTweets.get(idx)[1], userId, idx});
        }
        
        // Add latest tweet from each followee
        for (int followee : followees) {
            List<int[]> followeeTweets = tweets.getOrDefault(followee, List.of());
            if (!followeeTweets.isEmpty()) {
                int idx = followeeTweets.size() - 1;
                maxHeap.offer(new int[]{followeeTweets.get(idx)[0], followeeTweets.get(idx)[1], followee, idx});
            }
        }
        
        List<Integer> feed = new ArrayList<>();
        while (!maxHeap.isEmpty() && feed.size() < 10) {
            int[] top = maxHeap.poll();
            feed.add(top[1]); // tweetId
            
            int userId2 = top[2];
            int prevIdx = top[3] - 1;
            if (prevIdx >= 0) {
                List<int[]> userTweets = tweets.get(userId2);
                maxHeap.offer(new int[]{userTweets.get(prevIdx)[0], userTweets.get(prevIdx)[1], userId2, prevIdx});
            }
        }
        
        return feed;
    }
    
    void follow(int followerId, int followeeId) {
        if (followerId == followeeId) return;
        following.computeIfAbsent(followerId, k -> new HashSet<>()).add(followeeId);
    }
    
    void unfollow(int followerId, int followeeId) {
        following.getOrDefault(followerId, Set.of()).remove(followeeId);
    }
}
// Time: getNewsFeed O(K log K + 10 log K) where K = followees
// Space: O(users * tweets)
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design a Real-Time Trade Matching Engine** (for equities exchange)
   - Order types: Market, Limit, Stop-Loss
   - Price-time priority matching
   - Book management: Bid/Ask order book
   - Latency: < 1ms for matching
   - Audit trail for regulatory compliance

### 💡 Key Design

```
Architecture:
┌──────────┐  FIX Protocol  ┌──────────────┐
│  Broker  │────────────────▶│  Gateway     │
│  System  │◀────────────────│  (FIX/REST)  │
└──────────┘  Execution Rpt  └──────┬───────┘
                                     │ Validated Order
                              ┌──────▼───────┐
                              │  Matching    │ Single-threaded per symbol
                              │  Engine      │ (LMAX Disruptor pattern)
                              └──────┬───────┘
                                     │ Trades
                    ┌────────────────┼────────────────┐
                    │                │                 │
             ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
             │ Market Data │  │ Clearing & │  │ Audit Log  │
             │ Publisher   │  │ Settlement │  │ (Append    │
             │ (L1/L2)     │  │ Service    │  │  Only)     │
             └─────────────┘  └────────────┘  └────────────┘

Order Book (Price-Time Priority):
class OrderBook {
    // Bid side: max-heap (highest price first, then earliest time)
    private final TreeMap<Long, LinkedList<Order>> bids = new TreeMap<>(Comparator.reverseOrder());
    // Ask side: min-heap (lowest price first, then earliest time)
    private final TreeMap<Long, LinkedList<Order>> asks = new TreeMap<>();
    
    // No locks needed: single-threaded per symbol (Disruptor pattern)
    
    List<Trade> processOrder(Order order) {
        List<Trade> trades = new ArrayList<>();
        
        if (order.type == OrderType.MARKET) {
            trades.addAll(matchMarketOrder(order));
        } else if (order.type == OrderType.LIMIT) {
            trades.addAll(matchLimitOrder(order));
        }
        
        return trades;
    }
    
    private List<Trade> matchLimitOrder(Order order) {
        List<Trade> trades = new ArrayList<>();
        TreeMap<Long, LinkedList<Order>> opposite = order.side == Side.BUY ? asks : bids;
        
        while (order.remainingQty > 0 && !opposite.isEmpty()) {
            Map.Entry<Long, LinkedList<Order>> bestLevel = opposite.firstEntry();
            long bestPrice = bestLevel.getKey();
            
            // Check if prices cross
            if (order.side == Side.BUY && order.price < bestPrice) break;
            if (order.side == Side.SELL && order.price > bestPrice) break;
            
            LinkedList<Order> queue = bestLevel.getValue();
            
            while (!queue.isEmpty() && order.remainingQty > 0) {
                Order passive = queue.peekFirst();
                long matchQty = Math.min(order.remainingQty, passive.remainingQty);
                long matchPrice = passive.price; // Passive order's price (price-time priority)
                
                // Create trade
                Trade trade = new Trade(
                    order.side == Side.BUY ? order : passive,
                    order.side == Side.BUY ? passive : order,
                    matchQty, matchPrice, Instant.now()
                );
                trades.add(trade);
                
                order.remainingQty -= matchQty;
                passive.remainingQty -= matchQty;
                
                if (passive.remainingQty == 0) {
                    queue.pollFirst(); // Fully filled
                }
            }
            
            if (queue.isEmpty()) opposite.pollFirstEntry();
        }
        
        // If order has remaining quantity, add to book
        if (order.remainingQty > 0) {
            TreeMap<Long, LinkedList<Order>> sameSign = order.side == Side.BUY ? bids : asks;
            sameSign.computeIfAbsent(order.price, k -> new LinkedList<>()).addLast(order);
        }
        
        return trades;
    }
    
    // Market Data: Best Bid/Ask (Level 1)
    MarketData getL1Data() {
        return new MarketData(
            bids.isEmpty() ? 0 : bids.firstKey(),
            bids.isEmpty() ? 0 : bids.firstEntry().getValue().stream().mapToLong(o -> o.remainingQty).sum(),
            asks.isEmpty() ? 0 : asks.firstKey(),
            asks.isEmpty() ? 0 : asks.firstEntry().getValue().stream().mapToLong(o -> o.remainingQty).sum()
        );
    }
}

LMAX Disruptor Pattern (Single-Threaded Matching):
- One thread per symbol processes all orders sequentially
- No locks, no contention → predictable sub-millisecond latency
- Ring buffer (Disruptor) for order input queue
- Orders sorted into symbol buckets by gateway before matching

Audit Trail (Regulatory Compliance):
- Every order, modification, cancellation, trade → append-only log
- Immutable: no updates, no deletes (WORM storage)
- Timestamp: nanosecond precision with NTP sync
- Retention: 7 years minimum (SEC/SEBI requirement)
- Format: FIX protocol messages → parquet files → cold storage (S3 Glacier)

Cancel/Modify:
- Cancel: remove from order book, log cancellation
- Modify: cancel + new order (never modify in-place)
- Sequence numbers ensure ordering: modify with stale seqNum is rejected

Scale:
- 10K orders/second per symbol
- 5,000 symbols
- Matching latency: P99 < 1ms (single-threaded, no GC pauses — use C++ or tuned Java)
- Market data: multicast UDP for L1/L2 (< 1ms)
- Journal: 500M events/day → append-only storage
```

---

## 🎯 Key Takeaways
- Goldman Sachs = **financial systems + low-latency + correctness + regulatory compliance**
- **Twitter Feed = Merge K Sorted Lists**: max-heap with lazy loading from each user's tweet list
- **Order book**: TreeMap (sorted price levels) × LinkedList (time priority within level)
- **Price-time priority**: passive order's price wins (maker-taker), earliest order at same price fills first
- **LMAX Disruptor**: single-threaded per symbol → no locks → sub-millisecond matching
- **Market order**: match immediately at best available price, no price limit
- **Audit trail**: append-only, immutable, nanosecond timestamps, 7-year retention
- GS VP interview: deep system design + domain knowledge + leadership stories

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| HackerRank | Medium | DSA + SQL |
| Coding | Medium-Hard | Merge K Lists, Twitter Feed |
| System Design | Hard | Trade Matching Engine, Order Book |
| HM | Medium-Hard | VP-level Leadership |
