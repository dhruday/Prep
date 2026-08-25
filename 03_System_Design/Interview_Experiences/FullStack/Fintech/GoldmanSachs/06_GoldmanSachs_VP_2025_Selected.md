# GoldmanSachs — VP FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | Vice President (VP) |
| **Level** | Senior |
| **YOE** | 9 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/goldman-sachs-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Securities Division |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (HackerRank + 2 Technical + System Design + HM)

---

## Round 2: DSA + LLD — Build a Real-Time Option Pricing Engine
**Duration:** 60 minutes

### Q1: Implement Black-Scholes option pricing with Greeks (Delta, Gamma, Theta, Vega, Rho) and a portfolio-level risk calculator.

```java
import java.util.*;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Black-Scholes Option Pricing with Greeks:
 * 
 * Call Price: C = S × N(d1) - K × e^(-rT) × N(d2)
 * Put Price:  P = K × e^(-rT) × N(-d2) - S × N(-d1)
 * 
 * d1 = (ln(S/K) + (r + σ²/2)T) / (σ√T)
 * d2 = d1 - σ√T
 * 
 * Greeks:
 * - Delta (Δ): ∂C/∂S — sensitivity to underlying price
 * - Gamma (Γ): ∂²C/∂S² — rate of change of delta
 * - Theta (Θ): ∂C/∂t — time decay
 * - Vega (ν): ∂C/∂σ — sensitivity to volatility
 * - Rho (ρ): ∂C/∂r — sensitivity to interest rate
 */

class OptionPricing {
    
    static class OptionResult {
        double price;
        double delta;
        double gamma;
        double theta;
        double vega;
        double rho;
        
        OptionResult(double price, double delta, double gamma, 
                      double theta, double vega, double rho) {
            this.price = price; this.delta = delta; this.gamma = gamma;
            this.theta = theta; this.vega = vega; this.rho = rho;
        }
    }
    
    /**
     * Black-Scholes pricing with all Greeks.
     * 
     * @param S Current stock price
     * @param K Strike price
     * @param T Time to expiry (years)
     * @param r Risk-free rate (annual, e.g., 0.05 for 5%)
     * @param sigma Implied volatility (e.g., 0.25 for 25%)
     * @param isCall true for Call, false for Put
     */
    OptionResult blackScholes(double S, double K, double T, double r, double sigma, boolean isCall) {
        if (T <= 0) {
            // At expiry: intrinsic value only
            double intrinsic = isCall ? Math.max(S - K, 0) : Math.max(K - S, 0);
            return new OptionResult(intrinsic, isCall ? (S > K ? 1 : 0) : (S < K ? -1 : 0), 
                                     0, 0, 0, 0);
        }
        
        double sqrtT = Math.sqrt(T);
        double d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * sqrtT);
        double d2 = d1 - sigma * sqrtT;
        
        double Nd1 = cumulativeNormal(d1);
        double Nd2 = cumulativeNormal(d2);
        double nD1 = normalPDF(d1); // Standard normal PDF at d1
        double expRT = Math.exp(-r * T);
        
        double price, delta, rho;
        
        if (isCall) {
            price = S * Nd1 - K * expRT * Nd2;
            delta = Nd1;
            rho = K * T * expRT * Nd2 / 100; // Per 1% change
        } else {
            price = K * expRT * (1 - Nd2) - S * (1 - Nd1);
            delta = Nd1 - 1;
            rho = -K * T * expRT * (1 - Nd2) / 100;
        }
        
        // Greeks (same for call and put, except delta and rho)
        double gamma = nD1 / (S * sigma * sqrtT);
        double vega = S * nD1 * sqrtT / 100; // Per 1% change in vol
        double theta = -(S * nD1 * sigma / (2 * sqrtT) + 
                         (isCall ? -1 : 1) * r * K * expRT * (isCall ? Nd2 : 1 - Nd2)) / 365;
        
        return new OptionResult(price, delta, gamma, theta, vega, rho);
    }
    
    // Cumulative Normal Distribution (Abramowitz and Stegun approximation)
    double cumulativeNormal(double x) {
        if (x < -7) return 0;
        if (x > 7) return 1;
        
        double t = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
        double d = 0.3989422804014327; // 1/sqrt(2*pi)
        double prob = d * Math.exp(-x * x / 2.0) *
            t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + 
            t * (-1.821255978 + t * 1.330274429))));
        
        return x > 0 ? 1 - prob : prob;
    }
    
    double normalPDF(double x) {
        return Math.exp(-x * x / 2.0) / Math.sqrt(2 * Math.PI);
    }
}

/**
 * Portfolio-Level Risk Calculator:
 * 
 * Aggregate Greeks across all positions to get portfolio-level risk metrics.
 */
class PortfolioRiskCalculator {
    
    static class Position {
        String ticker;
        boolean isCall;
        double strikePrice;
        double expiryYears;
        int quantity; // Positive = long, negative = short
        double currentPrice;
        double impliedVol;
    }
    
    static class PortfolioRisk {
        double totalDelta;  // Net delta exposure
        double totalGamma;  // Net gamma
        double totalTheta;  // Daily time decay
        double totalVega;   // Volatility exposure
        double totalValue;  // Mark-to-market
        double var95;       // 95% Value at Risk (1-day)
        Map<String, Double> deltaByTicker; // Per-stock delta
    }
    
    PortfolioRisk calculateRisk(List<Position> positions, double riskFreeRate) {
        OptionPricing pricer = new OptionPricing();
        PortfolioRisk risk = new PortfolioRisk();
        risk.deltaByTicker = new HashMap<>();
        
        for (Position pos : positions) {
            OptionPricing.OptionResult result = pricer.blackScholes(
                pos.currentPrice, pos.strikePrice, pos.expiryYears,
                riskFreeRate, pos.impliedVol, pos.isCall);
            
            double multiplier = pos.quantity * 100; // Options = 100 shares per contract
            
            risk.totalDelta += result.delta * multiplier;
            risk.totalGamma += result.gamma * multiplier;
            risk.totalTheta += result.theta * multiplier;
            risk.totalVega += result.vega * multiplier;
            risk.totalValue += result.price * multiplier;
            
            risk.deltaByTicker.merge(pos.ticker, result.delta * multiplier, Double::sum);
        }
        
        // Simplified VaR (parametric, 1-day, 95% confidence)
        // VaR = |PortfolioDelta| × PortfolioValue × σ_daily × z_95
        double z95 = 1.645;
        double avgVol = positions.stream().mapToDouble(p -> p.impliedVol).average().orElse(0.25);
        double dailyVol = avgVol / Math.sqrt(252); // Annualized → daily
        
        risk.var95 = Math.abs(risk.totalDelta) * dailyVol * z95;
        
        return risk;
    }
    
    /**
     * Suggest hedging trades to delta-neutralize the portfolio.
     */
    String suggestHedge(PortfolioRisk risk) {
        if (Math.abs(risk.totalDelta) < 1) return "Portfolio is approximately delta-neutral.";
        
        StringBuilder sb = new StringBuilder();
        
        for (var entry : risk.deltaByTicker.entrySet()) {
            double tickerDelta = entry.getValue();
            if (Math.abs(tickerDelta) >= 1) {
                int sharesToTrade = -(int) Math.round(tickerDelta);
                sb.append(String.format("%s %d shares of %s\n",
                    sharesToTrade > 0 ? "BUY" : "SELL",
                    Math.abs(sharesToTrade),
                    entry.getKey()));
            }
        }
        
        return sb.toString();
    }
}
```

