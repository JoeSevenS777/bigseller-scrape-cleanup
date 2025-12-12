# Global Configuration Module (config.py)
[![Python](https://img.shields.io/badge/Python-3.10+-blue)]()
[![Config](https://img.shields.io/badge/Module-Configuration-lightgrey)]()
[![Status](https://img.shields.io/badge/Status-Stable-green)]()

This module centralizes all configuration values for the 1688 Automation System, including directory paths, cookie locations, behavioral toggles, and HTTP settings.  
It is imported by every major script in the project and acts as the single source of truth for the entire pipeline.

---

## Purpose

The configuration file provides:

- Consistent directory paths shared by all modules  
- One place to modify cookie paths  
- Switches to enable/disable major behaviors  
- Shared constants and HTTP headers  
- Environment portability (no hard-coded local paths inside scripts)

Updating this file updates the behavior of all automation modules immediately.

---

## Configuration Overview

The following categories are defined in config.py:

### 1. Base Paths

These paths are generated dynamically based on the location of config.py:

    SCRIPT_DIR        → folder containing config.py  
    BASE_DIR          → treated as project root  
    PICKLIST_FOLDER   → DXM picklist export directory  
    SCRAPE_FOLDER     → 1688 scraper output directory  
    MAPPING_PATH      → global Mapping_Data.xlsx file  

These paths ensure the project remains portable across machines.

---

### 2. Cookie Paths

    Cookies/ali_cookie.txt  
    Cookies/dxm_cookie.txt  

These files store raw session cookies used to authenticate:

- 1688 HTTP requests  
- Dianxiaomi (DXM) API requests  

Scripts read these files automatically without needing browser automation.

---

### 3. Behavior Toggles

| Variable | Meaning |
|---------|---------|
| DRY_RUN | Prevents scripts from performing irreversible actions |
| ENABLE_AUDIT | Controls DXM batchAudit.json execution |
| ENABLE_ADD_TO_CART | Enables add-to-cart operation |
| ENABLE_ID_SCRAPE | Enables 1688 ID scraping |

These toggles allow safe testing and controlled execution.

Example:

    DRY_RUN = True
    ENABLE_ADD_TO_CART = False

This prevents both DXM audit and 1688 cart operations while still generating exports.

---

### 4. HTTP Settings

The shared User-Agent:

    USER_AGENT = "Mozilla/5.0 ... Chrome/142.0.0.0 Safari/537.36"

And default request timeout:

    TIMEOUT = 20

These values ensure consistent network behavior across modules.

---

### 5. Shared Constants

The STATUS_PRIORITY dictionary assigns processing priority levels to scraper/cart results:

| Key | Meaning |
|-----|---------|
| FAILED_SPEC_ID_EMPTY | Missing specId |
| FAILED_OTHER | Generic failure |
| UNKNOWN | No classification |
| SUCCESS_MISMATCH | Successful but mismatched |
| SUCCESS_UNCHECKED | Successful, unverified |
| SUCCESS | Fully successful |
| FAILED_BEIHUO | Supplier backorder |

These constants are used for result sorting and reporting.

---

## How Scripts Use This File

Every major automation module imports config.py:

    from config import PICKLIST_FOLDER, MAPPING_PATH, ENABLE_AUDIT

This eliminates path duplication and prevents inconsistencies.

Changing any variable here instantly updates:

- DXM exporter / auditor  
- 1688 scraper  
- Mapping updater  
- Add-to-cart module  

---

## When You Should Edit config.py

- To change folder locations  
- To update cookie storage paths  
- To enable/disable features (audit, scrape, add-to-cart)  
- To modify HTTP headers for anti-bot handling  
- To tune priorities for result classification  

Because this file affects the entire automation system, edits should be intentional and documented.

---

## Example Edits

Enable add-to-cart only:

    ENABLE_AUDIT = False
    ENABLE_ADD_TO_CART = True

Run non-destructive tests:

    DRY_RUN = True

Relocate mapping file:

    MAPPING_PATH = "D:/Data/Mappings/Mapping_Data.xlsx"

---

## Summary

config.py is the heart of the automation system.  
It ensures:

- Consistency  
- Maintainability  
- Reusability  
- Portability  

A clear, dedicated README preserves long-term usability and reduces debugging time.

