# RULES.md — Telugu Smart Investor
# Script Generation Rules & Quality Standards
# Version: 1.0 | Attach this file to EVERY stock script generation prompt.

---

## HOW TO USE THIS FILE

Attach this file alongside the Master Stock Prompt whenever generating a script.

Tell Claude:
> "Use RULES.md as the quality enforcement layer for this script. Every output must pass all rules in this file before being considered complete."

This file governs:
- Language and tone
- Script structure quality
- Hook and retention standards
- Thumbnail and title output format
- Metadata package format
- Telugu authenticity checks
- SEBI compliance
- Common mistakes to automatically avoid

---

## PART 1 — LANGUAGE RULES (MANDATORY)

### 1.1 Telugu Authenticity Standard

- [ ] Script is written in natural, conversational Telugu — as a passionate YouTuber speaks on camera, NOT as a translated document
- [ ] Financial/market terms stay in English: Revenue, EBITDA, PE, FII, DII, SIP, CAGR, ROIC, OCF, PAT — no forced Telugu translation
- [ ] All other language is Telugu — no English sentences, no English paragraphs
- [ ] Telugu script and numerals are NOT used — use standard numerals (1, 2, 3) and English for stock names, company names, metric abbreviations
- [ ] No robotic sentence structure like: "This company has revenue of X. This is good."
- [ ] Every explanation uses a local Telugu analogy — see 1.2 below

### 1.2 Analogy Requirement (One Per Major Concept)

For every financial or business concept explained, include a Telugu daily-life analogy. Do not leave any concept naked without context.

**Approved analogy bank — use or build on these:**

| Concept | Analogy |
|---|---|
| Operating leverage | "Idli shop — అదే gas, అదే staff — కానీ customers రెట్టింపు అయితే profit రెట్టింపు కంటే ఎక్కువ అవుతుంది" |
| Moat / Competitive advantage | "మన ఊరి బావి — ఒక్కటే ఉంది, ప్రత్యామ్నాయం లేదు" |
| TAM | "Entire market = మొత్తం వర్షం. Company share = ఒక బాల్తీ" |
| Compounding | "తుమ్మచెట్టు — మొదటి సంవత్సరాలు slow, తర్వాత వేగంగా పెరుగుతుంది" |
| Margin of safety | "రైలు లో confirm seat లేకుండా journey start చేయకండి" |
| Debt trap | "ఒక loan తీర్చడానికి మరో loan తీసుకోవడం — ఆ cycle break కావడం కష్టం" |
| Free cash flow | "Profit అంటే మీ salary. FCF అంటే salary లో నుండి అన్ని expenses పోగా మీ hand లో ఉండే money" |
| Support/Resistance | "Support = floor. Resistance = ceiling. Ball bounce అవ్వడం మళ్ళీ మళ్ళీ same place లో జరుగుతుంది" |

**Rule:** If no analogy fits from the bank, create a new one using: food, farming, cricket, movies, local shops, family savings, or real estate — all contexts a Telugu viewer immediately understands.

### 1.3 Natural Filler Phrases (Sprinkle Throughout)

Use these to maintain conversational rhythm — minimum 8–10 per script:

```
చూడండి...
అర్థమైందా?
ఇప్పుడు చెప్తాను...
ఇదే అసలు విషయం!
ఒక్క నిమిషం ఆగండి...
ఇది చాలా మంది చూడని angle...
ఇక్కడే twist ఉంది...
అర్థమైందా ఈ logic?
ఈ ఒక్క point చాలా important...
ఒకసారి ఆలోచించండి...
మీకు ఒక question — [question]?
ఇది నేను personally interesting గా అనిపించింది...
చాలా మంది ఇక్కడ తప్పు చేస్తారు...
```

---

## PART 2 — SCRIPT STRUCTURE RULES

### 2.1 Hook Rules (First 30 Seconds — Most Critical)

The hook is the most important part of the script. Spend the most effort here.

**Hook must:**
- [ ] State the most surprising OR counterintuitive fact about this stock in the FIRST 8 SECONDS
- [ ] Create a "Pattern Interrupt" — something the viewer did NOT expect to hear
- [ ] NOT start with: "Hello everyone", "Welcome to Telugu Smart Investor", "Namaskaram", "Today we will discuss"
- [ ] NOT explain what the video is about — instead, SHOW the most interesting insight immediately
- [ ] Be 20–40 seconds total, ending with a curiosity bridge that pulls to the main content

