# 168. Object-Oriented Design Basics (Encapsulation, Abstraction, Polymorphism, Inheritance)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Object-Oriented Programming (OOP)** is a programming paradigm based on the concept of "objects" that contain data (fields/attributes) and code (methods/behaviors). OOP is built on four fundamental pillars that enable developers to write maintainable, reusable, and scalable code.

### The Four Pillars of OOP

**1. Encapsulation**
- Bundling data and methods that operate on that data within a single unit (class)
- Hiding internal state and requiring interaction through public methods
- Protecting object integrity by controlling access to internal data
- "Information hiding" principle

**2. Abstraction**
- Hiding complex implementation details and showing only essential features
- Defining contracts through interfaces and abstract classes
- Separating "what" an object does from "how" it does it
- Reducing complexity by focusing on relevant information

**3. Polymorphism**
- "Many forms" - ability of objects to take multiple forms
- Same interface, different implementations
- Enables writing flexible and extensible code
- Two types: Compile-time (overloading) and Runtime (overriding)

**4. Inheritance**
- Mechanism where a new class derives properties and behaviors from an existing class
- Promotes code reuse through "IS-A" relationship
- Creates hierarchical class relationships
- Enables specialization and generalization

**Why OOP exists:**
- **Modularity**: Code organized into self-contained objects
- **Reusability**: Inherit and reuse existing code
- **Maintainability**: Changes localized to specific classes
- **Flexibility**: Polymorphism enables extensible designs
- **Security**: Encapsulation protects data integrity
- **Real-world modeling**: Objects represent real-world entities

**Where OOP is used:**
- Enterprise applications (Spring Boot, Java EE)
- Web frameworks (Django, Ruby on Rails)
- Mobile apps (Android, iOS)
- Game development (Unity, Unreal Engine)
- System software (databases, operating systems)
- Cloud services (AWS SDK, Azure libraries)

**Role in large-scale distributed systems:**
- Microservices modeled as objects with clear responsibilities
- API contracts defined through interfaces
- Domain-driven design using OOP principles
- Service abstractions hide implementation complexity
- Inheritance hierarchies for common service behaviors
- Polymorphic handling of different data sources and protocols

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 1️⃣ ENCAPSULATION

**Definition**: Bundling data (fields) and methods (functions) that operate on the data into a single unit (class), and restricting direct access to some of the object's components.

#### Core Concepts

**Access Modifiers:**
```java
public class BankAccount {
    // Private - only accessible within this class
    private String accountNumber;
    private double balance;
    
    // Protected - accessible within package and subclasses
    protected String accountType;
    
    // Public - accessible from anywhere
    public String getAccountNumber() {
        return accountNumber;
    }
    
    // Public method with validation (controlled access)
    public void deposit(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        this.balance += amount;
    }
    
    // Public method with business logic
    public boolean withdraw(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        if (amount > balance) {
            return false; // Insufficient funds
        }
        this.balance -= amount;
        return true;
    }
    
    // Private helper method (internal implementation)
    private void validateAccount() {
        // Internal validation logic
    }
}
```

**Why Encapsulation Matters:**
```java
// BAD: Direct field access
public class BadBankAccount {
    public double balance; // Anyone can modify!
}

// Client code can break business rules:
BadBankAccount account = new BadBankAccount();
account.balance = -1000; // Negative balance allowed! ❌

// GOOD: Encapsulated access
public class GoodBankAccount {
    private double balance;
    
    public void withdraw(double amount) {
        if (balance >= amount) {
            balance -= amount;
        } else {
            throw new InsufficientFundsException();
        }
    }
}

// Client code forced to follow rules:
GoodBankAccount account = new GoodBankAccount();
account.withdraw(1000); // Validation enforced ✓
```

#### Real-World Example: User Service

```java
@Service
public class UserService {
    // Encapsulated dependencies
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    
    // Constructor injection (Spring best practice)
    public UserService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        EmailService emailService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }
    
    // Public interface - WHAT it does
    public User createUser(UserRegistrationRequest request) {
        validateRequest(request);
        checkEmailUniqueness(request.getEmail());
        
        User user = buildUser(request);
        User savedUser = userRepository.save(user);
        
        sendWelcomeEmail(savedUser);
        
        return savedUser;
    }
    
    // Private methods - HOW it does it (encapsulated implementation)
    private void validateRequest(UserRegistrationRequest request) {
        if (request.getEmail() == null || !request.getEmail().contains("@")) {
            throw new ValidationException("Invalid email");
        }
        if (request.getPassword().length() < 8) {
            throw new ValidationException("Password too short");
        }
    }
    
    private void checkEmailUniqueness(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateEmailException("Email already exists");
        }
    }
    
    private User buildUser(UserRegistrationRequest request) {
        return User.builder()
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .createdAt(Instant.now())
            .status(UserStatus.ACTIVE)
            .build();
    }
    
    private void sendWelcomeEmail(User user) {
        emailService.sendWelcomeEmail(user.getEmail(), user.getFirstName());
    }
}
```

**Benefits:**
- Internal implementation can change without affecting clients
- Business rules enforced in one place
- Dependencies hidden from external code
- Easier to test (mock dependencies)

---

### 2️⃣ ABSTRACTION

**Definition**: Hiding complex implementation details and exposing only essential features. Abstraction focuses on WHAT an object does, not HOW it does it.

#### Abstraction through Interfaces

```java
// Payment abstraction - defines WHAT, not HOW
public interface PaymentProcessor {
    PaymentResult processPayment(PaymentRequest request);
    boolean refund(String transactionId, BigDecimal amount);
    PaymentStatus getStatus(String transactionId);
}

// Different implementations - HOW payment is processed
@Service
public class StripePaymentProcessor implements PaymentProcessor {
    
    private final StripeClient stripeClient;
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // Stripe-specific implementation
        ChargeRequest chargeRequest = buildStripeChargeRequest(request);
        Charge charge = stripeClient.charges().create(chargeRequest);
        
        return PaymentResult.builder()
            .transactionId(charge.getId())
            .status(mapStatus(charge.getStatus()))
            .build();
    }
    
    @Override
    public boolean refund(String transactionId, BigDecimal amount) {
        // Stripe refund logic
        Refund refund = stripeClient.refunds().create(transactionId, amount);
        return refund.getStatus().equals("succeeded");
    }
    
    @Override
    public PaymentStatus getStatus(String transactionId) {
        Charge charge = stripeClient.charges().retrieve(transactionId);
        return mapStatus(charge.getStatus());
    }
}

@Service
public class PayPalPaymentProcessor implements PaymentProcessor {
    
    private final PayPalClient paypalClient;
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // PayPal-specific implementation
        Payment payment = new Payment()
            .setIntent("sale")
            .setPayer(buildPayer(request))
            .setTransactions(buildTransactions(request));
        
        Payment createdPayment = payment.create(paypalClient.getContext());
        
        return PaymentResult.builder()
            .transactionId(createdPayment.getId())
            .status(mapPayPalStatus(createdPayment.getState()))
            .build();
    }
    
    @Override
    public boolean refund(String transactionId, BigDecimal amount) {
        // PayPal refund logic
        Sale sale = Sale.get(paypalClient.getContext(), transactionId);
        RefundRequest refundRequest = new RefundRequest();
        refundRequest.setAmount(new Amount("USD", amount.toString()));
        Refund refund = sale.refund(paypalClient.getContext(), refundRequest);
        return refund.getState().equals("completed");
    }
    
    @Override
    public PaymentStatus getStatus(String transactionId) {
        Payment payment = Payment.get(paypalClient.getContext(), transactionId);
        return mapPayPalStatus(payment.getState());
    }
}

// Client code works with abstraction, not concrete implementations
@Service
public class OrderService {
    
    private final PaymentProcessor paymentProcessor; // Abstraction
    
    public Order processOrder(OrderRequest request) {
        // Client doesn't know if it's Stripe or PayPal
        PaymentResult payment = paymentProcessor.processPayment(
            PaymentRequest.from(request)
        );
        
        if (payment.isSuccessful()) {
            return createOrder(request, payment);
        } else {
            throw new PaymentFailedException("Payment failed");
        }
    }
}
```

