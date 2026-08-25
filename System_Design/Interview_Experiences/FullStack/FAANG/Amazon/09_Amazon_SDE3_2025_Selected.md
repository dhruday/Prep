# Amazon — SDE-3 FullStack Interview Experience (2025) — #9

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-3 FullStack |
| **Level** | L6 |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Alexa Smart Home |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + Bar Raiser)
- **Timeline:** 3 weeks

---

## Round 1: Coding
**Duration:** 45 minutes

### Questions Asked
1. **Word Search II** (LeetCode 212) — Find all words from dictionary in grid
2. **Follow-up: Optimize for large dictionary (100K words)**

### 💡 Word Search II (Trie + Backtracking)

```java
class TrieNode {
    TrieNode[] children = new TrieNode[26];
    String word = null; // Store complete word at leaf — avoids StringBuilder
}

public List<String> findWords(char[][] board, String[] words) {
    // Build Trie from dictionary
    TrieNode root = new TrieNode();
    for (String word : words) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            if (node.children[c - 'a'] == null) {
                node.children[c - 'a'] = new TrieNode();
            }
            node = node.children[c - 'a'];
        }
        node.word = word;
    }
    
    List<String> result = new ArrayList<>();
    int m = board.length, n = board[0].length;
    
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            dfs(board, i, j, root, result);
        }
    }
    
    return result;
}

private void dfs(char[][] board, int i, int j, TrieNode node, List<String> result) {
    if (i < 0 || i >= board.length || j < 0 || j >= board[0].length) return;
    
    char c = board[i][j];
    if (c == '#' || node.children[c - 'a'] == null) return;
    
    node = node.children[c - 'a'];
    
    if (node.word != null) {
        result.add(node.word);
        node.word = null; // De-duplicate: don't find same word again
    }
    
    // Optimization: prune empty Trie branches
    board[i][j] = '#'; // Mark visited
    
    dfs(board, i + 1, j, node, result);
    dfs(board, i - 1, j, node, result);
    dfs(board, i, j + 1, node, result);
    dfs(board, i, j - 1, node, result);
    
    board[i][j] = c; // Restore
    
    // Aggressive Trie pruning: remove leaf node if no children left
    // This optimization prevents re-exploring dead branches
    // Significant for large dictionaries
}
// Time: O(M*N*4^L) where L = max word length, but Trie prunes aggressively
// Space: O(sum of word lengths for Trie)
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Amazon Alexa Smart Home Command Processing**
   - Voice command → NLU → intent → device action
   - Latency: command to device action < 2 seconds
   - Support: 100K device types (lights, locks, thermostats, cameras)
   - Routines: "Alexa, good morning" = lights on + thermostat 72°F + news briefing
   - Offline resilience: local processing hub for critical commands

### 💡 Key Design

```
Architecture:
┌──────────┐    Audio    ┌──────────┐  Intent   ┌──────────────┐
│  Echo     │───stream──▶│  Alexa   │──parse───▶│ Smart Home   │
│  Device   │◀──response─│  Cloud   │◀─result──│ Service       │
└──────────┘             └──────────┘           └──────┬───────┘
     │                                                  │
     │ Local LAN                                        │ Cloud API
     ▼                                                  ▼
┌──────────┐                              ┌──────────────────┐
│  Edge Hub │ (Zigbee/Z-Wave/WiFi)        │ Device Cloud     │
│  (local)  │ ◀──────────────────────────▶│ (Philips Hue,    │
└──────────┘                              │  Ring, Nest etc) │
                                          └──────────────────┘

Processing Pipeline (< 2 second SLA):
1. Audio Capture → Alexa Cloud (100-300ms)
   - Wake word detection: on-device ML (no cloud needed)
   - Audio stream: Opus codec, 16kHz sample rate
   
2. ASR (Automatic Speech Recognition) → Text (200-400ms)
   - "Alexa, turn on the living room lights to 50%"
   - → "turn on the living room lights to 50%"
   
