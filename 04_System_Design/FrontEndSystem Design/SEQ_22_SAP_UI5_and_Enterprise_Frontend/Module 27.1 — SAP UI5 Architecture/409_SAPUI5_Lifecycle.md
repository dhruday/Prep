# 409 – SAPUI5 Lifecycle and Rendering

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
SAPUI5 controls have a lifecycle: `init()` → `onBeforeRendering()` → `renderer()` → `onAfterRendering()` → `exit()`. Views have controller lifecycle: `onInit()` → `onBeforeRendering()` → `onAfterRendering()` → `onExit()`. Understanding this is critical for DOM manipulation and cleanup.

## 2. 🔬 DEEP-DIVE EXPLANATION

```javascript
// ──── CONTROLLER LIFECYCLE ────
sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  return Controller.extend("myapp.controller.Detail", {
    
    // 1️⃣ onInit — called ONCE when view is instantiated
    // Best for: route setup, model init, one-time config
    onInit: function () {
      this.getRouter().getRoute("detail")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    // 2️⃣ onBeforeRendering — called before EVERY rendering
    // Best for: pre-render data prep
    onBeforeRendering: function () {
      // Runs before DOM is updated
    },

    // 3️⃣ onAfterRendering — called after EVERY rendering
    // Best for: DOM manipulation, 3rd party lib init
    onAfterRendering: function () {
      var oDomRef = this.getView().getDomRef();
      // Safe to access DOM here
    },

    // 4️⃣ onExit — called when view is destroyed
    // Best for: cleanup subscriptions, event handlers, intervals
    onExit: function () {
      if (this._oDialog) {
        this._oDialog.destroy();
      }
      clearInterval(this._pollingInterval);
    }
  });
});

// ──── CUSTOM CONTROL LIFECYCLE ────
sap.ui.define(["sap/ui/core/Control"], function (Control) {
  return Control.extend("myapp.control.CustomChart", {
    metadata: {
      properties: {
        data: { type: "object", defaultValue: [] },
        width: { type: "sap.ui.core.CSSSize", defaultValue: "100%" }
      },
      aggregations: {
        _chart: { type: "sap.ui.core.Control", multiple: false, visibility: "hidden" }
      },
      events: {
        dataPointClick: { parameters: { index: { type: "int" } } }
      }
    },

    // 1️⃣ init — constructor equivalent
    init: function () {
      this._chartInstance = null;
    },

    // 2️⃣ renderer — generates DOM
    renderer: {
      apiVersion: 2,
      render: function (oRm, oControl) {
        oRm.openStart("div", oControl);
        oRm.class("custom-chart");
        oRm.style("width", oControl.getWidth());
        oRm.openEnd();
        oRm.close("div");
      }
    },

    // 3️⃣ onAfterRendering — DOM is ready
    onAfterRendering: function () {
      if (this._chartInstance) {
        this._chartInstance.destroy();
      }
      this._chartInstance = this._initChart(this.getDomRef(), this.getData());
    },

    // 4️⃣ exit — cleanup
    exit: function () {
      if (this._chartInstance) {
        this._chartInstance.destroy();
        this._chartInstance = null;
      }
    }
  });
});
```

### Lifecycle Comparison
| Phase | Controller | Custom Control |
|---|---|---|
| **Creation** | `onInit()` | `init()` |
| **Before render** | `onBeforeRendering()` | `onBeforeRendering()` |
| **Rendering** | (XML view handled by framework) | `renderer.render()` |
| **After render** | `onAfterRendering()` | `onAfterRendering()` |
| **Destruction** | `onExit()` | `exit()` |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"SAPUI5 lifecycle mirrors Angular/React: onInit for setup, onAfterRendering for DOM access, onExit for cleanup. Custom controls have a renderer for DOM generation. This lifecycle understanding maps to any framework — init, render, cleanup is universal."*

## 4. 🧠 MEMORY AID
**"Controller: onInit → onBeforeRendering → onAfterRendering → onExit. Control: init → renderer → onAfterRendering → exit. onInit = once, rendering hooks = every render."**
