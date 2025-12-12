# 1688 Automation Suite  
Unified HTTP-Based Workflow for Scraping, Mapping, Cart Automation, and DXM Export

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows-yellow.svg)]()
[![Status](https://img.shields.io/badge/Mode-Production-green.svg)]()
[![License](https://img.shields.io/badge/License-Private-red.svg)]()

This repository contains a fully automated, modularized 1688 procurement workflow.  
It replaces Selenium with pure HTTP scraping, unifies configuration in `config.py`, and builds
a pipeline that flows from:

1. **1688 ID & SKU Scraping**  
2. **Mapping Code Maintenance**  
3. **Automated Add-to-Cart Execution**  
4. **DXM Exporting & Auditing**

The suite is designed for high-volume cross-border e-commerce operations requiring  
speed, reliability, and traceability.

---

## Table of Contents
- Overview
- Folder Structure
- Global Configuration
- Module Summaries
- Workflow: End-to-End Pipeline
- Example Usage
- Troubleshooting
- File Citations

---

## 1. Overview

This automation suite turns disjointed operational tasks (ID extraction, SKU mapping,
1688 cart automation, DXM order export, etc.) into a consistent, reproducible pipeline.

Key capabilities:

- **HTTP-only scraping** (fast, stable, Selenium-free)  
- **SKU & Spec-ID extraction** from 1688 pages  
- **Centralized config & cookie loading**  
- **Mapping auto-append with conflict prevention**  
- **Smart automated add-to-cart** with error handling  
- **DXM export & batch-audit automation**  

All paths, cookies, and feature toggles are controlled via `config.py`.

---

## 2. Folder Structure

Indented layout for GitHub safety:

    /ProjectRoot
        config.py
        ID_Scrape/
            scrape_1688_http.py
            update_mapping_from_scrape.py
        Batch_added_to_cart/
            add_to_cart_http_1688.py
            Finished_added_to_cart/
        Locate&Audit_UnprocessedOrders_InDXM/
        dxm_export_and_audit.py
        Mapping_Data/
            Mapping_Data.xlsx
        Cookies/
            ali_cookie.txt
            dxm_cookie.txt

---

## 3. Global Configuration (config.py)

All scripts import configuration from a single source.  
Fields include:

- Base folders  
- Cookie paths  
- Script toggles (`ENABLE_ADD_TO_CART`, `ENABLE_ID_SCRAPE`, etc.)
- HTTP settings (`USER_AGENT`, `TIMEOUT`)

Example configuration reference:

    BASE_DIR = SCRIPT_DIR
    SCRAPE_FOLDER = BASE_DIR + "/ID_Scrape"
    ALI_COOKIE_PATH = BASE_DIR + "/Cookies/ali_cookie.txt"
    USER_AGENT = "Mozilla/5.0 ..."
    TIMEOUT = 20

Full source: :contentReference[oaicite:1]{index=1}

---

## 4. Module Summaries

### 4.1 scrape_1688_http.py — Pure HTTP Scraper  
Extracts 1688 product metadata (SKU, Spec-ID, SKU-ID, shop name).  
Automatically loads cookies and saves debug HTML for diagnostics.

Primary outputs:

- 商品链接  
- 商品ID  
- 属性SKU  
- SKU ID  
- Spec ID  
- 店铺名称  

Scraper logic reference: :contentReference[oaicite:2]{index=2}

---

### 4.2 update_mapping_from_scrape.py — Mapping Maintenance  
Processes the scraper output `(done).xlsx` to:

- Auto-fill 商品選項貨號 based on SKU patterns  
- Append new mappings to `Mapping_Data.xlsx`  
- Prevent duplication  
- Auto-scroll Excel view to new rows  

Mapping logic reference: :contentReference[oaicite:3]{index=3}

---

### 4.3 add_to_cart_http_1688.py — Automated 1688 Add-to-Cart  
Uses pure HTTP POST to add items to the 1688 cart.  
Supports:

- DXM picklist mapping  
- Spec-ID validation  
- Quantity parsing  
- Error categorization  
- Human-like delays  
- Full status output and sorting  

Add-to-cart logic reference: :contentReference[oaicite:4]{index=4}

---

### 4.4 dxm_export_and_audit.py — DXM Export & Batch Audit  
Supports two modes:

1. Export all pending orders  
2. Export using a manually provided order list (Excel)

Then optionally performs **DXM batch audit** via HTTP.

DXM export logic reference: :contentReference[oaicite:5]{index=5}

---

## 5. Workflow: End-to-End Pipeline

### Step 1 — Scrape 1688 Product Data  
Run:

    python scrape_1688_http.py

Output saved as:

    <original>_scraped.xlsx  →  <original>(done).xlsx

### Step 2 — Update Mapping Table

    python update_mapping_from_scrape.py

Actions:

- Auto-fill 商品選項貨號  
- Append missing SKU mappings  
- Open updated Excel files  

### Step 3 — DXM Picklist Conversion & Add-to-Cart

    python add_to_cart_http_1688.py

Actions:

- Map SKUs using Mapping_Data  
- Validate all required fields  
- Add to 1688 cart via HTTP  
- Produce `(done).xlsx` sorted by error/success  

### Step 4 — Optional: DXM Export + Auto-Audit

Mode 1 (all pending):

    python dxm_export_and_audit.py

Mode 2 (from workbook):

    python dxm_export_and_audit.py 2

Outputs downloaded picklists and performs batch audit.

---

## 6. Example Usage

### Scraping Example

    # Input Excel must contain "商品链接"
    python scrape_1688_http.py

### Mapping Example

    python update_mapping_from_scrape.py

### Add to Cart Example

    python add_to_cart_http_1688.py

### DXM Export Example

    python dxm_export_and_audit.py 1

---

## 7. Troubleshooting

| Issue | Cause | Fix |
|------|-------|------|
| Cookie errors | Missing ali_cookie.txt / dxm_cookie.txt | Place cookie in /Cookies/ or set environment variable |
| Empty SKU results | 1688 returned anti-scraping HTML | Refresh cookie, retry |
| Spec-ID missing | 1688 variant not found | Re-inspect raw debug HTML in debug_html folder |
| Mapping conflicts | Duplicate 商品選項貨號 | Script prevents duplicates; verify Mapping_Data.xlsx |

---

## 8. File Citations

- `scrape_1688_http.py` source: :contentReference[oaicite:6]{index=6}  
- `config.py` source: :contentReference[oaicite:7]{index=7}  
- `update_mapping_from_scrape.py` source: :contentReference[oaicite:8]{index=8}  
- `add_to_cart_http_1688.py` source: :contentReference[oaicite:9]{index=9}  
- `dxm_export_and_audit.py` source: :contentReference[oaicite:10]{index=10}  

---

## License

This repository is **private** and all automation logic is proprietary.

