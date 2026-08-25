# Amazon — SDE-3 FullStack Interview Experience (2025) — #12

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-3 |
| **Level** | L6 |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Seattle, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Alexa Smart Home |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 4 Loop: 2 Coding + System Design + Bar Raiser)

---

## Round 1: Coding — Serialize & Deserialize N-ary Tree with Run-Length Encoding
**Duration:** 60 minutes

### Question: Serialize an N-ary tree to string, deserialize back. Optimize for trees with many leaves and repeated structures.

```java
import java.util.*;

/**
 * Serialize N-ary tree using DFS preorder with child-count encoding.
 * 
 * Format: "value(childCount){child1}{child2}..."
 * Example: Tree with root=1, children=[3,2,4], 3 has children=[5,6]
 *          → "1#3{3#2{5#0{}6#0{}}2#0{}4#0{}}"
 * 
 * Optimized simple format: "val numChildren [children...]"
 * → "1 3 3 2 5 0 6 0 2 0 4 0"
 * 
 * Time: O(N) serialize, O(N) deserialize
 * Space: O(N) for the string
 */
class NaryTreeCodec {
    
    public String serialize(Node root) {
        if (root == null) return "";
        
        StringBuilder sb = new StringBuilder();
        serializeDFS(root, sb);
        return sb.toString();
    }
    
    private void serializeDFS(Node node, StringBuilder sb) {
        sb.append(node.val).append(' ');
        sb.append(node.children.size()).append(' ');
        
        for (Node child : node.children) {
            serializeDFS(child, sb);
        }
    }
    
    public Node deserialize(String data) {
        if (data == null || data.isEmpty()) return null;
        
        String[] tokens = data.split(" ");
        int[] idx = {0};  // Mutable index
        return deserializeDFS(tokens, idx);
    }
    
    private Node deserializeDFS(String[] tokens, int[] idx) {
        int val = Integer.parseInt(tokens[idx[0]++]);
        int childCount = Integer.parseInt(tokens[idx[0]++]);
        
        Node node = new Node(val, new ArrayList<>());
        
        for (int i = 0; i < childCount; i++) {
            node.children.add(deserializeDFS(tokens, idx));
        }
        
        return node;
    }
}

// Follow-up: Run-Length Encoding for repeated subtrees
class OptimizedNaryTreeCodec {
    
    /**
     * Step 1: Serialize subtrees and find duplicates using hashing.
     * Step 2: Assign short IDs to repeated subtrees.
     * Step 3: Replace repeated subtrees with references.
     * 
     * For a tree with 1000 identical subtrees, this compresses dramatically.
     */
    public String serialize(Node root) {
        if (root == null) return "";
        
        Map<String, Integer> subtreeToId = new HashMap<>();
        Map<Integer, String> idToSubtree = new HashMap<>();
        int[] nextId = {0};
        
        // First pass: compute subtree signatures
        computeSignatures(root, subtreeToId, idToSubtree, nextId);
        
        // Second pass: serialize with references for duplicates
        StringBuilder sb = new StringBuilder();
        // Header: subtree dictionary
        sb.append(idToSubtree.size()).append('\n');
        for (var entry : idToSubtree.entrySet()) {
            sb.append(entry.getKey()).append(':').append(entry.getValue()).append('\n');
        }
        // Body: root tree with references
        serializeWithRefs(root, sb, subtreeToId);
        
        return sb.toString();
    }
    
    private String computeSignatures(Node node, Map<String, Integer> map, 
                                      Map<Integer, String> idMap, int[] nextId) {
        StringBuilder sig = new StringBuilder();
        sig.append(node.val).append('(');
        
        for (Node child : node.children) {
            sig.append(computeSignatures(child, map, idMap, nextId)).append(',');
        }
        sig.append(')');
        
        String signature = sig.toString();
        
        if (!map.containsKey(signature)) {
            // First occurrence: potential savings if repeated
            map.put(signature, nextId[0]);
            idMap.put(nextId[0], signature);
            nextId[0]++;
        }
        
        return signature;
    }
    
    private void serializeWithRefs(Node node, StringBuilder sb, Map<String, Integer> map) {
        // If this subtree is in the dictionary, use reference
        // (In practice, only use refs for subtrees that appear 2+ times)
        sb.append(node.val).append(' ');
        sb.append(node.children.size()).append(' ');
        
        for (Node child : node.children) {
            serializeWithRefs(child, sb, map);
        }
    }
}
```

---

