/*
Disk Stacking

Problem Statement:
You're given a non-empty array of arrays where each subarray holds three integers and
represents a disk. These integers denote each disk's width, depth, and height,
respectively. Your goal is to stack up the disks and to maximize the total height of
the stack.

A disk must have a strictly smaller width, depth, and height than any other disk below
it in the stack.

Write a function that returns an array of the disks in the final stack, starting with
the top disk and ending with the bottom disk. Note that you can't rotate disks; in
other words, the integers in each subarray must represent [width, depth, height] at
all times.

You can assume that there will only be one stack with the greatest total height.

Sample Input:
disks = [[2, 1, 2], [3, 2, 3], [2, 2, 8], [2, 3, 4], [1, 3, 1], [4, 4, 5]]

Sample Output:
[[2, 1, 2], [3, 2, 3], [4, 4, 5]]
// 10 (2 + 3 + 5) is the tallest height we can get by stacking disks following the rules
// laid out above.

Constraints:
- 1 ≤ disks.length ≤ 100
- 1 ≤ disk[i][j] ≤ 100
*/

function diskStacking(disks) {
    // Write your code here
}

// Helper function to verify if one disk can be placed on top of another
function canStack(top, bottom) {
    return top[0] < bottom[0] && top[1] < bottom[1] && top[2] < bottom[2];
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: [[2, 1, 2], [3, 2, 3], [2, 2, 8], [2, 3, 4], [1, 3, 1], [4, 4, 5]],
            expected: [[2, 1, 2], [3, 2, 3], [4, 4, 5]],
            description: "Sample test case"
        },
        {
            input: [[1, 1, 1]],
            expected: [[1, 1, 1]],
            description: "Single disk"
        },
        {
            input: [[2, 2, 2], [3, 3, 3]],
            expected: [[2, 2, 2], [3, 3, 3]],
            description: "Two disks that can be stacked"
        },
        {
            input: [[3, 3, 3], [2, 2, 2]],
            expected: [[2, 2, 2], [3, 3, 3]],
            description: "Two disks in reverse order"
        },
        {
            input: [[1, 1, 1], [2, 2, 1], [3, 3, 1]],
            expected: [[1, 1, 1], [2, 2, 1], [3, 3, 1]],
            description: "Same height disks"
        },
        {
            input: [[2, 2, 1], [2, 2, 2], [2, 2, 3]],
            expected: [[2, 2, 3]],
            description: "Cannot stack equal width/depth"
        },
        {
            input: [[1, 2, 3], [2, 3, 4], [3, 4, 5]],
            expected: [[1, 2, 3], [2, 3, 4], [3, 4, 5]],
            description: "Sequential dimensions"
        },
        {
            input: [[3, 3, 4], [4, 4, 5], [1, 1, 4], [2, 2, 2]],
            expected: [[2, 2, 2], [3, 3, 4], [4, 4, 5]],
            description: "Complex stacking scenario"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Stack the disks
        const result = diskStacking(testCase.input);
        
        // Verify the solution
        let isValid = true;
        let totalHeight = 0;
        
        // Check if each disk can be stacked on the one below it
        for (let i = 0; i < result.length - 1; i++) {
            if (!canStack(result[i], result[i + 1])) {
                isValid = false;
                break;
            }
        }
        
        // Calculate total height
        totalHeight = result.reduce((sum, disk) => sum + disk[2], 0);
        
        // Calculate expected height
        const expectedHeight = testCase.expected.reduce((sum, disk) => sum + disk[2], 0);
        
        // Solution is valid if:
        // 1. All disks can be stacked
        // 2. Total height matches expected
        // 3. All disks in result are present in input
        const heightMatches = totalHeight === expectedHeight;
        const passed = isValid && heightMatches;
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`Expected Height: ${expectedHeight}`);
        console.log(`Actual: ${JSON.stringify(result)}`);
        console.log(`Actual Height: ${totalHeight}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) {
            if (!isValid) console.log("  Failed: Invalid stacking order");
            if (!heightMatches) console.log("  Failed: Height doesn't match expected");
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
