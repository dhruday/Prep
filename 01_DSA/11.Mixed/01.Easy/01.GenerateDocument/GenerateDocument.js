/*
Generate Document

You're given a string of available characters and a string representing a document
that you need to generate. Write a function that determines if you can generate
the document using the available characters. If you can generate the document,
your function should return true; otherwise, it should return false.

You're only able to generate the document if the frequency of unique characters in
the characters string is greater than or equal to the frequency of unique
characters in the document string.

For example, if you're given characters = "abcabc" and document = "aabbccc" you
cannot generate the document because you're missing one c.

Sample Input:
characters = "Bste!hetsi ogEAxpelrt x "
document = "AlgoExpert is the Best!"

Sample Output:
true
*/

function generateDocument(characters, document) {
    // Create frequency map for available characters
    const charFreq = {};
    
    // Count frequency of each character in characters string
    for (const char of characters) {
        charFreq[char] = (charFreq[char] || 0) + 1;
    }
    
    // Check if we have enough of each character needed for the document
    for (const char of document) {
        if (!charFreq[char] || charFreq[char] === 0) {
            return false;
        }
        charFreq[char]--;
    }
    
    return true;
}

// Test Cases
function runTests() {
    const testCases = [
        {
            characters: "Bste!hetsi ogEAxpelrt x ",
            document: "AlgoExpert is the Best!",
            expected: true,
            description: "Sample test case"
        },
        {
            characters: "abcabc",
            document: "aabbccc",
            expected: false,
            description: "Not enough characters"
        },
        {
            characters: "A",
            document: "a",
            expected: false,
            description: "Case sensitive characters"
        },
        {
            characters: "    ",
            document: "     ",
            expected: false,
            description: "Spaces test"
        },
        {
            characters: "aheaolabbhb",
            document: "hello",
            expected: true,
            description: "Extra characters available"
        },
        {
            characters: "",
            document: "",
            expected: true,
            description: "Empty strings"
        },
        {
            characters: "helloworld",
            document: "",
            expected: true,
            description: "Empty document"
        },
        {
            characters: "",
            document: "hello",
            expected: false,
            description: "Empty characters string"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        console.log("Characters:", testCase.characters);
        console.log("Document:", testCase.document);
        
        const result = generateDocument(testCase.characters, testCase.document);
        console.log("Expected:", testCase.expected);
        console.log("Got:", result);
        
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) {
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
