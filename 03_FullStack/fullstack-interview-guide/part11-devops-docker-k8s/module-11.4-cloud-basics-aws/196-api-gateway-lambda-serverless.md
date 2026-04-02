# API Gateway and Lambda — Serverless Awareness
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Lambda = function-as-a-service**: upload code (Java, Node, Python, Go); Lambda runs it in response to events; you pay only for the execution time (100ms billing increments); no server provisioning, no idle cost, scales to thousands of concurrent invocations automatically
- **Execution model**: each Lambda invocation gets its own isolated container — "execution environment"; first invocation = cold start (container provisioning + JVM startup ≈ 500ms-3s for Java); subsequent invocations reuse the warm container (≈ 1-10ms overhead); this is why cold start matters
- **API Gateway**: fully managed service that creates, manages, and publishes REST APIs / HTTP APIs / WebSocket APIs; acts as the "front door" to your Lambda functions (and other AWS services); handles authentication (Cognito, Lambda Authorizers), rate limiting, CORS, request/response transformation, SSL termination
- **Event sources beyond HTTP**: Lambda is triggered by S3 object creation, SQS messages, DynamoDB streams, SNS notifications, EventBridge events, scheduled cron — not just API Gateway HTTP calls
- **Cold start mitigation for Java**: GraalVM native image (Spring Boot 3.x compiles to native binary — cold start drops from 2-3s to 100-200ms); Provisioned Concurrency (keep N Lambda containers warm — cost ≈ paying for idle time); Lambda SnapStart (snapshots the initialised JVM, restores on cold start — 10× faster startup for Java 21)
- **When serverless is NOT the answer**: high sustained throughput (always-busy service pays more on Lambda than long-running containers), long-running processes (Lambda max 15-minute timeout), stateful connections (WebSockets excluded, no persistent connections), or when predictable latency is required (cold starts → unpredictable spikes)
- 🆕 **Gap topic for Hruday**: "I've designed and used serverless APIs at SAP for webhook endpoints and event-driven processing. I'm building depth on cold start mitigation and when to choose Kubernetes vs Lambda"

---

## 1. One-Line Definition
AWS Lambda is an event-driven compute service that runs code in response to triggers without provisioning servers, and API Gateway is the managed HTTP reverse proxy that routes web requests to Lambda functions (and other backends) while handling authentication, rate limiting, and API lifecycle management.

---

## 2. The Problem It Solves

Traditional server-based compute has a fundamental inefficiency: you pay for capacity whether you use it or not. A Spring Boot service on an EC2 instance consumes CPU and memory 24/7 even at 3am when nobody is using it. For a webhook endpoint that fires 10 times per day, you're paying for a server that's idle 99.99% of the time.

Lambda's billing model is compute time only: you pay for the milliseconds your code executes, nothing for idle time. For sporadic workloads — webhook handlers, scheduled batch jobs, document processors, report generators — Lambda is dramatically cheaper than a persistently running service.

The second problem: **scaling from zero to thousands instantly**. Lambda handles the scaling automatically. If 10,000 S3 upload events fire simultaneously, Lambda runs 10,000 concurrent invocations. A traditional server needs to scale out (provision instances, wait for startup) which takes minutes. Lambda scales in milliseconds.

The third problem: **operational overhead**. A Lambda function has no servers to patch, no container images to build and maintain for basic use cases, no capacity planning, no OS maintenance. For a team focused on business logic, Lambda removes an entire category of operational work.

**API Gateway** addresses the "how do clients call Lambda" problem. Lambda functions can't expose a socket to listen on directly. API Gateway sits in front: receives HTTP requests, authenticates them, transforms them if needed, and invokes the Lambda function. It also enforces rate limits (throttling) to protect the Lambda from accidental or malicious traffic spikes.

---

## 3. How It Works Internally

### Lambda Execution Model

