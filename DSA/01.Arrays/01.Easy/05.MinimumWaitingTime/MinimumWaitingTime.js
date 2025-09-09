/*
Minimum Waiting Time

Problem Statement:
You're given a non-empty array of positive integers representing the amounts of time that specific queries take to execute.
Only one query can be executed at a time, but the queries can be executed in any order.

A query's waiting time is defined as the amount of time that it must wait before its execution starts.
In other words, if a query is executed second, then its waiting time is the duration of the first query;
if a query is executed third, then its waiting time is the sum of the durations of the first two queries.

Write a function that returns the minimum amount of total waiting time for all of the queries.
For example, if you're given the queries of durations [1, 4, 5], then the total waiting time if the queries
were executed in the order of [5, 1, 4] would be (0) + (5) + (5 + 1) = 11.

Note: You're allowed to mutate the input array.

Sample Input:
queries = [3, 2, 1, 2, 6]

Sample Output:
17
// Optimal order: [1, 2, 2, 3, 6]
// Waiting times: [0, 1, 3, 5, 8]
// Total waiting time: 0 + 1 + 3 + 5 + 8 = 17

Test Cases:
1. queries = [3, 2, 1, 2, 6]
   Expected Output: 17
2. queries = [2, 1, 1, 1]
   Expected Output: 6
3. queries = [1, 2, 4, 5, 2, 1]
   Expected Output: 23
4. queries = [25, 30, 2, 1]
   Expected Output: 32
5. queries = [1, 1, 1, 1, 1]
   Expected Output: 10

Solution Approaches:
1. Greedy Solution: O(nlog(n)) time | O(1) space
   - Sort the queries in ascending order
   - Calculate waiting time for each query based on previous queries
   - Sum up all waiting times
*/

function minimumWaitingTime(queries) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        queries: [3, 2, 1, 2, 6],
        expected: 17
    },
    {
        queries: [2, 1, 1, 1],
        expected: 6
    },
    {
        queries: [1, 2, 4, 5, 2, 1],
        expected: 23
    },
    {
        queries: [25, 30, 2, 1],
        expected: 32
    },
    {
        queries: [1, 1, 1, 1, 1],
        expected: 10
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = minimumWaitingTime([...testCase.queries]); // Create a copy to avoid modifying original array
        console.log(`Test Case ${index + 1}:`);
        console.log(`Queries: [${testCase.queries}]`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
