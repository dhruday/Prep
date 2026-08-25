# Flipkart — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-3 |
| **Level** | SDE-3 / E6 |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Machine Coding + 2 Problem Solving + System Design + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Onsite Bangalore

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Design an In-Memory Search Engine**
   - Index documents (title, body, tags)
   - Support full-text search with TF-IDF ranking
   - AND, OR query operators
   - Autocomplete on search terms

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.stream.*;

public class InMemorySearchEngine {

    static class Document {
        String id;
        String title;
        String body;
        List<String> tags;

        Document(String id, String title, String body, List<String> tags) {
            this.id = id;
            this.title = title;
            this.body = body;
            this.tags = tags;
        }

        String getFullText() {
            return (title + " " + body + " " + String.join(" ", tags)).toLowerCase();
        }
    }

    static class SearchResult implements Comparable<SearchResult> {
        String docId;
        String title;
        double score;
        String snippet;

        SearchResult(String docId, String title, double score, String snippet) {
            this.docId = docId;
            this.title = title;
            this.score = score;
            this.snippet = snippet;
        }

        @Override
        public int compareTo(SearchResult other) {
            return Double.compare(other.score, this.score); // descending
        }

        @Override
        public String toString() {
            return String.format("[%.3f] %s — %s", score, title, snippet);
        }
    }

    // Inverted index: term -> {docId -> [positions]}
    private final Map<String, Map<String, List<Integer>>> invertedIndex = new HashMap<>();
    // Document store
    private final Map<String, Document> documents = new HashMap<>();
    // Document frequency: term -> number of docs containing it
    private final Map<String, Integer> docFrequency = new HashMap<>();
    // Term frequency per doc: docId -> {term -> count}
    private final Map<String, Map<String, Integer>> termFrequencies = new HashMap<>();
    // Trie for autocomplete
    private final TrieNode autocompleteTrie = new TrieNode();

    private int totalDocs = 0;

    // ============================================
    // Tokenization
    // ============================================
    List<String> tokenize(String text) {
        return Arrays.stream(text.toLowerCase()
            .replaceAll("[^a-z0-9\\s]", "")
            .split("\\s+"))
            .filter(s -> !s.isEmpty() && s.length() > 1)
            .collect(Collectors.toList());
    }

    // ============================================
    // Indexing
    // ============================================
    public void addDocument(Document doc) {
        documents.put(doc.id, doc);
        totalDocs++;

        List<String> tokens = tokenize(doc.getFullText());
        Map<String, Integer> tf = new HashMap<>();
        Set<String> uniqueTerms = new HashSet<>();

        for (int i = 0; i < tokens.size(); i++) {
            String term = tokens.get(i);
            tf.merge(term, 1, Integer::sum);
            uniqueTerms.add(term);

            // Add to inverted index with positions
            invertedIndex
                .computeIfAbsent(term, k -> new HashMap<>())
                .computeIfAbsent(doc.id, k -> new ArrayList<>())
                .add(i);

            // Add to trie
            autocompleteTrie.insert(term);
        }

        termFrequencies.put(doc.id, tf);

        // Update document frequency
        for (String term : uniqueTerms) {
            docFrequency.merge(term, 1, Integer::sum);
        }
    }

    // ============================================
    // TF-IDF Scoring
    // ============================================
    double tfIdf(String term, String docId) {
        Map<String, Integer> tf = termFrequencies.get(docId);
        if (tf == null || !tf.containsKey(term)) return 0;

        // TF: log(1 + count)
        double termFreq = Math.log(1 + tf.get(term));

        // IDF: log(N / df)
        int df = docFrequency.getOrDefault(term, 0);
        double idf = df > 0 ? Math.log((double) totalDocs / df) : 0;

        return termFreq * idf;
    }

    // ============================================
    // Search with Query Parsing (AND / OR)
    // ============================================
    public List<SearchResult> search(String query, int maxResults) {
        // Parse query: "laptop AND cheap" or "laptop OR tablet"
        String normalizedQuery = query.toLowerCase().trim();
        Set<String> matchingDocIds;

        if (normalizedQuery.contains(" and ")) {
            String[] parts = normalizedQuery.split("\\s+and\\s+");
            matchingDocIds = andQuery(parts);
        } else if (normalizedQuery.contains(" or ")) {
            String[] parts = normalizedQuery.split("\\s+or\\s+");
            matchingDocIds = orQuery(parts);
        } else {
            // Default: OR of all terms
            String[] terms = normalizedQuery.split("\\s+");
            matchingDocIds = orQuery(terms);
        }

        // Score and rank results
        List<String> queryTerms = tokenize(normalizedQuery.replaceAll("\\b(and|or)\\b", ""));
        List<SearchResult> results = new ArrayList<>();

        for (String docId : matchingDocIds) {
            Document doc = documents.get(docId);
            double score = 0;

            for (String term : queryTerms) {
                score += tfIdf(term, docId);
            }

            // Title boost: if term appears in title, boost score
            String titleLower = doc.title.toLowerCase();
            for (String term : queryTerms) {
                if (titleLower.contains(term)) score *= 1.5;
            }

            String snippet = generateSnippet(doc, queryTerms);
            results.add(new SearchResult(docId, doc.title, score, snippet));
        }

        Collections.sort(results);
        return results.subList(0, Math.min(maxResults, results.size()));
    }

