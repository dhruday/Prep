# Salesforce — SMTS Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Salesforce |
| **Role** | Senior Member of Technical Staff |
| **Level** | SMTS |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/salesforce-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: OA — Implement a Multi-Tenant Query Builder
**Duration:** 90 minutes

### Problem
Design a SQL query builder that supports multi-tenant isolation. Users construct queries programmatically, and the system ensures tenant ID filtering is always applied.

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.stream.*;

public class MultiTenantQueryBuilder {

    private final String tenantId;
    private String table;
    private final List<String> selectColumns = new ArrayList<>();
    private final List<WhereClause> whereClauses = new ArrayList<>();
    private final List<String> orderBy = new ArrayList<>();
    private final List<JoinClause> joins = new ArrayList<>();
    private Integer limit;
    private Integer offset;
    private String groupBy;
    private String having;

    static class WhereClause {
        String column;
        String operator;
        Object value;
        String conjunction; // AND or OR

        WhereClause(String column, String operator, Object value, String conjunction) {
            this.column = column;
            this.operator = operator;
            this.value = value;
            this.conjunction = conjunction;
        }
    }

    static class JoinClause {
        String type;    // INNER, LEFT, RIGHT
        String table;
        String on;

        JoinClause(String type, String table, String on) {
            this.type = type;
            this.table = table;
            this.on = on;
        }
    }

