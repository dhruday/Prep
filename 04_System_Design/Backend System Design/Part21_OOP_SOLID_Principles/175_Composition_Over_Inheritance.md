# 175. Composition over Inheritance

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Composition over Inheritance**: Favor object composition over class inheritance to achieve code reuse and flexibility.

### Core Concept

**What it means:**
- Use "has-a" relationships instead of "is-a" relationships
- Compose objects from smaller, focused components
- Delegate behavior to composed objects
- Avoid deep inheritance hierarchies
- Build flexibility through composition

**Simple analogy:**
- Inheritance: A car IS-A vehicle, inherits all vehicle properties
- Composition: A car HAS-A engine, HAS-A transmission, HAS-A steering wheel
- Composition lets you swap engine without changing entire car class
- Mix and match components (electric engine vs gas engine)

**In code:**
```java
// BAD: Inheritance for behavior reuse ❌
class Vehicle {
    void start() { }
    void stop() { }
}

class Car extends Vehicle {
    void drive() { }
}

class FlyingCar extends Car { // Multiple inheritance problem!
    void fly() { } // Inherits drive() but also needs fly()
}

// GOOD: Composition for flexibility ✓
class Car {
    private Engine engine;        // HAS-A engine
    private Transmission transmission; // HAS-A transmission
    
    Car(Engine engine, Transmission transmission) {
        this.engine = engine;
        this.transmission = transmission;
    }
    
    void start() {
        engine.start(); // Delegate to engine
    }
    
    void drive() {
        transmission.engage(); // Delegate to transmission
    }
}

class ElectricEngine implements Engine { /* electric behavior */ }
class GasEngine implements Engine { /* gas behavior */ }

// Easy to create different car types
Car electricCar = new Car(new ElectricEngine(), new AutomaticTransmission());
Car gasCar = new Car(new GasEngine(), new ManualTransmission());
```

### Why Composition Over Inheritance Matters

**Code Quality Benefits:**
- **Flexibility**: Swap components at runtime
- **No fragile base class**: Changes don't break subclasses
- **Multiple behaviors**: Combine any behaviors without multiple inheritance
- **Testability**: Mock individual components
- **Maintainability**: Changes localized to components

**Business Impact:**
- Faster feature development (compose existing components)
- Easier A/B testing (swap implementations)
- Lower maintenance costs (no cascading changes)
- Better code reuse (small, focused components)

**Problems with Inheritance:**
- Deep hierarchies hard to understand
- Changes to base class affect all subclasses
- Cannot change inheritance at runtime
- Tight coupling between parent and child
- Leads to "gorilla-banana" problem (wanted banana, got gorilla holding banana and entire jungle)

**Role in interviews:**
- FAANG asks: "You have 5-level inheritance—refactor using composition"
- Design questions: "How would you model vehicles with different engines and transmissions?"
- Expects understanding of when to use each approach

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🔴 Classic Inheritance Problem: Deep Hierarchy

#### Example 1: Employee Hierarchy Anti-Pattern

