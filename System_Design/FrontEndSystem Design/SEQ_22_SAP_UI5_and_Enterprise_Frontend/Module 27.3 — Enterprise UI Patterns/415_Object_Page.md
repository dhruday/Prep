# 415 – Object Page Pattern

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Object Page** displays a single business object in detail — a sticky header with key info, followed by collapsible sections (general info, line items, history, attachments). SAPUI5's `sap.uxap.ObjectPageLayout` implements this. It's the "detail view" in enterprise apps.

## 2. 🔬 DEEP-DIVE EXPLANATION

```xml
<!-- OBJECT PAGE LAYOUT -->
<ObjectPageLayout upperCaseAnchorBar="false" headerContentPinnable="true">
  
  <!-- Header Title -->
  <headerTitle>
    <ObjectPageDynamicHeaderTitle>
      <heading>
        <Title text="{Name}" />
      </heading>
      <expandedContent>
        <ObjectAttribute title="Category" text="{Category}" />
        <ObjectAttribute title="Status" text="{Status}" />
      </expandedContent>
      <actions>
        <Button text="Edit" type="Emphasized" press="onEdit" />
        <Button text="Delete" press="onDelete" />
      </actions>
    </ObjectPageDynamicHeaderTitle>
  </headerTitle>
  
  <!-- Header Content (collapsible on scroll) -->
  <headerContent>
    <FlexBox>
      <Avatar src="{ImageUrl}" displaySize="L" />
      <VBox class="sapUiSmallMarginBegin">
        <ObjectNumber number="{Price}" unit="USD" />
        <ObjectStatus text="{= ${Stock} > 0 ? 'In Stock' : 'Out of Stock'}"
          state="{= ${Stock} > 0 ? 'Success' : 'Error'}" />
      </VBox>
    </FlexBox>
  </headerContent>
  
  <!-- Sections -->
  <sections>
    <!-- General Information -->
    <ObjectPageSection title="General Information">
      <subSections>
        <ObjectPageSubSection>
          <blocks>
            <form:SimpleForm editable="true" layout="ResponsiveGridLayout">
              <Label text="Name" /><Input value="{Name}" />
              <Label text="Description" /><TextArea value="{Description}" />
              <Label text="Category" /><Select selectedKey="{Category}">
                <core:Item key="Electronics" text="Electronics" />
                <core:Item key="Clothing" text="Clothing" />
              </Select>
            </form:SimpleForm>
          </blocks>
        </ObjectPageSubSection>
      </subSections>
    </ObjectPageSection>
    
    <!-- Line Items -->
    <ObjectPageSection title="Order History">
      <subSections>
        <ObjectPageSubSection>
          <blocks>
            <Table items="{Orders}">
              <ColumnListItem>
                <Text text="{OrderId}" />
                <Text text="{Date}" />
                <ObjectNumber number="{Amount}" unit="USD" />
              </ColumnListItem>
            </Table>
          </blocks>
        </ObjectPageSubSection>
      </subSections>
    </ObjectPageSection>
    
    <!-- Attachments -->
    <ObjectPageSection title="Attachments">
      <subSections>
        <ObjectPageSubSection>
          <blocks>
            <upload:UploadSet items="{Attachments}" />
          </blocks>
        </ObjectPageSubSection>
      </subSections>
    </ObjectPageSection>
  </sections>
</ObjectPageLayout>
```

### Object Page Anatomy
```
┌─────────────────────────────────────────┐
│ ← Back    Product Name    [Edit] [Del]  │  ← Header Title (sticky)
├─────────────────────────────────────────┤
│ [Avatar]  $299.99  ● In Stock           │  ← Header Content (collapses)
├─────────────────────────────────────────┤
│ General Info | Orders | Attachments     │  ← Anchor Bar (sticky on scroll)
├─────────────────────────────────────────┤
│ Section content (forms, tables, etc)    │  ← Scrollable sections
└─────────────────────────────────────────┘
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Object Page is the standard enterprise detail view: sticky header with key info, anchor bar navigation for sections. I've built object pages for product detail, employee profiles, and order management. The pattern translates to any framework — React/Angular detail pages follow the same information hierarchy."*

## 4. 🧠 MEMORY AID
**"Object Page = Header (sticky) + Anchor Bar (section nav) + Sections (forms, tables, attachments). Dynamic header collapses on scroll."**
