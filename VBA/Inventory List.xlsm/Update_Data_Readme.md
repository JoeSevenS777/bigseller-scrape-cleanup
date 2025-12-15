# UpdateInventoryNEW – Automated Inventory Synchronization

Reliable, header-aware, language-flexible stock updating for Excel

![Excel](https://img.shields.io/badge/Excel-Automation-217346?style=for-the-badge\&logo=microsoft-excel\&logoColor=white)
![VBA](https://img.shields.io/badge/Language-VBA-yellow?style=for-the-badge)
![Inventory](https://img.shields.io/badge/Feature-Inventory%20Sync-blue?style=for-the-badge)
![SKU](https://img.shields.io/badge/SKU-Matching-orange?style=for-the-badge)
![Data](https://img.shields.io/badge/Source-English%20%2F%20Chinese-success?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Stable-brightgreen?style=for-the-badge)

---

An advanced VBA macro that automatically updates your **Inventory List** by synchronizing data from the latest stock workbook (English or Chinese).

This script supports:

* Header detection in **both English & Chinese**
* SKU-based matching
* Auto-cleaning old values
* Protection-aware worksheet handling
* Fast performance via dictionary lookups
* **Forced Available Stock offset (−10,000, no exemptions)**
* Multi-sheet updating
* One-click UI button

---

## ✨ What This Script Does

### 1. Locates the newest inventory data file

Searches the configured folder for the most recently modified file:

* `Inventory_List*.xlsx`
* `库存清单*.xlsx`

The file is opened safely in **read-only mode**.

---

### 2. Detects headers automatically (fuzzy matching)

Understands both English and Chinese header names:

| Field           | English Header                                  | Chinese Header |
| --------------- | ----------------------------------------------- | -------------- |
| SKU             | SKU Name                                        | SKU编号          |
| Available       | Available for whole warehouse / Available Stock | 整仓可用           |
| On the Way      | On the Way                                      | 在途中            |
| Order Allocated | Order Allocated                                 | 订单已锁           |
| Daily Sales     | Forecasted Daily Sales                          | 预测日销量          |

The script normalizes headers and ignores spaces, punctuation, line breaks, and capitalization.

---

### 3. Loads the source data into dictionaries

Data is cached by SKU for fast lookup:

* Available
* On the way
* Order allocated
* Forecasted daily sales

This guarantees high performance even with large datasets.

---

### 4. Updates multiple inventory sheets

Each run automatically updates **three** of the following sheets (if present):

* `采菁`
* `萌睫`
* `Flortte`

No active-sheet dependency exists.

---

### 5. Clears and refills inventory columns

Before inserting new data, the script clears:

* Available Stock
* On the Way
* Order Allocated
* Daily Sales

Then refills them strictly by SKU matching (case-insensitive).

---

### 6. Applies the “Available Stock − 10,000” rule

For **every numeric Available Stock value**:

* The script always subtracts **10,000**
* No thresholds or exemptions are applied

This enforces a consistent warehouse buffer and avoids edge cases.

---

### 7. Recalculates formulas and restores protection

After updating each sheet:

* Worksheet formulas are recalculated
* Sheet protection is restored (original settings)
* Application states are returned to normal

The script runs **silently** — messages only appear if an error occurs.

---

## 🛠 Setup

### Folder setting

Update this constant in the VBA module:

```vb
Private Const DATA_FOLDER As String = "C:\Users\zouzh\Downloads"
```

### Source files expected

Any `.xlsx` file whose name starts with:

* `Inventory_List`
* `库存清单`

The most recently modified file is chosen automatically.

---

## 🚀 How to Use

1. Open **Inventory List - 副本.xlsm**
2. Click the **Update** button next to the SKU header (or run `UpdateInventoryNEW` manually)
3. Both `采菁` and `萌睫` sheets are updated automatically
4. No confirmation popup appears unless something goes wrong

---

## ✔ Supported Scenarios

* English source workbook
* Chinese source workbook
* Mixed-language environments
* Protected sheets
* Missing or reordered columns
* Case differences in SKUs
* Large datasets

---

## 📄 License

MIT License — suitable for business and operational automation.
