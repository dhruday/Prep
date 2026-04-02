/*
Generate Document

Problem Statement:
You're given a string of available characters and a string representing a document that you need
to generate. Write a function that determines if you can generate the document using the available
characters. If you can generate the document, return true; otherwise return false.

You're only able to generate the document if the frequency of unique characters in the characters
string is greater than or equal to the frequency of unique characters in the document string.

Note:
- You can use each character in the characters string only once
- The document can contain any characters including special characters, spaces, and numbers
- Both strings can be empty

Sample Input:
characters = "Bste!hetsi ogEAxpelrt x "
document = "AlgoExpert is the Best!"

Sample Output:
true // We can generate the document using characters

Test Cases:
1. characters = "Bste!hetsi ogEAxpelrt x "
   document = "AlgoExpert is the Best!"
   Expected Output: true

2. characters = "aheaolabbhb"
   document = "hello"
   Expected Output: true

3. characters = "aheaolabbhb"
   document = "hello world"
   Expected Output: false

4. characters = " "
   document = "hello"
   Expected Output: false

5. characters = "hellohello"
   document = "hello"
   Expected Output: true

Solution Approaches:
1. Character Frequency Count (Optimal): O(n + m) time | O(c) space
   where n is the length of characters string
   m is the length of document string
   c is the number of unique characters in characters string
   - Count frequency of each character in characters string
   - Check if we have enough of each character for document

2. Character Checking: O(n * m) time | O(1) space
   - For each character in document
   - Check if it exists in characters string
   - Remove used character from characters string
*/

function generateDocument(characters, document) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        characters: "Bste!hetsi ogEAxpelrt x ",
        document: "AlgoExpert is the Best!",
        expected: true
    },
    {
        characters: "aheaolabbhb",
        document: "hello",
        expected: true
    },
    {
        characters: "aheaolabbhb",
        document: "hello world",
        expected: false
    },
    {
        characters: " ",
        document: "hello",
        expected: false
    },
    {
        characters: "hellohello",
        document: "hello",
        expected: true
    },
    {
        characters: "&&&&",
        document: "&",
        expected: true
    },
    {
        characters: "abcabc",
        document: "aabbcc",
        expected: false
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = generateDocument(testCase.characters, testCase.document);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Characters: "${testCase.characters}"`);
        console.log(`Document: "${testCase.document}"`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
