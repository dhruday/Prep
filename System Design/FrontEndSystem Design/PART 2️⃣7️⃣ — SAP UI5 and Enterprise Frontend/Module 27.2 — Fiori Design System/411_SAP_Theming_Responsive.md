# 411 – SAP Theming and Responsive Design

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
SAP uses **Theme Designer** for customizable themes (Quartz Light/Dark, Horizon). SAPUI5 has built-in responsive controls that adapt to screen size using `sap.m` library (mobile-first). Responsive patterns: `SplitApp`, `FlexibleColumnLayout`, device model (`sap.ui.Device`).

## 2. 🔬 DEEP-DIVE EXPLANATION

```javascript
// ──── THEMING ────
// Themes applied via bootstrap parameter
// <script src="resources/sap-ui-core.js"
//   data-sap-ui-theme="sap_horizon" ...>

// Available themes:
// sap_horizon       — current default (2023+)
// sap_horizon_dark  — dark mode
// sap_fiori_3       — Fiori 3 (legacy)
// sap_belize        — older (deprecated)

// Programmatic theme switch:
sap.ui.getCore().applyTheme("sap_horizon_dark");

// Custom theming via Theme Designer:
// 1. Create custom theme in SAP Theme Designer tool
// 2. Customize colors, fonts, sizes
// 3. Export .css theme package
// 4. Apply via data-sap-ui-theme or Core.applyTheme()

// Using CSS custom properties (Horizon theme):
// --sapBrandColor, --sapBackgroundColor, --sapTextColor
// .myCustomControl { color: var(--sapTextColor); }

// ──── RESPONSIVE DESIGN ────
// Device detection:
var bIsPhone = sap.ui.Device.system.phone;
var bIsTablet = sap.ui.Device.system.tablet;
var bIsDesktop = sap.ui.Device.system.desktop;

// FlexibleColumnLayout (responsive master-detail)
/*
<f:FlexibleColumnLayout id="fcl" layout="{layout>/layout}">
  <f:beginColumnPages>
    <mvc:XMLView viewName="myapp.view.List" />
  </f:beginColumnPages>
  <f:midColumnPages>
    <mvc:XMLView viewName="myapp.view.Detail" />
  </f:midColumnPages>
  <f:endColumnPages>
    <mvc:XMLView viewName="myapp.view.DetailDetail" />
  </f:endColumnPages>
</f:FlexibleColumnLayout>
*/

// Responsive Grid Layout (forms)
/*
<form:SimpleForm layout="ResponsiveGridLayout"
  columnsL="2" columnsM="1"
  labelSpanL="4" labelSpanM="12">
  <Label text="Name" />
  <Input value="{Name}" />
  <Label text="Price" />
  <Input value="{Price}" />
</form:SimpleForm>
*/

// Responsive visibility
/*
<HBox>
  <Text text="Full Label" visible="{= ${device>/system/phone} ? false : true}" />
  <Text text="Short" visible="{= ${device>/system/phone} ? true : false}" />
</HBox>
*/
```

### Responsive Patterns in SAPUI5
| Control | Desktop | Tablet | Phone |
|---|---|---|---|
| `FlexibleColumnLayout` | 3 columns | 2 columns | 1 column |
| `SplitApp` | Master+Detail | Master+Detail | Master or Detail |
| `ResponsiveGridLayout` | Multi-column | Fewer columns | Single column |
| `OverflowToolbar` | All buttons | Overflow menu | Collapsed |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"SAP themes via Theme Designer (Horizon Light/Dark). Responsive via FlexibleColumnLayout (3→2→1 columns), ResponsiveGridLayout for forms, Device model for detection. My experience implementing responsive SAP UIs translates directly to any responsive design system."*

## 4. 🧠 MEMORY AID
**"Themes: Horizon (current), Theme Designer (custom). Responsive: FlexibleColumnLayout (3-col), SplitApp (2-col), Device model for detection."**
