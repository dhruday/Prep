/*
Detect Arbitrage

You're given a two-dimensional array (a matrix) of equal height and width that represents exchange rates between currencies. The length of the array is the number of currencies, and each rate represents the exchange rate between two currencies, going from row currency to column currency. A rate of 2 between currencies X and Y means that you can multiply your amount of X by 2 to get your amount of Y.

Write a function that returns whether there's an arbitrage opportunity in the given exchange rates. An arbitrage occurs when you can start with one currency (C1), convert to C2, then C3, and so on until you convert back to C1 and end up with more of it than you started with.

Note that you can only do each currency conversion once, and you must convert back to your starting currency to achieve arbitrage.

Sample Input:
rates = [
  [1.0, 0.8631, 0.5903],
  [1.1586, 1.0, 0.6849],
  [1.6939, 1.4604, 1.0],
]

Sample Output:
true
// There's an arbitrage opportunity:
// - Convert 100 units of currency 0 to 86.31 units of currency 1
// - Convert 86.31 units of currency 1 to 59.116 units of currency 2
// - Convert 59.116 units of currency 2 to 100.13 units of currency 0
// You've ended up with more of currency 0 than you started with
*/

function detectArbitrage(rates) {
    // Convert rates to -log for using Bellman-Ford to detect negative cycles
    const logRates = rates.map(row => 
        row.map(rate => -Math.log(rate))
    );
    
    const n = rates.length;
    const source = 0;
    
    // Initialize distances
    const distances = Array(n).fill(Infinity);
    distances[source] = 0;
    
    // Track path
    const predecessors = Array(n).fill(null);
    
    // Relax edges n-1 times
    for (let i = 0; i < n - 1; i++) {
        for (let source = 0; source < n; source++) {
            for (let dest = 0; dest < n; dest++) {
                if (distances[source] + logRates[source][dest] < distances[dest]) {
                    distances[dest] = distances[source] + logRates[source][dest];
                    predecessors[dest] = source;
                }
            }
        }
    }
    
    // Check for negative weight cycle
    for (let source = 0; source < n; source++) {
        for (let dest = 0; dest < n; dest++) {
            if (distances[source] + logRates[source][dest] < distances[dest]) {
                return true; // Negative cycle exists = arbitrage opportunity
            }
        }
    }
    
    return false;
}

// Test Cases
function runTests() {
    const testCases = [
        {
            rates: [
                [1.0, 0.8631, 0.5903],
                [1.1586, 1.0, 0.6849],
                [1.6939, 1.4604, 1.0],
            ],
            expected: true,
            description: "Sample test case with arbitrage opportunity"
        },
        {
            rates: [
                [1.0, 0.5, 0.25],
                [2.0, 1.0, 0.5],
                [4.0, 2.0, 1.0],
            ],
            expected: false,
            description: "No arbitrage opportunity - balanced rates"
        },
        {
            rates: [
                [1.0, 2.0],
                [0.5, 1.0],
            ],
            expected: false,
            description: "Simple 2x2 matrix without arbitrage"
        },
        {
            rates: [
                [1.0, 2.0],
                [0.6, 1.0],
            ],
            expected: true,
            description: "Simple 2x2 matrix with arbitrage"
        },
        {
            rates: [
                [1.0, 1.0, 1.0],
                [1.0, 1.0, 1.0],
                [1.0, 1.0, 1.0],
            ],
            expected: false,
            description: "All equal rates"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        console.log("Exchange Rates:");
        testCase.rates.forEach(row => {
            console.log("[" + row.map(rate => rate.toFixed(4)).join(", ") + "]");
        });
        
        const result = detectArbitrage(testCase.rates);
        console.log("Expected:", testCase.expected);
        console.log("Got:", result);
        
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) {
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
