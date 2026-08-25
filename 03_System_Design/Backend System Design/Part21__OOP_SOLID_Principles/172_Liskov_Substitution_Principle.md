# 172. Liskov Substitution Principle (LSP)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Liskov Substitution Principle (LSP)**: Objects of a superclass should be replaceable with objects of its subclasses without breaking the application.

### Core Concept

**What it means:**
- Subtypes must be behaviorally compatible with their base types
- If code works with Parent, it must work with Child
- Child classes can't break parent class contracts
- Substitutability without surprises

**Simple analogy:**
- If your code expects a "Vehicle" and someone gives you a "Car", it should work
- Car has steering wheel, gas pedal, brakes—everything Vehicle promises
- But if "Bicycle" extends Vehicle and throws UnsupportedOperationException on startEngine(), that breaks LSP

**In code:**
```java
// BAD: Square breaks Rectangle contract ❌
Rectangle rect = new Square(5);
rect.setWidth(10);
rect.setHeight(5);
// Expected area: 50
// Actual area: 25 (Square overrides both to same value!)
// LSP violation: Square can't substitute Rectangle

// GOOD: Separate hierarchies ✓
interface Shape {
    int getArea();
}
class Rectangle implements Shape { }
class Square implements Shape { }
// No inheritance relationship, no LSP violation
```

### Why LSP Matters

**Code Quality Benefits:**
- **Polymorphism works correctly**: Can use base type references safely
- **No runtime surprises**: Subclasses behave as expected
- **Contract preservation**: Preconditions, postconditions, invariants maintained
- **Reliable inheritance**: Subclasses extend without breaking
- **Testability**: Tests written for base class work for all subclasses

**Business Impact:**
- Prevents subtle bugs that appear only with certain implementations
- Enables safe refactoring (swap implementations without fear)
- Reduces integration bugs in large codebases
- Makes code predictable and understandable

**Common LSP Violations:**
- Throwing UnsupportedOperationException in subclass
- Strengthening preconditions (requiring more than parent)
- Weakening postconditions (guaranteeing less than parent)
- Changing exception types incompatibly
- Violating parent class invariants

**Role in interviews:**
- Classic question: "What's wrong with Square extending Rectangle?"
- Design questions: "How would you model Bird/Penguin hierarchy?"
- Refactoring: "This inheritance violates LSP—fix it"
- FAANG expects understanding of behavioral compatibility

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🔴 Classic LSP Violation: Rectangle-Square Problem

#### The Textbook Example

```java
// BAD: Square violates LSP when extending Rectangle ❌

public class Rectangle {
    protected int width;
    protected int height;
    
    public void setWidth(int width) {
        this.width = width;
    }
    
    public void setHeight(int height) {
        this.height = height;
    }
    
    public int getWidth() {
        return width;
    }
    
    public int getHeight() {
        return height;
    }
    
    public int getArea() {
        return width * height;
    }
}

// Square "is-a" Rectangle? Seems logical...
public class Square extends Rectangle {
    
    @Override
    public void setWidth(int width) {
        this.width = width;
        this.height = width; // Keep square constraint
    }
    
    @Override
    public void setHeight(int height) {
        this.width = height;  // Keep square constraint
        this.height = height;
    }
}

// Client code that works with Rectangle
public class AreaCalculator {
    
    public void calculateArea(Rectangle rect) {
        rect.setWidth(5);
        rect.setHeight(4);
        
        int area = rect.getArea();
        
        // Expected: 5 × 4 = 20
        assert area == 20 : "Expected area 20, got " + area;
    }
}

// Test with Rectangle
@Test
public void testRectangle() {
    Rectangle rect = new Rectangle();
    areaCalculator.calculateArea(rect);
    // ✓ Passes: area = 20
}

// Test with Square (LSP violation!)
@Test
public void testSquare() {
    Rectangle rect = new Square(); // Substituting Square for Rectangle
    areaCalculator.calculateArea(rect);
    // ✗ FAILS: area = 16 (4 × 4), not 20!
    // Square can't substitute Rectangle without breaking behavior!
}

// Why this is LSP violation:
// 1. Rectangle contract: width and height are independent
// 2. Client expects: set width, set height, area = width × height
// 3. Square breaks contract: setting width changes height
// 4. Behavior is incompatible
// 5. Square can't substitute Rectangle
```

#### LSP-Compliant Solution

```java
// GOOD: Separate hierarchies, no inheritance ✓

public interface Shape {
    int getArea();
    int getPerimeter();
}

// Rectangle: width and height independent
public class Rectangle implements Shape {
    private final int width;
    private final int height;
    
    public Rectangle(int width, int height) {
        this.width = width;
        this.height = height;
    }
    
    public int getWidth() {
        return width;
    }
    
    public int getHeight() {
        return height;
    }
    
    @Override
    public int getArea() {
        return width * height;
    }
    
    @Override
    public int getPerimeter() {
        return 2 * (width + height);
    }
}

// Square: all sides equal (different invariant)
public class Square implements Shape {
    private final int side;
    
    public Square(int side) {
        this.side = side;
    }
    
    public int getSide() {
        return side;
    }
    
    @Override
    public int getArea() {
        return side * side;
    }
    
    @Override
    public int getPerimeter() {
        return 4 * side;
    }
}

// Client code
public class AreaCalculator {
    
    // Works with any Shape
    public void printArea(Shape shape) {
        System.out.println("Area: " + shape.getArea());
    }
    
    // If you need Rectangle-specific behavior, use Rectangle
    public void analyzeRectangle(Rectangle rect) {
        System.out.println("Width: " + rect.getWidth());
        System.out.println("Height: " + rect.getHeight());
        System.out.println("Aspect ratio: " + 
            (double) rect.getWidth() / rect.getHeight());
    }
}

// Benefits:
// ✓ No LSP violation (no inheritance relationship)
// ✓ Rectangle and Square are both Shapes
// ✓ Each has correct invariants
// ✓ No behavioral surprises
// ✓ Type-safe: can't call analyzeRectangle with Square
```

