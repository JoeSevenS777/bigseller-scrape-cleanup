import os
import re
import time
import json
import random
import msvcrt

import pandas as pd
import requests

from config import (
    PICKLIST_FOLDER,
    MAPPING_PATH as CFG_MAPPING_PATH,
    ALI_COOKIE_PATH,
    USER_AGENT,
    ENABLE_ADD_TO_CART,
    TIMEOUT,
)


# =============================================================================
# 配置
# =============================================================================

# 工作目录：DXM 导出的待加购工作簿所在文件夹
BASE_DIR = PICKLIST_FOLDER

# 映射文件路径
MAPPING_PATH = CFG_MAPPING_PATH

# 处理完成后，原始表和 (done) 表都会移动到这个子文件夹中
FINISHED_DIR = os.path.join(BASE_DIR, "Finished_added_to_cart")

# 1688 Cookie：
# 优先级：
# 1) 环境变量 ALI_COOKIE
# 2) 脚本同目录下 ali_cookie.txt
# 3) BASE_DIR 下的 ali_cookie.txt
# 4) 下面的 COOKIE 常量（不推荐明文写在脚本里）
COOKIE = ""  # 可选：在这里直接粘贴 1688 Cookie（不推荐）

_COOKIE_CACHE = None


def human_delay(min_s: float = 0.1, max_s: float = 0.3) -> None:
    """在加购请求之间增加一个随机延迟，避免太“机器人”。"""
    time.sleep(random.uniform(min_s, max_s))


def get_cookie() -> str:
    """获取 1688 Cookie。"""
    global _COOKIE_CACHE
    if _COOKIE_CACHE is not None:
        return _COOKIE_CACHE

    # 1) 环境变量
    env_v = os.environ.get("ALI_COOKIE", "").strip()
    if env_v:
        _COOKIE_CACHE = env_v
        return _COOKIE_CACHE

    # 2) 文件 ali_cookie.txt
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "ali_cookie.txt"),
        os.path.join(BASE_DIR, "ali_cookie.txt"),
        ALI_COOKIE_PATH,
    ]
    for p in candidates:
        if p and os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                txt = f.read().strip()
            if txt:
                _COOKIE_CACHE = txt
                return _COOKIE_CACHE

    # 3) 常量 COOKIE
    if COOKIE and not COOKIE.strip().startswith("PUT_"):
        _COOKIE_CACHE = COOKIE.strip()
        return _COOKIE_CACHE

    raise SystemExit(
        "请先配置 1688 Cookie："
        "可用环境变量 ALI_COOKIE，或在脚本/BASE_DIR 放 ali_cookie.txt，"
        "或在本文件顶部的 COOKIE 变量中粘贴。"
    )


ADD_TO_CART_URL = "https://cart.1688.com/ajax/safe/add_to_cart_list_new.jsx"
PURCHASE_RENDER_URL = "https://cart.1688.com/ajax/purchaseRender.jsx?_input_charset=utf-8"


# =============================================================================
# 工具函数
# =============================================================================

def find_plan_workbook(folder: str) -> str:
    """找到【最新修改时间】的单个未完成 .xlsx 文件（只处理这一个）。"""
    candidates = []
    for name in os.listdir(folder):
        if not name.lower().endswith(".xlsx"):
            continue
        if name.startswith("~$"):
            continue
        if "(done)" in name:
            continue
        full = os.path.join(folder, name)
        if os.path.isfile(full):
            candidates.append(full)

    if not candidates:
        raise FileNotFoundError(f"在 {folder} 中未找到任何未完成的 .xlsx 文件")

    latest = max(candidates, key=os.path.getmtime)
    if len(candidates) > 1:
        print("[INFO] 发现多个未完成工作簿，将使用最新修改的一个:")
    print("       ", os.path.basename(latest))
    return latest


def find_column_by_exact_name(columns, target_name: str):
    for c in columns:
        if str(c).strip() == target_name:
            return c
    return None


def find_spec_id_column(columns):
    for c in columns:
        name = str(c).replace(" ", "").lower()
        if "spec" in name and "id" in name:
            return c
    return None


def find_quantity_column(columns):
    for c in columns:
        if str(c).strip() == "数量":
            return c
    for c in columns:
        if "数量" in str(c):
            return c
    return None


