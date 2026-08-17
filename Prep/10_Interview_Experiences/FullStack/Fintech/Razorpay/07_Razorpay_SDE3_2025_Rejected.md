# Razorpay — SDE-3 FullStack Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/razorpay-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Banking |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build an Invoice Generation and Payment Tracking System
**Duration:** 90 minutes

### Challenge: Build an invoice system that: creates invoices with line items, calculates taxes (GST with CGST/SGST for intra-state, IGST for inter-state), tracks payment status, supports partial payments, handles recurring invoices with auto-send.

```java
import java.util.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;

/**
 * Invoice Generation & Payment Tracking System:
 * 
 * Features:
 * 1. Invoice creation with line items + quantity + rate
 * 2. GST calculation: Intra-state (CGST+SGST) vs Inter-state (IGST)
 * 3. Partial payments with balance tracking
 * 4. Recurring invoices (weekly/monthly/yearly)
 * 5. Due date tracking with overdue alerts
 * 6. Invoice numbering: INV-{YYYY}-{seq}
 */

class BusinessProfile {
    String businessName;
    String gstin;        // GSTIN: 22AAAAA0000A1Z5 (first 2 digits = state code)
    String stateCode;    // Derived from first 2 digits of GSTIN
    String address;
    String email;
    
    BusinessProfile(String name, String gstin, String address) {
        this.businessName = name; this.gstin = gstin;
        this.stateCode = gstin.substring(0, 2); this.address = address;
    }
}

class InvoiceLineItem {
    String description;
    BigDecimal quantity;
    BigDecimal unitPrice;
    BigDecimal gstRate;    // e.g., 0.18 for 18%
    String hsnCode;        // HSN/SAC code for GST
    
    InvoiceLineItem(String desc, BigDecimal qty, BigDecimal unitPrice, BigDecimal gstRate, String hsn) {
        this.description = desc; this.quantity = qty; this.unitPrice = unitPrice;
        this.gstRate = gstRate; this.hsnCode = hsn;
    }
    
    BigDecimal getSubtotal() {
        return quantity.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
    }
    
    BigDecimal getTaxAmount() {
        return getSubtotal().multiply(gstRate).setScale(2, RoundingMode.HALF_UP);
    }
}

class Invoice {
    String invoiceNumber;
    LocalDate issueDate;
    LocalDate dueDate;
    BusinessProfile seller;
    BusinessProfile buyer;
    List<InvoiceLineItem> lineItems;
    
    // Calculated fields
    BigDecimal subtotal;
    BigDecimal cgstTotal;
    BigDecimal sgstTotal;
    BigDecimal igstTotal;
    BigDecimal totalTax;
    BigDecimal grandTotal;
    boolean isInterState;
    
    // Payment tracking
    String status; // DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED
    BigDecimal amountPaid;
    BigDecimal balanceDue;
    List<Payment> payments;
    
    // Recurring
    String recurringFrequency; // null, "WEEKLY", "MONTHLY", "YEARLY"
    LocalDate nextRecurrenceDate;
    
    Invoice(String number, BusinessProfile seller, BusinessProfile buyer, LocalDate dueDate) {
        this.invoiceNumber = number; this.seller = seller; this.buyer = buyer;
        this.issueDate = LocalDate.now(); this.dueDate = dueDate;
        this.lineItems = new ArrayList<>(); this.payments = new ArrayList<>();
        this.status = "DRAFT"; this.amountPaid = BigDecimal.ZERO;
        this.isInterState = !seller.stateCode.equals(buyer.stateCode);
    }
    
    void addLineItem(InvoiceLineItem item) {
        lineItems.add(item);
        recalculate();
    }
    
    void recalculate() {
        subtotal = BigDecimal.ZERO;
        cgstTotal = BigDecimal.ZERO;
        sgstTotal = BigDecimal.ZERO;
        igstTotal = BigDecimal.ZERO;
        
        for (InvoiceLineItem item : lineItems) {
            subtotal = subtotal.add(item.getSubtotal());
            BigDecimal tax = item.getTaxAmount();
            
            if (isInterState) {
                // IGST = full tax rate
                igstTotal = igstTotal.add(tax);
            } else {
                // CGST = half, SGST = half
                BigDecimal half = tax.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                cgstTotal = cgstTotal.add(half);
                sgstTotal = sgstTotal.add(half);
            }
        }
        
        totalTax = cgstTotal.add(sgstTotal).add(igstTotal);
        grandTotal = subtotal.add(totalTax);
        balanceDue = grandTotal.subtract(amountPaid);
        
        // Update status based on balance
        if (balanceDue.compareTo(BigDecimal.ZERO) <= 0 && amountPaid.compareTo(BigDecimal.ZERO) > 0) {
            status = "PAID";
        } else if (amountPaid.compareTo(BigDecimal.ZERO) > 0) {
            status = "PARTIALLY_PAID";
        } else if (dueDate.isBefore(LocalDate.now()) && !"PAID".equals(status)) {
            status = "OVERDUE";
        }
    }
}

class Payment {
    String paymentId;
    BigDecimal amount;
    String method; // UPI, NEFT, CARD, CASH
    LocalDate date;
    String reference; // UTR/Transaction reference
    
    Payment(String id, BigDecimal amount, String method, String reference) {
        this.paymentId = id; this.amount = amount; this.method = method;
        this.reference = reference; this.date = LocalDate.now();
    }
}

class InvoiceSystem {
    
    private final Map<String, Invoice> invoices = new LinkedHashMap<>();
    private int sequenceNumber = 0;
    
    /**
     * Generate next invoice number: INV-2025-0001
     */
    String nextInvoiceNumber() {
        sequenceNumber++;
        return String.format("INV-%d-%04d", Year.now().getValue(), sequenceNumber);
    }
    
    /**
     * Create a new invoice.
     */
    Invoice createInvoice(BusinessProfile seller, BusinessProfile buyer, 
                           LocalDate dueDate, List<InvoiceLineItem> items) {
        String number = nextInvoiceNumber();
        Invoice invoice = new Invoice(number, seller, buyer, dueDate);
        
        for (InvoiceLineItem item : items) {
            invoice.addLineItem(item);
        }
        
        invoices.put(number, invoice);
        return invoice;
    }
    
    /**
     * Record a payment against an invoice.
     * Supports partial payments.
     */
    String recordPayment(String invoiceNumber, BigDecimal amount, String method, String reference) {
        Invoice invoice = invoices.get(invoiceNumber);
        if (invoice == null) return "Invoice not found";
        if ("CANCELLED".equals(invoice.status)) return "Invoice is cancelled";
        if ("PAID".equals(invoice.status)) return "Invoice already fully paid";
        
        // Prevent overpayment
        if (amount.compareTo(invoice.balanceDue) > 0) {
            return "Payment amount (₹" + amount + ") exceeds balance due (₹" + invoice.balanceDue + ")";
        }
        
        String paymentId = "PAY-" + System.currentTimeMillis();
        Payment payment = new Payment(paymentId, amount, method, reference);
        
        invoice.payments.add(payment);
        invoice.amountPaid = invoice.amountPaid.add(amount);
        invoice.recalculate();
        
        return "Payment recorded: " + paymentId + ". Balance due: ₹" + invoice.balanceDue;
    }
    
    /**
     * Setup recurring invoice.
     */
    void setupRecurring(String invoiceNumber, String frequency) {
        Invoice invoice = invoices.get(invoiceNumber);
        if (invoice == null) return;
        
        invoice.recurringFrequency = frequency;
        
        switch (frequency) {
            case "WEEKLY": invoice.nextRecurrenceDate = invoice.issueDate.plusWeeks(1); break;
            case "MONTHLY": invoice.nextRecurrenceDate = invoice.issueDate.plusMonths(1); break;
            case "YEARLY": invoice.nextRecurrenceDate = invoice.issueDate.plusYears(1); break;
        }
    }
    
    /**
     * Process recurring invoices — generate new invoices where recurrence date has passed.
     */
    List<Invoice> processRecurring() {
        List<Invoice> generated = new ArrayList<>();
        
        for (Invoice template : new ArrayList<>(invoices.values())) {
            if (template.recurringFrequency == null) continue;
            if (template.nextRecurrenceDate == null) continue;
            if (template.nextRecurrenceDate.isAfter(LocalDate.now())) continue;
            
            // Create new invoice from template
            LocalDate newDueDate = template.nextRecurrenceDate.plusDays(
                Period.between(template.issueDate, template.dueDate).getDays());
            
            Invoice newInvoice = createInvoice(template.seller, template.buyer, 
                                                newDueDate, template.lineItems);
            newInvoice.status = "SENT";
            
            // Setup next recurrence on template
            switch (template.recurringFrequency) {
                case "WEEKLY": template.nextRecurrenceDate = template.nextRecurrenceDate.plusWeeks(1); break;
                case "MONTHLY": template.nextRecurrenceDate = template.nextRecurrenceDate.plusMonths(1); break;
                case "YEARLY": template.nextRecurrenceDate = template.nextRecurrenceDate.plusYears(1); break;
            }
            
            generated.add(newInvoice);
        }
        
        return generated;
    }
    
    /**
     * Get overdue invoices.
     */
    List<Invoice> getOverdueInvoices() {
        List<Invoice> overdue = new ArrayList<>();
        
        for (Invoice inv : invoices.values()) {
            if (inv.dueDate.isBefore(LocalDate.now()) && 
                !"PAID".equals(inv.status) && !"CANCELLED".equals(inv.status)) {
                inv.status = "OVERDUE";
                overdue.add(inv);
            }
        }
        
        overdue.sort(Comparator.comparing(i -> i.dueDate)); // Oldest overdue first
        return overdue;
    }
    
    /**
     * Generate text representation of invoice.
     */
    String generateInvoiceText(String invoiceNumber) {
        Invoice inv = invoices.get(invoiceNumber);
        if (inv == null) return "Invoice not found";
        
        StringBuilder sb = new StringBuilder();
        sb.append("═══════════════════════════════════════\n");
        sb.append("  TAX INVOICE\n");
        sb.append("  " + inv.invoiceNumber + "\n");
        sb.append("═══════════════════════════════════════\n");
        sb.append("From: " + inv.seller.businessName + "\n");
        sb.append("GSTIN: " + inv.seller.gstin + "\n\n");
        sb.append("To: " + inv.buyer.businessName + "\n");
        sb.append("GSTIN: " + inv.buyer.gstin + "\n\n");
        sb.append("Date: " + inv.issueDate + "  Due: " + inv.dueDate + "\n\n");
        
        sb.append("Item                    Qty     Rate      Amount\n");
        sb.append("─────────────────────────────────────────────────\n");
        
        for (InvoiceLineItem item : inv.lineItems) {
            sb.append(String.format("%-24s %5s  %8s  %10s\n",
                item.description,
                item.quantity.stripTrailingZeros().toPlainString(),
                "₹" + item.unitPrice.toPlainString(),
                "₹" + item.getSubtotal().toPlainString()));
        }
        
        sb.append("─────────────────────────────────────────────────\n");
        sb.append(String.format("Subtotal:                               ₹%s\n", inv.subtotal));
        
        if (inv.isInterState) {
            sb.append(String.format("IGST:                                   ₹%s\n", inv.igstTotal));
        } else {
            sb.append(String.format("CGST:                                   ₹%s\n", inv.cgstTotal));
            sb.append(String.format("SGST:                                   ₹%s\n", inv.sgstTotal));
        }
        
        sb.append(String.format("═══════════════════════════════════════════════\n"));
        sb.append(String.format("TOTAL:                                  ₹%s\n", inv.grandTotal));
        sb.append(String.format("Paid:                                   ₹%s\n", inv.amountPaid));
        sb.append(String.format("Balance Due:                            ₹%s\n", inv.balanceDue));
        sb.append("Status: " + inv.status + "\n");
        
        return sb.toString();
    }
}
```

