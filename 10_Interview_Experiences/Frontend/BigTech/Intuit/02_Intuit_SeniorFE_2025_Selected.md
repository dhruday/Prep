# Intuit — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Intuit |
| **Role** | Staff Frontend Engineer |
| **Level** | E6 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | QuickBooks |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Craft Demo + Technical Pair + System Design + Behavioral + HM)
- **Timeline:** 3 weeks

---

## Round 1: Craft Demo (Take-Home)
**Duration:** 1 week

### Challenge
**Build an Interactive Tax Calculator**
- Multiple income sources (Salary, Freelance, Capital Gains, Rental Income)
- Tax slab calculation based on old vs new Indian regime
- Deductions: 80C, 80D, HRA, Standard Deduction
- Real-time tax saving suggestions
- Responsive, accessible, tested

### 💡 Core State Management

```jsx
// Tax calculation engine (pure functions)
const TAX_SLABS_NEW_2025 = [
  { min: 0,       max: 300000,   rate: 0 },
  { min: 300001,  max: 700000,   rate: 0.05 },
  { min: 700001,  max: 1000000,  rate: 0.10 },
  { min: 1000001, max: 1200000,  rate: 0.15 },
  { min: 1200001, max: 1500000,  rate: 0.20 },
  { min: 1500001, max: Infinity,  rate: 0.30 },
];

const TAX_SLABS_OLD = [
  { min: 0,       max: 250000,   rate: 0 },
  { min: 250001,  max: 500000,   rate: 0.05 },
  { min: 500001,  max: 1000000,  rate: 0.20 },
  { min: 1000001, max: Infinity,  rate: 0.30 },
];

function calculateTax(income, slabs) {
  let tax = 0;
  let remaining = income;
  
  for (const slab of slabs) {
    if (remaining <= 0) break;
    const taxableInSlab = Math.min(remaining, slab.max - slab.min + 1);
    tax += taxableInSlab * slab.rate;
    remaining -= taxableInSlab;
  }
  
  return Math.round(tax);
}

function calculateHRAExemption(hra) {
  const { basic, hraReceived, rentPaid, isMetro } = hra;
  if (!rentPaid || rentPaid <= 0) return 0;
  
  return Math.min(
    hraReceived,
    rentPaid - 0.1 * basic,
    (isMetro ? 0.5 : 0.4) * basic
  );
}

function useTaxCalculator() {
  const [income, setIncome] = useState({
    salary: { basic: 0, hra: 0, special: 0, lta: 0 },
    freelance: 0,
    capitalGains: { shortTerm: 0, longTerm: 0 },
    rental: 0,
    other: 0,
  });
  
  const [deductions, setDeductions] = useState({
    section80C: 0,      // Max 1.5L
    section80D: 0,      // Max 25K (self) + 25K (parents)
    nps_80CCD: 0,       // Max 50K
    homeLoanInterest: 0, // Max 2L
    standardDeduction: 75000, // Fixed (new regime 2025)
  });
  
  const [regime, setRegime] = useState('new');
  
  const grossIncome = useMemo(() => {
    const { salary, freelance, capitalGains, rental, other } = income;
    return (salary.basic + salary.hra + salary.special + salary.lta)
           + freelance
           + capitalGains.shortTerm + capitalGains.longTerm
           + rental + other;
  }, [income]);
  
  const totalDeductions = useMemo(() => {
    if (regime === 'new') return deductions.standardDeduction;
    
    return Math.min(deductions.section80C, 150000)
         + Math.min(deductions.section80D, 50000)
         + Math.min(deductions.nps_80CCD, 50000)
         + Math.min(deductions.homeLoanInterest, 200000)
         + deductions.standardDeduction
         + calculateHRAExemption({
             basic: income.salary.basic,
             hraReceived: income.salary.hra,
             rentPaid: deductions.rentPaid || 0,
             isMetro: deductions.isMetro || false,
           });
  }, [deductions, regime, income]);
  
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);
  
  const taxOld = calculateTax(
    Math.max(0, grossIncome - totalDeductions),
    TAX_SLABS_OLD
  );
  const taxNew = calculateTax(
    Math.max(0, grossIncome - deductions.standardDeduction),
    TAX_SLABS_NEW_2025
  );
  
  const recommendation = taxOld < taxNew ? 'old' : 'new';
  const savings = Math.abs(taxOld - taxNew);
  
  return {
    income, setIncome,
    deductions, setDeductions,
    regime, setRegime,
    grossIncome, taxableIncome, totalDeductions,
    taxOld, taxNew, recommendation, savings,
  };
}
```

