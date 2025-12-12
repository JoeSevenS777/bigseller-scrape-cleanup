# Jusifang Withdrawal OCR Automation
[![Python](https://img.shields.io/badge/Python-3.10+-blue)]()
[![OCR](https://img.shields.io/badge/OCR-Tesseract-orange)]()
[![Status](https://img.shields.io/badge/Status-Production-green)]()

Automated OCR workflow for extracting withdrawal records from Excel files containing screenshot-based transaction slips.  
The script reads all `.xlsx` files in its folder, performs OCR on embedded images, identifies transaction metadata, fills missing cells, summarizes totals, and renames files according to a standardized naming format.

Designed specifically for **Jusifang (聚四方)** withdrawal slip formats.

---

## Features

- Processes **all .xlsx files** in the same directory as this script  
- Reads embedded images from column `提款截圖`  
- OCR via **Tesseract** with multilanguage support (`chi_tra + eng`)  
- Extracts:
  - 日期  
  - 提款編號  
  - 提款金額  
- Only fills missing fields to avoid overwriting user-edited data  
- Intelligent amount parsing with:
  - Negative-value detection  
  - Filtering out NT$0 “可提領金額”  
  - Ignoring date-like numbers and long IDs  
- Summarizes:
  - Newest 日期 found in sheet  
  - Total 提款金額  
- Renames file to:
  
      yyMMdd + core name + total amount
  
  Example:
  
      251106個人卡提(馬京瑋)16642.xlsx
  
- Auto-removes original file after renaming (if permitted)

---

## Directory Layout

    folder/
        Jusifang_Withdrawal_Automation.py
        slip1.xlsx
        slip2.xlsx
        slip3.xlsx
        ...

Running the script processes **every .xlsx file** in the folder (except temporary `~$` files).

---

## OCR Requirements

- Tesseract OCR installed  
- Correct path set:

      pytesseract.pytesseract.tesseract_cmd = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe"

- Recommended language packages:
  - `chi_tra`
  - `eng`

Edit TESS_LANG if needed:

      TESS_LANG = "chi_tra+eng"

---

## Extraction Logic

### 1. Date Detection
Finds dates matching:

      YYYY/MM/DD

Example:

- 2025/11/06 → recognized  
- Other formats ignored to avoid false positives

---

### 2. Withdrawal ID Detection
Finds long numeric IDs:

- Starting with 20  
- 16–20 digits long  

Example:

      202511061234567890 → valid withdrawal ID

---

### 3. Amount Detection

The script uses a multi-stage extraction:

#### Priority 1 — Keyword-based
Identifies lines containing:

- 提領總額  
- 提款金額  
- 提領金額  

And extracts negative amounts:

      -NT$16642  
      -16,642元

#### Priority 2 — Fallback Scan
Scans **all negative numbers** and filters out:

- 8-digit dates (e.g., 20251204)  
- Extremely long numbers → IDs  
- Zero amounts  
- Values > 2,000,000  

From remaining candidates, selects the **largest absolute value** as the real withdrawal.

---

## File Renaming Logic

After processing, the script summarizes the sheet:

- newest_date  
- total_amount  

Then constructs new filename:

      yyMMdd + core name + total amount + .xlsx

Where “core name” removes:

- Leading date  
- Trailing digits  
- Extra whitespace / underscores

Example:

    Input filename: 251106個人卡提(馬京瑋)133819.xlsx  
    Output filename: 251106個人卡提(馬京瑋)16642.xlsx

If no valid summary is found, original filename is kept.

---

## Workflow Diagram

    For each XLSX file:
        ↓
    Load workbook
        ↓
    Identify header columns:
        日期 / 提款編號 / 提款金額 / 提款截圖
        ↓
    For each embedded image:
        ↓ OCR → text
        ↓ Parse date / ID / amount
        ↓ Fill only missing cells
        ↓
    Summarize newest date + total amount
        ↓
    Rename file accordingly
        ↓
    Delete original file (optional fallback protection)

---

## Example Usage

Simply place this script and your `.xlsx` files together:

    C:\Users\You\Withdrawals\
        Jusifang_Withdrawal_Automation.py
        File1.xlsx
        File2.xlsx

Run:

    python Jusifang_Withdrawal_Automation.py

---

## Console Output Example

    Found 3 .xlsx file(s)
    === Processing: File1.xlsx ===
      Row 3: date=2025-11-06, id=2025110612345678, amount=16642
      Row 5: date=2025-11-06, id=2025110612345680, amount=9420
      Saved as: 251106個人卡提(馬京瑋)26062.xlsx
      Filled rows: 2, total amount: 26062, newest date: 2025-11-06

---

## Error Handling

| Issue | Behavior |
|-------|----------|
| Missing columns | File skipped |
| OCR failure | Blank fields preserved |
| Invalid number formats | Ignored safely |
| Rename conflict | Original preserved or deletion skipped |

The script prioritizes **data safety**, only filling empty cells.

---

## When to Use This Script

- Monthly Jusifang withdrawal reports  
- OCR processing for banking screenshots  
- Automating manual data entry  
- Cleaning large backlogs of slips  
- Standardizing filenames for bookkeeping

---

## Requirements

- Python 3.10+  
- Dependencies:
  - pytesseract  
  - pillow  
  - openpyxl  

Install:

    pip install pytesseract pillow openpyxl

Ensure Tesseract OCR is installed separately.

---

## License

Internal-use automation tool.  
For personal bookkeeping and workflow optimization.

