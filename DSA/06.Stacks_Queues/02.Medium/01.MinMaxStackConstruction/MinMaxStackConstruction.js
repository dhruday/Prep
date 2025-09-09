/*
Min Max Stack Construction

Problem Statement:
Write a MinMaxStack class for a Min Max Stack. The class should support:
1. Pushing and popping values on and off the stack
2. Peeking at the value at the top of the stack
3. Getting both the minimum and the maximum values in the stack at any given point

All class methods, when considered independently, should run in constant time and with
constant space.

Sample Usage:
MinMaxStack(): - // instantiate a MinMaxStack
push(5): -
getMin(): 5
getMax(): 5
peek(): 5
push(7): -
getMin(): 5
getMax(): 7
peek(): 7
push(2): -
getMin(): 2
getMax(): 7
peek(): 2
pop(): 2
pop(): 7
getMin(): 5
getMax(): 5
peek(): 5

Test Cases:
1. Push multiple values
2. Pop values
3. Get min and max with single value
4. Get min and max with multiple values
5. Get min and max after pop
6. Peek after various operations
7. Empty stack operations
8. Push duplicate values
*/

class MinMaxStack {
    constructor() {
        // Write your code here
    }

    peek() {
        // Write your code here
    }

    pop() {
        // Write your code here
    }

    push(number) {
        // Write your code here
    }

    getMin() {
        // Write your code here
    }

    getMax() {
        // Write your code here
    }
}

// Test Cases
function runTests() {
    const testCases = [
        {
            description: "Basic operations test",
            operations: [
                { method: "push", args: [5], expected: undefined },
                { method: "getMin", args: [], expected: 5 },
                { method: "getMax", args: [], expected: 5 },
                { method: "peek", args: [], expected: 5 },
                { method: "push", args: [7], expected: undefined },
                { method: "getMin", args: [], expected: 5 },
                { method: "getMax", args: [], expected: 7 },
                { method: "peek", args: [], expected: 7 },
                { method: "push", args: [2], expected: undefined },
                { method: "getMin", args: [], expected: 2 },
                { method: "getMax", args: [], expected: 7 },
                { method: "peek", args: [], expected: 2 },
                { method: "pop", args: [], expected: 2 },
                { method: "pop", args: [], expected: 7 },
                { method: "getMin", args: [], expected: 5 },
                { method: "getMax", args: [], expected: 5 },
                { method: "peek", args: [], expected: 5 }
            ]
        },
        {
            description: "Empty stack operations",
            operations: [
                { method: "peek", args: [], expected: null },
                { method: "pop", args: [], expected: null },
                { method: "getMin", args: [], expected: null },
                { method: "getMax", args: [], expected: null }
            ]
        },
        {
            description: "Single value operations",
            operations: [
                { method: "push", args: [5], expected: undefined },
                { method: "getMin", args: [], expected: 5 },
                { method: "getMax", args: [], expected: 5 },
                { method: "peek", args: [], expected: 5 },
                { method: "pop", args: [], expected: 5 },
                { method: "peek", args: [], expected: null }
            ]
        },
        {
            description: "Duplicate values",
            operations: [
                { method: "push", args: [5], expected: undefined },
                { method: "push", args: [5], expected: undefined },
                { method: "push", args: [5], expected: undefined },
                { method: "getMin", args: [], expected: 5 },
                { method: "getMax", args: [], expected: 5 },
                { method: "pop", args: [], expected: 5 },
                { method: "getMin", args: [], expected: 5 },
                { method: "getMax", args: [], expected: 5 }
            ]
        },
        {
            description: "Complex sequence",
            operations: [
                { method: "push", args: [1], expected: undefined },
                { method: "push", args: [2], expected: undefined },
                { method: "push", args: [3], expected: undefined },
                { method: "getMin", args: [], expected: 1 },
                { method: "getMax", args: [], expected: 3 },
                { method: "push", args: [0], expected: undefined },
                { method: "getMin", args: [], expected: 0 },
                { method: "getMax", args: [], expected: 3 },
                { method: "pop", args: [], expected: 0 },
                { method: "getMin", args: [], expected: 1 },
                { method: "getMax", args: [], expected: 3 },
                { method: "peek", args: [], expected: 3 }
            ]
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        const stack = new MinMaxStack();
        let casePassed = true;
        
        testCase.operations.forEach((operation, opIndex) => {
            const result = stack[operation.method](...operation.args);
            const passed = result === operation.expected;
            
            console.log(`Operation ${opIndex + 1}: ${operation.method}(${operation.args})`);
            console.log(`Expected: ${operation.expected}`);
            console.log(`Actual: ${result}`);
            console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
            
            if (!passed) {
                casePassed = false;
                allTestsPassed = false;
            }
        });
        
        console.log(`Test Case Status: ${casePassed ? 'PASSED ✅' : 'FAILED ❌'}`);
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