```java
// BAD: Deep inheritance hierarchy ❌

// Base class
public abstract class Employee {
    protected String id;
    protected String name;
    protected BigDecimal baseSalary;
    
    public Employee(String id, String name, BigDecimal baseSalary) {
        this.id = id;
        this.name = name;
        this.baseSalary = baseSalary;
    }
    
    public abstract BigDecimal calculateSalary();
    
    public void clockIn() {
        System.out.println(name + " clocked in");
    }
    
    public void clockOut() {
        System.out.println(name + " clocked out");
    }
}

// Level 1: Full-time vs Part-time
public abstract class FullTimeEmployee extends Employee {
    protected int annualLeaveDays;
    protected BigDecimal healthInsurance;
    
    public FullTimeEmployee(String id, String name, BigDecimal baseSalary) {
        super(id, name, baseSalary);
        this.annualLeaveDays = 20;
        this.healthInsurance = new BigDecimal("500");
    }
    
    @Override
    public BigDecimal calculateSalary() {
        return baseSalary.add(healthInsurance);
    }
    
    public void takeLeave(int days) {
        if (days <= annualLeaveDays) {
            annualLeaveDays -= days;
            System.out.println("Leave approved");
        }
    }
}

public abstract class PartTimeEmployee extends Employee {
    protected int hoursWorked;
    protected BigDecimal hourlyRate;
    
    public PartTimeEmployee(String id, String name, BigDecimal hourlyRate) {
        super(id, name, BigDecimal.ZERO);
        this.hourlyRate = hourlyRate;
    }
    
    @Override
    public BigDecimal calculateSalary() {
        return hourlyRate.multiply(new BigDecimal(hoursWorked));
    }
    
    public void logHours(int hours) {
        this.hoursWorked += hours;
    }
}

// Level 2: Specific roles for full-time
public class FullTimeDeveloper extends FullTimeEmployee {
    private List<String> programmingLanguages;
    private BigDecimal codingBonus;
    
    public FullTimeDeveloper(String id, String name, BigDecimal baseSalary) {
        super(id, name, baseSalary);
        this.programmingLanguages = new ArrayList<>();
        this.codingBonus = new BigDecimal("1000");
    }
    
    @Override
    public BigDecimal calculateSalary() {
        return super.calculateSalary().add(codingBonus);
    }
    
    public void writeCode() {
        System.out.println("Writing code");
    }
}

public class FullTimeManager extends FullTimeEmployee {
    private List<Employee> team;
    private BigDecimal managementBonus;
    
    public FullTimeManager(String id, String name, BigDecimal baseSalary) {
        super(id, name, baseSalary);
        this.team = new ArrayList<>();
        this.managementBonus = new BigDecimal("2000");
    }
    
    @Override
    public BigDecimal calculateSalary() {
        return super.calculateSalary().add(managementBonus);
    }
    
    public void conductMeeting() {
        System.out.println("Conducting meeting");
    }
    
    public void approveLeave(Employee employee, int days) {
        System.out.println("Approving leave");
    }
}

// Level 2: Specific roles for part-time
public class PartTimeDeveloper extends PartTimeEmployee {
    private List<String> programmingLanguages;
    
    public PartTimeDeveloper(String id, String name, BigDecimal hourlyRate) {
        super(id, name, hourlyRate);
        this.programmingLanguages = new ArrayList<>();
    }
    
    public void writeCode() {
        System.out.println("Writing code");
    }
}

// Problems start appearing: What about a developer who becomes a manager?
// Need DeveloperManager class? Multiple inheritance of behavior?

public class DeveloperManager extends FullTimeEmployee {
    // Need to duplicate code from both FullTimeDeveloper and FullTimeManager!
    private List<String> programmingLanguages;
    private BigDecimal codingBonus;
    private List<Employee> team;
    private BigDecimal managementBonus;
    
    public DeveloperManager(String id, String name, BigDecimal baseSalary) {
        super(id, name, baseSalary);
        this.programmingLanguages = new ArrayList<>();
        this.codingBonus = new BigDecimal("1000");
        this.team = new ArrayList<>();
        this.managementBonus = new BigDecimal("2000");
    }
    
    @Override
    public BigDecimal calculateSalary() {
        // Duplicated logic from both classes
        return super.calculateSalary()
            .add(codingBonus)
            .add(managementBonus);
    }
    
    // Duplicate writeCode() from FullTimeDeveloper
    public void writeCode() {
        System.out.println("Writing code");
    }
    
    // Duplicate conductMeeting() from FullTimeManager
    public void conductMeeting() {
        System.out.println("Conducting meeting");
    }
}

// Even more problems: Remote employees with different benefits
// Contract employees with different payment structures
// Employees who switch from full-time to part-time
// Interns with special rules

// Hierarchy explodes:
// Employee
//   ├── FullTimeEmployee
//   │   ├── FullTimeDeveloper
//   │   ├── FullTimeManager
//   │   ├── DeveloperManager
//   │   ├── RemoteFullTimeDeveloper
//   │   └── RemoteFullTimeManager
//   ├── PartTimeEmployee
//   │   ├── PartTimeDeveloper
//   │   └── PartTimeDesigner
//   ├── ContractEmployee
//   │   ├── ContractDeveloper
//   │   └── ContractConsultant
//   └── Intern
//       ├── InternDeveloper
//       └── InternDesigner

// Problems with this approach:
// 1. Deep hierarchy (4+ levels) is hard to understand
// 2. Code duplication (writeCode() in multiple classes)
// 3. Rigid structure (cannot change at runtime)
// 4. Fragile base class (change Employee, breaks everything)
// 5. Cannot combine behaviors flexibly
// 6. Violates Open-Closed Principle
// 7. Testing requires understanding entire hierarchy
```

#### Composition Solution: Flexible Components

