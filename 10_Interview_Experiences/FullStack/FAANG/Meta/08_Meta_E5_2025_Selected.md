# Meta — SDE-3 FullStack Interview Experience (2025) — #8

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | E5 Production Engineer |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Menlo Park, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Infrastructure |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Behavioral)

---

## Round 1: Coding
**Duration:** 35 minutes

### Questions Asked
1. **Clone Graph** (LeetCode 133) — BFS/DFS with visited map
2. **Follow-up: What if the graph contains weighted edges?**

### 💡 Clone Graph (BFS)

```java
public Node cloneGraph(Node node) {
    if (node == null) return null;
    
    Map<Node, Node> visited = new HashMap<>();
    Queue<Node> queue = new LinkedList<>();
    
    visited.put(node, new Node(node.val));
    queue.offer(node);
    
    while (!queue.isEmpty()) {
        Node current = queue.poll();
        
        for (Node neighbor : current.neighbors) {
            if (!visited.containsKey(neighbor)) {
                visited.put(neighbor, new Node(neighbor.val));
                queue.offer(neighbor);
            }
            // Link clone's neighbor
            visited.get(current).neighbors.add(visited.get(neighbor));
        }
    }
    
    return visited.get(node);
}
// Time: O(V + E), Space: O(V)
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Facebook's Content Moderation Pipeline**
   - Detect and remove: hate speech, nudity, violence, spam, misinformation
   - Latency: moderate within 30 seconds of posting
   - Scale: 2 billion posts per day (text, image, video)
   - Appeal workflow for false positives
   - Human-in-the-loop for borderline cases

### 💡 Key Design

```
Architecture:
┌──────────┐    Post    ┌──────────────┐
│  User    │───create──▶│  Post Service │
│  Client  │            └──────┬───────┘
└──────────┘                   │
                    Publish post event
                               │
                    ┌──────────▼──────────┐
                    │    Kafka Topic       │
                    │  "posts.created"     │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼──────────────────┐
          │                    │                   │
    ┌─────▼──────┐    ┌──────▼───────┐    ┌─────▼──────┐
    │  Text      │    │  Image/Video │    │  Metadata  │
    │  Classifier│    │  Classifier  │    │  Analyzer  │
    │  (NLP)     │    │  (Vision ML) │    │  (Spam     │
    │            │    │              │    │  patterns) │
    └─────┬──────┘    └──────┬───────┘    └─────┬──────┘
          │                   │                  │
          └───────────────────┼──────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Decision Aggregator │
                    │ (Combine signals)   │
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼────┐   ┌────▼──────┐  ┌────▼──────┐
        │ Auto-     │   │ Human     │  │ Auto-     │
        │ Approve   │   │ Review    │  │ Remove    │
        │(score<0.3)│   │(0.3-0.8) │  │(score>0.8)│
        └──────────┘   └──────────┘  └──────────┘

Multi-Signal Scoring:
class ContentModerationPipeline {
    ModerationResult moderate(Post post) {
        List<ModerationSignal> signals = new ArrayList<>();
        
        // 1. Text classification (runs for all posts with text)
        if (post.hasText()) {
            signals.add(textClassifier.classify(post.getText()));
            // Returns: { category: "hate_speech", confidence: 0.85 }
            // Model: RoBERTa fine-tuned on labeled moderation data
        }
        
        // 2. Image classification (for posts with images)
        if (post.hasImages()) {
            for (String imageUrl : post.getImageUrls()) {
                signals.add(imageClassifier.classify(imageUrl));
                // Returns: { nudity: 0.92, violence: 0.03, ... }
                // Model: ResNet + custom head trained on moderation dataset
            }
        }
        
        // 3. Video classification (sample frames + audio)
        if (post.hasVideo()) {
            signals.add(videoClassifier.classify(post.getVideoUrl()));
            // Sample 1 frame/second, classify each, aggregate
        }
        
        // 4. Metadata signals (spam patterns)
        signals.add(metadataAnalyzer.analyze(post));
        // Checks: account age, posting frequency, URL patterns,
        //         duplicate content hash, coordinated behavior
        
        // 5. Aggregate signals into final score
        double finalScore = aggregateSignals(signals);
        ModerationAction action = determineAction(finalScore);
        
        return new ModerationResult(post.getId(), finalScore, action, signals);
    }
    