def ensure_status_columns(df: pd.DataFrame):
    status_col = None
    remark_col = None
    for c in df.columns:
        n = str(c).strip()
        if n == "状态":
            status_col = c
        elif n == "备注":
            remark_col = c
    if status_col is None:
        status_col = "状态"
        df[status_col] = ""
    if remark_col is None:
        remark_col = "备注"
        df[remark_col] = ""
    return status_col, remark_col


def parse_quantity(v) -> int:
    if v is None:
        raise ValueError("数量为空")
    s = str(v).strip()
    if not s or s.lower() in ("nan", "none"):
        raise ValueError("数量为空")
    q = int(float(s))
    if q <= 0:
        raise ValueError("数量必须为正整数")
    return q


def extract_offer_id(url: str) -> str:
    """从商品链接中提取 offerId / cargoIdentity"""
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


def make_headers():
    """构造加购请求头。"""
    cookie = get_cookie()
    return {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Origin": "https://www.1688.com",
        "Referer": "https://www.1688.com/",
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "Cookie": cookie,
    }


def build_post_data(offer_id: str, spec_id: str, amount: int, purchase_type: str = "") -> dict:
    """构造 add_to_cart_list_new.jsx 的 POST 数据。

    purchase_type:
        ""                      → 批发
        "consign_purchase_type" → 代发
    """
    ext = json.dumps([{"sceneCode": ""}], ensure_ascii=False)
    spec_data = json.dumps(
        [{
            "amount": str(amount),
            "specId": spec_id,
            "selectedTradeServices": []
        }],
        ensure_ascii=False
    )
    return {
        "type": "offer",
        "cargoIdentity": offer_id,
        "returnType": "url",
        "needTotalPrice": "false",
        "promotionSwitch": "false",
        "t": str(int(time.time() * 1000)),
        "purchaseType": purchase_type,
        "ext": ext,
        "specData": spec_data,
    }


def warmup_purchase_render(session: requests.Session) -> None:
    """可选：调用一次 purchaseRender.jsx，模拟打开进货单页面。"""
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://cart.1688.com",
        "Referer": "https://cart.1688.com/daixiao_cart.htm",
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "same-origin",
        "Cookie": get_cookie(),
    }
    try:
        session.post(PURCHASE_RENDER_URL, headers=headers, data={}, timeout=TIMEOUT)
        print("[INFO] 已发送 purchaseRender.jsx (warmup)")
    except Exception as e:
        print("[WARN] purchaseRender.jsx 预热失败:", e)


# =============================================================================
# 映射逻辑（DXM 导出 → Mapping_Data → 1688 所需字段）
# =============================================================================

def load_mapping_dataframe(path: str) -> pd.DataFrame:
    """读取 Mapping_Data.xlsx，并归一化主键列为 'SKU'"""
    if not os.path.exists(path):
        raise SystemExit(f"[FATAL] 找不到 Mapping_Data 文件: {path}")

    print(f"[INFO] 正在加载 Mapping_Data: {path}")
    mdf = pd.read_excel(path, dtype=str)

    # 找到 商品選項貨號 列
    key_col = None
    for cand in ["商品選項貨號", "商品选項貨號", "商品选项货号"]:
        if cand in mdf.columns:
            key_col = cand
            break
    if key_col is None:
        raise SystemExit("在 Mapping_Data 中未找到 '商品選項貨號' 这一列。")

    mdf.rename(columns={key_col: "SKU"}, inplace=True)

    need_cols = ["SKU", "商品链接", "商品ID", "属性SKU", "SKU ID", "Spec ID", "主供应商"]
    for col in need_cols:
        if col not in mdf.columns:
            mdf[col] = ""

    mdf = mdf[need_cols].copy()

    for col in need_cols:
        mdf[col] = mdf[col].astype(str).fillna("").str.strip()

    return mdf