```java
// GOOD: Composition-based design ✓

// ═══════════════════════════════════════════════════════════
// STEP 1: Define small, focused components (behaviors)
// ═══════════════════════════════════════════════════════════

// Salary calculation strategy
public interface SalaryCalculator {
    BigDecimal calculate(Employee employee);
}

public class FixedSalaryCalculator implements SalaryCalculator {
    private BigDecimal fixedAmount;
    
    public FixedSalaryCalculator(BigDecimal fixedAmount) {
        this.fixedAmount = fixedAmount;
    }
    
    @Override
    public BigDecimal calculate(Employee employee) {
        return fixedAmount;
    }
}

public class HourlySalaryCalculator implements SalaryCalculator {
    private BigDecimal hourlyRate;
    private int hoursWorked;
    
    public HourlySalaryCalculator(BigDecimal hourlyRate) {
        this.hourlyRate = hourlyRate;
    }
    
    public void logHours(int hours) {
        this.hoursWorked += hours;
    }
    
    @Override
    public BigDecimal calculate(Employee employee) {
        return hourlyRate.multiply(new BigDecimal(hoursWorked));
    }
}

public class CommissionSalaryCalculator implements SalaryCalculator {
    private BigDecimal baseSalary;
    private BigDecimal commissionRate;
    private BigDecimal totalSales;
    
    public CommissionSalaryCalculator(BigDecimal baseSalary, BigDecimal commissionRate) {
        this.baseSalary = baseSalary;
        this.commissionRate = commissionRate;
    }
    
    public void recordSale(BigDecimal saleAmount) {
        this.totalSales = this.totalSales.add(saleAmount);
    }
    
    @Override
    public BigDecimal calculate(Employee employee) {
        BigDecimal commission = totalSales.multiply(commissionRate);
        return baseSalary.add(commission);
    }
}

// Benefits calculation
public interface BenefitsProvider {
    BigDecimal calculateBenefits();
    List<String> getBenefitsList();
}

public class FullTimeBenefits implements BenefitsProvider {
    private BigDecimal healthInsurance = new BigDecimal("500");
    private BigDecimal retirement401k = new BigDecimal("300");
    private int annualLeaveDays = 20;
    
    @Override
    public BigDecimal calculateBenefits() {
        return healthInsurance.add(retirement401k);
    }
    
    @Override
    public List<String> getBenefitsList() {
        return Arrays.asList(
            "Health Insurance: $" + healthInsurance,
            "401k Matching: $" + retirement401k,
            "Annual Leave: " + annualLeaveDays + " days"
        );
    }
    
    public void takeLeave(int days) {
        if (days <= annualLeaveDays) {
            annualLeaveDays -= days;
        }
    }
}

public class ContractBenefits implements BenefitsProvider {
    @Override
    public BigDecimal calculateBenefits() {
        return BigDecimal.ZERO; // No benefits for contractors
    }
    
    @Override
    public List<String> getBenefitsList() {
        return Collections.emptyList();
    }
}

public class RemoteBenefits implements BenefitsProvider {
    private BigDecimal internetAllowance = new BigDecimal("100");
    private BigDecimal homeOfficeSetup = new BigDecimal("1000");
    
    @Override
    public BigDecimal calculateBenefits() {
        return internetAllowance.add(homeOfficeSetup);
    }
    
    @Override
    public List<String> getBenefitsList() {
        return Arrays.asList(
            "Internet Allowance: $" + internetAllowance,
            "Home Office Setup: $" + homeOfficeSetup
        );
    }
}

// Role-specific capabilities
public interface Role {
    void performPrimaryDuty();
    String getRoleDescription();
}

public class DeveloperRole implements Role {
    private List<String> programmingLanguages;
    
    public DeveloperRole(List<String> languages) {
        this.programmingLanguages = languages;
    }
    
    @Override
    public void performPrimaryDuty() {
        System.out.println("Writing code in: " + programmingLanguages);
    }
    
    @Override
    public String getRoleDescription() {
        return "Software Developer";
    }
    
    public void reviewCode() {
        System.out.println("Reviewing code");
    }
}

public class ManagerRole implements Role {
    private List<String> teamMembers;
    
    public ManagerRole() {
        this.teamMembers = new ArrayList<>();
    }
    
    @Override
    public void performPrimaryDuty() {
        System.out.println("Managing team of " + teamMembers.size());
    }
    
    @Override
    public String getRoleDescription() {
        return "Manager";
    }
    
    public void conductMeeting() {
        System.out.println("Conducting team meeting");
    }
    
    public void approveLeave(String employeeId, int days) {
        System.out.println("Approving " + days + " days leave for " + employeeId);
    }
    
    public void addTeamMember(String employeeId) {
        teamMembers.add(employeeId);
    }
}

public class DesignerRole implements Role {
    private List<String> designTools;
    
    public DesignerRole(List<String> tools) {
        this.designTools = tools;
    }
    
    @Override
    public void performPrimaryDuty() {
        System.out.println("Creating designs using: " + designTools);
    }
    
    @Override
    public String getRoleDescription() {
        return "UI/UX Designer";
    }
    
    public void createMockup() {
        System.out.println("Creating design mockup");
    }
}

// ═══════════════════════════════════════════════════════════
// STEP 2: Main Employee class composes behaviors
// ═══════════════════════════════════════════════════════════

public class Employee {
    private String id;
    private String name;
    private String email;
    
    // Composed components (HAS-A relationships)
    private SalaryCalculator salaryCalculator;
    private BenefitsProvider benefitsProvider;
    private List<Role> roles; // Can have multiple roles!
    
    public Employee(
        String id, 
        String name, 
        String email,
        SalaryCalculator salaryCalculator,
        BenefitsProvider benefitsProvider
    ) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.salaryCalculator = salaryCalculator;
        this.benefitsProvider = benefitsProvider;
        this.roles = new ArrayList<>();
    }
    
    // Delegate to composed objects
    public BigDecimal calculateTotalCompensation() {
        BigDecimal salary = salaryCalculator.calculate(this);
        BigDecimal benefits = benefitsProvider.calculateBenefits();
        return salary.add(benefits);
    }
    
    public List<String> getBenefits() {
        return benefitsProvider.getBenefitsList();
    }
    
    // Role management
    public void addRole(Role role) {
        roles.add(role);
    }
    
    public void removeRole(Role role) {
        roles.remove(role);
    }
    
    public void performDuties() {
        roles.forEach(Role::performPrimaryDuty);
    }
    
    public List<String> getRoleDescriptions() {
        return roles.stream()
            .map(Role::getRoleDescription)
            .collect(Collectors.toList());
    }
    
    // Can change components at runtime!
    public void updateSalaryCalculator(SalaryCalculator newCalculator) {
        this.salaryCalculator = newCalculator;
    }
    
    public void updateBenefitsProvider(BenefitsProvider newProvider) {
        this.benefitsProvider = newProvider;
    }
    
    // Basic methods
    public void clockIn() {
        System.out.println(name + " clocked in");
    }
    
    public void clockOut() {
        System.out.println(name + " clocked out");
    }
    
    // Getters
    public String getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}

// ═══════════════════════════════════════════════════════════
// STEP 3: Create employees by composing components
// ═══════════════════════════════════════════════════════════

public class EmployeeFactory {
    
    // Full-time developer
    public static Employee createFullTimeDeveloper(
        String id, 
        String name, 
        String email,
        BigDecimal salary
    ) {
        Employee employee = new Employee(
            id,
            name,
            email,
            new FixedSalaryCalculator(salary),
            new FullTimeBenefits()
        );
        
        employee.addRole(new DeveloperRole(Arrays.asList("Java", "Python", "Go")));
        
        return employee;
    }
    
    // Part-time developer
    public static Employee createPartTimeDeveloper(
        String id,
        String name,
        String email,
        BigDecimal hourlyRate
    ) {
        Employee employee = new Employee(
            id,
            name,
            email,
            new HourlySalaryCalculator(hourlyRate),
            new ContractBenefits() // No benefits for part-time
        );
        
        employee.addRole(new DeveloperRole(Arrays.asList("JavaScript", "React")));
        
        return employee;
    }
    
    // Developer who is also a manager (multiple roles!)
    public static Employee createDeveloperManager(
        String id,
        String name,
        String email,
        BigDecimal salary
    ) {
        Employee employee = new Employee(
            id,
            name,
            email,
            new FixedSalaryCalculator(salary),
            new FullTimeBenefits()
        );
        
        // Add both developer and manager roles
        employee.addRole(new DeveloperRole(Arrays.asList("Java", "Kotlin")));
        employee.addRole(new ManagerRole());
        
        return employee;
    }
    
    // Remote full-time designer
    public static Employee createRemoteDesigner(
        String id,
        String name,
        String email,
        BigDecimal salary
    ) {
        Employee employee = new Employee(
            id,
            name,
            email,
            new FixedSalaryCalculator(salary),
            new RemoteBenefits() // Remote-specific benefits
        );
        
        employee.addRole(new DesignerRole(Arrays.asList("Figma", "Sketch", "Adobe XD")));
        
        return employee;
    }
    
    // Sales person with commission
    public static Employee createSalesPerson(
        String id,
        String name,
        String email,
        BigDecimal baseSalary,
        BigDecimal commissionRate
    ) {
        Employee employee = new Employee(
            id,
            name,
            email,
            new CommissionSalaryCalculator(baseSalary, commissionRate),
            new FullTimeBenefits()
        );
        
        // No specific role object for now, but could add SalesRole
        
        return employee;
    }
}

// ═══════════════════════════════════════════════════════════
// STEP 4: Usage examples
// ═══════════════════════════════════════════════════════════

public class EmployeeManagementSystem {
    
    public static void main(String[] args) {
        
        // Create different types of employees
        Employee alice = EmployeeFactory.createFullTimeDeveloper(
            "E001",
            "Alice",
            "alice@company.com",
            new BigDecimal("100000")
        );
        
        Employee bob = EmployeeFactory.createDeveloperManager(
            "E002",
            "Bob",
            "bob@company.com",
            new BigDecimal("150000")
        );
        
        Employee charlie = EmployeeFactory.createPartTimeDeveloper(
            "E003",
            "Charlie",
            "charlie@company.com",
            new BigDecimal("50")
        );
        
        // Alice performs developer duties
        System.out.println("Alice's roles: " + alice.getRoleDescriptions());
        alice.performDuties(); // Output: Writing code in: [Java, Python, Go]
        
        // Bob performs both developer and manager duties
        System.out.println("Bob's roles: " + bob.getRoleDescriptions());
        bob.performDuties(); 
        // Output: 
        // Writing code in: [Java, Kotlin]
        // Managing team of 0
        
        // Calculate compensation
        System.out.println("Alice's compensation: $" + alice.calculateTotalCompensation());
        System.out.println("Bob's compensation: $" + bob.calculateTotalCompensation());
        
        // Change at runtime: Alice gets promoted to manager
        alice.addRole(new ManagerRole());
        System.out.println("Alice's new roles: " + alice.getRoleDescriptions());
        // Output: [Software Developer, Manager]
        
        // Change salary structure at runtime
        alice.updateSalaryCalculator(new FixedSalaryCalculator(new BigDecimal("120000")));
        System.out.println("Alice's new compensation: $" + alice.calculateTotalCompensation());
        
        // Charlie (part-time) logs hours
        HourlySalaryCalculator charlieCalculator = 
            (HourlySalaryCalculator) charlie.getSalaryCalculator();
        charlieCalculator.logHours(40);
        System.out.println("Charlie's compensation: $" + charlie.calculateTotalCompensation());
    }
}

// ═══════════════════════════════════════════════════════════
// Benefits of composition approach
// ═══════════════════════════════════════════════════════════

// ✓ Single Employee class instead of 15+ classes
// ✓ No code duplication
// ✓ Can combine any salary calculator + benefits + roles
// ✓ Easy to add new role (create new Role implementation)
// ✓ Easy to add new benefits (create new BenefitsProvider)
// ✓ Can change components at runtime (promote employee)
// ✓ Multiple roles possible (developer + manager)
// ✓ Test each component independently
// ✓ No fragile base class problem
// ✓ Follows Open-Closed Principle
// ✓ Follows Single Responsibility Principle
// ✓ Follows Dependency Inversion Principle
```