**Hook quality test — before including it, answer:**
1. Would a viewer who knows nothing about this stock stop scrolling when they hear this?
2. Does the hook create a question in the viewer's mind that only the rest of the video can answer?
3. Is the hook based on a real, surprising data point — not a generic statement?

If "No" to any of the above → rewrite the hook before proceeding.

**Approved hook patterns:**

```
Pattern 1 — The Surprising Number:
"₹[X] invest చేసి ఉంటే ఈరోజు ₹[Y] అయేది — కానీ 90% investors ఈ company పేరు కూడా వినలేదు."

Pattern 2 — The Counterintuitive Truth:
"అందరూ అంటున్నారు ఈ stock expensive అని — కానీ data చూస్తే అది సరికాదు. ఎందుకంటే..."

Pattern 3 — The Hidden Risk:
"ఈ company గురించి అందరూ మాట్లాడుతున్నారు — కానీ ఈ ఒక్క risk గురించి ఎవరూ చెప్పడం లేదు."

Pattern 4 — The Smart Money Reveal:
"గత 3 quarters లో ఈ company లో [FII/DII/Smart investor] quietly accumulate చేస్తున్నారు — retail investors కి తెలియకముందే."

Pattern 5 — The Transformation Story:
"2020 లో ₹50 ఉన్న ఈ stock ఈరోజు ₹[X] — ఇది luck కాదు, ఇది ఒక specific business model వల్ల."
```

### 2.2 Retention Rules (Throughout the Script)

Every 60–90 seconds of narration (roughly 130–150 words), insert ONE of:
- A surprising insight the viewer didn't expect
- A hidden risk most people ignore
- A management credibility revelation
- A future catalyst that's not in the news yet
- A misconception most retail investors have

**Micro-curiosity bridges (use at end of each section):**
```
"కానీ ఇక్కడే అసలు story మొదలవుతుంది..."
"ఇది మాత్రమే కాదు — తర్వాత చెప్పేది మరింత interesting..."
"Numbers చూసి settle అవ్వకండి — management ఏం చేస్తోందో చూడండి..."
"ఒక్క నిమిషం — ఈ తర్వాత section లో ఒక hidden risk ఉంది, చాలా మంది దీన్ని ignore చేస్తారు..."
```

### 2.3 "So What?" Rule

Every data point must be followed by its meaning. Never drop a number without interpretation.

**Format:**
```
[Number/Fact] → [What it means] → [Why a long-term investor should care]
```

**Example — BAD:**
> "Company revenue ₹1,200 Cr అయింది. EBITDA margin 18% ఉంది."

**Example — GOOD:**
> "Revenue ₹1,200 Cr — అంటే మూడేళ్ళ క్రితం కంటే రెట్టింపు. EBITDA margin 18% — ఇది important ఎందుకంటే ఈ margin expand అవుతోంది, అంటే revenue పెరిగినప్పుడు profit మరింత వేగంగా పెరుగుతుంది — ఇదే operating leverage magic."

### 2.4 Section Length Control

Do NOT give equal length to all sections. Allocate time by importance.

**Priority hierarchy:**
1. Hook → Always full attention, never shortened
2. Business Model → Full attention for every video
3. Management Intelligence → Full attention, most differentiated section
4. Multibagger Scorecard → Full attention, the climax
5. Risk Factors → Full attention, builds trust
6. Financial Signals → Standard depth unless financials ARE the story
7. Technical Snapshot → Keep brief (3–4 minutes max) — this is education, not trading
8. Macro → Medium depth unless macro IS the dominant driver
9. Concept of the Weekend → 3–5 minutes, always include

### 2.5 Video Length Targets

| Stock Type | Target Duration | Approx Script Word Count |
|---|---|---|
| Large cap well-known stock | 15–20 min | 2,250–3,000 words |
| Mid cap growth stock | 18–25 min | 2,700–3,750 words |
| Small cap deep dive | 20–30 min | 3,000–4,500 words |
| Multibagger candidate | 25–35 min | 3,750–5,250 words |

---

## PART 3 — INSIGHT QUALITY RULES

