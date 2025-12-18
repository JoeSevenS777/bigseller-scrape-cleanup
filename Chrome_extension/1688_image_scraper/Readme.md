# 1688 Image Scraper (Main / SKU / Details / Video)

A Chrome Extension (Manifest V3) designed to scrape and download all product media from **1688 product detail pages**, with correct SKU handling, clean folder structure, and optional video support.

---

## Core Capabilities

- Base folder is named **strictly after the product title** (never the shop name)
- Automatic suffixing if the same title already exists:
  - `Product Title`
  - `Product Title_01`
  - `Product Title_02`
- Subfolder structure:
  - `main/` — main gallery images
  - `sku/` — SKU option images (ordered and named as on page)
  - `details/` — description / detail images
- Product video (if present) is downloaded into the **base folder**
- Minimum image size filter (default **450px**)
- Duplicate removal between `main/` and `sku/` (SKU images take priority)
- Spec-name agnostic SKU parsing:
  - Works with `颜色分类`, `规格`, `外观`, `色号`, `尺寸`, etc.
- Non-combinatorial SKU logic:
  - Only the **first image-bearing SKU dimension** is used

---

## Folder Output Example

```
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
```

---

## Installation (Developer Mode)

1. Download and unzip the extension folder
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the extension folder

---

## Usage

1. Open a 1688 product detail page
2. Click the extension icon
3. Set the minimum image size (default 450)
4. Click **Scrape & Download**
5. Assets will be downloaded to your Chrome download directory

---

## Architecture Overview

```
popup.html / popup.js
        ↓
service_worker.js   (background orchestrator)
        ↓
content.js          (page-context extractor)
```

- **popup.js**
  - User interface
  - Sends scrape command
  - Displays progress logs

- **content.js**
  - Runs inside page context
  - Extracts:
    - product title
    - main images
    - SKU images
    - detail images
    - video URL (if any)
  - JSON-first strategy with DOM fallback

- **service_worker.js**
  - Applies size filtering
  - Deduplicates images (SKU > main)
  - Resolves base folder naming + suffixing
  - Executes downloads via `chrome.downloads.download`

---

## Core Logic Summary

### Product Title Resolution
Priority order:
1. Embedded page JSON (`offerTitle`, `subject`, etc.)
2. `og:title` meta tag
3. Product title DOM nodes
4. `document.title` fallback (sanitized)

### SKU Image Logic
- Parses SKU metadata from embedded JSON
- Identifies the **first SKU dimension containing images**
- Preserves on-page order
- Ignores all other dimensions intentionally

### Video Handling
- Detects real video URLs only (`mp4`, `webm`, `m3u8`)
- Ignores `blob:` and HTML URLs
- If no valid video exists, **nothing is downloaded**
- Prevents creation of `video.htm` or placeholder files

---

## Known Limitations

- Products without SKU images will have an empty `sku/` folder
- Lazily-loaded detail images may not always resolve
- Multi-dimension SKU combinations are intentionally ignored

---

## Status

- Stable
- Production-ready
- Tested across cosmetics, tools, accessories, and mixed SKU types
