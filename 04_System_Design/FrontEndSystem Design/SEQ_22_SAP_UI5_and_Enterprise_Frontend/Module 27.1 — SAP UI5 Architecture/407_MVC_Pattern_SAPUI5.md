# 407 – MVC Pattern in SAPUI5 — Models, Views, Controllers

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
SAPUI5's MVC: **Models** hold data (JSON, OData, XML), **Views** render UI (XML preferred), **Controllers** handle logic and events. Data binding connects models to views (one-way, two-way, one-time). The MVC separation enforces clean architecture in enterprise apps.

## 2. 🔬 DEEP-DIVE EXPLANATION

```javascript
// ──── MODEL TYPES ────

// JSON Model (client-side, local data)
var oModel = new sap.ui.model.json.JSONModel({
  products: [
    { name: "Laptop", price: 999, active: true },
    { name: "Phone", price: 699, active: false }
  ]
});
this.getView().setModel(oModel);

// OData V2 Model (server-side, SAP backend)
var oDataModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZPRODUCT_SRV");

// OData V4 Model (modern, batch requests)
var oDataV4 = new sap.ui.model.odata.v4.ODataModel({
  serviceUrl: "/sap/opu/odata4/sap/ZPRODUCT_SRV/",
  synchronizationMode: "None"
});

// Resource Model (i18n)
var i18nModel = new sap.ui.model.resource.ResourceModel({
  bundleName: "myapp.i18n.i18n"
});

// ──── VIEW (XML — preferred) ────
// ProductList.view.xml
/*
<mvc:View controllerName="myapp.controller.ProductList"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m">
  <Page title="{i18n>pageTitle}">
    <List items="{/products}">
      <StandardListItem 
        title="{name}" 
        description="{= ${price} + ' USD'}"
        info="{= ${active} ? 'Active' : 'Inactive'}"
        press="onItemPress" />
    </List>
    <Button text="{i18n>addProduct}" press="onAddProduct" />
  </Page>
</mvc:View>
*/

// ──── DATA BINDING MODES ────
// One-way:  Model → View (default for OData)
// Two-way:  Model ↔ View (default for JSONModel)
// One-time: Model → View (once, then static)

// Binding types in XML:
// {propertyName}          — simple property binding
// {/rootPath/property}    — absolute path
// {path: 'name', type: 'sap.ui.model.type.String'}  — typed
// {= ${price} * 1.1}     — expression binding

// ──── CONTROLLER ────
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function (Controller, MessageBox, Filter, FilterOperator) {
  return Controller.extend("myapp.controller.ProductList", {
    onInit: function () {
      this.getRouter().getRoute("productList")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function () {
      this.getView().getModel().refresh();
    },

    onItemPress: function (oEvent) {
      var oItem = oEvent.getSource();
      var sPath = oItem.getBindingContext().getPath();
      this.getRouter().navTo("productDetail", {
        productId: sPath.split("/").pop()
      });
    },

    onSearch: function (oEvent) {
      var sQuery = oEvent.getParameter("query");
      var aFilters = sQuery ? [
        new Filter("name", FilterOperator.Contains, sQuery)
      ] : [];
      this.byId("productList").getBinding("items").filter(aFilters);
    },

    onAddProduct: function () {
      var oModel = this.getView().getModel();
      var aProducts = oModel.getProperty("/products");
      aProducts.push({ name: "New Product", price: 0, active: true });
      oModel.setProperty("/products", aProducts);
    }
  });
});
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"SAPUI5 MVC uses XML views for declarative UI, JavaScript controllers for event handling, and OData/JSON models for data. Data binding (one-way, two-way, expression) connects them. My experience with SAPUI5 MVC translates directly to any component-based architecture — the separation of concerns is universal."*

## 4. 🧠 MEMORY AID
**"Model = data (JSON/OData). View = XML template. Controller = logic. Binding: {property} one-way, two-way default for JSON. Expression: {= expr}."**
