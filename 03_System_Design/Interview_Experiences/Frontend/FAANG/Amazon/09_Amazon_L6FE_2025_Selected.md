# Amazon — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Frontend Engineer III |
| **Level** | L6 (Senior) |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [Medium](https://medium.com/tag/interview-experience) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 4 Onsite: 2 Coding + System Design + Bar Raiser)
- **Timeline:** 3 weeks
- **Format:** Virtual Loop

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Build a Product Comparison Table**
   - Render a dynamic table comparing N products across M features
   - Support sorting by any column
   - Highlight differences between products
   - Sticky header and first column for scrolling
   - Responsive: collapse into accordion on mobile

### 💡 Interview-Ready Answer

```javascript
class ProductComparisonTable {
  constructor(container, products) {
    this.container = container;
    this.products = products; // [{name, image, features: {key: value}}]
    this.sortField = null;
    this.sortOrder = 'asc';
    this.allFeatures = this.extractFeatures();
    this.isMobile = window.innerWidth < 768;

    this.init();
  }

  extractFeatures() {
    const featureSet = new Set();
    this.products.forEach(p => {
      Object.keys(p.features).forEach(f => featureSet.add(f));
    });
    return [...featureSet];
  }

  init() {
    this.render();
    this.setupResizeObserver();
  }

  setupResizeObserver() {
    const ro = new ResizeObserver((entries) => {
      const wasMobile = this.isMobile;
      this.isMobile = entries[0].contentRect.width < 768;
      if (wasMobile !== this.isMobile) this.render();
    });
    ro.observe(this.container);
  }

  // ============================
  // Difference Detection
  // ============================
  findDifferences() {
    const diffs = new Map(); // feature -> true if values differ
    this.allFeatures.forEach(feature => {
      const values = this.products.map(p => p.features[feature]);
      const unique = new Set(values.filter(v => v !== undefined));
      diffs.set(feature, unique.size > 1);
    });
    return diffs;
  }

  // ============================
  // Sorting
  // ============================
  sortProducts(field) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }

    this.products.sort((a, b) => {
      let valA = field === 'name' ? a.name : a.features[field];
      let valB = field === 'name' ? b.name : b.features[field];

      // Numeric comparison
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return this.sortOrder === 'asc' ? numA - numB : numB - numA;
      }

      // String comparison
      valA = String(valA || '');
      valB = String(valB || '');
      const cmp = valA.localeCompare(valB);
      return this.sortOrder === 'asc' ? cmp : -cmp;
    });

    this.render();
  }

  // ============================
  // Desktop: Table Rendering
  // ============================
  renderTable() {
    const diffs = this.findDifferences();

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      overflow-x: auto; max-width: 100%; position: relative;
      border: 1px solid #E0E0E0; border-radius: 8px;
    `;

    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%; border-collapse: collapse; font-family: -apple-system, sans-serif;
      font-size: 14px;
    `;

    // Header row: product names
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.cssText = `position: sticky; top: 0; z-index: 2; background: #F5F5F5;`;

    // Empty cell for feature column
    const emptyTh = document.createElement('th');
    emptyTh.style.cssText = `
      position: sticky; left: 0; z-index: 3; background: #F5F5F5;
      padding: 12px; text-align: left; border-bottom: 2px solid #333;
      min-width: 150px;
    `;
    emptyTh.textContent = 'Feature';
    headerRow.appendChild(emptyTh);

    this.products.forEach(product => {
      const th = document.createElement('th');
      th.style.cssText = `
        padding: 12px; text-align: center; border-bottom: 2px solid #333;
        min-width: 180px; cursor: pointer;
      `;
      th.innerHTML = `
        <div style="font-weight: 700;">${this.escapeHtml(product.name)}</div>
        ${product.price ? `<div style="color: #E47911; font-size: 18px; font-weight: 700;">
          ${this.escapeHtml(product.price)}</div>` : ''}
      `;
      th.addEventListener('click', () => this.sortProducts('name'));
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Feature rows
    const tbody = document.createElement('tbody');
    this.allFeatures.forEach((feature, idx) => {
      const row = document.createElement('tr');
      row.style.cssText = `
        background: ${idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'};
        ${diffs.get(feature) ? 'background: #FFF9E6;' : ''}
      `;

      // Feature name cell (sticky left)
      const featureCell = document.createElement('td');
      featureCell.style.cssText = `
        position: sticky; left: 0; z-index: 1;
        padding: 10px 12px; font-weight: 600; border-right: 1px solid #E0E0E0;
        background: inherit; cursor: pointer;
      `;
      featureCell.textContent = feature;
      featureCell.addEventListener('click', () => this.sortProducts(feature));
      row.appendChild(featureCell);

      // Value cells
      this.products.forEach(product => {
        const cell = document.createElement('td');
        const value = product.features[feature];
        cell.style.cssText = `
          padding: 10px 12px; text-align: center;
          border-right: 1px solid #F0F0F0;
        `;

        if (value === undefined || value === null) {
          cell.innerHTML = '<span style="color: #CCC;">—</span>';
        } else if (typeof value === 'boolean') {
          cell.innerHTML = value
            ? '<span style="color: #2E7D32;">✓</span>'
            : '<span style="color: #C62828;">✗</span>';
        } else {
          cell.textContent = value;
        }

        // Highlight best value (numeric: highest)
        if (diffs.get(feature)) {
          const numericValues = this.products
            .map(p => parseFloat(p.features[feature]))
            .filter(v => !isNaN(v));
          const numVal = parseFloat(value);
          if (!isNaN(numVal) && numVal === Math.max(...numericValues)) {
            cell.style.fontWeight = '700';
            cell.style.color = '#2E7D32';
          }
        }

        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  // ============================
  // Mobile: Accordion Rendering
  // ============================
  renderAccordion() {
    const container = document.createElement('div');
    container.style.cssText = 'font-family: -apple-system, sans-serif;';

    this.products.forEach(product => {
      const card = document.createElement('div');
      card.style.cssText = `
        border: 1px solid #E0E0E0; border-radius: 8px;
        margin-bottom: 8px; overflow: hidden;
      `;

      const header = document.createElement('button');
      header.style.cssText = `
        width: 100%; padding: 14px; background: #F5F5F5;
        border: none; text-align: left; font-size: 16px;
        font-weight: 700; cursor: pointer; display: flex;
        justify-content: space-between; align-items: center;
      `;
      header.innerHTML = `
        <span>${this.escapeHtml(product.name)}</span>
        <span style="font-size: 12px;">▼</span>
      `;

      const body = document.createElement('div');
      body.style.cssText = 'display: none; padding: 12px;';

      this.allFeatures.forEach(feature => {
        const row = document.createElement('div');
        row.style.cssText = `
          display: flex; justify-content: space-between;
          padding: 8px 0; border-bottom: 1px solid #F0F0F0;
        `;
        const val = product.features[feature];
        row.innerHTML = `
          <span style="color: #666;">${this.escapeHtml(feature)}</span>
          <span style="font-weight: 600;">${val !== undefined ? this.escapeHtml(String(val)) : '—'}</span>
        `;
        body.appendChild(row);
      });

      let isOpen = false;
      header.addEventListener('click', () => {
        isOpen = !isOpen;
        body.style.display = isOpen ? 'block' : 'none';
        header.querySelector('span:last-child').textContent = isOpen ? '▲' : '▼';
      });

      card.appendChild(header);
      card.appendChild(body);
      container.appendChild(card);
    });

    return container;
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  render() {
    this.container.innerHTML = '';
    const content = this.isMobile ? this.renderAccordion() : this.renderTable();
    this.container.appendChild(content);
  }
}

// Usage
const products = [
  {
    name: 'iPhone 15 Pro', price: '₹1,34,900',
    features: {
      'Display': '6.1" OLED', 'Refresh Rate': '120Hz', 'Processor': 'A17 Pro',
      'RAM': '8GB', 'Storage': '256GB', 'Battery': '3274mAh',
      '5G': true, 'Wireless Charging': true, 'Weight': '187g',
    }
  },
  {
    name: 'Samsung S24 Ultra', price: '₹1,29,999',
    features: {
      'Display': '6.8" AMOLED', 'Refresh Rate': '120Hz', 'Processor': 'Snapdragon 8 Gen 3',
      'RAM': '12GB', 'Storage': '256GB', 'Battery': '5000mAh',
      '5G': true, 'Wireless Charging': true, 'Weight': '232g',
    }
  },
];

const table = new ProductComparisonTable(document.getElementById('comparison'), products);
```

## Round 2: Frontend Coding Onsite
**Duration:** 60 minutes
**LP Focus:** Customer Obsession

### Questions Asked
1. **Build an Infinite Scrolling Product Grid with Windowing**

## Round 3: System Design
**Duration:** 60 minutes
**LP Focus:** Think Big

### Questions Asked
1. **Design Amazon's Product Detail Page Frontend Architecture**

## Round 4: Bar Raiser
**Duration:** 60 minutes

## 🎯 Key Takeaways
- Amazon frontend interviews combine **practical UI building** with **LP storytelling**
- Product comparison is highly relevant to Amazon — know sticky positioning and diff highlighting
- **Responsive design** (table → accordion) is expected, not bonus
- XSS prevention via `escapeHtml` shows security awareness in dynamic content rendering
- ResizeObserver > window.resize for container-level responsive behavior

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Medium-Hard | Table, Sticky Position, Responsive |
| Frontend Coding | Hard | Virtual Scrolling, Windowing |
| System Design | Hard | PDP Architecture, Performance |
| Bar Raiser | Medium-Hard | Behavioral, LP Stories |