```
First invocation (cold start):
  API Gateway receives request → invokes Lambda
    │
    ├── AWS provisions a new execution environment (micro-VM via Firecracker)
    ├── Downloads and unpacks the deployment package (code + dependencies)
    ├── JVM starts (if Java) — class loading, JIT compilation begins
    ├── Spring application context initialises (beans, DB connections, etc.)
    └── Handler method executes
  
  Total time: 500ms - 3000ms for Java/Spring Boot
  User sees: elevated first-request latency

Subsequent invocations within few minutes (warm start):
  API Gateway receives request → invokes Lambda
    └── Reuse existing execution environment (container stays warm for ~15 min)
         Handler method executes immediately
  
  Total time: 1-10ms Lambda overhead + your code execution time
  User sees: normal latency

Concurrent invocations:
  1,000 simultaneous requests arrive
    → Lambda creates up to 1,000 execution environments (all may be cold starts!)
    → Each runs independently with isolated memory/disk
    → All 1,000 complete
    → Some environments kept warm for reuse; others expire after inactivity
  
  Reserved concurrency: set a maximum for a function (prevents one Lambda from consuming all account concurrency)
  Provisioned concurrency: keep N environments warm at all times (cost = idle Lambda time)
```

### API Gateway Types

```
REST API (v1 — legacy, feature-rich):
  Stages, usage plans, API keys, request/response transformations
  More expensive ($3.50/million API calls)
  Use when you need: API keys for customer-facing APIs, per-stage throttling, request validation
  
HTTP API (v2 — modern, recommended for most):
  70% cheaper ($1.00/million API calls)
  Lower latency
  Built-in JWT Authorizer (Cognito, Auth0)
  Lambda proxy integration — request passes directly to Lambda as-is
  Use for: most modern Lambda APIs

WebSocket API:
  Persistent connections for real-time (chat, live dashboards)
  Lambda handles $connect, $disconnect, and message routing
  API Gateway manages the WebSocket state
  
Common pattern: HTTP API + Lambda + JWT Authorizer (Cognito)

Request flow:
  Client → HTTPS → API Gateway
               │
               ├── JWT validation (Cognito User Pool) → 401 if invalid
               ├── Rate limit check (throttling) → 429 if exceeded  
               ├── Request routing (path + method → Lambda function ARN)
               └── Lambda invocation (synchronous) → response → client
```

### Lambda Cold Start Mitigation

```
The cold start problem for Java:
  JVM: 200-500ms to start
  Spring Boot: 500ms - 2000ms to initialise beans
  Combined: 500ms - 3000ms on first invocation
  
  Problematic for: APIs with strict SLAs, user-facing endpoints
  Acceptable for: background processing, S3 event handlers, SQS consumers
  
Mitigation strategies:

1. GraalVM Native Image (Best option for Spring Boot 3.x):
   mvn -Pnative native:compile  (Spring Boot 3.x with spring-native dependency)
   Produces a single native binary (no JVM!)
   Cold start: 50-200ms (vs 2000ms for JVM)
   Trade-off: longer build time; reflection/dynamic proxies require config hints;
              some Spring features need GraalVM hints

2. Lambda SnapStart (Java 21 — second best):
   AWS takes a snapshot of the initialized Lambda execution environment
   On cold start: restore from snapshot instead of starting from scratch
   Cold start: 200-500ms (vs 2000ms without SnapStart)  
   No code changes required — just enable SnapStart on the Lambda config
   Works with Corretto 21

3. Provisioned Concurrency:
   Keep N Lambda environments warm at all times
   Cold starts only for requests beyond N
   Cost: you pay for idle Lambda time (approximately EC2 equivalent pricing)
   Best for: predictable peak patterns (enable before marketing campaign)

4. Minimize initialization code:
   Lazy initialization of non-critical beans: spring.main.lazy-initialization=true
   Avoid expensive operations at startup (DB connection pool size = 1 initially)
   Keep deployment package small (reduce download time)
```

