# 1688 Automation Suite – DXM & 1688 HTTP Automation

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![Status](https://img.shields.io/badge/Status-Production-green)
![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey)
![Automation](https://img.shields.io/badge/Automation-DXM→1688-success)
![License](https://img.shields.io/badge/License-Private-important)

A modular automation toolkit for Dianxiaomi (DXM) and 1688, covering the full workflow from DXM 拣货单导出 → Mapping 数据维护 → 1688 加购 — all via pure HTTP, no Selenium.

---

## 🚀 Key Features

- End-to-end DXM → 1688 automation
- Fast, browserless, stable HTTP workflow
- Automatic Mapping_Data maintenance
- Automatic 1688 加购 via official endpoints
- Complete DXM export & batch audit engine
- Case-insensitive SKU mapping (robust)
- DRY-RUN safety mode via config.py

---

## 🧩 Modules Overview

| Module | Function |
|--------|----------|
| config.py | Central configuration file |
| scrape_1688_http.py | Scrapes 1688 Spec ID / SKU / 店铺名称 |
| update_mapping_from_scrape.py | Maintains Mapping_Data.xlsx |
| dxm_export_and_audit.py | Exports DXM picklists + auditing |
| add_to_cart_http_1688.py | Maps SKUs and performs 1688 加购 |

---

## 🧱 System Architecture

    DXM Pending Orders
        │
        ├── dxm_export_and_audit.py
        │       └── Export & summarize picklist
        │
    1688 商品链接
        │
        ├── scrape_1688_http.py
        │       └── Extract Spec ID, 属性SKU, 店铺信息
        │
        ├── update_mapping_from_scrape.py
        │       └── Update Mapping_Data.xlsx
        │
    DXM Picklist → Batch_added_to_cart
        │
        └── add_to_cart_http_1688.py
                ├── SKU → 1688 字段映射
                ├── Send Add-to-Cart HTTP requests
                └── Generate (done).xlsx + archive

---

## ⚙️ config.py — Central Configuration

Defines all paths and behavior switches:

- PICKLIST_FOLDER
- SCRAPE_FOLDER
- MAPPING_PATH
- ALI_COOKIE_PATH / DXM_COOKIE_PATH
- DRY_RUN
- ENABLE_AUDIT
- ENABLE_ADD_TO_CART
- ENABLE_ID_SCRAPE
- USER_AGENT
- TIMEOUT

All modules load their configuration from here.

---

## 🕸 scrape_1688_http.py — 1688 Product Scraper

Scrapes 1688 product pages and extracts:

- 商品链接
- 商品ID (offerId)
- Spec ID
- 属性SKU
- 店铺名称

Highlights:

- Robust parsing via brace-matched JSON extraction
- Writes raw HTML snapshots when parsing fails
- Produces normalized scraped(done).xlsx files

Usage:

    python scrape_1688_http.py

Place Excel with 商品链接 under ID_Scrape/.

---

## 🧬 update_mapping_from_scrape.py — Mapping_Data Updater

Maintains Mapping_Data.xlsx by:

- Inferring 商品選項貨號 prefixes from samples
- Filling missing option codes
- Appending new mappings without duplicates
- Keeping the Excel view on the newest rows

Usage:

    python update_mapping_from_scrape.py

Outputs:

- Updated Mapping_Data.xlsx
- Updated B(done).xlsx

---

## 📦 dxm_export_and_audit.py — DXM Export & Audit Engine

Two modes:

### Mode 1 — Export all pending orders

    python dxm_export_and_audit.py
    # Choose “1”

- Fetches all 待审核 orders
- Creates DXM export tasks
- Downloads picklists
- Summarizes SKU quantities
- Optionally audits packages

### Mode 2 — Export from custom order workbook

    python dxm_export_and_audit.py
    # Choose “2”

Reads order IDs from ORDER_IDS_DIR and exports only related pending packages.

DRY_RUN = True prevents auditing but still exports.

---

## 🛒 add_to_cart_http_1688.py — 1688 Add-to-Cart Engine

Final stage: converting DXM picklists into 1688 add-to-cart operations.

### Workflow

1. Detect latest .xlsx in Batch_added_to_cart  
2. Apply Mapping_Data.xlsx (case-insensitive SKU matching)  
3. Validate Spec ID / 数量  
4. Skip 备货 rows  
5. Build HTTP payload for 1688 Add-to-Cart API  
6. Submit request (or DRY RUN)  
7. Sort results:
       0 = FAILED (Spec ID empty)
       1 = FAILED (other)
       2 = UNKNOWN / DRY_RUN
       3 = SUCCESS
       4 = FAILED (备货)
8. Save “(done).xlsx”  
9. Move source + done file to Finished_added_to_cart  
10. Ask user whether to open result

### CLI

    python add_to_cart_http_1688.py
    python add_to_cart_http_1688.py consign
    python add_to_cart_http_1688.py daifa
    python add_to_cart_http_1688.py 代发

---

## 📁 Recommended Folder Structure

    AutomationRoot/
    ├── config.py
    ├── Mapping_Data/
    │     └── Mapping_Data.xlsx
    ├── Batch_added_to_cart/
    │     └── Finished_added_to_cart/
    ├── ID_Scrape/
    │     └── debug_html/
    ├── Cookies/
    │     ├── ali_cookie.txt
    │     └── dxm_cookie.txt
    ├── scrape_1688_http.py
    ├── update_mapping_from_scrape.py
    ├── dxm_export_and_audit.py
    └── add_to_cart_http_1688.py

---

## 🔧 Requirements

- Python 3.10+
- Install packages:

      pip install pandas requests openpyxl

- Cookies:
  - ali_cookie.txt or env ALI_COOKIE
  - dxm_cookie.txt or env DXM_COOKIE

---

## ⚠️ Disclaimer

This system uses authenticated HTTP requests to interact with 1688 and Dianxiaomi APIs.  
Use it only on accounts you own, and comply with all platform rules and local regulations.

---
