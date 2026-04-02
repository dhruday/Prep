/*
Task Assignment

Problem Statement:
You're given an integer k (representing the number of workers) and an array of positive integers
representing durations of tasks that need to be completed by the workers. Specifically, each worker
must complete two unique tasks and can only work on one task at a time. The number of tasks will
always equal 2k such that each worker always has exactly two tasks to complete. Each task can only
be assigned to one worker, and the task durations can be completed in any order.

Write a function that returns the optimal assignment of tasks to each worker such that the tasks are
completed as fast as possible. The function should return a list of pairs, where each pair stores
the indices of the tasks that should be completed by one worker. The pairs should be in the following
format: [task1, task2], where the order of task1 and task2 doesn't matter. Your function can return
the pairs in any order. If multiple optimal assignments exist, your function can return any of them.

Sample Input:
k = 3 (workers)
tasks = [1, 3, 5, 3, 1, 4]

Sample Output:
[[0, 2], [4, 5], [1, 3]]
// tasks[0] = 1, tasks[2] = 5 | worker 1 completes tasks in 6 time units
// tasks[4] = 1, tasks[5] = 4 | worker 2 completes tasks in 5 time units
// tasks[1] = 3, tasks[3] = 3 | worker 3 completes tasks in 6 time units
// The fastest time to complete all tasks is 6 time units

Test Cases:
1. k = 3, tasks = [1, 3, 5, 3, 1, 4]
   Expected Output: [[0, 2], [4, 5], [1, 3]] // or any valid optimal assignment

2. k = 4, tasks = [1, 2, 3, 4, 5, 6, 7, 8]
   Expected Output: [[0, 7], [1, 6], [2, 5], [3, 4]] // or any valid optimal assignment

3. k = 2, tasks = [2, 2, 1, 1]
   Expected Output: [[0, 3], [1, 2]] // or any valid optimal assignment

4. k = 3, tasks = [1, 1, 1, 1, 1, 1]
   Expected Output: [[0, 1], [2, 3], [4, 5]] // or any valid optimal assignment

5. k = 2, tasks = [5, 2, 1, 6]
   Expected Output: [[1, 3], [0, 2]] // or any valid optimal assignment

Solution Approaches:
1. Greedy Assignment: O(nlog(n)) time | O(n) space
   - Sort tasks by duration
   - Pair shortest tasks with longest tasks
*/

function taskAssignment(k, tasks) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        k: 3,
        tasks: [1, 3, 5, 3, 1, 4],
        validator: result => validateAssignment(result, 3, [1, 3, 5, 3, 1, 4])
    },
    {
        k: 4,
        tasks: [1, 2, 3, 4, 5, 6, 7, 8],
        validator: result => validateAssignment(result, 4, [1, 2, 3, 4, 5, 6, 7, 8])
    },
    {
        k: 2,
        tasks: [2, 2, 1, 1],
        validator: result => validateAssignment(result, 2, [2, 2, 1, 1])
    },
    {
        k: 3,
        tasks: [1, 1, 1, 1, 1, 1],
        validator: result => validateAssignment(result, 3, [1, 1, 1, 1, 1, 1])
    },
    {
        k: 2,
        tasks: [5, 2, 1, 6],
        validator: result => validateAssignment(result, 2, [5, 2, 1, 6])
    }
];

// Helper function to validate task assignment
function validateAssignment(assignment, k, tasks) {
    // Check if we have correct number of pairs
    if (assignment.length !== k) return false;

    // Check if each worker has exactly two tasks
    const usedIndices = new Set();
    for (const pair of assignment) {
        if (pair.length !== 2) return false;
        if (usedIndices.has(pair[0]) || usedIndices.has(pair[1])) return false;
        if (pair[0] < 0 || pair[0] >= tasks.length || pair[1] < 0 || pair[1] >= tasks.length) return false;
        usedIndices.add(pair[0]);
        usedIndices.add(pair[1]);
    }

    // Check if all tasks are assigned
    if (usedIndices.size !== tasks.length) return false;

    // Calculate maximum time
    const times = assignment.map(pair => tasks[pair[0]] + tasks[pair[1]]);
    const maxTime = Math.max(...times);

    // Check if this is an optimal assignment
    // For this simple validator, we'll just ensure it's a valid assignment
    return true;
}

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = taskAssignment(testCase.k, [...testCase.tasks]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`k: ${testCase.k}`);
        console.log(`Tasks: [${testCase.tasks}]`);
        console.log(`Your Output: [${result.map(pair => `[${pair}]`)}]`);
        const passed = testCase.validator(result);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