---

## 4. The Code

### Wrong Way — Putting Lambda Antipatterns in Code
```java
// ❌ WRONG — initialising expensive resources INSIDE the handler method
public class PaymentWebhookHandler implements RequestHandler<SQSEvent, Void> {
    
    @Override
    public Void handleRequest(SQSEvent event, Context context) {
        // Creating database connection on every invocation!
        // Each Lambda invocation = new connection attempt = high latency
        Connection conn = DriverManager.getConnection("jdbc:postgresql://...", "user", "pass");
        // Also: hardcoded credentials in code — OWASP A02 violation
        
        for (SQSMessage message : event.getRecords()) {
            // Process message
        }
        
        conn.close();
        return null;
    }
}
```

> **Why this fails:** Creating DB connections inside the handler means every invocation pays the connection overhead (~200ms for PostgreSQL). Connection pooling in Lambda is only effective if the pool is initialised ONCE (outside the handler, in the static initializer or constructor) and reused across warm invocations. Hardcoded credentials are a critical security vulnerability. Additionally, this Lambda would exhaust database connections rapidly under concurrency — 1,000 concurrent invocations × 1 connection each = 1,000 simultaneous connection attempts.

### Right Way — Spring Boot on Lambda with AWS Lambda Web Adapter
```xml
<!-- pom.xml — Spring Boot Lambda dependencies -->
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- AWS SDK v2 for Lambda-specific features -->
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>lambda</artifactId>
    </dependency>
    
    <!-- Optional: for GraalVM native image support -->
    <dependency>
        <groupId>org.springframework.experimental</groupId>
        <artifactId>spring-aot</artifactId>
    </dependency>
</dependencies>
```

```java
// Option 1: AWS Lambda Web Adapter (recommended for Spring Boot on Lambda)
// Allows using regular Spring Boot REST controllers — no Lambda SDK changes needed
// The Lambda Web Adapter runs inside the Lambda container as a wrapper process
// It converts Lambda HTTP event format to standard HTTP and proxies to Spring Boot

// Your normal Spring Boot controller — zero Lambda-specific code:
@RestController
@RequestMapping("/webhooks")
public class PaymentWebhookController {
    
    private final PaymentWebhookService webhookService;
    
    public PaymentWebhookController(PaymentWebhookService webhookService) {
        this.webhookService = webhookService;
    }
    
    @PostMapping("/stripe")
    public ResponseEntity<Void> handleStripeWebhook(
            @RequestHeader("Stripe-Signature") String signature,
            @RequestBody String payload
    ) {
        // Verify webhook signature (security — prevents spoofed webhook events)
        webhookService.verifyAndProcess(signature, payload);
        return ResponseEntity.ok().build();
    }
}
// Deploy this to Lambda via Lambda Web Adapter — runs as a standard Spring Boot app
// which LWA wraps in a Lambda-compatible shell

// Option 2: Direct Lambda handler (for simple functions without Spring):
public class S3DocumentProcessor implements RequestHandler<S3Event, String> {
    
    // CORRECT: Initialise expensive resources ONCE at class level
    // These are created on cold start and reused across warm invocations
    private static final S3Client s3Client = S3Client.builder()
        .region(Region.AP_SOUTH_1)
        .build();
    
    private static final TextAnalyticsClient analysisClient;
    
    static {
        // One-time initialisation: runs on cold start, reused on warm starts
        // Credentials come from the Lambda execution role (IAM) — no hardcoded creds
        String apiKey = System.getenv("TEXT_ANALYSIS_API_KEY");   // From Lambda env vars / Secrets Manager
        analysisClient = new TextAnalyticsClient(apiKey);
    }
    
    @Override
    public String handleRequest(S3Event event, Context context) {
        for (S3EventNotificationRecord record : event.getRecords()) {
            String bucketName = record.getS3().getBucket().getName();
            String objectKey = record.getS3().getObject().getKey();
            
            // Process the document using the pre-initialised clients (no re-init cost)
            byte[] content = s3Client.getObjectAsBytes(
                GetObjectRequest.builder().bucket(bucketName).key(objectKey).build()
            ).asByteArray();
            
            String analysis = analysisClient.analyseText(new String(content));
            
            // Store result
            s3Client.putObject(
                PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey.replace("uploads/", "processed/") + ".analysis.json")
                    .build(),
                RequestBody.fromString(analysis)
            );
        }
        return "Processed " + event.getRecords().size() + " documents";
    }
}
```

