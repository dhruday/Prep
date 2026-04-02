/*
Boggle Board

Write a function that takes in a 2D array of potentially unequal height and width
containing letters (the board) and a list of words, and returns an array of all
words contained in the board. A word is constructed by connecting adjacent letters
(horizontally, vertically, or diagonally) without using any single letter at a 
given position more than once. While a word can have repeated letters, those 
repeated letters must come from different positions in the board.

Note that two or more words are allowed to overlap and use the same letters in the
board.

Sample Input:
board = [
  ["t", "h", "i", "s", "i", "s", "a"],
  ["s", "i", "m", "p", "l", "e", "x"],
  ["b", "x", "x", "x", "x", "e", "b"],
  ["x", "o", "g", "g", "l", "x", "o"],
  ["x", "x", "x", "D", "T", "r", "a"],
  ["R", "E", "P", "E", "A", "d", "x"],
  ["x", "x", "x", "x", "x", "x", "x"],
  ["N", "O", "T", "R", "E", "-", "P"],
  ["x", "x", "D", "E", "T", "A", "E"],
]
words = ["this", "is", "not", "a", "simple", "boggle", "board", "test", "REPEATED", "NOTRE-DAME"]

Sample Output:
["this", "is", "a", "simple", "boggle", "board", "NOTRE-DAME", "REPEATED"]
// "test" isn't included in the output because it can't be constructed from the board
// Note: The words in the output can be in any order.

Function Signature:
function boggleBoard(board, words) {
*/

function boggleBoard(board, words) {
    // Create a trie from the words for efficient word lookup
    const trie = new Trie();
    for (const word of words) {
        trie.add(word);
    }
    
    const finalWords = new Set();
    const height = board.length;
    const width = board[0].length;
    
    // Try to find words starting from each position in the board
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            explore(board, i, j, trie.root, new Set(), "", finalWords);
        }
    }
    
    return Array.from(finalWords);
}

class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }
    
    add(word) {
        let node = this.root;
        for (const char of word) {
            if (!(char in node.children)) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEndOfWord = true;
    }
}

function explore(board, i, j, trieNode, visited, wordSoFar, finalWords) {
    // Check boundaries and if position was already visited
    if (i < 0 || i >= board.length || j < 0 || j >= board[0].length) return;
    const pos = i + ',' + j;
    if (visited.has(pos)) return;
    
    const currentChar = board[i][j];
    if (!(currentChar in trieNode.children)) return;
    
    // Add current position to visited set
    visited.add(pos);
    wordSoFar += currentChar;
    trieNode = trieNode.children[currentChar];
    
    // If we've found a complete word, add it to our results
    if (trieNode.isEndOfWord) {
        finalWords.add(wordSoFar);
    }
    
    // Explore all 8 adjacent positions
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [di, dj] of directions) {
        explore(board, i + di, j + dj, trieNode, visited, wordSoFar, finalWords);
    }
    
    // Backtrack by removing current position from visited set
    visited.delete(pos);
}

// Test Cases
function runTests() {
    const testCases = [
        {
            board: [
                ["t", "h", "i", "s", "i", "s", "a"],
                ["s", "i", "m", "p", "l", "e", "x"],
                ["b", "x", "x", "x", "x", "e", "b"],
                ["x", "o", "g", "g", "l", "x", "o"],
                ["x", "x", "x", "D", "T", "r", "a"],
                ["R", "E", "P", "E", "A", "d", "x"],
                ["x", "x", "x", "x", "x", "x", "x"],
                ["N", "O", "T", "R", "E", "-", "P"],
                ["x", "x", "D", "E", "T", "A", "E"]
            ],
            words: ["this", "is", "not", "a", "simple", "boggle", "board", "test", "REPEATED", "NOTRE-DAME"],
            expected: new Set(["this", "is", "a", "simple", "boggle", "board", "NOTRE-DAME", "REPEATED"]),
            description: "Sample test case"
        },
        {
            board: [["a"]],
            words: ["a", "b"],
            expected: new Set(["a"]),
            description: "Single letter board"
        },
        {
            board: [
                ["c", "a", "t"],
                ["r", "r", "e"],
                ["t", "o", "n"]
            ],
            words: ["cat", "rat", "tree", "tone", "car", "core"],
            expected: new Set(["cat", "rat", "tree", "tone", "car"]),
            description: "Small board with multiple words"
        },
        {
            board: [
                ["d", "o", "g"],
                ["c", "a", "t"],
                ["b", "i", "t"]
            ],
            words: ["dog", "cat", "bit", "dots", "tab", "big"],
            expected: new Set(["dog", "cat", "bit", "big"]),
            description: "Diagonal words"
        },
        {
            board: [
                ["a", "b", "c"],
                ["d", "e", "f"],
                ["g", "h", "i"]
            ],
            words: [],
            expected: new Set([]),
            description: "Empty words list"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        console.log("Board:");
        testCase.board.forEach(row => console.log(row.join(" ")));
        console.log("Words to find:", testCase.words);
        
        const result = new Set(boggleBoard(testCase.board, testCase.words));
        console.log("Expected words:", Array.from(testCase.expected));
        console.log("Found words:", Array.from(result));
        
        // Check if the sets are equal
        const setsAreEqual = 
            testCase.expected.size === result.size && 
            Array.from(testCase.expected).every(word => result.has(word));
        
        console.log(`Status: ${setsAreEqual ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!setsAreEqual) {
            console.log("Missing words:", 
                Array.from(testCase.expected).filter(word => !result.has(word)));
            console.log("Extra words:", 
                Array.from(result).filter(word => !testCase.expected.has(word)));
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