def apply_mapping_if_needed(df: pd.DataFrame) -> pd.DataFrame:
    """如果表中已经有 商品链接 + Spec ID，则认为已经是 1688 格式，直接返回。
       否则按 Mapping_Data 做映射（DXM 原始导出 → 1688 所需字段）。"""
    has_link = "商品链接" in df.columns
    has_spec = find_spec_id_column(df.columns) is not None

    if has_link and has_spec:
        print("[INFO] 检测到 '商品链接' 和 Spec ID 列，认为此表已经是 1688 格式，跳过 Mapping_Data 映射。")
        return df

    if "SKU" not in df.columns:
        raise SystemExit("当前工作簿没有 'SKU' 列，无法根据 Mapping_Data 进行映射。")

    print("[INFO] 当前工作簿看起来是 Dianxiaomi 导出的原始拣货表，将根据 Mapping_Data 做映射。")

    # 读取 Mapping_Data
    mapping_df = load_mapping_dataframe(MAPPING_PATH)

    # ==== 统一 SKU 大小写，避免大小写不一致导致无法映射 ====
    df["SKU"] = df["SKU"].astype(str).fillna("").str.strip().str.upper()
    mapping_df["SKU"] = mapping_df["SKU"].astype(str).fillna("").str.strip().str.upper()

    joined = df.merge(
        mapping_df,
        on="SKU",
        how="left",
        suffixes=("", "_map")
    )

    merged = joined.copy()

    for field in ["商品链接", "商品ID", "属性SKU", "SKU ID", "Spec ID", "主供应商"]:
        map_col = field + "_map"
        if map_col in merged.columns:
            merged[field] = merged[field].astype(str).fillna("")
            merged[map_col] = merged[map_col].astype(str).fillna("")
            merged[field] = merged.apply(
                lambda r, f=field, m=map_col: r[m] if r[m].strip() else r[f],
                axis=1
            )

    map_cols = [c for c in merged.columns if c.endswith("_map")]
    if map_cols:
        merged.drop(columns=map_cols, inplace=True)

    # 模拟「未映射」：商品链接为空的行
    if "商品链接" not in merged.columns:
        merged["商品链接"] = ""
    merged["商品链接"] = merged["商品链接"].astype(str)

    no_match_mask = merged["商品链接"].isna() | (merged["商品链接"].str.strip() == "")

    missing_skus = merged.loc[no_match_mask, "SKU"].dropna().unique().tolist()
    if missing_skus:
        print(f"[WARN] 共有 {len(missing_skus)} 个 SKU 在 Mapping_Data 中未找到映射：")
        for sku in missing_skus:
            print("  [WARN] 无映射 SKU:", sku)

    # 确保映射字段存在且为字符串
    for col in ["商品链接", "商品ID", "属性SKU", "SKU ID", "Spec ID", "主供应商"]:
        if col not in merged.columns:
            merged[col] = ""
        merged[col] = merged[col].astype(str).fillna("").str.strip()

    # 对未映射行做一个可见标记（后续解析 offerId 会失败，从而 FAILED）
    merged.loc[no_match_mask, "商品链接"] = "NO MAPPING SKU"

    print("[INFO] 已根据 Mapping_Data 完成字段填充：商品链接 / 商品ID / 属性SKU / SKU ID / Spec ID / 主供应商")
    return merged



# =============================================================================
# 主处理逻辑
# =============================================================================

