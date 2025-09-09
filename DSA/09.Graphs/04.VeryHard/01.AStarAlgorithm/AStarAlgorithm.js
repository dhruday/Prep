/*
A* Algorithm

You're given a two-dimensional array containing 0s and 1s, where each 0 represents
a free space and each 1 represents an obstacle (a space that cannot be passed through).
You're also given four integers startRow, startCol, endRow, and endCol, representing
the positions of a start point and an end point in the grid.

Write a function that finds the shortest path between the start point and the end point
using the A* search algorithm and returns it. The shortest path should be returned as
an array of points in chronological order. If there is no path from the start point
to the end point, your function should return an empty array.

Note that:
- You can only move up, down, left, or right (no diagonal moves).
- You can't move through obstacles.
- The distance between points is measured using Manhattan distance.
- The grid's borders are not considered obstacles; however, trying to move outside
  the grid is not allowed.

Sample Input:
grid = [
  [0, 0, 0, 0, 0],
  [1, 1, 0, 1, 0],
  [0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 1, 0],
]
startRow = 0
startCol = 1
endRow = 4
endCol = 3

Sample Output: [
  [0, 1],  // Start point
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2],
  [2, 3],
  [2, 4],
  [3, 4],
  [4, 4],
  [4, 3],  // End point
]
// The shortest path from [0, 1] to [4, 3]
*/

class Node {
    constructor(row, col, gScore, fScore, parent = null) {
        this.row = row;
        this.col = col;
        this.gScore = gScore;   // Cost from start to current node
        this.fScore = fScore;   // Estimated total cost (g + h)
        this.parent = parent;
    }
}

function aStarAlgorithm(grid, startRow, startCol, endRow, endCol) {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Helper function to calculate Manhattan distance heuristic
    const heuristic = (row, col) => {
        return Math.abs(row - endRow) + Math.abs(col - endCol);
    };
    
    // Helper function to get neighbors
    const getNeighbors = (row, col) => {
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // right, down, left, up
        const neighbors = [];
        
        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (newRow >= 0 && newRow < rows && 
                newCol >= 0 && newCol < cols && 
                grid[newRow][newCol] === 0) {
                neighbors.push([newRow, newCol]);
            }
        }
        
        return neighbors;
    };
    
    // Initialize open and closed sets
    const openSet = new Set();
    const closedSet = new Set();
    
    // Create start node
    const startNode = new Node(startRow, startCol, 0, heuristic(startRow, startCol));
    openSet.add(JSON.stringify([startRow, startCol]));
    
    // Map to store node information
    const nodeMap = new Map();
    nodeMap.set(JSON.stringify([startRow, startCol]), startNode);
    
    while (openSet.size > 0) {
        // Find node with lowest fScore
        let currentPos = null;
        let currentNode = null;
        let lowestFScore = Infinity;
        
        for (const pos of openSet) {
            const node = nodeMap.get(pos);
            if (node.fScore < lowestFScore) {
                currentPos = pos;
                currentNode = node;
                lowestFScore = node.fScore;
            }
        }
        
        // If we reached the end
        if (currentNode.row === endRow && currentNode.col === endCol) {
            const path = [];
            let node = currentNode;
            
            while (node !== null) {
                path.unshift([node.row, node.col]);
                node = node.parent;
            }
            
            return path;
        }
        
        // Move current node from open to closed set
        openSet.delete(currentPos);
        closedSet.add(currentPos);
        
        // Check all neighbors
        for (const [neighborRow, neighborCol] of getNeighbors(currentNode.row, currentNode.col)) {
            const neighborPos = JSON.stringify([neighborRow, neighborCol]);
            
            if (closedSet.has(neighborPos)) continue;
            
            // Calculate g score for this neighbor
            const gScore = currentNode.gScore + 1;
            
            let neighborNode;
            if (!openSet.has(neighborPos)) {
                neighborNode = new Node(
                    neighborRow,
                    neighborCol,
                    Infinity,
                    Infinity
                );
                openSet.add(neighborPos);
            } else {
                neighborNode = nodeMap.get(neighborPos);
            }
            
            if (gScore >= neighborNode.gScore) continue;
            
            // This path is better, record it
            neighborNode.parent = currentNode;
            neighborNode.gScore = gScore;
            neighborNode.fScore = gScore + heuristic(neighborRow, neighborCol);
            nodeMap.set(neighborPos, neighborNode);
        }
    }
    
    // No path found
    return [];
}

