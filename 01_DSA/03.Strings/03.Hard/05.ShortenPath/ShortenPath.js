/*
Shorten Path

Problem Statement:
Write a function that takes in a non-empty string representing a valid Unix-shell path and
returns a shortened version of that path.

A path is a notation that represents the location of a file or directory in a file system.
A path can be an absolute path (starting with forward slash /) or a relative path (not
starting with forward slash). For relative paths assume they are relative to /root directory.

For this problem, valid paths can contain the following:
- Names of files or directories (letters, digits, plus signs, periods, spaces)
- Directory separator forward slashes (/)
- Current directory symbol (.)
- Parent directory symbol (..)

The shortened version of the path should be equivalent to the original path. In other words,
it should point to the same file or directory as the original path.

Sample Input:
path = "/foo/../test/../test/../foo//bar/./baz"

Sample Output:
"/foo/bar/baz"
// This shortened path points to the same location as the input path.

Test Cases:
1. path = "/foo/../test/../test/../foo//bar/./baz"
   Expected Output: "/foo/bar/baz"

2. path = "/../foo/bar/baz"
   Expected Output: "/foo/bar/baz"

3. path = "/foo/bar/baz/"
   Expected Output: "/foo/bar/baz"

4. path = "foo/bar/baz"
   Expected Output: "/foo/bar/baz"

5. path = "./foo/./bar/./baz"
   Expected Output: "/foo/bar/baz"

Solution Approaches:
1. Stack-Based Solution (Optimal): O(n) time | O(n) space
   where n is the length of the path
   - Split path into components
   - Process each component using a stack
   - Handle special symbols (., ..)
   - Join remaining components

2. String Manipulation: O(n) time | O(n) space
   - Process path character by character
   - Less efficient and more error-prone
*/

function shortenPath(path) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        path: "/foo/../test/../test/../foo//bar/./baz",
        expected: "/foo/bar/baz"
    },
    {
        path: "/../foo/bar/baz",
        expected: "/foo/bar/baz"
    },
    {
        path: "/foo/bar/baz/",
        expected: "/foo/bar/baz"
    },
    {
        path: "foo/bar/baz",
        expected: "/foo/bar/baz"
    },
    {
        path: "./foo/./bar/./baz",
        expected: "/foo/bar/baz"
    },
    {
        path: "../../foo/../../bar/baz",
        expected: "/bar/baz"
    },
    {
        path: "../../../../foo",
        expected: "/foo"
    },
    {
        path: "/",
        expected: "/"
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = shortenPath(testCase.path);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input Path: "${testCase.path}"`);
        console.log(`Your Output: "${result}"`);
        console.log(`Expected Output: "${testCase.expected}"`);
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
