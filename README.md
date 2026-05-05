# OTA Content QC Comparator

> A hospitality QC tool to compare property website content vs OTA listings (descriptions, photos, amenities, house rules)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## Overview

The **OTA Content QC Comparator** is a browser-based quality assurance tool designed for hospitality professionals. It helps property managers and OTA channel managers ensure that their property listings are consistent, accurate, and complete across their own website and major OTA platforms such as Airbnb, Booking.com, VRBO, and Expedia.

## Features

- **Side-by-side comparison** of website vs OTA listing content
- **Smart similarity scoring** using word-overlap analysis for text fields
- **Amenities diff** — highlights amenities present on your website but missing from the OTA (and vice versa)
- **House rules diff** — line-by-line fuzzy matching of house rules
- **Photo count comparison** — flags significant differences in photo count
- **Price comparison** — calculates percentage price difference with actionable notes
- **Overall QC score** with an Excellent / Good / Fair / Poor rating
- **Exportable HTML report** for offline review or sharing with team members
- **Supports 4 OTA platforms**: Airbnb, Booking.com, VRBO, Expedia
- **Fully responsive** — works on desktop and tablet
- **No dependencies** — pure HTML, CSS, and JavaScript; no backend required

## Comparison Categories

| Category | What It Checks |
|---|---|
| **Property Name** | Text similarity between website and OTA listing names |
| **Description** | Word-overlap similarity + word count comparison |
| **Amenities** | Fuzzy-matched set difference (missing/extra/matched) |
| **House Rules** | Line-by-line fuzzy matching of rules |
| **Photo Count** | Numeric difference and percentage score |
| **Price per Night** | USD price comparison with % deviation |

## Score Interpretation

| Score | Rating | Meaning |
|---|---|---|
| 85–100% | ✅ Excellent | Content is consistent |
| 70–84% | 🟦 Good | Minor differences, review recommended |
| 50–69% | 🟡 Fair | Moderate differences, update suggested |
| 0–49% | 🔴 Poor | Significant inconsistencies, action required |

## Getting Started

### Option 1: Open Directly (Zero Setup)

1. Clone or download this repository
2. Open `index.html` in any modern web browser
3. No server or installation needed

```bash
git clone https://github.com/Tanvesh03/OTA-Content-QC-Comparator.git
cd OTA-Content-QC-Comparator
# Open index.html in your browser
```

### Option 2: GitHub Pages

Enable GitHub Pages in repository **Settings → Pages → Source: main branch** to access it as a live URL.

## How to Use

1. **Fill in Website Content** (left panel):
   - Enter your property name, description, amenities (comma-separated), house rules (one per line), photo count, and price per night

2. **Fill in OTA Content** (right panel):
   - Select your OTA platform from the dropdown
   - Enter the same fields from your OTA listing

3. **Click "Run QC Comparison"**:
   - Scores are calculated for each category
   - A detailed diff report is displayed below

4. **Review the Report**:
   - Green items are consistent across channels
   - Red items are missing from your OTA listing
   - Yellow items are extra on the OTA (not on your website)

5. **Export** (optional):
   - Click "Export Report" to download an HTML report file

## File Structure

```
OTA-Content-QC-Comparator/
├── index.html      # Main UI — input panels, results section
├── styles.css      # Dark theme, responsive layout, component styles
├── app.js          # Core comparison logic, scoring, rendering, export
└── README.md       # Documentation
```

## Technical Details

- **Similarity algorithm**: Jaccard-based word overlap (words > 2 chars)
- **Fuzzy matching threshold**: 75% for amenities, 65% for house rules
- **Price scoring**: 100% if ≤5% diff, 75% if ≤15%, 50% if ≤30%, 20% otherwise
- **Photo scoring**: Proportional to count difference vs maximum count
- **No external libraries** — vanilla JS, CSS custom properties, CSS Grid/Flexbox

## Browser Support

Works in all modern browsers: Chrome, Firefox, Edge, Safari.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