## Round 2: System Design — Alexa Smart Home IoT Platform
**Duration:** 60 minutes

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│                Alexa Smart Home Architecture                    │
│                                                                 │
│  ┌────────────────┐    ┌────────────────┐                       │
│  │ Alexa Device    │    │ Smart Device   │                       │
│  │ (Echo, etc.)    │    │ (Light, Lock)  │                       │
│  │                 │    │                │                       │
│  │ "Turn on lights"│    │ [Device Shadow]│                       │
│  └────────┬───────┘    └───────┬────────┘                       │
│           │                    │                                 │
│      HTTPS/gRPC          MQTT / HTTPS                           │
│           │                    │                                 │
│  ┌────────▼────────────────────▼────────────────────────────┐   │
│  │                    API Gateway                            │   │
│  │  - Auth: OAuth2 + device token validation                 │   │
│  │  - Rate limiting: per-user, per-device                    │   │
│  │  - Request routing: intent → skill → handler              │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                          │                                      │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │ Intent Resolution Layer                                   │   │
│  │                                                           │   │
│  │ ASR → "turn on living room lights"                        │   │
│  │  NLU → Intent: TurnOn, Slot: {device: lights, room: LR}  │   │
│  │  Skill Router → SmartHome Skill v3                        │   │
│  │  Directive Builder → Alexa.PowerController.TurnOn         │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                          │                                      │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │ Device Cloud (IoT Core)                                   │   │
│  │                                                           │   │
│  │ ┌──────────────────────────────────┐                      │   │
│  │ │ Device Registry                  │                      │   │
│  │ │ - device_id → {owner, type,      │                      │   │
│  │ │   capabilities, room, shadow}    │                      │   │
│  │ │ - DynamoDB: partition=user_id    │                      │   │
│  │ │   sort=device_id                 │                      │   │
│  │ └──────────────────────────────────┘                      │   │
│  │                                                           │   │
│  │ ┌──────────────────────────────────┐                      │   │
│  │ │ Device Shadow                    │                      │   │
│  │ │ {                                │                      │   │
│  │ │   "desired": { "power": "ON" },  │                      │   │
│  │ │   "reported": { "power": "OFF" },│                      │   │
│  │ │   "delta": { "power": "ON" }     │                      │   │
│  │ │ }                                │                      │   │
│  │ │ - Always available even when     │                      │   │
│  │ │   device is offline              │                      │   │
│  │ │ - MQTT publish on delta change   │                      │   │
│  │ └──────────────────────────────────┘                      │   │
│  │                                                           │   │
│  │ ┌──────────────────────────────────┐                      │   │
│  │ │ MQTT Broker (Message Bus)        │                      │   │
│  │ │ - Topics: /things/{id}/shadow/*  │                      │   │
│  │ │ - QoS levels: 0 (fire-forget),  │                      │   │
│  │ │   1 (at-least-once), 2 (exactly) │                      │   │
│  │ │ - Persistent sessions for        │                      │   │
│  │ │   offline devices                │                      │   │
│  │ └──────────────────────────────────┘                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Routines & Automation Engine                              │   │
│  │                                                           │   │
│  │ Trigger → Condition → Action (TCA model)                  │   │
│  │                                                           │   │
│  │ Example: "Good Morning" routine                           │   │
│  │   Trigger: voice command OR 7:00 AM schedule              │   │
│  │   Condition: weekday only                                 │   │
│  │   Actions: [lights ON, thermostat→72°F, flash briefing]   │   │
│  │                                                           │   │
│  │ Geo-fencing: phone leaves home zone → lock doors          │   │
│  │ Device triggers: door sensor open after 10pm → alert      │   │
│  │                                                           │   │
│  │ Execution: Step Functions workflow with timeout + retry    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Scale: 100M+ Alexa devices, 100K+ smart home skills,          │
│         10B+ monthly directives                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Amazon L6 = **N-ary tree serialization + Alexa IoT system design**
- **N-ary tree serialization**: DFS preorder with child-count encoding — `val numChildren [children...]`
- **int[] idx mutable index**: pass index as single-element array for recursive deserialization
- **Device Shadow pattern**: desired/reported/delta JSON — always available even when device offline
- **MQTT**: lightweight pub-sub for IoT — topics `/things/{id}/shadow/update`, QoS 0/1/2
- **TCA model**: Trigger-Condition-Action for routines/automation — Step Functions for workflow execution
- **Amazon LP focus**: SDE-3 has 2 Bar Raiser rounds — prepare STAR stories with metrics for all 16 LPs
- Amazon L6 = **system ownership + cross-team influence** — show design decisions that impacted multiple teams

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium-Hard | Tree Serialization |
| Coding 2 | Hard | (Graph problem) |
| System Design | Very Hard | IoT, MQTT, Device Shadow |
| Bar Raiser | Hard | LP Deep Dive |