---

### 🟢 LSP Violation: Bird Hierarchy

#### Classic Interview Problem

```java
// BAD: Penguin can't fly, violates Bird contract ❌

public class Bird {
    
    public void eat() {
        System.out.println("Bird eating");
    }
    
    public void sleep() {
        System.out.println("Bird sleeping");
    }
    
    // All birds can fly?
    public void fly() {
        System.out.println("Bird flying");
    }
}

public class Sparrow extends Bird {
    
    @Override
    public void fly() {
        System.out.println("Sparrow flying at 50 km/h");
    }
}

public class Eagle extends Bird {
    
    @Override
    public void fly() {
        System.out.println("Eagle flying at 120 km/h");
    }
}

// Penguin is a bird but can't fly!
public class Penguin extends Bird {
    
    @Override
    public void fly() {
        throw new UnsupportedOperationException("Penguins can't fly!");
    }
}

// Client code expecting Bird behavior
public class BirdSanctuary {
    
    public void releaseBirds(List<Bird> birds) {
        for (Bird bird : birds) {
            bird.fly(); // Assumes all birds can fly
        }
    }
}

// Usage
List<Bird> birds = Arrays.asList(
    new Sparrow(),
    new Eagle(),
    new Penguin() // 💥 UnsupportedOperationException!
);
sanctuary.releaseBirds(birds);

// LSP violation: Penguin can't substitute Bird
```

#### LSP-Compliant Solution

```java
// GOOD: Separate hierarchies based on capabilities ✓

// Base class: Common bird behavior
public abstract class Bird {
    
    public void eat() {
        System.out.println("Bird eating");
    }
    
    public void sleep() {
        System.out.println("Bird sleeping");
    }
}

// Capability: Flying
public abstract class FlyingBird extends Bird {
    
    // Only flying birds have this method
    public abstract void fly();
    
    public abstract int getFlyingSpeed(); // km/h
}

// Capability: Swimming
public abstract class SwimmingBird extends Bird {
    
    // Only swimming birds have this method
    public abstract void swim();
    
    public abstract int getSwimmingSpeed(); // km/h
}

// Sparrow: Can fly
public class Sparrow extends FlyingBird {
    
    @Override
    public void fly() {
        System.out.println("Sparrow flying");
    }
    
    @Override
    public int getFlyingSpeed() {
        return 50;
    }
}

// Eagle: Can fly
public class Eagle extends FlyingBird {
    
    @Override
    public void fly() {
        System.out.println("Eagle flying");
    }
    
    @Override
    public int getFlyingSpeed() {
        return 120;
    }
}

// Penguin: Can swim, but NOT a FlyingBird
public class Penguin extends SwimmingBird {
    
    @Override
    public void swim() {
        System.out.println("Penguin swimming");
    }
    
    @Override
    public int getSwimmingSpeed() {
        return 35;
    }
}

// Duck: Can both fly and swim
public class Duck extends FlyingBird {
    
    @Override
    public void fly() {
        System.out.println("Duck flying");
    }
    
    @Override
    public int getFlyingSpeed() {
        return 80;
    }
    
    public void swim() {
        System.out.println("Duck swimming");
    }
}

// Client code
public class BirdSanctuary {
    
    // Works with any bird
    public void feedBirds(List<Bird> birds) {
        for (Bird bird : birds) {
            bird.eat(); // All birds can eat
        }
    }
    
    // Works only with flying birds (type-safe!)
    public void releaseFlyingBirds(List<FlyingBird> birds) {
        for (FlyingBird bird : birds) {
            bird.fly(); // Guaranteed to work
        }
    }
    
    // Works only with swimming birds
    public void releaseSwimmingBirds(List<SwimmingBird> birds) {
        for (SwimmingBird bird : birds) {
            bird.swim(); // Guaranteed to work
        }
    }
}

// Usage: Type-safe, no exceptions
List<FlyingBird> flyingBirds = Arrays.asList(
    new Sparrow(),
    new Eagle(),
    new Duck()
);
sanctuary.releaseFlyingBirds(flyingBirds); // ✓ All can fly

List<SwimmingBird> swimmingBirds = Arrays.asList(
    new Penguin()
);
sanctuary.releaseSwimmingBirds(swimmingBirds); // ✓ All can swim

// Penguin can't be added to flyingBirds (compile error)
// LSP maintained: FlyingBird guarantees fly() works
```

---

### 🔵 LSP in Exception Handling

**Rule**: Subclasses can't throw new checked exceptions not declared in parent.