### 3.1 Minimum Insight Checklist

Every script MUST contain at least one original insight from EACH of these sources. If data is unavailable, state clearly: *"ఈ data publicly available కాదు, కానీ..."*

- [ ] **Earnings con-call** — a specific quote or management statement, with the quarter it was made
- [ ] **Annual report** — something from the Chairman's letter, MD&A, or risk section that most people skip
- [ ] **Ownership trend** — not just current numbers, but the direction over 4+ quarters
- [ ] **Competitive positioning** — how this company compares to 2–3 named peers on a specific metric
- [ ] **Future catalyst** — something concrete with a probability and timeline assigned
- [ ] **Management credibility check** — at least one promise tracked against actual delivery

### 3.2 Information Asymmetry Standard

Before finalizing the script, answer:

1. What is the single most important thing a viewer will remember about this company?
2. What insight in this script is LEAST likely to be known by someone who only reads Screener or Moneycontrol?
3. What information here cannot be found from a simple financial website summary?
4. Does this script feel like independent research or a collection of public facts?

If the answer to question 4 is "collection of public facts" → add more con-call intelligence, annual report nuggets, or ownership trend analysis before finalizing.

### 3.3 Management Credibility Tracker (Required Section)

For every script, track at minimum 5 management promises. Format:

| Promise | First Said | Repeated | Deadline | Actual Result | Verdict |
|---|---|---|---|---|---|
| [Promise] | Q[X] FY[XX] | [N] times | [Timeline] | [What happened] | ✅ / ⚠️ / ❌ |

**Verdict key:**
- ✅ Delivered — executed on time, within guidance
- ⚠️ Partially delivered / delayed — some progress, not complete
- ❌ Missed — timeline passed, not achieved
- 🔁 Repeated narrative — said 3+ times with no measurable progress (flag this clearly)

---

## PART 4 — TITLE RULES

### 4.1 Title Requirements

Every script output must include EXACTLY 5 title options.

**Each title must:**
- [ ] Be written primarily in Telugu (stock/company name stays in English)
- [ ] Be 45–60 characters maximum
- [ ] Contain at least ONE of: a specific rupee amount, a percentage, or a number
- [ ] Contain at least ONE emotional trigger word
- [ ] NOT start with the channel name
- [ ] Pass the "would I click this while scrolling at 11pm?" test

**Approved emotional trigger words (Telugu):**
```
అసలు నిజం, ఎవరూ చెప్పలేదు, Shocking, Secret, Mistake, Warning, 
పెరుగుతుందా, కూలిపోతుందా, Hidden, Danger, Opportunity, Revealed,
తప్పకుండా, మిస్ అవ్వకండి, మారిపోయింది, జాగ్రత్త
```

### 4.2 Title Formula Templates

All 5 titles must use DIFFERENT formulas from this list:

```
Formula A — Transformation:
₹[X] → ₹[Y] — [Company] తో ఇది ఎలా సాధ్యం?

Formula B — Hidden Truth:
[Company] గురించి ఈ [shocking fact/number] ఎవరూ చెప్పలేదు 😳

Formula C — Decision Trigger:
[Company] ని ఇప్పుడు కొనాలా? నిజం ఇది — [key data]

Formula D — Common Mistake:
[X]% Investors చేసే ఈ Mistake మీరు చేయడం లేదు కదా?

Formula E — Crash/Drop Opportunity:
[Company] [X]% Crash — Buy Opportunity అా Trap అా?

Formula F — Smart Money Signal:
[Investor type] Silent గా కొంటున్నారు — [Company] లో ఏం జరుగుతోందో తెలుసా?

Formula G — Specific Loss/Gain:
ఈ [Mistake/Strategy] వల్ల ₹[X] [నష్టం/లాభం] — Real Story

Formula H — Future Prediction:
[Company]: [X] సంవత్సరాల్లో ₹[Y] అవుతుందా? Data చెప్పేది ఇది
```

### 4.3 Title Scoring Before Finalizing

Rate each title option:

| # | Title | Characters | Number ✓ | Emotion ✓ | Telugu ✓ | Formula Used |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |

**Recommend** the strongest title with a one-line reason.

---

## PART 5 — THUMBNAIL RULES

### 5.1 Thumbnail Text

Output thumbnail text as bold, maximum 5 words in Telugu (company name in English allowed).

