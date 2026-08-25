# GoldmanSachs — VP FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | Vice President, Engineering |
| **Level** | VP |
| **YOE** | 10 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Marcus (Consumer Banking) |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (HackerRank + Technical 1 + Technical 2 + System Design + HM)

---

## Round 2: Coding — Implement an Order Matching Engine
**Duration:** 45 minutes

### Question: Build a simplified stock exchange order matching engine. Support limit orders (buy/sell) and match orders when bid >= ask. Execute at the best available price.

```java
import java.util.*;

/**
 * Stock Exchange Order Matching Engine:
 * 
 * Buy orders: max-heap (highest bid has priority)
 * Sell orders: min-heap (lowest ask has priority)
 * 
 * Match when: highest buy bid >= lowest sell ask
 * Execution price: sell's ask price (price-time priority: maker gets their price)
 * 
 * Time-priority: among equal prices, earlier orders match first.
 * 
 * Time: O(log N) per add, O(1) per match check
 */
class OrderMatchingEngine {
    
    enum Side { BUY, SELL }
    
    static class Order {
        final String id;
        final Side side;
        final String symbol;
        double price;       // Limit price
        int quantity;        // Remaining quantity
        final long timestamp;
        
        Order(Side side, String symbol, double price, int quantity) {
            this.id = UUID.randomUUID().toString().substring(0, 8);
            this.side = side;
            this.symbol = symbol;
            this.price = price;
            this.quantity = quantity;
            this.timestamp = System.nanoTime();
        }
    }
    
    static class Trade {
        final String buyOrderId;
        final String sellOrderId;
        final String symbol;
        final double price;
        final int quantity;
        final long timestamp;
        
        Trade(String buyId, String sellId, String symbol, double price, int qty) {
            this.buyOrderId = buyId;
            this.sellOrderId = sellId;
            this.symbol = symbol;
            this.price = price;
            this.quantity = qty;
            this.timestamp = System.currentTimeMillis();
        }
        
        @Override
        public String toString() {
            return String.format("TRADE: %s %d@%.2f (buy:%s sell:%s)", 
                symbol, quantity, price, buyOrderId, sellOrderId);
        }
    }
    
    // Per-symbol order books
    private Map<String, OrderBook> orderBooks = new HashMap<>();
    private List<Trade> tradeHistory = new ArrayList<>();
    
    static class OrderBook {
        // Buy orders: sorted by price DESC, then timestamp ASC (price-time priority)
        PriorityQueue<Order> bids = new PriorityQueue<>((a, b) -> {
            int cmp = Double.compare(b.price, a.price); // Higher price first
            return cmp != 0 ? cmp : Long.compare(a.timestamp, b.timestamp); // Earlier first
        });
        
        // Sell orders: sorted by price ASC, then timestamp ASC
        PriorityQueue<Order> asks = new PriorityQueue<>((a, b) -> {
            int cmp = Double.compare(a.price, b.price); // Lower price first
            return cmp != 0 ? cmp : Long.compare(a.timestamp, b.timestamp);
        });
    }
    
    /**
     * Submit a new order. Returns list of trades generated.
     * 
     * Algorithm:
     * 1. Try to match incoming order against opposite side
     * 2. Match as long as bid >= ask (for buys) or ask <= bid (for sells)
     * 3. Execute at the resting order's price (maker gets their price)
     * 4. If order is not fully filled, add remainder to the book
     */
    public List<Trade> submitOrder(Order order) {
        OrderBook book = orderBooks.computeIfAbsent(order.symbol, k -> new OrderBook());
        List<Trade> trades = new ArrayList<>();
        
        if (order.side == Side.BUY) {
            // Match against sells (asks)
            while (order.quantity > 0 && !book.asks.isEmpty()) {
                Order bestAsk = book.asks.peek();
                
                if (order.price < bestAsk.price) break; // No match possible
                
                // Match! Execute at ask price (maker's price)
                int fillQty = Math.min(order.quantity, bestAsk.quantity);
                double executionPrice = bestAsk.price;
                
                Trade trade = new Trade(order.id, bestAsk.id, order.symbol, executionPrice, fillQty);
                trades.add(trade);
                tradeHistory.add(trade);
                
                order.quantity -= fillQty;
                bestAsk.quantity -= fillQty;
                
                if (bestAsk.quantity == 0) {
                    book.asks.poll(); // Remove fully filled sell
                }
            }
            
            // Add unfilled remainder to bid book
            if (order.quantity > 0) {
                book.bids.offer(order);
            }
            
        } else { // SELL
            // Match against buys (bids)
            while (order.quantity > 0 && !book.bids.isEmpty()) {
                Order bestBid = book.bids.peek();
                
                if (order.price > bestBid.price) break; // No match
                
                int fillQty = Math.min(order.quantity, bestBid.quantity);
                double executionPrice = bestBid.price;
                
                Trade trade = new Trade(bestBid.id, order.id, order.symbol, executionPrice, fillQty);
                trades.add(trade);
                tradeHistory.add(trade);
                
                order.quantity -= fillQty;
                bestBid.quantity -= fillQty;
                
                if (bestBid.quantity == 0) {
                    book.bids.poll();
                }
            }
            
            if (order.quantity > 0) {
                book.asks.offer(order);
            }
        }
        
        return trades;
    }
    
    /**
     * Cancel an order by removing from the book.
     * In production: use HashMap<orderId, Order> for O(1) lookup + lazy deletion.
     */
    public boolean cancelOrder(String orderId, String symbol) {
        OrderBook book = orderBooks.get(symbol);
        if (book == null) return false;
        
        return book.bids.removeIf(o -> o.id.equals(orderId)) ||
               book.asks.removeIf(o -> o.id.equals(orderId));
    }
    
    /**
     * Get best bid/ask for a symbol.
     */
    public double[] getBestBidAsk(String symbol) {
        OrderBook book = orderBooks.get(symbol);
        if (book == null) return new double[]{0, 0};
        
        double bestBid = book.bids.isEmpty() ? 0 : book.bids.peek().price;
        double bestAsk = book.asks.isEmpty() ? 0 : book.asks.peek().price;
        return new double[]{bestBid, bestAsk};
    }
    
    /**
     * Get top-of-book depth (best N levels).
     */
    public String getOrderBookDepth(String symbol, int levels) {
        OrderBook book = orderBooks.get(symbol);
        if (book == null) return "No order book for " + symbol;
        
        // Snapshot bids and asks
        TreeMap<Double, Integer> bidLevels = new TreeMap<>(Collections.reverseOrder());
        for (Order o : book.bids) {
            bidLevels.merge(o.price, o.quantity, Integer::sum);
        }
        
        TreeMap<Double, Integer> askLevels = new TreeMap<>();
        for (Order o : book.asks) {
            askLevels.merge(o.price, o.quantity, Integer::sum);
        }
        
        StringBuilder sb = new StringBuilder();
        sb.append("--- Order Book: ").append(symbol).append(" ---\n");
        sb.append("BIDS                     ASKS\n");
        
        Iterator<Map.Entry<Double, Integer>> bidIt = bidLevels.entrySet().iterator();
        Iterator<Map.Entry<Double, Integer>> askIt = askLevels.entrySet().iterator();
        
        for (int i = 0; i < levels; i++) {
            String bidStr = bidIt.hasNext() ? 
                String.format("%6d @ $%.2f", bidIt.next().getValue(), bidIt.next().getKey()) : "                ";
            String askStr = askIt.hasNext() ?
                String.format("$%.2f @ %d", askIt.next().getKey(), askIt.next().getValue()) : "";
            sb.append(bidStr).append("  |  ").append(askStr).append("\n");
        }
        
        return sb.toString();
    }
}
```

---

## 🎯 Key Takeaways
- Goldman Sachs VP = **Order matching engine — price-time priority, partial fills, bid/ask heaps**
- **Two heaps per symbol**: bids (max-heap, highest price first), asks (min-heap, lowest price first)
- **Match condition**: `buyPrice >= sellPrice` — execute at maker's (resting order) price
- **Partial fills**: reduce quantities, create trade for filled amount — order stays in book until fully filled
- **Price-time priority**: same price → earlier timestamp has priority (FIFO within price level)
- **Trade generation**: immediate on submission — no batching (continuous matching)
- **Cancel**: in interview, `removeIf` is O(N) — production would use `HashMap<orderId>` + lazy deletion
- GS = **capital markets / trading** — order books, matching engines, risk management, low-latency systems

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| HackerRank | Medium | DSA |
| Technical 1 | Very Hard | Order Matching Engine |
| Technical 2 | Hard | Concurrency, Java |
| System Design | Very Hard | Trading Platform |
| HM | Medium | Culture Fit |