```java
// BAD: Subclass adds new checked exception ❌

public class FileStorage {
    
    public void save(String filename, byte[] data) throws IOException {
        Files.write(Paths.get(filename), data);
    }
}

public class EncryptedFileStorage extends FileStorage {
    
    @Override
    public void save(String filename, byte[] data) 
        throws IOException, KeyNotFoundException { // NEW EXCEPTION!
        
        Key key = getEncryptionKey();
        byte[] encrypted = encrypt(data, key);
        super.save(filename, encrypted);
    }
}

// Client code
public class DocumentService {
    
    private FileStorage storage;
    
    public void saveDocument(Document doc) {
        try {
            storage.save(doc.getFilename(), doc.getData());
        } catch (IOException e) {
            logger.error("Failed to save document", e);
        }
        // KeyNotFoundException NOT caught! Production bug!
    }
}

// Usage
documentService.setStorage(new FileStorage()); // Works fine
documentService.setStorage(new EncryptedFileStorage()); // 💥 Uncaught exception!

// LSP violation: EncryptedFileStorage can't substitute FileStorage
// Client expects only IOException, gets KeyNotFoundException
```

#### LSP-Compliant Solution

```java
// GOOD: Subclass maintains exception contract ✓

public class FileStorage {
    
    public void save(String filename, byte[] data) throws IOException {
        Files.write(Paths.get(filename), data);
    }
}

public class EncryptedFileStorage extends FileStorage {
    
    @Override
    public void save(String filename, byte[] data) throws IOException {
        try {
            Key key = getEncryptionKey();
            byte[] encrypted = encrypt(data, key);
            super.save(filename, encrypted);
            
        } catch (KeyNotFoundException e) {
            // Wrap in declared exception type
            throw new IOException("Encryption key not found", e);
        } catch (EncryptionException e) {
            // Wrap in declared exception type
            throw new IOException("Failed to encrypt data", e);
        }
    }
}

// Client code unchanged
public class DocumentService {
    
    private FileStorage storage;
    
    public void saveDocument(Document doc) {
        try {
            storage.save(doc.getFilename(), doc.getData());
        } catch (IOException e) {
            logger.error("Failed to save document", e);
            // Catches all failures, including encryption
        }
    }
}

// Usage: Both work identically from client perspective
documentService.setStorage(new FileStorage());
documentService.setStorage(new EncryptedFileStorage());

// ✓ LSP maintained: Exception contract preserved
```

---

### 🟡 LSP in Preconditions and Postconditions

**Preconditions**: What must be true before method executes
**Postconditions**: What must be true after method executes

**LSP Rules:**
- Subclass can't strengthen preconditions (require more)
- Subclass can't weaken postconditions (guarantee less)

#### Precondition Violation

```java
// BAD: Subclass strengthens precondition ❌

public class Account {
    
    protected BigDecimal balance;
    
    // Precondition: amount > 0
    public void withdraw(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        
        if (balance.compareTo(amount) < 0) {
            throw new InsufficientFundsException();
        }
        
        balance = balance.subtract(amount);
    }
}

public class PremiumAccount extends Account {
    
    // Strengthens precondition: amount > 0 AND amount <= dailyLimit
    @Override
    public void withdraw(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        
        // NEW REQUIREMENT! (strengthened precondition)
        if (amount.compareTo(dailyLimit) > 0) {
            throw new IllegalArgumentException("Amount exceeds daily limit");
        }
        
        if (balance.compareTo(amount) < 0) {
            throw new InsufficientFundsException();
        }
        
        balance = balance.subtract(amount);
    }
}

// Client code
public class ATM {
    
    public void processWithdrawal(Account account, BigDecimal amount) {
        // Validates only basic Account preconditions
        if (amount.compareTo(BigDecimal.ZERO) > 0) {
            account.withdraw(amount); // Works for Account
            // 💥 Fails for PremiumAccount if amount > dailyLimit
        }
    }
}

// LSP violation: PremiumAccount requires MORE than Account
```

#### LSP-Compliant Solution

```java
// GOOD: Subclass maintains or weakens preconditions ✓

public abstract class Account {
    
    protected BigDecimal balance;
    
    // Precondition: amount > 0
    public void withdraw(BigDecimal amount) {
        // Validate common preconditions
        validateAmount(amount);
        
        // Template method: subclass-specific validation
        validateWithdrawal(amount);
        
        if (balance.compareTo(amount) < 0) {
            throw new InsufficientFundsException();
        }
        
        balance = balance.subtract(amount);
    }
    
    protected void validateAmount(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
    }
    
    // Extension point for subclass-specific validation
    protected void validateWithdrawal(BigDecimal amount) {
        // Default: no additional validation
    }
}

public class PremiumAccount extends Account {
    
    private BigDecimal dailyLimit;
    
    @Override
    protected void validateWithdrawal(BigDecimal amount) {
        // Additional validation, but withdraw() still works with same preconditions
        // This is checked in addition to, not instead of, parent validations
        if (amount.compareTo(dailyLimit) > 0) {
            throw new DailyLimitExceededException(
                "Amount " + amount + " exceeds daily limit " + dailyLimit
            );
        }
    }
}

// Alternative: Use composition instead of inheritance
public class AccountWithDailyLimit {
    
    private Account account;
    private BigDecimal dailyLimit;
    
    public void withdraw(BigDecimal amount) {
        // Additional validation before delegating
        if (amount.compareTo(dailyLimit) > 0) {
            throw new DailyLimitExceededException();
        }
        
        // Delegate to composed account
        account.withdraw(amount);
    }
}

// ✓ LSP maintained: Preconditions not strengthened in a way that breaks substitutability
```

#### Postcondition Violation