```yaml
# API Gateway HTTP API + Lambda — via AWS SAM (Serverless Application Model)
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: java21
    MemorySize: 1024                    # More memory = more CPU allocated = faster cold start
    Timeout: 30                         # 30 seconds max execution
    Environment:
      Variables:
        SPRING_PROFILES_ACTIVE: production
    Architectures:
      - arm64                           # Graviton2 — 20% cheaper than x86

Resources:
  PaymentWebhookFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: org.springframework.cloud.function.adapter.aws.FunctionInvoker::handleRequest
      CodeUri: target/payment-webhook-1.0.0.jar
      
      # Lambda SnapStart (Java 21) — enable for 10× faster cold start
      SnapStart:
        ApplyOn: PublishedVersions
      
      # Restricts this Lambda from consuming all account concurrency
      ReservedConcurrentExecutions: 100
      
      # IAM role — only what's needed (least privilege)
      Policies:
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - s3:PutObject
                - s3:GetObject
              Resource: !Sub 'arn:aws:s3:::${DocumentsBucket}/*'
            - Effect: Allow
              Action:
                - secretsmanager:GetSecretValue
              Resource: !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:payment/*'
      
      # API Gateway trigger
      Events:
        StripeWebhook:
          Type: HttpApi
          Properties:
            ApiId: !Ref PaymentHttpApi
            Path: /webhooks/stripe
            Method: POST
        
        DocumentUpload:                 # Also triggered by S3 uploads
          Type: S3
          Properties:
            Bucket: !Ref DocumentsBucket
            Events: s3:ObjectCreated:*
            Filter:
              S3Key:
                Rules:
                  - Name: prefix
                    Value: uploads/

  PaymentHttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            IdentitySource: $request.header.Authorization
            JwtConfiguration:
              audience:
                - !Ref CognitoAppClientId
              issuer: !Sub 'https://cognito-idp.${AWS::Region}.amazonaws.com/${CognitoUserPoolId}'
      
      # Throttling
      DefaultRouteSettings:
        ThrottlingBurstLimit: 100       # Max 100 request burst
        ThrottlingRateLimit: 50         # 50 requests per second sustained
      
      CorsConfiguration:
        AllowOrigins:
          - 'https://app.payment-company.com'
        AllowHeaders:
          - Content-Type
          - Authorization
        AllowMethods:
          - POST
          - GET
          - OPTIONS
```

> **Key decisions here:**
> - Static initialisation for shared resources — AWS Lambda reuses execution environments for warm invocations; any resource created at class load time (static blocks, constructor of handler class) is reused across invocations; DB connections, HTTP clients, and SDK clients should all be static; creating them per-invocation wastes the cold start's initialization and creates new resources on each call
> - `MemorySize: 1024` — Lambda CPU allocation is proportional to memory; 128MB gets 0.08 vCPU, 1024MB gets 0.625 vCPU, 3008MB gets 2 vCPU; for Java, starting with 1024MB or higher reduces cold start time significantly; tune with AWS Lambda Power Tuning tool after deployment
> - IAM policy with specific Resource ARNs — never use `Resource: "*"` for production Lambda; specify the exact S3 bucket, exact Secrets Manager secret ARN; this is the least-privilege principle applied to Lambda

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is AWS Lambda and when would you use it over a traditional server?"