3. NLU (Natural Language Understanding) → Intent (100-200ms)
   - Intent: SmartHome.TurnOn
   - Slots: { device: "living room lights", brightness: 50 }
   
4. Smart Home Service → Device Directive (200-400ms)
   - Resolve device: "living room lights" → device_id: "amzn1.device.xxx"
   - Build directive: {
       "type": "SetBrightness",
       "device_id": "amzn1.device.xxx",
       "payload": { "brightness": 50 }
     }
   
5. Device Cloud → Physical Device (200-500ms)
   - API call to Philips Hue cloud → Hub → Light bulb
   - OR: direct LAN command via Echo Hub → Zigbee → Bulb

Device Registry:
class DeviceRegistry {
    // User's devices indexed by account
    Map<String, List<SmartDevice>> devices; // userId → devices
    
    // Discovery: periodic + on-demand
    List<SmartDevice> discover(String userId) {
        List<SmartDevice> discovered = new ArrayList<>();
        
        // Query all linked skill providers
        for (SkillProvider provider : linkedProviders.get(userId)) {
            discovered.addAll(provider.discover(userId));
        }
        
        // Merge with existing (don't duplicate)
        return mergeDevices(devices.get(userId), discovered);
    }
    
    SmartDevice resolveDevice(String userId, String spokenName) {
        // Fuzzy match: "living room light" vs "Living Room Light 1"
        return devices.get(userId).stream()
            .max(Comparator.comparingDouble(d ->
                fuzzyMatch(d.friendlyName.toLowerCase(), spokenName.toLowerCase())
            ))
            .filter(d -> fuzzyMatch(d.friendlyName, spokenName) > 0.7)
            .orElse(null);
    }
}

Routines:
class Routine {
    String triggerId;       // "good morning" phrase or time trigger
    TriggerType triggerType; // VOICE, SCHEDULE, DEVICE_EVENT, LOCATION
    List<RoutineAction> actions; // Ordered list
    boolean parallel;       // Execute actions in parallel or sequential
    
    void execute(ExecutionContext ctx) {
        if (parallel) {
            CompletableFuture<Void> all = CompletableFuture.allOf(
                actions.stream()
                    .map(action -> CompletableFuture.runAsync(() -> action.execute(ctx)))
                    .toArray(CompletableFuture[]::new)
            );
            all.join();
        } else {
            for (RoutineAction action : actions) {
                action.execute(ctx);
                if (action.hasDelay()) Thread.sleep(action.getDelay());
            }
        }
    }
}

Local Processing (Edge Hub):
- Echo Hub acts as Zigbee/Z-Wave coordinator
- Critical commands (lights, locks) can execute locally without cloud
- Latency improvement: < 200ms for local devices
- Offline resilience: if internet is down, basic commands still work
- Local cache of device states for instant response

Scale:
- 500M Alexa-enabled devices worldwide
- 100K+ smart home skills
- 1B commands/day
- P99 latency: < 2 seconds end-to-end
- Device state sync: every 60s polling + event-driven updates
```

---

## 🎯 Key Takeaways
- Amazon Alexa = **voice processing pipeline + IoT + edge computing + low latency**
- **Word Search II**: Trie + DFS backtracking — store word at leaf node for O(1) result collection
- **Trie pruning**: remove searched words + dead branches → massive performance gain for large dicts
- **Alexa pipeline**: audio → ASR → NLU → intent → device directive → physical device < 2s
- **Local processing**: Echo Hub as Zigbee coordinator for offline resilience and lower latency
- **Device name resolution**: fuzzy matching (spoken name vs registered friendly name)
- **Routines**: parallel execution for independent actions (lights + thermostat), sequential for dependent
- Amazon SDE-3 LP emphasis: **Ownership, Bias for Action, Dive Deep** — prepare scenarios with metrics

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Array, String |
| Coding | Hard | Trie + Backtracking, Word Search II |
| System Design | Hard | Alexa, IoT, Voice Pipeline |
| Bar Raiser | Hard | Leadership Principles, Depth |
