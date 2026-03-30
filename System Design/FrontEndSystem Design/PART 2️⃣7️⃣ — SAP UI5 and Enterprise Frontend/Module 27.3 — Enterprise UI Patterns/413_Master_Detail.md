# 413 – Master-Detail Pattern

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Master-Detail** is the most common enterprise UI pattern: a list (master) on the left, details on the right. Selecting a master item populates the detail view. SAPUI5 uses `SplitApp` or `FlexibleColumnLayout`. Responsive: side-by-side on desktop, stack on mobile.

## 2. 🔬 DEEP-DIVE EXPLANATION

```xml
<!-- SPLIT APP (Basic Master-Detail) -->
<SplitApp id="app">
  <masterPages>
    <Page title="Products">
      <List items="{/Products}" mode="SingleSelectMaster" 
            selectionChange="onSelectionChange">
        <StandardListItem title="{Name}" description="{Category}" />
      </List>
    </Page>
  </masterPages>
  <detailPages>
    <Page title="{Name}">
      <ObjectHeader title="{Name}" number="{Price}" numberUnit="USD" />
      <form:SimpleForm>
        <Label text="Category" /><Text text="{Category}" />
        <Label text="Stock" /><Text text="{Stock}" />
      </form:SimpleForm>
    </Page>
  </detailPages>
</SplitApp>
```

```javascript
// Controller — binding detail on selection
onSelectionChange: function (oEvent) {
  var oItem = oEvent.getParameter("listItem");
  var sPath = oItem.getBindingContext().getPath();
  // Bind detail page to selected item
  this.byId("detailPage").bindElement({ path: sPath });
  // Or navigate via router
  var sId = sPath.split("'")[1];
  this.getRouter().navTo("detail", { productId: sId });
}
```

### Similar Pattern in Angular/React
```typescript
// Angular — Master-Detail with router
@Component({
  template: `
    <div class="master">
      <app-list (selected)="onSelect($event)" />
    </div>
    <div class="detail">
      <router-outlet />
    </div>
  `
})

// React — Master-Detail
function MasterDetail() {
  const [selectedId, setSelectedId] = useState<string>();
  return (
    <div className="split-view">
      <MasterList onSelect={setSelectedId} />
      {selectedId && <DetailView id={selectedId} />}
    </div>
  );
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Master-detail is universal — list on left, details on right. In SAPUI5 it's SplitApp or FlexibleColumnLayout. In Angular/React, router-based or state-driven. I size columns responsively: side-by-side on desktop, stacked on mobile."*

## 4. 🧠 MEMORY AID
**"Master (list) + Detail (content). SplitApp (2-panel), FlexibleColumnLayout (3-panel). Responsive = side-by-side → stacked."**
