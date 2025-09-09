/*
Reverse Words In String

Problem Statement:
Write a function that takes in a string of words separated by one or more whitespaces and
returns a string that has these words in reverse order. For example, given the string
"tim is great", your function should return "great is tim".

For this problem, a word can contain special characters, punctuation, and numbers. The words
in the string will be separated by one or more whitespaces, and the reversed string must
contain the same whitespaces as the original string. For example, given the string
"whitespaces    4" you would be expected to return "4    whitespaces".

Note that you're NOT allowed to use any built-in split or reverse methods/functions.
However, you ARE allowed to use the built-in join method/function.

Sample Input:
string = "AlgoExpert is the best!"

Sample Output:
"best! the is AlgoExpert"

Test Cases:
1. string = "AlgoExpert is the best!"
   Expected Output: "best! the is AlgoExpert"

2. string = "   this      string     has a     lot    of    whitespace   "
   Expected Output: "   whitespace    of    lot     a has      string      this   "

3. string = "hello"
   Expected Output: "hello"

4. string = ""
   Expected Output: ""

5. string = "1 22 333 4444 55555"
   Expected Output: "55555 4444 333 22 1"

Solution Approaches:
1. Reverse Individual Characters and Then Words: O(n) time | O(n) space
   - Reverse entire string
   - Reverse each word
   - Maintain original whitespace

2. Two-Pass Solution: O(n) time | O(n) space
   - First pass: collect all words and spaces
   - Second pass: rebuild string in reverse order
*/

function reverseWordsInString(string) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        string: "AlgoExpert is the best!",
        expected: "best! the is AlgoExpert"
    },
    {
        string: "   this      string     has a     lot    of    whitespace   ",
        expected: "   whitespace    of    lot     a has      string      this   "
    },
    {
        string: "hello",
        expected: "hello"
    },
    {
        string: "",
        expected: ""
    },
    {
        string: "1 22 333 4444 55555",
        expected: "55555 4444 333 22 1"
    },
    {
        string: "a     b     c     d",
        expected: "d     c     b     a"
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = reverseWordsInString(testCase.string);
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
