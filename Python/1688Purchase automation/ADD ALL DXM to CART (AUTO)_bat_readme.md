# ADD ALL DXM to CART (AUTO).bat  
![automation](https://img.shields.io/badge/Automation-Batch%20Pipeline-blue)  
![status](https://img.shields.io/badge/Status-Stable-brightgreen)  
![safety](https://img.shields.io/badge/Safety-Fail--Safe-important)

---

## Overview

**ADD ALL DXM to CART (AUTO).bat** is a **fail-safe automation pipeline launcher** that connects:

1. **DXM order export & audit** (`dxm_export_and_audit.py`)
2. **1688 add-to-cart execution** (`add_to_cart_http_1688.py`)

It is designed to be **unattended, deterministic, and safe**, ensuring that **only pick lists generated in the current run** can ever be processed.

---

## Key Design Goals

- Zero manual confirmation during normal automation
- Absolute prevention of processing old pick lists
- Graceful exit when there is nothing to do
- Clear, auditable execution logic

This `.bat` file is intended to be the **single entry point** for daily operations.

---

## What This Script Does

1. Switches to the automation working directory
2. Records the **pipeline start time** (epoch seconds)
3. Runs `dxm_export_and_audit.py`
4. Verifies whether DXM produced a **new `.xlsx` pick list** during this run
5. **Only if a new pick list exists**:
   - Enables safe auto-confirm
   - Runs `add_to_cart_http_1688.py`
6. Otherwise:
   - Prints an info message
   - Exits without side effects

---

## Safety Mechanism (Core Logic)

All safety decisions are based on **file freshness**, not filenames.

The script compares:

- `PIPELINE_START_EPOCH` (captured before DXM runs)
- `LastWriteTime` of the newest `.xlsx` in `PICKLIST_FOLDER`

### Decision Table

| Condition | Result |
|--------|--------|
| No `.xlsx` exists | Exit |
| Latest `.xlsx` is older than pipeline start | Exit |
| Latest `.xlsx` is newer than pipeline start | Proceed |

This makes it **impossible** to accidentally process yesterday’s data.

---

## Required Folder Structure
D:\JoeProgramFiles\Automation
│
├─ ADD ALL DXM to CART (AUTO).bat
├─ dxm_export_and_audit.py
├─ add_to_cart_http_1688.py
│
└─ Batch_added_to_cart
├─ jianhuodan_*.xlsx
└─ Locate&Audit_UnprocessedOrders_InDXM
└─ *.xlsx

> `PICKLIST_FOLDER` **must** point to the DXM export directory.

---

## Environment Variables Used

| Variable | Description |
|------|-------------|
| `PIPELINE_START_EPOCH` | Pipeline start timestamp |
| `PICKLIST_FOLDER` | DXM export folder |
| `AUTO_CONFIRM_LATEST` | Enables safe auto-confirm |
| `AUTO_CONFIRM_WINDOW_SEC` | Optional freshness window |

---

## When add-to-cart Will NOT Run

- No orders to audit
- DXM exports nothing
- DXM encounters an error
- Pick list folder is empty
- Latest pick list is older than pipeline start

In all cases, the script exits **cleanly and safely**.

---

## How to Run

Simply double-click:
ADD ALL DXM to CART (AUTO).bat

No keyboard input is required.

---

## When NOT to Use This Script

Do **not** use this script if you need to:

- Manually select a pick list
- Test add-to-cart logic in isolation
- Debug DXM behavior step by step

Run the individual Python scripts instead.

---

## Design Philosophy

> **Fail-safe by default.**  
> If the script is not 100% sure, it does nothing.

This pipeline follows production-grade batch automation principles:
- Explicit guard conditions
- Time-based validation
- No hidden coupling between components

---

## Version History

### v1.0
- Initial automated DXM → 1688 pipeline
- Freshness-based safety gate
- Unattended execution support
