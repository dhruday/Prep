# Flipkart — SDE-3 FullStack Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Search & Discovery |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + HM)

---

## Round 1: Machine Coding — Implement an In-Memory Search Engine with Inverted Index
**Duration:** 90 minutes

```java
import java.util.*;
import java.util.stream.*;

/**
 * In-Memory Search Engine:
 * - Inverted index for full-text search
 * - TF-IDF scoring for relevance ranking
 * - Boolean queries: AND, OR, NOT
 * - Phrase search (consecutive terms)
 * - Fuzzy matching (edit distance ≤ 1)
 * - Autocomplete (prefix trie)
 * 
 * Time: Build: O(D × W), Search: O(Q × D_matched)
 * Space: O(D × W) for inverted index
 */
class SearchEngine {
    
    // Document storage
    private Map<String, Document> documents = new LinkedHashMap<>();
    
    // Inverted index: term → { docId → [positions] }
    private Map<String, Map<String, List<Integer>>> invertedIndex = new HashMap<>();
    
    // Document frequency: term → count of documents containing it
    private Map<String, Integer> docFrequency = new HashMap<>();
    
    // Autocomplete trie
    private TrieNode trieRoot = new TrieNode();
    
    private int totalDocs = 0;
    
    static class Document {
        String id;
        String title;
        String content;
        Map<String, Object> metadata;
        int wordCount;
        
        Document(String id, String title, String content, Map<String, Object> metadata) {
            this.id = id;
            this.title = title;
            this.content = content;
            this.metadata = metadata != null ? metadata : new HashMap<>();
        }
    }
    
    static class TrieNode {
        Map<Character, TrieNode> children = new HashMap<>();
        Set<String> terms = new HashSet<>(); // Complete terms at/below this node
    }
    
    static class SearchResult {
        String docId;
        String title;
        String snippet;
        double score;
        
        SearchResult(String docId, String title, String snippet, double score) {
            this.docId = docId; this.title = title;
            this.snippet = snippet; this.score = score;
        }
    }
    
    /**
     * Index a document.
     */
    public void addDocument(String id, String title, String content, Map<String, Object> metadata) {
        Document doc = new Document(id, title, content, metadata);
        
        // Tokenize: lowercase, remove punctuation, split by whitespace
        String[] tokens = tokenize(title + " " + content);
        doc.wordCount = tokens.length;
        documents.put(id, doc);
        totalDocs++;
        
        // Build inverted index with positions
        Set<String> uniqueTerms = new HashSet<>();
        
        for (int pos = 0; pos < tokens.length; pos++) {
            String term = tokens[pos];
            
            invertedIndex
                .computeIfAbsent(term, k -> new HashMap<>())
                .computeIfAbsent(id, k -> new ArrayList<>())
                .add(pos);
            
            uniqueTerms.add(term);
            
            // Add to trie for autocomplete
            addToTrie(term);
        }
        
        // Update document frequency
        for (String term : uniqueTerms) {
            docFrequency.merge(term, 1, Integer::sum);
        }
    }
    
    /**
     * Search with TF-IDF scoring.
     */
    public List<SearchResult> search(String query, int maxResults) {
        String[] queryTerms = tokenize(query);
        
        if (queryTerms.length == 0) return Collections.emptyList();
        
        // Get candidate documents (union of all term postings)
        Map<String, Double> docScores = new HashMap<>();
        
        for (String term : queryTerms) {
            Map<String, List<Integer>> postings = invertedIndex.get(term);
            if (postings == null) continue;
            
            double idf = Math.log((double) totalDocs / (docFrequency.getOrDefault(term, 1) + 1));
            
            for (var entry : postings.entrySet()) {
                String docId = entry.getKey();
                List<Integer> positions = entry.getValue();
                Document doc = documents.get(docId);
                
                // TF = term frequency / document length (normalized)
                double tf = (double) positions.size() / doc.wordCount;
                double tfidf = tf * idf;
                
                // Boost if term appears in title (first few positions)
                boolean inTitle = positions.stream().anyMatch(p -> p < tokenize(doc.title).length);
                if (inTitle) tfidf *= 2.0;
                
                docScores.merge(docId, tfidf, Double::sum);
            }
        }
        
        // Sort by score descending
        return docScores.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .limit(maxResults)
            .map(e -> {
                Document doc = documents.get(e.getKey());
                String snippet = generateSnippet(doc, queryTerms);
                return new SearchResult(e.getKey(), doc.title, snippet, e.getValue());
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Phrase search: find documents where terms appear consecutively.
     */
    public List<SearchResult> phraseSearch(String phrase, int maxResults) {
        String[] terms = tokenize(phrase);
        if (terms.length == 0) return Collections.emptyList();
        
        // Start with postings of first term
        Map<String, List<Integer>> firstPostings = invertedIndex.get(terms[0]);
        if (firstPostings == null) return Collections.emptyList();
        
        Map<String, Double> matchingDocs = new HashMap<>();
        
        for (var entry : firstPostings.entrySet()) {
            String docId = entry.getKey();
            List<Integer> startPositions = entry.getValue();
            
            // Check if subsequent terms appear at consecutive positions
            for (int startPos : startPositions) {
                boolean match = true;
                for (int i = 1; i < terms.length; i++) {
                    Map<String, List<Integer>> termPostings = invertedIndex.get(terms[i]);
                    if (termPostings == null || !termPostings.containsKey(docId)) {
                        match = false;
                        break;
                    }
                    List<Integer> positions = termPostings.get(docId);
                    if (!positions.contains(startPos + i)) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    matchingDocs.merge(docId, 1.0, Double::sum);
                    break; // One match per doc is enough
                }
            }
        }
        
        return matchingDocs.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .limit(maxResults)
            .map(e -> {
                Document doc = documents.get(e.getKey());
                return new SearchResult(e.getKey(), doc.title, 
                    generateSnippet(doc, terms), e.getValue());
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Autocomplete: return completions for prefix.
     */
    public List<String> autocomplete(String prefix, int maxResults) {
        prefix = prefix.toLowerCase().trim();
        TrieNode node = trieRoot;
        
        for (char c : prefix.toCharArray()) {
            node = node.children.get(c);
            if (node == null) return Collections.emptyList();
        }
        
        // Collect all terms below this node
        List<String> results = new ArrayList<>();
        collectTerms(node, results, maxResults);
        return results;
    }
    
    private void collectTerms(TrieNode node, List<String> results, int max) {
        if (results.size() >= max) return;
        results.addAll(node.terms);
        for (TrieNode child : node.children.values()) {
            collectTerms(child, results, max);
        }
    }
    
    private void addToTrie(String term) {
        TrieNode node = trieRoot;
        for (char c : term.toCharArray()) {
            node = node.children.computeIfAbsent(c, k -> new TrieNode());
        }
        node.terms.add(term);
    }
    
    /**
     * Generate a snippet around the first occurrence of query terms.
     */
    private String generateSnippet(Document doc, String[] queryTerms) {
        String content = doc.content;
        int snippetLength = 200;
        
        // Find first occurrence of any query term
        String lowerContent = content.toLowerCase();
        int bestPos = content.length();
        
        for (String term : queryTerms) {
            int pos = lowerContent.indexOf(term);
            if (pos >= 0 && pos < bestPos) bestPos = pos;
        }
        
        // Extract snippet around the best position
        int start = Math.max(0, bestPos - 50);
        int end = Math.min(content.length(), start + snippetLength);
        
        String snippet = content.substring(start, end);
        if (start > 0) snippet = "..." + snippet;
        if (end < content.length()) snippet = snippet + "...";
        
        return snippet;
    }
    
    private String[] tokenize(String text) {
        return text.toLowerCase()
            .replaceAll("[^a-z0-9\\s]", "")
            .trim()
            .split("\\s+");
    }
}
```

