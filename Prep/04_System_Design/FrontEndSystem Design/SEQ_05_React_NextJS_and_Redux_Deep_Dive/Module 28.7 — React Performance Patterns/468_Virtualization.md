# 468 – Virtualization — react-window, react-virtuoso

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Virtualization** renders only visible items in a scrollable list — not all 10,000 rows. DOM nodes stay constant (e.g., 20 visible) regardless of list size. **react-window** (lightweight, basic). **react-virtuoso** (feature-rich, auto-sizing, grouping). Critical for large lists/tables.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── react-window — lightweight ────
import { FixedSizeList, VariableSizeList } from 'react-window';

// Fixed height rows
function FixedList({ items }: { items: Item[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="row">
      {items[index].name} — {items[index].email}
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}          // viewport height
      width="100%"
      itemCount={items.length}
      itemSize={50}         // each row height
      overscanCount={5}     // render 5 extra above/below
    >
      {Row}
    </FixedSizeList>
  );
}

// Variable height rows
function VariableList({ items }: { items: Item[] }) {
  const getItemSize = (index: number) => {
    return items[index].description.length > 100 ? 80 : 50;
  };
  
  return (
    <VariableSizeList
      height={600}
      width="100%"
      itemCount={items.length}
      itemSize={getItemSize}
    >
      {({ index, style }) => (
        <div style={style}>
          <h3>{items[index].name}</h3>
          <p>{items[index].description}</p>
        </div>
      )}
    </VariableSizeList>
  );
}

// Grid virtualization
import { FixedSizeGrid } from 'react-window';

function VirtualGrid({ data }: { data: Cell[][] }) {
  return (
    <FixedSizeGrid
      columnCount={100}
      columnWidth={120}
      height={600}
      rowCount={data.length}
      rowHeight={40}
      width={800}
    >
      {({ columnIndex, rowIndex, style }) => (
        <div style={style}>
          {data[rowIndex][columnIndex]}
        </div>
      )}
    </FixedSizeGrid>
  );
}

// ──── Infinite loading with react-window ────
import { FixedSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

function InfiniteList({ hasMore, loadMore, items, totalCount }: Props) {
  const isItemLoaded = (index: number) => !hasMore || index < items.length;
  
  return (
    <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={totalCount}
      loadMoreItems={loadMore}
    >
      {({ onItemsRendered, ref }) => (
        <FixedSizeList
          ref={ref}
          height={600}
          itemCount={totalCount}
          itemSize={50}
          onItemsRendered={onItemsRendered}
        >
          {({ index, style }) => (
            <div style={style}>
              {isItemLoaded(index) ? items[index].name : 'Loading...'}
            </div>
          )}
        </FixedSizeList>
      )}
    </InfiniteLoader>
  );
}

// ──── react-virtuoso — feature-rich ────
import { Virtuoso, GroupedVirtuoso, TableVirtuoso } from 'react-virtuoso';

// Auto-sizing (no height per item needed)
function AutoSizedList({ items }: { items: Item[] }) {
  return (
    <Virtuoso
      style={{ height: 600 }}
      data={items}
      itemContent={(index, item) => (
        <div className="item">
          <h3>{item.name}</h3>
          <p>{item.description}</p> {/* different heights — auto-measured! */}
        </div>
      )}
      endReached={() => loadMore()} // infinite scroll built-in
      components={{
        Header: () => <div>Top of list</div>,
        Footer: () => <div>Loading more...</div>,
      }}
    />
  );
}

// Grouped list
function GroupedList({ groups }: { groups: Group[] }) {
  return (
    <GroupedVirtuoso
      style={{ height: 600 }}
      groupCounts={groups.map(g => g.items.length)}
      groupContent={(index) => <h2>{groups[index].title}</h2>}
      itemContent={(index) => {
        const item = flatItems[index];
        return <div>{item.name}</div>;
      }}
    />
  );
}

// Virtualized table
function VirtualTable({ data }: { data: Row[] }) {
  return (
    <TableVirtuoso
      style={{ height: 600 }}
      data={data}
      fixedHeaderContent={() => (
        <tr><th>Name</th><th>Email</th><th>Role</th></tr>
      )}
      itemContent={(index, row) => (
        <><td>{row.name}</td><td>{row.email}</td><td>{row.role}</td></>
      )}
    />
  );
}
```

### Comparison
| Feature | react-window | react-virtuoso |
|---|---|---|
| Bundle size | ~6KB | ~16KB |
| Auto-height items | ❌ (need VariableSizeList) | ✅ built-in |
| Infinite scroll | Separate package | Built-in |
| Grouped lists | Manual | Built-in |
| Tables | Manual | Built-in (TableVirtuoso) |
| API complexity | Low-level | High-level |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Virtualization renders only visible items — constant DOM nodes regardless of list size. react-window: lightweight (~6KB), FixedSizeList/VariableSizeList/Grid. react-virtuoso: auto-measuring heights, built-in infinite scroll, grouped lists, table support. Use for 1000+ items. overscanCount for smooth scrolling."*

## 4. 🧠 MEMORY AID
**"Virtualize = render only visible (20 DOM nodes for 10K items). react-window = lightweight, fixed sizes. react-virtuoso = auto-size, groups, tables, infinite scroll."**
