# Nobel Prize Explorer

**Discover 1,026 Nobel laureates - search, filter, explore by map, timeline, and quiz. Works offline.**

![Nobel Prize Explorer](https://img.shields.io/badge/laureates-1%2C026-gold) ![Pure HTML/CSS/JS](https://img.shields.io/badge/tech-HTML%2FCSS%2FJS-blue) ![License](https://img.shields.io/badge/license-MIT-green)

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

The dataset (`nobel_data.js`) contains all 1,026 Nobel laureates with:
- Name, category, year, country, gender
- Birth/death dates, motivation text
- Affiliations at time of award
- Prize share (full, half, shared)

Data is loaded as a static JavaScript array - no network requests, instant filtering.

## Tech Stack

- **HTML/CSS** - CSS custom properties for theming, responsive grid layout
- **Vanilla JavaScript** - No frameworks, no dependencies
- **Canvas API** - Chart rendering for trends and distributions
- **URL Hash State** - All filters persisted in the URL for sharing

## License

MIT - see [LICENSE](LICENSE)