---

### 🟢 Composition in Logger System

```java
// GOOD: Logger using composition ✓

// ═══════════════════════════════════════════════════════════
// Components for logging behavior
// ═══════════════════════════════════════════════════════════

// Log formatting strategy
public interface LogFormatter {
    String format(LogEntry entry);
}

public class JsonLogFormatter implements LogFormatter {
    @Override
    public String format(LogEntry entry) {
        return String.format(
            "{\"timestamp\":\"%s\",\"level\":\"%s\",\"message\":\"%s\"}",
            entry.getTimestamp(),
            entry.getLevel(),
            entry.getMessage()
        );
    }
}

public class PlainTextLogFormatter implements LogFormatter {
    @Override
    public String format(LogEntry entry) {
        return String.format(
            "[%s] %s - %s",
            entry.getTimestamp(),
            entry.getLevel(),
            entry.getMessage()
        );
    }
}

// Log destination strategy
public interface LogDestination {
    void write(String formattedLog);
}

public class ConsoleLogDestination implements LogDestination {
    @Override
    public void write(String formattedLog) {
        System.out.println(formattedLog);
    }
}

public class FileLogDestination implements LogDestination {
    private String filePath;
    
    public FileLogDestination(String filePath) {
        this.filePath = filePath;
    }
    
    @Override
    public void write(String formattedLog) {
        try (FileWriter writer = new FileWriter(filePath, true)) {
            writer.write(formattedLog + "\n");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}

public class DatabaseLogDestination implements LogDestination {
    private LogRepository logRepository;
    
    public DatabaseLogDestination(LogRepository logRepository) {
        this.logRepository = logRepository;
    }
    
    @Override
    public void write(String formattedLog) {
        logRepository.save(formattedLog);
    }
}

// Log filtering strategy
public interface LogFilter {
    boolean shouldLog(LogEntry entry);
}

public class LevelLogFilter implements LogFilter {
    private LogLevel minimumLevel;
    
    public LevelLogFilter(LogLevel minimumLevel) {
        this.minimumLevel = minimumLevel;
    }
    
    @Override
    public boolean shouldLog(LogEntry entry) {
        return entry.getLevel().ordinal() >= minimumLevel.ordinal();
    }
}

public class TimeRangeLogFilter implements LogFilter {
    private LocalTime startTime;
    private LocalTime endTime;
    
    public TimeRangeLogFilter(LocalTime startTime, LocalTime endTime) {
        this.startTime = startTime;
        this.endTime = endTime;
    }
    
    @Override
    public boolean shouldLog(LogEntry entry) {
        LocalTime entryTime = entry.getTimestamp().toLocalTime();
        return entryTime.isAfter(startTime) && entryTime.isBefore(endTime);
    }
}

// ═══════════════════════════════════════════════════════════
// Main Logger composed from components
// ═══════════════════════════════════════════════════════════

public class Logger {
    private String name;
    private LogFormatter formatter;
    private List<LogDestination> destinations;
    private List<LogFilter> filters;
    
    public Logger(String name) {
        this.name = name;
        this.destinations = new ArrayList<>();
        this.filters = new ArrayList<>();
        // Default formatter
        this.formatter = new PlainTextLogFormatter();
    }
    
    // Compose components
    public Logger withFormatter(LogFormatter formatter) {
        this.formatter = formatter;
        return this;
    }
    
    public Logger addDestination(LogDestination destination) {
        this.destinations.add(destination);
        return this;
    }
    
    public Logger addFilter(LogFilter filter) {
        this.filters.add(filter);
        return this;
    }
    
    // Logging methods
    public void log(LogLevel level, String message) {
        LogEntry entry = new LogEntry(
            LocalDateTime.now(),
            level,
            name,
            message
        );
        
        // Apply filters
        boolean shouldLog = filters.stream()
            .allMatch(filter -> filter.shouldLog(entry));
        
        if (!shouldLog) {
            return;
        }
        
        // Format log
        String formattedLog = formatter.format(entry);
        
        // Write to all destinations
        destinations.forEach(dest -> dest.write(formattedLog));
    }
    
    public void info(String message) {
        log(LogLevel.INFO, message);
    }
    
    public void warn(String message) {
        log(LogLevel.WARN, message);
    }
    
    public void error(String message) {
        log(LogLevel.ERROR, message);
    }
}

// ═══════════════════════════════════════════════════════════
// Usage: Compose different logger configurations
// ═══════════════════════════════════════════════════════════

// Development logger: plain text to console
Logger devLogger = new Logger("dev")
    .withFormatter(new PlainTextLogFormatter())
    .addDestination(new ConsoleLogDestination());

// Production logger: JSON to file and database, filtered by level
Logger prodLogger = new Logger("prod")
    .withFormatter(new JsonLogFormatter())
    .addDestination(new FileLogDestination("/var/log/app.log"))
    .addDestination(new DatabaseLogDestination(logRepository))
    .addFilter(new LevelLogFilter(LogLevel.WARN)); // Only WARN and above

// Test logger: filtered by time range
Logger testLogger = new Logger("test")
    .withFormatter(new PlainTextLogFormatter())
    .addDestination(new ConsoleLogDestination())
    .addFilter(new TimeRangeLogFilter(
        LocalTime.of(9, 0),
        LocalTime.of(17, 0)
    )); // Only log during work hours

// Benefits:
// ✓ Single Logger class instead of DevLogger, ProdLogger, TestLogger
// ✓ Mix and match: any formatter + any destinations + any filters
// ✓ Add new destination without changing Logger
// ✓ Can reconfigure logger at runtime
// ✓ Test each component independently
```

