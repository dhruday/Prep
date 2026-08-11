/*
Two Sum

Problem Statement:
Return the indices of two different numbers whose values add up to target.
Return an empty array when no such pair exists.

Solution:
Store each visited value and its index in a Map. For every value, look up its
complement before storing it, which guarantees that one element is never reused.

Complexity: O(n) time | O(n) space
*/

function twoSum(numbers, target) {
    const indicesByValue = new Map();

    for (let index = 0; index < numbers.length; index++) {
        const value = numbers[index];
        const complement = target - value;
        if (indicesByValue.has(complement)) return [indicesByValue.get(complement), index];
        indicesByValue.set(value, index);
    }

    return [];
}

function runTests() {
    const tests = [
        { numbers: [2, 7, 11, 15], target: 9, expected: [0, 1] },
        { numbers: [3, 3], target: 6, expected: [0, 1] },
        { numbers: [1, 2, 3], target: 10, expected: [] },
    ];
    const passed = tests.every(({ numbers, target, expected }) =>
        JSON.stringify(twoSum(numbers, target)) === JSON.stringify(expected));
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { twoSum };