### React Component

```jsx
function TaxCalculator() {
  const {
    income, setIncome, deductions, setDeductions,
    regime, setRegime, grossIncome, taxableIncome,
    totalDeductions, taxOld, taxNew, recommendation, savings,
  } = useTaxCalculator();
  
  return (
    <main className="tax-calc" role="main" aria-label="Tax Calculator">
      <h1>Income Tax Calculator 2025-26</h1>
      
      {/* Regime Switch */}
      <fieldset className="regime-switch">
        <legend>Tax Regime</legend>
        <label>
          <input type="radio" value="old" checked={regime === 'old'} onChange={() => setRegime('old')} />
          Old Regime
        </label>
        <label>
          <input type="radio" value="new" checked={regime === 'new'} onChange={() => setRegime('new')} />
          New Regime (2025)
        </label>
      </fieldset>
      
      {/* Income Section */}
      <section aria-labelledby="income-heading">
        <h2 id="income-heading">Income Sources</h2>
        <CurrencyInput label="Basic Salary" value={income.salary.basic}
          onChange={v => setIncome(prev => ({...prev, salary: {...prev.salary, basic: v}}))} />
        <CurrencyInput label="Freelance Income" value={income.freelance}
          onChange={v => setIncome(prev => ({...prev, freelance: v}))} />
        {/* ... more inputs */}
      </section>
      
      {/* Tax Comparison */}
      <section className="comparison" aria-live="polite">
        <div className={`regime-card ${recommendation === 'old' ? 'recommended' : ''}`}>
          <h3>Old Regime</h3>
          <p className="tax-amount">₹{taxOld.toLocaleString('en-IN')}</p>
          {recommendation === 'old' && <span className="badge">✓ Saves ₹{savings.toLocaleString('en-IN')}</span>}
        </div>
        <div className={`regime-card ${recommendation === 'new' ? 'recommended' : ''}`}>
          <h3>New Regime</h3>
          <p className="tax-amount">₹{taxNew.toLocaleString('en-IN')}</p>
          {recommendation === 'new' && <span className="badge">✓ Saves ₹{savings.toLocaleString('en-IN')}</span>}
        </div>
      </section>
    </main>
  );
}

function CurrencyInput({ label, value, onChange }) {
  const id = useId();
  return (
    <div className="currency-input">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrapper">
        <span className="prefix" aria-hidden="true">₹</span>
        <input
          id={id} type="text" inputMode="numeric"
          value={value ? value.toLocaleString('en-IN') : ''}
          onChange={e => {
            const num = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
            onChange(isNaN(num) ? 0 : num);
          }}
          aria-label={`${label} in rupees`}
        />
      </div>
    </div>
  );
}
```

---

## 🎯 Key Takeaways
- Intuit = **Craft Demo is make-or-break** — spend time on UX, accessibility, tests
- **Tax calculator**: pure functions for calculation logic → easy to test + reuse
- **useMemo for derived state**: gross income, deductions, tax amounts — all derived
- **Regime comparison**: show both old + new with clear recommendation + savings amount
- **CurrencyInput**: `inputMode="numeric"` + toLocaleString('en-IN') for Indian formatting
- **HRA exemption**: min of 3 values — classic Intuit interview question
- Intuit values: **customer obsession**, design-led company → UI/UX quality matters
- QuickBooks stack: React + Node + GraphQL + PostgreSQL

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Craft Demo | Hard | Tax Calculator, Accessibility, Testing |
| Technical Pair | Medium-Hard | React Patterns, Hooks |
| System Design | Hard | Tax Filing Platform, Multi-Region |
| Behavioral | Medium | Customer Obsession, Innovation |
| HM | Medium | Leadership, Growth |
