/*
Numbers in Pi

Problem Statement:
Given a string representation of the first n digits of Pi and a list of positive
integers (called numbers), write a function that returns the smallest number of
spaces that need to be added to the n digits of Pi such that all resulting numbers
are found in the list of numbers.

The numbers can be used multiple times, and they don't need to be used in any
particular order. If no number of spaces to be added exists such that all resulting
numbers are found in the list, return -1.

For example, if Pi is "3141" and numbers is [1, 3, 4, 31, 41], the number 3141 can
be split into 31 and 41, which are both in the list of numbers. In this case, your
function should return 1 since only one space needs to be added to create these numbers.

Sample Input:
pi = "3141592"
numbers = ["3141", "5", "31", "2", "4159", "9", "42"]

Sample Output:
2 // "3141" "592" requires 1 space, "31" "4159" "2" requires 2 spaces

Constraints:
- 1 ≤ pi.length ≤ 100
- 1 ≤ numbers.length ≤ 250
- 1 ≤ numbers[i].length ≤ 10
- The input string contains only digits 0-9
- Each number in numbers consists only of digits 0-9
- The numbers array contains no duplicates
*/

function numbersInPi(pi, numbers) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            pi: "3141592",
            numbers: ["3141", "5", "31", "2", "4159", "9", "42"],
            expected: 2,
            description: "Sample test case"
        },
        {
            pi: "3141",
            numbers: ["1", "3", "4", "31", "41"],
            expected: 1,
            description: "Short Pi string"
        },
        {
            pi: "3141",
            numbers: ["314", "1"],
            expected: 1,
            description: "Minimal splits needed"
        },
        {
            pi: "3141",
            numbers: ["31", "41", "314", "3141"],
            expected: 0,
            description: "No splits needed"
        },
        {
            pi: "3141592",
            numbers: ["3", "1", "4", "1", "5", "9", "2"],
            expected: 6,
            description: "Maximum splits needed"
        },
        {
            pi: "3141592",
            numbers: ["314", "49", "9001"],
            expected: -1,
            description: "No valid solution"
        },
        {
            pi: "31415926",
            numbers: ["314", "159", "26", "535", "89793"],
            expected: 2,
            description: "Longer Pi string"
        },
        {
            pi: "3141592653",
            numbers: ["314", "15", "926", "535", "8", "97", "93", "23", "84", "6"],
            expected: 5,
            description: "Many possible combinations"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Find minimum number of spaces needed
        const result = numbersInPi(testCase.pi, testCase.numbers);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input:`);
        console.log(`  Pi: "${testCase.pi}"`);
        console.log(`  Numbers: ${JSON.stringify(testCase.numbers)}`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
