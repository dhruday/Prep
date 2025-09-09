/*
Balanced Brackets

Problem Statement:
Write a function that takes in a string made up of brackets ("(", "[", "{", ")", "]",
and "}") and other optional characters. The function should return a boolean
representing whether or not the string is balanced with regards to brackets.

A string is said to be balanced if it has as many opening brackets of a given type as
it has closing brackets of that type and if no bracket is unmatched. Note that an
opening bracket can't match a corresponding closing bracket that comes before it, and
similarly, a closing bracket can't match a corresponding opening bracket that comes
after it. Also, brackets can't overlap each other as in [(]).

Sample Input:
string = "([])(){}(())()()"

Sample Output:
true // it's balanced

Test Cases:
1. Sample case above
2. Empty string
3. Single bracket
4. Only opening brackets
5. Only closing brackets
6. Mixed brackets with overlap
7. Balanced but complex nesting
8. Unbalanced complex nesting
9. Non-bracket characters mixed in
*/

function balancedBrackets(string) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: "([])(){}(())()()",
            expected: true,
            description: "Sample case from example"
        },
        {
            input: "",
            expected: true,
            description: "Empty string"
        },
        {
            input: "(",
            expected: false,
            description: "Single opening bracket"
        },
        {
            input: ")",
            expected: false,
            description: "Single closing bracket"
        },
        {
            input: "([{",
            expected: false,
            description: "Only opening brackets"
        },
        {
            input: "}])",
            expected: false,
            description: "Only closing brackets"
        },
        {
            input: "[(])",
            expected: false,
            description: "Mixed brackets with overlap"
        },
        {
            input: "((([[[{{{}}})]]))",
            expected: false,
            description: "Invalid complex nesting"
        },
        {
            input: "((([[{{}}]])))",
            expected: true,
            description: "Valid complex nesting"
        },
        {
            input: "([]){}()",
            expected: true,
            description: "Simple balanced combination"
        },
        {
            input: "hello(world)[!]",
            expected: true,
            description: "With non-bracket characters"
        },
        {
            input: "(a[b{c}d]e)f",
            expected: true,
            description: "Complex with letters"
        },
        {
            input: "([)]",
            expected: false,
            description: "Invalid cross nesting"
        },
        {
            input: "((())",
            expected: false,
            description: "Missing closing bracket"
        },
        {
            input: "(())",
            expected: true,
            description: "Simple nested pair"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Check if brackets are balanced
        const result = balancedBrackets(testCase.input);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input: "${testCase.input}"`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
