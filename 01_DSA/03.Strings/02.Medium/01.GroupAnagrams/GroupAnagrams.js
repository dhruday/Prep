/*
Group Anagrams

Problem Statement:
Write a function that takes in an array of strings and groups anagrams together.
Anagrams are strings made up of exactly the same letters, where order doesn't matter.
For example, "cinema" and "iceman" are anagrams; "foo" and "ofo" are anagrams.

Your function should return a list of anagram groups in no particular order.

Sample Input:
words = ["yo", "act", "flop", "tac", "foo", "cat", "oy", "olfp"]

Sample Output:
[["yo", "oy"], ["flop", "olfp"], ["act", "tac", "cat"], ["foo"]]
// The groups don't need to be in any particular order

Test Cases:
1. words = ["yo", "act", "flop", "tac", "foo", "cat", "oy", "olfp"]
   Expected Output: [["yo", "oy"], ["flop", "olfp"], ["act", "tac", "cat"], ["foo"]]

2. words = ["cinema", "iceman", "anemic"]
   Expected Output: [["cinema", "iceman", "anemic"]]

3. words = [""]
   Expected Output: [[""]]

4. words = ["test"]
   Expected Output: [["test"]]

5. words = ["eat", "tea", "tan", "ate", "nat", "bat"]
   Expected Output: [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]

Solution Approaches:
1. Sorted String as Key (Optimal): O(w * n * log(n)) time | O(wn) space
   where w is the number of words and n is the length of the longest word
   - Sort each word to create anagram key
   - Group words by sorted key
   - Return grouped results

2. Character Count Map: O(w * n) time | O(wn) space
   - Create character frequency map for each word
   - Use map as key for grouping
   - Slightly better time complexity but more complex implementation
*/

function groupAnagrams(words) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        words: ["yo", "act", "flop", "tac", "foo", "cat", "oy", "olfp"],
        expected: [["yo", "oy"], ["flop", "olfp"], ["act", "tac", "cat"], ["foo"]]
    },
    {
        words: ["cinema", "iceman", "anemic"],
        expected: [["cinema", "iceman", "anemic"]]
    },
    {
        words: [""],
        expected: [[""]]
    },
    {
        words: ["test"],
        expected: [["test"]]
    },
    {
        words: ["eat", "tea", "tan", "ate", "nat", "bat"],
        expected: [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]
    },
    {
        words: ["abc", "cba", "bca", "xyz", "zyx", "yxz"],
        expected: [["abc", "cba", "bca"], ["xyz", "zyx", "yxz"]]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = groupAnagrams([...testCase.words]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input Words: [${testCase.words.map(w => `"${w}"`).join(", ")}]`);
        console.log(`Your Output: ${JSON.stringify(result)}`);
        console.log(`Expected Output: ${JSON.stringify(testCase.expected)}`);
        const passed = areAnagramGroupsEqual(result, testCase.expected);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to compare anagram groups
function areAnagramGroupsEqual(groups1, groups2) {
    if (groups1.length !== groups2.length) return false;
    
    // Sort each group and the overall array of groups for comparison
    const sortGroup = group => [...group].sort();
    const sortGroups = groups => 
        [...groups].map(sortGroup)
                  .sort((a, b) => a.join('').localeCompare(b.join('')));
    
    const sorted1 = sortGroups(groups1);
    const sorted2 = sortGroups(groups2);
    
    return JSON.stringify(sorted1) === JSON.stringify(sorted2);
}

// Run the tests
runTests();