#### Abstraction through Abstract Classes

```java
// Template for all data processors
public abstract class DataProcessor {
    
    // Template method - defines workflow (abstraction)
    public final ProcessResult process() {
        try {
            connect();
            Data data = extract();
            Data transformed = transform(data);
            load(transformed);
            return ProcessResult.success();
        } catch (Exception e) {
            return handleError(e);
        } finally {
            cleanup();
        }
    }
    
    // Abstract methods - subclasses provide implementation
    protected abstract void connect();
    protected abstract Data extract();
    protected abstract Data transform(Data data);
    protected abstract void load(Data data);
    
    // Concrete method - common implementation
    protected ProcessResult handleError(Exception e) {
        logger.error("Processing failed", e);
        return ProcessResult.failure(e);
    }
    
    protected void cleanup() {
        // Default cleanup logic
    }
}

// Concrete implementation
public class CsvDataProcessor extends DataProcessor {
    
    @Override
    protected void connect() {
        // CSV-specific connection
    }
    
    @Override
    protected Data extract() {
        // CSV extraction logic
    }
    
    @Override
    protected Data transform(Data data) {
        // CSV transformation logic
    }
    
    @Override
    protected void load(Data data) {
        // Load to database
    }
}
```

**Benefits:**
- Client code depends on abstractions, not concrete implementations
- Easy to swap implementations (Stripe ↔ PayPal)
- Testability (mock interfaces)
- Flexibility and extensibility

---

### 3️⃣ POLYMORPHISM

**Definition**: The ability of objects to take multiple forms. Same interface/method behaves differently based on the object type.

#### Types of Polymorphism

**1. Compile-Time Polymorphism (Method Overloading)**

```java
public class Calculator {
    
    // Same method name, different parameters
    public int add(int a, int b) {
        return a + b;
    }
    
    public double add(double a, double b) {
        return a + b;
    }
    
    public int add(int a, int b, int c) {
        return a + b + c;
    }
    
    public String add(String a, String b) {
        return a + b;
    }
}

// Usage
Calculator calc = new Calculator();
calc.add(1, 2);           // Calls int version
calc.add(1.5, 2.5);       // Calls double version
calc.add(1, 2, 3);        // Calls three-parameter version
calc.add("Hello", "World"); // Calls String version
```

**2. Runtime Polymorphism (Method Overriding)**

```java
// Base class
public abstract class Notification {
    protected String recipient;
    protected String message;
    
    // Template method
    public final void send() {
        validate();
        doSend();
        logNotification();
    }
    
    // Abstract method - subclasses provide implementation
    protected abstract void doSend();
    
    protected void validate() {
        if (recipient == null || message == null) {
            throw new ValidationException("Recipient and message required");
        }
    }
    
    protected void logNotification() {
        logger.info("Notification sent to {}", recipient);
    }
}

// Concrete implementations
public class EmailNotification extends Notification {
    
    @Override
    protected void doSend() {
        // Email-specific sending logic
        emailService.send(recipient, subject, message);
    }
}

public class SmsNotification extends Notification {
    
    @Override
    protected void doSend() {
        // SMS-specific sending logic
        smsService.send(recipient, message);
    }
}

public class PushNotification extends Notification {
    
    @Override
    protected void doSend() {
        // Push notification logic
        pushService.send(recipient, message, badge, sound);
    }
}

// Polymorphic usage
@Service
public class NotificationService {
    
    public void notifyUser(User user, String message, NotificationType type) {
        // Polymorphism - same interface, different behavior
        Notification notification = createNotification(user, message, type);
        notification.send(); // Calls appropriate doSend() at runtime
    }
    
    private Notification createNotification(User user, String message, NotificationType type) {
        return switch (type) {
            case EMAIL -> new EmailNotification(user.getEmail(), message);
            case SMS -> new SmsNotification(user.getPhone(), message);
            case PUSH -> new PushNotification(user.getDeviceToken(), message);
        };
    }
}
```

#### Real-World Polymorphism: Payment Processing

```java
public interface PaymentStrategy {
    PaymentResult pay(Order order);
}

public class CreditCardPayment implements PaymentStrategy {
    
    @Override
    public PaymentResult pay(Order order) {
        // Credit card processing
        return processCreditCard(order);
    }
}

public class PayPalPayment implements PaymentStrategy {
    
    @Override
    public PaymentResult pay(Order order) {
        // PayPal processing
        return processPayPal(order);
    }
}

public class CryptoPayment implements PaymentStrategy {
    
    @Override
    public PaymentResult pay(Order order) {
        // Cryptocurrency processing
        return processCrypto(order);
    }
}

// Polymorphic usage
@RestController
public class CheckoutController {
    
    @PostMapping("/checkout")
    public ResponseEntity<PaymentResult> checkout(@RequestBody CheckoutRequest request) {
        // Polymorphism: Same interface, different implementations
        PaymentStrategy strategy = getPaymentStrategy(request.getPaymentMethod());
        PaymentResult result = strategy.pay(request.getOrder());
        
        return ResponseEntity.ok(result);
    }
    
    private PaymentStrategy getPaymentStrategy(PaymentMethod method) {
        return switch (method) {
            case CREDIT_CARD -> creditCardPayment;
            case PAYPAL -> paypalPayment;
            case CRYPTO -> cryptoPayment;
        };
    }
}
```

**Benefits:**
- Write code that works with base types, but operates on derived types
- Add new implementations without modifying existing code (Open-Closed Principle)
- Reduces if-else chains
- Enables Strategy pattern, Factory pattern

---

### 4️⃣ INHERITANCE

**Definition**: Mechanism where one class acquires properties (fields) and behaviors (methods) from another class. Creates "IS-A" relationship.

#### Basic Inheritance

```java
// Base class (Parent/Superclass)
public class Employee {
    protected String id;
    protected String name;
    protected String email;
    protected BigDecimal baseSalary;
    
    public Employee(String id, String name, String email, BigDecimal baseSalary) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.baseSalary = baseSalary;
    }
    
    // Common behavior for all employees
    public BigDecimal calculateSalary() {
        return baseSalary;
    }
    
    public void clockIn() {
        logger.info("Employee {} clocked in", name);
    }
    
    public String getDetails() {
        return String.format("ID: %s, Name: %s, Email: %s", id, name, email);
    }
}

// Derived class (Child/Subclass)
public class Manager extends Employee {
    private BigDecimal bonus;
    private int teamSize;
    
    public Manager(String id, String name, String email, BigDecimal baseSalary, BigDecimal bonus) {
        super(id, name, email, baseSalary); // Call parent constructor
        this.bonus = bonus;
    }
    
    // Override parent method - specialized behavior
    @Override
    public BigDecimal calculateSalary() {
        return baseSalary.add(bonus);
    }
    
    // New method specific to Manager
    public void conductPerformanceReview(Employee employee) {
        logger.info("Manager {} reviewing employee {}", name, employee.getName());
    }
    
    // Override and extend
    @Override
    public String getDetails() {
        return super.getDetails() + String.format(", Team Size: %d", teamSize);
    }
}

public class Developer extends Employee {
    private String programmingLanguage;
    private int linesOfCodeWritten;
    
    public Developer(String id, String name, String email, BigDecimal baseSalary, String language) {
        super(id, name, email, baseSalary);
        this.programmingLanguage = language;
    }
    
    @Override
    public BigDecimal calculateSalary() {
        // Developer salary includes bonus for code contribution
        BigDecimal codeBonus = BigDecimal.valueOf(linesOfCodeWritten * 0.01);
        return baseSalary.add(codeBonus);
    }
    
    public void writeCode() {
        logger.info("Developer {} writing {} code", name, programmingLanguage);
        linesOfCodeWritten++;
    }
}

// Usage - Polymorphism through inheritance
public class PayrollService {
    
    public void processPayroll(List<Employee> employees) {
        for (Employee employee : employees) {
            // Polymorphic call - each subclass has its own implementation
            BigDecimal salary = employee.calculateSalary();
            
            // Pay employee
            paymentService.pay(employee.getId(), salary);
            
            logger.info("Paid {} to {}", salary, employee.getName());
        }
    }
}

// All these are valid due to inheritance (IS-A relationship)
Employee emp1 = new Employee("E001", "John", "john@example.com", new BigDecimal("50000"));
Employee emp2 = new Manager("M001", "Jane", "jane@example.com", new BigDecimal("80000"), new BigDecimal("20000"));
Employee emp3 = new Developer("D001", "Bob", "bob@example.com", new BigDecimal("70000"), "Java");

List<Employee> employees = List.of(emp1, emp2, emp3);
payrollService.processPayroll(employees); // Polymorphic behavior
```

