# 1688 Image Scraper (Main / SKU / Details)

A Chrome (MV3) extension for 1688 product detail pages that downloads product assets into a clean, structured folder layout.  
This version is intentionally simple, stable, and deterministic, based strictly on a proven working logic.

---

## Features

- Folder named after product title (not supplier name)
- Downloads images into:
  - main/ – main gallery images
  - sku/ – SKU / variant images (if provided by the page)
  - details/ – long description (图文详情) images
- Downloads product video (if present) into the base folder
- Filters images by minimum resolution (default ≥ 500 × 500)
- Supports .jpg / .png / .webp (no forced conversion)
- Avoids duplicate and thumbnail-only images
- No auto-clicking, no guessing, no aggressive heuristics

---

## Output Structure

Product Title/
- main/
  - 001.jpg
  - 002.webp
  - ...
- sku/
  - 001.jpg
  - ...
- details/
  - 001.jpg
  - ...
- video.mp4   (if available)

---

## Installation

1. Download and unzip the extension
2. Open Chrome and go to:
   chrome://extensions
3. Enable Developer mode
4. Click Load unpacked
5. Select the unzipped extension folder
6. Open a detail.1688.com/offer/... product page
7. Click the extension → Scrape & Download

---

## Core Logic (How It Works)

### 1. Product Title Detection (Folder Name)

The extension determines the product title using priority-based extraction:

1. Embedded page data (offerTitle / subject inside script tags)
2. meta property="og:title"
3. h1 title element
4. document.title (with “- 阿里巴巴” removed)

Supplier / shop names are intentionally avoided using keyword filtering  
(e.g. 公司, 选品中心, 旗舰店, 商行, 工厂).

---

### 2. Details Images (图文详情) — Key Mechanism

Modern 1688 pages do not load detail images directly into the DOM.

Instead, the page embeds a field similar to:

"detailUrl": "https://itemcdn.tmall.com/1688offer/xxxx.html"

Process:

1. Scan inline script blocks
2. Extract the embedded detailUrl
3. Fetch that HTML directly
4. Parse all img tags inside it
5. Filter images by actual rendered size

This is the core reason this extension reliably downloads details images.

---

### 3. Main Images

- Collects image URLs from:
  - gallery / swiper / carousel sections
  - visible img tags on the offer page
- Normalizes URLs to remove thumbnail suffixes
- Filters by real image dimensions
- Excludes any image already classified as a detail image

---

### 4. SKU Images

- Collects images from SKU / variant areas:
  - elements containing sku, prop, variant, data-sku-id
- Filters by size
- If a product does not provide SKU-specific images, sku/ remains empty

This extension does not auto-click SKUs.  
Only images explicitly provided by the page are downloaded.

---

### 5. Product Video

The extension attempts to find a product demo video via:

1. video / source DOM elements
2. Embedded JSON fields such as:
   - videoUrl
   - wirelessVideo.videoUrls
3. Direct media URLs:
   - .mp4, .m3u8, .webm, .mov

If found:
- Saved as video.mp4 (or matching extension)
- Placed in the base product folder

---

### 6. Image Size Filtering

- Images are actually loaded using JavaScript Image objects
- Dimensions checked via naturalWidth / naturalHeight
- Any image smaller than the configured minimum is skipped
- Prevents downloading thumbnails, placeholders, and UI icons

---

## Configuration

- Min size (px): default 500  
  Applies to both width and height
- Configurable from the popup UI

---

## Design Principles

- Use real page data, not guesses
- Prefer embedded URLs over network sniffing
- No XHR / fetch hooking
- No frame enumeration
- No SKU auto-click simulation
- No speculative parsing

This keeps the extension stable, predictable, and easy to maintain.

---

## Notes

- Some products genuinely have no SKU images
- Some products genuinely have no video
- This extension reflects exactly what the seller provides

---

## License / Usage

For personal and internal business use.  
Respect 1688 / Alibaba terms and applicable local laws.

---

## Acknowledgement

Built by iterating against real 1688 page behavior, not assumptions.  
Optimized for reliability over cleverness.