---

### 🔵 Composition with Decorators

```java
// GOOD: Composition + Decorator Pattern ✓

// ═══════════════════════════════════════════════════════════
// Base interface
// ═══════════════════════════════════════════════════════════

public interface DataSource {
    void writeData(String data);
    String readData();
}

// ═══════════════════════════════════════════════════════════
// Concrete component
// ═══════════════════════════════════════════════════════════

public class FileDataSource implements DataSource {
    private String filename;
    
    public FileDataSource(String filename) {
        this.filename = filename;
    }
    
    @Override
    public void writeData(String data) {
        // Write to file
        try (FileWriter writer = new FileWriter(filename)) {
            writer.write(data);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    @Override
    public String readData() {
        // Read from file
        try {
            return new String(Files.readAllBytes(Paths.get(filename)));
        } catch (IOException e) {
            e.printStackTrace();
            return "";
        }
    }
}

// ═══════════════════════════════════════════════════════════
// Decorators that add behavior via composition
// ═══════════════════════════════════════════════════════════

// Encryption decorator
public class EncryptionDecorator implements DataSource {
    private DataSource wrappee; // Composed DataSource
    
    public EncryptionDecorator(DataSource source) {
        this.wrappee = source;
    }
    
    @Override
    public void writeData(String data) {
        String encrypted = encrypt(data);
        wrappee.writeData(encrypted); // Delegate to wrapped object
    }
    
    @Override
    public String readData() {
        String encrypted = wrappee.readData();
        return decrypt(encrypted);
    }
    
    private String encrypt(String data) {
        // Simple encryption for example
        return Base64.getEncoder().encodeToString(data.getBytes());
    }
    
    private String decrypt(String data) {
        return new String(Base64.getDecoder().decode(data));
    }
}

// Compression decorator
public class CompressionDecorator implements DataSource {
    private DataSource wrappee;
    
    public CompressionDecorator(DataSource source) {
        this.wrappee = source;
    }
    
    @Override
    public void writeData(String data) {
        String compressed = compress(data);
        wrappee.writeData(compressed);
    }
    
    @Override
    public String readData() {
        String compressed = wrappee.readData();
        return decompress(compressed);
    }
    
    private String compress(String data) {
        // Simplified compression
        return data.replaceAll("\\s+", " ");
    }
    
    private String decompress(String data) {
        return data;
    }
}

// Logging decorator
public class LoggingDecorator implements DataSource {
    private DataSource wrappee;
    private Logger logger;
    
    public LoggingDecorator(DataSource source, Logger logger) {
        this.wrappee = source;
        this.logger = logger;
    }
    
    @Override
    public void writeData(String data) {
        logger.info("Writing data: " + data.length() + " bytes");
        wrappee.writeData(data);
        logger.info("Data written successfully");
    }
    
    @Override
    public String readData() {
        logger.info("Reading data");
        String data = wrappee.readData();
        logger.info("Data read: " + data.length() + " bytes");
        return data;
    }
}

// ═══════════════════════════════════════════════════════════
// Usage: Stack decorators via composition
// ═══════════════════════════════════════════════════════════

// Plain file source
DataSource plainFile = new FileDataSource("data.txt");
plainFile.writeData("Hello, World!");

// File with encryption
DataSource encryptedFile = new EncryptionDecorator(
    new FileDataSource("encrypted.txt")
);
encryptedFile.writeData("Secret message");

// File with compression and encryption (stack behaviors!)
DataSource compressedEncryptedFile = new EncryptionDecorator(
    new CompressionDecorator(
        new FileDataSource("compressed_encrypted.txt")
    )
);
compressedEncryptedFile.writeData("Large secret message");

// File with all features: logging, compression, encryption
DataSource fullyFeaturedFile = new LoggingDecorator(
    new EncryptionDecorator(
        new CompressionDecorator(
            new FileDataSource("full.txt")
        )
    ),
    logger
);
fullyFeaturedFile.writeData("Production data");

// Data flow:
// writeData("Production data")
//   → LoggingDecorator logs "Writing data"
//   → EncryptionDecorator encrypts
//   → CompressionDecorator compresses
//   → FileDataSource writes to file
//   → LoggingDecorator logs "Data written successfully"

// Benefits:
// ✓ Add any combination of features without inheritance
// ✓ Features added/removed at runtime
// ✓ Each decorator testable independently
// ✓ Open for extension (new decorators)
// ✓ Closed for modification (existing decorators unchanged)
```