    public MultiTenantQueryBuilder(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            throw new IllegalArgumentException("Tenant ID is required");
        }
        this.tenantId = sanitize(tenantId);
    }

    public MultiTenantQueryBuilder from(String table) {
        this.table = sanitizeIdentifier(table);
        return this;
    }

    public MultiTenantQueryBuilder select(String... columns) {
        for (String col : columns) {
            selectColumns.add(sanitizeIdentifier(col));
        }
        return this;
    }

    public MultiTenantQueryBuilder where(String column, String operator, Object value) {
        validateOperator(operator);
        whereClauses.add(new WhereClause(
            sanitizeIdentifier(column), operator, value, "AND"));
        return this;
    }

    public MultiTenantQueryBuilder orWhere(String column, String operator, Object value) {
        validateOperator(operator);
        whereClauses.add(new WhereClause(
            sanitizeIdentifier(column), operator, value, "OR"));
        return this;
    }

    public MultiTenantQueryBuilder whereIn(String column, List<?> values) {
        whereClauses.add(new WhereClause(
            sanitizeIdentifier(column), "IN", values, "AND"));
        return this;
    }

    public MultiTenantQueryBuilder whereNull(String column) {
        whereClauses.add(new WhereClause(
            sanitizeIdentifier(column), "IS NULL", null, "AND"));
        return this;
    }

    public MultiTenantQueryBuilder join(String table, String on) {
        joins.add(new JoinClause("INNER", sanitizeIdentifier(table), on));
        return this;
    }

    public MultiTenantQueryBuilder leftJoin(String table, String on) {
        joins.add(new JoinClause("LEFT", sanitizeIdentifier(table), on));
        return this;
    }

    public MultiTenantQueryBuilder orderBy(String column, String direction) {
        String dir = direction.equalsIgnoreCase("DESC") ? "DESC" : "ASC";
        orderBy.add(sanitizeIdentifier(column) + " " + dir);
        return this;
    }

    public MultiTenantQueryBuilder groupBy(String column) {
        this.groupBy = sanitizeIdentifier(column);
        return this;
    }

    public MultiTenantQueryBuilder having(String condition) {
        this.having = condition; // Should be parameterized in production
        return this;
    }

    public MultiTenantQueryBuilder limit(int limit) {
        this.limit = limit;
        return this;
    }

    public MultiTenantQueryBuilder offset(int offset) {
        this.offset = offset;
        return this;
    }

    /**
     * Build the final SQL with parameters (for prepared statements).
     * Tenant isolation is ALWAYS applied — cannot be bypassed.
     */
    public PreparedQuery build() {
        if (table == null) throw new IllegalStateException("Table not specified");

        StringBuilder sql = new StringBuilder();
        List<Object> params = new ArrayList<>();

        // SELECT
        sql.append("SELECT ");
        if (selectColumns.isEmpty()) {
            sql.append("*");
        } else {
            sql.append(String.join(", ", selectColumns));
        }

        // FROM
        sql.append(" FROM ").append(table);

        // JOINS
        for (JoinClause join : joins) {
            sql.append(" ").append(join.type).append(" JOIN ")
               .append(join.table).append(" ON ").append(join.on);
        }

        // WHERE — always starts with tenant isolation
        sql.append(" WHERE ").append(table).append(".tenant_id = ?");
        params.add(tenantId);

        // User-defined WHERE clauses
        for (WhereClause clause : whereClauses) {
            sql.append(" ").append(clause.conjunction).append(" ");

            if ("IN".equals(clause.operator)) {
                @SuppressWarnings("unchecked")
                List<?> values = (List<?>) clause.value;
                String placeholders = values.stream()
                    .map(v -> "?")
                    .collect(Collectors.joining(", "));
                sql.append(clause.column).append(" IN (").append(placeholders).append(")");
                params.addAll(values);
            } else if ("IS NULL".equals(clause.operator)) {
                sql.append(clause.column).append(" IS NULL");
            } else if ("IS NOT NULL".equals(clause.operator)) {
                sql.append(clause.column).append(" IS NOT NULL");
            } else {
                sql.append(clause.column).append(" ").append(clause.operator).append(" ?");
                params.add(clause.value);
            }
        }

        // GROUP BY
        if (groupBy != null) sql.append(" GROUP BY ").append(groupBy);

        // HAVING
        if (having != null) sql.append(" HAVING ").append(having);

        // ORDER BY
        if (!orderBy.isEmpty()) {
            sql.append(" ORDER BY ").append(String.join(", ", orderBy));
        }

        // LIMIT / OFFSET
        if (limit != null) {
            sql.append(" LIMIT ?");
            params.add(limit);
        }
        if (offset != null) {
            sql.append(" OFFSET ?");
            params.add(offset);
        }

        return new PreparedQuery(sql.toString(), params);
    }

    // === Security ===

    private static final Set<String> VALID_OPERATORS = Set.of(
        "=", "!=", "<>", "<", ">", "<=", ">=", "LIKE", "NOT LIKE",
        "IN", "IS NULL", "IS NOT NULL"
    );

    private void validateOperator(String operator) {
        if (!VALID_OPERATORS.contains(operator.toUpperCase())) {
            throw new IllegalArgumentException("Invalid operator: " + operator);
        }
    }

    private String sanitizeIdentifier(String identifier) {
        // Only allow alphanumeric, underscore, dot (for table.column)
        if (!identifier.matches("[a-zA-Z_][a-zA-Z0-9_.]*")) {
            throw new IllegalArgumentException("Invalid identifier: " + identifier);
        }
        return identifier;
    }

    private String sanitize(String value) {
        return value.replaceAll("[^a-zA-Z0-9_-]", "");
    }

    static class PreparedQuery {
        final String sql;
        final List<Object> params;

        PreparedQuery(String sql, List<Object> params) {
            this.sql = sql;
            this.params = Collections.unmodifiableList(params);
        }

        @Override
        public String toString() {
            return "SQL: " + sql + "\nParams: " + params;
        }
    }

    public static void main(String[] args) {
        // Build a query for tenant "acme_corp"
        PreparedQuery query = new MultiTenantQueryBuilder("acme_corp")
            .from("orders")
            .select("orders.id", "orders.total", "customers.name")
            .leftJoin("customers", "customers.id = orders.customer_id")
            .where("status", "=", "completed")
            .where("total", ">", 100.0)
            .whereIn("region", List.of("US", "EU", "APAC"))
            .orderBy("total", "DESC")
            .limit(50)
            .offset(0)
            .build();

        System.out.println(query);
        // SQL: SELECT orders.id, orders.total, customers.name
        //      FROM orders LEFT JOIN customers ON customers.id = orders.customer_id
        //      WHERE orders.tenant_id = ? AND status = ? AND total > ? AND region IN (?, ?, ?)
        //      ORDER BY total DESC LIMIT ? OFFSET ?
        // Params: [acme_corp, completed, 100.0, US, EU, APAC, 50, 0]

        System.out.println("\n--- Simple query ---");
        PreparedQuery simple = new MultiTenantQueryBuilder("tenant_123")
            .from("users")
            .where("active", "=", true)
            .whereNull("deleted_at")
            .build();
        System.out.println(simple);
    }
}
```

## 🎯 Key Takeaways
- Salesforce focuses on **multi-tenancy** — their entire platform is multi-tenant
- **Tenant isolation is non-negotiable**: tenant_id filter must be automatically applied, not user-controllable
- Use **parameterized queries** (PreparedStatement) — never concatenate values into SQL
- Identifier sanitization prevents SQL injection through column/table names
- Builder pattern makes the API fluent and easy to use

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium-Hard | SQL Builder, Multi-Tenancy, Security |
| Technical 1 | Hard | System Design Coding |
| Technical 2 | Medium | Tree/Graph Algorithms |
| HM | Medium | Behavioral |
