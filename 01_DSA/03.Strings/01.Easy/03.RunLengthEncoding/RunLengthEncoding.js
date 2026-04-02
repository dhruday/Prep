/*
Run Length Encoding

Problem Statement:
Write a function that takes in a non-empty string and returns its run-length encoding.
Run-length encoding is a form of lossless data compression where consecutive data elements
are replaced with the count of consecutive elements followed by the element itself.

Note:
- If a sequence has length 1, simply include the element
- If a sequence count is 10 or greater, split it into multiple counts less than 10
- The input string will only contain letters (uppercase or lowercase) and numbers

Sample Input:
string = "AAAAAAAAAAAAABBCCCCDD"

Sample Output:
"9A4A2B4C2D"
// The long sequence of 13 A's is split into a 9-count and a 4-count

Test Cases:
1. string = "AAAAAAAAAAAAABBCCCCDD"
   Expected Output: "9A4A2B4C2D"

2. string = "aA"
   Expected Output: "1a1A"

3. string = "122333"
   Expected Output: "112233"

4. string = "************^^^^^^^$$$$$$%%%%%%%!!!!!!AAAAAAAAAAAAAAAAAAAA"
   Expected Output: "9*3*7^6$7%6!9A9A2A"

5. string = "                          "
   Expected Output: "9 9 8 "

Solution Approaches:
1. Linear Traversal (Optimal): O(n) time | O(n) space
   - Keep track of current count and character
   - When character changes or count reaches 9, add to result
   - Handle the last sequence after loop ends

2. Two-Pointer Approach: O(n) time | O(n) space
   - Use two pointers to track sequence boundaries
   - Calculate length of each sequence
   - Split sequences longer than 9
*/

function runLengthEncoding(string) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        string: "AAAAAAAAAAAAABBCCCCDD",
        expected: "9A4A2B4C2D"
    },
    {
        string: "aA",
        expected: "1a1A"
    },
    {
        string: "122333",
        expected: "112233"
    },
    {
        string: "************^^^^^^^$$$$$$%%%%%%%!!!!!!AAAAAAAAAAAAAAAAAAAA",
        expected: "9*3*7^6$7%6!9A9A2A"
    },
    {
        string: "                          ",
        expected: "9 9 8 "
    },
    {
        string: ",,,,,,,,,,,,",
        expected: "9,3,"
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = runLengthEncoding(testCase.string);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input String: "${testCase.string}"`);
        console.log(`Your Output: "${result}"`);
        console.log(`Expected Output: "${testCase.expected}"`);
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