    ModerationAction determineAction(double score) {
        if (score > 0.95) return ModerationAction.AUTO_REMOVE;     // Very confident violation
        if (score > 0.80) return ModerationAction.AUTO_REMOVE_APPEALABLE; // Remove but allow appeal
        if (score > 0.30) return ModerationAction.HUMAN_REVIEW;    // Queue for human moderator
        return ModerationAction.APPROVE;                            // Safe content
    }
    
    double aggregateSignals(List<ModerationSignal> signals) {
        // Weighted average based on signal type and confidence
        // Higher weight for high-precision classifiers (image nudity)
        // Lower weight for noisy signals (spam heuristics)
        return signals.stream()
            .mapToDouble(s -> s.getConfidence() * s.getWeight())
            .sum() / signals.stream().mapToDouble(ModerationSignal::getWeight).sum();
    }
}

Human Review Queue:
class ReviewQueueService {
    // Priority queue: highest severity + longest wait time first
    ReviewTask getNextTask(String reviewerId) {
        return taskQueue.poll(); // Priority queue ordered by urgency
    }
    
    void submitReview(String taskId, String reviewerId, ReviewDecision decision) {
        ReviewTask task = taskRepo.findById(taskId);
        task.addDecision(reviewerId, decision);
        
        // Require 2 reviewers to agree (majority vote for sensitive content)
        if (task.getDecisions().size() >= 2) {
            long removeCalls = task.getDecisions().stream()
                .filter(d -> d.action == ReviewAction.REMOVE).count();
            
            if (removeCalls >= 2) {
                postService.removePost(task.postId, "policy_violation");
                notificationService.notifyUser(task.postOwnerId, 
                    "Your post was removed for violating community standards");
            } else if (task.getDecisions().size() >= 3) {
                // 3rd reviewer breaks tie
                postService.approvePost(task.postId);
            } else {
                // Need more reviews — re-queue
                taskQueue.offer(task);
            }
        }
    }
}

Appeal Workflow:
1. User submits appeal with reason
2. Goes to different reviewer (not original)
3. Senior reviewer if first two disagree
4. Final decision is binding
5. False positive signals fed back to retrain ML models

Scale:
- 2B posts/day → 23K posts/second
- Auto-moderated: 95% of content (approve or remove)
- Human review: 5% → 100M posts/day → 10K moderators
- Total moderation latency: < 30 seconds for 99th percentile
- ML inference: batch GPU servers, < 100ms per classification
- Kafka: 50 partitions, consumer groups per classifier type
```

---

## 🎯 Key Takeaways
- Meta = **ML systems + scale + content safety is #1 priority**
- **Clone Graph**: BFS + visited HashMap<original, clone> — link neighbors after creation
- **Content moderation**: multi-signal (text NLP + image CV + metadata spam) → aggregated score
- **3-tier decision**: auto-approve (< 0.3) vs human review (0.3-0.8) vs auto-remove (> 0.8)
- **Human review**: majority vote (2/3 reviewers agree) + senior escalation for ties
- **Appeal workflow**: different reviewer + feedback loop to retrain ML models
- **30-second SLA**: async pipeline via Kafka, parallel classifiers, batch GPU inference
- Meta values: **move fast, be bold, focus on impact** — prepare stories showing speed + quality balance

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium | Clone Graph, BFS |
| Coding 2 | Medium-Hard | DP, String |
| System Design | Hard | Content Moderation, ML Pipeline |
| Behavioral | Medium | Meta Values, Impact |
