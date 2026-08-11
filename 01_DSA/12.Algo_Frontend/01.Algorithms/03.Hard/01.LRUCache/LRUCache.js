/*
LRU Cache

Problem Statement:
Implement a fixed-capacity cache with get(key) and put(key, value). Both operations
must run in O(1). Reading or writing a key makes it the most recently used key.

Solution:
Use a Map for direct key lookup and a doubly linked list for recency. The head is
most recently used and the tail is least recently used.

Complexity: O(1) time per get/put | O(capacity) space
*/

class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.nodes = new Map();
        this.head = { next: null, previous: null };
        this.tail = { next: null, previous: null };
        this.head.next = this.tail;
        this.tail.previous = this.head;
    }

    detach(node) {
        node.previous.next = node.next;
        node.next.previous = node.previous;
    }

    attachAfterHead(node) {
        node.next = this.head.next;
        node.previous = this.head;
        this.head.next.previous = node;
        this.head.next = node;
    }

    get(key) {
        const node = this.nodes.get(key);
        if (!node) return -1;
        this.detach(node);
        this.attachAfterHead(node);
        return node.value;
    }

    put(key, value) {
        const existing = this.nodes.get(key);
        if (existing) {
            existing.value = value;
            this.detach(existing);
            this.attachAfterHead(existing);
            return;
        }
        const node = { key, value, next: null, previous: null };
        this.nodes.set(key, node);
        this.attachAfterHead(node);
        if (this.nodes.size > this.capacity) {
            const leastRecent = this.tail.previous;
            this.detach(leastRecent);
            this.nodes.delete(leastRecent.key);
        }
    }
}

function runTests() {
    const cache = new LRUCache(2);
    cache.put(1, 1); cache.put(2, 2);
    const passed = cache.get(1) === 1;
    cache.put(3, 3);
    const stillPassed = cache.get(2) === -1;
    cache.put(4, 4);
    const finalPassed = cache.get(1) === -1 && cache.get(3) === 3 && cache.get(4) === 4;
    console.log(`Overall Result: ${passed && stillPassed && finalPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { LRUCache };
