# BigSeller Shopee Title Prefix Helper

Automated listing workflow for Shopee sellers on **BigSeller 编辑产品**.

This userscript streamlines Shopee listing preparation inside BigSeller by standardizing:

- Title prefixes  
- Description templates  
- SKU formats  
- Variant naming  
- MD5 refresh

It reduces repetitive manual work and keeps listings consistent across multiple stores.

---

## ✨ Features Overview

### 1. Store-Aware Title & Description Automation

#### Title Prefix

- Automatically inserts the correct **store-specific** title prefix.
- Removes any existing old prefix (e.g. `🎀台灣現貨🎀`, `💋台灣現貨💋`, `💄台灣現貨💄`).
- Prevents duplicate or mixed prefixes.

#### Description Templates

- Inserts **description header + footer** based on the selected store.
- Cleans up old templates before applying the new one.
- Supports:
  - `<textarea>` description boxes
  - CKEditor / Quill / rich-text editors (iframe or div-based)
  - Plain contenteditable blocks

#### MD5 Auto Refresh

After applying prefix + description, the script automatically clicks BigSeller’s `.sell_md5` button (if present) to refresh the MD5 checksum.

---

### 2. SKU Automation

#### A. 合成 SKU（Parent + Child）

- Detects **parent SKU** field (`autoid="parent_sku_text"` and other fallbacks).
- Converts parent SKU from **Traditional → Simplified Chinese** via OpenCC (with internal fallback map).
- Normalizes all variant SKUs inside the sale info section to:

```text
父SKU-子SKU
Strips weight suffixes such as:

text
Copy code
5g, 10g, 30ml, 100ML, -8G, -5ml …
Avoids interfering with unrelated fields.

B. SKU 转繁体（Variant Name Conversion）
Locates variant name edit buttons (including shadow DOM + iframe cases).

Opens each popup, reads the variant name, and converts Simplified → Traditional.

Smart parsing of codes like:

text
Copy code
CP365-01#蔷薇烟  →  01#薔薇煙
Saves automatically and closes the popup.

Uses OpenCC when available; falls back to a small internal mapping.

3. Title Fine-Tuning Tools
A dropdown in the floating panel provides instant title adjustments:

尾词调换 – swaps the last two segments of the title.

學生黨平價

美妝化妝品

新品上市

These are appended to the end of the title (after the prefix) and help create small variants for SEO / A/B testing.

4. Floating Control Panel (UI)
A floating panel appears at the bottom-right of BigSeller:

Shows: current detected store name (店铺：XXX)

Store selection dropdown (overrides auto-detected shop)

Buttons:

应用前缀+描述+MD5

Title micro-tuning dropdown (標題微調選項)

合成SKU

SKU转繁体

The panel periodically re-checks the store name for a few seconds after load to follow BigSeller’s dynamic rendering.

🧠 Internals & Logic Highlights
DOM Detection
Product Name (title):

Directly targets input[autoid="product_name_text"].

Falls back to label/placeholder/position heuristics if needed.

Store selector:

Finds the store display around div[autoid="store_button"] and Ant Design select components.

Falls back to label-based search on “店铺”.

Description field:

Supports <textarea>, CKEditor iframes, Quill .ql-editor, and other BigSeller containers.

Safely extracts existing middle content (especially images) and wraps it with header/footer.

Variant name popups:

Scans main document, same-origin iframes, and open shadowRoots.

Finds pencil/edit icons and their associated <textarea> popups.

Chinese Conversion
Uses OpenCC-JS (full UMD build) via CDN:

cn → tw converter for Simplified → Traditional

tw → cn converter for Traditional → Simplified

If CDN fails, falls back to a small internal mapping dictionary.

Safety & Compatibility
Skips fields with empty values.

Detects SKU fields using attributes and surrounding “SKU” labels to avoid affecting other inputs.

Includes timeouts and retry logic for dynamic rendering.

Works alongside BigSeller’s existing UI without modifying original scripts.

🔧 Installation
Requirements
Chrome or Edge browser

Tampermonkey (or compatible userscript manager)

Steps
Install Tampermonkey in your browser.

Create a new userscript.

Copy the contents of BigSeller Shopee Title Prefix Helper-0.95.user.js from this repository and paste into the editor.

Save the script.

Open or refresh any BigSeller Shopee 编辑产品 page:

text
Copy code
https://www.bigseller.pro/web/listing/shopee/edit/*
🧭 Usage Workflow
Open BigSeller → Shopee 编辑产品页面 for a listing.

Wait for the floating panel “标题前缀助手” to appear in the bottom-right.

Check the detected store name:

If correct, do nothing.

If incorrect, select the correct store from the dropdown.

Click:

应用前缀+描述+MD5

Standardizes the title prefix.

Applies store-specific description header/footer.

Refreshes MD5.

合成SKU

Converts parent SKU to Simplified.

Rewrites all variant SKUs to 父SKU-子SKU.

SKU转繁体

Opens each variant-name popup and converts to Traditional.

Optional: choose an entry in 標題微調選項 to tweak the tail of the title.

📝 Version History
v0.95
Added direct targeting of product title via autoid="product_name_text".

Fixed SKU转繁体 for BigSeller’s new DOM (including shadow DOM + iframe).

Improved SKU合成逻辑 with accurate SKU field detection and parent-SKU canonicalization to Simplified.

Hardened title detection and description field detection.

Switched OpenCC to full.js bundle and added robust fallback handling.

🤝 Contributing
This userscript is built around real-world Shopee + BigSeller workflow.

Issues and feature requests are welcome (edge cases, new store configs, UI changes).

Pull requests for new features or DOM fixes are appreciated.

makefile
Copy code
::contentReference[oaicite:0]{index=0}