**Required elements in the thumbnail text:**
- [ ] Creates shock, urgency, or intense curiosity in isolation (without reading the title)
- [ ] Does NOT duplicate the title word-for-word
- [ ] Uses one of these emotional frames: Warning / Opportunity / Revelation / Surprise

**Approved thumbnail text formats:**

```
₹[X] → ₹[Y]?
[Company]: జాగ్రత్త! 🔴
[X]% Crash — BUY?
అసలు నిజం చెప్తాను
Silent గా కొంటున్నారు! 
Hidden Risk Revealed
[Company] Multibagger? 
ఇప్పుడు SELL చేయండి?
```

### 5.2 Thumbnail Visual Brief

Output a thumbnail brief with these fields:

```
THUMBNAIL BRIEF:
---
Thumbnail Text: [Max 5 words]
Background Color: [Single bold color — Red #CC2200 / Navy #0A1F44 / Orange #E85D04]
Face Expression: [Shocked / Excited / Serious + Concerned / Pointing]
Right Side Element: [Company logo / chart / rupee symbol / specific number]
Bottom Strip: [Company name or NSE ticker in white on dark strip]
Corner Watermark: TSI logo
Emotion Goal: [What should the viewer FEEL when they see this thumbnail?]
Thumbnail-Title Relationship: [Does thumbnail tell a DIFFERENT but COMPLEMENTARY story to the title?]
```

---

## PART 6 — DESCRIPTION RULES

### 6.1 Description Format (Copy-Paste Ready)

Output a complete, formatted YouTube description using this structure:

```
LINE 1–2 (150 chars max, must contain primary keyword):
[Telugu hook sentence restating the most compelling claim. Primary keyword in first 80 chars.]

ఈ Video లో మీరు నేర్చుకుంటారు:
✅ [Key insight 1]
✅ [Key insight 2]
✅ [Key insight 3]
✅ [Key insight 4 — Multibagger Score result]

---
📌 CHAPTERS:
[Timestamps — added after editing. Placeholder here.]

---
🔔 Telugu Smart Investor Subscribe చేయండి: [Channel URL]
Telugu Stock Market | Telugu Investing | Multibagger Stocks Telugu

---
📊 Related Videos:
▶ [Relevant video 1 — leave blank for channel to fill]
▶ [Relevant video 2]

---
🛠 Tools Mentioned:
• Screener.in — Free fundamental analysis
• Trendlyne — Ownership & DII/FII data
• NSE India — Official filings
• Tickertape — Portfolio tracker

---
📩 Business: [email placeholder]

---
#TeluguStockMarket #TeluguInvesting #[CompanyName] #MultibaggerStocks #StockAnalysisTelugu
#TeluguMutualFunds #IndianStockMarket #NSE #BSE #TeluguFinance #SmallCapStocks
#WealthCreation #StockMarketTelugu #TeluguSmartInvestor #LongTermInvesting

---
⚠️ DISCLAIMER: ఈ video purely educational purpose కోసం మాత్రమే. ఇది SEBI registered investment advice కాదు. ఏ stock లో అయినా invest చేసే ముందు certified financial advisor ని consult చేయండి. Stock market investments market risk కి subject అవుతాయి.
```

### 6.2 Description Quality Checks

- [ ] First 150 characters contain the primary Telugu + English keyword
- [ ] At least 4 learning points listed
- [ ] Exactly 12–15 hashtags (mix of Telugu finance + English market tags + company name)
- [ ] Disclaimer always present — never omit
- [ ] Description is minimum 250 words total

---

## PART 7 — CHAPTERS / TIMESTAMPS RULES

### 7.1 Chapter Rules

- [ ] First chapter always at 0:00
- [ ] Minimum 8 chapters, maximum 12 for a standard deep-dive video
- [ ] Chapter titles are 3–5 words maximum
- [ ] Chapter titles are in Telugu or simple mixed Telugu-English
- [ ] Each chapter creates its own curiosity — someone reading chapters should want to jump to each one

### 7.2 Chapter Template (Stock Deep Dive)

