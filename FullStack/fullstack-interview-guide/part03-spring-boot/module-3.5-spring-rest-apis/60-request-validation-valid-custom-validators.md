# Request Validation — @Valid, Custom Validators
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- `@Valid` on a `@RequestBody` parameter triggers Jakarta Bean Validation (formerly javax) on the deserialized object BEFORE the method body runs; validation failure throws `MethodArgumentNotValidException` → 400 Bad Request
- Built-in constraints: `@NotNull`, `@NotBlank`, `@NotEmpty`, `@Min`, `@Max`, `@Size`, `@Email`, `@Pattern(regexp=...)` — apply directly to DTO fields
- Nested objects need `@Valid` on the nested field too — validation does NOT cascade automatically into nested objects
- `@Validated` (Spring's version) enables validation on `@Service` beans — for service-layer validation — and also supports validation groups
- Custom validators: implement `ConstraintValidator<YourAnnotation, YourType>` — write the logic in `isValid()`, keep it fast (no DB calls in validators)
- Spring Boot auto-configures `LocalValidatorFactoryBean` — adds `hibernate-validator` dependency and it works

---

## 1. One-Line Definition
`@Valid` triggers Java Bean Validation (JSR-380) on incoming request objects, automatically rejecting requests with invalid data with a 400 response before your business logic ever runs.

---

## 2. The Problem It Solves

Without input validation at the API level, your service layer becomes a garbage in / error out system. A request comes in with `quantity: -5`, `email: "not-an-email"`, `name: ""`. Without validation, the request passes the controller, enters the service, hits the database constraint (check constraint on quantity > 0), throws a `DataIntegrityViolationException` — which leaks SQL details in the response, logs a high-priority error in your monitoring, and gives the caller a 500 instead of a clear 400 "Quantity must be positive."

Every validation message that a client needs must be manually coded in the service: `if (order.getQuantity() < 1) throw new IllegalArgumentException(...)`. As the codebase grows, this validation logic scatters across constructors, service methods, and utility classes. Some validations are forgotten; others are duplicated with inconsistent error messages.

Bean Validation centralises this at the entry point — the controller. The `@Valid` annotation runs all constraints defined on the DTO before the method body executes. Invalid requests never reach the service layer. The error message is exactly what the annotation declared — predictable, consistent, and structured.

At Oracle, I audited our Spring Boot service and found 47 separate `if (field == null || field.isEmpty()) throw new IllegalArgumentException(...)` checks scattered across 12 service classes. I replaced them all with `@NotBlank`, `@Valid`, and `@ControllerAdvice`. The service layer became pure business logic with zero manual null checks.

---

## 3. How It Works Internally

### The Mental Model
Think of `@Valid` as a customs inspector at an airport who checks all luggage BEFORE passengers are allowed through to the gate. If anything is wrong (overweight bags, prohibited items), the passenger is turned back at customs with a specific list of what needs to be fixed. They never reach the gate (the service). The gate staff (service layer) only see passengers who have already passed customs — they can trust that the basics are correct and focus only on the journey (business logic).

### The Mechanism — Step by Step

1. **Request arrives** — `@RequestBody` deserializes the JSON to a Java DTO via Jackson
2. **`@Valid` detected** — `HandlerMethodArgumentResolver` sees the `@Valid` annotation on the parameter
3. **Validator triggered** — Spring delegates to `LocalValidatorFactoryBean` backed by Hibernate Validator (the most popular Jakarta Validation implementation)
4. **Constraints evaluated** — Hibernate Validator scans the DTO's field annotations (`@NotBlank`, `@Min`, etc.) and runs their `isValid()` implementations against the actual values
5. **Cascading validation** — if a field is annotated with `@Valid`, the nested object's constraints are also evaluated recursively
6. **Constraint violations collected** — all violated constraints are gathered (not just the first one)
7. **`MethodArgumentNotValidException` thrown** — this exception carries the full list of field-level violations
8. **`@ControllerAdvice` catches it** — maps each violation to `{field, rejectedValue, message}` → returns 400 Bad Request with structured error body

### Validation Execution Context

```
@Valid on @RequestBody parameter  →  validated at controller entry (HandlerMethodArgumentResolver)
@Valid on @GetMapping @PathVariable →  NOT auto-validated (use @Validated on class + @Min/@Max)
@Validated on service class method → validated at service-layer call (via Spring AOP proxy)
@NotNull on entity fields          → validated at JPA persistence (different lifecycle!)

Key: @Valid and @Validated are two separate things:
  @Valid  = standard Jakarta annotation; triggers full validation on the annotated object
  @Validated = Spring's annotation; required to enable method-level validation on a bean
              also supports "validation groups" (validate only a subset of constraints)
```

### ASCII Diagram

```
POST /api/v1/orders
Body: {"customerId": "", "quantity": -1, "email": "invalid"}
       │
       ▼
Jackson deserializes JSON → CreateOrderRequest object
       │
       ▼
@Valid detected on method parameter
  HibernateValidator.validate(request):
    @NotBlank on customerId  → "" is blank ❌ violation
    @Min(1) on quantity      → -1 < 1      ❌ violation
    @Email on email          → invalid format ❌ violation
       │
       ▼
MethodArgumentNotValidException thrown
  Contains: 3 ConstraintViolations
       │
       ▼
@ControllerAdvice.handleValidation(ex)
  Maps violations to FieldErrors:
    [{field: "customerId", message: "must not be blank"},
     {field: "quantity",   message: "must be greater than or equal to 1"},
     {field: "email",      message: "must be a well-formed email address"}]
       │
       ▼
HTTP 400 Bad Request
{
  "code": "VALIDATION_ERROR",
  "errors": [
    {"field": "customerId", "message": "must not be blank"},
    {"field": "quantity",   "message": "must be greater than or equal to 1"},
    {"field": "email",      "message": "must be a well-formed email address"}
  ]
}
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Scattered manual validation everywhere
@Service
public class OrderService {

    public Order createOrder(CreateOrderRequest request) {
        // WRONG 1: Manual null checks — scattered, inconsistent
        if (request.customerId() == null || request.customerId().isBlank()) {
            throw new IllegalArgumentException("Customer ID is required");
        }
        if (request.quantity() < 1) {
            throw new IllegalArgumentException("Quantity must be at least 1");
        }
        // WRONG 2: IllegalArgumentException → 500 Internal Server Error
        // (unless you have a handler for it — but it's the wrong exception for input validation)
        
        // WRONG 3: email validation manually via regex
        if (!request.email().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new IllegalArgumentException("Invalid email");
        }
        // Regex is wrong ↑ — doesn't catch all invalid emails, catches some valid ones
        
        // Only after all this boilerplate does the actual business logic start...
        return orderRepository.save(new Order(request));
    }
}

// No @Valid on the controller method — validation only happens if the service is called
@PostMapping
public Order createOrder(@RequestBody CreateOrderRequest request) {
    return orderService.createOrder(request); // service gets raw, unvalidated data
}
```
> **Why this fails in production:** Validation mixed with business logic makes both harder to understand and test. `IllegalArgumentException` maps to 500 (not 400) without explicit handling. Error messages are inconsistent across methods. When a new developer adds a field to the DTO, they must remember to add a manual check — one missed check and invalid data enters the system.

### Right Way — Bean Validation + Custom Validators
```java
// DTO with Bean Validation annotations
// Use a Java record — immutable, clear field contract
public record CreateOrderRequest(

    @NotBlank(message = "Customer ID is required")
    String customerId,

    @NotEmpty(message = "Order must contain at least one item")
    @Valid  // ← CRITICAL: without @Valid here, nested OrderItemRequest is NOT validated
    List<OrderItemRequest> items,

    @NotNull(message = "Shipping address is required")
    @Valid  // ← also cascade validation into the nested address object
    ShippingAddressRequest shippingAddress,

    @Email(message = "Email must be a valid email address")
    @NotBlank(message = "Email is required")
    String contactEmail,

    // Custom validator annotation (defined below)
    @FutureDateWithinYear(message = "Delivery date must be in the future and within 1 year")
    LocalDate preferredDeliveryDate
) {}

public record OrderItemRequest(
    @NotNull(message = "Product ID is required")
    Long productId,

    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 100, message = "Quantity cannot exceed 100 per item")
    int quantity,

    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    @Digits(integer = 10, fraction = 2, message = "Price must have at most 2 decimal places")
    BigDecimal unitPrice
) {}

public record ShippingAddressRequest(
    @NotBlank(message = "Street is required")
    String street,

    @NotBlank(message = "City is required")
    String city,

    @NotBlank(message = "PIN code is required")
    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "PIN code must be 6 digits")
    String pinCode,

    @Size(min = 2, max = 2, message = "Country code must be 2 characters (e.g., IN, US)")
    String countryCode
) {}
```

```java
// Controller — @Valid triggers validation
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    @PostMapping
    public ResponseEntity<OrderDto> createOrder(
            @RequestBody @Valid CreateOrderRequest request,  // @Valid here triggers all constraints
            UriComponentsBuilder uriBuilder) {

        // If we reach here, the request is valid — no manual null checks needed
        OrderDto created = orderService.create(request);

        URI location = uriBuilder.path("/api/v1/orders/{id}")
            .buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }
}
```

```java
// Custom validator — for business rules that standard annotations cannot express
// Use case: preferred delivery date must be in the future AND within 1 year from now

// Step 1: Define the annotation
@Documented
@Constraint(validatedBy = FutureDateWithinYearValidator.class)  // links to the validator class
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface FutureDateWithinYear {
    String message() default "Date must be in the future and within 1 year";
    Class<?>[] groups() default {};   // required by Jakarta Validation spec
    Class<? extends Payload>[] payload() default {};  // required by spec
}

// Step 2: Implement the validator
public class FutureDateWithinYearValidator
        implements ConstraintValidator<FutureDateWithinYear, LocalDate> {

    @Override
    public void initialize(FutureDateWithinYear constraintAnnotation) {
        // Called once at startup — configure from annotation attributes here if needed
    }

    @Override
    public boolean isValid(LocalDate value, ConstraintValidatorContext context) {
        // null values: return true — let @NotNull handle null separately
        // This follows the "single responsibility" principle for validators
        if (value == null) return true;

        LocalDate today = LocalDate.now();
        LocalDate oneYearFromNow = today.plusYears(1);

        return value.isAfter(today) && !value.isAfter(oneYearFromNow);
    }
}
```

```java
// Service-layer validation with @Validated
// Use when you want validation on service methods directly (not just controllers)
@Service
@Validated  // ← enables method-level validation via Spring AOP for this bean
public class ProductService {

    // @Valid on method parameter — validated when this method is called from anywhere
    // Throws ConstraintViolationException (not MethodArgumentNotValidException) on failure
    public Product createProduct(@Valid @NotNull CreateProductRequest request) {
        return productRepository.save(ProductMapper.toEntity(request));
    }

    // Validated return value — @Valid on return type
    @Valid
    public ProductDto getProduct(@Min(1) Long id) {
        return productRepository.findById(id).map(ProductMapper::toDto)
            .orElseThrow(() -> ResourceNotFoundException.forId("Product", id));
    }
}
```

### Catching ConstraintViolationException from @Validated Services
```java
// In your @ControllerAdvice — add a handler for service-layer validation failures
@ExceptionHandler(ConstraintViolationException.class)
public ResponseEntity<ErrorResponse> handleConstraintViolation(
        ConstraintViolationException ex, HttpServletRequest request) {

    List<FieldError> fieldErrors = ex.getConstraintViolations().stream()
        .map(violation -> new FieldError(
            // Extract just the field name from the full property path
            violation.getPropertyPath().toString(),
            Objects.toString(violation.getInvalidValue(), "null"),
            violation.getMessage()
        ))
        .toList();

    ErrorResponse body = new ErrorResponse(
        "VALIDATION_ERROR",
        "Validation failed",
        HttpStatus.BAD_REQUEST.value(),
        request.getRequestURI(),
        Instant.now(),
        fieldErrors
    );

    return ResponseEntity.badRequest().body(body);
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How does @Valid work in Spring Boot? What happens when validation fails?"

**Hruday's answer:**
> `@Valid` triggers Jakarta Bean Validation on the annotated parameter before the controller method body runs. The flow is: JSON comes in, Jackson deserializes it to the DTO, then Spring's `HandlerMethodArgumentResolver` sees the `@Valid` annotation and calls Hibernate Validator (the standard implementation) on the object.
>
> Hibernate Validator scans each field for constraint annotations — `@NotBlank`, `@Min`, `@Email`, and so on — and evaluates each constraint's `isValid()` method against the actual field value. All violations are collected — not just the first one. If any violations exist, a `MethodArgumentNotValidException` is thrown immediately. The controller method body never runs.
>
> In my `@ControllerAdvice`, I handle `MethodArgumentNotValidException` by extracting each field's violation — the field name, the rejected value, and the message — and returning a 400 Bad Request with a structured error body listing all violated fields. This gives the client a complete picture of everything wrong with their request in a single round-trip.
>
> One critical detail: validation does NOT cascade into nested objects automatically. If your DTO has a nested `AddressRequest` field, you must put `@Valid` on that field too — otherwise the address's constraints are never evaluated.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the difference between @Valid and @Validated? When do you use each?"

**Hruday's answer:**
> `@Valid` is the standard Jakarta Bean Validation annotation — it triggers validation on the annotated method parameter or field. Works on controller `@RequestBody` parameters, nested fields in DTOs, and anywhere you want a full, all-constraints validation.
>
> `@Validated` is Spring's own annotation. It has two purposes. First: enabling method-level validation on a Spring bean. If a `@Service` class is annotated with `@Validated`, Spring wraps it in an AOP proxy that validates parameters and return values on annotated methods. This lets you validate inputs at the service layer too — useful if the service is called from multiple places (HTTP, Kafka, scheduled task) and you want consistent validation regardless of entry point.
>
> Second: validation groups. `@Valid` always triggers ALL constraints. `@Validated(CreateGroup.class)` triggers only constraints that belong to that group. Use groups when the same DTO is used for two different operations — create requires all fields, update allows partial fields. I annotate fields with `@NotBlank(groups = CreateGroup.class)` and the controller method with `@Validated(CreateGroup.class)` or `@Validated(UpdateGroup.class)`.
>
> Practical rule: use `@Valid` for standard controller `@RequestBody` validation. Use `@Validated` when you need validation groups or want to add validation to service layer method parameters.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you NOT put database queries inside a custom ConstraintValidator?"

**Hruday's answer:**
> Almost always — I would not put database queries inside a `ConstraintValidator.isValid()`. Here's why.
>
> Validators are called synchronously during request deserialization — before any transactional context exists. If you autowire a repository and call it from `isValid()`, you are executing a database query outside of any transaction. This is fine technically, but it adds database round-trip overhead to every validation call.
>
> More importantly, validators run for EVERY constraint when `@Valid` is triggered. If you have 5 validators, 3 of which do DB calls, that's 3 separate queries just to validate one request. Under 1000 requests/second, that's 3000 extra DB queries per second from validation alone.
>
> The bigger issue: uniqueness checks in validators have a race condition. You validate `email is unique` → true. Between the validator finishing and the service saving the record, another request saves with the same email. Your validator said it was valid — but the INSERT fails with a unique constraint violation. The validation was technically correct at that millisecond but stale by the time you acted on it.
>
> My approach: keep validators stateless and fast. Check only the input data itself (format, range, pattern) — no database. Move existence and uniqueness checks to the service layer, wrapped in a transaction, with a database unique constraint as the final guarantee. The unique constraint in the database is the only reliable way to prevent duplicates.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "You're building an API that can be called via HTTP controller AND from a Kafka consumer. Both paths create an order. How do you ensure validation runs in both contexts?"

**Hruday's answer:**
> With `@Valid` on the controller alone, the Kafka consumer path has no validation. Invalid messages from Kafka enter the service unchecked.
>
> The solution is service-layer validation with `@Validated` on the service bean. The `OrderService` class gets `@Validated` annotation. The `createOrder(CreateOrderRequest request)` method gets `@NotNull` on the parameter and `@Valid` on the parameter type. Spring wraps the service in an AOP proxy.
>
> Now both paths run the same validation:
> - HTTP controller: Jackson deserializes → controller calls `orderService.createOrder(request)` → AOP proxy validates → service body runs
> - Kafka consumer: Kafka message is deserialized → consumer calls `orderService.createOrder(request)` → AOP proxy validates → service body runs
>
> Validation failures in the Kafka consumer throw `ConstraintViolationException`. The Kafka consumer catches this and sends the message to a Dead Letter Queue (DLQ) with the validation error as metadata — so the invalid message is not retried infinitely and can be inspected by the ops team.
>
> This approach centres the validation in the domain boundary (the service that owns the business rule), not in the transport layer (controller or consumer). The rule "order must have at least one item" is a business rule — it belongs in the service, not in the HTTP layer.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Missing @Valid on nested objects" | "I added @Valid on the method parameter — that's enough" | "`@Valid` on a `@RequestBody` parameter validates the top-level object, but it does NOT automatically cascade into nested objects. Each nested field that has constraints MUST ALSO be annotated with `@Valid`. Example: `@Valid ShippingAddressRequest address` in the DTO. Without this, the address constraints are silently ignored and invalid addresses pass through." |
| "@NotNull vs @NotBlank vs @NotEmpty" | "They're all the same — just choose one" | "`@NotNull`: the value cannot be null (but can be an empty string `\"\"`). `@NotEmpty`: cannot be null and cannot be an empty string or empty collection (size > 0). `@NotBlank`: cannot be null and must contain at least one non-whitespace character. `@NotBlank` subsumes `@NotEmpty` and `@NotNull` for String fields. Use `@NotBlank` for all String fields. Use `@NotEmpty` for collections that must not be empty." |
| "Custom validator with Spring bean injection" | "Just `@Autowired` the repository in the validator" | "Injecting Spring beans into validators works but has pitfalls — the validator is instantiated by the validation framework (Hibernate), not Spring, unless configured properly. You must add a `SpringConstraintValidatorFactory` configuration to make Spring manage validator lifecycle. Alternatively: keep validators stateless — check only the input — and move DB checks to the service layer." |
| "`@Validated` on a class is optional" | "Method validation works without it" | "Without `@Validated` on the class (or `@EnableMethodValidation` in Spring Boot 3), method-level constraint annotations (`@Min`, `@NotNull` on method params) are silently ignored — no error, no validation. The constraint annotations compile fine; they just never run. Always add `@Validated` to the service class when you want method validation." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, I refactored our invoice creation flow after we found that invalid invoices were reaching the database and failing with obscure `DataIntegrityViolationException` errors — lost in our logging as generic 500 errors. I added Bean Validation annotations to the `CreateInvoiceRequest` DTO, wired `@Valid` on the controller parameter, and handled `MethodArgumentNotValidException` in the `@ControllerAdvice`. The result: all input validation failures became structured 400 responses with field-level messages. Partner integrations immediately knew which field they were sending wrong instead of getting a cryptic 500 error. Support tickets for invoice API integration issues dropped by 70% within a month."

---

## 8. Scale Evolution

**1,000 users →** Default Hibernate Validator configuration handles this easily. Bean Validation adds microseconds per request — negligible. Custom validators that are purely computational are fine at any scale.

**100,000 users →** Hibernate Validator caches constraint metadata after the first evaluation per class — warm-up cost only. Large DTOs with many nested `@Valid` fields can add latency on the first N requests after deployment (cold cache). Warm up by sending test requests on pod startup if this matters.

**10 million users →** At this scale, the validation metadata cache is warm and stable. The primary concern shifts to validation rule management: business rules change, constraint annotations change, and version 2 of your DTO has different rules than version 1. API versioning (Topic 59) and separate DTO classes per version keep validation rules isolated. For extremely high-throughput write APIs (payment confirmation callbacks), consider asynchronous validation patterns where basic format validation is synchronous and complex business rule checks are async.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment API inputs — account numbers, amounts, currency codes — must be validated strictly. Malformed inputs that reach the payment processing engine cause failed transactions and partner friction. | "How do you validate an Indian phone number and IFSC code format in a payment API request?" |
| Swiggy / Meesho | High-volume order creation APIs. Invalid quantity, null product IDs, malformed addresses — these must be caught at the API layer, not the database layer. | "Your order API receives 500,000 requests/day. How do you handle validation errors efficiently without generating 500 alerts?" |
| Adobe / Microsoft | Document processing APIs with complex nested request objects. Constraint composition, validation groups, and cascading validation on nested DTOs are required. | "How do you validate a complex multi-level nested request object in Spring Boot?" |
| Remote / Global roles | Bean Validation + `@Valid` is a standard Spring Boot interview topic. Custom validators and the difference between `@Valid` and `@Validated` signal depth beyond the basics. | "Walk me through how you'd add input validation to a Spring Boot REST API from scratch." |

---

## 10. Related Topics — What to Study Next

- **Topic 58 — Exception Handling (@ControllerAdvice)** — validation failures produce `MethodArgumentNotValidException` and `ConstraintViolationException` that must be caught and formatted in the `@ControllerAdvice` — these two topics are used together on every project
- **Topic 57 — @RestController, @RequestMapping, @PathVariable, @RequestBody** — `@Valid` is applied on the `@RequestBody` parameter in the controller method covered in Topic 57 — this is the integration point
- **Topic 56 — REST API Design Principles** — good validation error responses (field-level, structured, 400 not 500) are part of good REST API design — validation and design principles work together
- **Topic 46 — Spring Data JPA Repositories** — JPA entities also have `@NotNull`, `@Column(nullable=false)` constraints that fire during persistence; understanding the two-layer validation model (API validation vs. DB constraint) prevents confusion about when each fires
- **Topic 53 — OAuth 2.0 + OIDC** — when building APIs for external partners, input validation is part of the security posture — malformed input can be an injection vector; always validate request structure before processing

---

*Part 3 · Request Validation (@Valid, Custom Validators) · Full Stack Interview Guide · Hruday D · 2026*