```java
// BAD: Subclass weakens postcondition ❌

public class OrderRepository {
    
    // Postcondition: Returns non-null Order or throws NotFoundException
    public Order findById(Long id) throws NotFoundException {
        Optional<Order> order = findOptional(id);
        return order.orElseThrow(() -> new NotFoundException("Order not found: " + id));
    }
}

public class CachingOrderRepository extends OrderRepository {
    
    // Weakens postcondition: May return null!
    @Override
    public Order findById(Long id) {
        Order cached = cache.get(id);
        if (cached != null) {
            return cached;
        }
        
        try {
            return super.findById(id);
        } catch (NotFoundException e) {
            return null; // 💥 Violates contract! Should throw exception
        }
    }
}

// Client code
public class OrderService {
    
    private OrderRepository repository;
    
    public void processOrder(Long orderId) {
        try {
            Order order = repository.findById(orderId);
            // Assumes order is non-null (parent's postcondition)
            order.setStatus(OrderStatus.PROCESSING); // 💥 NullPointerException!
            
        } catch (NotFoundException e) {
            logger.error("Order not found: " + orderId);
        }
    }
}

// LSP violation: CachingOrderRepository weakens postcondition
```

#### LSP-Compliant Solution

```java
// GOOD: Subclass maintains postconditions ✓

public class OrderRepository {
    
    // Postcondition: Returns non-null Order or throws NotFoundException
    public Order findById(Long id) throws NotFoundException {
        Optional<Order> order = findOptional(id);
        return order.orElseThrow(() -> new NotFoundException("Order not found: " + id));
    }
}

public class CachingOrderRepository extends OrderRepository {
    
    @Override
    public Order findById(Long id) throws NotFoundException {
        // Try cache first
        Order cached = cache.get(id);
        if (cached != null) {
            return cached; // Non-null
        }
        
        // Cache miss: delegate to parent
        Order order = super.findById(id); // Throws NotFoundException if not found
        
        // Cache for next time
        cache.put(id, order);
        
        return order; // Non-null (or exception thrown)
    }
    
    // Postcondition maintained: Always returns non-null or throws NotFoundException
}

// ✓ LSP maintained: Postcondition preserved
```

---

### 🟣 LSP in Collections Framework

Java's Collections Framework demonstrates LSP compliance.

```java
// List interface contract
public interface List<E> {
    boolean add(E element);
    E get(int index);
    int size();
    // ... other methods
}

// ArrayList: Mutable, growable
public class ArrayList<E> implements List<E> {
    
    @Override
    public boolean add(E element) {
        // Adds element, grows array if needed
        return true;
    }
    
    @Override
    public E get(int index) {
        return elements[index];
    }
}

// LinkedList: Mutable, node-based
public class LinkedList<E> implements List<E> {
    
    @Override
    public boolean add(E element) {
        // Adds element as new node
        return true;
    }
    
    @Override
    public E get(int index) {
        // Traverse to index
        return node.value;
    }
}

// Client code: Works with any List implementation
public class DataProcessor {
    
    public void process(List<String> data) {
        for (int i = 0; i < data.size(); i++) {
            String item = data.get(i);
            // Process item
        }
        
        data.add("new item"); // Works for all implementations
    }
}

// LSP compliant: ArrayList and LinkedList both substitute List
processor.process(new ArrayList<>()); // ✓ Works
processor.process(new LinkedList<>()); // ✓ Works
processor.process(Collections.singletonList("item")); // ✓ Works

// Counter-example: Unmodifiable list
List<String> unmodifiableList = Collections.unmodifiableList(original);
unmodifiableList.add("item"); // 💥 UnsupportedOperationException

// This is acceptable in Java because:
// 1. Documented clearly in Javadoc
// 2. Optional operation (declared in interface documentation)
// 3. Client should check before calling if unsure
// 
// Better design would be separate ReadOnlyList interface
```

---

## ────────────────────────────────────
## 3️⃣ LSP Design Rules & Checklist
## ────────────────────────────────────

### Design by Contract

**Contract Elements:**
1. **Preconditions**: What caller must ensure before calling
2. **Postconditions**: What method guarantees after execution
3. **Invariants**: What must always be true for object

**LSP Rules:**
```
Subclass rules:
✓ Can weaken preconditions (accept more inputs)
✗ Can't strengthen preconditions (require more inputs)

✓ Can strengthen postconditions (guarantee more outputs)
✗ Can't weaken postconditions (guarantee less outputs)

✓ Must maintain invariants
```

### LSP Compliance Checklist

**For each subclass, verify:**

□ **Method signatures compatible**
  - Return types covariant (subclass can return more specific type)
  - Parameter types contravariant (subclass can accept more general type)
  - Exception types compatible (no new checked exceptions)

□ **Preconditions maintained**
  - Subclass doesn't require stricter input validation
  - Subclass doesn't reject inputs that parent accepts
  - Parameter ranges not narrowed

□ **Postconditions maintained**
  - Subclass guarantees at least what parent guarantees
  - Return values satisfy parent's contract
  - Side effects consistent with parent

□ **Invariants preserved**
  - Object state consistency maintained
  - Class invariants not broken by subclass operations
  - Internal state constraints respected

□ **No unexpected exceptions**
  - UnsupportedOperationException is red flag
  - Checked exceptions not added
  - Runtime exceptions documented if added

□ **Behavior compatible**
  - No surprising behavior changes
  - Semantic meaning preserved
  - Client expectations met

### Common LSP Violations to Avoid

