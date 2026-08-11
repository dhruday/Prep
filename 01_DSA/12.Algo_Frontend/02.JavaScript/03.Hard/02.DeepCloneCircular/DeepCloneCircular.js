/*
Deep Clone With Circular References

Problem Statement:
Clone plain objects, arrays, Date instances, and circular references without sharing
mutable nested objects with the source.

Solution:
Record each source object in a WeakMap before recursively cloning its properties.
When a cycle is encountered, reuse the already-created clone.

Complexity: O(n) time | O(n) space for n reachable properties/objects
*/

function deepClone(value, seen = new WeakMap()) {
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date) return new Date(value.getTime());
    if (seen.has(value)) return seen.get(value);

    const clone = Array.isArray(value) ? [] : {};
    seen.set(value, clone);
    for (const key of Reflect.ownKeys(value)) clone[key] = deepClone(value[key], seen);
    return clone;
}

function runTests() {
    const source = { nested: { value: 1 }, date: new Date('2025-01-01') };
    source.self = source;
    const clone = deepClone(source);
    clone.nested.value = 2;
    const passed = clone !== source && clone.self === clone && source.nested.value === 1
        && clone.date instanceof Date && clone.date.getTime() === source.date.getTime();
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { deepClone };
