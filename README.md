# Nobel Prize Explorer

**Discover Nobel laureates through 2026 - search, filter, explore by map, timeline, and quiz. Works offline.**

![Nobel Prize Explorer](https://img.shields.io/badge/awards-through_2026-gold) ![Pure HTML/CSS/JS](https://img.shields.io/badge/tech-HTML%2FCSS%2FJS-blue) ![License](https://img.shields.io/badge/license-MIT-green)

A fast, single-page explorer for the complete Nobel Prize dataset. No frameworks, no build step, no API calls - everything runs in the browser and works fully offline after first load.

## Features

| Feature | Detail |
|---|---|
| **Search** | Instant full-text search across all laureates |
| **Filters** | By category, year range, country, and gender |
| **Timeline** | Interactive decade-by-decade exploration |
| **World Map** | Geographic distribution with country chart |
| **Quiz Mode** | Test your Nobel knowledge with auto-generated questions |
| **Stories** | Curated stories about notable laureates |
| **Trends** | Gender balance over time, category by decade charts |
| **Dark Mode** | Light/dark theme toggle, respects system preference |
| **Offline** | Zero server dependencies - full PWA after first load |
| **Shareable** | Copy share link with current filter state in URL hash |

## Quick Start

```bash
git clone https://github.com/SahirVhora/nobel-explorer.git
cd nobel-explorer
open index.html  # or double-click in your file manager
```

No server, no install, no build step. Just open the file.

## Data

The dataset (`nobel_data.js`) includes Nobel laureates through 2026 with:
- Name, category, year, country, gender
- Birth/death dates, motivation text
- Affiliations at time of award
- Prize share (full, half, shared)

Data is loaded as a static JavaScript array - no network requests, instant filtering.

### Updating award data

The 2026 additions were imported from the [official Nobel Prize API](https://api.nobelprize.org/v1/laureate.json) on 9 November 2026: ten laureates across all six categories, including Economic Sciences. Names, dates, countries, motivations, affiliations and prize shares follow the API. Unknown date components remain `00`.

To add an award year (requires Python 3 and an internet connection):

```bash
python3 scripts/update-laureates.py 2026
```

The importer preserves existing records and skips award records already present. The browser continues to load the static data offline.

## Tech Stack

- **HTML/CSS** - CSS custom properties for theming, responsive grid layout
- **Vanilla JavaScript** - No frameworks, no dependencies
- **Canvas API** - Chart rendering for trends and distributions
- **URL Hash State** - All filters persisted in the URL for sharing

## License

MIT - see [LICENSE](LICENSE)

---

## More free learning tools

- [StarLearn](https://sahirvhora.github.io/starlearn/) - Free UK primary learning platform - Years 4-6, 494 topics
- [Year 4 Prep](https://sahirvhora.github.io/year4-prep/) - Free Year 4 SATs practice papers - 36 PDFs, updated weekly
- [Worksheet Generator](https://sahirvhora.github.io/worksheet-generator/) - Printable SATs-style worksheets - KS1/KS2 Maths, Reading, SPaG
- [PassMate UK](https://sahirvhora.github.io/passmate-uk/) - Free UK car theory test practice - 304 questions, works offline
- [11+ Prep](https://sahirvhora.github.io/11plus-prep/) - Free 11+ exam practice - region-specific papers