**Hruday's answer:**
> Lambda is AWS's function-as-a-service offering — you deploy code, and Lambda runs it in response to events without you provisioning or managing any servers. You pay only for actual execution time with 100ms precision — no idle cost.
>
> I'd choose Lambda for: event-driven processing where traffic is sparse or highly variable (webhook handlers, S3 event processors, scheduled jobs), background async work (sending emails, processing uploads, generating reports), and APIs with predictable low-frequency usage where a persistently running container would be mostly idle.
>
> Lambda is the wrong choice for: high-throughput synchronous APIs where cold start latency is unacceptable (a payment checkout API hitting Lambda may get a 2-3 second cold start spike), background workers that run continuously, anything requiring persistent connections (Lambda shares no state between invocations), and processes running longer than 15 minutes (Lambda's maximum timeout).
>
> The break-even point on cost: Lambda becomes more expensive than an equivalent ECS/EKS container when the function runs more than about 15-20% of the time. Below that, Lambda is cheaper. Above that, a container (billed at full hourly rate but highly utilized) is more economical. At Razorpay's payment transaction volume, the checkout API lives on ECS/EKS. The Stripe webhook handler that fires 50x/day lives on Lambda.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain the Lambda cold start problem and how you mitigate it for a Java application."

**Hruday's answer:**
> Lambda cold start happens when your function is invoked but there's no warm execution environment available. AWS provisions a new micro-VM (using Firecracker), downloads and unpacks your deployment package, starts the JVM, and runs your static initializer and constructor code before your handler even executes.
>
> For Java, the JVM start itself takes 200-500ms. Spring Boot adds another 500ms-2000ms of platform initialisation (bean loading, auto-configuration processing, database connection pool creation). Combined, a Java/Spring Boot Lambda can take 1-3 seconds on a cold start.
>
> Three mitigation approaches, in preferential order:
>
> First choice for Spring Boot 3.x: GraalVM native image. `spring-native` compiles the Spring Boot app to a native binary at build time using ahead-of-time compilation. The Lambda has no JVM to start — cold start drops to 50-200ms. The trade-off: build time increases to 3-5 minutes, and reflection-heavy code (some Spring annotations) requires GraalVM hints to compile correctly.
>
> Second choice: Lambda SnapStart (Java 21). AWS snapshots the execution environment after initialisation and restores from the snapshot on cold start. No code changes — enable it in the Lambda configuration. Cold start drops from ~2000ms to ~200ms. Requires Java 21 runtime.
>
> Third choice: Provisioned Concurrency. Keep N Lambda environments warm at all times. On cold start, these N invocations see zero cold start overhead. Invocations beyond N may still cold start. This is the most expensive option — you pay for idle warm environments.
>
> In practice: GraalVM native image for latency-sensitive APIs, Lambda SnapStart for the remaining Java functions on Java 21, and accept cold starts for background processors where latency isn't critical.

---

### Q3 — Trade-Off
**Interviewer asks:** "Why would you choose Kubernetes over Lambda for a microservices architecture?"

**Hruday's answer:**
> Lambda is excellent for event-driven, sporadic workloads. Kubernetes is better for most microservices for several reasons.
>
> Latency predictability: Kubernetes pods run continuously; there's no cold start. A payment checkout API running on Kubernetes has consistent single-digit millisecond response times. The same on Lambda has occasionally 500ms-3000ms cold starts, which is unacceptable for user-facing APIs without native compilation or Provisioned Concurrency (which erodes the cost benefit).
>
> Cost for sustained load: a 4-pod payment service on Kubernetes (running 24/7, handling 500 req/s) costs approximately fixed EC2 instance pricing. Lambda charging per 100ms of execution for 500 req/s × 50ms average duration = 25 seconds of compute per second = costs more than the equivalent ECS/EKS. Lambda is cheaper only for sporadic workloads.
>
> Operational consistency: if your team is already running Kubernetes for 10 services, adding another service to the cluster is zero new infrastructure learning. Adding Lambda introduces a new deployment model, new debugging tools, new cold start concerns, new IAM patterns. Operational consistency is undervalued until something breaks at 3am.
>
> Where Lambda wins even in a Kubernetes shop: webhook handlers, async processors triggered by S3/SQS events, scheduled batch jobs, and any workload with high peak-to-average ratio where Lambda's scale-from-zero saves significant cost. We used Lambda at SAP for our webhook receivers and document processing jobs alongside our main services on AKS.

---

### Q4 — Scenario
**Interviewer asks:** "You have a Spring Boot Lambda function experiencing cold starts at 4 seconds. What's your debugging and optimisation approach?"

**Hruday's answer:**
> 4 seconds is a very long cold start — well above the 1-3 second typical Spring Boot range. Something is slow in the initialisation path.
>
> First step: add detailed timing within the Spring Boot startup to identify which beans or auto-configuration are taking the most time. Spring Boot's startup actuator endpoint (`spring.jmx.enabled=false` first to avoid JMX overhead) can show bean initialisation times. Look for any synchronous remote calls during startup — a service bean that calls an external API in its `@PostConstruct` method will add that API's round-trip time to EVERY cold start.
>
> Second step: profile the deployment package size. Download times from S3 at cold start contribute to total cold start time. A 100MB fat JAR takes longer to unpack than a 20MB optimised JAR. Split common dependencies into a Lambda Layer that's cached separately; only your application code changes between deployments.
>
> Third step: check if Spring Boot autoconfiguration is loading unnecessary modules. Use `spring.autoconfigure.exclude` to exclude autoconfiguration classes not needed in Lambda context. `spring.main.lazy-initialization=true` defers bean creation until first use rather than at startup — at the cost of first-request latency instead of cold start latency.
>
> Fourth step: consider GraalVM native image. If all optimisation still leaves cold start at 2+ seconds, compile to native binary. Lambda SnapStart (Java 21) is the simpler option if migration to native is complex.
>
> I'd also set CloudWatch alarms on `AWS/Lambda InitDuration` metric — this measures only the initialisation phase (before handler execution), giving precise tracking of cold start improvement over time.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Lambda scales infinitely" | "Lambda scales to handle any load automatically" | Lambda has account-level concurrency limits (1,000 concurrent executions per region by default); exceeding this causes throttling (HTTP 429); request a concurrency limit increase or set reserved concurrency for critical functions with predictable peaks |
| "Lambda is always cheaper" | "Use Lambda everywhere to save costs" | Lambda is cheaper than idle servers; Lambda is MORE expensive than busy servers; at 50%+ utilisation factor, ECS/EKS is cheaper; use Lambda for high-variance, event-driven workloads; containers for steady-state services |
| "Cold starts only happen once" | "After the first request, there are no more cold starts" | Cold starts happen whenever Lambda creates a NEW execution environment — after scale-out events (10,000 simultaneous requests), after periods of inactivity (environments expire after ~15 minutes idle), and after deployments (old containers are replaced) |
| "Static initializers cause memory leaks" | "Don't use static resources in Lambda" | Static resources in Lambda are correct — they're shared across warm invocations safely; the Lambda container is isolated (not shared between functions); static DB connections are intentional and correct; the pool should be sized small (Lambda has no persistent pool but warm invocations share the static connection) |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we had a Spring Boot Lambda function that handled Stripe webhook events. The initial implementation showed 2.5-second cold starts when Stripe sent the first event after a quiet period. I traced the slow initialisation to our Liquibase migration check at startup — the bean was running `SELECT 1` to verify DB connectivity plus checking the migration table on every cold start.
>
> I moved the Liquibase check to a separate, infrequently-invoked Lambda (a startup health check only triggered by pipeline deployments) and made the webhook handler use lazy initialization for the non-critical beans. This cut cold start to 800ms. Enabling Lambda SnapStart (we were on Java 21) brought it to 150ms — imperceptible to the Stripe 30-second webhook timeout window.
>
> I also used SAM (Serverless Application Model) to define the entire API Gateway + Lambda infrastructure as code, which we reviewed in PRs alongside the application code — same GitOps discipline as our Kubernetes YAML."

---

## 8. Scale Evolution

**1,000 users/day →** Lambda + API Gateway HTTP API is ideal — 1,000 req/day is sporadic; Lambda costs virtually nothing; no infrastructure to manage; one developer can build and deploy a full API in a day.

**100,000 users/day →** Lambda SnapStart or GraalVM native for cold start reduction; reserved concurrency set to prevent Lambda from starving other functions; X-Ray distributed tracing enabled; API Gateway throttling tuned; CloudWatch alarms on Lambda error rate and duration p99.

**10 million users/day →** At this scale, sustained Lambda use for synchronous APIs may exceed cost-effectiveness of containers; evaluate ECS/EKS for high-frequency synchronous APIs; Lambda retained for event-driven processing (S3, SQS, EventBridge); Lambda@Edge for edge compute (CDN-level TypeScript functions, not Java); Provisioned Concurrency with Application Auto Scaling for peak hour pre-warming.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Webhook processing for payment events (Stripe, banking APIs) is a prime Lambda use case; trigger-based notification sending (SMS, email) via Lambda + SQS; senior engineers expected to know when to use Lambda vs persistent services | Explain cold start mitigation; know Lambda pricing model vs ECS/EKS |
| Swiggy / Meesho | Event-driven image processing (resize and compress food images on S3 upload), scheduled analytics aggregation Lambda, push notification Lambda; high-volume async processing scenarios | Know Lambda event sources (S3, SQS); explain concurrent execution model |
| Adobe / Microsoft | Adobe uses Lambda for creative asset processing pipelines (PDF generation, image transforms); Microsoft uses Azure Functions (same pattern); the concepts transfer across clouds | Understand the execution model deeply; GraalVM for Java Functions cold start |
| SAP Labs | SAP BTP uses Lambda for webhook receivers and event processing connectors; SAP integration patterns often use Lambda as the bridge between enterprise APIs and event buses | Direct webhook Lambda experience; SnapStart on Java 21; SAM template authorship |

---

## 10. Related Topics — What to Study Next

- **Topic 199 — VPC, Security Groups, IAM** — Lambda's IAM execution role determines what AWS services it can access (S3, Secrets Manager, RDS); VPC-attached Lambdas can access RDS in private subnets but have a higher cold start due to ENI creation; IAM API Gateway Authorizer vs Lambda Authorizer vs Cognito JWT Authorizer comparison
- **Topic 195 — EC2, S3, RDS** — Lambda frequently integrates with all three: triggered by S3 object creation (event source), stores results to S3, reads and writes to RDS (connection pooling via RDS Proxy is important at concurrency scale), runs on EC2 infrastructure managed by AWS
- **Topic 198 — CloudWatch Logs, Metrics, Alarms** — every Lambda invocation generates logs in CloudWatch; `InitDuration` metric tracks cold start time; `Duration` tracks execution; `ConcurrentExecutions` shows scaling behaviour; CloudWatch Insights runs SQL-like queries on Lambda logs; X-Ray distributed tracing maps the full request chain through API Gateway → Lambda → RDS/S3
- **Topic 191 — GitHub Actions** — deploying Lambda via GitHub Actions uses `aws-actions/configure-aws-credentials` with OIDC (same as EKS deployments), followed by `sam deploy` or `aws lambda update-function-code`; the CI/CD pattern for Lambda is distinct from Kubernetes but shares the same OIDC-based auth approach

---

*Part 11 · API Gateway and Lambda — Serverless Awareness · Full Stack Interview Guide · Hruday D · 2026*
