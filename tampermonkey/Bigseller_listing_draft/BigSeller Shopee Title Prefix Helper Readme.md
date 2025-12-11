BigSeller Shopee Title Prefix Helper

Automated Listing Workflow for Shopee Sellers on BigSeller

This userscript is a comprehensive automation tool designed to streamline Shopee listing preparation inside the BigSeller 编辑产品 page. It standardizes title prefixes, description templates, SKU formats, and variant naming — reducing repetitive manual work and ensuring consistent listing quality across multiple stores.

🚀 Features Overview
1. Store-Aware Title & Description Automation
Title Prefix

Automatically inserts the correct store-specific prefix.

Removes any existing old prefix (e.g., 🎀台灣現貨🎀, 💋台灣現貨💋, etc.).

Prevents duplicates and messy mixed-prefix cases.

Description Templates

Inserts store-matching description header + footer.

Cleans up old templates before applying the new one.

Supports:

<textarea>

CKEditor / Quill rich text editors

Editable <div> blocks

MD5 Auto Refresh

After applying prefix + description, the script automatically triggers BigSeller’s MD5 refresh button (.sell_md5) when available.

2. SKU Automation
(A) 合成 SKU — Parent SKU + Child SKU Formatting

Detects parent SKU.

Converts parent SKU from Traditional → Simplified Chinese (OpenCC fallback included).

Normalizes all variant SKUs into this format:

父SKU-子SKU


Removes weight suffixes (e.g., 5g, 10ml, -8G, etc.).

Avoids touching unrelated fields in the page.

(B) SKU 转繁体 — Variant Name Conversion

Automatically opens each variant name edit popup.

Normalizes formats such as:

CP365-01#蔷薇烟 → 01#薔薇煙


Converts simplified → traditional Chinese (OpenCC if available; fallback dictionary otherwise).

Automatically saves and closes each popup.

3. Title Fine-Tuning Tools

A dropdown offers instant micro-adjustments:

尾词调换 — swap last two title segments

學生黨平價

美妝化妝品

新品上市

These allow fast listing diversification and SEO tuning.

4. Floating Control Panel UI

A persistent panel appears at the bottom-right of BigSeller:

Displays:

Auto-detected shop name

Allows:

Store selection

Apply Title Prefix + Description + MD5

Title micro-tuning

合成SKU

SKU转繁体

The panel is self-correcting and will refresh shop detection during the first few seconds.

🔧 Technical Highlights
Robust DOM Targeting

The script is engineered to handle BigSeller’s frequently changing UI.

Multi-layered detection for:

Product Name (autoid="product_name_text")

Store selector components

Variant name buttons (shadow DOM / iframe-safe)

Description containers (textarea, iframe editors, Quill/CKEditor)

Chinese Conversion Engine

Uses OpenCC-JS via CDN.

Auto-fallback to internal Simplified ↔ Traditional dictionary if CDN fails.

Safety and Compatibility

Avoids touching unrelated inputs.

Includes timeouts, visibility checks, DOM traversal, and shadow-root support.

Compatible with dynamic page reloads.

📦 Installation
Prerequisites

Chrome or Edge

Tampermonkey extension

Steps

Install Tampermonkey.

Create a new userscript.

Paste the full script (.user.js) from this repository.

Save and reload any BigSeller Shopee 编辑产品 page.

🛠 Usage Workflow

Open BigSeller → Shopee 编辑产品页面

Wait for the floating panel to appear

Choose your store (auto-detected)

Click:

应用前缀+描述+MD5

合成SKU (if needed)

SKU转繁体 (for color/variant names)

Optional: select micro-tuning (尾词调换 / 學生黨平價 etc.)

📄 Version History
v0.95 (Current)

Added autoid="product_name_text" direct targeting (fixes product title not updating).

Improved SKU 合成 logic and prefix canonicalization.

Full shadow DOM + iframe scan for variant edit buttons.

More robust title detection algorithm.

OpenCC loading fallback refinements.

🤝 Contributions

This userscript is tailored for real BigSeller & Shopee seller workflow.
Issues, suggestions, and pull requests are welcome.
