# 414 – Worklist Pattern

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Worklist** is a task-oriented pattern: a table of work items with status, filters, and bulk actions. Users process items sequentially — approve, reject, complete. Common in enterprise: purchase orders, support tickets, approval workflows. Combines search, filter, sort, and inline actions.

## 2. 🔬 DEEP-DIVE EXPLANATION

```xml
<!-- WORKLIST PATTERN -->
<Page title="Pending Approvals ({= ${/count}})">
  <headerContent>
    <SearchField search="onSearch" width="300px" />
    <Button icon="sap-icon://filter" press="onOpenFilters" />
  </headerContent>
  
  <Table items="{
    path: '/Tasks',
    sorter: { path: 'CreatedAt', descending: true },
    filters: [{ path: 'Status', operator: 'EQ', value1: 'PENDING' }]
  }" mode="MultiSelect">
    <headerToolbar>
      <OverflowToolbar>
        <Title text="Tasks" />
        <ToolbarSpacer />
        <Button text="Approve Selected" press="onBulkApprove" type="Accept" />
        <Button text="Reject Selected" press="onBulkReject" type="Reject" />
      </OverflowToolbar>
    </headerToolbar>
    <columns>
      <Column><Text text="Title" /></Column>
      <Column><Text text="Requester" /></Column>
      <Column><Text text="Amount" /></Column>
      <Column><Text text="Status" /></Column>
      <Column><Text text="Actions" /></Column>
    </columns>
    <ColumnListItem type="Navigation" press="onItemPress">
      <Text text="{Title}" />
      <Text text="{Requester}" />
      <ObjectNumber number="{Amount}" unit="USD" />
      <ObjectStatus text="{Status}" state="{= ${Status} === 'PENDING' ? 'Warning' : 'Success'}" />
      <HBox>
        <Button icon="sap-icon://accept" press="onApprove" type="Accept" />
        <Button icon="sap-icon://decline" press="onReject" type="Reject" />
      </HBox>
    </ColumnListItem>
  </Table>
</Page>
```

```javascript
// Controller — bulk operations
onBulkApprove: function () {
  var oTable = this.byId("taskTable");
  var aItems = oTable.getSelectedItems();
  var oModel = this.getView().getModel();
  
  aItems.forEach(function (oItem) {
    var sPath = oItem.getBindingContext().getPath();
    oModel.update(sPath, { Status: "APPROVED" });
  });
  
  oModel.submitChanges({
    success: function () {
      sap.m.MessageToast.show(aItems.length + " tasks approved");
      oTable.removeSelections();
    }
  });
}
```

### Worklist Pattern Elements
| Element | Purpose |
|---|---|
| **Search bar** | Quick text search across items |
| **Filters** | Status, date range, category |
| **Sort** | By date, priority, amount |
| **Bulk actions** | Multi-select + approve/reject all |
| **Inline actions** | Per-row approve/reject buttons |
| **Count badge** | Total pending items in page title |
| **Status indicators** | Color-coded ObjectStatus |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Worklist pattern is core enterprise UX: filterable table of tasks with inline and bulk actions. I've built approval workflows, ticket queues, and order management using this pattern. Key: search, filter, multi-select bulk actions, status indicators, and optimistic UI updates."*

## 4. 🧠 MEMORY AID
**"Worklist = Table + Search + Filter + Sort + Bulk Actions + Status Colors. Common: approvals, tickets, orders."**
