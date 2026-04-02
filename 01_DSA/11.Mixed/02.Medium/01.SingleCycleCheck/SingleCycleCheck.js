/*
Single Cycle Check

You're given an array of integers where each integer represents a jump of its
value in the array. For instance, the integer 2 represents a jump of two indices
forward in the array; the integer -3 represents a jump of three indices backward
in the array.

If a jump spills past the array's bounds, it wraps over to the other side. For
instance, a jump of -1 at index 0 brings us to the last index in the array.
Similarly, a jump of 1 at the last index in the array brings us to index 0.

Write a function that returns a boolean representing whether the jumps in the
array form a single cycle. A single cycle occurs if, starting at any index in
the array and following the jumps, every element in the array is visited exactly
once before landing back on the starting index.

Sample Input:
array = [2, 3, 1, -4, -4, 2]

Sample Output:
true
// Starting at index 0: 0 -> 2 -> 3 -> -1 -> 4 -> 6 (wrap) -> 0
// All elements are visited exactly once and we end back at 0.
*/

function hasSingleCycle(array) {
    let numElementsVisited = 0;
    let currentIdx = 0;
    
    while (numElementsVisited < array.length) {
        if (numElementsVisited > 0 && currentIdx === 0) {
            return false; // Came back to start too early
        }
        
        numElementsVisited++;
        currentIdx = getNextIndex(currentIdx, array);
    }
    
    return currentIdx === 0; // Should be back at start after visiting all elements
}

function getNextIndex(currentIdx, array) {
    const jump = array[currentIdx];
    const nextIdx = (currentIdx + jump) % array.length;
    return nextIdx >= 0 ? nextIdx : nextIdx + array.length;
}

// Test Cases
function runTests() {
    const testCases = [
        {
            array: [2, 3, 1, -4, -4, 2],
            expected: true,
            description: "Sample test case"
        },
        {
            array: [1, 1, 1, 1],
            expected: true,
            description: "All ones"
        },
        {
            array: [1, -1],
            expected: true,
            description: "Back and forth"
        },
        {
            array: [1, 2, 3, 4, -2, 3, 7, 8, -26],
            expected: true,
            description: "Long array with single cycle"
        },
        {
            array: [2, 2, -1],
            expected: false,
            description: "Skips elements"
        },
        {
            array: [2, 2, 2],
            expected: false,
            description: "Same jump value"
        },
        {
            array: [1, 1, 0, 1, 1],
            expected: false,
            description: "Stuck in loop with zero"
        },
        {
            array: [-1, 2, 2],
            expected: false,
            description: "Multiple cycles"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        console.log("Array:", testCase.array);
        
        const result = hasSingleCycle(testCase.array);
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
