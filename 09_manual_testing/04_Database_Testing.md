# Database Testing & SQL for Testers - Interview Question Bank

## Table of Contents
1. [Database Fundamentals](#database-fundamentals)
2. [SQL Basics](#sql-basics)
3. [SQL Queries for Testing](#sql-queries-for-testing)
4. [Database Testing Techniques](#database-testing-techniques)
5. [Advanced SQL Concepts](#advanced-sql-concepts)

---

## Database Fundamentals

### Beginner Questions

#### Q1: What is a Database?
**Answer:**

A database is an organized collection of structured data stored electronically.

**Types:**
- **Relational (SQL):** MySQL, PostgreSQL, Oracle, SQL Server
- **NoSQL:** MongoDB, Cassandra, Redis

**Key Concepts:**
- **Table:** Collection of related data (rows and columns)
- **Row:** Single record
- **Column:** Field/attribute
- **Primary Key:** Unique identifier for each row
- **Foreign Key:** Links to primary key in another table

---

#### Q2: What is Database Testing?
**Answer:**

Database Testing validates data integrity, stored procedures, triggers, and database operations.

**Types of Database Testing:**

1. **Data Validity Testing**
   - Correct data stored/retrieved

2. **Data Integrity Testing**
   - Constraints are enforced
   - Referential integrity maintained

3. **Performance Testing**
   - Query performance
   - Index effectiveness

4. **Procedure/Function Testing**
   - Stored procedures work correctly

5. **Trigger Testing**
   - Triggers fire appropriately

---

#### Q3: What is the difference between Primary Key and Foreign Key?
**Answer:**

| Aspect | Primary Key | Foreign Key |
|--------|-------------|-------------|
| Purpose | Uniquely identify row | Link to another table |
| Uniqueness | Must be unique | Can have duplicates |
| Null | Cannot be null | Can be null |
| Count | One per table | Multiple allowed |

**Example:**
```sql
-- Primary Key
CREATE TABLE Users (
    user_id INT PRIMARY KEY,
    name VARCHAR(100)
);

-- Foreign Key
CREATE TABLE Orders (
    order_id INT PRIMARY KEY,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
```

---

#### Q4: What are database constraints?
**Answer:**

Constraints enforce rules on data in tables.

| Constraint | Purpose | Example |
|------------|---------|---------|
| PRIMARY KEY | Unique identifier | `user_id INT PRIMARY KEY` |
| FOREIGN KEY | Referential integrity | `REFERENCES Users(id)` |
| UNIQUE | No duplicate values | `email VARCHAR(100) UNIQUE` |
| NOT NULL | No null values | `name VARCHAR(100) NOT NULL` |
| CHECK | Validate values | `CHECK (age >= 18)` |
| DEFAULT | Default value | `status VARCHAR(20) DEFAULT 'active'` |

---

## SQL Basics

### Beginner Questions

#### Q5: What is SQL?
**Answer:**

SQL (Structured Query Language) is the standard language for interacting with relational databases.

**SQL Categories:**

| Category | Commands | Purpose |
|----------|----------|---------|
| DDL | CREATE, ALTER, DROP | Define structure |
| DML | INSERT, UPDATE, DELETE | Modify data |
| DQL | SELECT | Query data |
| DCL | GRANT, REVOKE | Control access |
| TCL | COMMIT, ROLLBACK | Transaction control |

---

#### Q6: How do you retrieve all data from a table?
**Answer:**

```sql
-- All columns
SELECT * FROM users;

-- Specific columns
SELECT id, name, email FROM users;

-- With alias
SELECT id, name AS username, email AS contact FROM users;
```

**Best Practice:**
- Avoid `SELECT *` in production
- Select only needed columns

---

#### Q7: How do you filter data with WHERE clause?
**Answer:**

```sql
-- Single condition
SELECT * FROM users WHERE status = 'active';

-- Multiple conditions (AND)
SELECT * FROM users WHERE status = 'active' AND age > 18;

-- Multiple conditions (OR)
SELECT * FROM users WHERE role = 'admin' OR role = 'manager';

-- IN operator
SELECT * FROM users WHERE role IN ('admin', 'manager', 'user');

-- BETWEEN
SELECT * FROM users WHERE age BETWEEN 18 AND 65;

-- LIKE (pattern matching)
SELECT * FROM users WHERE email LIKE '%@gmail.com';
SELECT * FROM users WHERE name LIKE 'John%';  -- Starts with John
SELECT * FROM users WHERE name LIKE '%son';   -- Ends with son
SELECT * FROM users WHERE name LIKE '%oh%';   -- Contains oh

-- IS NULL
SELECT * FROM users WHERE phone IS NULL;
SELECT * FROM users WHERE phone IS NOT NULL;
```

---

#### Q8: How do you sort results?
**Answer:**

```sql
-- Ascending (default)
SELECT * FROM users ORDER BY name ASC;

-- Descending
SELECT * FROM users ORDER BY created_at DESC;

-- Multiple columns
SELECT * FROM users ORDER BY role ASC, name ASC;

-- With LIMIT
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;

-- With OFFSET (pagination)
SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 20;
```

---

### Intermediate Questions

#### Q9: Explain different types of JOINs
**Answer:**

**Sample Tables:**
```
Users                    Orders
+----+-------+          +----+---------+--------+
| id | name  |          | id | user_id | amount |
+----+-------+          +----+---------+--------+
| 1  | John  |          | 1  | 1       | 100    |
| 2  | Jane  |          | 2  | 1       | 200    |
| 3  | Bob   |          | 3  | 4       | 150    |
+----+-------+          +----+---------+--------+
```

**INNER JOIN:**
Returns matching rows from both tables.
```sql
SELECT u.name, o.amount
FROM Users u
INNER JOIN Orders o ON u.id = o.user_id;

-- Result:
-- John | 100
-- John | 200
```

**LEFT JOIN:**
All rows from left table + matching from right.
```sql
SELECT u.name, o.amount
FROM Users u
LEFT JOIN Orders o ON u.id = o.user_id;

-- Result:
-- John | 100
-- John | 200
-- Jane | NULL
-- Bob  | NULL
```

**RIGHT JOIN:**
All rows from right table + matching from left.
```sql
SELECT u.name, o.amount
FROM Users u
RIGHT JOIN Orders o ON u.id = o.user_id;

-- Result:
-- John | 100
-- John | 200
-- NULL | 150  (user_id 4 doesn't exist)
```

**FULL OUTER JOIN:**
All rows from both tables.
```sql
SELECT u.name, o.amount
FROM Users u
FULL OUTER JOIN Orders o ON u.id = o.user_id;

-- Result:
-- John | 100
-- John | 200
-- Jane | NULL
-- Bob  | NULL
-- NULL | 150
```

---

#### Q10: What are Aggregate Functions?
**Answer:**

| Function | Purpose | Example |
|----------|---------|---------|
| COUNT | Count rows | `COUNT(*)` |
| SUM | Sum values | `SUM(amount)` |
| AVG | Average | `AVG(price)` |
| MAX | Maximum | `MAX(salary)` |
| MIN | Minimum | `MIN(age)` |

**Examples:**
```sql
-- Count all users
SELECT COUNT(*) FROM users;

-- Count active users
SELECT COUNT(*) FROM users WHERE status = 'active';

-- Total order amount
SELECT SUM(amount) FROM orders;

-- Average order value
SELECT AVG(amount) FROM orders;

-- Min and Max
SELECT MIN(price), MAX(price) FROM products;
```

---

#### Q11: Explain GROUP BY and HAVING
**Answer:**

**GROUP BY:** Groups rows with same values.
**HAVING:** Filters groups (like WHERE for groups).

```sql
-- Count users per role
SELECT role, COUNT(*) as user_count
FROM users
GROUP BY role;

-- Total orders per customer
SELECT user_id, COUNT(*) as order_count, SUM(amount) as total
FROM orders
GROUP BY user_id;

-- HAVING - filter groups
-- Customers with more than 5 orders
SELECT user_id, COUNT(*) as order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5;

-- Roles with more than 10 users
SELECT role, COUNT(*) as count
FROM users
GROUP BY role
HAVING COUNT(*) > 10;
```

**Order of Execution:**
```
FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY
```

---

#### Q12: What is the difference between WHERE and HAVING?
**Answer:**

| Aspect | WHERE | HAVING |
|--------|-------|--------|
| Filters | Individual rows | Groups |
| Used with | SELECT, UPDATE, DELETE | GROUP BY |
| Aggregate functions | Cannot use | Can use |
| Execution order | Before grouping | After grouping |

**Example:**
```sql
-- WHERE: filter rows before grouping
SELECT department, AVG(salary)
FROM employees
WHERE status = 'active'
GROUP BY department;

-- HAVING: filter groups after aggregation
SELECT department, AVG(salary) as avg_salary
FROM employees
GROUP BY department
HAVING AVG(salary) > 50000;

-- Both together
SELECT department, AVG(salary) as avg_salary
FROM employees
WHERE status = 'active'
GROUP BY department
HAVING AVG(salary) > 50000;
```

---

#### Q13: What are Subqueries?
**Answer:**

A subquery is a query nested inside another query.

**In WHERE clause:**
```sql
-- Users who have placed orders
SELECT * FROM users
WHERE id IN (SELECT DISTINCT user_id FROM orders);

-- Users with no orders
SELECT * FROM users
WHERE id NOT IN (SELECT DISTINCT user_id FROM orders);

-- Products priced above average
SELECT * FROM products
WHERE price > (SELECT AVG(price) FROM products);
```

**In FROM clause (Derived Table):**
```sql
SELECT dept, avg_salary
FROM (
    SELECT department as dept, AVG(salary) as avg_salary
    FROM employees
    GROUP BY department
) as dept_salaries
WHERE avg_salary > 50000;
```

**In SELECT clause:**
```sql
SELECT 
    name,
    (SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) as order_count
FROM users;
```

---

## SQL Queries for Testing

### Q14: Common SQL queries used in testing
**Answer:**

**1. Verify Record Created:**
```sql
-- After creating user via API
SELECT * FROM users WHERE email = 'newuser@test.com';

-- Check count increased
SELECT COUNT(*) FROM users;
```

**2. Verify Record Updated:**
```sql
-- After updating user
SELECT name, email, updated_at
FROM users
WHERE id = 123;
```

**3. Verify Record Deleted:**
```sql
-- Should return no rows
SELECT * FROM users WHERE id = 123;

-- Or check with soft delete
SELECT * FROM users WHERE id = 123 AND deleted_at IS NOT NULL;
```

**4. Check Data Integrity:**
```sql
-- Find orphan records
SELECT o.*
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE u.id IS NULL;

-- Find duplicates
SELECT email, COUNT(*)
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

**5. Verify Business Rules:**
```sql
-- Orders with invalid status
SELECT * FROM orders
WHERE status NOT IN ('pending', 'confirmed', 'shipped', 'delivered');

-- Users with invalid age
SELECT * FROM users WHERE age < 0 OR age > 150;
```

**6. Check Constraints:**
```sql
-- Null values in NOT NULL columns
SELECT * FROM users WHERE name IS NULL;

-- Invalid foreign keys
SELECT * FROM orders WHERE user_id NOT IN (SELECT id FROM users);
```

---

### Q15: How do you find duplicate records?
**Answer:**

```sql
-- Find duplicate emails
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Find all records with duplicate emails
SELECT *
FROM users
WHERE email IN (
    SELECT email
    FROM users
    GROUP BY email
    HAVING COUNT(*) > 1
)
ORDER BY email;

-- Find duplicate combinations
SELECT first_name, last_name, COUNT(*)
FROM users
GROUP BY first_name, last_name
HAVING COUNT(*) > 1;
```

---

### Q16: How do you compare data between two tables?
**Answer:**

```sql
-- Records in table1 but not in table2
SELECT * FROM table1
WHERE id NOT IN (SELECT id FROM table2);

-- Using EXCEPT (SQL Server, PostgreSQL)
SELECT * FROM table1
EXCEPT
SELECT * FROM table2;

-- Using LEFT JOIN
SELECT t1.*
FROM table1 t1
LEFT JOIN table2 t2 ON t1.id = t2.id
WHERE t2.id IS NULL;

-- Find differences in values
SELECT 
    t1.id,
    t1.name AS name_table1,
    t2.name AS name_table2
FROM table1 t1
JOIN table2 t2 ON t1.id = t2.id
WHERE t1.name != t2.name;
```

---

### Q17: Date/Time queries for testing
**Answer:**

```sql
-- Records created today
SELECT * FROM users
WHERE DATE(created_at) = CURRENT_DATE;

-- Records from last 7 days
SELECT * FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL 7 DAY;

-- Records this month
SELECT * FROM orders
WHERE YEAR(created_at) = YEAR(CURRENT_DATE)
AND MONTH(created_at) = MONTH(CURRENT_DATE);

-- Records between dates
SELECT * FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';

-- Extract date parts
SELECT 
    YEAR(created_at) as year,
    MONTH(created_at) as month,
    COUNT(*) as count
FROM orders
GROUP BY YEAR(created_at), MONTH(created_at)
ORDER BY year, month;
```

---

## Database Testing Techniques

### Q18: What is Data Integrity Testing?
**Answer:**

Data Integrity Testing ensures data accuracy and consistency.

**Types:**

**1. Entity Integrity:**
- Primary key is unique and not null

```sql
-- Check for duplicate primary keys
SELECT id, COUNT(*)
FROM users
GROUP BY id
HAVING COUNT(*) > 1;

-- Check for null primary keys
SELECT * FROM users WHERE id IS NULL;
```

**2. Referential Integrity:**
- Foreign keys reference valid primary keys

```sql
-- Find orphan orders
SELECT o.*
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE u.id IS NULL;
```

**3. Domain Integrity:**
- Values are within allowed range

```sql
-- Check valid status values
SELECT DISTINCT status FROM orders;

-- Check numeric constraints
SELECT * FROM products WHERE price < 0;
```

---

### Q19: What is ACID in Database?
**Answer:**

ACID properties ensure reliable database transactions.

| Property | Description | Example |
|----------|-------------|---------|
| **A**tomicity | All or nothing | Bank transfer: both debit and credit happen, or neither |
| **C**onsistency | Valid state to valid state | After transfer, total balance unchanged |
| **I**solation | Transactions don't interfere | Concurrent transfers don't corrupt data |
| **D**urability | Committed = permanent | After commit, data survives crash |

**Testing ACID:**
```sql
-- Test Atomicity
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- If either fails, both should rollback
ROLLBACK; -- or COMMIT;

-- Test Isolation (run in parallel)
-- Transaction 1:
SELECT balance FROM accounts WHERE id = 1;  -- Should see consistent state
-- Transaction 2:
UPDATE accounts SET balance = 500 WHERE id = 1;
```

---

### Q20: How do you test Stored Procedures?
**Answer:**

**Test Cases:**

1. **Valid Inputs:**
   - Correct parameters
   - Expected output

2. **Invalid Inputs:**
   - Wrong data types
   - Out of range values
   - Null values

3. **Edge Cases:**
   - Empty results
   - Maximum values

4. **Error Handling:**
   - Exception handling
   - Error messages

**Example:**
```sql
-- Stored Procedure
CREATE PROCEDURE GetUserOrders
    @user_id INT
AS
BEGIN
    SELECT * FROM orders WHERE user_id = @user_id;
END;

-- Test valid input
EXEC GetUserOrders @user_id = 1;

-- Test non-existent user
EXEC GetUserOrders @user_id = 999999;

-- Test null
EXEC GetUserOrders @user_id = NULL;
```

---

### Q21: How do you test database performance?
**Answer:**

**Techniques:**

**1. Query Execution Plan:**
```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 1;
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 1;
```

**2. Index Usage:**
```sql
-- Check if index is used
EXPLAIN SELECT * FROM users WHERE email = 'test@test.com';

-- List indexes
SHOW INDEX FROM users;
```

**3. Slow Query Identification:**
```sql
-- Check slow query log
-- Or run and measure
SET profiling = 1;
SELECT * FROM large_table WHERE non_indexed_column = 'value';
SHOW PROFILES;
```

**4. Load Testing:**
- Insert large datasets
- Run concurrent queries
- Measure response times

---

## Advanced SQL Concepts

### Q22: What are Indexes?
**Answer:**

Indexes improve query performance by enabling faster data retrieval.

**Types:**
- **Primary:** Automatically created on primary key
- **Unique:** Ensures unique values
- **Composite:** Multiple columns
- **Full-text:** For text search

```sql
-- Create index
CREATE INDEX idx_email ON users(email);

-- Create unique index
CREATE UNIQUE INDEX idx_unique_email ON users(email);

-- Create composite index
CREATE INDEX idx_name_status ON users(last_name, status);

-- Drop index
DROP INDEX idx_email ON users;
```

**When to use:**
- Frequently searched columns
- JOIN columns
- ORDER BY columns

**When NOT to use:**
- Small tables
- Frequently updated columns
- Columns with few unique values

---

### Q23: What is a Transaction?
**Answer:**

A transaction is a sequence of operations performed as a single unit of work.

```sql
-- Start transaction
START TRANSACTION;

-- Perform operations
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

-- If successful, commit
COMMIT;

-- If error, rollback
ROLLBACK;
```

**Using SAVEPOINT:**
```sql
START TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
SAVEPOINT after_debit;

UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- If this fails, rollback to savepoint
ROLLBACK TO after_debit;

COMMIT;
```

---

### Q24: What is a View?
**Answer:**

A View is a virtual table based on a query.

```sql
-- Create view
CREATE VIEW active_users AS
SELECT id, name, email
FROM users
WHERE status = 'active';

-- Use view
SELECT * FROM active_users;

-- Drop view
DROP VIEW active_users;
```

**Benefits:**
- Simplify complex queries
- Security (hide columns)
- Consistent interface

---

### Q25: What are Triggers?
**Answer:**

Triggers automatically execute when specific events occur.

```sql
-- Create trigger
CREATE TRIGGER log_user_changes
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    INSERT INTO user_audit_log (user_id, old_name, new_name, changed_at)
    VALUES (OLD.id, OLD.name, NEW.name, NOW());
END;

-- Trigger types:
-- BEFORE INSERT, AFTER INSERT
-- BEFORE UPDATE, AFTER UPDATE
-- BEFORE DELETE, AFTER DELETE
```

**Testing Triggers:**
```sql
-- Before update
SELECT * FROM user_audit_log WHERE user_id = 1;

-- Update user
UPDATE users SET name = 'New Name' WHERE id = 1;

-- Verify trigger fired
SELECT * FROM user_audit_log WHERE user_id = 1;
```

---

## Real Interview Scenario Questions

### Scenario 1: You need to verify data after migration. How?
**Answer:**

```sql
-- 1. Count comparison
SELECT 'source' as db, COUNT(*) FROM source_db.users
UNION ALL
SELECT 'target' as db, COUNT(*) FROM target_db.users;

-- 2. Sample data verification
SELECT * FROM source_db.users WHERE id IN (1, 100, 500, 1000)
UNION ALL
SELECT * FROM target_db.users WHERE id IN (1, 100, 500, 1000);

-- 3. Checksum comparison
SELECT SUM(CHECKSUM(*)) FROM source_db.users;
SELECT SUM(CHECKSUM(*)) FROM target_db.users;

-- 4. Find missing records
SELECT id FROM source_db.users
WHERE id NOT IN (SELECT id FROM target_db.users);

-- 5. Find different values
SELECT s.id, s.name, t.name
FROM source_db.users s
JOIN target_db.users t ON s.id = t.id
WHERE s.name != t.name;
```

---

### Scenario 2: Application shows wrong data. How do you investigate?
**Answer:**

```sql
-- 1. Verify data exists
SELECT * FROM users WHERE id = 123;

-- 2. Check related tables
SELECT * FROM orders WHERE user_id = 123;
SELECT * FROM addresses WHERE user_id = 123;

-- 3. Check for recent changes
SELECT * FROM audit_log 
WHERE table_name = 'users' AND record_id = 123
ORDER BY created_at DESC;

-- 4. Check data integrity
SELECT * FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.id = 123;

-- 5. Verify constraints
DESCRIBE users;  -- Check column types, constraints
```

---

### Scenario 3: Write a query to find users who haven't ordered in 30 days but ordered before.
**Answer:**

```sql
SELECT u.id, u.name, u.email, MAX(o.created_at) as last_order
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email
HAVING MAX(o.created_at) < DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY);

-- Alternative with subquery
SELECT * FROM users
WHERE id IN (
    SELECT DISTINCT user_id FROM orders
)
AND id NOT IN (
    SELECT DISTINCT user_id FROM orders
    WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
);
```

---

## SQL Practice Problems for Interviews

### Problem 1: Second Highest Salary
```sql
-- Using LIMIT/OFFSET
SELECT salary FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;

-- Using subquery
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- Nth highest
SELECT salary FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET N-1;
```

### Problem 2: Find Employees Earning More Than Manager
```sql
SELECT e.name as employee
FROM employees e
JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary;
```

### Problem 3: Department with Highest Average Salary
```sql
SELECT department, AVG(salary) as avg_salary
FROM employees
GROUP BY department
ORDER BY avg_salary DESC
LIMIT 1;
```

---

## SQL Quick Reference for Testers

### Data Validation Queries:
```sql
-- Nulls
SELECT * FROM table WHERE column IS NULL;

-- Duplicates
SELECT column, COUNT(*) FROM table GROUP BY column HAVING COUNT(*) > 1;

-- Range check
SELECT * FROM table WHERE value NOT BETWEEN min AND max;

-- Format check
SELECT * FROM users WHERE email NOT LIKE '%@%.%';
```

### Comparison Queries:
```sql
-- Before and after
SELECT * FROM table WHERE id = X;  -- Run before and after test

-- Count changes
SELECT COUNT(*) FROM table;  -- Compare before and after
```

---

Continue to [05_Automation_Testing.md](05_Automation_Testing.md) for Automation Testing questions.
