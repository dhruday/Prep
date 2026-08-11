/*
Number of Islands

Problem Statement:
Given a grid of "1" land and "0" water, return the number of orthogonally connected
land regions. Do not mutate the caller's grid.

Solution:
Run iterative DFS from every unvisited land cell. A Set records visited coordinates
so every cell is processed at most once.

Complexity: O(rows × columns) time | O(rows × columns) space
*/

function numberOfIslands(grid) {
    const visited = new Set();
    const key = (row, column) => `${row},${column}`;
    let islands = 0;

    for (let row = 0; row < grid.length; row++) {
        for (let column = 0; column < grid[row].length; column++) {
            if (grid[row][column] !== '1' || visited.has(key(row, column))) continue;
            islands++;
            const stack = [[row, column]];
            visited.add(key(row, column));

            while (stack.length > 0) {
                const [currentRow, currentColumn] = stack.pop();
                for (const [rowOffset, columnOffset] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nextRow = currentRow + rowOffset;
                    const nextColumn = currentColumn + columnOffset;
                    if (nextRow < 0 || nextRow >= grid.length || nextColumn < 0 || nextColumn >= grid[nextRow].length
                        || grid[nextRow][nextColumn] !== '1' || visited.has(key(nextRow, nextColumn))) continue;
                    visited.add(key(nextRow, nextColumn));
                    stack.push([nextRow, nextColumn]);
                }
            }
        }
    }

    return islands;
}

function runTests() {
    const grid = [['1', '1', '0'], ['0', '1', '0'], ['1', '0', '1']];
    const passed = numberOfIslands(grid) === 3 && numberOfIslands([]) === 0;
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { numberOfIslands };
