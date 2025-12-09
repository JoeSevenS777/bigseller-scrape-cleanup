BigSeller CN→TW Auto-Formatter
Tampermonkey Userscript for Product Title Cleanup, Traditional Chinese Conversion, and Description Optimization
Overview

This userscript automates BigSeller’s product-editing page (抓取页面), performing three tasks in a single click:

Convert product titles from Simplified → Traditional Chinese (Taiwan)

Intelligently re-format Chinese titles through brand recognition, segmentation, and a large dictionary

Clean up product descriptions

Clear “Short Description”

Limit “Long Description” to the first 12 images

This improves listing efficiency, enforces consistent formatting, and reduces manual editing when preparing products for cross-border e-commerce platforms like Shopee/Lazada.

Features
1. Title Conversion

Uses OpenCC (cn2tw) to convert all Simplified Chinese to Traditional Chinese (Taiwan standard).

English brand detection:

Extracts leading A–Z / 0–9 / & -

Converts brand to uppercase

Removes internal brand spaces

Joins brand directly with the Chinese portion (no space)

2. Chinese Title Smart-Segmentation

The script includes a large Traditional Chinese cosmetic vocabulary to ensure product titles are split into meaningful chunks.

Key rules:

● Tokenization

Uses dictionary-based longest-match segmentation

Dictionary now includes >150 beauty-related words:

Categories (腮紅棒 / 假睫毛 / 遮瑕液 / 修容粉...)

Textures (啞光 / 絲絨 / 水光 / 柔霧...)

Marketing terms (元氣感 / 淡顏 / 不易暈染 / 不飛粉...)

Trend styling (貓精靈 / 魚尾 / 寬梗魚尾 / 山茶花 / 太陽花...)

Phrase patterns (懶人三部曲 / 分段式 / 淺色系 / 提亮棒...)

And newly added: 富家千金, 免膠免卸, 自黏

● Segmentation Rules

Chinese chunks must be 4–8 characters where possible

Category words must appear at the end of their block

If no valid segmentation is found → return original text

Numbers automatically merge:

10 + 色盤 → 10色盤

10 + 排免卸自 → 10排免卸自

● Example

Input:

SWEETMINT十色調色唇凍盤自然滋潤不易沾杯鏡面口紅唇釉10色盤


Output:

SWEETMINT十色調色唇凍盤 自然滋潤 不易沾杯 鏡面口紅唇釉 10色盤

3. Description Optimization
Short Description

Completely cleared

Ensures no leftover unwanted text from scraping

Long Description

Keeps only the first 12 images

Works for both:

contenteditable editors

iframe-based editors

How to Use
1. Install Tampermonkey

Chrome Web Store → search Tampermonkey

2. Create a New Script

Paste the entire script from this repository.

3. Open BigSeller’s Product Crawling Page
https://www.bigseller.pro/web/crawl/index.htm

4. Use Any of These Triggers
✔ Keyboard Shortcut
Alt + T

✔ Floating Button

A button appears on the page:

标题繁体 + 清短描 + 长描限12图

✔ Tampermonkey Menu
BigSeller 一键：标题繁体 + 清空短描述 + 长描述限12图

File Structure
bigSeller-cn2tw/
│
├── bigseller_cn2tw.user.js       # Main script (this repo’s core)
└── README.md                     # Documentation

Dictionary Expansion

You can freely expand the dictionary inside:

const WORD_DICT = [ ... ]


Adding industry-specific or brand-specific terms improves segmentation accuracy.
Every new term must be Traditional Chinese.

Example to add:

'新詞彙', '品牌名', '系列名', '質地名'

Known Limitations

Segmentation is optimized for beauty & cosmetics categories.

Cross-genre products may require dictionary expansion.

Multi-brand titles (rare) may follow unexpected patterns.

If you encounter incorrect segmentation, simply provide:

Original title (no spaces)

The ideal segmentation you want

I can update the dictionary or rules accordingly.

Version

v1.3

Large dictionary expansion

Added 自黏 / 免膠免卸 / 富家千金 / 太陽花 / 魚尾 / 寬梗魚尾 / 山茶花

Improved number + classifier merging

Improved category-end rule

General refinements in token and segmentation logic

License

MIT License