---

### 🟡 When to Use Inheritance vs Composition

```java
// Use INHERITANCE when:
// 1. True "is-a" relationship
// 2. Substitutability is needed (Liskov Substitution)
// 3. Behavior is invariant across hierarchy

// Example: Shapes
public abstract class Shape {
    public abstract double calculateArea();
    public abstract double calculatePerimeter();
}

public class Circle extends Shape {
    private double radius;
    
    @Override
    public double calculateArea() {
        return Math.PI * radius * radius;
    }
    
    @Override
    public double calculatePerimeter() {
        return 2 * Math.PI * radius;
    }
}

public class Rectangle extends Shape {
    private double width;
    private double height;
    
    @Override
    public double calculateArea() {
        return width * height;
    }
    
    @Override
    public double calculatePerimeter() {
        return 2 * (width + height);
    }
}

// Inheritance works here because:
// ✓ Circle IS-A Shape (true is-a)
// ✓ Can substitute Shape with Circle anywhere
// ✓ All shapes have area and perimeter
// ✓ Shallow hierarchy (2 levels)

// Use COMPOSITION when:
// 1. "Has-a" relationship
// 2. Need to combine multiple behaviors
// 3. Need runtime flexibility
// 4. Behavior varies independently

// Example: Drawing application (already shown above with Logger)
```

---

## ────────────────────────────────────
## 3️⃣ Real-World Production Examples
## ────────────────────────────────────

### Example 1: Spring Framework - @Transactional

Spring uses composition for transaction management:

```java
// Spring doesn't use inheritance for transactions
// Uses composition with proxies

@Service
public class OrderService {
    
    // Spring composes this service with transaction behavior at runtime
    @Transactional
    public void createOrder(Order order) {
        // Business logic
        orderRepository.save(order);
    }
}

// Behind the scenes, Spring creates:
// OrderService (your class)
//   wrapped by TransactionInterceptor (composition!)
//   wrapped by other aspects (logging, security, etc.)

// Not inheritance:
// class OrderService extends TransactionalService { } ❌

// Composition via proxy:
// Proxy wraps OrderService, adds transaction behavior ✓
```

### Example 2: Java Streams API

```java
// Streams use composition, not inheritance

List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "David");

// Each method returns new stream wrapping previous
List<String> result = names.stream()           // Stream<String>
    .filter(name -> name.length() > 3)         // Wrapped in FilterStream
    .map(String::toUpperCase)                  // Wrapped in MapStream
    .sorted()                                  // Wrapped in SortedStream
    .limit(2)                                  // Wrapped in LimitStream
    .collect(Collectors.toList());            // Terminal operation

// Not: class FilterMapSortLimitStream extends BaseStream ❌
// But: Each operation wraps previous stream (composition) ✓
```

### Example 3: java.io Package

```java
// Classic example of composition over inheritance

// Reading encrypted, buffered, compressed file:
InputStream input = new GZIPInputStream(          // Compression
    new CipherInputStream(                         // Encryption
        new BufferedInputStream(                   // Buffering
            new FileInputStream("data.gz")         // File reading
        ),
        cipher
    )
);

// Each stream wraps another (composition)
// Not: class CompressedEncryptedBufferedFileInputStream extends InputStream ❌
```

### Example 4: Collections Framework - Unmodifiable Collections

