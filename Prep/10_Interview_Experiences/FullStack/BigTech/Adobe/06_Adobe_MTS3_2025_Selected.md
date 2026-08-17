# Adobe — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | MTS-3 (Member of Technical Staff) |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/adobe-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Adobe Experience Platform |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Template Engine with Variable Interpolation, Conditionals, and Loops
**Duration:** 90 minutes

### Challenge: Build a template engine that supports: variable interpolation `{{name}}`, conditionals `{% if condition %}...{% else %}...{% endif %}`, loops `{% for item in list %}...{% endfor %}`, nested templates, and filters `{{ name | uppercase }}`.

```java
import java.util.*;
import java.util.regex.*;

/**
 * Template Engine:
 * 
 * Syntax:
 * - {{variable}} → variable interpolation
 * - {{variable | filter}} → apply filter (uppercase, lowercase, capitalize, trim, default(val))
 * - {% if condition %} ... {% elif %} ... {% else %} ... {% endif %}
 * - {% for item in list %} ... {% endfor %}
 * - {% include "partial" %} → include another template
 * 
 * Architecture:
 * 1. Tokenizer: split template into TEXT, VARIABLE, TAG tokens
 * 2. Parser: build AST from tokens
 * 3. Renderer: walk AST with context to produce output
 */

// ---- AST Nodes ----

interface TemplateNode {
    String render(Map<String, Object> context, TemplateEngine engine);
}

class TextNode implements TemplateNode {
    String text;
    TextNode(String text) { this.text = text; }
    
    public String render(Map<String, Object> context, TemplateEngine engine) {
        return text;
    }
}

class VariableNode implements TemplateNode {
    String variable;
    List<String> filters;
    
    VariableNode(String variable, List<String> filters) {
        this.variable = variable.trim();
        this.filters = filters;
    }
    
    public String render(Map<String, Object> context, TemplateEngine engine) {
        Object value = resolveVariable(variable, context);
        String result = value != null ? value.toString() : "";
        
        for (String filter : filters) {
            result = applyFilter(result, filter.trim());
        }
        
        return result;
    }
    
    Object resolveVariable(String path, Map<String, Object> context) {
        // Support dot notation: user.name.first
        String[] parts = path.split("\\.");
        Object current = context;
        
        for (String part : parts) {
            if (current instanceof Map) {
                current = ((Map<?, ?>) current).get(part);
            } else {
                return null;
            }
        }
        
        return current;
    }
    
    String applyFilter(String value, String filter) {
        if (filter.startsWith("default(")) {
            // default("fallback")
            String fallback = filter.substring(8, filter.length() - 1).replace("\"", "").replace("'", "");
            return value.isEmpty() ? fallback : value;
        }
        
        switch (filter) {
            case "uppercase": return value.toUpperCase();
            case "lowercase": return value.toLowerCase();
            case "capitalize": return value.isEmpty() ? "" : 
                Character.toUpperCase(value.charAt(0)) + value.substring(1).toLowerCase();
            case "trim": return value.trim();
            case "length": return String.valueOf(value.length());
            case "reverse": return new StringBuilder(value).reverse().toString();
            default: return value;
        }
    }
}

class IfNode implements TemplateNode {
    String condition;
    List<TemplateNode> trueBranch;
    List<TemplateNode> falseBranch; // else branch
    
    IfNode(String condition, List<TemplateNode> trueBranch, List<TemplateNode> falseBranch) {
        this.condition = condition.trim();
        this.trueBranch = trueBranch;
        this.falseBranch = falseBranch;
    }
    
    public String render(Map<String, Object> context, TemplateEngine engine) {
        boolean result = evaluateCondition(condition, context);
        
        List<TemplateNode> branch = result ? trueBranch : falseBranch;
        StringBuilder sb = new StringBuilder();
        for (TemplateNode node : branch) {
            sb.append(node.render(context, engine));
        }
        return sb.toString();
    }
    
    boolean evaluateCondition(String cond, Map<String, Object> context) {
        // Support: variable, !variable, variable == "value", variable != "value"
        cond = cond.trim();
        
        if (cond.startsWith("!") || cond.startsWith("not ")) {
            String varName = cond.startsWith("!") ? cond.substring(1).trim() : cond.substring(4).trim();
            return !isTruthy(resolveVar(varName, context));
        }
        
        // Comparison operators
        for (String op : new String[]{"==", "!=", ">=", "<=", ">", "<"}) {
            int idx = cond.indexOf(op);
            if (idx > 0) {
                String left = cond.substring(0, idx).trim();
                String right = cond.substring(idx + op.length()).trim();
                
                Object leftVal = resolveVar(left, context);
                String rightStr = right.replace("\"", "").replace("'", "");
                
                return compareValues(leftVal, rightStr, op);
            }
        }
        
        // Simple truthiness
        return isTruthy(resolveVar(cond, context));
    }
    
    boolean compareValues(Object left, String right, String op) {
        String leftStr = left != null ? left.toString() : "";
        
        switch (op) {
            case "==": return leftStr.equals(right);
            case "!=": return !leftStr.equals(right);
            case ">": case ">=": case "<": case "<=":
                try {
                    double l = Double.parseDouble(leftStr);
                    double r = Double.parseDouble(right);
                    switch (op) {
                        case ">": return l > r;
                        case ">=": return l >= r;
                        case "<": return l < r;
                        case "<=": return l <= r;
                    }
                } catch (NumberFormatException e) {
                    return leftStr.compareTo(right) > 0; // Lexicographic
                }
        }
        return false;
    }
    
    Object resolveVar(String name, Map<String, Object> context) {
        String[] parts = name.split("\\.");
        Object current = context;
        for (String part : parts) {
            if (current instanceof Map) current = ((Map<?, ?>) current).get(part);
            else return null;
        }
        return current;
    }
    
    boolean isTruthy(Object value) {
        if (value == null) return false;
        if (value instanceof Boolean) return (Boolean) value;
        if (value instanceof Number) return ((Number) value).doubleValue() != 0;
        if (value instanceof String) return !((String) value).isEmpty();
        if (value instanceof Collection) return !((Collection<?>) value).isEmpty();
        return true;
    }
}

class ForNode implements TemplateNode {
    String itemName;
    String listName;
    List<TemplateNode> body;
    
    ForNode(String itemName, String listName, List<TemplateNode> body) {
        this.itemName = itemName.trim();
        this.listName = listName.trim();
        this.body = body;
    }
    
    public String render(Map<String, Object> context, TemplateEngine engine) {
        Object listObj = resolveVar(listName, context);
        if (!(listObj instanceof List)) return "";
        
        List<?> list = (List<?>) listObj;
        StringBuilder sb = new StringBuilder();
        
        for (int i = 0; i < list.size(); i++) {
            // Create child scope with loop variable
            Map<String, Object> childContext = new HashMap<>(context);
            childContext.put(itemName, list.get(i));
            childContext.put("loop", Map.of(
                "index", i,
                "index1", i + 1,
                "first", i == 0,
                "last", i == list.size() - 1,
                "length", list.size()
            ));
            
            for (TemplateNode node : body) {
                sb.append(node.render(childContext, engine));
            }
        }
        
        return sb.toString();
    }
    
    Object resolveVar(String name, Map<String, Object> context) {
        String[] parts = name.split("\\.");
        Object current = context;
        for (String part : parts) {
            if (current instanceof Map) current = ((Map<?, ?>) current).get(part);
            else return null;
        }
        return current;
    }
}

class IncludeNode implements TemplateNode {
    String templateName;
    
    IncludeNode(String templateName) {
        this.templateName = templateName.replace("\"", "").replace("'", "").trim();
    }
    
    public String render(Map<String, Object> context, TemplateEngine engine) {
        return engine.renderTemplate(templateName, context);
    }
}

// ---- Template Engine ----

class TemplateEngine {
    
    private final Map<String, String> templates = new HashMap<>();
    private final Map<String, List<TemplateNode>> compiledCache = new HashMap<>();
    
    void registerTemplate(String name, String template) {
        templates.put(name, template);
        compiledCache.remove(name); // Invalidate cache
    }
    
    String renderTemplate(String name, Map<String, Object> context) {
        List<TemplateNode> ast = compiledCache.computeIfAbsent(name, n -> {
            String tmpl = templates.get(n);
            if (tmpl == null) return List.of(new TextNode("[Template not found: " + n + "]"));
            return parse(tokenize(tmpl));
        });
        
        StringBuilder sb = new StringBuilder();
        for (TemplateNode node : ast) {
            sb.append(node.render(context, this));
        }
        return sb.toString();
    }
    
    String render(String template, Map<String, Object> context) {
        List<TemplateNode> ast = parse(tokenize(template));
        StringBuilder sb = new StringBuilder();
        for (TemplateNode node : ast) {
            sb.append(node.render(context, this));
        }
        return sb.toString();
    }
    
    // ---- Tokenizer ----
    
    List<String[]> tokenize(String template) {
        List<String[]> tokens = new ArrayList<>();
        // Match {{ variable }} and {% tag %}
        Pattern pattern = Pattern.compile("(\\{\\{.*?\\}\\}|\\{%.*?%\\})");
        Matcher matcher = pattern.matcher(template);
        
        int lastEnd = 0;
        while (matcher.find()) {
            // Text before this match
            if (matcher.start() > lastEnd) {
                tokens.add(new String[]{"TEXT", template.substring(lastEnd, matcher.start())});
            }
            
            String match = matcher.group();
            if (match.startsWith("{{")) {
                tokens.add(new String[]{"VAR", match.substring(2, match.length() - 2).trim()});
            } else {
                tokens.add(new String[]{"TAG", match.substring(2, match.length() - 2).trim()});
            }
            
            lastEnd = matcher.end();
        }
        
        // Remaining text
        if (lastEnd < template.length()) {
            tokens.add(new String[]{"TEXT", template.substring(lastEnd)});
        }
        
        return tokens;
    }
    
    // ---- Parser ----
    
    List<TemplateNode> parse(List<String[]> tokens) {
        return parseNodes(tokens, new int[]{0}, null);
    }
    
    List<TemplateNode> parseNodes(List<String[]> tokens, int[] pos, String endTag) {
        List<TemplateNode> nodes = new ArrayList<>();
        
        while (pos[0] < tokens.length) {
            String[] token = tokens[pos[0]];
            
            if ("TEXT".equals(token[0])) {
                nodes.add(new TextNode(token[1]));
                pos[0]++;
            } else if ("VAR".equals(token[0])) {
                // Parse filters: name | filter1 | filter2
                String[] parts = token[1].split("\\|");
                String varName = parts[0].trim();
                List<String> filters = new ArrayList<>();
                for (int i = 1; i < parts.length; i++) filters.add(parts[i].trim());
                nodes.add(new VariableNode(varName, filters));
                pos[0]++;
            } else if ("TAG".equals(token[0])) {
                String tag = token[1].trim();
                
                // Check for end tags
                if (endTag != null && tag.equals(endTag)) {
                    pos[0]++;
                    return nodes;
                }
                if (tag.equals("else") || tag.equals("elif")) {
                    return nodes; // Don't consume — parent handles it
                }
                
                if (tag.startsWith("if ")) {
                    pos[0]++;
                    String condition = tag.substring(3).trim();
                    List<TemplateNode> trueBranch = parseNodes(tokens, pos, null);
                    List<TemplateNode> falseBranch = Collections.emptyList();
                    
                    // Check for else/endif
                    if (pos[0] < tokens.length) {
                        String nextTag = tokens[pos[0]][1].trim();
                        if (nextTag.equals("else")) {
                            pos[0]++;
                            falseBranch = parseNodes(tokens, pos, "endif");
                        } else if (nextTag.equals("endif")) {
                            pos[0]++;
                        }
                    }
                    
                    nodes.add(new IfNode(condition, trueBranch, falseBranch));
                    
                } else if (tag.startsWith("for ")) {
                    pos[0]++;
                    // "for item in list"
                    String[] forParts = tag.substring(4).split("\\s+in\\s+");
                    String itemName = forParts[0].trim();
                    String listName = forParts.length > 1 ? forParts[1].trim() : "";
                    
                    List<TemplateNode> body = parseNodes(tokens, pos, "endfor");
                    nodes.add(new ForNode(itemName, listName, body));
                    
                } else if (tag.startsWith("include ")) {
                    pos[0]++;
                    String templateName = tag.substring(8).trim();
                    nodes.add(new IncludeNode(templateName));
                } else {
                    pos[0]++;
                }
            } else {
                pos[0]++;
            }
        }
        
        return nodes;
    }
}
```

---

## 🎯 Key Takeaways
- Adobe MTS-3 FS = **Template engine — tokenize → parse AST → render with context**
- **Three-phase architecture**: Tokenizer (regex), Parser (recursive descent), Renderer (tree walk)
- **Variable resolution**: dot notation `user.name.first` — recursive Map traversal
- **Filters**: pipe syntax `{{ name | uppercase | trim }}` — chained string transformations
- **If/Else**: evaluate condition → truthy check with type coercion (null=false, empty string=false, 0=false)
- **For loops**: child context scope — don't pollute parent; `loop.index`, `loop.first`, `loop.last` magic variables
- **Include**: `{% include "partial" %}` — recursive template rendering with shared context
- **Template caching**: `compiledCache` — parse once, render many times with different contexts
- **Truthiness rules**: null→false, 0→false, ""→false, empty collection→false — PHP/Python style

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Very Hard | Parser, AST, Template Engine |
| System Design | Very Hard | Adobe Experience Platform |
| HM | Medium | Culture |