```java
// ❌ DON'T: Throw UnsupportedOperationException
public class ReadOnlyList<E> extends ArrayList<E> {
    @Override
    public boolean add(E element) {
        throw new UnsupportedOperationException();
    }
}

// ✓ DO: Use separate interface
public interface ReadOnlyList<E> {
    E get(int index);
    int size();
    // No add() method
}

// ❌ DON'T: Return null when parent returns non-null
public class CachedRepository extends Repository {
    @Override
    public User findById(Long id) {
        return cache.get(id); // May return null!
    }
}

// ✓ DO: Maintain postcondition
public class CachedRepository extends Repository {
    @Override
    public User findById(Long id) {
        User cached = cache.get(id);
        return cached != null ? cached : super.findById(id);
    }
}

// ❌ DON'T: Strengthen preconditions
public class ValidatedAccount extends Account {
    @Override
    public void deposit(BigDecimal amount) {
        if (amount.compareTo(new BigDecimal("10000")) > 0) {
            throw new IllegalArgumentException("Amount too large");
        }
        super.deposit(amount);
    }
}

// ✓ DO: Keep preconditions same or weaker
public class ValidatedAccount extends Account {
    @Override
    public void deposit(BigDecimal amount) {
        // Parent's validation sufficient
        super.deposit(amount);
        
        // Additional behavior (logging), not validation
        if (amount.compareTo(new BigDecimal("10000")) > 0) {
            auditService.logLargeDeposit(accountId, amount);
        }
    }
}

// ❌ DON'T: Change exception types incompatibly
public class SecureStorage extends Storage {
    @Override
    public void save(String key, String value) throws SecurityException {
        // Parent throws IOException, this throws SecurityException
        validateSecurity();
        super.save(key, value);
    }
}

// ✓ DO: Wrap in compatible exception type
public class SecureStorage extends Storage {
    @Override
    public void save(String key, String value) throws IOException {
        try {
            validateSecurity();
        } catch (SecurityException e) {
            throw new IOException("Security validation failed", e);
        }
        super.save(key, value);
    }
}
```

---

## ────────────────────────────────────
## 4️⃣ Real-World Production Examples
## ────────────────────────────────────

### Example 1: Spring Framework - Repository Pattern

Spring Data repositories follow LSP perfectly:

```java
// Base interface
public interface CrudRepository<T, ID> {
    <S extends T> S save(S entity);
    Optional<T> findById(ID id);
    Iterable<T> findAll();
    void deleteById(ID id);
    long count();
}

// Extension: Adds paging without breaking base contract
public interface PagingAndSortingRepository<T, ID> extends CrudRepository<T, ID> {
    Iterable<T> findAll(Sort sort);
    Page<T> findAll(Pageable pageable);
}

// Extension: Adds JPA-specific features
public interface JpaRepository<T, ID> extends PagingAndSortingRepository<T, ID> {
    void flush();
    <S extends T> S saveAndFlush(S entity);
    void deleteInBatch(Iterable<T> entities);
}

// All maintain LSP: JpaRepository can substitute CrudRepository
public class OrderService {
    
    // Works with any CrudRepository implementation
    public void processOrder(CrudRepository<Order, Long> repository) {
        Order order = new Order();
        repository.save(order);
        
        Optional<Order> found = repository.findById(order.getId());
        found.ifPresent(this::fulfill);
    }
}

// Usage: All work identically for CrudRepository operations
processOrder(crudRepository);          // ✓ Basic implementation
processOrder(pagingRepository);        // ✓ Extends with paging
processOrder(jpaRepository);           // ✓ Extends with JPA features

// LSP maintained: Subinterfaces strengthen postconditions (add capabilities)
// but don't weaken them (all base operations still work)
```

### Example 2: Java Streams - Stateless vs Stateful Operations

```java
// Stream operations maintain LSP

// Base interface
public interface Stream<T> {
    Stream<T> filter(Predicate<? super T> predicate);
    <R> Stream<R> map(Function<? super T, ? extends R> mapper);
    long count();
    // ... other operations
}

// Client code
public class DataAnalyzer {
    
    public long countEvenNumbers(Stream<Integer> stream) {
        return stream
            .filter(n -> n % 2 == 0)
            .count();
    }
}

// Works with any Stream implementation
analyzer.countEvenNumbers(list.stream());              // ✓ Sequential
analyzer.countEvenNumbers(list.parallelStream());      // ✓ Parallel
analyzer.countEvenNumbers(Stream.of(1, 2, 3, 4, 5)); // ✓ Static

// LSP maintained: All Stream implementations behave identically
// (though performance characteristics differ)
```

### Example 3: Payment Processing System (LSP-Compliant)

