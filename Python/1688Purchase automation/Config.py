# config.py
# Centralized configuration file for 1688 Automation Project

import os

# ------------------------------------------------------------
# Base Paths (portable)
# ------------------------------------------------------------

# Folder where this config.py is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Treat this as the project root
BASE_DIR = SCRIPT_DIR

DXM_BASE_FOLDER = BASE_DIR
PICKLIST_FOLDER = os.path.join(BASE_DIR, "Batch_added_to_cart")
SCRAPE_FOLDER   = os.path.join(BASE_DIR, "ID_Scrape")
MAPPING_PATH    = os.path.join(BASE_DIR, "Mapping_Data", "Mapping_Data.xlsx")

# ------------------------------------------------------------
# Cookie Paths
# ------------------------------------------------------------

ALI_COOKIE_PATH = os.path.join(BASE_DIR, "Cookies", "ali_cookie.txt")
DXM_COOKIE_PATH = os.path.join(BASE_DIR, "Cookies", "dxm_cookie.txt")

# ------------------------------------------------------------
# Script Behavior Toggles
# ------------------------------------------------------------

DRY_RUN = False
ENABLE_AUDIT = True
ENABLE_ADD_TO_CART = True
ENABLE_ID_SCRAPE = True

# ------------------------------------------------------------
# HTTP Settings
# ------------------------------------------------------------

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/142.0.0.0 Safari/537.36"
)

TIMEOUT = 20

# ------------------------------------------------------------
# Shared Constants
# ------------------------------------------------------------

STATUS_PRIORITY = {
    "FAILED_SPEC_ID_EMPTY": 0,
    "FAILED_OTHER": 1,
    "UNKNOWN": 2,
    "SUCCESS_MISMATCH": 3,
    "SUCCESS_UNCHECKED": 4,
    "SUCCESS": 5,
    "FAILED_BEIHUO": 6,
}