def process_workbook(plan_path: str, purchase_type: str = ""):
    """核心处理函数：
      - 读取 DXM 导出拣货表（或已手工整理的 1688 表）
      - 如需则按 Mapping_Data 映射
      - 调用 1688 加购物车接口
      - 输出 (done) 结果表，并根据状态排序
      - 将原始表 + 结果表移动到 Finished_added_to_cart
    提示：管线脚本可以直接 import 后调用本函数（不经过 CLI 确认）。"""

    print("====================================================")
    print("正在处理工作簿:", plan_path)
    print("====================================================")

    df = pd.read_excel(plan_path, dtype=str)

    # 1) 如果需要，做 Mapping_Data 映射
    df = apply_mapping_if_needed(df)

    # 2) 找出关键列：商品链接、Spec ID、数量
    link_col = find_column_by_exact_name(df.columns, "商品链接")
    spec_col = find_spec_id_column(df.columns)
    qty_col = find_quantity_column(df.columns)

    if link_col is None:
        raise SystemExit("无法找到列: 商品链接")
    if spec_col is None:
        raise SystemExit("无法找到列: Spec ID (标题中需要包含 'spec' 和 'id')")
    if qty_col is None:
        raise SystemExit("无法找到列: 数量")

    print(f"[INFO] 识别到列: 商品链接='{link_col}', Spec ID='{spec_col}', 数量='{qty_col}'")

    status_col, remark_col = ensure_status_columns(df)
    headers = make_headers()
    session = requests.Session()

    # 可选：预热 purchaseRender（如果你想完全仿照软件行为，可以取消注释）
    # warmup_purchase_render(session)

    # 4) 加入购物车循环
    for idx, row in df.iterrows():
        url = row[link_col]
        spec_id_val = row[spec_col]
        qty_val = row[qty_col]

        # 已经成功的行（再跑脚本时自动跳过）
        if str(df.at[idx, status_col]).strip() == "SUCCESS":
            continue

        sku_val = row.get("SKU", "")
        sku_str = str(sku_val).strip() if sku_val is not None else ""

        # ========== 处理 “备货” 专用逻辑 ==========
        link_str = str(url).strip() if url is not None else ""
        goods_id_val = row.get("商品ID", "")
        goods_id_str = str(goods_id_val).strip() if goods_id_val is not None else ""

        # 先检查 Spec ID 是否为空
        if spec_id_val is None:
            df.at[idx, status_col] = "FAILED"
            df.at[idx, remark_col] = "Spec ID 为空"
            continue

        spec_id = str(spec_id_val).strip()

        # 如果 商品链接 / 商品ID / Spec ID 任意一个为 “备货/備貨”，标记为 FAILED, 备注=备货
        if link_str in ("备货", "備貨") or goods_id_str in ("备货", "備貨") or spec_id in ("备货", "備貨"):
            df.at[idx, status_col] = "FAILED"
            df.at[idx, remark_col] = "备货"
            continue
        # ========== “备货” 逻辑结束 ==========

        if not spec_id:
            df.at[idx, status_col] = "FAILED"
            df.at[idx, remark_col] = "Spec ID 为空"
            continue

        # 数量
        try:
            qty = parse_quantity(qty_val)
        except ValueError as e:
            df.at[idx, status_col] = "FAILED"
            df.at[idx, remark_col] = f"数量错误: {e}"
            continue

        offer_id = extract_offer_id(url)
        if not offer_id:
            df.at[idx, status_col] = "FAILED"
            df.at[idx, remark_col] = "无法从商品链接解析商品ID"
            continue

        print(f"行 {idx}: SKU={sku_str}, offerId={offer_id}, specId={spec_id}, qty={qty}")

        data = build_post_data(offer_id, spec_id, qty, purchase_type=purchase_type)

        # 如果在 config.py 中关闭 ENABLE_ADD_TO_CART，则仅做模拟，不发出真实请求
        if not ENABLE_ADD_TO_CART:
            print("  [DRY-RUN] 已跳过实际加购请求（ENABLE_ADD_TO_CART=False）")
            df.at[idx, status_col] = "DRY_RUN"
            df.at[idx, remark_col] = "配置中禁用加购（未调用 1688 接口）"
            continue

        # 加一点点人类延迟
        human_delay()

        try:
            resp = session.post(
                ADD_TO_CART_URL,
                headers=headers,
                data=data,
                timeout=TIMEOUT,
            )
        except requests.RequestException as e:
            print("  [FAIL] 请求出错:", e)
            df.at[idx, status_col] = "FAILED"
            df.at[idx, remark_col] = f"请求异常: {e}"
            continue

        text = resp.text.strip()
        short_text = text[:180].replace("\n", " ")

        if resp.status_code == 200:
            try:
                j = resp.json()
            except ValueError:
                j = None

            success = isinstance(j, dict) and j.get("success") is True
            if success:
                print("  [OK] 加购成功")
                df.at[idx, status_col] = "SUCCESS"
                df.at[idx, remark_col] = "加入购物车成功"
            else:
                print("  [FAIL] 状态200但未检测到 success 字段，响应片段:", short_text)
                df.at[idx, status_col] = "FAILED"
                df.at[idx, remark_col] = short_text
        else:
            print(f"  [FAIL] HTTP {resp.status_code}, 响应片段: {short_text}")
            df.at[idx, status_col] = "FAILED"
            df.at[idx, remark_col] = short_text

        time.sleep(0.0)

    # 5) 排序：
    #  0. FAILED + Spec ID 为空
    #  1. FAILED (其它原因，不含 备货)
    #  2. 其它未知状态 / DRY_RUN
    #  3. SUCCESS
    #  4. FAILED + 备货

    def _sort_key(row):
        status = str(row[status_col]).strip()
        remark = str(row[remark_col]).strip()

        if status == "FAILED":
            if remark == "备货":
                return 4
            if remark.startswith("Spec ID 为空"):
                return 0
            return 1

        if status == "SUCCESS":
            return 3

        # DRY_RUN 或其它未知
        return 2

    df["__sort_key__"] = df.apply(_sort_key, axis=1)
    df = df.sort_values(by="__sort_key__", kind="stable").drop(columns=["__sort_key__"])

    # 6) 只保留关键信息列（会自动丢弃 仓库/商品编码/名称/货架位/客服备注 等）
    final_cols = [
        "SKU",
        "数量",
        "商品链接",
        "商品ID",
        "属性SKU",
        "SKU ID",
        "Spec ID",
        "主供应商",
        "拣货备注",
        status_col,
        remark_col,
    ]
    for col in final_cols:
        if col not in df.columns:
            df[col] = ""
    df = df[final_cols]

    base, ext = os.path.splitext(plan_path)
    out_path = base + "(done)" + ext
    df.to_excel(out_path, index=False)
    print("全部处理完成，结果已保存到:", out_path)

    # 7) 把原始表和结果表移动到 Finished_added_to_cart 目录
    dest_out = None
    try:
        if not os.path.exists(FINISHED_DIR):
            os.makedirs(FINISHED_DIR, exist_ok=True)

        def safe_move(src_path: str):
            if not os.path.exists(src_path):
                return None
            name = os.path.basename(src_path)
            dst = os.path.join(FINISHED_DIR, name)
            if os.path.exists(dst):
                ts = time.strftime("%Y%m%d_%H%M%S")
                base_n, ext_n = os.path.splitext(name)
                dst = os.path.join(FINISHED_DIR, f"{base_n}_{ts}{ext_n}")
            os.replace(src_path, dst)
            print("已移动文件到已完成文件夹:", dst)
            return dst

        safe_move(plan_path)
        dest_out = safe_move(out_path)

    except Exception as e:
        print("[WARN] 移动文件到已完成文件夹时出错（不影响本次结果）:", e)
        dest_out = None

    # 8) 完成后让用户选择是否打开结果文件
    final_result_path = dest_out or out_path
    try:
        print("\n处理已全部完成。")
        print("按任意键（除 N/n）打开结果文件；按 N/n 后回车退出不打开。")
        choice = input("请输入选择: ").strip().lower()

        if choice == "n":
            print("已选择不打开文件。程序结束。")
        else:
            if os.path.exists(final_result_path):
                print("正在打开:", final_result_path)
                try:
                    os.startfile(final_result_path)
                except Exception:
                    print("无法自动打开文件，请手动打开:", final_result_path)
            else:
                print("未找到结果文件，请检查:", final_result_path)
            print("程序结束。")
    except Exception as e:
        print("[WARN] 处理用户选择时出错:", e)


