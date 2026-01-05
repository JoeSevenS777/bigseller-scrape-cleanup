import os
import re
import json
import time
import sys
import subprocess
import requests
import pandas as pd

from config import (
    SCRAPE_FOLDER,
    ALI_COOKIE_PATH,
    USER_AGENT,
    TIMEOUT,
)

SCRIPT_VERSION = "scrape_1688_http v2025-11-30-01"


# ======================================================================
# Directories
# ======================================================================

BASE_DIR = SCRAPE_FOLDER
DEBUG_DIR = os.path.join(BASE_DIR, "debug_html")
os.makedirs(DEBUG_DIR, exist_ok=True)


# ======================================================================
# Cookie & Headers
# ======================================================================

def load_cookie() -> str:
    """\
    Load 1688 cookie from:
    1. Environment variable ALI_COOKIE
    2. ali_cookie.txt at ALI_COOKIE_PATH
    """
    env_ck = os.environ.get("ALI_COOKIE", "").strip()
    if env_ck:
        return env_ck

    if ALI_COOKIE_PATH and os.path.exists(ALI_COOKIE_PATH):
        with open(ALI_COOKIE_PATH, "r", encoding="utf-8") as f:
            ck = f.read().strip()
        if ck:
            return ck

    raise SystemExit("❌ 未找到 1688 Cookie，请设置环境变量 ALI_COOKIE 或配置 ALI_COOKIE_PATH")


def make_detail_headers(url: str) -> dict:
    """Headers for requesting 1688 product page."""
    return {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Referer": url,  # 和 add_to_cart_http_1688.py 一致
        "Cookie": load_cookie(),
        "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8",
    }


# ======================================================================
# Utilities
# ======================================================================

def extract_offer_id(url: str) -> str:
    """Extract offerId from product URL."""
    if not url:
        return ""
    s = str(url).strip()
    m = re.search(r"/offer/(\d+)\.html", s)
    if m:
        return m.group(1)
    m = re.search(r"offerId=(\d+)", s)
    if m:
        return m.group(1)
    return ""


