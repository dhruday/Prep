# Agile & Scrum Testing - Interview Question Bank

## Table of Contents
1. [Agile Fundamentals](#agile-fundamentals)
2. [Scrum Framework](#scrum-framework)
3. [Testing in Agile](#testing-in-agile)
4. [User Stories and Acceptance Criteria](#user-stories-and-acceptance-criteria)
5. [Agile Testing Practices](#agile-testing-practices)

---

## Agile Fundamentals

### Beginner Questions

#### Q1: What is Agile?
**Answer:**

Agile is an iterative approach to software development that delivers value incrementally rather than all at once.

**Agile Manifesto Values:**
1. **Individuals and interactions** over processes and tools
2. **Working software** over comprehensive documentation
3. **Customer collaboration** over contract negotiation
4. **Responding to change** over following a plan

**Key Principles:**
- Deliver working software frequently
- Welcome changing requirements
- Business and developers work together daily
- Continuous improvement

**Simple Explanation:**
Instead of building everything in 2 years, we build small pieces every 2 weeks, getting feedback continuously.

---

#### Q2: What is Scrum?
**Answer:**

Scrum is an Agile framework for developing and delivering complex products.

**Key Elements:**

**Roles:**
- Product Owner - Defines what to build
- Scrum Master - Facilitates process
- Development Team - Builds the product (includes testers)

**Ceremonies:**
- Sprint Planning - Plan sprint work
- Daily Standup - 15-min daily sync
- Sprint Review - Demo completed work
- Sprint Retrospective - Improve process

**Artifacts:**
- Product Backlog - All features/requirements
- Sprint Backlog - Work for current sprint
- Increment - Potentially shippable product

---

#### Q3: What is a Sprint?
**Answer:**

A Sprint is a time-boxed iteration (typically 2-4 weeks) where a set of features is developed.

**Sprint Timeline:**

```
Day 1: Sprint Planning
Days 2-9: Development & Testing
Day 10: Sprint Review + Retrospective
```

**Key Rules:**
- Duration is fixed (usually 2 weeks)
- Scope can be negotiated
- Goal is to deliver working software
- No changes mid-sprint (ideally)

---

#### Q4: What is a User Story?
**Answer:**

A User Story is a short description of a feature from the user's perspective.

**Format:**
```
As a [type of user]
I want [some goal]
So that [some reason/benefit]
```

**Example:**
```
As a registered customer
I want to reset my password
So that I can regain access to my account if I forget it
```

**Components:**
- **Card** - Written story
- **Conversation** - Discussion about story
- **Confirmation** - Acceptance criteria

---

### Intermediate Questions

#### Q5: What are the responsibilities of a QA in Scrum?
**Answer:**

**During Sprint Planning:**
- Review user stories
- Help estimate testing effort
- Identify testing requirements
- Clarify acceptance criteria

**During Sprint:**
- Write/update test cases
- Execute tests as features are ready
- Report and track defects
- Participate in daily standups
- Collaborate with developers

**During Sprint Review:**
- Demo tested features
- Report testing status
- Highlight risks/issues

**During Retrospective:**
- Share testing challenges
- Suggest improvements
- Learn from sprint

---

#### Q6: What is the Definition of Done (DoD)?
**Answer:**

Definition of Done is a checklist of criteria that must be met before a story is considered complete.

**Example DoD:**
- [ ] Code complete and committed
- [ ] Code reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Functional testing complete
- [ ] No critical/major bugs open
- [ ] Documentation updated
- [ ] Deployed to test environment
- [ ] Product Owner accepted

**Who defines it?**
The entire team agrees on DoD.

**Why important?**
- Ensures quality consistency
- Clear expectations
- Avoids "almost done" syndrome

---

#### Q7: What is the Definition of Ready (DoR)?
**Answer:**

Definition of Ready is criteria a user story must meet before it can be picked for a sprint.

**Example DoR:**
- [ ] User story is clearly written
- [ ] Acceptance criteria defined
- [ ] Dependencies identified
- [ ] Story is estimated
- [ ] UX designs available (if needed)
- [ ] Team understands the story

**INVEST Criteria:**
- **I**ndependent
- **N**egotiable
- **V**aluable
- **E**stimable
- **S**mall
- **T**estable

---

#### Q8: How is testing different in Agile vs Waterfall?
**Answer:**

| Aspect | Waterfall Testing | Agile Testing |
|--------|-------------------|---------------|
| When | After development | Throughout sprint |
| Test Planning | Upfront, detailed | Continuous, flexible |
| Documentation | Comprehensive | Minimal, sufficient |
| Feedback | Late | Continuous |
| Test Cases | Fixed | Evolving |
| Automation | Optional | Essential |
| Tester Role | Separate phase | Embedded in team |
| Regression | At the end | Every sprint |
| Defects | Found late | Found early |

---

#### Q9: What is Acceptance Criteria?
**Answer:**

Acceptance Criteria are conditions that a story must satisfy to be accepted by the Product Owner.

**Formats:**

**1. Given-When-Then (BDD Style):**
```gherkin
Given the user is on the login page
When they enter valid credentials and click Login
Then they should be redirected to the dashboard
```

**2. Checklist Style:**
- User can login with email and password
- Invalid credentials show error message
- After 3 failed attempts, account is locked
- "Remember me" keeps user logged in for 30 days

**Best Practices:**
- Specific and testable
- Clear pass/fail criteria
- Written before sprint starts
- Agreed by team and PO

---

#### Q10: What is the Test Pyramid in Agile?
**Answer:**

The Test Pyramid guides the proportion of different test types.

```
        /\
       /  \
      / UI \        <- Few (Slow, Expensive)
     /------\
    /  API   \      <- Some (Medium)
   /----------\
  /   Unit     \    <- Many (Fast, Cheap)
 /--------------\
```

**Distribution:**
- **Unit Tests (70%):** Fast, test individual functions
- **Integration/API Tests (20%):** Test component interactions
- **UI/E2E Tests (10%):** Test user flows

**Why this shape?**
- Unit tests are fast and cheap
- UI tests are slow and brittle
- Find bugs at the lowest level possible

---

### Advanced Questions

#### Q11: What is Behavior-Driven Development (BDD)?
**Answer:**

BDD is a development approach where tests are written in plain English using Given-When-Then format.

**Example:**
```gherkin
Feature: User Login

Scenario: Successful login with valid credentials
  Given I am on the login page
  When I enter username "user@test.com"
  And I enter password "Password123"
  And I click the Login button
  Then I should see the dashboard
  And I should see "Welcome, User" message

Scenario: Failed login with invalid password
  Given I am on the login page
  When I enter username "user@test.com"
  And I enter password "wrongpassword"
  And I click the Login button
  Then I should see error "Invalid credentials"
  And I should remain on login page
```

**Tools:**
- Cucumber (Java, Ruby)
- SpecFlow (.NET)
- Behave (Python)

**Benefits:**
- Business-readable tests
- Living documentation
- Collaboration between BA/QA/Dev

---

#### Q12: What is Test-Driven Development (TDD)?
**Answer:**

TDD is a development practice where tests are written BEFORE code.

**TDD Cycle (Red-Green-Refactor):**
1. **Red:** Write a failing test
2. **Green:** Write minimum code to pass
3. **Refactor:** Improve code without changing behavior

**Example:**
```java
// Step 1: Write failing test
@Test
public void testAdd() {
    Calculator calc = new Calculator();
    assertEquals(5, calc.add(2, 3));
}

// Step 2: Write minimum code to pass
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
}

// Step 3: Refactor if needed
```

**Benefits:**
- Better design
- Confidence in changes
- Living documentation
- Fewer bugs

---

#### Q13: What is Continuous Integration (CI) and how does testing fit?
**Answer:**

CI is the practice of frequently integrating code changes and automatically testing them.

**CI Pipeline:**
```
Code Commit → Build → Unit Tests → Integration Tests → Deploy to Test → Notify
```

**Testing in CI:**
1. **On Every Commit:**
   - Unit tests run automatically
   - Build verification

2. **Nightly/Scheduled:**
   - Full regression suite
   - Performance tests

3. **On Pull Request:**
   - Code review
   - Automated tests
   - Quality gates

**Tools:** Jenkins, GitLab CI, GitHub Actions, Azure DevOps

---

#### Q14: How do you handle testing in short sprints?
**Answer:**

**Strategies:**

1. **Shift-Left Testing**
   - Test early during development
   - Write test cases during story refinement

2. **Automation First**
   - Automate regression tests
   - Run tests continuously

3. **Risk-Based Testing**
   - Prioritize high-risk areas
   - Don't test everything equally

4. **Pair Testing**
   - Work with developers
   - Test as code is written

5. **Sprint Structure:**
   - Day 1-2: Test case preparation
   - Day 3-8: Execute tests as features complete
   - Day 9-10: Final regression, bug fixes

6. **Definition of Done**
   - Include testing requirements
   - Story not done until tested

---

#### Q15: What are Story Points and how does testing factor in?
**Answer:**

Story Points measure relative effort including development AND testing.

**Estimation includes:**
- Development effort
- Testing effort
- Code review time
- Documentation

**Fibonacci Scale:** 1, 2, 3, 5, 8, 13, 21

**Example:**
| Story | Complexity | Testing Effort | Total Points |
|-------|------------|----------------|--------------|
| Simple login | Low | Low | 2 |
| Payment integration | High | High | 13 |
| Profile update | Medium | Medium | 5 |

**QA input in estimation:**
- Complexity of test scenarios
- Test data requirements
- Automation needs
- Integration testing effort

---

## Agile Testing Practices

### Q16: What is Exploratory Testing in Agile?
**Answer:**

Structured exploratory testing using sessions and charters.

**Session-Based Test Management (SBTM):**

**Charter Example:**
```
Explore the checkout process
With multiple payment methods
To discover issues with payment validation
Time: 60 minutes
```

**Session Notes:**
- Tested scenarios
- Bugs found
- Questions raised
- Ideas for more testing

**Benefits in Agile:**
- Fits into sprints
- Adapts to changes
- Finds unexpected bugs

---

#### Q17: What is Three Amigos meeting?
**Answer:**

Three Amigos is a discussion between Business, Development, and Testing before work begins.

**Participants:**
- **Business:** Product Owner/BA
- **Development:** Developer
- **Testing:** QA

**When:** Before sprint or during refinement

**Discussion Points:**
- What are we building? (Business)
- How will we build it? (Dev)
- How will we test it? (QA)
- What could go wrong?
- What are the edge cases?

**Output:**
- Clear understanding
- Refined acceptance criteria
- Identified test scenarios
- Estimated effort

---

#### Q18: How do you write testable User Stories?
**Answer:**

**Good User Story Checklist:**
1. Clear acceptance criteria
2. Specific expected behavior
3. Defined boundaries (what's not included)
4. Testable conditions

**Example - Good Story:**
```
As a customer
I want to filter products by price range
So that I can find products within my budget

Acceptance Criteria:
- Price filter shows min and max input fields
- Default range is $0 to $10000
- Filter updates results without page reload
- Invalid range shows error message
- Results show count of matching products
- Works with other filters (category, brand)
```

**Example - Bad Story:**
```
As a user
I want better search
So that I can find products
```
(No specific criteria, not testable)

---

### Real Interview Scenario Questions

#### Scenario 1: Sprint ends tomorrow, testing is not complete. What do you do?
**Answer:**

1. **Assess the situation:**
   - What's remaining?
   - What's the risk of not testing?

2. **Prioritize:**
   - Focus on critical paths
   - Risk-based testing

3. **Communicate:**
   - Update scrum master/PO
   - Be transparent about coverage

4. **Options:**
   - Complete critical testing, carry over rest
   - Extend sprint (not recommended)
   - Incomplete stories go back to backlog

5. **Retrospective:**
   - Discuss why this happened
   - Plan to prevent in future

---

#### Scenario 2: Developer says there's no time for you to test. Feature must go live.
**Answer:**

1. **Stay calm and professional**

2. **Explain risks:**
   - List potential issues
   - Impact on users
   - Cost of production bugs

3. **Propose alternatives:**
   - Smoke testing (minimum)
   - Deploy with feature flag
   - Limited rollout

4. **Document:**
   - Email the risk
   - Get sign-off from PO/Manager

5. **Escalate if needed:**
   - This is a business decision
   - QA provides information, business decides

---

#### Scenario 3: How do you test when requirements change mid-sprint?
**Answer:**

1. **Immediate Actions:**
   - Understand the change
   - Update acceptance criteria
   - Reassess test cases

2. **Impact Analysis:**
   - What tests need updating?
   - What new tests needed?
   - Re-estimation needed?

3. **Communication:**
   - Discuss in daily standup
   - Align with team on new scope

4. **Execution:**
   - Prioritize new requirements
   - Update automation if needed
   - Document changes

---

## Common Traps & How to Answer Smartly

### Trap 1: "In Agile, do we need documentation?"
**Smart Answer:**
"Yes, we need documentation but the right amount. Agile values 'working software over comprehensive documentation' but doesn't mean no documentation. We maintain:
- Test cases (lighter format)
- Bug reports
- Sprint notes
- Automation scripts (self-documenting)

We keep documentation that provides value, not just for the sake of process."

### Trap 2: "Testers slow down the team. Should we have developers test?"
**Smart Answer:**
"Developers should test their code (unit tests), but dedicated testers add value by:
- Bringing user perspective
- Finding edge cases developers miss
- Exploratory testing skills
- End-to-end thinking
- Quality advocacy

In high-performing teams, developers and testers work together, not sequentially. Testing doesn't slow down delivery; finding bugs in production does."

### Trap 3: "What if the Product Owner doesn't write good acceptance criteria?"
**Smart Answer:**
"This is common. As a QA, I:
1. Ask clarifying questions during refinement
2. Propose acceptance criteria based on my understanding
3. Use Three Amigos meetings to align
4. Document scenarios and get PO confirmation
5. Help PO understand what makes criteria testable

I see it as a collaboration opportunity, not a blocker."

---

## Sprint Testing Checklist

### Sprint Start:
- [ ] Understand all user stories
- [ ] Review acceptance criteria
- [ ] Identify test scenarios
- [ ] Estimate testing effort
- [ ] Prepare test data
- [ ] Update test environment

### During Sprint:
- [ ] Write test cases
- [ ] Test features as they're ready
- [ ] Log defects immediately
- [ ] Communicate blockers
- [ ] Update automation suite
- [ ] Daily status in standup

### Sprint End:
- [ ] Complete regression testing
- [ ] Verify all bugs fixed
- [ ] Update test reports
- [ ] Participate in demo
- [ ] Document lessons learned
- [ ] Retrospective feedback

---

Continue to [03_API_Testing.md](03_API_Testing.md) for API Testing questions.
