/*
Merge Overlapping Intervals

Problem Statement:
Write a function that takes in a non-empty array of arbitrary intervals, merges any overlapping intervals,
and returns the new intervals in no particular order.

Each interval is an array of two integers, with interval[0] as the start of the interval and
interval[1] as the end of the interval.

Note that back-to-back intervals aren't considered to be overlapping. For example, [1, 5] and [6, 7]
aren't overlapping; neither are [1, 5] and [5, 7].

Sample Input:
intervals = [[1, 2], [3, 5], [4, 7], [6, 8], [9, 10]]

Sample Output:
[[1, 2], [3, 8], [9, 10]]
// Merge [3, 5], [4, 7], [6, 8] into [3, 8]

Test Cases:
1. intervals = [[1, 2], [3, 5], [4, 7], [6, 8], [9, 10]]
   Expected Output: [[1, 2], [3, 8], [9, 10]]

2. intervals = [[1, 10]]
   Expected Output: [[1, 10]]

3. intervals = [[1, 2], [3, 4], [5, 6], [7, 8]]
   Expected Output: [[1, 2], [3, 4], [5, 6], [7, 8]]

4. intervals = [[1, 4], [4, 5]]
   Expected Output: [[1, 5]]

5. intervals = [[2, 3], [4, 5], [6, 7], [8, 9], [1, 10]]
   Expected Output: [[1, 10]]

Solution Approaches:
1. Sort and Merge: O(nlog(n)) time | O(n) space
   - Sort intervals by start time
   - Merge overlapping intervals in one pass
*/

function mergeOverlappingIntervals(intervals) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        intervals: [[1, 2], [3, 5], [4, 7], [6, 8], [9, 10]],
        expected: [[1, 2], [3, 8], [9, 10]]
    },
    {
        intervals: [[1, 10]],
        expected: [[1, 10]]
    },
    {
        intervals: [[1, 2], [3, 4], [5, 6], [7, 8]],
        expected: [[1, 2], [3, 4], [5, 6], [7, 8]]
    },
    {
        intervals: [[1, 4], [4, 5]],
        expected: [[1, 5]]
    },
    {
        intervals: [[2, 3], [4, 5], [6, 7], [8, 9], [1, 10]],
        expected: [[1, 10]]
    },
    {
        intervals: [[1, 3], [2, 8], [9, 10]],
        expected: [[1, 8], [9, 10]]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = mergeOverlappingIntervals(testCase.intervals.map(interval => [...interval]));
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input Intervals: [${testCase.intervals.map(interval => `[${interval}]`)}]`);
        console.log(`Your Output: [${result.map(interval => `[${interval}]`)}]`);
        console.log(`Expected Output: [${testCase.expected.map(interval => `[${interval}]`)}]`);
        const passed = areIntervalsEqual(result, testCase.expected);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to compare intervals
function areIntervalsEqual(intervals1, intervals2) {
    if (intervals1.length !== intervals2.length) return false;
    
    // Sort intervals to ensure consistent comparison
    const sortIntervals = (a, b) => {
        if (a[0] !== b[0]) return a[0] - b[0];
        return a[1] - b[1];
    };
    
    const sorted1 = intervals1.slice().sort(sortIntervals);
    const sorted2 = intervals2.slice().sort(sortIntervals);
    
    for (let i = 0; i < sorted1.length; i++) {
        if (sorted1[i][0] !== sorted2[i][0] || sorted1[i][1] !== sorted2[i][1]) {
            return false;
        }
    }
    return true;
}

// Run the tests
runTests();