    private Set<String> andQuery(String[] parts) {
        Set<String> result = null;
        for (String part : parts) {
            List<String> terms = tokenize(part.trim());
            Set<String> docs = new HashSet<>();
            for (String term : terms) {
                Map<String, List<Integer>> postings = invertedIndex.get(term);
                if (postings != null) docs.addAll(postings.keySet());
            }
            if (result == null) result = docs;
            else result.retainAll(docs); // intersection
        }
        return result != null ? result : Collections.emptySet();
    }

    private Set<String> orQuery(String[] parts) {
        Set<String> result = new HashSet<>();
        for (String part : parts) {
            List<String> terms = tokenize(part.trim());
            for (String term : terms) {
                Map<String, List<Integer>> postings = invertedIndex.get(term);
                if (postings != null) result.addAll(postings.keySet());
            }
        }
        return result;
    }

    private String generateSnippet(Document doc, List<String> queryTerms) {
        String body = doc.body;
        for (String term : queryTerms) {
            int idx = body.toLowerCase().indexOf(term);
            if (idx >= 0) {
                int start = Math.max(0, idx - 30);
                int end = Math.min(body.length(), idx + term.length() + 30);
                return (start > 0 ? "..." : "") + body.substring(start, end) + (end < body.length() ? "..." : "");
            }
        }
        return body.length() > 80 ? body.substring(0, 80) + "..." : body;
    }

    // ============================================
    // Autocomplete via Trie
    // ============================================
    static class TrieNode {
        Map<Character, TrieNode> children = new HashMap<>();
        int frequency = 0;
        boolean isEnd = false;

        void insert(String word) {
            TrieNode current = this;
            for (char c : word.toCharArray()) {
                current = current.children.computeIfAbsent(c, k -> new TrieNode());
            }
            current.isEnd = true;
            current.frequency++;
        }

        List<String> autocomplete(String prefix, int maxResults) {
            TrieNode current = this;
            for (char c : prefix.toCharArray()) {
                current = current.children.get(c);
                if (current == null) return Collections.emptyList();
            }

            // DFS to find all words with this prefix
            PriorityQueue<String[]> pq = new PriorityQueue<>(
                (a, b) -> Integer.compare(Integer.parseInt(b[1]), Integer.parseInt(a[1]))
            );
            collectWords(current, new StringBuilder(prefix), pq);

            List<String> results = new ArrayList<>();
            while (!pq.isEmpty() && results.size() < maxResults) {
                results.add(pq.poll()[0]);
            }
            return results;
        }

        private void collectWords(TrieNode node, StringBuilder sb, PriorityQueue<String[]> pq) {
            if (node.isEnd) {
                pq.offer(new String[]{sb.toString(), String.valueOf(node.frequency)});
            }
            for (Map.Entry<Character, TrieNode> e : node.children.entrySet()) {
                sb.append(e.getKey());
                collectWords(e.getValue(), sb, pq);
                sb.deleteCharAt(sb.length() - 1);
            }
        }
    }

    public List<String> autocomplete(String prefix, int max) {
        return autocompleteTrie.autocomplete(prefix.toLowerCase(), max);
    }

    public static void main(String[] args) {
        InMemorySearchEngine engine = new InMemorySearchEngine();

        engine.addDocument(new Document("1", "Budget Laptop for Students",
            "Best affordable laptop under 30000 with good battery life and performance",
            List.of("laptop", "budget", "student")));

        engine.addDocument(new Document("2", "Gaming Laptop Review",
            "High-performance gaming laptop with RTX 4060 graphics and 144Hz display",
            List.of("laptop", "gaming", "review")));

        engine.addDocument(new Document("3", "Tablet vs Laptop Comparison",
            "Should you buy a tablet or laptop for work? Comparing iPad Pro vs MacBook Air",
            List.of("tablet", "laptop", "comparison")));

        engine.addDocument(new Document("4", "Best Smartphones 2025",
            "Top 10 smartphones with the best camera and battery life under 20000",
            List.of("smartphone", "camera", "battery")));

        // Search
        System.out.println("=== Search: laptop AND budget ===");
        engine.search("laptop AND budget", 5).forEach(System.out::println);

        System.out.println("\n=== Search: laptop OR tablet ===");
        engine.search("laptop OR tablet", 5).forEach(System.out::println);

        // Autocomplete
        System.out.println("\n=== Autocomplete: 'lap' ===");
        System.out.println(engine.autocomplete("lap", 5));
    }
}
```

## Round 2-3: Problem Solving
**Duration:** 60 min each

### Problems Solved
- Round 2: **Find Median from Two Sorted Arrays** (binary search approach, O(log min(m,n)))
- Round 3: **Design a thread-safe connection pool** with idle timeout and max connections

## Round 4: System Design
**Duration:** 75 minutes

### Questions Asked
1. **Design Flipkart's Product Search Backend**
   - Support 10M+ products, 100K+ QPS
   - Faceted search with filters
   - Typo tolerance and spell correction
   - Personalized ranking

## Round 5: Hiring Manager
**Duration:** 45 minutes

## 🎯 Key Takeaways
- Flipkart SDE-3 machine coding round expects **complete, runnable systems** with clean OOP
- TF-IDF + inverted index is the go-to for text search implementation
- Trie for autocomplete is a standard expectation
- **Title boost** and **snippet generation** show search engine awareness
- System design round tests Elasticsearch internals — know inverted index, sharding, replication

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Inverted Index, TF-IDF, Trie |
| Problem Solving 1 | Hard | Binary Search, Two Arrays |
| Problem Solving 2 | Medium-Hard | Connection Pool, Concurrency |
| System Design | Hard | Search Engine, Elasticsearch |
| Hiring Manager | Medium | Behavioral |
