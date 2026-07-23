# Admission Predictor

A professional, data-driven admission analytics dashboard that analyzes weekly admission trends, compares centers, and forecasts monthly admissions — all from a live Google Sheets CSV feed.

**Live Demo:** [ambikeshishere.github.io/Prediction](https://ambikeshishere.github.io/Prediction/)

---

## Features

- **Auto-Loads Live Data** — Pulls admission data directly from Google Sheets; no manual upload needed
- **Weekly Cycle Analysis** — Week 1 starts from each center's first admission date for accurate tracking
- **Month Forecast** — Projects total admissions for the current month with a visual progress bar
- **Boost Strategy** — Compares the latest week against the previous week with clear on-track / attention-needed indicators
- **Center Comparison** — Shows how many centers share similar admission patterns across the cycle
- **Multi-Select Filters** — Filter by Region and Center with cascading dropdowns
- **Dark / Light Theme** — Toggle with sun/moon animation; preference saved in localStorage
- **Print-Ready Report** — One-click print of the full business analysis report
- **Mobile Responsive** — Works across desktop, tablet, and mobile

---

## Data Format

The CSV must have these headers:

| Column | Description | Example |
|--------|-------------|---------|
| `admission_date` | Date of admission | `2025-07-15` |
| `region` | Region name | `NCR+UK` |
| `center` | Center name | `Noida - Block C Vidyapeeth` |
| `admissions` | Number of admissions (integer) | `12` |

---

## How It Works

1. **Data Ingestion** — CSV is fetched live from a published Google Sheets URL on page load
2. **Cycle Week Calculation** — Each center's Week 1 starts from its first recorded admission; subsequent weeks are numbered from that baseline
3. **Statistical Analysis** — Computes monthly averages, medians, trends (MoM growth), and volatility (CV%)
4. **Prediction Engine** — Ensemble of four models:
   - Linear Regression (25%)
   - Weighted Moving Average (30%)
   - Exponential Smoothing (30%)
   - Seasonal Decomposition (15%)
5. **Similarity Matching** — Euclidean distance on per-week admission share vectors across all centers
6. **Boost Detection** — Flags weeks where a center's share falls >10% below the overall average

---

## Dashboard Sections

### Business Analysis Report
The main report card with seven sections:

| Section | What It Shows |
|---------|---------------|
| **Executive Summary** | Key stats at a glance — total admissions, trend, weekly avg |
| **Weekly Timeline** | Every cycle week with date range, admissions, WoW change, and rolling 4-week average |
| **Center Analysis** | Per-center week-by-week breakdown with date ranges and share percentages |
| **Boost Strategy** | Visual cards comparing latest vs previous week with progress bar and plain-English summary |
| **Center Comparison** | Big-number cards showing total centers, similar centers (70%+ match), and avg per center |
| **Forecast** | Current month projection with days left, daily average, and progress bar |
| **Risk Assessment** | Trend direction and volatility-based risk score |

### Detailed Analysis Tabs

| Tab | Content |
|-----|---------|
| **Weekly Breakdown** | Full sortable table with bar charts and status indicators |
| **Month Projection** | Week-by-week breakdown of the current calendar month |
| **Boost Strategy** | Center-wise weak week flags and recommended actions |
| **Center Comparison** | Ranked table of all centers with similarity scores |
| **Forecast** | Prediction table with confidence intervals |
| **Raw Data** | Sortable, searchable table of all individual records |

---

## Local Development

```bash
# Clone the repository
git clone https://github.com/ambikeshishere/Prediction.git
cd Prediction

# Start a local server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

No build step, no dependencies, no Node.js required. Pure HTML + CSS + JavaScript with Chart.js loaded from CDN.

---

## Project Structure

```
Prediction/
├── Index.html      # Main HTML page
├── style.css       # All styles with dark/light theme variables
├── app.js          # All logic: parsing, analysis, predictions, rendering
└── README.md       # This file
```

---

## Deployment (GitHub Pages)

1. Push to the `main` branch of your GitHub repository
2. Go to **Settings > Pages**
3. Set source to **main** branch
4. The site will be live at `https://<username>.github.io/Prediction/`

Data updates automatically when the linked Google Sheet is edited — no redeployment needed.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, grid, flexbox) |
| Logic | Vanilla JavaScript (ES5-compatible) |
| Charts | [Chart.js 4.4](https://www.chartjs.org/) via CDN |
| Data Source | Google Sheets (published CSV) |
| Hosting | GitHub Pages |

---

## License

MIT
