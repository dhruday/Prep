/*
Tournament Winner

Problem Statement:
There's an algorithms tournament taking place in which teams of programmers compete against each other to solve algorithmic problems as fast as possible.
Teams compete in a round robin, where each team faces off against all other teams. Only two teams compete against each other at a time, and for each competition,
one team is designated the home team, while the other team is the away team. In each competition there's always one winner and one loser; there are no ties.
A team receives 3 points if it wins and 0 points if it loses. The winner of the tournament is the team that receives the most amount of points.

Given an array of pairs representing the teams that have competed against each other and an array containing the results of each competition, write a function
that returns the winner of the tournament. The input arrays are named competitions and results, respectively.

The competitions array has elements in the form of [homeTeam, awayTeam], where each team is a string of at most 30 characters representing the name of the team.
The results array contains information about the winner of each corresponding competition in the competitions array. Specifically, results[i] denotes the winner
of competitions[i], where a 1 in the results array means that the home team in the corresponding competition won and a 0 means that the away team won.

Sample Input:
competitions = [
    ["HTML", "C#"],
    ["C#", "Python"],
    ["Python", "HTML"]
]
results = [0, 0, 1]

Sample Output:
"Python"
// C# beats HTML, Python beats C#, and Python beats HTML.
// HTML - 0 points 
// C# - 3 points
// Python - 6 points

Test Cases:
1. competitions = [["HTML", "C#"], ["C#", "Python"], ["Python", "HTML"]]
   results = [0, 0, 1]
   Expected Output: "Python"

2. competitions = [["HTML", "Java"], ["Java", "Python"], ["Python", "HTML"]]
   results = [0, 1, 1]
   Expected Output: "Java"

3. competitions = [["A", "B"], ["B", "C"], ["C", "A"]]
   results = [0, 1, 0]
   Expected Output: "B"

4. competitions = [["A", "B"], ["B", "C"], ["C", "A"], ["A", "D"], ["D", "B"], ["C", "D"]]
   results = [1, 1, 0, 1, 0, 1]
   Expected Output: "A"

Solution Approaches:
1. Hash Table: O(n) time | O(k) space, where n is the number of competitions and k is the number of teams
   - Use a hash table to keep track of team scores
   - Update scores based on competition results
   - Track current best team while updating scores
*/

function tournamentWinner(competitions, results) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        competitions: [["HTML", "C#"], ["C#", "Python"], ["Python", "HTML"]],
        results: [0, 0, 1],
        expected: "Python"
    },
    {
        competitions: [["HTML", "Java"], ["Java", "Python"], ["Python", "HTML"]],
        results: [0, 1, 1],
        expected: "Java"
    },
    {
        competitions: [["A", "B"], ["B", "C"], ["C", "A"]],
        results: [0, 1, 0],
        expected: "B"
    },
    {
        competitions: [["A", "B"], ["B", "C"], ["C", "A"], ["A", "D"], ["D", "B"], ["C", "D"]],
        results: [1, 1, 0, 1, 0, 1],
        expected: "A"
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = tournamentWinner(testCase.competitions, testCase.results);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Competitions: ${JSON.stringify(testCase.competitions)}`);
        console.log(`Results: [${testCase.results}]`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