```
0:00 — Hook: [Most surprising fact]
0:45 — ఈ Stock ఎందుకు ఇప్పుడు?
2:30 — Business అర్థం చేసుకుందాం
5:00 — Financial Signals — Numbers లో నిజం
8:30 — Management: Promises vs Reality
12:00 — Smart Money ఏం చేస్తోంది?
15:00 — Macro: Tailwinds & Headwinds
17:30 — Hidden Catalysts — 10x కి ఏమి కావాలి?
20:00 — Risk Factors — Honest Truth
23:00 — Multibagger Scorecard: 100-Point Verdict
26:30 — What to Watch Going Forward
28:30 — Weekend Concept: [Concept Name]
30:30 — Final Verdict & Community Question
```

---

## PART 8 — SCORECARD RULES

### 8.1 Scorecard Presentation

The 100-point Multibagger Scorecard must be shown in TWO steps:

**Step 1 — Category breakdown FIRST** (never skip this):

```
Business Potential (15):
  • TAM Size = [X]/5
  • Industry Growth = [X]/4
  • Penetration Opportunity = [X]/3
  • Tailwinds = [X]/3
  Category Total = [X]/15

[Repeat for all 8 categories]
```

**Step 2 — Final score AFTER all categories:**

```
┌─────────────────────────────────┬──────┬───────┐
│ Category                        │ Max  │ Score │
├─────────────────────────────────┼──────┼───────┤
│ 1. Business Potential           │  15  │  __   │
│ 2. Scalable Business Model      │  12  │  __   │
│ 3. Management & Promoter        │  15  │  __   │
│ 4. Financial Signals            │  18  │  __   │
│ 5. Hidden Catalysts             │  10  │  __   │
│ 6. Undiscovered Opportunity     │  10  │  __   │
│ 7. Valuation                    │  10  │  __   │
│ 8. Risk Deductions              │ -10  │  __   │
├─────────────────────────────────┼──────┼───────┤
│ FINAL MULTIBAGGER SCORE         │ 100  │  __   │
└─────────────────────────────────┴──────┴───────┘

Conviction Level: [Ultra-High / High / Medium / Speculative / Pass]
```

### 8.2 Scoring Integrity Rules

- [ ] Every score is based on measurable evidence — NOT excitement about the company
- [ ] Every deduction in Category 8 is explicitly named with the reason
- [ ] If data for any sub-category is not available, assign neutral score and note: *"Public data available kadu — neutral score assign chestunnanu"*
- [ ] Scores must be defensible: someone reading the same Screener/annual report data should arrive within ±5 points
- [ ] The score is presented in script as: *"ఈ framework ఒక educational tool — buy/sell signal కాదు"*

---

## PART 9 — RISK SECTION RULES

### 9.1 Risk Section Requirements

- [ ] Minimum 4 risks, maximum 6 risks per script
- [ ] Each risk has: Name → Specific evidence → Why it matters → What would change the picture
- [ ] At least ONE governance/management risk addressed
- [ ] At least ONE macro/external risk addressed
- [ ] At least ONE valuation or timing risk addressed
- [ ] Tone is honest, not fear-mongering — balanced with "BUT here's what would change this risk..."

### 9.2 Risk Severity Labeling

Label every risk:
```
🔴 Critical — could permanently damage the thesis
🟠 High — significant concern, monitor closely
🟡 Medium — manageable, but watch for deterioration
🟢 Low — noted but unlikely to materially affect outlook
```

---

## PART 10 — COMPLIANCE RULES (NON-NEGOTIABLE)

### 10.1 Absolute Prohibitions

NEVER include in any script:

- ❌ Direct buy / sell / hold recommendation ("ఈ stock కొనండి", "ఇప్పుడే buy చేయండి")
- ❌ Price targets ("ఈ stock ₹X కి వెళ్తుంది")
- ❌ Guaranteed return language ("guaranteed", "100% sure", "definitely profit")
- ❌ Misleading or unverified data — if data is uncertain, say so
- ❌ Hype language designed to create FOMO without evidence
- ❌ Discouraging statements about competitors' channels

### 10.2 Required Compliance Statements

Include BOTH of these in every script:

**Mid-video reminder** (insert naturally after Scorecard section):
> *"ఒక important reminder — ఈ analysis educational purpose కోసం మాత్రమే. ఈ score ఒక framework — investment decision కాదు. మీ own research చేయండి, financial advisor ని consult చేయండి."*

