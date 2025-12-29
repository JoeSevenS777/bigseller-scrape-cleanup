# Image Ratio Fixer (Smart Crop & Zoom-Out)

[![Python Version](https://img.shields.io/badge/Python-3.8%2B-blue)]()
[![Image Processing](https://img.shields.io/badge/Pillow-Image%20Processing-orange)]()
[![Status](https://img.shields.io/badge/Status-Production-green)]()

Automated image aspect-ratio correction tool designed for **text-heavy e-commerce detail images**.  
Ensures `width / height ≥ 0.5` while minimizing layout damage through **content-aware detection** and a **safe zoom-out fallback**.

Designed for real-world cross-border e-commerce workflows where naïve cropping breaks text and visual structure.

---

## Overview

This script automatically processes images in the **same folder as the script** and enforces a minimum aspect ratio requirement.

It is optimized for:
- Long vertical product detail images
- Posters with text and diagrams
- Platform ratio constraints (Shopee / Lazada / Amazon)

The script operates **in place** and requires no configuration.

---

## What This Script Does

This tool automates the following steps:

- Scans image files in the script directory
- Checks whether `width / height ≥ 0.5`
- Preserves image width at all times
- Crops height symmetrically (top & bottom) when safe
- Detects whether cropping would cut text or patterns
- Warns the user before risky edits
- Provides a **zoom-out + canvas fit** alternative when needed

---

## Why Not Simple Cropping

Simple center-cropping often destroys:

- Chinese / English text
- Carefully aligned product descriptions
- Infographics and diagrams

This script adds **content-aware safety checks** so you can:

- Crop aggressively when safe
- Preserve everything when it’s not

---

## Core Logic (High-Level)

1. Read image dimensions `(w, h)`
2. If `w / h ≥ 0.5`
   - Skip image
3. Else
   - Calculate target height = `2 × w`
   - Plan symmetric top/bottom crop
4. Detect content risk:
   - Estimate background color from corners
   - Detect non-background bounding box
   - Check overlap with crop zones
5. If safe
   - Crop in place
6. If risky
   - Prompt user:
     - Crop anyway
     - Zoom-out to fit canvas
     - Skip image

---

## Zoom-Out Fallback Mode (No Content Loss)

When cropping is unsafe:

- A new canvas is created with compliant ratio
- Original image is scaled down proportionally
- Image is centered on the canvas
- Background color is auto-matched

Result:
- Aspect ratio fixed
- Text preserved
- Layout intact

---

## Requirements

- Python 3.8 or higher
- Pillow (PIL)

Install dependency:

```bash
pip install pillow