#### Multilevel Inheritance

```java
// Level 1: Base class
public class Vehicle {
    protected String brand;
    protected String model;
    protected int year;
    
    public void start() {
        logger.info("Vehicle starting...");
    }
    
    public void stop() {
        logger.info("Vehicle stopping...");
    }
}

// Level 2: Intermediate class
public class Car extends Vehicle {
    protected int numberOfDoors;
    protected String fuelType;
    
    @Override
    public void start() {
        logger.info("Car engine starting...");
    }
    
    public void honk() {
        logger.info("Car honking!");
    }
}

// Level 3: Specialized class
public class ElectricCar extends Car {
    private int batteryCapacity;
    private int range;
    
    @Override
    public void start() {
        logger.info("Electric car silently starting...");
    }
    
    public void charge() {
        logger.info("Charging battery...");
    }
    
    public int getRemainingRange() {
        return range;
    }
}

// Usage
ElectricCar tesla = new ElectricCar();
tesla.start();    // From ElectricCar (overridden)
tesla.honk();     // From Car (inherited)
tesla.stop();     // From Vehicle (inherited)
tesla.charge();   // From ElectricCar (specific)
```

#### Interface Inheritance (Multiple Inheritance)

Java doesn't support multiple class inheritance, but supports multiple interface inheritance:

```java
// Multiple interfaces
public interface Flyable {
    void fly();
    int getMaxAltitude();
}

public interface Swimmable {
    void swim();
    int getMaxDepth();
}

// Class implementing multiple interfaces
public class Duck implements Flyable, Swimmable {
    
    @Override
    public void fly() {
        logger.info("Duck flying...");
    }
    
    @Override
    public int getMaxAltitude() {
        return 5000; // feet
    }
    
    @Override
    public void swim() {
        logger.info("Duck swimming...");
    }
    
    @Override
    public int getMaxDepth() {
        return 10; // feet
    }
    
    public void quack() {
        logger.info("Quack!");
    }
}

// Usage
Duck duck = new Duck();
duck.fly();   // From Flyable
duck.swim();  // From Swimmable
duck.quack(); // Duck-specific

// Polymorphism with interfaces
Flyable flyingObject = new Duck();
flyingObject.fly();

Swimmable swimmingObject = new Duck();
swimmingObject.swim();
```

#### Composition over Inheritance

**Problem with deep inheritance:**
```java
// BAD: Deep inheritance hierarchy
class Animal { }
class Mammal extends Animal { }
class Dog extends Mammal { }
class GoldenRetriever extends Dog { }
// Changes to Animal affect all subclasses!
```

**Better: Composition**
```java
// GOOD: Composition
public class Dog {
    private final Movement movement;      // Composition
    private final Sound sound;            // Composition
    private final Behavior behavior;      // Composition
    
    public Dog(Movement movement, Sound sound, Behavior behavior) {
        this.movement = movement;
        this.sound = sound;
        this.behavior = behavior;
    }
    
    public void move() {
        movement.move(); // Delegate
    }
    
    public void makeSound() {
        sound.makeSound(); // Delegate
    }
    
    public void behave() {
        behavior.behave(); // Delegate
    }
}

// Flexible composition
Dog serviceDog = new Dog(
    new Walking(),
    new Barking(),
    new CalmBehavior()
);

Dog guardDog = new Dog(
    new Running(),
    new LoudBarking(),
    new AggressiveBehavior()
);
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Object Memory Footprint

**Java Object Memory Layout:**
```
Object overhead: 12-16 bytes (header)
Reference: 4-8 bytes (compressed oops vs regular)
int: 4 bytes
long: 8 bytes
double: 8 bytes
boolean: 1 byte (but often padded to 4 bytes)
String: 40 bytes + (2 bytes * length)
```

**Example: User Object**
```java
public class User {
    private Long id;              // 8 bytes
    private String email;         // 40 + (2 * 20) = 80 bytes
    private String firstName;     // 40 + (2 * 10) = 60 bytes
    private String lastName;      // 40 + (2 * 10) = 60 bytes
    private LocalDateTime created; // 24 bytes
    private boolean active;       // 4 bytes (padded)
}

Total per User: 16 (header) + 8 + 80 + 60 + 60 + 24 + 4 = 252 bytes
```

**Capacity Planning for 10M Users:**
```
10,000,000 users * 252 bytes = 2,520,000,000 bytes
= 2.52 GB for user objects alone

With:
- Collections overhead (ArrayList, HashMap): +20%
- JVM overhead (GC, metaspace): +30%
- Object references and pointers: +10%

Total memory: 2.52 GB * 1.6 = 4 GB minimum heap
Recommended: 8 GB heap (50% headroom for GC)
```

### Polymorphic Method Call Overhead

**Virtual Method Dispatch:**
```
Direct method call: ~1 nanosecond
Virtual method call: ~3-5 nanoseconds
Interface call: ~5-10 nanoseconds (JIT optimization helps)

For 1M method calls/second:
- Direct: 1ms CPU time
- Virtual: 3-5ms CPU time
- Interface: 5-10ms CPU time

At scale (1 billion calls/day):
Negligible overhead (<1 second difference)
```

**JIT Optimization:**
Modern JVMs (HotSpot) optimize polymorphic calls through:
- Method inlining
- Monomorphic call optimization
- Bimorphic call caching
- Polymorphic inline cache (PIC)

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Object-Relational Mapping (ORM)

**Table Per Class Hierarchy:**
```sql
-- Single table inheritance
CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    employee_type VARCHAR(50) NOT NULL, -- 'MANAGER', 'DEVELOPER', 'DESIGNER'
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    base_salary DECIMAL(10, 2) NOT NULL,
    
    -- Manager-specific columns
    bonus DECIMAL(10, 2),
    team_size INT,
    
    -- Developer-specific columns
    programming_language VARCHAR(50),
    lines_of_code INT,
    
    -- Designer-specific columns
    design_tool VARCHAR(50),
    projects_count INT,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_type ON employees(employee_type);
```

**Table Per Subclass:**
```sql
-- Base table
CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    base_salary DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Manager table
CREATE TABLE managers (
    id BIGINT PRIMARY KEY REFERENCES employees(id),
    bonus DECIMAL(10, 2) NOT NULL,
    team_size INT NOT NULL
);

-- Developer table
CREATE TABLE developers (
    id BIGINT PRIMARY KEY REFERENCES employees(id),
    programming_language VARCHAR(50) NOT NULL,
    lines_of_code INT DEFAULT 0
);

-- Designer table
CREATE TABLE designers (
    id BIGINT PRIMARY KEY REFERENCES employees(id),
    design_tool VARCHAR(50) NOT NULL,
    projects_count INT DEFAULT 0
);
```

**JPA Mapping:**
```java
// Single Table Inheritance
@Entity
@Table(name = "employees")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "employee_type", discriminatorType = DiscriminatorType.STRING)
public abstract class Employee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String email;
    private BigDecimal baseSalary;
}

@Entity
@DiscriminatorValue("MANAGER")
public class Manager extends Employee {
    private BigDecimal bonus;
    private Integer teamSize;
}

@Entity
@DiscriminatorValue("DEVELOPER")
public class Developer extends Employee {
    private String programmingLanguage;
    private Integer linesOfCode;
}

// Joined Table Inheritance
@Entity
@Table(name = "employees")
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class Employee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String email;
    private BigDecimal baseSalary;
}

