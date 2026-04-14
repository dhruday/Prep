# Flipkart — SDE-2 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-2 |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 DSA + System Design)
- **Rejection Reason:** System Design — couldn't handle consistency requirements for inventory management

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Multi-Player Snake and Ladder Game**
   - Multiple players, configurable board, special rules (crocodile bites, mine)

### 💡 Interview-Ready Answer

```java
class SnakeAndLadderGame {
    private final Board board;
    private final List<Player> players;
    private final Dice dice;
    private int currentPlayerIndex;
    private boolean gameOver;
    
    SnakeAndLadderGame(int boardSize, List<String> playerNames) {
        this.board = new Board(boardSize);
        this.players = playerNames.stream()
            .map(name -> new Player(name, 0)) // Start at position 0
            .collect(Collectors.toList());
        this.dice = new Dice(1); // Single die
        this.currentPlayerIndex = 0;
        this.gameOver = false;
    }
    
    void addSnake(int head, int tail) {
        if (head <= tail) throw new IllegalArgumentException("Snake head must be above tail");
        board.addEntity(head, new Snake(head, tail));
    }
    
    void addLadder(int bottom, int top) {
        if (bottom >= top) throw new IllegalArgumentException("Ladder bottom must be below top");
        board.addEntity(bottom, new Ladder(bottom, top));
    }
    
    void addCrocodile(int position) {
        // Crocodile: sends player back 5 positions
        board.addEntity(position, new Crocodile(position));
    }
    
    void addMine(int position) {
        // Mine: player skips next 2 turns
        board.addEntity(position, new Mine(position));
    }
    
    MoveResult playTurn() {
        if (gameOver) return new MoveResult(null, 0, 0, "Game is over", true);
        
        Player player = players.get(currentPlayerIndex);
        
        // Check if player must skip turns (mine penalty)
        if (player.turnsToSkip > 0) {
            player.turnsToSkip--;
            String msg = player.name + " skips turn (" + player.turnsToSkip + " remaining)";
            advanceToNextPlayer();
            return new MoveResult(player.name, player.position, player.position, msg, false);
        }
        
        int diceValue = dice.roll();
        int newPosition = player.position + diceValue;
        
        // Can't go beyond the board
        if (newPosition > board.size) {
            String msg = player.name + " rolled " + diceValue + " but can't move (would exceed board)";
            advanceToNextPlayer();
            return new MoveResult(player.name, player.position, player.position, msg, false);
        }
        
        int oldPosition = player.position;
        player.position = newPosition;
        
        // Check for snake/ladder/special entity
        BoardEntity entity = board.getEntity(newPosition);
        StringBuilder msg = new StringBuilder();
        msg.append(player.name).append(" rolled ").append(diceValue)
           .append(": ").append(oldPosition).append(" → ").append(newPosition);
        
        if (entity != null) {
            int finalPosition = entity.getDestination();
            msg.append(" → ").append(entity.getType()).append("! → ").append(finalPosition);
            player.position = finalPosition;
            
            if (entity instanceof Mine) {
                player.turnsToSkip = 2;
                msg.append(" (skip 2 turns)");
            }
        }
        
        // Check win condition
        if (player.position == board.size) {
            gameOver = true;
            msg.append(" 🎉 WINS!");
            return new MoveResult(player.name, oldPosition, player.position, msg.toString(), true);
        }
        
        // If rolled 6, player gets another turn (don't advance)
        if (diceValue != 6) {
            advanceToNextPlayer();
        } else {
            msg.append(" (bonus turn!)");
        }
        
        return new MoveResult(player.name, oldPosition, player.position, msg.toString(), false);
    }
    
    private void advanceToNextPlayer() {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.size();
    }
    
    record MoveResult(String playerName, int from, int to, String message, boolean gameOver) {}
    
    static class Board {
        final int size;
        final Map<Integer, BoardEntity> entities = new HashMap<>();
        void addEntity(int pos, BoardEntity entity) { entities.put(pos, entity); }
        BoardEntity getEntity(int pos) { return entities.get(pos); }
        Board(int size) { this.size = size; }
    }
    
    interface BoardEntity {
        int getDestination();
        String getType();
    }
    
    record Snake(int head, int tail) implements BoardEntity {
        public int getDestination() { return tail; }
        public String getType() { return "🐍 Snake"; }
    }
    
    record Ladder(int bottom, int top) implements BoardEntity {
        public int getDestination() { return top; }
        public String getType() { return "🪜 Ladder"; }
    }
    
    record Crocodile(int position) implements BoardEntity {
        public int getDestination() { return Math.max(1, position - 5); }
        public String getType() { return "🐊 Crocodile"; }
    }
    
    record Mine(int position) implements BoardEntity {
        public int getDestination() { return position; } // Stay, but skip turns
        public String getType() { return "💣 Mine"; }
    }
    
    static class Player {
        String name;
        int position;
        int turnsToSkip;
        Player(String name, int position) { this.name = name; this.position = position; }
    }
    
    static class Dice {
        private final int count;
        private final Random random = new Random();
        Dice(int count) { this.count = count; }
        int roll() {
            int total = 0;
            for (int i = 0; i < count; i++) total += random.nextInt(6) + 1;
            return total;
        }
    }
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Find the Celebrity** (LeetCode 277)
2. **Find the Town Judge** (LeetCode 997)

### 💡 Find the Celebrity

```java
// Celebrity: everyone knows them, they know nobody
// O(n) solution using elimination
public int findCelebrity(int n) {
    int candidate = 0;
    
    // Phase 1: Eliminate — if candidate knows i, then candidate is NOT celebrity
    for (int i = 1; i < n; i++) {
        if (knows(candidate, i)) {
            candidate = i; // candidate can't be celebrity, try i
        }
    }
    
    // Phase 2: Verify — make sure everyone knows candidate AND candidate knows nobody
    for (int i = 0; i < n; i++) {
        if (i != candidate) {
            if (!knows(i, candidate) || knows(candidate, i)) {
                return -1; // No celebrity
            }
        }
    }
    
    return candidate;
}
// Time: O(n) — exactly 3(n-1) calls to knows()
// Space: O(1)

