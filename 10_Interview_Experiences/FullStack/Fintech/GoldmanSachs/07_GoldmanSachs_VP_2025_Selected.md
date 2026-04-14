# Goldman Sachs — VP Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | Vice President, Engineering |
| **Level** | VP |
| **YOE** | 8 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (HackerRank OA + 4 On-site: 2 DSA + System Design + HM)
- **Timeline:** 4 weeks
- **Format:** On-site

## Round 2: Technical — Bond Yield Calculator with Pricing Engine

### Problem
Implement a fixed-income bond pricing system:
- Calculate present value (PV) of a bond given coupon rate, face value, yield (YTM), periods
- Newton-Raphson method to compute YTM from market price
- Duration and modified duration (interest rate sensitivity)
- Support zero-coupon and coupon bonds
- Accrued interest calculation for dirty price

### 💡 Interview-Ready Answer

```java
import java.math.*;
import java.time.*;
import java.time.temporal.*;
import java.util.*;

public class BondPricingEngine {

    record BondSpec(String isin, double faceValue, double couponRate,
                    int periodsPerYear, int totalPeriods,
                    LocalDate settlementDate, LocalDate maturityDate) {}

    record PricingResult(double cleanPrice, double dirtyPrice, double accruedInterest,
                         double ytm, double duration, double modifiedDuration,
                         double convexity) {}

    /**
     * Calculate present value (clean price) of a bond.
     * PV = Σ(C / (1+y)^t) + FV / (1+y)^n
     */
    public double presentValue(BondSpec bond, double yieldPerPeriod) {
        double couponPayment = bond.faceValue() * bond.couponRate() / bond.periodsPerYear();
        double pv = 0;

        for (int t = 1; t <= bond.totalPeriods(); t++) {
            pv += couponPayment / Math.pow(1 + yieldPerPeriod, t);
        }
        pv += bond.faceValue() / Math.pow(1 + yieldPerPeriod, bond.totalPeriods());

        return pv;
    }

    /**
     * Calculate YTM using Newton-Raphson method.
     * Find y such that PV(y) = marketPrice.
     */
    public double yieldToMaturity(BondSpec bond, double marketPrice) {
        double coupon = bond.faceValue() * bond.couponRate() / bond.periodsPerYear();
        int n = bond.totalPeriods();
        double fv = bond.faceValue();

        // Initial guess
        double y = bond.couponRate() / bond.periodsPerYear();
        if (y <= 0) y = 0.05;

        for (int iter = 0; iter < 200; iter++) {
            // f(y) = PV(y) - marketPrice
            double pvSum = 0;
            double pvDeriv = 0; // f'(y)

            for (int t = 1; t <= n; t++) {
                double discount = Math.pow(1 + y, t);
                pvSum += coupon / discount;
                pvDeriv -= t * coupon / Math.pow(1 + y, t + 1);
            }
            pvSum += fv / Math.pow(1 + y, n);
            pvDeriv -= n * fv / Math.pow(1 + y, n + 1);

            double f = pvSum - marketPrice;
            double fPrime = pvDeriv;

            if (Math.abs(fPrime) < 1e-15) break;

            double yNew = y - f / fPrime;

            if (Math.abs(yNew - y) < 1e-10) {
                return yNew * bond.periodsPerYear(); // Annualize
            }
            y = yNew;
        }

        return y * bond.periodsPerYear();
    }

    /**
     * Macaulay Duration: weighted average time to receive cash flows.
     * D = (1/P) * Σ(t * CF_t / (1+y)^t)
     */
    public double macaulayDuration(BondSpec bond, double yieldPerPeriod) {
        double coupon = bond.faceValue() * bond.couponRate() / bond.periodsPerYear();
        int n = bond.totalPeriods();
        double price = presentValue(bond, yieldPerPeriod);

        double weightedSum = 0;
        for (int t = 1; t <= n; t++) {
            double cf = (t == n) ? coupon + bond.faceValue() : coupon;
            weightedSum += t * cf / Math.pow(1 + yieldPerPeriod, t);
        }

        return (weightedSum / price) / bond.periodsPerYear(); // In years
    }

    /**
     * Modified Duration: sensitivity to yield changes.
     * MD = D / (1 + y/m)
     */
    public double modifiedDuration(BondSpec bond, double annualYield) {
        double yieldPerPeriod = annualYield / bond.periodsPerYear();
        double macD = macaulayDuration(bond, yieldPerPeriod);
        return macD / (1 + yieldPerPeriod);
    }

    /**
     * Bond Convexity: second derivative of price w.r.t yield.
     * C = (1/P) * Σ(t*(t+1)*CF_t / (1+y)^(t+2))
     */
    public double convexity(BondSpec bond, double yieldPerPeriod) {
        double coupon = bond.faceValue() * bond.couponRate() / bond.periodsPerYear();
        int n = bond.totalPeriods();
        double price = presentValue(bond, yieldPerPeriod);

        double convSum = 0;
        for (int t = 1; t <= n; t++) {
            double cf = (t == n) ? coupon + bond.faceValue() : coupon;
            convSum += t * (t + 1) * cf / Math.pow(1 + yieldPerPeriod, t + 2);
        }

        return convSum / (price * bond.periodsPerYear() * bond.periodsPerYear());
    }

    /**
     * Accrued interest for dirty price calculation.
     * AI = (daysSinceLastCoupon / daysInCouponPeriod) * couponPayment
     */
    public double accruedInterest(BondSpec bond) {
        double couponPayment = bond.faceValue() * bond.couponRate() / bond.periodsPerYear();
        int daysInPeriod = 365 / bond.periodsPerYear();

        long daysSinceSettlement = ChronoUnit.DAYS.between(
            bond.settlementDate().minusDays(daysInPeriod), bond.settlementDate());
        double fraction = (double) (daysSinceSettlement % daysInPeriod) / daysInPeriod;

        return fraction * couponPayment;
    }

    /**
     * Full pricing analysis.
     */
    public PricingResult analyze(BondSpec bond, double marketPrice) {
        double ytm = yieldToMaturity(bond, marketPrice);
        double yieldPerPeriod = ytm / bond.periodsPerYear();

        double cleanPrice = presentValue(bond, yieldPerPeriod);
        double ai = accruedInterest(bond);
        double dirtyPrice = cleanPrice + ai;
        double dur = macaulayDuration(bond, yieldPerPeriod);
        double modDur = modifiedDuration(bond, ytm);
        double conv = convexity(bond, yieldPerPeriod);

        return new PricingResult(cleanPrice, dirtyPrice, ai, ytm, dur, modDur, conv);
    }

    public static void main(String[] args) {
        BondPricingEngine engine = new BondPricingEngine();

        // 10-year bond, 5% coupon, semi-annual, face value 1000
        BondSpec bond = new BondSpec(
            "IN0020250001", 1000, 0.05, 2, 20,
            LocalDate.of(2025, 3, 15), LocalDate.of(2035, 3, 15)
        );

        double marketPrice = 950;

        System.out.println("=== Bond Pricing Analysis ===");
        System.out.printf("ISIN: %s%n", bond.isin());
        System.out.printf("Face: ₹%.0f, Coupon: %.1f%%, Periods: %d (semi-annual)%n",
            bond.faceValue(), bond.couponRate() * 100, bond.totalPeriods());
        System.out.printf("Market Price: ₹%.2f%n%n", marketPrice);

        PricingResult result = engine.analyze(bond, marketPrice);

        System.out.printf("YTM: %.4f%% (%.4f%% per period)%n",
            result.ytm() * 100, result.ytm() / 2 * 100);
        System.out.printf("Clean Price: ₹%.4f%n", result.cleanPrice());
        System.out.printf("Accrued Interest: ₹%.4f%n", result.accruedInterest());
        System.out.printf("Dirty Price: ₹%.4f%n", result.dirtyPrice());
        System.out.printf("Macaulay Duration: %.4f years%n", result.duration());
        System.out.printf("Modified Duration: %.4f%n", result.modifiedDuration());
        System.out.printf("Convexity: %.4f%n", result.convexity());

        // Price sensitivity
        double basisPointChange = 0.01; // 1%
        double priceChange = -result.modifiedDuration() * basisPointChange * marketPrice;
        double convAdj = 0.5 * result.convexity() * Math.pow(basisPointChange, 2) * marketPrice;
        System.out.printf("%nFor +100bps yield change:%n");
        System.out.printf("  Duration effect: ₹%.2f%n", priceChange);
        System.out.printf("  Convexity adjustment: ₹+%.2f%n", convAdj);
        System.out.printf("  Net price change: ₹%.2f%n", priceChange + convAdj);
    }
}
```

## 🎯 Key Takeaways
- Goldman Sachs focuses on **quantitative finance problems** — bond math, pricing, risk
- **Newton-Raphson** for YTM — converges in ~10 iterations (quadratic convergence)
- Duration measures interest rate sensitivity (first derivative), convexity is second derivative
- Dirty price = Clean price + Accrued interest
- Must handle edge cases: zero-coupon bonds (couponRate=0), frequency (semi-annual vs annual)
- Java records for immutable data structures — clean and appropriate for financial data

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, DP, Graphs |
| DSA 1 | Hard | Trees, Advanced Graph |
| DSA 2 | Medium-Hard | Fixed Income Math, Newton-Raphson |
| System Design | Hard | Trading Platform Architecture |
| HM | Medium | Behavioral, Risk Thinking |
