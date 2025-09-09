/*
Nth Fibonacci (LeetCode 509: Fibonacci Number)

Problem Statement:
Write a function that takes in a positive integer n and returns the nth number in the Fibonacci sequence.
The first number in the sequence is 0, and the second number is 1. To generate subsequent numbers in the sequence,
we add the previous two numbers.

The Fibonacci sequence goes: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...

Sample Input:
n = 6

Sample Output:
5 // 0, 1, 1, 2, 3, 5

Note: The input n refers to the zero-based position in the sequence.

Constraints:
- 0 ≤ n ≤ 30
- The function should return the nth number in the Fibonacci sequence
- Consider n = 0 returns 0, n = 1 returns 1
*/

function getNthFib(n) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: 6,
            expected: 5,
            description: "Sample test case"
        },
        {
            input: 0,
            expected: 0,
            description: "First number"
        },
        {
            input: 1,
            expected: 1,
            description: "Second number"
        },
        {
            input: 2,
            expected: 1,
            description: "Third number"
        },
        {
            input: 7,
            expected: 8,
            description: "Medium sized input"
        },
        {
            input: 10,
            expected: 34,
            description: "Larger input"
        },
        {
            input: 15,
            expected: 377,
            description: "Even larger input"
        },
        {
            input: 20,
            expected: 4181,
            description: "Very large input"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Calculate nth Fibonacci number
        const result = getNthFib(testCase.input);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input: n = ${testCase.input}`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