def save_debug_html(offer_id: str, html: str) -> None:
    """Save raw HTML for debugging."""
    path = os.path.join(DEBUG_DIR, f"{offer_id}.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)


# ======================================================================
# HTML PARSER  ——  和 add_to_cart_http_1688.py 保持一致
# ======================================================================

def _extract_json_object(html: str, key: str) -> str | None:
    """\
    从页面 HTML 中找到形如:
      key: { ... }
    的 JSON 对象字符串（只做大括号匹配，不做完整 JS 解析）。
    """
    idx = html.find(key)
    if idx == -1:
        return None

    start = html.find("{", idx)
    if start == -1:
        return None

    brace_level = 0
    in_str = False
    esc = False
    for i in range(start, len(html)):
        ch = html[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "{":
                brace_level += 1
            elif ch == "}":
                brace_level -= 1
                if brace_level == 0:
                    return html[start: i + 1]
    return None


def parse_sku_data_from_html(html: str):
    """\
    从 HTML 中解析出 sku 数据和店铺名，返回:
        (sku_records, shop_name)

    sku_records 是列表，每个元素形如:
        {"SKU ID": "xxx", "Spec ID": "yyy", "属性SKU": "黑色-M"}
    """
    json_str = _extract_json_object(html, "skuModel")
    if not json_str:
        return [], ""

    try:
        data = json.loads(json_str)
    except Exception:
        return [], ""

    sku_map = data.get("skuInfoMap") or {}
    records: list[dict] = []
    for _, v in sku_map.items():
        # 1688 skuInfoMap 通常会包含 skuId / specId / specAttrs 等字段
        sku_id = v.get("skuId") or v.get("id") or ""
        spec = v.get("specId") or v.get("specIdStr") or ""
        attrs = v.get("specAttrs") or []
        if isinstance(attrs, list):
            attr_values = [str(a.get("value", "")).strip() for a in attrs if a]
            attr = "-".join([x for x in attr_values if x])
        else:
            # 有些页面 specAttrs 已经是 “黑色-M” 这种字符串
            attr = str(attrs) if attrs else ""

        records.append({
            "SKU ID": str(sku_id),
            "Spec ID": str(spec),
            "属性SKU": attr,
        })

    # 店铺名从 HTML 中的 "companyName":"xxx" 里提取
    shop_name = ""
    m = re.search(r'"companyName"\s*:\s*"([^"\\]+)"', html)
    if m:
        shop_name = m.group(1)

    return records, shop_name


# ======================================================================
# SCRAPE ONE PRODUCT
# ======================================================================

def scrape_one_product(session: requests.Session, url: str) -> list[dict]:
    """\
    对单个商品链接：
      - 请求 HTML
      - 解析 SKU 数据 + 店铺名称
      - 返回若干行 dict，供 DataFrame 使用
    """
    url = str(url).strip()
    if not url:
        return []

    offer_id = extract_offer_id(url)
    if not offer_id:
        print(f"  [WARN] 无法从商品链接解析商品ID: {url}")
        return []

    print(f"  -> Scraping {url} (offerId={offer_id})")

    headers = make_detail_headers(url)

    try:
        resp = session.get(
            url,
            headers=headers,
            timeout=TIMEOUT,
            allow_redirects=True,
        )
    except Exception as e:
        print("  [WARN] 请求失败:", e)
        return []

    if resp.status_code != 200:
        print(f"  [WARN] HTTP {resp.status_code}，无法获取页面")
        return []

    html = resp.text
    save_debug_html(offer_id, html)

    sku_records, shop_name = parse_sku_data_from_html(html)
    print(f"  [DEBUG] 解析到 SKU 数量: {len(sku_records)}")  # 关键调试信息

    if not sku_records:
        print("  [WARN] 未能从 HTML 解析到任何 SKU 记录")
        return []

    rows: list[dict] = []
    for rec in sku_records:
        rows.append(
            {
                "商品链接": url,
                "商品ID": offer_id,
                "属性SKU": rec.get("属性SKU", ""),
                "SKU ID": rec.get("SKU ID", ""),
                "Spec ID": rec.get("Spec ID", ""),
                "店铺名称": shop_name,
            }
        )
    return rows



def open_file_with_default_app(filepath: str) -> None:
    """Open a file with the OS default application (best-effort)."""
    try:
        if not filepath or not os.path.exists(filepath):
            return
        if sys.platform.startswith("win"):
            os.startfile(filepath)  # type: ignore[attr-defined]
        elif sys.platform.startswith("darwin"):
            subprocess.run(["open", filepath], check=False)
        else:
            subprocess.run(["xdg-open", filepath], check=False)
    except Exception as e:
        print(f"[WARN] 已生成文件，但无法自动打开：{e}")


# ======================================================================
# MAIN PIPELINE
# ======================================================================

def find_latest_workbook() -> str:
    """在工作目录中找到最新的 .xlsx 文件（兼容旧流程，可选用）。"""
    candidates: list[str] = []
    for fn in os.listdir(BASE_DIR):
        if fn.lower().endswith(".xlsx") and not fn.startswith("~$"):
            full = os.path.join(BASE_DIR, fn)
            if os.path.isfile(full):
                candidates.append(full)

    if not candidates:
        raise FileNotFoundError(f"❌ 在 {BASE_DIR} 中未找到任何 .xlsx 工作簿")

    return max(candidates, key=os.path.getmtime)


def read_links_from_stdin() -> list[str]:
    """    交互式读取商品链接：
      - 支持一次性粘贴多行（每行一个链接）
      - 以“空行 + 回车”结束输入
      - 会做去重与简单清洗
    """
    import sys

    print("\n请粘贴 1688 商品链接（每行一个）。")
    print("粘贴完成后，请再输入一个空行并回车结束。\n")

    urls: list[str] = []
    seen: set[str] = set()

    while True:
        line = sys.stdin.readline()
        if not line:  # EOF
            break
        line = line.strip()
        if not line:
            break

        # 允许一行里粘贴多个链接（用空格分隔）
        parts = [p.strip() for p in re.split(r"\s+", line) if p.strip()]
        for p in parts:
            u = p.strip().strip('"').strip("'")
            if not u:
                continue
            if not (u.startswith("http://") or u.startswith("https://")):
                # 容错：用户可能粘贴了不带协议的链接/无关文本
                continue
            if u not in seen:
                seen.add(u)
                urls.append(u)

    return urls


def build_output_path() -> str:
    """输出到 ID_Scrape 目录，文件名不依赖输入 Excel。"""
    from datetime import datetime

    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_name = f"pasted_links_{ts}(done).xlsx"
    return os.path.join(BASE_DIR, out_name)


def main():
    import argparse

    print("=== 1688 HTTP ID Scrape (No Selenium) ===")
    print("版本：", SCRIPT_VERSION)
    print("工作目录：", BASE_DIR)

    parser = argparse.ArgumentParser(
        description="1688 商品 SKU/SpecID 抓取（HTTP 方式）\n默认：交互式粘贴链接。\n可选：从 Excel 读取（旧流程）。",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "--excel",
        nargs="?",
        const="__AUTO__",
        help="从 Excel 读取链接（旧流程）。不带参数则自动取工作目录最新的 .xlsx。\n示例：python scrape_1688_http.py --excel\n示例：python scrape_1688_http.py --excel input.xlsx",
    )
    args = parser.parse_args()

    # 1) 获取待处理链接
    urls: list[str] = []

    if args.excel is not None:
        # 旧流程：从 Excel 读取
        try:
            if args.excel == "__AUTO__":
                wb_path = find_latest_workbook()
            else:
                wb_path = args.excel
                if not os.path.isabs(wb_path):
                    wb_path = os.path.join(BASE_DIR, wb_path)

            print("待处理工作簿：")
            print("   ", wb_path)

            df = pd.read_excel(wb_path, dtype=str)
            if "商品链接" not in df.columns:
                raise SystemExit("❌ Excel 缺少列：商品链接")

            for _, row in df.iterrows():
                u = str(row.get("商品链接", "")).strip()
                if u:
                    urls.append(u)

        except Exception as e:
            print(f"[WARN] 读取 Excel 失败：{e}")
            print("[WARN] 将退出，不生成输出文件。\n")
            return
    else:
        # 新流程：交互式粘贴链接
        urls = read_links_from_stdin()

    # 清洗/去重
    cleaned: list[str] = []
    seen: set[str] = set()
    for u in urls:
        u = str(u).strip()
        if not u:
            continue
        if u not in seen:
            seen.add(u)
            cleaned.append(u)

    if not cleaned:
        print("[WARN] 未提供任何有效商品链接。请重新运行并粘贴链接。\n")
        return

    # 2) 抓取
    session = requests.Session()
    all_rows: list[dict] = []
    failed_urls: list[str] = []

    for url in cleaned:
        rows = scrape_one_product(session, url)
        if rows:
            all_rows.extend(rows)
        else:
            failed_urls.append(url)

    # 3) 输出或告警
    if not all_rows:
        print("\n[WARN] 未获得任何 SKU 数据，不输出文件。")

        # 给出失败链接列表（避免太长，最多 20 条）
        if failed_urls:
            print("[WARN] 可能失败的链接（最多显示 20 条）：")
            for u in failed_urls[:20]:
                print("  -", u)
            if len(failed_urls) > 20:
                print(f"  ... 以及另外 {len(failed_urls) - 20} 条")

        print("\n建议排查：Cookie 是否过期、链接是否需要登录、或查看 debug_html 中保存的页面源码。\n")
        return

    out_df = pd.DataFrame(all_rows)
    out_path = build_output_path()
    out_df.to_excel(out_path, index=False)

    print("\n全部处理完成。输出：", out_path)

    # 如果存在失败链接，给出提醒（仍然输出成功部分）
    if failed_urls:
        print(f"[WARN] 有 {len(failed_urls)} 个链接未抓取到数据（已忽略）。")

    open_file_with_default_app(out_path)
if __name__ == "__main__":
    main()