// Town Judge — graph approach: indegree - outdegree == n-1
public int findJudge(int n, int[][] trust) {
    int[] netTrust = new int[n + 1]; // indegree - outdegree
    
    for (int[] t : trust) {
        netTrust[t[0]]--; // trusts someone → outdegree++
        netTrust[t[1]]++; // trusted by someone → indegree++
    }
    
    for (int i = 1; i <= n; i++) {
        if (netTrust[i] == n - 1) return i;
    }
    
    return -1;
}
// Time: O(E + V), Space: O(V)
```

---

## Round 3: System Design (Where I Failed)
**Duration:** 60 minutes

### Questions Asked
1. **Design Flipkart's Inventory Management System**
   - Real-time stock, concurrent purchases, warehouse management, consistency

### 💡 What I Should Have Said

```
Flipkart Inventory:
┌──────────────────────────────────────────────────────────────┐
│  Core Challenge: Prevent overselling while maintaining        │
│  high throughput during flash sales                           │
│                                                                │
│  Stock Management:                                            │
│  - Per-SKU stock count in Redis (single source of truth)     │
│  - Redis DECR is atomic — handles concurrent decrements      │
│                                                                │
│  Purchase Flow (Oversell Prevention):                        │
│  -- Lua script for atomic check-and-decrement:               │
│  local stock = redis.call('GET', KEYS[1])                    │
│  if tonumber(stock) >= tonumber(ARGV[1]) then                │
│      redis.call('DECRBY', KEYS[1], ARGV[1])                 │
│      return 1 -- success                                     │
│  end                                                          │
│  return 0 -- insufficient stock                              │
│                                                                │
│  Consistency Model:                                           │
│  1. Write-ahead: deduct stock → process payment → confirm    │
│  2. If payment fails: compensating action (increment stock)  │
│  3. If payment times out: saga pattern with timeout revert   │
│  4. Two-phase: NOT recommended for high-throughput           │
│                                                                │
│  Warehouse Distribution:                                      │
│  - Stock partitioned by warehouse                            │
│  - stock:{sku}:{warehouse_id} → count                        │
│  - Total stock = SUM across warehouses                       │
│  - Nearest warehouse selection: geo-distance + stock check   │
│  - Inter-warehouse transfer: async job when imbalanced       │
│                                                                │
│  Flash Sale Architecture:                                     │
│  1. Pre-warm: cache product + price + stock 10 min before    │
│  2. Queue-based: accept requests → enqueue → process FIFO    │
│  3. Token system: issue purchase tokens (limited = stock)    │
│     Token holders get 10 min to complete checkout            │
│  4. Reject after stock hits 0 — no waiting                   │
│                                                                │
│  Data Flow:                                                   │
│  ┌──────┐  ┌──────────┐  ┌────────┐  ┌──────────┐          │
│  │ App   │─▶│ API GW    │─▶│ Queue   │─▶│ Inventory │          │
│  │       │  │ (rate     │  │ (Kafka) │  │ Service   │          │
│  │       │  │  limit)   │  │         │  │           │          │
│  └──────┘  └──────────┘  └────────┘  └──────┬───┘          │
│                                               │              │
│                                       ┌───────▼────┐         │
│                                       │ Redis       │         │
│                                       │ stock:{sku} │         │
│                                       │             │         │
│                                       │ PostgreSQL  │         │
│                                       │ (source of  │         │
│                                       │  record)    │         │
│                                       └────────────┘         │
│                                                                │
│  Redis → PostgreSQL sync:                                     │
│  - Every stock change → Kafka event → PostgreSQL update      │
│  - Periodic reconciliation job: compare Redis vs PG          │
│  - If mismatch > threshold → alert + manual review           │
│                                                                │
│  Scale:                                                       │
│  - 150M+ SKUs                                                │
│  - 10M+ stock updates/day                                    │
│  - Flash sale: 100K concurrent users in first second         │
│  - Redis: 500K ops/sec for stock operations                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Flipkart SDE-2 = **machine coding (game design) + inventory management system design**
- **Snake and Ladder** tests OOP: entities (Snake, Ladder, Crocodile), extensibility, game loop
- **Find Celebrity** = O(n) elimination algorithm — elegant two-phase approach
- **Inventory oversell prevention** = Redis Lua atomic script (I failed here by suggesting DB locks)
- **Flash sale** = token-based system, queue, pre-warm cache — don't rely on DB for real-time
- **Consistency** = write-ahead deduction + compensating action (NOT 2PC for high throughput)
- Flipkart always asks about **e-commerce systems** — inventory, cart, payment, delivery

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium | OOP, Game Design, Extensibility |
| DSA | Medium | Celebrity Problem, Graph (Town Judge) |
| System Design | Very Hard | Inventory, Concurrency, Flash Sale |
