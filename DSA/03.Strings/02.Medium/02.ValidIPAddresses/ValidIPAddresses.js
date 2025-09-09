/*
Valid IP Addresses

Problem Statement:
Write a function that takes in a string of numbers and returns all possible valid IP addresses
that can be created by inserting three dots (.) in the string. An IP address is considered
valid if it consists of four octets between 0 and 255 (inclusive), with single-digit numbers
not preceded by a zero.

For example:
- "192.168.0.1" is a valid IP address
- "192.168.00.1" is not valid because "00" is preceded by a zero
- "192.168.0.256" is not valid because 256 is greater than 255
- "192.168.01.1" is not valid because "01" is preceded by a zero

Sample Input:
string = "1921680"

Sample Output:
[
    "1.9.216.80",
    "1.92.16.80",
    "1.92.168.0",
    "19.2.16.80",
    "19.2.168.0",
    "19.21.6.80",
    "19.21.68.0",
    "19.216.8.0",
    "192.1.6.80",
    "192.1.68.0",
    "192.16.8.0",
    "192.168.0.0"
]
// The IP addresses could be ordered differently.

Test Cases:
1. string = "1921680"
   Expected Output: [
     "1.9.216.80", "1.92.16.80", "1.92.168.0",
     "19.2.16.80", "19.2.168.0", "19.21.6.80",
     "19.21.68.0", "19.216.8.0", "192.1.6.80",
     "192.1.68.0", "192.16.8.0", "192.168.0.0"
   ]

2. string = "3700100"
   Expected Output: [
     "3.70.0.100", "37.0.0.100"
   ]

3. string = "0000"
   Expected Output: [
     "0.0.0.0"
   ]

4. string = "25525511135"
   Expected Output: [
     "255.255.11.135", "255.255.111.35"
   ]

Solution Approaches:
1. Iterative Approach (Optimal): O(1) time | O(1) space
   - Try all possible positions for three dots
   - Validate each octet
   - Store valid combinations
   Note: Time and space are O(1) because:
   - Input is limited to 12 digits (for valid IPs)
   - Output is limited to valid IP combinations

2. Recursive Approach: O(1) time | O(1) space
   - Recursively place dots
   - Validate each partial solution
   - Same complexity as iterative but may be clearer
*/

function validIPAddresses(string) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        string: "1921680",
        expected: [
            "1.9.216.80", "1.92.16.80", "1.92.168.0",
            "19.2.16.80", "19.2.168.0", "19.21.6.80",
            "19.21.68.0", "19.216.8.0", "192.1.6.80",
            "192.1.68.0", "192.16.8.0", "192.168.0.0"
        ]
    },
    {
        string: "3700100",
        expected: [
            "3.70.0.100", "37.0.0.100"
        ]
    },
    {
        string: "0000",
        expected: [
            "0.0.0.0"
        ]
    },
    {
        string: "25525511135",
        expected: [
            "255.255.11.135", "255.255.111.35"
        ]
    },
    {
        string: "00001",
        expected: []
    },
    {
        string: "100",
        expected: []
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = validIPAddresses(testCase.string);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input String: "${testCase.string}"`);
        console.log(`Your Output: ${JSON.stringify(result)}`);
        console.log(`Expected Output: ${JSON.stringify(testCase.expected)}`);
        const passed = arraysEqual(result.sort(), testCase.expected.sort());
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to compare arrays
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

// Run the tests
runTests();