---

## 🎯 Key Takeaways
- Razorpay SDE-3 FS = **Invoice system with GST, partial payments, recurring invoices**
- **GST split logic**: Intra-state → CGST (50%) + SGST (50%); Inter-state → IGST (100%) — determined by comparing seller/buyer state codes from GSTIN
- **GSTIN state code**: first 2 digits of GSTIN — e.g., "27" = Maharashtra, "29" = Karnataka
- **BigDecimal for money**: `setScale(2, RoundingMode.HALF_UP)` — NEVER use double for financial calculations
- **Partial payments**: `amountPaid += payment; balanceDue = grandTotal - amountPaid` — track payment history
- **Overpayment protection**: reject `amount > balanceDue` — prevent negative balance
- **Recurring invoices**: template-based, advance `nextRecurrenceDate` after each generation
- **Status transitions**: DRAFT → SENT → PARTIALLY_PAID → PAID / OVERDUE (mutually exclusive)
- **Invoice numbering**: `INV-{YYYY}-{seq}` — sequential, year-prefixed, zero-padded
- **Rejection reason**: system design round on payment gateway didn't cover idempotency and reconciliation depth

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Hard | Financial, GST, State Management |
| System Design | Very Hard | Payment Gateway Architecture |
| HM | Medium | Culture |
