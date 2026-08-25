# 412 – Fiori Launchpad and SAP Business Technology Platform

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Fiori Launchpad (FLP)** is SAP's central entry point — a tile-based dashboard where users launch SAP applications based on their role. **SAP BTP** (Business Technology Platform) is SAP's cloud platform for hosting, extending, and integrating SAP applications. FLP + BTP = modern SAP frontend deployment.

## 2. 🔬 DEEP-DIVE EXPLANATION

### Fiori Launchpad
```
┌─────────────────────────────────────────────────┐
│ SAP Fiori Launchpad                              │
├─────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │ PO   │  │ Sales│  │ HR   │  │Invent│        │
│  │Create│  │Report│  │Portal│  │ory   │        │
│  └──────┘  └──────┘  └──────┘  └──────┘        │
│                                                  │
│  ┌──────┐  ┌──────┐                             │
│  │Budget│  │Custom│                              │
│  │Mgmt  │  │App   │                              │
│  └──────┘  └──────┘                             │
│                                                  │
│ Tiles are role-based — HR sees HR tiles only     │
└─────────────────────────────────────────────────┘
```

```javascript
// ──── APP REGISTRATION IN FLP ────
// manifest.json — cross-navigation inbound
/*
{
  "sap.app": {
    "crossNavigation": {
      "inbounds": {
        "ProductList": {
          "semanticObject": "Product",
          "action": "display",
          "signature": {
            "parameters": {},
            "additionalParameters": "allowed"
          }
        }
      }
    }
  }
}
*/

// ──── NAVIGATION FROM FLP ────
// Cross-app navigation
var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
oCrossAppNav.toExternal({
  target: { semanticObject: "SalesOrder", action: "display" },
  params: { orderId: "12345" }
});

// ──── SAP BTP ARCHITECTURE ────
/*
SAP BTP (Cloud Foundry / Kyma)
├── HTML5 Repository      — hosts SAPUI5/Fiori apps
├── Destination Service   — proxy to on-premise SAP backends
├── Authentication (XSUAA) — OAuth2 / SAML SSO
├── SAP HANA Cloud        — database
├── Cloud Connector       — tunnel to on-premise systems
├── CAP (Cloud Application Programming) — backend framework
└── Integration Suite     — iPaaS for system integration
*/

// Deployment workflow:
// 1. Build SAPUI5 app: ui5 build --all
// 2. Deploy to HTML5 Repository on BTP
// 3. Register tile in FLP Site Manager
// 4. Assign to role collections
// 5. Users see tile based on their role authorization

// ──── SAP CAP + SAPUI5 ────
// CAP = Node.js/Java backend framework on BTP
// Generates OData services from CDS (Core Data Services)
// SAPUI5 frontend consumes these OData services
```

### FLP Key Concepts
| Concept | Description |
|---|---|
| **Semantic Object** | Business entity (Product, SalesOrder, Employee) |
| **Action** | Operation (display, create, edit) |
| **Target Mapping** | Maps semantic object+action to app URL |
| **Tile** | Visual launcher for an app (static, dynamic, KPI) |
| **Role Collection** | Group of authorizations assigned to users |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Fiori Launchpad is SAP's role-based app launcher with cross-app navigation via semantic objects. BTP hosts apps via HTML5 Repository with XSUAA authentication. My experience deploying apps to FLP demonstrates understanding of enterprise frontend distribution, role-based access, and cloud deployment."*

## 4. 🧠 MEMORY AID
**"FLP = tile-based launcher (role-based). BTP = SAP cloud (HTML5 Repo + XSUAA + Destinations). Semantic Object + Action = cross-app navigation."**
