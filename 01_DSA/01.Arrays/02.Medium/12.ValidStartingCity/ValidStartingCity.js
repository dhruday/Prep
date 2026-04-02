/*
Valid Starting City

Problem Statement:
Imagine you have a set of cities that are laid out in a circle, connected by a circular road that runs clockwise.
Each city has a gas station that provides gallons of fuel, and each city is some distance away from the next city.

You have a car that can drive some number of miles per gallon of fuel, and your goal is to pick a starting city
such that you can fill up your car with that city's fuel, drive to the next city, refill up your car with that
city's fuel, drive to the next city, and so on and so forth until you return back to the starting city with 0 or
more gallons of fuel left in your tank.

This city must be valid in the sense that you must be able to complete this journey. Write a function that returns
the index of the valid starting city.

Note:
- You can assume there will always be exactly one valid starting city.
- When you fill up your car with fuel, you can only fill it up with all the fuel from that city's station.
- You begin the journey with a 0 gallons of fuel in your car's tank.

Sample Input:
distances = [5, 25, 15, 10, 15]        // The distances between each pair of cities
fuel = [1, 2, 1, 0, 3]                 // The fuel available at each city
mpg = 10                               // Miles per gallon that the car can drive

Sample Output:
4 // City 4 is the valid starting city

Test Cases:
1. distances = [5, 25, 15, 10, 15], fuel = [1, 2, 1, 0, 3], mpg = 10
   Expected Output: 4

2. distances = [10, 20, 10], fuel = [2, 3, 1], mpg = 5
   Expected Output: 1

3. distances = [30, 25, 5, 100, 40], fuel = [3, 2, 1, 0, 4], mpg = 20
   Expected Output: 4

4. distances = [1, 3, 10, 6, 7, 3, 1], fuel = [1, 1, 1, 1, 1, 1, 1], mpg = 5
   Expected Output: 6

5. distances = [5, 2, 3], fuel = [1, 0, 1], mpg = 5
   Expected Output: 2

Solution Approaches:
1. Greedy Solution: O(n) time | O(1) space
   - Find city with minimum fuel after traveling from first city
   - That city's next city is the valid starting city
*/

function validStartingCity(distances, fuel, mpg) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        distances: [5, 25, 15, 10, 15],
        fuel: [1, 2, 1, 0, 3],
        mpg: 10,
        expected: 4
    },
    {
        distances: [10, 20, 10],
        fuel: [2, 3, 1],
        mpg: 5,
        expected: 1
    },
    {
        distances: [30, 25, 5, 100, 40],
        fuel: [3, 2, 1, 0, 4],
        mpg: 20,
        expected: 4
    },
    {
        distances: [1, 3, 10, 6, 7, 3, 1],
        fuel: [1, 1, 1, 1, 1, 1, 1],
        mpg: 5,
        expected: 6
    },
    {
        distances: [5, 2, 3],
        fuel: [1, 0, 1],
        mpg: 5,
        expected: 2
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = validStartingCity([...testCase.distances], [...testCase.fuel], testCase.mpg);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Distances: [${testCase.distances}]`);
        console.log(`Fuel: [${testCase.fuel}]`);
        console.log(`MPG: ${testCase.mpg}`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