```java
// Production-grade payment processing following LSP

public interface PaymentProcessor {
    
    // Contract: Returns PaymentResult (never null)
    // Throws PaymentException on unrecoverable errors
    // Precondition: order must be non-null with positive amount
    // Postcondition: Payment attempted, result indicates success/failure
    PaymentResult process(Order order) throws PaymentException;
    
    // Contract: Returns true if processor can handle this payment method
    boolean supports(PaymentMethod method);
    
    // Contract: Returns processor name for logging/metrics
    String getProcessorName();
}

// Implementation 1: Stripe
@Component
public class StripePaymentProcessor implements PaymentProcessor {
    
    @Override
    public PaymentResult process(Order order) throws PaymentException {
        // Validates preconditions (order non-null, amount positive)
        validateOrder(order);
        
        try {
            Charge charge = stripeClient.charge(order);
            // Postcondition: Returns non-null PaymentResult
            return PaymentResult.success(charge.getId(), charge.getAmount());
            
        } catch (StripeException e) {
            // Postcondition: Returns non-null PaymentResult indicating failure
            return PaymentResult.failure(e.getMessage(), e.getCode());
        }
    }
    
    @Override
    public boolean supports(PaymentMethod method) {
        return method == PaymentMethod.CREDIT_CARD;
    }
    
    @Override
    public String getProcessorName() {
        return "Stripe";
    }
    
    private void validateOrder(Order order) {
        if (order == null) {
            throw new IllegalArgumentException("Order cannot be null");
        }
        if (order.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Order amount must be positive");
        }
    }
}

// Implementation 2: PayPal (LSP-compliant substitute)
@Component
public class PayPalPaymentProcessor implements PaymentProcessor {
    
    @Override
    public PaymentResult process(Order order) throws PaymentException {
        // Same precondition validation
        validateOrder(order);
        
        try {
            PayPalResponse response = paypalClient.execute(order);
            // Same postcondition: Returns non-null PaymentResult
            return PaymentResult.success(
                response.getTransactionId(), 
                response.getAmount()
            );
            
        } catch (PayPalException e) {
            // Same postcondition: Returns non-null PaymentResult
            return PaymentResult.failure(e.getMessage(), e.getErrorCode());
        }
    }
    
    @Override
    public boolean supports(PaymentMethod method) {
        return method == PaymentMethod.PAYPAL;
    }
    
    @Override
    public String getProcessorName() {
        return "PayPal";
    }
    
    private void validateOrder(Order order) {
        // Same validation as Stripe (maintains preconditions)
        if (order == null) {
            throw new IllegalArgumentException("Order cannot be null");
        }
        if (order.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Order amount must be positive");
        }
    }
}

// Service using processors (relies on LSP)
@Service
public class PaymentService {
    
    private final List<PaymentProcessor> processors;
    
    @Autowired
    public PaymentService(List<PaymentProcessor> processors) {
        this.processors = processors;
    }
    
    public PaymentResult processPayment(Order order, PaymentMethod method) {
        // Relies on LSP: All processors behave identically
        PaymentProcessor processor = processors.stream()
            .filter(p -> p.supports(method))
            .findFirst()
            .orElseThrow(() -> new UnsupportedPaymentMethodException(method));
        
        try {
            // Works identically for all implementations
            PaymentResult result = processor.process(order);
            
            // Postcondition: result is never null
            logPayment(processor.getProcessorName(), result);
            
            return result;
            
        } catch (PaymentException e) {
            logger.error("Payment failed: {}", processor.getProcessorName(), e);
            throw e;
        }
    }
}

// LSP enables:
// ✓ StripeProcessor and PayPalProcessor are interchangeable
// ✓ PaymentService doesn't care which implementation
// ✓ Adding new processor doesn't require changing PaymentService
// ✓ All processors tested with same test suite
// ✓ Client code works with any processor without modifications
```

---

## ────────────────────────────────────
## 5️⃣ Interview Q&A (Behavioral Questions)
## ────────────────────────────────────

### Q1: "What is Liskov Substitution Principle?"

**Answer:** *"Liskov Substitution Principle states that objects of a superclass should be replaceable with objects of its subclasses without breaking the application. In other words, if code works with Parent, it must work identically with Child.*

*Classic example: Rectangle and Square. If Square extends Rectangle, and I write code that sets width to 5 and height to 4 expecting area 20, it breaks with Square which forces both dimensions equal—I get area 16. Square can't substitute Rectangle because it breaks the behavioral contract.*

*LSP ensures polymorphism works correctly. If my PaymentService works with PaymentProcessor interface, and I swap StripeProcessor for PayPalProcessor, behavior must be identical from the service's perspective. Both accept same inputs, return same output types, maintain same contracts.*

*Violations include: throwing UnsupportedOperationException, returning null when parent returns non-null, adding checked exceptions parent doesn't declare, or strengthening preconditions. LSP is about behavioral compatibility, not just type compatibility."*

### Q2: "Explain the Rectangle-Square problem"

**Answer:** *"It's the classic LSP violation. Mathematically, a square is a rectangle, so inheritance seems logical. But behaviorally, they're incompatible.*

*Rectangle's contract: width and height are independent. Set width to 5, height to 4, area is 20.*

*Square must maintain constraint: all sides equal. So Square overrides setWidth() to also set height, and setHeight() to also set width.*

*Now client code breaks:*

```java
Rectangle rect = new Square(5);
rect.setWidth(10);  // Square sets both width and height to 10
rect.setHeight(5);  // Square sets both to 5
// Expected area: 50 (10 × 5)
// Actual area: 25 (5 × 5)
```

*Square can't substitute Rectangle—it violates the independence contract. Solution is separate hierarchies—both implement Shape, no inheritance between Rectangle and Square. LSP teaches: 'is-a' relationship in math doesn't mean 'is-a' in code. Behavioral compatibility matters more than conceptual relationships."*

### Q3: "Give a real production bug caused by LSP violation"

**Answer:** *"At my company, we had OrderRepository with findById() returning Order or throwing NotFoundException—never null. Someone created CachedOrderRepository extending it. The cached version returned null on cache miss instead of delegating to parent—LSP violation.*

*Bug appeared in OrderService:*

```java
Order order = repository.findById(orderId);
order.setStatus(PROCESSING); // NullPointerException!
```