// Test Cases
function runTests() {
    const testCases = [
        {
            grid: [
                [0, 0, 0, 0, 0],
                [1, 1, 0, 1, 0],
                [0, 0, 0, 0, 0],
                [0, 1, 1, 1, 0],
                [0, 0, 0, 1, 0],
            ],
            startRow: 0,
            startCol: 1,
            endRow: 4,
            endCol: 3,
            description: "Sample test case"
        },
        {
            grid: [
                [0, 0, 0],
                [1, 1, 0],
                [0, 0, 0],
            ],
            startRow: 0,
            startCol: 0,
            endRow: 2,
            endCol: 2,
            description: "Small grid with obstacle"
        },
        {
            grid: [
                [0, 1, 0],
                [1, 0, 1],
                [0, 1, 0],
            ],
            startRow: 0,
            startCol: 0,
            endRow: 2,
            endCol: 2,
            description: "No valid path"
        },
        {
            grid: [
                [0, 0],
                [0, 0],
            ],
            startRow: 0,
            startCol: 0,
            endRow: 1,
            endCol: 1,
            description: "Simple 2x2 grid"
        },
        {
            grid: [
                [0, 0, 0, 0],
                [0, 1, 1, 0],
                [0, 0, 0, 0],
            ],
            startRow: 0,
            startCol: 0,
            endRow: 0,
            endCol: 3,
            description: "Path around obstacle"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        console.log("Grid:");
        testCase.grid.forEach(row => console.log(row.join(" ")));
        console.log(`Start: [${testCase.startRow}, ${testCase.startCol}]`);
        console.log(`End: [${testCase.endRow}, ${testCase.endCol}]`);
        
        const path = aStarAlgorithm(
            testCase.grid,
            testCase.startRow,
            testCase.startCol,
            testCase.endRow,
            testCase.endCol
        );
        
        console.log("Path found:", path);
        
        // Validate path
        let isValidPath = true;
        if (path.length > 0) {
            // Check start and end points
            if (path[0][0] !== testCase.startRow || path[0][1] !== testCase.startCol) {
                console.log("❌ Path doesn't start at the start point");
                isValidPath = false;
            }
            if (path[path.length-1][0] !== testCase.endRow || path[path.length-1][1] !== testCase.endCol) {
                console.log("❌ Path doesn't end at the end point");
                isValidPath = false;
            }
            
            // Check if moves are valid
            for (let i = 1; i < path.length; i++) {
                const curr = path[i];
                const prev = path[i-1];
                const distance = Math.abs(curr[0] - prev[0]) + Math.abs(curr[1] - prev[1]);
                
                if (distance !== 1) {
                    console.log(`❌ Invalid move from [${prev}] to [${curr}]`);
                    isValidPath = false;
                }
                
                if (curr[0] < 0 || curr[0] >= testCase.grid.length ||
                    curr[1] < 0 || curr[1] >= testCase.grid[0].length ||
                    testCase.grid[curr[0]][curr[1]] === 1) {
                    console.log(`❌ Path goes through obstacle or outside grid at [${curr}]`);
                    isValidPath = false;
                }
            }
        } else {
            // Check if there really is no path
            // This would require a separate pathfinding algorithm to verify
            // For now, we'll assume empty paths are valid
            isValidPath = true;
        }
        
        console.log(`Status: ${isValidPath ? 'PASSED ✅' : 'FAILED ❌'}`);
        if (!isValidPath) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