@Entity
@Table(name = "managers")
@PrimaryKeyJoinColumn(name = "id")
public class Manager extends Employee {
    private BigDecimal bonus;
    private Integer teamSize;
}
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Thread-Safe Encapsulation

```java
// Thread-safe encapsulated counter
public class ThreadSafeCounter {
    private final AtomicInteger count = new AtomicInteger(0);
    
    // Thread-safe increment
    public int increment() {
        return count.incrementAndGet();
    }
    
    // Thread-safe read
    public int getCount() {
        return count.get();
    }
}

// Thread-safe encapsulated account
public class ThreadSafeBankAccount {
    private final Object lock = new Object();
    private BigDecimal balance;
    
    public boolean withdraw(BigDecimal amount) {
        synchronized (lock) {
            if (balance.compareTo(amount) >= 0) {
                balance = balance.subtract(amount);
                return true;
            }
            return false;
        }
    }
    
    public void deposit(BigDecimal amount) {
        synchronized (lock) {
            balance = balance.add(amount);
        }
    }
    
    public BigDecimal getBalance() {
        synchronized (lock) {
            return balance;
        }
    }
}
```

### Polymorphic Service Discovery

```java
// Service abstraction
public interface NotificationService {
    void send(String recipient, String message);
}

// Multiple implementations
@Service("emailNotification")
public class EmailNotificationService implements NotificationService {
    @Override
    public void send(String recipient, String message) {
        // Email implementation
    }
}

@Service("smsNotification")
public class SmsNotificationService implements NotificationService {
    @Override
    public void send(String recipient, String message) {
        // SMS implementation
    }
}

// Dynamic service selection
@Service
public class NotificationOrchestrator {
    
    private final Map<String, NotificationService> services;
    
    @Autowired
    public NotificationOrchestrator(Map<String, NotificationService> services) {
        this.services = services;
    }
    
    public void notify(String recipient, String message, String channel) {
        NotificationService service = services.get(channel + "Notification");
        
        if (service != null) {
            service.send(recipient, message);
        } else {
            throw new UnsupportedChannelException("Channel not supported: " + channel);
        }
    }
}
```

### Inheritance for Retry Logic

```java
public abstract class ResilientService {
    
    protected final int maxRetries = 3;
    protected final Duration retryDelay = Duration.ofSeconds(2);
    
    // Template method with retry logic
    public <T> T executeWithRetry(Supplier<T> operation) {
        int attempt = 0;
        Exception lastException = null;
        
        while (attempt < maxRetries) {
            try {
                return operation.get();
            } catch (TransientException e) {
                lastException = e;
                attempt++;
                
                if (attempt < maxRetries) {
                    sleep(retryDelay.multipliedBy(attempt));
                }
            }
        }
        
        throw new ServiceException("Operation failed after " + maxRetries + " attempts", lastException);
    }
}

// Concrete service inherits retry logic
@Service
public class OrderService extends ResilientService {
    
    @Autowired
    private OrderRepository orderRepository;
    
    public Order createOrder(OrderRequest request) {
        return executeWithRetry(() -> {
            return orderRepository.save(Order.from(request));
        });
    }
}
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Encapsulation for Security

```java
// Secure user credentials
public class UserCredentials {
    private final String username;
    private final char[] password; // char[] instead of String (more secure)
    
    public UserCredentials(String username, char[] password) {
        this.username = username;
        this.password = password.clone(); // Defensive copy
    }
    
    public String getUsername() {
        return username;
    }
    
    // No getter for password!
    
    public boolean authenticate(char[] inputPassword) {
        try {
            return Arrays.equals(password, inputPassword);
        } finally {
            // Clear input password from memory
            Arrays.fill(inputPassword, '\0');
        }
    }
    
    // Clear sensitive data when done
    public void clear() {
        Arrays.fill(password, '\0');
    }
}
```

### Abstraction for API Versioning

```java
// API abstraction
public interface UserApi {
    UserResponse getUser(Long id);
    UserResponse createUser(UserRequest request);
}

// V1 implementation
@RestController
@RequestMapping("/api/v1/users")
public class UserApiV1 implements UserApi {
    
    @GetMapping("/{id}")
    public UserResponse getUser(@PathVariable Long id) {
        // V1 response format
    }
    
    @PostMapping
    public UserResponse createUser(@RequestBody UserRequest request) {
        // V1 creation logic
    }
}

// V2 implementation (different response format)
@RestController
@RequestMapping("/api/v2/users")
public class UserApiV2 implements UserApi {
    
    @GetMapping("/{id}")
    public UserResponse getUser(@PathVariable Long id) {
        // V2 response format (includes additional fields)
    }
    
