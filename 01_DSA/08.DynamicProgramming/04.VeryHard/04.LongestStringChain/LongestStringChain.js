/*
Longest String Chain

Problem Statement:
Given a list of strings, write a function that returns the longest string chain that
can be built from those strings. A string chain is defined as follows:
- Let's say that string A is a predecessor of string B if string B can be formed by
  adding exactly one letter anywhere in string A.
- For example, "abc" is a predecessor of "abac", but "abc" is not a predecessor of
  "abcd" (adds too many letters) or "ab" (removes letters).
- A string chain is a sequence of strings where each string is a predecessor of the
  next string in the sequence.

The function should return an array of strings representing the longest possible string
chain that can be built from the input array.

Note that strings in the input array can be used in any order to build the chain.
If there are multiple string chains of the same maximum length, return any one of them.

Sample Input:
strings = ["abde", "abc", "abd", "abcde", "ade", "ae"]

Sample Output:
["ae", "ade", "abde", "abcde"]
// This represents the longest string chain possible:
// "ae" -> "ade" -> "abde" -> "abcde"

Constraints:
- 1 ≤ strings.length ≤ 1000
- 1 ≤ strings[i].length ≤ 16
- All strings are unique
- All strings contain only lowercase English letters
*/

function longestStringChain(strings) {
    // Write your code here
}

// Helper function to check if one string is a predecessor of another
function isPredecessor(str1, str2) {
    if (str2.length !== str1.length + 1) return false;
    
    let i = 0, j = 0;
    let foundDifference = false;
    
    while (i < str1.length && j < str2.length) {
        if (str1[i] === str2[j]) {
            i++;
            j++;
        } else {
            if (foundDifference) return false;
            foundDifference = true;
            j++;
        }
    }
    
    return true;
}

// Helper function to verify a string chain
function isValidChain(chain) {
    for (let i = 0; i < chain.length - 1; i++) {
        if (!isPredecessor(chain[i], chain[i + 1])) return false;
    }
    return true;
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: ["abde", "abc", "abd", "abcde", "ade", "ae"],
            expected: ["ae", "ade", "abde", "abcde"],
            description: "Sample test case"
        },
        {
            input: ["a", "ab", "abc", "abcd"],
            expected: ["a", "ab", "abc", "abcd"],
            description: "Simple increasing lengths"
        },
        {
            input: ["a"],
            expected: ["a"],
            description: "Single string"
        },
        {
            input: ["a", "b", "c"],
            expected: ["a"], // or ["b"] or ["c"]
            description: "No valid chains"
        },
        {
            input: ["abcd", "abcde", "ab", "abc", "abcdef"],
            expected: ["ab", "abc", "abcd", "abcde", "abcdef"],
            description: "All strings can form chain"
        },
        {
            input: ["ab", "abc", "abcd", "abx", "abxz"],
            expected: ["ab", "abx", "abxz"],
            description: "Multiple possible chains"
        },
        {
            input: ["xyz", "xz", "xyzz", "xy", "zzz"],
            expected: ["xy", "xyz", "xyzz"],
            description: "Complex chain"
        },
        {
            input: ["abcde", "bcde", "cde", "de", "e"],
            expected: ["e", "de", "cde", "bcde", "abcde"],
            description: "Decreasing prefixes"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Find longest string chain
        const result = longestStringChain(testCase.input);
        
        // Verify the result
        const isValid = isValidChain(result);
        const correctLength = result.length === testCase.expected.length;
        const allStringsExist = result.every(str => testCase.input.includes(str));
        
        // A solution is considered correct if:
        // 1. It forms a valid chain
        // 2. It has the same length as the expected solution
        // 3. All strings in the chain exist in the input array
        const passed = isValid && correctLength && allStringsExist;
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        console.log(`Expected Length: ${testCase.expected.length}`);
        console.log(`Expected (one possible solution): ${JSON.stringify(testCase.expected)}`);
        console.log(`Actual: ${JSON.stringify(result)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) {
            if (!isValid) console.log("  Failed: Not a valid string chain");
            if (!correctLength) console.log("  Failed: Chain length doesn't match expected");
            if (!allStringsExist) console.log("  Failed: Chain contains strings not in input");
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
