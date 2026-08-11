/*
Min Stack

Problem Statement:
Implement push, pop, peek, and getMin for a stack. Each operation must be O(1).
Return null for pop, peek, or getMin on an empty stack.

Solution:
Store the value and the minimum at that depth in each stack entry. The top entry
therefore always knows the current minimum without a scan.

Complexity: O(1) time per operation | O(n) space
*/

class MinStack {
    constructor() {
        this.entries = [];
    }

    push(value) {
        const previous = this.entries[this.entries.length - 1];
        this.entries.push({ value, min: previous ? Math.min(value, previous.min) : value });
    }

    pop() {
        return this.entries.length === 0 ? null : this.entries.pop().value;
    }

    peek() {
        return this.entries.length === 0 ? null : this.entries[this.entries.length - 1].value;
    }

    getMin() {
        return this.entries.length === 0 ? null : this.entries[this.entries.length - 1].min;
    }
}

function runTests() {
    const stack = new MinStack();
    stack.push(5); stack.push(2); stack.push(7);
    const passed = stack.getMin() === 2 && stack.pop() === 7 && stack.getMin() === 2
        && stack.pop() === 2 && stack.getMin() === 5 && stack.peek() === 5;
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { MinStack };
