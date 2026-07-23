# Admission Predictor - Setup Guide

## Kya hai ye?
Ye ek **Google Apps Script Web App** hai jo:
- Tere Google Sheet ka data read karta hai
- **AI-powered prediction model** chalata hai (Linear Regression + Moving Average + Exponential Smoothing + Seasonal)
- **Natural language business report** generate karta hai
- Interactive dashboard with charts dikhata hai

---

## Step-by-Step Setup

### Step 1: Google Sheet banao
1. Google Sheets kholo: https://sheets.google.com
2. Naya sheet banao
3. **Sheet1** naam do (ya CONFIG mein naam change karo)
4. Headers daalo (Row 1):

| admission_date | region | center | admissions |
|---|---|---|---|

5. Data daalo (Row 2 onwards):

| 2024-01-15 | North | Delhi Center | 150 |
| 2024-01-20 | South | Mumbai Center | 200 |
| 2024-02-10 | North | Delhi Center | 180 |
| ... | ... | ... | ... |

**Important:**
- `admission_date` - YYYY-MM-DD format mein daalo
- `region` - Region ka naam (North, South, etc.)
- `center` - Center ka naam
- `admissions` - Number (sirf digits)

### Step 2: Google Apps Script kholo
1. Apne Google Sheet mein jao
2. Menu mein **Extensions > Apps Script** pe click karo
3. Naya project khulega

### Step 3: Code daalo
1. **Code.gs** file mein purana code hatao
2. `Code.gs` ka content paste karo
3. Naya file banao: **+ > Script file**
4. File ka naam: `PredictionEngine`
5. `PredictionEngine.gs` ka content paste karo
6. Phir se naya file banao: **+ > Script file**
7. File ka naam: `AIReport`
8. `AIReport.gs` ka content paste karo
9. Phir se naya file banao: **+ > Script file**
10. File ka naam: `Index`
11. `Index.html` ka content paste karo

### Step 4: Deploy karo
1. **Deploy > New deployment** pe click karo
2. **Type:** Web app select karo
3. **Description:** "Admission Predictor" likho
4. **Execute as:** Me (tumhara email)
5. **Who has access:** Anyone (ya Anyone with Google account)
6. **Deploy** pe click karo
7. URL copy karo - ye tumhara web app URL hai!

### Step 5: Test karo
1. Deployed URL pe jao
2. Region, Center, aur Forecast months select karo
3. **Analyze & Predict** button pe click karo
4. Dashboard + AI Report generate hoga!

---

## Files Overview

| File | Kya karta hai |
|------|--------------|
| `Code.gs` | Main server functions - data reading, analysis, web app entry |
| `PredictionEngine.gs` | Prediction algorithms - Linear Regression, Moving Average, etc. |
| `AIReport.gs` | AI report generator - Natural language mein business report |
| `Index.html` | Frontend UI - Dashboard, Charts, Tables, Controls |

---

## Features

### Dashboard
- **Stats Cards:** Total admissions, monthly average, trend, forecast
- **Trend Chart:** Actual data + future prediction with confidence bands
- **Model Comparison:** 4 prediction methods ka comparison
- **Regional Distribution:** Pie chart of regions
- **Seasonal Pattern:** Monthly average bar chart

### AI Report Sections
1. **Executive Summary** - Overall picture in 2-3 paragraphs
2. **Historical Analysis** - Past data ki detailed analysis
3. **Prediction Insights** - Future forecast with confidence ranges
4. **Regional Analysis** - Region-wise breakdown with insights
5. **Center Analysis** - Center-wise performance
6. **Seasonal Insights** - Monthly patterns detect karta hai
7. **Strategic Recommendations** - Actionable suggestions
8. **Risk Assessment** - Risk level aur mitigation strategies
9. **Methodology** - Kaise kaam karta hai explain karta hai

### Prediction Model (Ensemble)
- **Linear Regression (25%)** - Long-term trend
- **Weighted Moving Average (30%)** - Recent patterns
- **Exponential Smoothing (30%)** - Adaptive smoothing
- **Seasonal Adjustment (15%)** - Monthly patterns

### Filters
- Region filter
- Center filter
- Forecast months (1-36)

---

## Customization

### CONFIG change karo (Code.gs mein)
```javascript
var CONFIG = {
  SHEET_NAME: 'Sheet1',      // Tera sheet ka naam
  DATE_COL: 1,               // Date ki column (A=1, B=2, etc.)
  REGION_COL: 2,             // Region ki column
  CENTER_COL: 3,             // Center ki column
  ADMISSIONS_COL: 4          // Admissions ki column
};
```

### Prediction weights change karo (PredictionEngine.gs mein)
```javascript
// predictFuture function mein:
var ensemble = Math.round(
  linearPred[i] * 0.25 +        // Linear Regression weight
  movingAvgPred[i] * 0.30 +     // Moving Average weight
  expSmoothingPred[i] * 0.30 +  // Exponential Smoothing weight
  seasonalPred[i] * 0.15        // Seasonal weight
);
```

---

## Troubleshooting

### Error: "Sheet 'Sheet1' nahi mili"
- Sheet ka naam check karo
- CONFIG mein SHEET_NAME change karo

### Error: "Filter ke baad koi data nahi mila"
- Filters sahi hain ya nahi check karo
- Data mein matching entries hain ya nahi

### Error: "Sheet mein data nahi hai"
- Headers ke neeche data hona chahiye
- Row 1 headers hai, Row 2+ data hai

### Charts dikh nahi rahe
- Internet connection check karo (Chart.js CDN load hota hai)
- Browser console mein errors check karo

---

## Notes
- **No external API needed** - Sab kuch Google Apps Script mein hota hai
- **AI Report** template-based NLG hai (Natural Language Generation)
- **Prediction accuracy** data pe depend karta hai - zyada data = better prediction
- **Print** button se PDF bana sakte ho
- **Dark theme** UI hai professional look ke saath
