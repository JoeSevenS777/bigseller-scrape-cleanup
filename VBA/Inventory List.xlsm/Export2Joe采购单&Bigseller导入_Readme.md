# Joe77 Procurement & BigSeller Import Automation (VBA)
[![Status](https://img.shields.io/badge/status-stable-brightgreen)]( )
[![Excel Version](https://img.shields.io/badge/Excel-VBA-blue)]( )
[![License](https://img.shields.io/badge/license-private-lightgrey)]( )

## Overview
This VBA automation streamlines the workflow for generating **Joe77 采购单** and **BigSeller 采购导入** files from two product sheets:

- 萌睫
- 采菁

Based on rows marked **"place order"**, the macro exports cleaned, standardized procurement files used for:

- Internal supplier ordering (Joe77采购单)
- BigSeller purchase import templates (Bigseller采购导入)

The macro automatically:
- Detects required columns
- Reuses existing files if present
- Renames older files to today's date
- Generates new files when needed
- Saves and closes export files
- Prompts whether to open the results

---

## Features

### Automated File Generation
| Source Sheet | Output 1 (Internal) | Output 2 (BigSeller) | Save Location |
|--------------|----------------------|------------------------|---------------|
| 萌睫 | Joe77采购单_萌睫YYYYMMDD.xlsx | Bigseller采购导入_萌睫YYYYMMDD.xlsx | Same folder as .xlsm |
| 采菁 | Joe77采购单_采菁YYYYMMDD.xlsx | Bigseller采购导入_采菁YYYYMMDD.xlsx | Joe77→Batch_added_to_cart; BigSeller→same folder as .xlsm |

### Intelligent Header Detection
The script does not rely on fixed column positions.  
It detects headers dynamically using:

    FindHeaderCol(ws, "headerName")

### Output Safety
- Automatically renames older files to today's date
- Avoids overwriting unless intended
- Prevents Excel “Save changes?” pop-ups
- Cleans and rewrites only data rows, not headers

### User-Friendly Interaction
At the end of execution:

- Shows a **Yes / No** dialog asking whether to open the generated files
- If Yes → both files open automatically
- If No → macro exits silently

---

## Requirements

- Windows + Excel with VBA enabled
- Workbook must be saved before running (required for file path resolution)
- Sheets must be named **萌睫** or **采菁**

---

## How to Use

1. Open the `.xlsm` containing this macro.
2. Go to sheet **萌睫** or **采菁**.
3. Ensure the *action* column contains `"place order"` on relevant rows.
4. Run macro:

    Joe采购单_Bigseller采购导入

5. After processing, choose whether to open the output files.

---

## Directory Structure Example

    automation/
        Joe采购单_Bigseller采购导入.xlsm
        Bigseller采购导入_萌睫20251212.xlsx
        Bigseller采购导入_采菁20251212.xlsx
        Batch_added_to_cart/
            Joe77采购单_采菁20251212.xlsx

---

## Core Logic Summary

### 1. Count rows that require export

    CountPlaceOrder(ws)

### 2. Identify necessary headers

    FindHeaderCol ws, "SKU"
    FindHeaderCol ws, "数量"
    FindHeaderCol ws, "action"

### 3. Build file paths and standardized names

    prefix + Format(Date, "yyyymmdd") + ".xlsx"

### 4. Reuse or rename existing files

    EnsureTodayFile folder, prefix, todayFilename

### 5. Export content

    Export_Mengjie_Joe77
    Export_Caijing_Joe77
    Export_ImportFile

### 6. Ask user whether to open files

    MsgBox "是否打开文件？", vbYesNo

---

## Example Code Snippet
(Indented instead of fenced, per GitHub-safe requirement)

    ' Save without prompts
    oldAlerts = Application.DisplayAlerts
    Application.DisplayAlerts = False
    wb.SaveAs fileName:=filePath, FileFormat:=xlOpenXMLWorkbook
    wb.Close SaveChanges:=False
    Application.DisplayAlerts = oldAlerts

---

## Troubleshooting

| Issue | Cause | Solution |
|------|--------|----------|
| “File could not be accessed” | Excel temporarily locks file | Ensure no export files are open before running |
| “Sub or Function not defined” | Module incomplete or missing | Ensure full script is copied into one module |
| No files generated | No rows marked `"place order"` | Confirm action column spelling |

---

## Why This Script Exists
Managing procurement files manually across two different vendor formats was repetitive and error-prone.  
This automation removes every manual step:

- No copying/pasting  
- No formatting  
- No filename guessing  
- No dialog prompts  
- No forgotten old files  

It replicates a procurement workflow that is consistent, predictable, and fast.

---

## License
This script is part of a private business automation system and is **not permitted for redistribution**.

