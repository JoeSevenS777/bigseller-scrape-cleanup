# 1688 Image Scraper (Main / SKU / Details / Video)

A Chrome Extension (Manifest V3) for scraping and downloading **all usable product media from 1688 product detail pages**, with correct SKU logic, clean folder structure, optional video download, and a productivity-oriented popup UI.

---

## Core Features

- **Base folder named after the product title**
  - Never uses the shop name
  - Title is extracted from embedded JSON first, DOM as fallback

- **Automatic folder suffixing (no overwrite)**
  - `Product Title`
  - `Product Title_01`
  - `Product Title_02`
  - …

- **Structured output folders**
  - `main/` — main gallery images
  - `sku/` — SKU option images (ordered and named exactly as on page)
  - `details/` — description / 图文详情 images

- **Product video download**
  - Downloads only real video URLs (`mp4`, `webm`, `m3u8`, etc.)
  - Saved into the base folder as `video.xxx`
  - No placeholder files (no `video.htm`)

- **Minimum image size filter**
  - Default: **450px**
  - Images smaller than the threshold are skipped before download

- **Duplicate handling**
  - SKU images are authoritative
  - Any SKU image is removed from `main/`

- **SKU-name agnostic**
  - Works with `颜色分类`, `规格`, `外观`, `色号`, `尺寸`, etc.
  - Only the **first image-bearing SKU dimension** is used
  - Multi-dimension SKU combinations are intentionally ignored

---

## Folder Output Example

Gege bear 晶透钻光镜面唇釉水光显白不易沾杯女秋冬口红跨境彩妆/
main/
001.jpg
002.jpg
003.jpg
sku/
01_01#自然黑.jpg
02_02#自然棕.jpg
details/
001.jpg
002.jpg
003.jpg
video.mp4

---

## Installation (Developer Mode)

1. Move the extension folder to a **stable location**  
   (do NOT keep it in `Downloads`)

2. Open Chrome and go to:
chrome://extensions

3. Enable **Developer mode**

4. Click **Load unpacked**

5. Select the folder that directly contains `manifest.json`

---

## Usage

1. Open a 1688 product detail page  
(`https://detail.1688.com/offer/...`)

2. Click the extension icon

3. Set **Min size (px)**  
(default: 450)

4. Click **Scrape & Download**

5. Optional: click **Refresh Page** to reload the current tab

---

## Popup Buttons

- **Scrape & Download**
- Collects media from the current page
- Filters by size
- Downloads into structured folders

- **Refresh Page**
- Reloads the current active tab
- Does NOT reload the extension

---

## Architecture Overview

popup.html / popup.js
↓
service_worker.js (background orchestrator)
↓
content.js (page-context extractor)

---

## Core Logic Summary

### Product Title Resolution
Priority order:
1. Embedded page JSON (`offerTitle`, `subject`)
2. `og:title` meta tag
3. Product title DOM nodes
4. `document.title` fallback (sanitized)

### Main Images
- Extracted from gallery DOM and embedded JSON
- Thumbnail URLs upgraded to original resolution when possible

### SKU Images
- Parsed from embedded SKU metadata
- First SKU dimension containing images is selected
- Page order is preserved
- Filenames include index and SKU name

### Detail Images
- Extracted via:
  - `detailUrl` in embedded JSON
  - description iframe (`desc.htm`, `offer_desc.htm`)
  - HTML parsing of `<img>` URLs

### Video Handling
- Validates URLs strictly (no `blob:`, no HTML pages)
- Downloads only when a real video URL exists
- Skips video step silently if none exists

---

## Known Limitations

- Products without SKU images will have an empty `sku/` folder
- Some lazily loaded detail images may not resolve
- Multi-dimension SKU combinations are intentionally ignored

---

## Status

- Stable
- Production-ready
- Tested across cosmetics, tools, accessories, and mixed SKU types
