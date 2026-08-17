/*
Merge Intervals

Problem Statement:
Given intervals [start, end], merge every overlapping interval and return the result
in ascending start order. Do not mutate the caller's input.

Solution:
Sort a copy by start time. An interval overlaps the last merged interval when its
start is at most the last end; extend that end, otherwise append a new interval.

Complexity: O(n log n) time | O(n) space for the sorted copy and output
*/

function mergeIntervals(intervals) {
    if (intervals.length === 0) return [];
    const sorted = intervals.map((interval) => [...interval]).sort((a, b) => a[0] - b[0]);
    const merged = [sorted[0]];

    for (let index = 1; index < sorted.length; index++) {
        const current = sorted[index];
        const previous = merged[merged.length - 1];
        if (current[0] <= previous[1]) previous[1] = Math.max(previous[1], current[1]);
        else merged.push(current);
    }

    return merged;
}

function runTests() {
    const tests = [
        { input: [[1, 3], [2, 6], [8, 10], [15, 18]], expected: [[1, 6], [8, 10], [15, 18]] },
        { input: [[1, 4], [4, 5]], expected: [[1, 5]] },
        { input: [], expected: [] },
    ];
    const passed = tests.every(({ input, expected }) =>
        JSON.stringify(mergeIntervals(input)) === JSON.stringify(expected));
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { mergeIntervals };
