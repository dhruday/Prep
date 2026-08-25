# Apple — ICT-3 (Senior SWE) Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Software Engineer (ICT-3) |
| **Level** | ICT-3 (Senior) |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Cupertino, CA |
| **Source** | [Blind](https://www.teamblind.com/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 4 Onsite)
- **Timeline:** 4 weeks
- **Format:** In-person Onsite

## Round 1: Phone Screen — Serialize and Deserialize Nested Map
**Duration:** 60 minutes

### Problem
Implement serialization and deserialization for a nested `Map<String, Object>` where values can be strings, integers, lists, or nested maps. Support a compact string format.

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class NestedMapSerializer {

    /**
     * Serialize a nested map to a compact string format.
     * Format: {key1:value1,key2:value2,...}
     * Strings: "value"
     * Integers: 123
     * Lists: [item1,item2,...]
     * Nested maps: {key:value}
     * 
     * Special chars in strings are escaped with backslash.
     */
    public String serialize(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder();
        serializeMap(map, sb);
        return sb.toString();
    }

    private void serializeMap(Map<String, Object> map, StringBuilder sb) {
        sb.append('{');
        boolean first = true;
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (!first) sb.append(',');
            first = false;
            sb.append('"');
            escapeString(entry.getKey(), sb);
            sb.append('"');
            sb.append(':');
            serializeValue(entry.getValue(), sb);
        }
        sb.append('}');
    }

    @SuppressWarnings("unchecked")
    private void serializeValue(Object value, StringBuilder sb) {
        if (value == null) {
            sb.append("null");
        } else if (value instanceof Map) {
            serializeMap((Map<String, Object>) value, sb);
        } else if (value instanceof List) {
            serializeList((List<Object>) value, sb);
        } else if (value instanceof Number) {
            sb.append(value);
        } else if (value instanceof Boolean) {
            sb.append(value);
        } else {
            sb.append('"');
            escapeString(value.toString(), sb);
            sb.append('"');
        }
    }

    private void serializeList(List<Object> list, StringBuilder sb) {
        sb.append('[');
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(',');
            serializeValue(list.get(i), sb);
        }
        sb.append(']');
    }

    private void escapeString(String s, StringBuilder sb) {
        for (char c : s.toCharArray()) {
            if (c == '"' || c == '\\') sb.append('\\');
            sb.append(c);
        }
    }

    // ===== DESERIALIZATION =====

    private int pos; // Parser position

    public Map<String, Object> deserialize(String input) {
        pos = 0;
        return parseMap(input);
    }

    private Map<String, Object> parseMap(String s) {
        Map<String, Object> map = new LinkedHashMap<>();
        expect(s, '{');

        if (pos < s.length() && s.charAt(pos) == '}') {
            pos++;
            return map;
        }

        while (pos < s.length()) {
            String key = parseString(s);
            expect(s, ':');
            Object value = parseValue(s);
            map.put(key, value);

            if (pos < s.length() && s.charAt(pos) == ',') {
                pos++;
            } else {
                break;
            }
        }

        expect(s, '}');
        return map;
    }

    private Object parseValue(String s) {
        char c = s.charAt(pos);
        if (c == '{') return parseMap(s);
        if (c == '[') return parseList(s);
        if (c == '"') return parseString(s);
        if (c == 'n') return parseNull(s);
        if (c == 't' || c == 'f') return parseBoolean(s);
        return parseNumber(s);
    }

    private List<Object> parseList(String s) {
        List<Object> list = new ArrayList<>();
        expect(s, '[');

        if (pos < s.length() && s.charAt(pos) == ']') {
            pos++;
            return list;
        }

        while (pos < s.length()) {
            list.add(parseValue(s));
            if (pos < s.length() && s.charAt(pos) == ',') {
                pos++;
            } else {
                break;
            }
        }

        expect(s, ']');
        return list;
    }

    private String parseString(String s) {
        expect(s, '"');
        StringBuilder sb = new StringBuilder();
        while (pos < s.length() && s.charAt(pos) != '"') {
            if (s.charAt(pos) == '\\') {
                pos++;
                if (pos >= s.length()) throw new RuntimeException("Unexpected end");
            }
            sb.append(s.charAt(pos));
            pos++;
        }
        expect(s, '"');
        return sb.toString();
    }

    private Number parseNumber(String s) {
        int start = pos;
        if (s.charAt(pos) == '-') pos++;
        boolean isFloat = false;
        while (pos < s.length() && (Character.isDigit(s.charAt(pos)) || s.charAt(pos) == '.')) {
            if (s.charAt(pos) == '.') isFloat = true;
            pos++;
        }
        String numStr = s.substring(start, pos);
        return isFloat ? Double.parseDouble(numStr) : Long.parseLong(numStr);
    }

    private Object parseNull(String s) {
        if (s.startsWith("null", pos)) {
            pos += 4;
            return null;
        }
        throw new RuntimeException("Expected null at position " + pos);
    }

    private Boolean parseBoolean(String s) {
        if (s.startsWith("true", pos)) { pos += 4; return true; }
        if (s.startsWith("false", pos)) { pos += 5; return false; }
        throw new RuntimeException("Expected boolean at position " + pos);
    }

    private void expect(String s, char expected) {
        if (pos >= s.length() || s.charAt(pos) != expected) {
            throw new RuntimeException(
                String.format("Expected '%c' at position %d, got '%c'",
                    expected, pos, pos < s.length() ? s.charAt(pos) : '?'));
        }
        pos++;
    }

    public static void main(String[] args) {
        NestedMapSerializer serializer = new NestedMapSerializer();

        // Build nested map
        Map<String, Object> inner = new LinkedHashMap<>();
        inner.put("city", "Cupertino");
        inner.put("zip", 95014);

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("name", "Alice");
        map.put("age", 30);
        map.put("address", inner);
        map.put("skills", Arrays.asList("Java", "Python", "Swift"));
        map.put("active", true);

        // Serialize
        String serialized = serializer.serialize(map);
        System.out.println("Serialized: " + serialized);

        // Deserialize
        Map<String, Object> deserialized = serializer.deserialize(serialized);
        System.out.println("Deserialized: " + deserialized);

        // Round-trip verification
        String reserialized = serializer.serialize(deserialized);
        System.out.println("Round-trip match: " + serialized.equals(reserialized));

        // Test with escaped characters
        Map<String, Object> escTest = new LinkedHashMap<>();
        escTest.put("quote", "He said \"hello\"");
        escTest.put("backslash", "path\\to\\file");
        String escSerialized = serializer.serialize(escTest);
        System.out.println("\nEscaped: " + escSerialized);
        Map<String, Object> escDeserialized = serializer.deserialize(escSerialized);
        System.out.println("Deserialized: " + escDeserialized);
    }
}
```

## Round 2: Onsite Coding — Word Ladder II (Find All Shortest Paths)
**Duration:** 45 minutes

Standard BFS + DFS backtracking approach. BFS to find shortest distance, then DFS from end to start following decreasing distance to reconstruct all shortest paths.

## 🎯 Key Takeaways
- Apple focuses on **data serialization/parsing** problems — critical for their ecosystem interop
- Recursive descent parser pattern is clean and extensible
- Remember to handle: escape sequences, null, boolean, nested structures
- Round-trip verification (serialize → deserialize → serialize) is a great testing strategy

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | Recursive Descent Parser, Serialization |
| Coding | Hard | BFS, DFS, Word Ladder II |
| System Design | Hard | Distributed File System |
| Hiring Manager | Medium | Behavioral |