    @PostMapping
    public UserResponse createUser(@RequestBody UserRequest request) {
        // V2 creation logic (additional validation)
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Example 1: Spring Framework (All Four Pillars)

**Encapsulation:**
```java
@Service
public class UserService {
    // Encapsulated dependencies
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    // Constructor injection (best practice)
    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }
    
    // Public API
    public User createUser(UserDto dto) {
        // Private validation
        validateUser(dto);
        
        // Private transformation
        User user = toEntity(dto);
        
        return userRepository.save(user);
    }
    
    // Private implementation details
    private void validateUser(UserDto dto) { }
    private User toEntity(UserDto dto) { }
}
```

**Abstraction:**
```java
// Spring Data abstracts database operations
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByStatus(UserStatus status);
}

// You don't write SQL - abstraction handles it!
```

**Polymorphism:**
```java
// Multiple DataSource implementations
public interface DataSource {
    Connection getConnection() throws SQLException;
}

// HikariCP implementation
public class HikariDataSource implements DataSource { }

// Apache DBCP implementation
public class BasicDataSource implements DataSource { }

// Spring can inject any implementation
@Autowired
private DataSource dataSource; // Polymorphic reference
```

**Inheritance:**
```java
// Spring's exception hierarchy
public class DataAccessException extends RuntimeException { }
public class DataIntegrityViolationException extends DataAccessException { }
public class DuplicateKeyException extends DataIntegrityViolationException { }

// You can catch at any level
try {
    userRepository.save(user);
} catch (DuplicateKeyException e) {
    // Handle duplicate key
} catch (DataIntegrityViolationException e) {
    // Handle other integrity violations
} catch (DataAccessException e) {
    // Handle all data access errors
}
```

### Example 2: Collections Framework

**Encapsulation:**
```java
public class ArrayList<E> {
    private Object[] elementData; // Encapsulated array
    private int size;             // Encapsulated size
    
    public boolean add(E element) {
        // Controlled access with validation
        ensureCapacity();
        elementData[size++] = element;
        return true;
    }
    
    private void ensureCapacity() {
        // Private implementation detail
    }
}
```

**Abstraction:**
```java
// List abstraction
List<String> list; // Abstract interface

// Different implementations
list = new ArrayList<>();    // Fast random access
list = new LinkedList<>();   // Fast insertion/deletion
list = new CopyOnWriteArrayList<>(); // Thread-safe

// Client code works with abstraction
for (String item : list) {
    System.out.println(item); // Same for all implementations
}
```

**Polymorphism:**
```java
public void processCollection(Collection<String> items) {
    for (String item : items) {
        process(item);
    }
}

// Works with any Collection implementation
processCollection(new ArrayList<>());
processCollection(new HashSet<>());
processCollection(new LinkedList<>());
```

**Inheritance:**
```java
// Collection hierarchy
interface Collection<E> { }
interface List<E> extends Collection<E> { }
interface Set<E> extends Collection<E> { }

// Concrete implementations inherit behaviors
class ArrayList<E> implements List<E> { }
class HashSet<E> implements Set<E> { }
```

### Example 3: Payment Processing System (Real Production)

```java
// Abstraction - Payment processor interface
public interface PaymentProcessor {
    PaymentResult process(PaymentRequest request);
    boolean supportsPaymentMethod(PaymentMethod method);
}

// Inheritance & Polymorphism - Base class for common logic
public abstract class BasePaymentProcessor implements PaymentProcessor {
    
    @Autowired
    protected PaymentRepository paymentRepository;
    
    @Autowired
    protected MetricsService metrics;
    
    // Template method (inheritance)
    @Override
    public PaymentResult process(PaymentRequest request) {
        try {
            validate(request);
            PaymentResult result = doProcess(request);
            savePayment(result);
            recordMetrics(result);
            return result;
        } catch (Exception e) {
            return handleError(e);
        }
    }
    
    // Abstract method for subclasses
    protected abstract PaymentResult doProcess(PaymentRequest request);
    
    // Common validation (inheritance)
    protected void validate(PaymentRequest request) {
        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Amount must be positive");
        }
    }
    
    // Encapsulation - private helper methods
    private void savePayment(PaymentResult result) {
        Payment payment = Payment.from(result);
        paymentRepository.save(payment);
    }
    
    private void recordMetrics(PaymentResult result) {
        metrics.recordPayment(getClass().getSimpleName(), result.getStatus());
    }
}

// Concrete implementations (Polymorphism)
@Service("stripeProcessor")
public class StripePaymentProcessor extends BasePaymentProcessor {
    
    @Autowired
    private StripeClient stripeClient;
    
    @Override
    protected PaymentResult doProcess(PaymentRequest request) {
        // Stripe-specific logic
        Charge charge = stripeClient.charges().create(
            ChargeRequest.builder()
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .source(request.getToken())
                .build()
        );
        
        return PaymentResult.success(charge.getId());
    }
    
    @Override
    public boolean supportsPaymentMethod(PaymentMethod method) {
        return method == PaymentMethod.CREDIT_CARD;
    }
}

@Service("paypalProcessor")
public class PayPalPaymentProcessor extends BasePaymentProcessor {
    
    @Autowired
    private PayPalClient paypalClient;
    
    @Override
    protected PaymentResult doProcess(PaymentRequest request) {
        // PayPal-specific logic
        Payment payment = paypalClient.createPayment(request);
        return PaymentResult.success(payment.getId());
    }
    
    @Override
    public boolean supportsPaymentMethod(PaymentMethod method) {
        return method == PaymentMethod.PAYPAL;
    }
}

// Factory with polymorphic selection
@Service
public class PaymentProcessorFactory {
    
    private final Map<String, PaymentProcessor> processors;
    
    @Autowired
    public PaymentProcessorFactory(List<PaymentProcessor> processorList) {
        this.processors = processorList.stream()
            .collect(Collectors.toMap(
                processor -> processor.getClass().getSimpleName(),
                processor -> processor
            ));
    }
    
    public PaymentProcessor getProcessor(PaymentMethod method) {
        return processors.values().stream()
            .filter(processor -> processor.supportsPaymentMethod(method))
            .findFirst()
            .orElseThrow(() -> new UnsupportedPaymentMethodException(method));
    }
}

// Usage in controller
@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    
    @Autowired
    private PaymentProcessorFactory factory;
    
    @PostMapping
    public ResponseEntity<PaymentResult> processPayment(@RequestBody PaymentRequest request) {
        // Polymorphic call - runtime determination of processor
        PaymentProcessor processor = factory.getProcessor(request.getPaymentMethod());
        PaymentResult result = processor.process(request);
        
        return ResponseEntity.ok(result);
    }
}
```

**Production Scale:**
- Processes 1M+ transactions/day
- Supports 5+ payment methods (Stripe, PayPal, Crypto, Bank Transfer, Apple Pay)
- Easy to add new payment processors without modifying existing code
- Common logic (validation, persistence, metrics) inherited by all processors
- Encapsulation protects sensitive payment data
- Abstraction allows swapping processors based on region, cost, availability

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Crisp Interview Answer

**"Explain the four pillars of OOP":**

*"The four pillars of Object-Oriented Programming are Encapsulation, Abstraction, Polymorphism, and Inheritance.*

***Encapsulation** bundles data and methods into a class and restricts direct access to internal state. For example, in a BankAccount class, I make the balance field private and provide public deposit/withdraw methods that enforce business rules. This protects data integrity and hides implementation details.*

***Abstraction** hides complexity and shows only essential features. I use interfaces and abstract classes to define contracts. For instance, I have a PaymentProcessor interface that defines process() method—clients don't need to know if it's Stripe or PayPal underneath.*

***Polymorphism** allows objects to take multiple forms. The same interface behaves differently based on the implementation. I use it extensively in payment processing—the same process() method works differently for CreditCardPayment, PayPalPayment, and CryptoPayment. This eliminates if-else chains and follows the Open-Closed Principle.*

***Inheritance** enables code reuse through IS-A relationships. I have a base Employee class with common fields like name and salary, and specialized classes like Manager and Developer that inherit these fields and add their own. However, I prefer composition over deep inheritance hierarchies.*

*At scale, these principles enable modularity, testability, and maintainability. In my payment system handling 1M+ transactions daily, polymorphism lets me add new payment methods without touching existing code, and encapsulation ensures transaction data integrity."*

### Common Follow-Up Questions

**Q1: "What's the difference between Encapsulation and Abstraction?"**

| Aspect | Encapsulation | Abstraction |
|--------|---------------|-------------|
| **Purpose** | Data hiding & protection | Complexity hiding |
| **Focus** | Implementation details | Essential features |
| **Achieved by** | Access modifiers (private, protected) | Interfaces, abstract classes |
| **Example** | Private fields with public getters/setters | Interface defining contract |
| **Benefit** | Data integrity, controlled access | Flexibility, loose coupling |

**Example:**
```java
// Encapsulation: Hide internal state
public class BankAccount {
    private double balance; // Hidden
    
    public void deposit(double amount) {
        if (amount > 0) {
            balance += amount; // Controlled access
        }
    }
}

// Abstraction: Hide implementation complexity
public interface PaymentProcessor {
    PaymentResult process(Payment payment); // What, not how
}

class StripeProcessor implements PaymentProcessor {
    public PaymentResult process(Payment payment) {
        // Complex Stripe API calls hidden
    }
}
```

**Answer:** *"Encapsulation is about hiding internal state using access modifiers—making fields private and providing public methods for controlled access. Abstraction is about hiding implementation complexity using interfaces and abstract classes—defining what an object does without exposing how it does it. Encapsulation protects data, abstraction provides flexibility."*

**Q2: "When should you use Inheritance vs Composition?"**

```java
// AVOID: Inheritance for code reuse
class Stack extends ArrayList {
    // Inherits 20+ methods you don't want exposed!
    // push(), pop() mixed with add(), remove(), get()
}

// BETTER: Composition
class Stack {
    private List<Object> elements = new ArrayList<>(); // HAS-A
    
    public void push(Object item) {
        elements.add(item);
    }
    
    public Object pop() {
        return elements.remove(elements.size() - 1);
    }
    
    // Only expose what you need
}

// USE Inheritance for IS-A relationship
abstract class Employee {
    protected String name;
    protected BigDecimal salary;
    
    public abstract BigDecimal calculateBonus();
}

class Manager extends Employee { // Manager IS-A Employee
    public BigDecimal calculateBonus() {
        return salary.multiply(new BigDecimal("0.2"));
    }
}
```

**Decision Tree:**
```
Is there a clear IS-A relationship?
├─ Yes → Consider Inheritance
│   └─ Is the parent class stable (won't change often)?
│       ├─ Yes → Use Inheritance
│       └─ No → Use Composition
└─ No → Use Composition
```

**Answer:** *"Use inheritance for true IS-A relationships where subclass is a specialized version of parent (Manager IS-A Employee). Use composition for HAS-A relationships and code reuse (Stack HAS-A List). Prefer composition over inheritance because it's more flexible—you can change behavior at runtime and avoid tight coupling. Inheritance should model domain relationships, not be a mechanism for code reuse."*

**Q3: "How does Polymorphism improve code quality?"**

**Before Polymorphism (Code Smell):**
```java
public void processPayment(Payment payment) {
    if (payment.getType() == PaymentType.CREDIT_CARD) {
        // 50 lines of credit card logic
        Charge charge = stripeClient.createCharge(...);
        // ...
    } else if (payment.getType() == PaymentType.PAYPAL) {
        // 50 lines of PayPal logic
        PayPalPayment pp = paypalClient.createPayment(...);
        // ...
    } else if (payment.getType() == PaymentType.CRYPTO) {
        // 50 lines of crypto logic
        Transaction tx = cryptoClient.sendTransaction(...);
        // ...
    }
    // Every new payment method requires modifying this method!
}
```

**After Polymorphism (Clean):**
```java
public interface PaymentStrategy {
    PaymentResult process(Payment payment);
}

public void processPayment(Payment payment) {
    PaymentStrategy strategy = getStrategy(payment.getType());
    return strategy.process(payment); // Polymorphic call
}

// Add new payment method without touching existing code
class ApplePayStrategy implements PaymentStrategy {
    public PaymentResult process(Payment payment) {
        // Apple Pay logic
    }
}
```

**Benefits:**
- ✅ Open-Closed Principle (open for extension, closed for modification)
- ✅ Eliminates long if-else chains
- ✅ Each strategy tested independently
- ✅ Easy to add new implementations
- ✅ Loose coupling

**Answer:** *"Polymorphism eliminates conditional complexity by replacing if-else chains with polymorphic behavior. Each implementation is in its own class, making code more maintainable and testable. When I need to add a new payment method, I create a new class implementing the interface—no modification to existing code. This follows the Open-Closed Principle and makes the system more extensible."*

**Q4: "What are the downsides of OOP?"**

**Downsides:**

1. **Performance Overhead**
```java
// Virtual method call has slight overhead
PaymentProcessor processor = getProcessor(); // Lookup at runtime
processor.process(payment); // Virtual dispatch

// vs Direct call (faster, but less flexible)
StripeProcessor processor = new StripeProcessor();
processor.process(payment);
```

2. **Complexity**
```java
// Deep inheritance hierarchies are hard to understand
Animal → Mammal → Carnivore → Feline → Cat → HouseCat → Siamese
// What behaviors does Siamese have? Need to check 7 classes!
```

3. **Memory Overhead**
```java
// Each object has header overhead (12-16 bytes)
// 1M small objects = 12-16 MB just for headers

// Compare with primitive arrays (no overhead)
int[] numbers = new int[1000000]; // Just 4MB
```

4. **Tight Coupling via Inheritance**
```java
// Changes to parent affect all children
class BaseService {
    public void process() {
        // Change this method → breaks 50 subclasses
    }
}
```

**When to avoid OOP:**
- Performance-critical systems (game engines, trading systems)
- Simple scripts and utilities
- Data transformation pipelines (functional programming better)
- Embedded systems with memory constraints

**Answer:** *"OOP has overhead—virtual method calls are slower than direct calls, objects consume memory for headers, and deep inheritance hierarchies are hard to maintain. For performance-critical code like high-frequency trading, I prefer data-oriented design. For simple utilities, functional programming is cleaner. OOP shines in complex business applications with changing requirements where maintainability and extensibility matter more than raw performance."*

**Q5: "How do you refactor procedural code to OOP?"**

**Procedural (Before):**
```java
public class OrderProcessor {
    
    public void processOrder(Order order) {
        // 500 lines of procedural code
        
        // Validate order
        if (order.getItems().isEmpty()) {
            throw new ValidationException("No items");
        }
        
        // Calculate total
        double total = 0;
        for (Item item : order.getItems()) {
            total += item.getPrice() * item.getQuantity();
        }
        
        // Apply discount
        if (order.hasDiscountCode()) {
            total = total * 0.9;
        }
        
        // Process payment
        if (order.getPaymentMethod() == PaymentMethod.CREDIT_CARD) {
            // 50 lines
        } else if (order.getPaymentMethod() == PaymentMethod.PAYPAL) {
            // 50 lines
        }
        
        // Update inventory
        for (Item item : order.getItems()) {
            int current = inventory.get(item.getId());
            inventory.put(item.getId(), current - item.getQuantity());
        }
        
        // Send email
        String email = buildEmail(order);
        emailService.send(order.getEmail(), email);
    }
}
```

**OOP (After):**
```java
// 1. Extract validators
public class OrderValidator {
    public void validate(Order order) {
        if (order.getItems().isEmpty()) {
            throw new ValidationException("No items");
        }
    }
}

// 2. Extract calculation logic
public class PriceCalculator {
    public BigDecimal calculate(Order order) {
        BigDecimal total = order.getItems().stream()
            .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        return applyDiscount(total, order.getDiscountCode());
    }
}

// 3. Polymorphic payment processing
public interface PaymentStrategy {
    PaymentResult process(Order order);
}

public class CreditCardPayment implements PaymentStrategy {
    public PaymentResult process(Order order) {
        // Credit card logic
    }
}

// 4. Extract inventory management
public class InventoryManager {
    public void updateInventory(List<Item> items) {
        items.forEach(item -> {
            inventoryRepository.decrementStock(item.getId(), item.getQuantity());
        });
    }
}

// 5. Extract notification
public class OrderNotifier {
    public void notifyCustomer(Order order) {
        String email = emailBuilder.build(order);
        emailService.send(order.getEmail(), email);
    }
}

// 6. Orchestrate with OOP
@Service
public class OrderService {
    private final OrderValidator validator;
    private final PriceCalculator calculator;
    private final PaymentStrategyFactory paymentFactory;
    private final InventoryManager inventory;
    private final OrderNotifier notifier;
    
    public void processOrder(Order order) {
        validator.validate(order);
        
        BigDecimal total = calculator.calculate(order);
        order.setTotal(total);
        
        PaymentStrategy payment = paymentFactory.getStrategy(order.getPaymentMethod());
        PaymentResult result = payment.process(order);
        
        if (result.isSuccessful()) {
            inventory.updateInventory(order.getItems());
            notifier.notifyCustomer(order);
        }
    }
}
```

**Refactoring Steps:**
1. Identify distinct responsibilities (SRP)
2. Extract each responsibility into a class
3. Use interfaces for varying behaviors (payments)
4. Inject dependencies (Spring DI)
5. Keep orchestration simple

**Answer:** *"I refactor procedural code to OOP by identifying distinct responsibilities and extracting them into classes. Each class should have a single responsibility. For varying behaviors like payment processing, I use interfaces and polymorphism. The main service class becomes an orchestrator that delegates to specialized classes. This improves testability—I can mock each dependency—and maintainability—each class is small and focused."*

**Q6: "Real interview question: Design a parking lot system using OOP"**

```java
// Encapsulation: Hide internal state
public class ParkingLot {
    private final Map<String, ParkingSpot> spots;
    private final int capacity;
    
    public ParkingLot(int capacity) {
        this.capacity = capacity;
        this.spots = new ConcurrentHashMap<>();
    }
    
    public synchronized Optional<ParkingSpot> findAvailableSpot(VehicleType type) {
        return spots.values().stream()
            .filter(spot -> spot.isAvailable())
            .filter(spot -> spot.canFit(type))
            .findFirst();
    }
    
    public synchronized Ticket parkVehicle(Vehicle vehicle) {
        Optional<ParkingSpot> spot = findAvailableSpot(vehicle.getType());
        
        if (spot.isEmpty()) {
            throw new NoSpotAvailableException();
        }
        
        ParkingSpot parkingSpot = spot.get();
        parkingSpot.assignVehicle(vehicle);
        
        return Ticket.create(vehicle, parkingSpot);
    }
}

// Abstraction: Vehicle types
public abstract class Vehicle {
    protected String licensePlate;
    protected VehicleType type;
    
    public abstract VehicleType getType();
}

// Inheritance: Specialized vehicles
public class Car extends Vehicle {
    @Override
    public VehicleType getType() {
        return VehicleType.CAR;
    }
}

public class Motorcycle extends Vehicle {
    @Override
    public VehicleType getType() {
        return VehicleType.MOTORCYCLE;
    }
}

public class Truck extends Vehicle {
    @Override
    public VehicleType getType() {
        return VehicleType.TRUCK;
    }
}

// Polymorphism: Different pricing strategies
public interface PricingStrategy {
    BigDecimal calculateFee(Duration parkedDuration);
}

public class HourlyPricing implements PricingStrategy {
    private final BigDecimal hourlyRate;
    
    @Override
    public BigDecimal calculateFee(Duration duration) {
        long hours = duration.toHours();
        return hourlyRate.multiply(BigDecimal.valueOf(hours));
    }
}

public class FlatRatePricing implements PricingStrategy {
    private final BigDecimal flatRate;
    
    @Override
    public BigDecimal calculateFee(Duration duration) {
        return flatRate;
    }
}

// Encapsulation: Parking spot
public class ParkingSpot {
    private final String id;
    private final SpotSize size;
    private Vehicle currentVehicle;
    private boolean isOccupied;
    
    public synchronized boolean isAvailable() {
        return !isOccupied;
    }
    
    public synchronized void assignVehicle(Vehicle vehicle) {
        if (isOccupied) {
            throw new SpotOccupiedException();
        }
        this.currentVehicle = vehicle;
        this.isOccupied = true;
    }
    
    public synchronized void releaseVehicle() {
        this.currentVehicle = null;
        this.isOccupied = false;
    }
    
    public boolean canFit(VehicleType type) {
        return size.canAccommodate(type);
    }
}
```

**Answer:** *"I'd design the parking lot using all four OOP pillars. Encapsulation protects the internal state of ParkingLot and ParkingSpot with synchronized methods for thread safety. Abstraction defines Vehicle as an abstract class with concrete implementations for Car, Motorcycle, and Truck. Polymorphism enables different PricingStrategy implementations that can be swapped at runtime. Inheritance creates a vehicle hierarchy where specialized vehicles inherit common properties. This design is extensible—I can add new vehicle types or pricing strategies without modifying existing code."*

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### The Four Pillars Visualized

```
┌─────────────────────────────────────────────────────────────────┐
│                     OBJECT-ORIENTED PROGRAMMING                 │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼──────┐     ┌──────▼───────┐     ┌────▼─────┐
    │ENCAPSULATION│    │ ABSTRACTION  │     │POLYMORPHISM│
    │             │    │              │     │            │
    │ Data Hiding │    │ Hide Complex │     │ Many Forms │
    │ + Methods   │    │ Show Essential│     │ Same Interface│
    └─────────────┘    └──────────────┘     └────────────┘
          │
    ┌─────▼──────┐
    │INHERITANCE │
    │            │
    │ Code Reuse │
    │ IS-A       │
    └────────────┘
```

### Encapsulation Example

```
┌───────────────────────────────────┐
│        BankAccount                │
├───────────────────────────────────┤
│ - accountNumber: String          │ ◄── Private (hidden)
│ - balance: double                │ ◄── Private (hidden)
│ - accountType: String            │ ◄── Private (hidden)
├───────────────────────────────────┤
│ + deposit(amount): void          │ ◄── Public (controlled access)
│ + withdraw(amount): boolean      │ ◄── Public (controlled access)
│ + getBalance(): double           │ ◄── Public (read-only access)
│ - validateTransaction(): boolean │ ◄── Private (internal logic)
└───────────────────────────────────┘

External Code:
   │
   │ ❌ account.balance = -1000  (BLOCKED - private field)
   │
   │ ✅ account.deposit(1000)    (ALLOWED - goes through validation)
   │
   │ ✅ account.getBalance()     (ALLOWED - read-only)
```

### Abstraction Example

```
┌─────────────────────────────────────────────┐
│      <<interface>>                          │
│      PaymentProcessor                       │
├─────────────────────────────────────────────┤
│ + processPayment(request): PaymentResult   │ ◄── What it does
│ + refund(transactionId): boolean           │     (not how)
└────────────────┬────────────────────────────┘
                 │
                 │ implements
      ┌──────────┼──────────┬──────────────┐
      │          │           │              │
┌─────▼─────┐ ┌─▼──────┐ ┌─▼────────┐ ┌───▼─────┐
│  Stripe   │ │ PayPal │ │  Crypto  │ │  Apple  │
│ Processor │ │Processor│ │ Processor│ │   Pay   │
└───────────┘ └────────┘ └──────────┘ └─────────┘
     │            │           │             │
     │            │           │             │
     └────────────┴───────────┴─────────────┘
              Different implementations
              (How it does it)
```

### Polymorphism Example

```
                Client Code
                     │
                     │ calls
                     ▼
          process(PaymentProcessor processor)
                     │
                     │ Runtime decision
                     │
          ┌──────────┼──────────┐
          │          │           │
    ┌─────▼────┐ ┌──▼──────┐ ┌─▼────────┐
    │  Stripe  │ │ PayPal  │ │  Crypto  │
    │          │ │         │ │          │
    │processA()│ │processB()│ │processC()│ ◄── Different behavior
    └──────────┘ └─────────┘ └──────────┘     Same method call
```

### Inheritance Example

```
                 ┌───────────┐
                 │  Employee │ ◄── Base class
                 ├───────────┤
                 │ - id      │
                 │ - name    │
                 │ - salary  │
                 ├───────────┤
                 │+ work()   │
                 └─────┬─────┘
                       │
                       │ extends (IS-A)
          ┌────────────┼────────────┐
          │            │            │
    ┌─────▼─────┐ ┌────▼────┐ ┌────▼─────┐
    │  Manager  │ │Developer│ │ Designer │
    ├───────────┤ ├─────────┤ ├──────────┤
    │ - bonus   │ │ - lang  │ │ - tool   │
    ├───────────┤ ├─────────┤ ├──────────┤
    │+ manage() │ │+ code() │ │+ design()│
    └───────────┘ └─────────┘ └──────────┘
         │             │            │
         └─────────────┴────────────┘
              Inherit: id, name, salary, work()
              Add: specialized fields & methods
```

### Complete OOP Example: E-commerce System

```java
// ════════════════════════════════════════════════════════════
// ENCAPSULATION: Product class
// ════════════════════════════════════════════════════════════
public class Product {
    // Private fields (encapsulated)
    private final String id;
    private String name;
    private BigDecimal price;
    private int stockQuantity;
    
    // Constructor
    public Product(String id, String name, BigDecimal price, int stock) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.stockQuantity = stock;
    }
    
    // Public getters (controlled read access)
    public String getId() { return id; }
    public String getName() { return name; }
    public BigDecimal getPrice() { return price; }
    
    // Public method with validation (controlled write access)
    public synchronized void decrementStock(int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }
        if (quantity > stockQuantity) {
            throw new InsufficientStockException("Not enough stock");
        }
        stockQuantity -= quantity;
    }
    
    // Private helper (encapsulated logic)
    private void validatePrice(BigDecimal price) {
        if (price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Price must be positive");
        }
    }
}

// ════════════════════════════════════════════════════════════
// ABSTRACTION: Discount interface
// ════════════════════════════════════════════════════════════
public interface DiscountStrategy {
    BigDecimal applyDiscount(BigDecimal amount);
    String getDescription();
}

// ════════════════════════════════════════════════════════════
// POLYMORPHISM: Different discount implementations
// ════════════════════════════════════════════════════════════
public class PercentageDiscount implements DiscountStrategy {
    private final int percentage;
    
    public PercentageDiscount(int percentage) {
        this.percentage = percentage;
    }
    
    @Override
    public BigDecimal applyDiscount(BigDecimal amount) {
        BigDecimal discount = amount.multiply(BigDecimal.valueOf(percentage))
                                   .divide(BigDecimal.valueOf(100));
        return amount.subtract(discount);
    }
    
    @Override
    public String getDescription() {
        return percentage + "% off";
    }
}

public class FixedAmountDiscount implements DiscountStrategy {
    private final BigDecimal discountAmount;
    
    @Override
    public BigDecimal applyDiscount(BigDecimal amount) {
        BigDecimal result = amount.subtract(discountAmount);
        return result.max(BigDecimal.ZERO); // Never go negative
    }
    
    @Override
    public String getDescription() {
        return "$" + discountAmount + " off";
    }
}

// ════════════════════════════════════════════════════════════
// INHERITANCE: Order hierarchy
// ════════════════════════════════════════════════════════════
public abstract class Order {
    protected String orderId;
    protected List<Product> items;
    protected OrderStatus status;
    protected LocalDateTime createdAt;
    
    // Template method (defines workflow)
    public final OrderResult process() {
        validate();
        BigDecimal total = calculateTotal();
        applyDiscounts();
        PaymentResult payment = processPayment();
        
        if (payment.isSuccessful()) {
            confirmOrder();
            return OrderResult.success(orderId);
        } else {
            return OrderResult.failure("Payment failed");
        }
    }
    
    // Abstract methods (subclasses must implement)
    protected abstract void validate();
    protected abstract PaymentResult processPayment();
    
    // Concrete methods (shared by all orders)
    protected BigDecimal calculateTotal() {
        return items.stream()
            .map(Product::getPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    protected void confirmOrder() {
        this.status = OrderStatus.CONFIRMED;
    }
}

// Regular customer order
public class CustomerOrder extends Order {
    private final Customer customer;
    
    @Override
    protected void validate() {
        if (items.isEmpty()) {
            throw new ValidationException("Order must have items");
        }
    }
    
    @Override
    protected PaymentResult processPayment() {
        return paymentService.chargeCustomer(customer, calculateTotal());
    }
}

// Business order (different validation and payment)
public class BusinessOrder extends Order {
    private final Business business;
    private String purchaseOrderNumber;
    
    @Override
    protected void validate() {
        if (items.isEmpty()) {
            throw new ValidationException("Order must have items");
        }
        if (purchaseOrderNumber == null) {
            throw new ValidationException("PO number required for business orders");
        }
    }
    
    @Override
    protected PaymentResult processPayment() {
        // Business orders use invoice payment
        return invoiceService.createInvoice(business, calculateTotal());
    }
}

// ════════════════════════════════════════════════════════════
// USAGE: Putting it all together
// ════════════════════════════════════════════════════════════
@Service
public class OrderService {
    
    public OrderResult processOrder(Order order) {
        // Polymorphism: Works with any Order type
        return order.process();
    }
    
    public BigDecimal calculateDiscountedTotal(
        List<Product> products,
        DiscountStrategy discount // Polymorphism
    ) {
        BigDecimal total = products.stream()
            .map(Product::getPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Polymorphic call - runtime behavior determined by strategy
        return discount.applyDiscount(total);
    }
}

// Client code
public class Main {
    public static void main(String[] args) {
        // Encapsulation: Create products with controlled access
        Product laptop = new Product("P001", "Laptop", new BigDecimal("1000"), 10);
        Product mouse = new Product("P002", "Mouse", new BigDecimal("25"), 50);
        
        // Polymorphism: Different discount strategies
        DiscountStrategy percentOff = new PercentageDiscount(10);
        DiscountStrategy dollarOff = new FixedAmountDiscount(new BigDecimal("50"));
        
        // Abstraction: Work with Order interface
        Order order1 = new CustomerOrder(customer, List.of(laptop, mouse));
        Order order2 = new BusinessOrder(business, List.of(laptop), "PO-12345");
        
        // Polymorphic processing
        OrderResult result1 = orderService.processOrder(order1); // CustomerOrder logic
        OrderResult result2 = orderService.processOrder(order2); // BusinessOrder logic
        
        // Inheritance: Both orders use shared calculateTotal() method
    }
}
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why OOP Matters

**Business Impact:**
- **Faster Development**: Reuse existing code through inheritance
- **Lower Maintenance Costs**: Changes localized to specific classes
- **Reduced Bugs**: Encapsulation prevents data corruption
- **Team Scalability**: Multiple developers work on different classes independently
- **Flexibility**: Polymorphism enables changing requirements without rewriting code

**Technical Benefits:**
- **Modularity**: System decomposed into manageable objects
- **Testability**: Mock dependencies and test classes independently
- **Extensibility**: Add new features without modifying existing code
- **Code Reuse**: Inherit common behaviors
- **Security**: Encapsulation protects sensitive data

### The Four Pillars Explained Simply

**1. Encapsulation = Data Protection**
- Bundle data + methods in a class
- Make fields private
- Provide public methods with validation
- *"Hide how it works, show what it does"*

**2. Abstraction = Complexity Hiding**
- Define interfaces (contracts)
- Hide implementation details
- Focus on WHAT, not HOW
- *"Drive a car without knowing engine internals"*

**3. Polymorphism = Flexibility**
- Same interface, different behavior
- Add new implementations without changing client code
- Eliminates if-else chains
- *"Universal remote works with any TV"*

**4. Inheritance = Code Reuse**
- Create specialized classes from general ones
- Inherit common properties and behaviors
- Prefer composition over deep inheritance
- *"Sports car IS-A car, inherits car features"*

### Key Trade-offs

✅ **Use OOP When:**
- Building complex business applications
- Requirements change frequently
- Multiple developers working on codebase
- Need to model real-world entities
- Maintainability > raw performance

❌ **Avoid OOP When:**
- Simple scripts or utilities
- Performance is critical (game engines, HFT)
- Data transformation pipelines (use functional programming)
- Small codebases (< 1000 lines)

### Production Checklist

Before shipping OOP design:

- [ ] **Encapsulation**: All fields private with getters/setters?
- [ ] **Single Responsibility**: Each class does one thing?
- [ ] **Interface Segregation**: Interfaces focused and minimal?
- [ ] **Dependency Injection**: Dependencies injected, not created?
- [ ] **Composition over Inheritance**: Prefer HAS-A over IS-A?
- [ ] **Immutability**: Objects immutable where possible?
- [ ] **Thread Safety**: Synchronized access to shared state?
- [ ] **Null Safety**: Null checks or Optional<> usage?
- [ ] **Testing**: Unit tests for each class?
- [ ] **Documentation**: Clear Javadoc for public API?

### Interview Red Flags to Avoid

🚫 "OOP is just about classes and objects"
✅ "OOP is about encapsulation, abstraction, polymorphism, and inheritance working together to create maintainable systems"

🚫 "Always use inheritance for code reuse"
✅ "Prefer composition over inheritance; use inheritance only for true IS-A relationships"

🚫 "Polymorphism is just method overriding"
✅ "Polymorphism enables writing flexible code that works with abstractions, not concrete implementations, following the Open-Closed Principle"

🚫 "Encapsulation means private fields"
✅ "Encapsulation means hiding implementation details and providing controlled access through well-defined interfaces"

### Final Interview Sound Bite

*"Object-Oriented Programming is built on four pillars: Encapsulation protects data integrity by hiding internal state, Abstraction hides complexity by defining clear contracts, Polymorphism enables flexibility by allowing objects to take multiple forms, and Inheritance promotes code reuse through IS-A relationships.*

*I use all four pillars daily. In my payment processing system handling 1M+ transactions, encapsulation protects sensitive payment data, abstraction defines a PaymentProcessor interface that hides whether we're using Stripe or PayPal, polymorphism lets me add new payment methods without touching existing code, and inheritance shares common validation logic across all processors.*

*The key insight is that OOP isn't about classes—it's about managing complexity. Encapsulation and abstraction hide complexity, polymorphism handles variation, and inheritance shares commonality. Together, they enable building systems that are maintainable, testable, and extensible.*

*At scale, I prefer composition over deep inheritance hierarchies, use interfaces for contracts, inject dependencies instead of creating them, and follow SOLID principles. This creates loosely coupled systems that are easy to modify and test—critical for surviving in production."*

---

## 📚 Additional Resources

**Books:**
- "Head First Object-Oriented Analysis & Design"
- "Object-Oriented Software Construction" by Bertrand Meyer
- "Design Patterns" by Gang of Four
- "Effective Java" by Joshua Bloch

**Concepts to Study Next:**
- SOLID Principles (building on OOP foundation)
- Design Patterns (applying OOP principles)
- Domain-Driven Design (OOP at scale)
- Refactoring (improving OOP designs)

**Frameworks Using OOP:**
- Spring Framework (DI, AOP, polymorphism)
- Java Collections (abstraction, polymorphism)
- JUnit (inheritance, polymorphism)
- Hibernate (inheritance mapping)

---

**Last Updated**: January 2026
**Target Audience**: Senior Backend Engineers (7+ YOE)
**Interview Level**: FAANG L5/L6 (Senior/Staff)
