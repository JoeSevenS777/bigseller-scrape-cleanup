# Shopee Settlement Import Automation (VBA)
[![Excel VBA](https://img.shields.io/badge/Excel-VBA-green)]()
[![Shopee](https://img.shields.io/badge/Platform-Shopee-orange)]()
[![Status](https://img.shields.io/badge/Status-Production-blue)]()

This VBA automation imports weekly Shopee settlement reports from two wallet accounts, appends only **new** settlement periods to your master sheet, and automatically drag-fills payment-related columns (J:O) for each new period.

It ensures old data is never modified and preserves all formulas and formats.

All README content is inside a single Markdown fence with indentation-only code examples.

---

## Features

- Processes two Shopee wallet folders (CK + NOSO accounts)
- Reads weekly report filenames in the format:
  
      xxxx_YYYYMMDD_YYYYMMDD.xlsx

- Extracts:
  - Start date  
  - End date  
  - 支出總計 (total payout)

- Appends new settlement periods **only if start date is newer than existing data**
- Automatically copies formulas and formats from the last existing row
- Generates incremental settlement account codes such as:
  
      ck1808052 → ck1808053

- Drag-fills payment columns J:O for each new 2-row period block
- Clears any merged cells in column O for newly added ranges
- Displays final completion message

---

## Sheet Layout Requirements

The macro expects the sheet:

    "Fee Deduction Calculation"

And the following column definitions (1-based):

| Column | Field | VBA Constant |
|--------|--------|--------------|
| A | 帳號 / Account | COL_ACCOUNT |
| B | 起始日 / Start Date | COL_START |
| C | 終止日 / End Date | COL_END |
| D | 支出總計 / Revenue | COL_REVENUE |
| J:O | Payment Fields | COL_PAY_FIRST → COL_PAY_LAST |

Each settlement period uses **2 rows**:

- Row 1: ck…  
- Row 2: noso…

Thus:

    ROWS_PER_PERIOD = 2

---

## Folder Structure

You must store weekly Shopee reports here:

    folderCK   → ck1808052 wallet
    folderNoso → noso1981 wallet

In the VBA code:

    folderCK   = "…\提款\ck1808052"
    folderNoso = "…\提款\noso1981"

Each file should follow naming format:

    something_YYYYMMDD_YYYYMMDD.xlsx

Example:

    weekly_20250101_20250107.xlsx

---

## Macro Entry Point

Run:

    ImportShopeeWithdrawals

This macro:

1. Detects newest existing start date in the sheet  
2. Scans CK + NOSO folders  
3. For each file:  
   - Parses filename dates  
   - Imports 支出總計  
   - Appends new rows only if the period is newer  
4. Drag-fills payment columns for all newly added periods  
5. Cleans merged cell residue in column O  
6. Finishes with a success message  

---

## Core Logic Overview

### 1. Determine Last Existing Start Date

    lastStartDate = MAX(Column B)

Used to skip older or already-imported weekly reports.

---

### 2. Parse File Dates from Name

Example filename:

    trans_20250901_20250915.xlsx

Parsed using:

- Start = 2025-09-01  
- End   = 2025-09-15  

---

### 3. Extract 支出總計

From the weekly report worksheet:

    Find "支出總計" in column A
    Read value in column E of the same row

Only numeric values are used.

---

### 4. Append Rows Without Touching Old Data

The macro copies formulas and formats from the last row:

    wsSet.Rows(lastRow).Copy
    wsSet.Rows(newRow).PasteSpecial xlPasteFormulas
    wsSet.Rows(newRow).PasteSpecial xlPasteFormats

Then fills:

- 帳號 (incremented)
- Start Date
- End Date
- Revenue

---

### 5. Generate Next Account Code

Example logic:

    ck1808052 → ck1808053
    noso1981   → noso1982

Based on maximum existing suffix for the prefix.

---

### 6. Drag-Fill Columns J:O

Each new 2-row period copies J:O formulas from the **last completed old period**.

Ensures financial formulas remain correct.

---

### 7. Clear Last Merged Cell in Column O

Shopee sheets sometimes contain merged cells in O.  
The macro removes them within the new rows to avoid formula conflicts.

---

## Example Usage Flow

    1. Download new CK & NOSO weekly reports.
    2. Save into their respective folders.
    3. Open your workbook.
    4. Run: ImportShopeeWithdrawals
    5. Review appended rows + auto-filled formulas.

No existing data is overwritten.

---

## VBA Dependencies

- Excel 2016 or later recommended  
- Sheet must contain predefined column structure  
- File naming convention must include two dates separated by underscores  

---

## Limitations & Notes

- Files without the expected naming convention are skipped  
- Files with older or duplicate start dates are ignored  
- Payment columns (J:O) must contain formulas in the last old row  
- Script does not modify historical records  

---

## Summary

This macro is a production-ready Shopee settlement importer. It:

- Automates weekly settlement ingestion  
- Prevents duplicate data  
- Preserves formulas  
- Applies consistent formatting  
- Propagates payment logic automatically  

It is ideal for large Shopee operations requiring reliable week-over-week settlement tracking.