**End-of-video SEBI Disclaimer** (word-for-word, always):
> *"SEBI Disclaimer: ఈ video purely educational purpose కోసం మాత్రమే. ఇది SEBI registered investment advice కాదు. ఏ stock లో అయినా invest చేసే ముందు certified financial advisor ని consult చేయండి. Stock market investments market risk కి subject అవుతాయి."*

---

## PART 11 — FINAL OUTPUT FORMAT

Every script generation must produce a complete output package in this exact order:

```
## OUTPUT PACKAGE — [COMPANY NAME] | [DATE]

### SECTION A: NARRATION SCRIPT
[Full Telugu narration script, section-by-section]

---

### SECTION B: TITLE OPTIONS (5 titles)
| # | Title | Characters | Recommended? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
**Recommended:** Title [X] — [One-line reason]

---

### SECTION C: THUMBNAIL BRIEF
Thumbnail Text:
Background Color:
Face Expression:
Right Side Element:
Bottom Strip:
Corner Watermark: TSI logo
Emotion Goal:
Thumbnail-Title Relationship:

---

### SECTION D: YOUTUBE DESCRIPTION
[Full formatted description — copy-paste ready]

---

### SECTION E: TAGS (15 tags)
[Comma-separated list]

---

### SECTION F: CHAPTERS / TIMESTAMPS
[Chapter list with placeholder times]

---

### SECTION G: PINNED COMMENT TEMPLATE
[Ready-to-paste pinned comment]

---

### SECTION H: MULTIBAGGER SCORECARD SUMMARY
[Category breakdown + final score table]

---

### SECTION I: COMMUNITY POST IDEA
[One community post related to this video — poll or insight post]
```

---

## PART 12 — SELF-QUALITY CHECK

Before finalizing ANY script output, verify:

### Hook
- [ ] Does it create a pattern interrupt in the first 8 seconds?
- [ ] Does it avoid "welcome to" or "today we discuss"?
- [ ] Does it end with a curiosity bridge?

### Language
- [ ] Is every sentence natural Telugu — not translated English?
- [ ] Are there at least 8 filler phrases throughout?
- [ ] Is there at least one analogy per major concept?

### Insights
- [ ] Is there at least one con-call insight?
- [ ] Is there at least one annual report insight?
- [ ] Is there a management promise tracker with 5+ entries?

### Retention
- [ ] Is there a micro-curiosity bridge every 60–90 seconds?
- [ ] Does every data point have a "So what?" explanation?

### Compliance
- [ ] No buy/sell recommendation anywhere?
- [ ] Mid-video reminder included?
- [ ] SEBI disclaimer at the end?

### Metadata
- [ ] 5 titles, all different formulas?
- [ ] Thumbnail brief complete?
- [ ] Description with disclaimer and hashtags?
- [ ] Chapters listed?
- [ ] Pinned comment drafted?

**If any item above is unchecked → fix before delivering output.**

---

## APPENDIX — QUICK REFERENCE

### Telugu Emotional Trigger Words
```
అసలు నిజం | ఎవరూ చెప్పలేదు | Shocking | Secret | Mistake | Warning
పెరుగుతుందా | కూలిపోతుందా | Hidden | Danger | Opportunity | Revealed
తప్పకుండా | మిస్ అవ్వకండి | మారిపోయింది | జాగ్రత్త | Exposed | Surprise
```

### Approved Analytics Targets (from channel audit)
| Metric | Current | Target |
|---|---|---|
| Avg view retention | 14–20% | 40%+ |
| CTR | ~1–2% | 4%+ |
| Shorts avg watch time | 13s | Pause Shorts until fixed |
| Search traffic share | 6% | 15–25% |
| Suggested video traffic | 6% | 20%+ |

### Score Conviction Levels
| Score | Level | Telugu Summary |
|---|---|---|
| 85–100 | Ultra-High | "అన్ని parameters లో exceptional" |
| 70–84 | High | "Strong fundamentals, clear path" |
| 55–69 | Medium | "Interesting — watchlist worthy" |
| 40–54 | Speculative | "Potential ఉంది but high uncertainty" |
| < 40 | Pass | "Risk too high at this stage" |

---

*Telugu Smart Investor — RULES.md v1.0*
*Attach to every stock script generation prompt. Update after every 10 scripts.*
