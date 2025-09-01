// # PRODUCT SUM

// Write a function that takes in a "special" array and returns its product sum.
// A "special" array is a non-empty array that contains either integers or other "special" arrays. The product sum of a "special" array is the sum of its elements, where "special" arrays inside it are summed themselves and then multiplied by their level of depth.
// The depth of a "special" array is how far nested it is. For instance, the depth of [] is 1 ; the depth of the inner array in [[]] is 2 ; the depth of the innermost array in [[[]]] is 3 .
// Therefore, the product sum of [x, y] is x + y ; the product sum of [x, [y, z]] is x + 2 * (y + z) ; the product sum of [x, [y, [z]] ] is x + 2 * (y + 3z) .

// Sample Input:
// array = [5, 2, [7, -1], 3, [6, [-13, 8], 4]]
// calcuiated as: 5 + 2 + 2* (7 - 1) + 3 + 2 * (6 + 3 *(-13 + 8) + 4)

// Sample Output:
// 12 

function productSum(array, multiplier = 1) {
  let result = 0;
  debugger
  for (const element of array) {
    if (Array.isArray(element)) {
      result = result + ( productSum(element, multiplier + 1));
    } else {
      result = result + element;
    }
  }
  return multiplier * result;
}

function runTestCase(testName, array, expected) {
  const result = productSum(array);
  const passed = result === expected;
  const status = passed ? "✅ PASSED" : "❌ FAILED";
  console.log(`${status} - ${testName}`);
  console.log(`  ➤ Expected: ${expected}`);
  console.log(`  ➤ Result:   ${result}`);
  console.log("--------------------------------------------------");
}

// Running All Test Cases

runTestCase("Test Case 1: From the prompt", [5, 2, [7, -1], 3, [6, [-13, 8], 4]], 12);
runTestCase("Test Case 2: Simple flat array", [1, 2, 3], 6);
runTestCase("Test Case 3: One level nested", [1, [2, 3]], 11);
runTestCase("Test Case 4: Deeply nested", [1, [2, [3, [4]]]], 119);
runTestCase("Test Case 5: Negative numbers", [1, [-2, [-3]]], -21);
runTestCase("Test Case 6: Empty sub-arrays", [1, [], [2, []]], 5);
runTestCase("Test Case 7: Just a single number", [100], 100);
runTestCase("Test Case 8: Mixed numbers and arrays", [10, [20], [30, [40]]], 350);