```java
// Java uses composition for unmodifiable collections

List<String> modifiable = new ArrayList<>();
modifiable.add("Alice");

// Wraps in UnmodifiableList (composition)
List<String> unmodifiable = Collections.unmodifiableList(modifiable);

// Behind the scenes:
class UnmodifiableList<E> implements List<E> {
    private final List<E> list; // Composition!
    
    UnmodifiableList(List<E> list) {
        this.list = list;
    }
    
    public E get(int index) {
        return list.get(index); // Delegate reads
    }
    
    public boolean add(E e) {
        throw new UnsupportedOperationException(); // Block writes
    }
}

// Not: class UnmodifiableArrayList extends ArrayList ❌
```

---

## ────────────────────────────────────
## 4️⃣ Interview Q&A (Behavioral Questions)
## ────────────────────────────────────

### Q1: "What is composition over inheritance?"

**Answer:** *"Composition over inheritance is design principle that says favor 'has-a' relationships over 'is-a' relationships. Instead of inheriting behavior from parent class, compose objects from smaller components and delegate to them.*

*Classic problem: Employee hierarchy. Inheritance approach: FullTimeEmployee extends Employee, FullTimeDeveloper extends FullTimeEmployee, DeveloperManager extends...? Need to duplicate code for employees who are both developers and managers. Deep hierarchy, rigid, code duplication.*

*Composition approach: Employee class has-a SalaryCalculator, has-a BenefitsProvider, has-a list of Roles. Create FixedSalaryCalculator, HourlySalaryCalculator. Create FullTimeBenefits, ContractBenefits. Create DeveloperRole, ManagerRole. Compose: Employee with FixedSalaryCalculator + FullTimeBenefits + DeveloperRole. Developer-manager: Same employee with both DeveloperRole and ManagerRole.*

*Benefits: Single Employee class instead of 15+ subclasses. No code duplication. Can combine any salary + benefits + roles. Can change components at runtime (promote developer to manager). Easy to test each component independently.*

*Composition provides flexibility inheritance cannot. Inheritance is rigid 'is-a', composition is flexible 'has-a'."*

### Q2: "Give a real example where you refactored from inheritance to composition"

**Answer:** *"At my company, we had notification system with deep inheritance: NotificationSender base class, EmailSender and SmsSender subclasses, then UrgentEmailSender, MarketingEmailSender, TransactionalEmailSender—9 classes in 3-level hierarchy.*

*Problem: Wanted to add retry logic. Where does it go? In base class? But SMS retry different from email retry. In each subclass? Code duplication across 6 subclasses. Also wanted to add rate limiting, different per notification type. Hierarchy couldn't handle cross-cutting concerns.*

*I refactored using composition. Created NotificationChannel interface with send() method. Created EmailChannel, SmsChannel—2 implementations instead of 6+ classes. Then created decorator components: RetryDecorator wraps any channel, adds retry logic. RateLimitDecorator adds rate limiting. LoggingDecorator adds logging.*

*Usage: EmailChannel wrapped in RetryDecorator wrapped in RateLimitDecorator wrapped in LoggingDecorator. All features composed, not inherited. SMS channel uses different configuration: SmsChannel wrapped in RetryDecorator with SMS-specific retry settings.*

*Results: 9 classes → 5 components. Zero code duplication. Added rate limiting in 1 day (new decorator, no changes to channels). Tests became trivial—mock EmailChannel, test RetryDecorator in isolation. Team velocity increased—features now added as decorators, not subclasses."*

### Q3: "When would you still use inheritance?"

**Answer:** *"Use inheritance for true 'is-a' relationships where substitutability is core requirement and hierarchy is shallow.*

*Example: Shape hierarchy. Circle is-a Shape, Rectangle is-a Shape. Every shape has calculateArea() and calculatePerimeter(). Liskov Substitution applies—can pass Circle anywhere expecting Shape. Hierarchy is 2 levels (Shape → Circle/Rectangle). Behavior is invariant—all shapes have area and perimeter.*

*Another example: Exception hierarchy. IllegalArgumentException is-a RuntimeException is-a Exception. Substitutability critical—catch blocks rely on it. Java Collections: ArrayList is-a List. Inheritance provides polymorphic contract.*

*But avoid inheritance for code reuse. If reason is 'DeveloperManager needs code from Developer and Manager'—that's composition use case, not inheritance. If hierarchy goes 3+ levels deep—probably wrong. If you're overriding methods to throw UnsupportedOperationException—definitely wrong.*

*Rule of thumb: Inheritance for polymorphic substitution (interfaces + 1-2 level hierarchy). Composition for behavior reuse and flexibility. When in doubt, choose composition—easier to refactor composition to inheritance than vice versa."*

### Q4: "What are problems with deep inheritance hierarchies?"

**Answer:** *"Deep hierarchies have six major problems:*

*First, fragile base class problem. Change in base class breaks all subclasses. Example: Add parameter to Employee constructor, now 15 subclasses must change. Ripple effect makes maintenance nightmare.*

*Second, tight coupling. Subclass knows too much about parent implementation. Change parent internals, subclass breaks even if interface unchanged.*

*Third, inflexibility. Cannot change inheritance at runtime. Developer cannot become manager without creating new object. With composition, just add ManagerRole component.*

*Fourth, multiple inheritance issues. Java doesn't support multiple inheritance. DeveloperManager needs behavior from Developer and Manager—no clean way with inheritance. With composition, just compose both.*

*Fifth, code duplication. To avoid deep hierarchy, duplicate code across branches. writeCode() method duplicated in FullTimeDeveloper and PartTimeDeveloper.*

*Sixth, testing difficulty. To test leaf class, need to understand entire hierarchy. Bug in base class breaks tests for all subclasses. With composition, test each component in isolation.*

*Real impact: My team had 5-level hierarchy—100+ classes. Single change in level 2 class broke 40 subclasses. Refactored to composition—15 components. Now changes affect only relevant components."*

