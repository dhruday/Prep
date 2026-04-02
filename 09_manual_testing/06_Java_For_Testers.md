# Java for Testers - Interview Question Bank

## Table of Contents
1. [Java Fundamentals](#java-fundamentals)
2. [Object-Oriented Programming](#object-oriented-programming)
3. [Collections Framework](#collections-framework)
4. [Exception Handling](#exception-handling)
5. [String Manipulation](#string-manipulation)
6. [Java Coding Problems](#java-coding-problems)

---

## Java Fundamentals

### Beginner Questions

#### Q1: What are the main features of Java?
**Answer:**

| Feature | Description |
|---------|-------------|
| Platform Independent | Write once, run anywhere (JVM) |
| Object-Oriented | Everything is an object |
| Robust | Strong memory management, exception handling |
| Secure | No pointers, bytecode verification |
| Multithreaded | Built-in support for concurrent execution |
| Automatic Memory Management | Garbage collection |

---

#### Q2: What is the difference between JDK, JRE, and JVM?
**Answer:**

| Component | Full Form | Purpose |
|-----------|-----------|---------|
| JVM | Java Virtual Machine | Executes bytecode |
| JRE | Java Runtime Environment | JVM + libraries (to run Java) |
| JDK | Java Development Kit | JRE + compiler + tools (to develop Java) |

**Hierarchy:**
```
JDK = JRE + Development Tools
JRE = JVM + Libraries
```

---

#### Q3: What are primitive data types in Java?
**Answer:**

| Type | Size | Default | Example |
|------|------|---------|---------|
| byte | 1 byte | 0 | `byte b = 127;` |
| short | 2 bytes | 0 | `short s = 32767;` |
| int | 4 bytes | 0 | `int i = 100;` |
| long | 8 bytes | 0L | `long l = 100000L;` |
| float | 4 bytes | 0.0f | `float f = 3.14f;` |
| double | 8 bytes | 0.0d | `double d = 3.14159;` |
| char | 2 bytes | '\u0000' | `char c = 'A';` |
| boolean | 1 bit | false | `boolean b = true;` |

---

#### Q4: What is the difference between == and equals()?
**Answer:**

| Aspect | == | equals() |
|--------|----|---------
| Compares | Reference (memory address) | Content/Value |
| Works on | Primitives and Objects | Objects only |
| Default | Reference comparison | Same as == (unless overridden) |

**Example:**
```java
String s1 = new String("Hello");
String s2 = new String("Hello");
String s3 = "Hello";
String s4 = "Hello";

// Reference comparison
System.out.println(s1 == s2);    // false (different objects)
System.out.println(s3 == s4);    // true (string pool)

// Content comparison
System.out.println(s1.equals(s2)); // true
System.out.println(s3.equals(s4)); // true
```

---

#### Q5: What are access modifiers in Java?
**Answer:**

| Modifier | Class | Package | Subclass | World |
|----------|-------|---------|----------|-------|
| public | ✓ | ✓ | ✓ | ✓ |
| protected | ✓ | ✓ | ✓ | ✗ |
| default (no modifier) | ✓ | ✓ | ✗ | ✗ |
| private | ✓ | ✗ | ✗ | ✗ |

```java
public class Example {
    public int publicVar;      // Accessible everywhere
    protected int protectedVar; // Package + subclasses
    int defaultVar;            // Package only
    private int privateVar;    // This class only
}
```

---

### Intermediate Questions

#### Q6: What is the difference between method overloading and overriding?
**Answer:**

| Aspect | Overloading | Overriding |
|--------|-------------|------------|
| Definition | Same name, different parameters | Same name and parameters in subclass |
| Binding | Compile-time (static) | Runtime (dynamic) |
| Return type | Can be different | Must be same or covariant |
| Access | Can be different | Cannot be more restrictive |
| Inheritance | Same class or inherited | Requires inheritance |

**Overloading:**
```java
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
    
    public double add(double a, double b) {
        return a + b;
    }
    
    public int add(int a, int b, int c) {
        return a + b + c;
    }
}
```

**Overriding:**
```java
public class Animal {
    public void makeSound() {
        System.out.println("Some sound");
    }
}

public class Dog extends Animal {
    @Override
    public void makeSound() {
        System.out.println("Bark");
    }
}
```

---

#### Q7: What is the difference between static and non-static?
**Answer:**

| Aspect | Static | Non-Static |
|--------|--------|------------|
| Belongs to | Class | Instance |
| Memory | One copy | Per instance |
| Access | Without object | Requires object |
| Keyword | `static` | None |

**Example:**
```java
public class Counter {
    static int classCount = 0;  // Shared by all instances
    int instanceCount = 0;      // Per instance
    
    public Counter() {
        classCount++;
        instanceCount++;
    }
    
    public static void main(String[] args) {
        Counter c1 = new Counter();
        Counter c2 = new Counter();
        
        System.out.println(Counter.classCount); // 2
        System.out.println(c1.instanceCount);   // 1
        System.out.println(c2.instanceCount);   // 1
    }
}
```

---

#### Q8: What is the difference between final, finally, and finalize?
**Answer:**

| Keyword | Purpose |
|---------|---------|
| final | Makes variable constant, method non-overridable, class non-inheritable |
| finally | Block that always executes in try-catch |
| finalize | Method called before garbage collection (deprecated) |

```java
// final
final int MAX = 100;           // Constant
final class FinalClass {}      // Cannot be extended
// Cannot override final methods

// finally
try {
    // risky code
} catch (Exception e) {
    // handle
} finally {
    // Always executes (cleanup)
}

// finalize (deprecated in Java 9+)
@Override
protected void finalize() {
    // Cleanup before GC
}
```

---

#### Q9: What is a Constructor?
**Answer:**

A constructor is a special method that initializes an object when it's created.

**Rules:**
- Same name as class
- No return type
- Called automatically on `new`

```java
public class Person {
    String name;
    int age;
    
    // Default constructor
    public Person() {
        this.name = "Unknown";
        this.age = 0;
    }
    
    // Parameterized constructor
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    // Copy constructor
    public Person(Person other) {
        this.name = other.name;
        this.age = other.age;
    }
}

// Usage
Person p1 = new Person();                  // Default
Person p2 = new Person("John", 25);        // Parameterized
Person p3 = new Person(p2);                // Copy
```

---

#### Q10: What is the difference between Array and ArrayList?
**Answer:**

| Aspect | Array | ArrayList |
|--------|-------|-----------|
| Size | Fixed | Dynamic |
| Type | Primitive + Objects | Objects only |
| Performance | Faster | Slower |
| Flexibility | Less | More methods |

```java
// Array
int[] arr = new int[5];
arr[0] = 10;
String[] names = {"John", "Jane"};

// ArrayList
ArrayList<Integer> list = new ArrayList<>();
list.add(10);
list.add(20);
list.remove(0);
list.size();
```

---

## Object-Oriented Programming

### Q11: Explain the four pillars of OOP
**Answer:**

**1. Encapsulation:**
Hiding internal details and providing controlled access.
```java
public class BankAccount {
    private double balance;  // Hidden
    
    public void deposit(double amount) {
        if (amount > 0) {
            balance += amount;  // Controlled access
        }
    }
    
    public double getBalance() {
        return balance;
    }
}
```

**2. Inheritance:**
Acquiring properties from parent class.
```java
public class Animal {
    void eat() {
        System.out.println("Eating");
    }
}

public class Dog extends Animal {
    void bark() {
        System.out.println("Barking");
    }
}
```

**3. Polymorphism:**
Same method behaving differently.
```java
Animal animal = new Dog();  // Runtime polymorphism
animal.makeSound();         // Calls Dog's implementation
```

**4. Abstraction:**
Showing only essential details.
```java
abstract class Shape {
    abstract double area();  // What, not how
}

class Circle extends Shape {
    double radius;
    double area() {
        return Math.PI * radius * radius;  // How
    }
}
```

---

#### Q12: What is the difference between Abstract Class and Interface?
**Answer:**

| Aspect | Abstract Class | Interface |
|--------|---------------|-----------|
| Methods | Abstract + concrete | All abstract (before Java 8) |
| Variables | Any type | public static final |
| Inheritance | Single | Multiple |
| Constructors | Yes | No |
| Access modifiers | Any | public only (methods) |

**Java 8+ Interface Features:**
- Default methods
- Static methods
- Private methods (Java 9+)

```java
// Abstract class
abstract class Animal {
    protected String name;
    
    public Animal(String name) {
        this.name = name;
    }
    
    abstract void makeSound();  // Abstract
    
    void sleep() {              // Concrete
        System.out.println("Sleeping");
    }
}

// Interface
interface Flyable {
    void fly();  // Implicitly public abstract
    
    default void land() {  // Default method
        System.out.println("Landing");
    }
}

// Multiple interface implementation
class Bird extends Animal implements Flyable, Swimmable {
    // ...
}
```

---

#### Q13: What is polymorphism? Explain with examples.
**Answer:**

**Compile-time Polymorphism (Method Overloading):**
```java
public class Printer {
    void print(String s) {
        System.out.println(s);
    }
    
    void print(int i) {
        System.out.println(i);
    }
    
    void print(String s, int times) {
        for (int i = 0; i < times; i++) {
            System.out.println(s);
        }
    }
}
```

**Runtime Polymorphism (Method Overriding):**
```java
class Shape {
    void draw() {
        System.out.println("Drawing shape");
    }
}

class Circle extends Shape {
    @Override
    void draw() {
        System.out.println("Drawing circle");
    }
}

class Rectangle extends Shape {
    @Override
    void draw() {
        System.out.println("Drawing rectangle");
    }
}

// Usage
Shape shape1 = new Circle();
Shape shape2 = new Rectangle();
shape1.draw();  // "Drawing circle"
shape2.draw();  // "Drawing rectangle"
```

---

## Collections Framework

### Q14: What are the main interfaces in Collections?
**Answer:**

```
Collection
├── List (ordered, allows duplicates)
│   ├── ArrayList
│   ├── LinkedList
│   └── Vector
├── Set (no duplicates)
│   ├── HashSet
│   ├── LinkedHashSet
│   └── TreeSet
└── Queue
    ├── PriorityQueue
    └── LinkedList

Map (key-value pairs)
├── HashMap
├── LinkedHashMap
├── TreeMap
└── Hashtable
```

---

#### Q15: What is the difference between ArrayList and LinkedList?
**Answer:**

| Aspect | ArrayList | LinkedList |
|--------|-----------|------------|
| Internal | Dynamic array | Doubly linked list |
| Access | O(1) by index | O(n) |
| Insert/Delete | O(n) | O(1) at ends |
| Memory | Less | More (node overhead) |
| Use case | Frequent access | Frequent insert/delete |

```java
// ArrayList - better for access
ArrayList<String> arrayList = new ArrayList<>();
arrayList.add("A");
arrayList.get(0);  // Fast

// LinkedList - better for insert/delete
LinkedList<String> linkedList = new LinkedList<>();
linkedList.addFirst("A");
linkedList.addLast("B");
linkedList.removeFirst();  // Fast
```

---

#### Q16: What is the difference between HashMap and HashTable?
**Answer:**

| Aspect | HashMap | Hashtable |
|--------|---------|-----------|
| Synchronization | No | Yes |
| Null keys | One allowed | Not allowed |
| Null values | Allowed | Not allowed |
| Performance | Faster | Slower |
| Legacy | No | Yes |

```java
// HashMap
Map<String, Integer> hashMap = new HashMap<>();
hashMap.put(null, 1);     // OK
hashMap.put("key", null); // OK

// Hashtable
Map<String, Integer> hashtable = new Hashtable<>();
// hashtable.put(null, 1);  // NullPointerException
```

---

#### Q17: How do you iterate over a Collection?
**Answer:**

```java
List<String> list = Arrays.asList("A", "B", "C");

// 1. For-each loop
for (String item : list) {
    System.out.println(item);
}

// 2. Iterator
Iterator<String> iterator = list.iterator();
while (iterator.hasNext()) {
    System.out.println(iterator.next());
}

// 3. For loop with index (List only)
for (int i = 0; i < list.size(); i++) {
    System.out.println(list.get(i));
}

// 4. forEach with lambda
list.forEach(item -> System.out.println(item));

// 5. Stream
list.stream().forEach(System.out::println);

// Map iteration
Map<String, Integer> map = new HashMap<>();
map.put("A", 1);
map.put("B", 2);

// Keys
for (String key : map.keySet()) {
    System.out.println(key);
}

// Values
for (Integer value : map.values()) {
    System.out.println(value);
}

// Entries
for (Map.Entry<String, Integer> entry : map.entrySet()) {
    System.out.println(entry.getKey() + ": " + entry.getValue());
}
```

---

## Exception Handling

### Q18: What is Exception Handling?
**Answer:**

Exception handling manages runtime errors gracefully.

**Hierarchy:**
```
Throwable
├── Error (serious, non-recoverable)
│   ├── OutOfMemoryError
│   └── StackOverflowError
└── Exception
    ├── Checked (must handle)
    │   ├── IOException
    │   ├── SQLException
    │   └── ClassNotFoundException
    └── Unchecked (RuntimeException)
        ├── NullPointerException
        ├── ArrayIndexOutOfBoundsException
        └── ArithmeticException
```

**try-catch-finally:**
```java
try {
    // Risky code
    int result = 10 / 0;
} catch (ArithmeticException e) {
    // Handle specific exception
    System.out.println("Cannot divide by zero");
} catch (Exception e) {
    // Handle general exception
    System.out.println("Error: " + e.getMessage());
} finally {
    // Always executes
    System.out.println("Cleanup");
}
```

---

#### Q19: What is the difference between throw and throws?
**Answer:**

| Aspect | throw | throws |
|--------|-------|--------|
| Purpose | Throw an exception | Declare exceptions |
| Location | Inside method | Method signature |
| Count | One at a time | Multiple |
| Followed by | Exception object | Exception class |

```java
// throws - declares
public void readFile(String path) throws IOException, FileNotFoundException {
    // Method might throw these
}

// throw - throws
public void validateAge(int age) {
    if (age < 0) {
        throw new IllegalArgumentException("Age cannot be negative");
    }
}
```

---

#### Q20: How do you create a custom exception?
**Answer:**

```java
// Custom checked exception
public class InvalidEmailException extends Exception {
    public InvalidEmailException(String message) {
        super(message);
    }
}

// Custom unchecked exception
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(String userId) {
        super("User not found: " + userId);
    }
}

// Usage
public void validateEmail(String email) throws InvalidEmailException {
    if (!email.contains("@")) {
        throw new InvalidEmailException("Invalid email format: " + email);
    }
}

public User findUser(String id) {
    User user = userRepository.findById(id);
    if (user == null) {
        throw new UserNotFoundException(id);
    }
    return user;
}
```

---

## String Manipulation

### Q21: What is the difference between String, StringBuilder, and StringBuffer?
**Answer:**

| Aspect | String | StringBuilder | StringBuffer |
|--------|--------|---------------|--------------|
| Mutability | Immutable | Mutable | Mutable |
| Thread-safe | Yes (immutable) | No | Yes |
| Performance | Slowest for concatenation | Fastest | Slower than StringBuilder |
| Storage | String pool | Heap | Heap |

```java
// String - creates new object each time
String str = "Hello";
str = str + " World";  // Creates new String

// StringBuilder - modifies same object
StringBuilder sb = new StringBuilder("Hello");
sb.append(" World");   // Same object modified
String result = sb.toString();

// StringBuffer - thread-safe version
StringBuffer sbuf = new StringBuffer("Hello");
sbuf.append(" World");
```

**When to use:**
- String: Few modifications, need immutability
- StringBuilder: Many modifications, single thread
- StringBuffer: Many modifications, multiple threads

---

#### Q22: Common String methods for testing
**Answer:**

```java
String str = "  Hello World  ";

// Length
int len = str.length();  // 15

// Trim
String trimmed = str.trim();  // "Hello World"

// Case conversion
String upper = str.toUpperCase();  // "  HELLO WORLD  "
String lower = str.toLowerCase();  // "  hello world  "

// Substring
String sub = str.substring(2, 7);  // "Hello"

// Contains
boolean has = str.contains("World");  // true

// Split
String[] parts = "a,b,c".split(",");  // ["a", "b", "c"]

// Replace
String replaced = str.replace("World", "Java");

// StartsWith, EndsWith
boolean starts = str.trim().startsWith("Hello");  // true
boolean ends = str.trim().endsWith("World");      // true

// Equals (ignore case)
boolean eq = "hello".equalsIgnoreCase("HELLO");  // true

// Index
int index = str.indexOf("World");  // 8
int last = str.lastIndexOf("o");   // 9

// Empty/Blank
boolean empty = "".isEmpty();      // true
boolean blank = "   ".isBlank();   // true (Java 11+)

// Join
String joined = String.join("-", "a", "b", "c");  // "a-b-c"

// Format
String formatted = String.format("Name: %s, Age: %d", "John", 25);
```

---

## Java Coding Problems

### Q23: Reverse a String
**Answer:**

```java
// Method 1: StringBuilder
public String reverse1(String str) {
    return new StringBuilder(str).reverse().toString();
}

// Method 2: Character array
public String reverse2(String str) {
    char[] chars = str.toCharArray();
    int left = 0, right = chars.length - 1;
    
    while (left < right) {
        char temp = chars[left];
        chars[left] = chars[right];
        chars[right] = temp;
        left++;
        right--;
    }
    
    return new String(chars);
}

// Method 3: Recursion
public String reverse3(String str) {
    if (str.isEmpty()) {
        return str;
    }
    return reverse3(str.substring(1)) + str.charAt(0);
}
```

---

#### Q24: Check if a String is Palindrome
**Answer:**

```java
public boolean isPalindrome(String str) {
    str = str.toLowerCase().replaceAll("[^a-zA-Z0-9]", "");
    int left = 0, right = str.length() - 1;
    
    while (left < right) {
        if (str.charAt(left) != str.charAt(right)) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}

// Test
System.out.println(isPalindrome("A man a plan a canal Panama")); // true
System.out.println(isPalindrome("race a car")); // false
```

---

#### Q25: Count character occurrences in a String
**Answer:**

```java
// Count specific character
public int countChar(String str, char c) {
    int count = 0;
    for (char ch : str.toCharArray()) {
        if (ch == c) {
            count++;
        }
    }
    return count;
}

// Count all characters
public Map<Character, Integer> countAllChars(String str) {
    Map<Character, Integer> map = new HashMap<>();
    
    for (char c : str.toCharArray()) {
        map.put(c, map.getOrDefault(c, 0) + 1);
    }
    
    return map;
}

// Using streams
public Map<Character, Long> countAllCharsStream(String str) {
    return str.chars()
        .mapToObj(c -> (char) c)
        .collect(Collectors.groupingBy(c -> c, Collectors.counting()));
}
```

---

#### Q26: Find duplicates in an Array
**Answer:**

```java
// Using HashSet
public List<Integer> findDuplicates(int[] arr) {
    Set<Integer> seen = new HashSet<>();
    List<Integer> duplicates = new ArrayList<>();
    
    for (int num : arr) {
        if (!seen.add(num)) {
            duplicates.add(num);
        }
    }
    
    return duplicates;
}

// Using HashMap (with count)
public Map<Integer, Integer> countDuplicates(int[] arr) {
    Map<Integer, Integer> countMap = new HashMap<>();
    
    for (int num : arr) {
        countMap.put(num, countMap.getOrDefault(num, 0) + 1);
    }
    
    // Filter only duplicates
    countMap.entrySet().removeIf(e -> e.getValue() == 1);
    return countMap;
}
```

---

#### Q27: Find the second largest element in an Array
**Answer:**

```java
public int secondLargest(int[] arr) {
    if (arr.length < 2) {
        throw new IllegalArgumentException("Array too small");
    }
    
    int first = Integer.MIN_VALUE;
    int second = Integer.MIN_VALUE;
    
    for (int num : arr) {
        if (num > first) {
            second = first;
            first = num;
        } else if (num > second && num != first) {
            second = num;
        }
    }
    
    if (second == Integer.MIN_VALUE) {
        throw new IllegalArgumentException("No second largest");
    }
    
    return second;
}

// Using sorting
public int secondLargestSort(int[] arr) {
    Arrays.sort(arr);
    return arr[arr.length - 2];
}
```

---

#### Q28: Remove duplicates from ArrayList
**Answer:**

```java
// Using LinkedHashSet (maintains order)
public List<Integer> removeDuplicates1(List<Integer> list) {
    return new ArrayList<>(new LinkedHashSet<>(list));
}

// Using Stream
public List<Integer> removeDuplicates2(List<Integer> list) {
    return list.stream()
               .distinct()
               .collect(Collectors.toList());
}

// Manual way
public List<Integer> removeDuplicates3(List<Integer> list) {
    List<Integer> result = new ArrayList<>();
    for (Integer item : list) {
        if (!result.contains(item)) {
            result.add(item);
        }
    }
    return result;
}
```

---

#### Q29: Check if two Strings are Anagrams
**Answer:**

```java
// Using sorting
public boolean isAnagram1(String s1, String s2) {
    if (s1.length() != s2.length()) {
        return false;
    }
    
    char[] arr1 = s1.toLowerCase().toCharArray();
    char[] arr2 = s2.toLowerCase().toCharArray();
    
    Arrays.sort(arr1);
    Arrays.sort(arr2);
    
    return Arrays.equals(arr1, arr2);
}

// Using HashMap
public boolean isAnagram2(String s1, String s2) {
    if (s1.length() != s2.length()) {
        return false;
    }
    
    Map<Character, Integer> map = new HashMap<>();
    
    for (char c : s1.toLowerCase().toCharArray()) {
        map.put(c, map.getOrDefault(c, 0) + 1);
    }
    
    for (char c : s2.toLowerCase().toCharArray()) {
        if (!map.containsKey(c) || map.get(c) == 0) {
            return false;
        }
        map.put(c, map.get(c) - 1);
    }
    
    return true;
}

// Test
System.out.println(isAnagram1("listen", "silent")); // true
System.out.println(isAnagram1("hello", "world"));   // false
```

---

#### Q30: Fibonacci Series
**Answer:**

```java
// Iterative
public void fibonacciIterative(int n) {
    int a = 0, b = 1;
    
    for (int i = 0; i < n; i++) {
        System.out.print(a + " ");
        int next = a + b;
        a = b;
        b = next;
    }
}

// Recursive
public int fibonacciRecursive(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacciRecursive(n - 1) + fibonacciRecursive(n - 2);
}

// With memoization
public int fibonacciMemo(int n, Map<Integer, Integer> memo) {
    if (n <= 1) return n;
    if (memo.containsKey(n)) return memo.get(n);
    
    int result = fibonacciMemo(n - 1, memo) + fibonacciMemo(n - 2, memo);
    memo.put(n, result);
    return result;
}
```

---

#### Q31: Check if a number is Prime
**Answer:**

```java
public boolean isPrime(int n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 == 0 || n % 3 == 0) return false;
    
    for (int i = 5; i * i <= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0) {
            return false;
        }
    }
    return true;
}

// Print primes up to n
public void printPrimes(int n) {
    for (int i = 2; i <= n; i++) {
        if (isPrime(i)) {
            System.out.print(i + " ");
        }
    }
}
```

---

#### Q32: Factorial
**Answer:**

```java
// Iterative
public long factorialIterative(int n) {
    long result = 1;
    for (int i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

// Recursive
public long factorialRecursive(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorialRecursive(n - 1);
}
```

---

#### Q33: Sort an Array/List
**Answer:**

```java
// Array sorting
int[] arr = {5, 2, 8, 1, 9};
Arrays.sort(arr);  // Ascending
// For descending, use Integer[]
Integer[] arrObj = {5, 2, 8, 1, 9};
Arrays.sort(arrObj, Collections.reverseOrder());

// List sorting
List<Integer> list = new ArrayList<>(Arrays.asList(5, 2, 8, 1, 9));
Collections.sort(list);  // Ascending
Collections.sort(list, Collections.reverseOrder());  // Descending

// Custom object sorting
List<Person> people = new ArrayList<>();
// By name
Collections.sort(people, (p1, p2) -> p1.getName().compareTo(p2.getName()));
// Or using Comparator
people.sort(Comparator.comparing(Person::getName));
people.sort(Comparator.comparing(Person::getAge).reversed());
```

---

#### Q34: Binary Search
**Answer:**

```java
// Built-in
int index = Arrays.binarySearch(sortedArray, target);

// Custom implementation
public int binarySearch(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    
    while (left <= right) {
        int mid = left + (right - left) / 2;
        
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return -1;  // Not found
}
```

---

#### Q35: Reverse an Array
**Answer:**

```java
public void reverseArray(int[] arr) {
    int left = 0, right = arr.length - 1;
    
    while (left < right) {
        // Swap
        int temp = arr[left];
        arr[left] = arr[right];
        arr[right] = temp;
        
        left++;
        right--;
    }
}

// Using Collections (for List)
public List<Integer> reverseList(List<Integer> list) {
    Collections.reverse(list);
    return list;
}
```

---

## Common Java Interview Traps

### Trap 1: String Pool confusion
```java
String s1 = "Hello";
String s2 = "Hello";
String s3 = new String("Hello");

s1 == s2   // true (same pool object)
s1 == s3   // false (different objects)
s1.equals(s3)  // true (same content)
```

### Trap 2: Integer caching
```java
Integer a = 127;
Integer b = 127;
Integer c = 128;
Integer d = 128;

a == b  // true (cached -128 to 127)
c == d  // false (outside cache range)
a.equals(b)  // true
c.equals(d)  // true
```

### Trap 3: Array vs ArrayList modification
```java
String[] arr = {"a", "b", "c"};
List<String> list = Arrays.asList(arr);
list.add("d");  // UnsupportedOperationException!

// Correct way
List<String> mutableList = new ArrayList<>(Arrays.asList(arr));
mutableList.add("d");  // Works
```

---

Continue to [07_Linux_For_Testers.md](07_Linux_For_Testers.md) for Linux commands and concepts.
