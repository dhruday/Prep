/*
Airport Connections

For this problem, you're given a list of airports (three-letter codes like "JFK"),
a list of routes (one-way flights from one airport to another like ["JFK", "SFO"]),
and a starting airport.

Write a function that returns the minimum number of airport connections (one-way
flights) that need to be added in order for someone to be able to reach any
airport in the list, starting at the starting airport. Note that routes only allow
you to fly in one direction; for instance, the route ["JFK", "SFO"] only allows
you to fly from "JFK" to "SFO".

In other words, write a function that returns the minimum number of new connections
that need to be added to make all airports reachable from the starting airport.

Sample Input:
airports = [
  "BGI", "CDG", "DEL", "DOH", "DSM", "EWR", "EYW", "HND", "ICN",
  "JFK", "LGA", "LHR", "ORD", "SAN", "SFO", "SIN", "TLV", "BUD",
]

startingAirport = "LGA"

routes = [
  ["DSM", "ORD"],
  ["ORD", "BGI"],
  ["BGI", "LGA"],
  ["SIN", "CDG"],
  ["CDG", "SIN"],
  ["CDG", "BUD"],
  ["DEL", "DOH"],
  ["DEL", "CDG"],
  ["TLV", "DEL"],
  ["EWR", "HND"],
  ["HND", "ICN"],
  ["HND", "JFK"],
  ["ICN", "JFK"],
  ["JFK", "LGA"],
  ["EYW", "LHR"],
  ["LHR", "SFO"],
  ["SFO", "SAN"],
  ["SFO", "DSM"],
  ["SAN", "EYW"],
]

Sample Output:
3
// ["LGA", "TLV"], ["LGA", "SFO"], and ["LGA", "EWR"] are new connections
*/

function airportConnections(airports, routes, startingAirport) {
    // Create adjacency list of airports
    const graph = {};
    airports.forEach(airport => {
        graph[airport] = [];
    });
    
    routes.forEach(([from, to]) => {
        graph[from].push(to);
    });
    
    // Find all unreachable airports from starting airport
    const unreachable = getUnreachableAirports(airports, graph, startingAirport);
    if (unreachable.length === 0) return 0;
    
    // Get information about each unreachable airport
    const airportNodes = getAirportNodesInfo(airports, graph, unreachable);
    
    // Sort unreachable airports by number of other unreachable airports they can reach
    const sortedUnreachable = airportNodes
        .filter(node => unreachable.includes(node.airport))
        .sort((a, b) => b.unreachableConnections.size - a.unreachableConnections.size);
    
    return getMinNewConnections(sortedUnreachable);
}

function getUnreachableAirports(airports, graph, startingAirport) {
    const reachable = new Set();
    const visited = new Set();
    
    function dfs(airport) {
        if (visited.has(airport)) return;
        visited.add(airport);
        reachable.add(airport);
        
        for (const connection of graph[airport]) {
            dfs(connection);
        }
    }
    
    dfs(startingAirport);
    
    return airports.filter(airport => !reachable.has(airport));
}

function getAirportNodesInfo(airports, graph, unreachable) {
    const unreachableSet = new Set(unreachable);
    const airportNodes = [];
    
    for (const airport of airports) {
        const isUnreachable = unreachableSet.has(airport);
        const connections = new Set();
        const visited = new Set();
        
        depthFirstTraverseNodes(airport, airport, graph, unreachableSet, connections, visited);
        
        airportNodes.push({
            airport,
            isReachable: !isUnreachable,
            unreachableConnections: connections,
            connections: graph[airport]
        });
    }
    
    return airportNodes;
}

function depthFirstTraverseNodes(airport, currentAirport, graph, unreachableSet, 
    connections, visited) {
    if (visited.has(currentAirport)) return;
    visited.add(currentAirport);
    
    if (currentAirport !== airport && unreachableSet.has(currentAirport)) {
        connections.add(currentAirport);
    }
    
    for (const connection of graph[currentAirport]) {
        depthFirstTraverseNodes(airport, connection, graph, unreachableSet, connections, visited);
    }
}

function getMinNewConnections(sortedUnreachable) {
    const remainingUnreachable = new Set(
        sortedUnreachable.map(node => node.airport)
    );
    let connections = 0;
    
    for (const node of sortedUnreachable) {
        if (!remainingUnreachable.has(node.airport)) continue;
        connections++;
        remainingUnreachable.delete(node.airport);
        
        for (const connection of node.unreachableConnections) {
            remainingUnreachable.delete(connection);
        }
    }
    
    return connections;
}

// Test Cases
function runTests() {
    const testCases = [
        {
            airports: [
                "BGI", "CDG", "DEL", "DOH", "DSM", "EWR", "EYW", "HND", "ICN",
                "JFK", "LGA", "LHR", "ORD", "SAN", "SFO", "SIN", "TLV", "BUD"
            ],
            routes: [
                ["DSM", "ORD"],
                ["ORD", "BGI"],
                ["BGI", "LGA"],
                ["SIN", "CDG"],
                ["CDG", "SIN"],
                ["CDG", "BUD"],
                ["DEL", "DOH"],
                ["DEL", "CDG"],
                ["TLV", "DEL"],
                ["EWR", "HND"],
                ["HND", "ICN"],
                ["HND", "JFK"],
                ["ICN", "JFK"],
                ["JFK", "LGA"],
                ["EYW", "LHR"],
                ["LHR", "SFO"],
                ["SFO", "SAN"],
                ["SFO", "DSM"],
                ["SAN", "EYW"]
            ],
            startingAirport: "LGA",
            expected: 3,
            description: "Sample test case"
        },
        {
            airports: ["A", "B", "C"],
            routes: [["A", "B"]],
            startingAirport: "A",
            expected: 1,
            description: "Simple case with three airports"
        },
        {
            airports: ["A", "B", "C", "D"],
            routes: [
                ["A", "B"],
                ["B", "C"],
                ["C", "D"],
                ["D", "A"]
            ],
            startingAirport: "A",
            expected: 0,
            description: "Circular route - no new connections needed"
        },
        {
            airports: ["A", "B", "C", "D"],
            routes: [],
            startingAirport: "A",
            expected: 3,
            description: "No existing routes"
        },
        {
            airports: ["A", "B", "C", "D", "E"],
            routes: [
                ["A", "B"],
                ["C", "D"],
                ["D", "E"]
            ],
            startingAirport: "A",
            expected: 1,
            description: "Two separate connected components"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        console.log("Airports:", testCase.airports);
        console.log("Starting Airport:", testCase.startingAirport);
        console.log("Routes:", testCase.routes);
        
        const result = airportConnections(
            testCase.airports,
            testCase.routes,
            testCase.startingAirport
        );
        
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
