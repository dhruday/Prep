/*
Multi String Search

Problem Statement:
Write a function that takes in a big string and an array of small strings, all of which
are smaller in length than the big string. The function should return an array of booleans,
where each boolean represents whether the small string at that index in the array of small
strings is contained in the big string.

Note that you can't use language-built-in string-matching methods.

Sample Input:
bigString = "this is a big string"
smallStrings = ["this", "yo", "is", "a", "bigger", "string", "kappa"]

Sample Output:
[true, false, true, true, false, true, false]
// The strings "this", "is", "a", and "string" appear in the big string.
// The strings "yo", "bigger", and "kappa" don't appear in the big string.

Test Cases:
1. bigString = "this is a big string"
   smallStrings = ["this", "yo", "is", "a", "bigger", "string", "kappa"]
   Expected Output: [true, false, true, true, false, true, false]

2. bigString = "abcdefghijklmnopqrstuvwxyz"
   smallStrings = ["abc", "mnopqr", "wxy", "no", "e", "tuuv"]
   Expected Output: [true, true, true, true, true, false]

3. bigString = "Mary goes to the shopping center"
   smallStrings = ["to", "Mary", "centers", "shop", "shopping", "string", "kappa"]
   Expected Output: [true, true, false, false, true, false, false]

4. bigString = "adcb"
   smallStrings = ["abc", "ab", "cd"]
   Expected Output: [false, false, false]

5. bigString = "test test test test"
   smallStrings = ["test", "t", "est", "tes"]
   Expected Output: [true, true, true, true]

Solution Approaches:
1. Suffix Trie (Optimal for many searches): O(b + ns) time | O(b) space
   where b is the length of the big string
   n is the number of small strings
   s is the length of the longest small string
   - Build suffix trie from big string
   - Search each small string in trie

2. Multiple Individual Searches: O(bns) time | O(n) space
   where b is the length of the big string
   n is the number of small strings
   s is the length of the longest small string
   - Search each small string in big string
   - Less efficient but simpler to implement
*/

function multiStringSearch(bigString, smallStrings) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        bigString: "this is a big string",
        smallStrings: ["this", "yo", "is", "a", "bigger", "string", "kappa"],
        expected: [true, false, true, true, false, true, false]
    },
    {
        bigString: "abcdefghijklmnopqrstuvwxyz",
        smallStrings: ["abc", "mnopqr", "wxy", "no", "e", "tuuv"],
        expected: [true, true, true, true, true, false]
    },
    {
        bigString: "Mary goes to the shopping center",
        smallStrings: ["to", "Mary", "centers", "shop", "shopping", "string", "kappa"],
        expected: [true, true, false, false, true, false, false]
    },
    {
        bigString: "adcb",
        smallStrings: ["abc", "ab", "cd"],
        expected: [false, false, false]
    },
    {
        bigString: "test test test test",
        smallStrings: ["test", "t", "est", "tes"],
        expected: [true, true, true, true]
    },
    {
        bigString: "abcdefghijklmnopqrstuvwxyz",
        smallStrings: ["abc", "def", "ghi", "xyz", "klmno", "pqrst"],
        expected: [true, true, true, true, true, true]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = multiStringSearch(testCase.bigString, testCase.smallStrings);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Big String: "${testCase.bigString}"`);
        console.log(`Small Strings: ${JSON.stringify(testCase.smallStrings)}`);
        console.log(`Your Output: ${JSON.stringify(result)}`);
        console.log(`Expected Output: ${JSON.stringify(testCase.expected)}`);
        const passed = arraysEqual(result, testCase.expected);
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
