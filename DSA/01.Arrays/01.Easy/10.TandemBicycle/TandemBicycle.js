/*
Tandem Bicycle

Problem Statement:
A tandem bicycle is a bicycle that's operated by two people: person A and person B. Both people pedal the bicycle,
but the person that pedals faster dictates the speed of the bicycle. So if person A pedals at a speed of 5,
and person B pedals at a speed of 4, the tandem bicycle moves at a speed of 5 (i.e., tandemSpeed = max(speedA, speedB)).

You're given two lists of positive integers: one that contains the speeds of riders wearing red shirts
and one that contains the speeds of riders wearing blue shirts. Each rider is represented by a single
positive integer, which is the speed that they pedal a tandem bicycle at. Both lists have the same length,
meaning that there are as many red-shirt riders as there are blue-shirt riders.

Your goal is to pair every rider wearing a red shirt with a rider wearing a blue shirt to operate a tandem bicycle.

Write a function that returns the maximum possible total speed or the minimum possible total speed of all of the
tandem bicycles being ridden based on an input parameter, fastest. If fastest = true, your function should return
the maximum possible total speed; otherwise it should return the minimum possible total speed.

Sample Input:
redShirtSpeeds = [5, 5, 3, 9, 2]
blueShirtSpeeds = [3, 6, 7, 2, 1]
fastest = true

Sample Output:
32
// If fastest = true:
// [5, 3], [5, 6], [3, 7], [9, 2], [2, 1] => max(5,3) + max(5,6) + max(3,7) + max(9,2) + max(2,1) = 5 + 6 + 7 + 9 + 2 = 32

Test Cases:
1. redShirtSpeeds = [5, 5, 3, 9, 2], blueShirtSpeeds = [3, 6, 7, 2, 1], fastest = true
   Expected Output: 32

2. redShirtSpeeds = [5, 5, 3, 9, 2], blueShirtSpeeds = [3, 6, 7, 2, 1], fastest = false
   Expected Output: 25

3. redShirtSpeeds = [1, 2, 1, 9, 12, 3], blueShirtSpeeds = [3, 3, 4, 6, 1, 2], fastest = true
   Expected Output: 37

4. redShirtSpeeds = [1, 2, 1, 9, 12, 3], blueShirtSpeeds = [3, 3, 4, 6, 1, 2], fastest = false
   Expected Output: 30

5. redShirtSpeeds = [1], blueShirtSpeeds = [5], fastest = true
   Expected Output: 5

Solution Approaches:
1. Greedy Solution: O(nlog(n)) time | O(1) space
   - Sort both arrays
   - If fastest is true:
     * Match fastest with fastest to maximize speed
   - If fastest is false:
     * Match fastest with slowest to minimize speed
*/

function tandemBicycle(redShirtSpeeds, blueShirtSpeeds, fastest) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        redShirtSpeeds: [5, 5, 3, 9, 2],
        blueShirtSpeeds: [3, 6, 7, 2, 1],
        fastest: true,
        expected: 32
    },
    {
        redShirtSpeeds: [5, 5, 3, 9, 2],
        blueShirtSpeeds: [3, 6, 7, 2, 1],
        fastest: false,
        expected: 25
    },
    {
        redShirtSpeeds: [1, 2, 1, 9, 12, 3],
        blueShirtSpeeds: [3, 3, 4, 6, 1, 2],
        fastest: true,
        expected: 37
    },
    {
        redShirtSpeeds: [1, 2, 1, 9, 12, 3],
        blueShirtSpeeds: [3, 3, 4, 6, 1, 2],
        fastest: false,
        expected: 30
    },
    {
        redShirtSpeeds: [1],
        blueShirtSpeeds: [5],
        fastest: true,
        expected: 5
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = tandemBicycle(
            [...testCase.redShirtSpeeds],
            [...testCase.blueShirtSpeeds],
            testCase.fastest
        );
        console.log(`Test Case ${index + 1}:`);
        console.log(`Red Shirt Speeds: [${testCase.redShirtSpeeds}]`);
        console.log(`Blue Shirt Speeds: [${testCase.blueShirtSpeeds}]`);
        console.log(`Fastest: ${testCase.fastest}`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
