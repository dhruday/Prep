# Manual Testing Fundamentals - Interview Question Bank

## Table of Contents
1. [Software Testing Basics](#software-testing-basics)
2. [SDLC & STLC](#sdlc--stlc)
3. [Test Case Design](#test-case-design)
4. [Defect Lifecycle](#defect-lifecycle)
5. [Testing Types](#testing-types)

---

## Software Testing Basics

### Beginner Questions

#### Q1: What is Software Testing?
**Answer:**
Software Testing is the process of evaluating a software application to identify differences between expected and actual results, ensuring the product meets specified requirements.

**Simple Explanation:**
Think of it like quality checking a car before delivery - you test brakes, engine, lights to ensure everything works as expected.

**Practical Example:**
Testing a login page by:
- Entering valid credentials → Should login successfully
- Entering invalid credentials → Should show error message
- Leaving fields empty → Should show validation message

**What Interviewer Expects:**
- Clear definition
- Understanding that testing finds defects, not proves software is defect-free
- Mention of requirements/specifications

**Common Mistakes:**
- Saying "Testing proves software has no bugs" (Wrong! Testing can only find bugs, not prove their absence)
- Not mentioning requirements or expected behavior

---

#### Q2: What is the difference between Error, Defect, Bug, and Failure?
**Answer:**

| Term | Definition | Who Causes It | When |
|------|------------|---------------|------|
| **Error** | Human mistake in understanding or coding | Developer | During development |
| **Defect/Bug** | Deviation from expected behavior in code | Result of error | Found during testing |
| **Failure** | When defect reaches end user and system doesn't perform | Undetected defect | In production |

**Simple Explanation:**
- Error: Developer misunderstands requirement (human mistake)
- Defect: The code has a problem because of that mistake
- Bug: Same as defect (informal term)
- Failure: Customer sees the problem in live system

**Practical Example:**
1. Developer thinks discount should be 10% but requirement says 15% (Error)
2. Code calculates 10% discount (Defect/Bug)
3. Customer gets wrong discount in production (Failure)

**What Interviewer Expects:**
- Clear distinction between all terms
- Understanding of the flow: Error → Defect → Failure

---

#### Q3: What are the principles of Software Testing?
**Answer:**

**7 Principles of Software Testing:**

1. **Testing shows presence of defects, not absence**
   - Testing can find bugs but cannot prove there are no bugs

2. **Exhaustive testing is not possible**
   - Cannot test all combinations; use risk-based testing

3. **Early testing saves time and money**
   - Finding bugs in requirements phase is 100x cheaper than in production

4. **Defect clustering**
   - 80% of defects are found in 20% of modules (Pareto principle)

5. **Pesticide paradox**
   - Same tests repeated won't find new bugs; update test cases regularly

6. **Testing is context-dependent**
   - Banking app testing differs from gaming app testing

7. **Absence of errors fallacy**
   - Bug-free software is useless if it doesn't meet user needs

**What Interviewer Expects:**
- Know all 7 principles with examples
- This is a VERY common question

---

#### Q4: What is Quality Assurance (QA) vs Quality Control (QC)?
**Answer:**

| Aspect | Quality Assurance (QA) | Quality Control (QC) |
|--------|------------------------|----------------------|
| Focus | Process-oriented | Product-oriented |
| When | Throughout SDLC | After product is built |
| Goal | Prevent defects | Detect defects |
| Activity | Reviews, audits, process improvement | Testing, inspection |
| Example | Code review checklist, coding standards | Executing test cases |

**Simple Explanation:**
- QA = "Are we building the product right?" (Process)
- QC = "Did we build the right product?" (Product)

**Practical Example:**
- QA: Ensuring developers follow coding standards, having review process
- QC: Running test cases to find bugs in the application

---

#### Q5: What is Verification and Validation?
**Answer:**

| Aspect | Verification | Validation |
|--------|--------------|------------|
| Definition | Are we building the product right? | Are we building the right product? |
| Focus | Process | Product |
| Methods | Reviews, inspections, walkthroughs | Testing |
| When | Before coding/during development | After coding |
| Example | Reviewing requirements document | Testing the application |

**Memory Trick:**
- Verification = "V" for "Via Reviews"
- Validation = "V" for "Via Testing"

---

### Intermediate Questions

#### Q6: Explain the difference between Static and Dynamic Testing?
**Answer:**

| Aspect | Static Testing | Dynamic Testing |
|--------|----------------|-----------------|
| Code Execution | No | Yes |
| When | Early in SDLC | After code is developed |
| Cost | Less expensive | More expensive |
| Techniques | Reviews, walkthroughs, inspections | Unit, integration, system testing |
| Finds | Defects | Failures |

**Practical Example:**
- Static: Reviewing a login page design document for missing fields
- Dynamic: Actually testing the login page with credentials

**What Interviewer Expects:**
- Understanding that static testing is done WITHOUT running the code
- Examples of both types

---

#### Q7: What is the difference between Re-testing and Regression Testing?
**Answer:**

| Aspect | Re-testing | Regression Testing |
|--------|------------|-------------------|
| Purpose | Verify fixed defect | Ensure fix didn't break existing functionality |
| Scope | Only the fixed area | Entire application or affected areas |
| Test Cases | Same test case that found bug | Existing test suite |
| Automation | Usually manual | Usually automated |

**Practical Example:**
Scenario: Login button was not working, developer fixed it.
- Re-testing: Test the login button again to confirm it works
- Regression: Test other features (registration, forgot password) to ensure they still work

**What Interviewer Expects:**
- Clear distinction
- Real-world scenario explanation

**Common Mistakes:**
- Confusing the two terms
- Not understanding that regression tests unchanged code

---

#### Q8: What is a Test Strategy vs Test Plan?
**Answer:**

| Aspect | Test Strategy | Test Plan |
|--------|---------------|-----------|
| Level | Organization level | Project level |
| Scope | General approach | Specific details |
| Created By | Test Manager/QA Lead | Test Lead/Senior QA |
| Frequency | Once (reused) | Per project |
| Content | Testing approach, standards | Schedule, resources, scope |

**Test Plan Sections:**
1. Test Plan ID
2. Introduction
3. Test Items
4. Features to be tested
5. Features not to be tested
6. Testing approach
7. Pass/Fail criteria
8. Suspension criteria
9. Test deliverables
10. Testing tasks
11. Environment needs
12. Responsibilities
13. Staffing and training
14. Schedule
15. Risks and contingencies
16. Approvals

---

#### Q9: Explain Entry and Exit Criteria in Testing
**Answer:**

**Entry Criteria** (Prerequisites to START testing):
- Requirements document is reviewed and approved
- Test environment is set up
- Test data is available
- Build is deployed and smoke tested
- Test cases are reviewed and approved

**Exit Criteria** (Conditions to STOP testing):
- All planned test cases executed
- Defect density below threshold (e.g., <2 critical bugs)
- Code coverage > 80%
- All critical/high severity defects fixed
- Sign-off from stakeholders

**Practical Example:**
For a banking application:
- Entry: Dev team confirms build is ready, test environment has DB connection
- Exit: 95% test cases passed, no P1/P2 bugs open, UAT sign-off received

---

#### Q10: What is Risk-Based Testing?
**Answer:**

Risk-Based Testing prioritizes testing based on:
1. **Probability** of failure
2. **Impact** of failure

**Risk Calculation:**
Risk = Probability × Impact

**Practical Example:**
| Module | Probability | Impact | Risk Score | Priority |
|--------|-------------|--------|------------|----------|
| Payment | High (3) | High (3) | 9 | P1 |
| Login | Medium (2) | High (3) | 6 | P2 |
| Profile | Low (1) | Low (1) | 1 | P3 |

**Benefits:**
- Focus on critical areas first
- Optimize testing effort with limited time
- Better resource allocation

---

### Advanced Questions

#### Q11: Explain the Test Maturity Model (TMM)
**Answer:**

TMM defines 5 levels of testing maturity:

| Level | Name | Characteristics |
|-------|------|-----------------|
| 1 | Initial | Chaotic, no process, testing = debugging |
| 2 | Definition | Testing separate from debugging, basic test planning |
| 3 | Integration | Testing integrated into SDLC, test organization exists |
| 4 | Management | Testing measured, reviewed, controlled |
| 5 | Optimization | Continuous improvement, defect prevention |

**What Interviewer Expects:**
- Knowledge of process improvement in testing
- Understanding of organizational testing maturity

---

#### Q12: How do you handle testing when requirements are unclear or changing frequently?
**Answer:**

**Strategies:**
1. **Exploratory Testing**
   - Test without predefined scripts
   - Document findings as you go

2. **Session-Based Test Management**
   - Time-boxed testing sessions
   - Charter-based exploration

3. **Risk-Based Prioritization**
   - Focus on high-risk areas first
   - Test most likely user flows

4. **Continuous Communication**
   - Daily standups with product team
   - Clarify requirements immediately

5. **Flexible Test Documentation**
   - Use checklists instead of detailed test cases
   - Update frequently

**Practical Example:**
In an agile project with changing requirements:
- Maintain a living test document
- Automate regression for stable features
- Keep 30% capacity for ad-hoc testing

---

### Real Interview Scenario Questions

#### Scenario 1: You found a critical bug on the release day. What do you do?
**Answer:**
1. **Document immediately** - Capture screenshots, logs, steps
2. **Verify it's reproducible** - Confirm on different environments
3. **Assess impact** - Which users/features affected?
4. **Escalate appropriately** - Inform test lead, project manager
5. **Suggest alternatives**:
   - Hotfix if possible
   - Disable the feature temporarily
   - Delay release if critical

**What NOT to do:**
- Panic
- Hide the bug
- Blame developers

---

#### Scenario 2: Developer says "It works on my machine." How do you respond?
**Answer:**
1. **Stay professional** - Don't get defensive
2. **Gather evidence**:
   - Screenshots
   - Videos
   - Exact steps to reproduce
   - Environment details
3. **Compare environments**:
   - Browser version
   - OS version
   - Database state
   - Configuration files
4. **Reproduce together** - Screen share with developer
5. **Check for environment-specific issues**:
   - Caching
   - Different test data
   - Different configurations

---

#### Scenario 3: You have 100 test cases but only time to execute 20. How do you prioritize?
**Answer:**
1. **Apply Risk-Based Testing**
   - High business impact features first
   - Frequently used functionalities

2. **Consider:**
   - Critical user journeys (login, payment, checkout)
   - Recently changed code
   - Areas with historical defects
   - Regulatory/compliance requirements

3. **Prioritization Matrix:**
   - P1: Must test (core functionality, high risk)
   - P2: Should test (important but stable)
   - P3: Could test (nice to have)
   - P4: Skip (low risk, rarely used)

---

## Common Traps & How to Answer Smartly

### Trap 1: "Can you guarantee the software is bug-free?"
**Smart Answer:**
"No, testing cannot guarantee bug-free software. As per testing principles, testing shows the presence of defects, not their absence. However, I can ensure thorough testing coverage and minimize the risk of critical issues reaching production."

### Trap 2: "What's more important - finding more bugs or completing test cases?"
**Smart Answer:**
"Finding bugs is the goal, not completing test cases. Test cases are a means to find bugs. I focus on risk-based testing to find critical bugs early. However, I maintain a balance - completing planned tests ensures coverage while exploratory testing helps find unexpected issues."

### Trap 3: "Developers test their code. Why do we need testers?"
**Smart Answer:**
"Developers test their code but have a 'builder's bias.' Testers bring:
- Fresh perspective and end-user mindset
- Knowledge of testing techniques (boundary values, equivalence partitioning)
- Understanding of how features interact
- Focus on non-functional aspects (performance, security)
- Independence from implementation details"

---

## SDLC & STLC

### Beginner Questions

#### Q13: What is SDLC?
**Answer:**

**SDLC (Software Development Life Cycle)** is a systematic process for planning, creating, testing, and deploying software.

**Phases:**
1. **Requirement Analysis** - Gather and document requirements
2. **Design** - System architecture and design
3. **Development** - Actual coding
4. **Testing** - Verify and validate
5. **Deployment** - Release to production
6. **Maintenance** - Ongoing support and updates

---

#### Q14: What is STLC?
**Answer:**

**STLC (Software Testing Life Cycle)** is the sequence of testing activities performed during testing.

**Phases:**

| Phase | Activities | Deliverables |
|-------|------------|--------------|
| 1. Requirement Analysis | Understand requirements, identify testable requirements | RTM (draft) |
| 2. Test Planning | Create test plan, estimate effort, identify resources | Test Plan |
| 3. Test Case Development | Write test cases, review, prepare test data | Test Cases, Test Data |
| 4. Environment Setup | Set up test environment, smoke test | Ready environment |
| 5. Test Execution | Execute tests, log defects, retest | Test Results, Defect Reports |
| 6. Test Closure | Generate reports, lessons learned, archive | Test Summary Report |

---

#### Q15: What is RTM (Requirements Traceability Matrix)?
**Answer:**

RTM is a document that maps requirements to test cases, ensuring complete coverage.

**Sample RTM:**

| Req ID | Requirement | Test Case ID | Status | Defect ID |
|--------|-------------|--------------|--------|-----------|
| REQ001 | Login with valid credentials | TC001, TC002 | Pass | - |
| REQ002 | Password reset | TC003, TC004 | Fail | DEF001 |
| REQ003 | Remember me | TC005 | Pass | - |

**Benefits:**
- Ensures 100% requirement coverage
- Tracks testing progress
- Identifies gaps
- Useful for impact analysis

---

### Intermediate Questions

#### Q16: Explain different SDLC models and when to use them
**Answer:**

| Model | When to Use | Testing Approach |
|-------|-------------|------------------|
| **Waterfall** | Requirements are clear and fixed | Testing at the end |
| **V-Model** | When testing needs to be parallel with development | Testing at each phase |
| **Agile** | Changing requirements, need quick delivery | Continuous testing |
| **Spiral** | High-risk projects | Risk-based testing |
| **Iterative** | Large projects with unclear requirements | Testing per iteration |

**V-Model Detail:**
```
Requirements ←→ Acceptance Testing
    ↓                    ↑
  Design ←→ System Testing
    ↓                ↑
  Architecture ←→ Integration Testing
    ↓            ↑
  Coding ←→ Unit Testing
```

---

#### Q17: What is Shift-Left Testing?
**Answer:**

Shift-Left Testing means moving testing activities earlier in the SDLC.

**Traditional:**
Requirements → Design → Code → Test → Deploy

**Shift-Left:**
Testing starts from Requirements phase itself.

**Activities:**
- Review requirements for testability
- Write test cases during design phase
- TDD (Test-Driven Development)
- Early automation

**Benefits:**
- Find defects earlier (cheaper to fix)
- Better quality requirements
- Reduced rework

---

## Test Case Design

### Beginner Questions

#### Q18: What is a Test Case?
**Answer:**

A Test Case is a set of conditions and steps to verify a specific functionality.

**Components:**
1. **Test Case ID** - Unique identifier (TC_LOGIN_001)
2. **Title** - Brief description
3. **Preconditions** - What must be true before testing
4. **Test Steps** - Step-by-step instructions
5. **Test Data** - Input values
6. **Expected Result** - What should happen
7. **Actual Result** - What actually happened
8. **Status** - Pass/Fail/Blocked
9. **Priority** - P1/P2/P3
10. **Comments** - Additional notes

**Example Test Case:**

| Field | Value |
|-------|-------|
| TC ID | TC_LOGIN_001 |
| Title | Verify login with valid credentials |
| Preconditions | User is registered, application is accessible |
| Steps | 1. Open login page<br>2. Enter valid username<br>3. Enter valid password<br>4. Click Login |
| Test Data | Username: testuser@email.com, Password: Test@123 |
| Expected Result | User is redirected to dashboard |
| Priority | P1 |

---

#### Q19: What is the difference between Test Case and Test Scenario?
**Answer:**

| Aspect | Test Scenario | Test Case |
|--------|--------------|-----------|
| Level | High-level | Detailed |
| Focus | What to test | How to test |
| Detail | Brief description | Step-by-step |
| Example | "Test Login Functionality" | "Test login with valid username and password" |

**Test Scenario Example:**
- TS01: Test Login Functionality

**Test Cases under this scenario:**
- TC01: Login with valid credentials
- TC02: Login with invalid password
- TC03: Login with empty fields
- TC04: Login with SQL injection

---

### Intermediate Questions

#### Q20: Explain Equivalence Partitioning with example
**Answer:**

**Equivalence Partitioning** divides input data into valid and invalid partitions, testing one value from each.

**Principle:** If one value in a partition works, all values in that partition should work.

**Example: Age field accepts 18-60**

| Partition | Range | Test Value | Expected |
|-----------|-------|------------|----------|
| Invalid (below) | < 18 | 10 | Error |
| Valid | 18-60 | 35 | Accept |
| Invalid (above) | > 60 | 75 | Error |

**Benefits:**
- Reduces number of test cases
- Ensures coverage of all partitions
- Systematic approach

---

#### Q21: Explain Boundary Value Analysis with example
**Answer:**

**Boundary Value Analysis (BVA)** tests at the boundaries of input ranges where defects are most likely.

**Test values:** Min-1, Min, Min+1, Max-1, Max, Max+1

**Example: Age field accepts 18-60**

| Boundary | Value | Expected |
|----------|-------|----------|
| Min-1 | 17 | Invalid |
| Min | 18 | Valid |
| Min+1 | 19 | Valid |
| Max-1 | 59 | Valid |
| Max | 60 | Valid |
| Max+1 | 61 | Invalid |

**Why boundaries?**
Studies show 40%+ of defects occur at boundaries.

---

#### Q22: Explain Decision Table Testing
**Answer:**

Decision Table Testing captures combinations of conditions and their resulting actions.

**Example: Flight Booking Discount**

| Conditions | R1 | R2 | R3 | R4 |
|------------|----|----|----|----|
| Member? | Y | Y | N | N |
| Booking > $500? | Y | N | Y | N |
| **Actions** |
| 20% discount | X | - | - | - |
| 10% discount | - | X | X | - |
| No discount | - | - | - | X |

**When to use:**
- Multiple input conditions
- Complex business rules
- When output depends on combinations

---

#### Q23: Explain State Transition Testing
**Answer:**

State Transition Testing validates system behavior as it moves between states based on events.

**Example: ATM PIN Validation**

States: S1 (Start), S2 (First attempt failed), S3 (Second attempt failed), S4 (Blocked), S5 (Access Granted)

```
[S1] --Wrong PIN--> [S2] --Wrong PIN--> [S3] --Wrong PIN--> [S4 Blocked]
 |                   |                   |
 |--Correct PIN---> [S5 Access Granted]
```

**State Transition Table:**

| Current State | Event | Next State | Action |
|--------------|-------|------------|--------|
| S1 | Correct PIN | S5 | Grant access |
| S1 | Wrong PIN | S2 | Show error |
| S2 | Correct PIN | S5 | Grant access |
| S2 | Wrong PIN | S3 | Show warning |
| S3 | Wrong PIN | S4 | Block card |

---

### Advanced Questions

#### Q24: Explain Pairwise/All-Pairs Testing
**Answer:**

Pairwise Testing tests all possible pairs of input parameters without testing all combinations.

**Problem:** 3 browsers × 3 OS × 3 screen sizes = 27 combinations

**Pairwise Solution:** Cover all pairs in fewer tests

**Example:**

| Test | Browser | OS | Screen |
|------|---------|-----|--------|
| 1 | Chrome | Windows | Desktop |
| 2 | Chrome | Mac | Tablet |
| 3 | Chrome | Linux | Mobile |
| 4 | Firefox | Windows | Tablet |
| 5 | Firefox | Mac | Mobile |
| 6 | Firefox | Linux | Desktop |
| 7 | Safari | Windows | Mobile |
| 8 | Safari | Mac | Desktop |
| 9 | Safari | Linux | Tablet |

**Tools:** PICT (Microsoft), AllPairs

---

## Defect Lifecycle

### Beginner Questions

#### Q25: What is a Defect/Bug?
**Answer:**

A defect is a flaw in the software that causes it to produce incorrect or unexpected results.

**Defect Report Contents:**
1. Defect ID
2. Title/Summary
3. Description
4. Steps to Reproduce
5. Expected Result
6. Actual Result
7. Severity
8. Priority
9. Environment
10. Screenshots/Videos
11. Assigned To
12. Status

---

#### Q26: Explain the Defect Life Cycle
**Answer:**

```
[New] → [Assigned] → [Open] → [Fixed] → [Retest] → [Verified] → [Closed]
                        ↓                    ↓
                    [Rejected]           [Reopen]
                    [Duplicate]
                    [Deferred]
```

**States Explained:**

| State | Description |
|-------|-------------|
| New | Bug just logged |
| Assigned | Given to developer |
| Open | Developer working on it |
| Fixed | Developer has fixed |
| Retest | Tester verifying fix |
| Verified | Fix confirmed working |
| Closed | Bug resolved |
| Rejected | Not a bug |
| Duplicate | Already reported |
| Deferred | Fix postponed |
| Reopen | Fix didn't work |

---

#### Q27: What is the difference between Severity and Priority?
**Answer:**

| Aspect | Severity | Priority |
|--------|----------|----------|
| Definition | Impact on functionality | Order of fixing |
| Set By | Tester | Project Manager/Business |
| Based On | Technical impact | Business impact |

**Levels:**

**Severity:**
- Critical: System crash, data loss
- Major: Major feature not working
- Minor: Feature works but has issues
- Trivial: Cosmetic issues

**Priority:**
- P1: Fix immediately
- P2: Fix in current release
- P3: Fix in next release
- P4: Fix when possible

**Examples:**

| Issue | Severity | Priority |
|-------|----------|----------|
| App crashes on payment | Critical | P1 |
| Company logo is wrong | Trivial | P1 |
| Help page link broken | Minor | P3 |
| Admin report fails (rarely used) | Major | P3 |

---

### Interview Scenario Questions

#### Scenario: Developer rejects your bug saying "working as designed." What do you do?
**Answer:**
1. **Review requirements** - Check if behavior matches requirements
2. **If requirement supports you:**
   - Share requirement document reference
   - Involve Business Analyst
3. **If requirement is ambiguous:**
   - Escalate to product owner
   - Document as requirement clarification
4. **If developer is right:**
   - Accept gracefully
   - Learn from it

**Key:** Stay professional, rely on documentation, escalate appropriately

---

## Testing Types

### Q28: Explain different types of testing
**Answer:**

#### Functional Testing Types:

| Type | Purpose | When |
|------|---------|------|
| **Unit Testing** | Test individual components | During development |
| **Integration Testing** | Test combined components | After unit testing |
| **System Testing** | Test complete system | After integration |
| **UAT** | User validates requirements | Before release |

#### Non-Functional Testing Types:

| Type | Purpose |
|------|---------|
| **Performance** | Response time, throughput |
| **Load** | Behavior under expected load |
| **Stress** | Behavior beyond capacity |
| **Security** | Vulnerabilities, data protection |
| **Usability** | User-friendliness |
| **Compatibility** | Works across browsers/devices |

---

### Q29: What is Smoke Testing vs Sanity Testing?
**Answer:**

| Aspect | Smoke Testing | Sanity Testing |
|--------|---------------|----------------|
| Also called | Build Verification Testing | Build Acceptance Testing |
| Purpose | Is build stable enough to test? | Is specific fix working? |
| Scope | Wide and shallow | Narrow and deep |
| When | Every new build | After minor changes |
| By Whom | Testers or automated | Testers |
| Documentation | Scripted | Usually unscripted |

**Example:**
- Smoke: After new build, verify login, navigation, major features work
- Sanity: After payment bug fix, deeply test payment functionality

---

### Q30: What is Alpha Testing vs Beta Testing?
**Answer:**

| Aspect | Alpha Testing | Beta Testing |
|--------|---------------|--------------|
| Done By | Internal team | Real users |
| Environment | Dev/Test environment | Production-like |
| When | Before beta | Before release |
| Feedback | From employees | From customers |
| Focus | Functionality | User experience |

---

### Q31: What is Exploratory Testing?
**Answer:**

Exploratory Testing is simultaneous learning, test design, and test execution.

**Characteristics:**
- No predefined test cases
- Tester's creativity and experience
- Session-based (time-boxed)
- Documented as you go

**When to use:**
- Limited time
- Unclear requirements
- After scripted testing
- To find unexpected bugs

**Session Format:**
- Charter: What to test
- Time box: 45-90 minutes
- Notes: Document findings
- Debrief: Review session

---

### Q32: What is Ad-hoc Testing?
**Answer:**

Ad-hoc testing is informal testing without documentation or planning.

**Difference from Exploratory:**

| Aspect | Ad-hoc | Exploratory |
|--------|--------|-------------|
| Planning | None | Charter-based |
| Documentation | None | Session notes |
| Structure | Random | Structured sessions |
| Skill needed | Basic | Expert knowledge |

---

### Q33: What is Regression Testing?
**Answer:**

Regression Testing ensures that new changes haven't broken existing functionality.

**When to do:**
- After bug fixes
- After new features
- After configuration changes
- After upgrades/migrations

**Best Practices:**
1. Maintain regression test suite
2. Prioritize critical paths
3. Automate regression tests
4. Run after every change

**Regression Test Selection:**
- Tests for changed code
- Tests for related features
- Critical path tests
- Previously failing tests

---

### Q34: What is End-to-End Testing?
**Answer:**

E2E Testing validates complete user workflows from start to finish.

**Example: E-commerce Order Flow**
1. User registers
2. Browses products
3. Adds to cart
4. Applies coupon
5. Enters shipping address
6. Makes payment
7. Receives confirmation email
8. Views order in "My Orders"

**Coverage:**
- Frontend
- Backend
- Database
- Third-party integrations
- Email/SMS services

---

This concludes the Manual Testing Fundamentals section. Continue to [02_Agile_Testing.md](02_Agile_Testing.md) for Agile & Scrum testing questions.
