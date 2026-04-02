/*
Ambiguous Measurements

Problem Statement:
You're given an array of measuring cups, where each measuring cup is represented by a pair
of positive integers [low, high] indicating that the cup can measure volumes between low
and high inclusive. You're also given a pair of positive integers [targetLow, targetHigh]
representing your target range for measurement.

Write a function that returns a boolean indicating whether you can use the measuring cups
to obtain a range that completely overlaps with the target range. In other words, can
you measure any volume between targetLow and targetHigh inclusive?

For example, if you have a cup that can measure volumes between 1 and 5 and another cup
that can measure volumes between 2 and 6, you can measure every whole number volume
between 3 and 11 by using different combinations of the two cups.

Sample Input:
measuringCups = [
  [1, 5],  // Cup that can measure between 1 and 5 units
  [2, 6]   // Cup that can measure between 2 and 6 units
]
targetLow = 4
targetHigh = 8

Sample Output:
true
// You can measure any volume between 4 and 8 using different combinations of the cups

Constraints:
- All measuring cup low and high values are positive integers
- Each measuring cup can measure any volume between its low and high values (inclusive)
- The target range will always be valid (targetLow ≤ targetHigh)
- 1 ≤ measuringCups.length ≤ 100
*/

function ambiguousMeasurements(measuringCups, targetLow, targetHigh) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            measuringCups: [[1, 5], [2, 6]],
            targetLow: 4,
            targetHigh: 8,
            expected: true,
            description: "Sample test case"
        },
        {
            measuringCups: [[1, 2], [3, 4], [5, 6]],
            targetLow: 100,
            targetHigh: 110,
            expected: false,
            description: "Impossible target range"
        },
        {
            measuringCups: [[1, 5], [5, 10], [10, 15]],
            targetLow: 3,
            targetHigh: 12,
            expected: true,
            description: "Multiple overlapping cups"
        },
        {
            measuringCups: [[2, 4]],
            targetLow: 1,
            targetHigh: 5,
            expected: false,
            description: "Single cup, impossible range"
        },
        {
            measuringCups: [[1, 3], [4, 6], [7, 9]],
            targetLow: 2,
            targetHigh: 8,
            expected: true,
            description: "Multiple non-overlapping cups"
        },
        {
            measuringCups: [[1, 5]],
            targetLow: 2,
            targetHigh: 4,
            expected: true,
            description: "Single cup covering target range"
        },
        {
            measuringCups: [[1, 2], [2, 3], [3, 4]],
            targetLow: 5,
            targetHigh: 6,
            expected: false,
            description: "Adjacent cups, impossible range"
        },
        {
            measuringCups: [[1, 10], [2, 15], [5, 20]],
            targetLow: 8,
            targetHigh: 12,
            expected: true,
            description: "Large overlapping ranges"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Check if measurement is possible
        const result = ambiguousMeasurements(
            testCase.measuringCups,
            testCase.targetLow,
            testCase.targetHigh
        );
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input:`);
        console.log(`  Measuring Cups: ${JSON.stringify(testCase.measuringCups)}`);
        console.log(`  Target Range: [${testCase.targetLow}, ${testCase.targetHigh}]`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