*Service assumed order was non-null—parent's postcondition. But CachedOrderRepository weakened postcondition by returning null. Bug only appeared when cache was enabled, making it hard to reproduce.*

*We caught it in staging when we enabled caching for load tests. Fix was making CachedOrderRepository delegate to parent on cache miss, maintaining the 'non-null or exception' postcondition.*

*Cost: 2 hours debugging, 3 hours fixing and testing. Lesson: Subclasses must honor parent contracts strictly. We added LSP checks to code reviews after this."*

### Q4: "How do you design inheritance to avoid LSP violations?"

**Answer:** *"I follow three strategies:*

*First, favor composition over inheritance. Instead of Square extends Rectangle, I use Shape interface implemented by both. No inheritance means no LSP concerns.*

*Second, design hierarchies around capabilities, not classifications. For birds, I don't have Bird base class with fly() method. I have FlyingBird, SwimmingBird, WalkingBird based on capabilities. Penguin extends SwimmingBird, Sparrow extends FlyingBird. Each subclass naturally supports parent methods.*

*Third, use abstract base classes with template methods. Parent defines algorithm, subclasses implement specific steps. All steps are required, so no UnsupportedOperationException. Parent's preconditions and postconditions enforced in template method, subclasses can't break them.*

*Example: PaymentProcessor abstract class with process() template method that validates inputs, calls abstract doProcess(), then logs results. Subclasses only implement doProcess()—can't violate parent's validation or logging logic.*

*In code reviews, I check: Can subclass really do everything parent promises? If not, wrong hierarchy."*

### Q5: "What's the relationship between LSP and Design by Contract?"

**Answer:** *"LSP is enforcement of Design by Contract in inheritance hierarchies. Contract has three parts:*

*Preconditions: What caller must ensure. LSP says subclass can't strengthen preconditions. If parent accepts amount > 0, child can't require amount > 100.*

*Postconditions: What method guarantees. LSP says subclass can't weaken postconditions. If parent returns non-null, child can't return null.*

*Invariants: What's always true about object. LSP says subclass must maintain invariants. If Account guarantees balance >= 0, OverdraftAccount can't violate this.*

*Example: Stack interface with push/pop. Contract: push() adds element, pop() returns last pushed element. FixedSizeStack extends Stack. If it throws exception when full, that's LSP violation if parent doesn't declare that exception. Client expecting Stack contract breaks with FixedSizeStack.*

*LSP prevents 'surprise' violations. If parent's contract says X, child must guarantee X. That's how polymorphism works reliably—clients depend on contracts, not implementations."*

### Q6: "When is it acceptable to violate LSP?"

**Answer:** *"Strictly speaking, never—LSP violations break polymorphism. But Java Collections have documented violations for pragmatic reasons.*

*Example: Collections.unmodifiableList() returns List that throws UnsupportedOperationException on add(). That's LSP violation—client expecting List behavior breaks. But it's acceptable because:*

*One, it's heavily documented in Javadoc. Two, it's an 'optional operation' explicitly called out in List interface documentation. Three, alternative would be separate ReadOnlyList interface, which would fragment the collections API.*

*In my own code, I never intentionally violate LSP. If subclass can't support parent's methods, wrong hierarchy. Better solutions:*

*Use interfaces: ReadOnlyList and MutableList instead of List base class.*

*Use composition: UnmodifiableList wraps List instead of extending it.*

*Redesign hierarchy: Separate capabilities into distinct interfaces.*

*Cost of violating LSP—runtime exceptions, broken polymorphism, surprised clients—outweighs any design convenience. Better to have more interfaces than broken substitutability."*

---

## ────────────────────────────────────
## 6️⃣ Diagrams & Visual Patterns
## ────────────────────────────────────

### LSP Violation: Rectangle-Square

```
┌────────────────────────────────────────────────────────┐
│                    Rectangle                           │
│                                                        │
│  - width: int                                          │
│  - height: int                                         │
│                                                        │
│  + setWidth(int)   ← Sets width only                  │
│  + setHeight(int)  ← Sets height only                 │
│  + getArea(): int  → width × height                   │
└────────────────┬───────────────────────────────────────┘
                 │
                 │ extends (LSP VIOLATION!)
                 ▼
┌────────────────────────────────────────────────────────┐
│                    Square                              │
│                                                        │
│  + setWidth(int)   ← Sets BOTH width AND height       │
│  + setHeight(int)  ← Sets BOTH width AND height       │
│  + getArea(): int  → side × side                      │
└────────────────────────────────────────────────────────┘

Client code:
─────────────
Rectangle rect = new Square(5);
rect.setWidth(10);   // Square sets both to 10
rect.setHeight(5);   // Square sets both to 5
assert rect.getArea() == 50;  // ❌ FAILS! area = 25

Problem: Square changes Rectangle's behavior
         Square can't substitute Rectangle
```

### LSP-Compliant Design

```
                   ┌──────────────┐
                   │    Shape     │
                   │ (interface)  │
                   │              │
                   │ + getArea()  │
                   └──────┬───────┘
                          │
              ┌───────────┴────────────┐
              │                        │
              ▼                        ▼
     ┌────────────────┐      ┌────────────────┐
     │   Rectangle    │      │     Square     │
     │                │      │                │
     │ - width        │      │ - side         │
     │ - height       │      │                │
     │                │      │                │
     │ + getArea()    │      │ + getArea()    │
     │   → w × h      │      │   → s × s      │
     └────────────────┘      └────────────────┘

Client code:
─────────────
Shape shape1 = new Rectangle(10, 5);
shape1.getArea();  // ✓ 50

Shape shape2 = new Square(5);
shape2.getArea();  // ✓ 25

No LSP violation: No inheritance between Rectangle and Square
Both implement Shape, behavioral contracts separate and compatible
```