---

## 🎯 Key Takeaways
- Goldman Sachs VP = **Black-Scholes option pricing + Greeks + portfolio risk management**
- **Black-Scholes formula**: `C = S×N(d1) - K×e^(-rT)×N(d2)` — THE options pricing formula
- **Greeks**: Delta (price sensitivity), Gamma (delta sensitivity), Theta (time decay/day), Vega (volatility sensitivity), Rho (rate sensitivity)
- **Cumulative Normal**: Abramowitz & Stegun polynomial approximation — avoids heavy math libraries
- **Portfolio aggregation**: sum Greeks across positions × quantity × 100 (contract multiplier)
- **VaR (Value at Risk)**: `|Δ| × σ_daily × z_95` — 95% confidence loss estimate
- **Delta hedging**: buy/sell underlying shares to make portfolio delta = 0
- **Daily vol**: `σ_annual / √252` — 252 trading days per year
- Goldman = **quantitative finance** — vanilla options pricing is the baseline; exotic pricing (barriers, Asian) is the follow-up

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| HackerRank | Hard | DSA |
| Technical 1 (this) | Very Hard | Quantitative Finance, Black-Scholes |
| Technical 2 | Hard | Concurrency + Data Structures |
| System Design | Very Hard | Trading Platform Architecture |
| HM | Medium | Culture |