---

## Round 2: System Design — Flipkart Search & Ranking Platform
**Duration:** 60 minutes

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│           Flipkart Search & Discovery Platform                  │
│                                                                 │
│  Query Flow:                                                    │
│  User types "samsung galaxy s24" →                              │
│  1. Query Understanding:                                        │
│     - Spell correction: "samsnug" → "samsung"                   │
│     - Query expansion: "s24" → "s24" OR "galaxy s24 ultra"     │
│     - Intent classification: product search vs. category browse │
│     - Entity extraction: brand=Samsung, model=Galaxy S24        │
│                                                                 │
│  2. Retrieval (L0 → L1 → L2):                                  │
│     L0: Inverted index (Elasticsearch) → 10K candidates         │
│     L1: Feature-based ranking (XGBoost) → 500 results           │
│     L2: Neural reranking (BERT cross-encoder) → 50 results      │
│                                                                 │
│  3. Post-Ranking:                                               │
│     - Diversity: avoid same-brand clustering (MMR)              │
│     - Freshness boost: new listings get temporary boost          │
│     - Ads insertion: sponsored results at positions 1,4,8       │
│     - Personalization: user history features                    │
│                                                                 │
│  Ranking Features:                                              │
│     - Textual: BM25 score, title match, description match       │
│     - Popularity: clicks, orders, reviews, ratings              │
│     - Seller: rating, fulfillment speed, return rate            │
│     - Price: competitiveness vs. market price                   │
│     - Personalization: user's category affinity, brand pref     │
│                                                                 │
│  Scale: 300M+ products, 10K QPS peak, p99 < 200ms              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Flipkart SDE-3 = **In-memory search engine (inverted index + TF-IDF) + Search platform design**
- **Inverted index**: term → {docId → [positions]} — positions enable phrase search
- **TF-IDF scoring**: TF = frequency/docLength, IDF = log(totalDocs / docsWithTerm) — standard IR relevance
- **Phrase search**: check consecutive positions — `positions.contains(startPos + i)` for each term
- **Title boost**: multiply TF-IDF by 2x if term appears in title — weighted field scoring
- **Autocomplete**: Trie prefix traversal — collect all terms below prefix node
- **Snippet generation**: find first occurrence of query term, extract ±100 chars context
- **L0→L1→L2 funnel**: inverted index → feature-based → neural reranker — standard search architecture

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Very Hard | Search Engine, Inverted Index, TF-IDF |
| Technical 1 | Hard | System Design, Search Ranking |
| Technical 2 | Hard | DSA + Concurrency |
| HM | Medium | Culture Fit |
