/*
Class Photos

Problem Statement:
It's photo day at the local school, and you're the photographer assigned to take class photos. The class that
you'll be photographing has an even number of students, and all these students are wearing red or blue shirts.
In fact, exactly half of the class is wearing red shirts, and the other half is wearing blue shirts.

You're responsible for arranging the students in two rows before taking the photo. Each row should contain
the same number of students and should adhere to the following guidelines:

1. All students wearing red shirts must be in the same row
2. All students wearing blue shirts must be in the same row
3. Each student in the back row must be strictly taller than the student directly in front of them in the front row

You're given two input arrays: one containing the heights of all the students with red shirts and another one
containing the heights of all the students with blue shirts. These arrays will always have the same length, and
each height will be a positive integer.

Write a function that returns whether or not a class photo that follows the stated guidelines can be taken.

Note: You can assume that each class has at least 2 students.

Sample Input:
redShirtHeights = [5, 8, 1, 3, 4]
blueShirtHeights = [6, 9, 2, 4, 5]

Sample Output:
true
// Place all students with blue shirts in the back row

Test Cases:
1. redShirtHeights = [5, 8, 1, 3, 4], blueShirtHeights = [6, 9, 2, 4, 5]
   Expected Output: true

2. redShirtHeights = [6, 9, 2, 4, 5], blueShirtHeights = [5, 8, 1, 3, 4]
   Expected Output: true

3. redShirtHeights = [5, 8, 1, 3, 4], blueShirtHeights = [4, 5, 8, 1, 2]
   Expected Output: false

4. redShirtHeights = [6], blueShirtHeights = [6]
   Expected Output: false

5. redShirtHeights = [5, 6], blueShirtHeights = [5, 4]
   Expected Output: true

Solution Approaches:
1. Greedy Solution: O(nlog(n)) time | O(1) space
   - Sort both arrays in descending order
   - Compare each position to ensure one color is always taller
   - If any position violates the rule, return false
*/

function classPhotos(redShirtHeights, blueShirtHeights) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        redShirtHeights: [5, 8, 1, 3, 4],
        blueShirtHeights: [6, 9, 2, 4, 5],
        expected: true
    },
    {
        redShirtHeights: [6, 9, 2, 4, 5],
        blueShirtHeights: [5, 8, 1, 3, 4],
        expected: true
    },
    {
        redShirtHeights: [5, 8, 1, 3, 4],
        blueShirtHeights: [4, 5, 8, 1, 2],
        expected: false
    },
    {
        redShirtHeights: [6],
        blueShirtHeights: [6],
        expected: false
    },
    {
        redShirtHeights: [5, 6],
        blueShirtHeights: [5, 4],
        expected: true
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = classPhotos([...testCase.redShirtHeights], [...testCase.blueShirtHeights]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Red Shirt Heights: [${testCase.redShirtHeights}]`);
        console.log(`Blue Shirt Heights: [${testCase.blueShirtHeights}]`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
