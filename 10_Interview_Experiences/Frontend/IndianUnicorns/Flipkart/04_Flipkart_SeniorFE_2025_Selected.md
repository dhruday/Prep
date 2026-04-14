# Flipkart — Senior Frontend Engineer Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-3 Frontend |
| **Level** | Lead |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Timeline:** 12 days

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Multi-Level Category Navigation** (like Flipkart's mega menu)
   - Hover on L1 → show L2 panel → hover on L2 → show L3 panel
   - Delay on hover-out to prevent flicker (300ms)
   - Keyboard accessible: Tab through L1, Arrow keys in submenus
   - Mobile: tap to toggle, accordion-style

### 💡 Interview-Ready Answer

```jsx
function MegaMenu({ categories }) {
  const [activeL1, setActiveL1] = useState(null);
  const [activeL2, setActiveL2] = useState(null);
  const timeoutRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  
  // Delayed hover for desktop (prevents flicker)
  const handleL1Enter = (categoryId) => {
    clearTimeout(timeoutRef.current);
    setActiveL1(categoryId);
    setActiveL2(null);
  };
  
  const handleL1Leave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveL1(null);
      setActiveL2(null);
    }, 300); // 300ms delay before closing
  };
  
  const handleL2Enter = (subcategoryId) => {
    clearTimeout(timeoutRef.current);
    setActiveL2(subcategoryId);
  };
  
  const handleMenuMouseEnter = () => {
    clearTimeout(timeoutRef.current);
  };
  
  // Keyboard navigation
  const handleKeyDown = (e, level, id) => {
    const items = level === 1 
      ? categories 
      : categories.find(c => c.id === activeL1)?.children || [];
    
    const currentIndex = items.findIndex(item => item.id === id);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (level === 1 && currentIndex < items.length - 1) {
          handleL1Enter(items[currentIndex + 1].id);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (level === 1 && currentIndex > 0) {
          handleL1Enter(items[currentIndex - 1].id);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (level === 1 && activeL1) {
          // Enter L2 submenu
          const l2Items = categories.find(c => c.id === activeL1)?.children;
          if (l2Items?.length) setActiveL2(l2Items[0].id);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (level === 2) {
          setActiveL2(null);
        }
        break;
      case 'Escape':
        setActiveL1(null);
        setActiveL2(null);
        break;
    }
  };
  
  // Mobile accordion version
  if (isMobile) {
    return (
      <nav className="mobile-menu" aria-label="Category navigation">
        {categories.map(cat => (
          <div key={cat.id} className="accordion-item">
            <button
              className={`accordion-header ${activeL1 === cat.id ? 'open' : ''}`}
              onClick={() => setActiveL1(activeL1 === cat.id ? null : cat.id)}
              aria-expanded={activeL1 === cat.id}
              aria-controls={`submenu-${cat.id}`}
            >
              {cat.name}
              <span className="arrow">{activeL1 === cat.id ? '▼' : '▶'}</span>
            </button>
            
            {activeL1 === cat.id && (
              <div id={`submenu-${cat.id}`} className="accordion-body" role="region">
                {cat.children?.map(sub => (
                  <div key={sub.id}>
                    <button
                      className={`sub-header ${activeL2 === sub.id ? 'open' : ''}`}
                      onClick={() => setActiveL2(activeL2 === sub.id ? null : sub.id)}
                      aria-expanded={activeL2 === sub.id}
                    >
                      {sub.name}
                    </button>
                    
                    {activeL2 === sub.id && (
                      <ul className="sub-items">
                        {sub.children?.map(item => (
                          <li key={item.id}>
                            <a href={item.url}>{item.name}</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    );
  }
  
  // Desktop mega menu
  return (
    <nav className="mega-menu" aria-label="Category navigation"
         onMouseLeave={handleL1Leave}>
      {/* L1 Categories */}
      <ul className="l1-list" role="menubar">
        {categories.map(cat => (
          <li key={cat.id} role="none">
            <button
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={activeL1 === cat.id}
              className={`l1-item ${activeL1 === cat.id ? 'active' : ''}`}
              onMouseEnter={() => handleL1Enter(cat.id)}
              onFocus={() => handleL1Enter(cat.id)}
              onKeyDown={(e) => handleKeyDown(e, 1, cat.id)}
            >
              {cat.name}
            </button>
          </li>
        ))}
      </ul>
      
      {/* L2 + L3 Panel */}
      {activeL1 && (
        <div className="submenu-panel" role="menu"
             onMouseEnter={handleMenuMouseEnter}
             onMouseLeave={handleL1Leave}>
          <div className="l2-column">
            {categories.find(c => c.id === activeL1)?.children?.map(sub => (
              <button
                key={sub.id}
                className={`l2-item ${activeL2 === sub.id ? 'active' : ''}`}
                role="menuitem"
                onMouseEnter={() => handleL2Enter(sub.id)}
                onKeyDown={(e) => handleKeyDown(e, 2, sub.id)}
              >
                {sub.name}
              </button>
            ))}
          </div>
          
          {activeL2 && (
            <div className="l3-column">
              {categories.find(c => c.id === activeL1)?.children
                ?.find(s => s.id === activeL2)?.children?.map(item => (
                <a key={item.id} href={item.url} className="l3-item" role="menuitem">
                  {item.name}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement `Object.create` polyfill**
2. **Explain prototypal inheritance with example**

### 💡 Object.create Polyfill

```javascript
if (!Object.create) {
  Object.create = function(proto, propertiesObject) {
    if (typeof proto !== 'object' && typeof proto !== 'function') {
      throw new TypeError('Object prototype may only be an Object or null');
    }
    
    function F() {}
    F.prototype = proto;
    const obj = new F();
    
    if (proto === null) {
      // Object with null prototype (no toString, etc.)
      Object.setPrototypeOf(obj, null);
    }
    
    if (propertiesObject !== undefined) {
      Object.defineProperties(obj, propertiesObject);
    }
    
    return obj;
  };
}

// Prototypal Inheritance Example:
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return `${this.name} makes a sound`;
};

function Dog(name, breed) {
  Animal.call(this, name); // Call parent constructor
  this.breed = breed;
}

// Set up prototype chain
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog; // Fix constructor reference

Dog.prototype.bark = function() {
  return `${this.name} barks!`;
};

const dog = new Dog('Rex', 'German Shepherd');
dog.speak(); // "Rex makes a sound" (inherited)
dog.bark();  // "Rex barks!" (own method)
dog instanceof Dog;    // true
dog instanceof Animal; // true
```

---

## 🎯 Key Takeaways
- Flipkart FE = **e-commerce navigation + responsive design + mobile-first**
- **Mega menu**: 300ms hover delay prevents accidental close — essential UX pattern
- **3-level navigation**: L1 → L2 → L3 with progressive disclosure
- **Mobile adaptation**: accordion with toggle vs desktop hover panels
- **ARIA menu pattern**: menubar → menuitem with aria-haspopup + aria-expanded
- **Object.create**: creates new object with specified prototype — foundation of inheritance
- **Prototype chain**: `Dog.prototype = Object.create(Animal.prototype)` — don't use `new Animal()`
- Flipkart values: **practical e-commerce skills**, performance on low-end devices, PWA knowledge

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Mega Menu, Hover Delay, Responsive, a11y |
| JavaScript | Medium | Prototypal Inheritance, Object.create |
| System Design | Hard | Product Listing, Search, Filters |
| HM | Medium | Behavioral |
