/*
Topological Sort

Problem Statement:
You're given a list of arbitrary jobs that need to be completed; these jobs are
represented by distinct integers. You're also given a list of dependencies. A
dependency is represented as a pair of jobs where the first job is a prerequisite
of the second job. In other words, the second job depends on the first one; it can
only be completed once the first job is completed.

Write a function that takes in a list of jobs and a list of dependencies and returns
a valid order in which the jobs can be completed. If no such order exists, the
function should return an empty array.

Sample Input:
jobs = [1, 2, 3, 4]
deps = [[1, 2], [1, 3], [3, 2], [4, 2], [4, 3]]

Sample Output:
[1, 4, 3, 2] or [4, 1, 3, 2]
// Both are valid topological orderings

Note: The output array should contain all the jobs.

Constraints:
- jobs will be an array of distinct positive integers
- deps will be an array of pairs of integers contained in jobs
- The graph represented by jobs and deps will not contain cycles
*/

function topologicalSort(jobs, deps) {
    // Build adjacency list and in-degree count
    const graph = {};
    const inDegree = {};
    
    // Initialize graph and inDegree for all jobs
    jobs.forEach(job => {
        graph[job] = [];
        inDegree[job] = 0;
    });
    
    // Build the graph and count in-degrees
    deps.forEach(([prereq, job]) => {
        graph[prereq].push(job);
        inDegree[job]++;
    });
    
    // Find all nodes with no prerequisites (in-degree = 0)
    const queue = jobs.filter(job => inDegree[job] === 0);
    const result = [];
    
    // Process the queue
    while (queue.length > 0) {
        const current = queue.shift();
        result.push(current);
        
        // Decrease in-degree of all neighbors
        for (const neighbor of graph[current]) {
            inDegree[neighbor]--;
            
            // If a node has no more prerequisites, add it to the queue
            if (inDegree[neighbor] === 0) {
                queue.push(neighbor);
            }
        }
    }
    
    // If result doesn't include all jobs, there must be a cycle
    return result.length === jobs.length ? result : [];
}

// Helper function to check if result is valid
function isValidOrder(jobs, deps, result) {
    // Check if all jobs are included
    if (!jobs.every(job => result.includes(job))) return false;
    
    // Check if result has correct length
    if (result.length !== jobs.length) return false;
    
    // Create a map of job positions in result
    const positions = {};
    result.forEach((job, index) => {
        positions[job] = index;
    });
    
    // Check if all dependencies are satisfied
    return deps.every(([prereq, job]) => positions[prereq] < positions[job]);
}

// Test Cases
function runTests() {
    const testCases = [
        {
            jobs: [1, 2, 3, 4],
            deps: [[1, 2], [1, 3], [3, 2], [4, 2], [4, 3]],
            possibleResults: [[1, 4, 3, 2], [4, 1, 3, 2]],
            description: "Sample test case"
        },
        {
            jobs: [1, 2],
            deps: [],
            possibleResults: [[1, 2], [2, 1]],
            description: "No dependencies"
        },
        {
            jobs: [1, 2, 3, 4],
            deps: [[1, 2], [2, 3], [3, 4]],
            possibleResults: [[1, 2, 3, 4]],
            description: "Linear dependencies"
        },
        {
            jobs: [1, 2, 3, 4],
            deps: [[1, 2], [2, 3], [3, 4], [4, 2]],
            possibleResults: [],
            description: "Cyclic dependencies"
        },
        {
            jobs: [1],
            deps: [],
            possibleResults: [[1]],
            description: "Single job"
        },
        {
            jobs: [1, 2, 3, 4, 5],
            deps: [[1, 3], [2, 3], [3, 4], [4, 5]],
            possibleResults: [[1, 2, 3, 4, 5], [2, 1, 3, 4, 5]],
            description: "Multiple valid orderings"
        },
        {
            jobs: [1, 2, 3, 4, 5, 6],
            deps: [[1, 2], [2, 3], [4, 5], [5, 6]],
            possibleResults: null, // Multiple valid orderings
            description: "Independent components"
        },
        {
            jobs: [1, 2, 3, 4],
            deps: [[1, 2], [1, 3], [1, 4]],
            possibleResults: null, // Multiple valid orderings
            description: "Star dependencies"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Get topological ordering
        const result = topologicalSort(testCase.jobs, testCase.deps);
        
        // For test cases with multiple possible valid orderings
        let passed;
        if (testCase.possibleResults === null) {
            // Just check if it's a valid ordering
            passed = isValidOrder(testCase.jobs, testCase.deps, result);
        } else if (testCase.possibleResults.length === 0) {
            // Check if result is empty for impossible cases
            passed = result.length === 0;
        } else {
            // Check if result matches any of the possible results
            passed = testCase.possibleResults.some(
                possible => JSON.stringify(possible) === JSON.stringify(result)
            );
        }
        
        console.log("Input:");
        console.log(`  Jobs: ${JSON.stringify(testCase.jobs)}`);
        console.log(`  Dependencies: ${JSON.stringify(testCase.deps)}`);
        if (testCase.possibleResults === null) {
            console.log("Expected: Any valid topological ordering");
        } else {
            console.log(`Expected: ${JSON.stringify(testCase.possibleResults)}`);
        }
        console.log(`Actual: ${JSON.stringify(result)}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) {
            if (!isValidOrder(testCase.jobs, testCase.deps, result)) {
                console.log("  Failed: Result is not a valid topological ordering");
            }
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
