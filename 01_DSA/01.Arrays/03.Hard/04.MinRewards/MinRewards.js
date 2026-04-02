/*
Min Rewards

Problem Statement:
Imagine that you're a teacher who's just graded the final exam in a class. You have a list of student
scores on the final exam in a particular order (not necessarily sorted), and you want to reward your
students. You decide to do so fairly by giving them arbitrary rewards following two rules:

1. All students must receive at least one reward.
2. Any given student must receive strictly more rewards than an adjacent student (a student immediately
   to the left or right) with a lower score and must receive strictly fewer rewards than an adjacent
   student with a higher score.

Write a function that takes in a list of scores and returns the minimum number of rewards that you must
give out to students to satisfy the two rules.

You can assume that all students have different scores; in other words, the scores are all unique.

Sample Input:
scores = [8, 4, 2, 1, 3, 6, 7, 9, 5]

Sample Output:
25 // you would give out the following rewards: [4, 3, 2, 1, 2, 3, 4, 5, 1]

Test Cases:
1. scores = [8, 4, 2, 1, 3, 6, 7, 9, 5]
   Expected Output: 25

2. scores = [1]
   Expected Output: 1

3. scores = [2, 1]
   Expected Output: 3

4. scores = [1, 2, 3, 4, 5]
   Expected Output: 15

5. scores = [5, 4, 3, 2, 1]
   Expected Output: 15

Solution Approaches:
1. Naive Approach: O(n²) time | O(n) space
   - Initialize all rewards to 1
   - Keep iterating until rules are satisfied
   - Update rewards based on neighbors

2. Two Pass Approach: O(n) time | O(n) space
   - Find local mins
   - Expand around local mins
   - Take maximum of left and right expansions
*/

function minRewards(scores) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        scores: [8, 4, 2, 1, 3, 6, 7, 9, 5],
        expected: 25
    },
    {
        scores: [1],
        expected: 1
    },
    {
        scores: [2, 1],
        expected: 3
    },
    {
        scores: [1, 2, 3, 4, 5],
        expected: 15
    },
    {
        scores: [5, 4, 3, 2, 1],
        expected: 15
    },
    {
        scores: [2, 20, 13, 12, 11, 8, 4, 3, 1, 5, 6, 7, 9, 0],
        expected: 52
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = minRewards([...testCase.scores]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Scores: [${testCase.scores}]`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
