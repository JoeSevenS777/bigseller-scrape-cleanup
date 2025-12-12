# UpdateInventoryNEW – Automated Inventory Synchronization  
Reliable, header-aware, language-flexible stock updating for Excel

![Excel](https://img.shields.io/badge/Excel-Automation-217346?style=for-the-badge&logo=microsoft-excel&logoColor=white)
![VBA](https://img.shields.io/badge/Language-VBA-yellow?style=for-the-badge)
![Inventory](https://img.shields.io/badge/Feature-Inventory%20Sync-blue?style=for-the-badge)
![SKU](https://img.shields.io/badge/SKU-Matching-orange?style=for-the-badge)
![Data](https://img.shields.io/badge/Source-English%20%2F%20Chinese-success?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Stable-brightgreen?style=for-the-badge)

An advanced VBA macro that automatically updates your **Inventory List** by synchronizing data from the latest stock workbook (English or Chinese version).  
This script supports:
- Header detection in **both English & Chinese**
- SKU-based matching  
- Auto-cleaning old values  
- Protection-aware worksheet handling  
- Fast performance via dictionary lookups  
- Auto-adjusting available stock (minus 10,000 rule)  

---

## ✨ What This Script Does

### **1. Locates the newest inventory data file**
Searches the configured folder for the most recently modified file:  
`Inventory_List*.xlsx` or `库存清单*.xlsx`.

Opens it safely in **read-only mode**.

---

### **2. Detects headers automatically (fuzzy matching)**
Understands both English and Chinese header names:

| Field | English Header | Chinese Header |
|-------|----------------|----------------|
| SKU | SKU Name | SKU编号 |
| Available | Available for whole warehouse / Available Stock | 整仓可用 |
| On the Way | On The Way | 在途中 |
| Order Allocated | Order Allocated | 订单已锁 |
| Daily Sales | Forecasted Daily Sales | 预测日销量 |

The script normalizes headers, ignores spaces, punctuation, line breaks, and capitalization.

---

### **3. Loads the source data into dictionaries**
Fast lookup by SKU:

- Available
- On the way
- Order allocated
- Forecasted daily sales

Dictionaries ensure **lightning-fast** updates even with thousands of rows.

---

### **4. Clears old values in the Inventory List**
Before inserting new data, it clears:

- Available Stock  
- on the way  
- Order Allocated  
- Daily Sales  

Ensures no stale data remains.

---

### **5. Fills updated values by matching SKU**
For each row in your Inventory List:

- Reads the SKU  
- Checks each dictionary  
- Fills in the new values  

Both **exact** and **case-insensitive** matches are supported.

---

### **6. Applies the “Available Stock − 10,000” rule**
If the imported Available Stock ≥ 10,000:

- The script automatically subtracts 10,000  
- Leaves all values < 10,000 unchanged  

This feature supports your operational logic for warehouse buffer handling.

---

### **7. Recalculates formulas and restores protection**
After updates:

- Forces worksheet recalculation  
- Re-protects the sheet (same settings as before)  
- Restores screen updating and calculation states  

---

## 🛠 Setup

### **Folder Setting**
Update this constant to match your environment:

DATA_FOLDER =  
`C:\Users\zouzh\WPSDrive\...\inventory\Inventory Data`

### **Source Files Expected**
Any file whose name begins with:

- `Inventory_List`  
- `库存清单`  

and ends with `.xlsx`.

The **most recently edited** file is chosen automatically.

---

## 🚀 How to Use

1. Open **Inventory List - 副本.xlsm**  
2. Ensure your Inventory List sheet is active  
3. Run the macro:

`UpdateInventoryNEW`

4. Done — your entire dataset refreshes instantly.

---

## ✔ Supported Scenarios

- English source workbook  
- Chinese source workbook  
- Mixed-language environments  
- Protected sheets  
- Missing or extra columns  
- Case differences in SKUs  
- Partial updates  
- Large data sets  

---

## 🧠 Why This Script Is Reliable

| Issue | How UpdateInventoryNEW Solves It |
|-------|----------------------------------|
| Workbook structure changes | Auto-detects headers via fuzzy matching |
| Multi-language | English & Chinese supported |
| Slow lookups | Dictionary-based SKU matching |
| Wrong file chosen | Latest-modified logic |
| Sheet is protected | Auto-unprotect → update → re-protect |
| Incorrect available stock | Enforces 10,000-offset rule |
| Stale formulas | Auto-recalculate |

---

## 📄 License  
MIT License — suitable for business and operational automation.