### Q5: "How does composition relate to SOLID principles?"

**Answer:** *"Composition enables all SOLID principles:*

*Composition + Single Responsibility: Each component has one responsibility. SalaryCalculator calculates salary, BenefitsProvider provides benefits, Role defines duties. Employee composes them, doesn't implement everything. Inheritance violates SRP—FullTimeDeveloper has salary logic, benefits logic, and developer logic in one class.*

*Composition + Open-Closed: Add new features by creating new components, not modifying existing. Add compression to file storage: create CompressionDecorator wrapping FileDataSource. Inheritance requires modifying hierarchy or creating new subclass.*

*Composition + Liskov Substitution: Components substitutable via interfaces. Any SalaryCalculator works with Employee. Inheritance hierarchies often violate LSP—Square can't substitute Rectangle.*

*Composition + Interface Segregation: Components implement focused interfaces. SalaryCalculator has one method: calculate(). Inheritance leads to fat base classes with many methods.*

*Composition + Dependency Inversion: Employee depends on SalaryCalculator interface (abstraction), not FixedSalaryCalculator (concrete). Inheritance creates dependency on concrete parent class.*

*Composition is foundation for SOLID. Without composition, achieving SOLID with inheritance is nearly impossible. Composition provides flexibility SOLID requires."*

### Q6: "Doesn't composition create more objects and hurt performance?"

**Answer:** *"Composition creates more objects, but impact is negligible compared to flexibility benefits. Let me address performance:*

*Object creation cost: Modern JVMs optimize object allocation. Creating Employee + SalaryCalculator + BenefitsProvider + Role is microseconds. Compare to developer time debugging deep inheritance hierarchy—hours or days. Performance cost trivial, maintainability benefit huge.*

*Memory overhead: Extra objects use memory. Employee with 3 composed objects: maybe 100 bytes total. Compare to code duplication in inheritance approach—DeveloperManager duplicates code from Developer and Manager, increasing code size and JAR size.*

*Indirection cost: Method calls through composition add one level of indirection. employee.calculateSalary() → salaryCalculator.calculate(). JVM's JIT compiler inlines these calls—no runtime cost after warm-up.*

*Garbage collection: More objects mean more GC work. But objects are typically long-lived (Employee exists for duration of user session) or short-lived (local variables). Both cases GC handles efficiently.*

*Real measurements: My team measured before/after refactoring from inheritance to composition. Performance impact: <1%. Maintainability improvement: 10x. Bug frequency decreased 70%. Time to add features decreased 60%.*

*Composition's flexibility—runtime configuration, testability, modularity—far outweighs tiny performance cost. Optimize for developer productivity, not object creation. Use profiler to find real bottlenecks."*

---

## 🔟 Why & How Summary

### Why Composition Over Inheritance Matters

**Flexibility:**
- Change behavior at runtime (swap components)
- Combine behaviors freely (multiple roles)
- No multiple inheritance limitations
- Easy to create new combinations

**Maintainability:**
- No fragile base class problem
- Changes localized to components
- No ripple effects through hierarchy
- Easier to understand (flat structure)

**Testability:**
- Test each component independently
- Mock composed dependencies
- No need to understand entire hierarchy
- Fast, isolated unit tests

**Reusability:**
- Small, focused components
- Compose components in multiple contexts
- No code duplication
- DRY principle naturally followed

### How to Apply Composition

**Design Phase:**
1. Identify varying behaviors (salary calculation, benefits, roles)
2. Extract behaviors into interfaces
3. Create focused implementations
4. Compose main class from components
5. Delegate to composed objects

**Refactoring:**
1. Identify inheritance hierarchy to refactor
2. Extract common behaviors into interfaces
3. Create component implementations
4. Change base class to compose components
5. Inject components via constructor
6. Remove subclasses (replace with factory methods)

**Decision Guide:**
```
Use Inheritance when:
✓ True "is-a" relationship
✓ Shallow hierarchy (1-2 levels)
✓ Substitutability required (LSP)
✓ Behavior invariant across types

Use Composition when:
✓ "Has-a" relationship
✓ Multiple behaviors to combine
✓ Runtime flexibility needed
✓ Avoiding deep hierarchies
✓ Cross-cutting concerns
```

### Interview Red Flags

🚫 "Inheritance is simpler than composition"
✅ "Composition is more flexible and maintainable than inheritance"

🚫 "My hierarchy is only 3 levels deep"
✅ "3 levels is already deep—consider composition"

🚫 "Composition creates too many classes"
✅ "Composition creates focused, reusable components"

### Final Sound Bite

*"Composition over inheritance means favor 'has-a' over 'is-a'. Instead of FullTimeDeveloper extends Employee extends Person (inheritance), use Employee has-a SalaryCalculator has-a Role (composition).*

*Inheritance is rigid—locked at compile time, cannot change. Employee hierarchy: FullTimeDeveloper, PartTimeDeveloper, FullTimeManager, DeveloperManager—9+ classes, code duplication, can't be both developer and manager.*

*Composition is flexible—configure at runtime, mix any behaviors. Employee composes SalaryCalculator + BenefitsProvider + List<Role>. FixedSalaryCalculator, HourlySalaryCalculator. FullTimeBenefits, ContractBenefits. DeveloperRole, ManagerRole. Any combination works. Developer-manager: one Employee with both roles. Promote at runtime: add ManagerRole. Single class, infinite combinations.*

*Real impact: Refactored 9-class hierarchy to 1 class + 5 components. Added new role in 30 minutes (was 3 days). Tests run in isolation (mock components). Zero code duplication. Team velocity doubled.*

*Composition enables SOLID, supports Open-Closed, provides flexibility inheritance cannot. Default to composition—use inheritance only for true polymorphic substitution like Shape → Circle/Rectangle."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
