/*
Apartment Hunting

Problem Statement:
You're looking to move into a new apartment on specific street, and you're given a list of contiguous
blocks on that street where each block contains an apartment that you could move into.

You also have a list of requirements: a list of buildings that are important to you. For instance,
you might value having a school and a gym near your apartment. The list of blocks that you're given
contains information at every block about all of the buildings that are present and absent at the
block in question. For instance, for every block, you might know whether a school, a pool, an office,
and a gym are present.

Write a function that takes in a list of contiguous blocks on a specific street and a list of your
required buildings and that returns the location (the index) of the block that's most optimal for you
to live in. The most optimal block is the one where the maximum distance that you'd have to walk to
reach any of your required buildings is minimized.

Each block in the list of blocks is represented by a hash map of building types and their presence at
the block in question. The hash map contains 0s and 1s, where 0 means a building type isn't present
and 1 means it is. A block where a gym and a school are present but a pool isn't would be represented
by {"gym": 1, "school": 1, "pool": 0}.

Sample Input:
blocks = [
  {
    "gym": 0,
    "school": 1,
    "store": 0,
  },
  {
    "gym": 1,
    "school": 0,
    "store": 0,
  },
  {
    "gym": 1,
    "school": 1,
    "store": 0,
  },
  {
    "gym": 0,
    "school": 1,
    "store": 0,
  },
  {
    "gym": 0,
    "school": 0,
    "store": 1,
  },
]
reqs = ["gym", "school", "store"]

Sample Output:
3  // at index 3, the farthest you'd have to walk to reach a gym is 1 block, a school is 0 blocks,
   // and a store is 1 block. At any other index, you'd have to walk farther.

Test Cases:
1. blocks = [
     {"gym": 0, "school": 1, "store": 0},
     {"gym": 1, "school": 0, "store": 0},
     {"gym": 1, "school": 1, "store": 0},
     {"gym": 0, "school": 1, "store": 0},
     {"gym": 0, "school": 0, "store": 1},
   ]
   reqs = ["gym", "school", "store"]
   Expected Output: 3

2. blocks = [
     {"gym": 0, "office": 0, "school": 1},
     {"gym": 1, "office": 0, "school": 0},
     {"gym": 1, "office": 1, "school": 0},
   ]
   reqs = ["gym", "office", "school"]
   Expected Output: 1

3. blocks = [
     {"gym": 1, "pool": 1},
     {"gym": 1, "pool": 0},
     {"gym": 0, "pool": 1},
   ]
   reqs = ["gym", "pool"]
   Expected Output: 0

4. blocks = [
     {"gym": 1, "school": 1},
     {"gym": 0, "school": 0},
     {"gym": 1, "school": 1},
   ]
   reqs = ["gym", "school"]
   Expected Output: 0

5. blocks = [
     {"gym": 1},
     {"gym": 1},
     {"gym": 1},
   ]
   reqs = ["gym"]
   Expected Output: 0

Solution Approaches:
1. Brute Force: O(b² * r) time | O(1) space
   - For each block, check distance to each requirement
   - Track minimum of maximum distances

2. Optimized: O(b * r) time | O(b * r) space
   - Precompute distances for each requirement
   - Find block with minimum maximum distance
*/

function apartmentHunting(blocks, reqs) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        blocks: [
            {"gym": 0, "school": 1, "store": 0},
            {"gym": 1, "school": 0, "store": 0},
            {"gym": 1, "school": 1, "store": 0},
            {"gym": 0, "school": 1, "store": 0},
            {"gym": 0, "school": 0, "store": 1}
        ],
        reqs: ["gym", "school", "store"],
        expected: 3
    },
    {
        blocks: [
            {"gym": 0, "office": 0, "school": 1},
            {"gym": 1, "office": 0, "school": 0},
            {"gym": 1, "office": 1, "school": 0}
        ],
        reqs: ["gym", "office", "school"],
        expected: 1
    },
    {
        blocks: [
            {"gym": 1, "pool": 1},
            {"gym": 1, "pool": 0},
            {"gym": 0, "pool": 1}
        ],
        reqs: ["gym", "pool"],
        expected: 0
    },
    {
        blocks: [
            {"gym": 1, "school": 1},
            {"gym": 0, "school": 0},
            {"gym": 1, "school": 1}
        ],
        reqs: ["gym", "school"],
        expected: 0
    },
    {
        blocks: [
            {"gym": 1},
            {"gym": 1},
            {"gym": 1}
        ],
        reqs: ["gym"],
        expected: 0
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = apartmentHunting(
            JSON.parse(JSON.stringify(testCase.blocks)),
            [...testCase.reqs]
        );
        console.log(`Test Case ${index + 1}:`);
        console.log('Blocks:');
        testCase.blocks.forEach((block, i) => {
            console.log(`  ${i}: ${JSON.stringify(block)}`);
        });
        console.log(`Requirements: [${testCase.reqs}]`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