def main(purchase_type: str = ""):
    """命令行入口。

    purchase_type:
        ""                      → 批发
        "consign_purchase_type" → 代发
    """
    print("====================================================")
    print("【1688 加购脚本】DXM 导出拣货表 → Mapping_Data 映射 → 1688 加入购物车")
    print("工作目录:", BASE_DIR)
    print("====================================================")

    # 找最新的工作簿
    try:
        plan_path = find_plan_workbook(BASE_DIR)
    except FileNotFoundError as e:
        print(e)
        return

    fname = os.path.basename(plan_path)

    # 安全确认
    print("⚠ 安全确认：")
    print(f"  即将根据以下工作簿向 1688 加购：『{fname}』")
    print("  （本次只会处理这一份最新的 .xlsx 文件）")
    print("按 Y 或 y 继续；按其他任意键取消。")
    print("请按键确认:")

    # ---- Loose confirmation: press Y/y (no Enter needed) ----
    try:
        key = msvcrt.getch().decode("utf-8", errors="ignore")
    except Exception:
        key = input().strip()[:1] or "n"

    if key.lower() != "y":
        print("未按 Y，本次操作已取消，未对购物车做任何修改。")
        return

    # 根据传入的 purchase_type 决定显示批发 / 代发
    if purchase_type == "consign_purchase_type":
        print("本次将以【代发】方式加购。")
    else:
        print("本次将以【批发】方式加购。")

    print("确认已收到，开始执行加购...")

    # 调用主处理函数（内部会负责打开文件和退出）
    process_workbook(plan_path, purchase_type=purchase_type)


if __name__ == "__main__":
    import sys

    mode = ""
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower().strip()
        # 支持几种写法：consign / consign_purchase_type / daifa / 代发
        if arg in ("consign", "consign_purchase_type", "daifa", "代发"):
            mode = "consign_purchase_type"
        else:
            mode = ""  # 默认批发

    main(purchase_type=mode)