### LSP Violation: Bird Hierarchy

```
                   ┌──────────────┐
                   │     Bird     │
                   │              │
                   │ + eat()      │
                   │ + sleep()    │
                   │ + fly()      │ ← Problem!
                   └──────┬───────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ Sparrow │      │  Eagle  │      │ Penguin │
   │         │      │         │      │         │
   │ + fly() │      │ + fly() │      │ + fly() │
   │   ✓     │      │   ✓     │      │   ❌    │ throw Exception
   └─────────┘      └─────────┘      └─────────┘

Client code:
─────────────
void releaseBirds(List<Bird> birds) {
    for (Bird bird : birds) {
        bird.fly();  // ❌ Fails with Penguin!
    }
}

Problem: Penguin can't substitute Bird
         Penguin violates fly() contract
```

### LSP-Compliant Bird Hierarchy

```
                     ┌──────────────┐
                     │     Bird     │
                     │              │
                     │ + eat()      │
                     │ + sleep()    │
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │                           │
              ▼                           ▼
     ┌────────────────┐          ┌────────────────┐
     │  FlyingBird    │          │ SwimmingBird   │
     │                │          │                │
     │ + fly()        │          │ + swim()       │
     └────────┬───────┘          └────────┬───────┘
              │                           │
       ┌──────┴──────┐                   │
       │             │                   │
       ▼             ▼                   ▼
  ┌─────────┐  ┌─────────┐        ┌─────────┐
  │ Sparrow │  │  Eagle  │        │ Penguin │
  │         │  │         │        │         │
  │ + fly() │  │ + fly() │        │ + swim()│
  └─────────┘  └─────────┘        └─────────┘

Client code:
─────────────
void releaseFlyingBirds(List<FlyingBird> birds) {
    for (FlyingBird bird : birds) {
        bird.fly();  // ✓ Guaranteed to work!
    }
}

void releaseSwimmingBirds(List<SwimmingBird> birds) {
    for (SwimmingBird bird : birds) {
        bird.swim();  // ✓ Guaranteed to work!
    }
}

No LSP violation: Penguin never passed to releaseFlyingBirds
Type system enforces correct usage
```

---

## 🔟 Why & How Summary

### Why LSP Matters

**Polymorphism Reliability:**
- Code working with base type works with all subtypes
- No runtime surprises or unexpected exceptions
- Substitutability enables flexible design
- Interface contracts are trustworthy

**Code Quality:**
- Inheritance hierarchies make sense
- No "pretend" subclasses (Square pretending to be Rectangle)
- Methods do what their signatures promise
- Behavioral consistency across hierarchy

**Team Efficiency:**
- Developers trust parent class contracts
- Less defensive programming needed
- Fewer integration bugs
- Code reviews catch LSP violations early

**Business Value:**
- Reduces production bugs from substitution
- Enables safe refactoring (swap implementations)
- Supports A/B testing (different implementations)
- Makes codebases maintainable long-term

### How to Apply LSP

**Design Phase:**
1. Question inheritance: "Can child really do everything parent does?"
2. Design around capabilities, not classifications
3. Use composition when substitutability unclear
4. Define clear contracts (preconditions, postconditions, invariants)

**Implementation:**
1. Never throw UnsupportedOperationException
2. Maintain exception contracts (no new checked exceptions)
3. Don't strengthen preconditions
4. Don't weaken postconditions
5. Preserve invariants

**Testing:**
1. Write tests for parent class
2. Run same tests for all subclasses
3. All tests should pass (LSP verification)
4. If test needs to be skipped for subclass → LSP violation

**Code Review:**
1. Check instanceof usage (often indicates LSP violation)
2. Verify exception handling compatible
3. Confirm behavioral contracts maintained
4. Question inheritance relationships

### Interview Red Flags

🚫 "Square is a Rectangle in math, so Square extends Rectangle"
✅ "Behavioral compatibility matters more than conceptual relationships; use composition"

🚫 "It's okay to throw UnsupportedOperationException"
✅ "That's LSP violation; redesign hierarchy or use composition"

🚫 "LSP is about type compatibility"
✅ "LSP is about behavioral compatibility—contract preservation"

### Final Sound Bite

*"Liskov Substitution Principle ensures polymorphism works reliably. If my PaymentService works with PaymentProcessor interface, swapping StripeProcessor for PayPalProcessor must be transparent. Both accept same inputs, return same types, maintain same contracts—no surprises.*

*The Rectangle-Square problem teaches: mathematical 'is-a' doesn't mean code 'is-a'. Square can't substitute Rectangle because behavior is incompatible—setting width and height independently is Rectangle's contract, which Square breaks.*

*In production, LSP violations cause subtle bugs. CachedRepository returning null when parent returns non-null breaks clients expecting non-null. Penguin throwing exception on fly() breaks code iterating birds.*

*Solution: Design hierarchies around capabilities (FlyingBird, SwimmingBird), use composition (favor 'has-a' over 'is-a'), and verify substitutability with tests. If child can't do everything parent promises, wrong hierarchy. LSP is insurance against polymorphism surprises—it makes inheritance reliable."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
