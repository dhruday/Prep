/*
Knapsack Problem

Problem Statement:
You're given an array of arrays where each subarray holds two integer values and represents
an item; the first integer represents the item's value, and the second integer represents
the item's weight. You're also given an integer representing the maximum capacity of a
knapsack that you can carry.

Write a function that returns the maximum combined value of items that you can carry in
the knapsack without exceeding the capacity. Note that you can't break up items; you
either pick them up entirely or don't pick them up at all.

Sample Input:
items = [[1, 2], [4, 3], [5, 6], [6, 7]]
capacity = 10

Sample Output:
10 // Take items [4, 3] and [6, 7]
// Total value is 4 + 6 = 10
// Total weight is 3 + 7 = 10

Constraints:
- 1 ≤ items.length ≤ 100
- 1 ≤ item[0], item[1] ≤ 100 (value and weight)
- 1 ≤ capacity ≤ 100
*/

function knapsackProblem(items, capacity) {
    // Write your code here
    // Return [maxValue, indicesOfItems]
}

// Test Cases
function runTests() {
    const testCases = [
        {
            items: [[1, 2], [4, 3], [5, 6], [6, 7]],
            capacity: 10,
            expected: [10, [1, 3]], // value of 10, using items at indices 1 and 3
            description: "Sample test case"
        },
        {
            items: [[1, 2]],
            capacity: 1,
            expected: [0, []],
            description: "Cannot fit any item"
        },
        {
            items: [[5, 2], [5, 2], [5, 2]],
            capacity: 4,
            expected: [10, [0, 1]],
            description: "Multiple identical items"
        },
        {
            items: [[1, 1], [4, 5], [5, 3], [6, 4]],
            capacity: 7,
            expected: [11, [0, 2, 3]],
            description: "Multiple items fit"
        },
        {
            items: [[2, 1], [70, 50], [30, 10], [10, 5]],
            capacity: 100,
            expected: [112, [0, 1, 2, 3]],
            description: "Can take all items"
        },
        {
            items: [[1, 1], [3, 4], [4, 5], [5, 7]],
            capacity: 7,
            expected: [9, [0, 1, 2]],
            description: "Optimal solution not greedy"
        },
        {
            items: [[10, 5], [40, 20], [30, 15], [50, 25]],
            capacity: 60,
            expected: [120, [0, 1, 2, 3]],
            description: "Large values and weights"
        },
        {
            items: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
            capacity: 10,
            expected: [9, [0, 1, 2, 3]],
            description: "Sequential weights"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Solve knapsack problem
        const result = knapsackProblem(testCase.items, testCase.capacity);
        
        // Compare with expected
        const valueMatches = result[0] === testCase.expected[0];
        const indicesMatch = JSON.stringify(result[1].sort()) === JSON.stringify(testCase.expected[1].sort());
        const passed = valueMatches && indicesMatch;
        
        console.log(`Input:`);
        console.log(`  Items: ${JSON.stringify(testCase.items)}`);
        console.log(`  Capacity: ${testCase.capacity}`);
        console.log(`Expected: Value = ${testCase.expected[0]}, Indices = ${JSON.stringify(testCase.expected[1])}`);
        console.log(`Actual: Value = ${result[0]}, Indices = ${JSON.stringify(result[1])}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) {
            if (!valueMatches) console.log(`  Value mismatch: expected ${testCase.expected[0]}, got ${result[0]}`);
            if (!indicesMatch) console.log(`  Indices mismatch: expected ${JSON.stringify(testCase.expected[1])}, got ${JSON.stringify(result[1])}`);
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
