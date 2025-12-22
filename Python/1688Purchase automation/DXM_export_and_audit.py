import os
import time
import urllib.parse
from typing import List, Tuple

import pandas as pd
import requests

from config import (
    DXM_COOKIE_PATH,
    PICKLIST_FOLDER,
    DRY_RUN,
    ENABLE_AUDIT,
    USER_AGENT,
)

# ================== CONFIG ==================

# SAFE MODE (由 config.py 控制部分开关):
# DRY_RUN 从 config.py 导入
DO_EXPORT = True
DO_AUDIT = ENABLE_AUDIT

MAX_ORDERS = 300  # DXM 每页最多 300

# 订单工作簿目录：现在相对 PICKLIST_FOLDER，可在任意电脑任意路径运行
ORDER_IDS_DIR = os.path.join(PICKLIST_FOLDER, "Locate&Audit_UnprocessedOrders_InDXM")

DOWNLOAD_DIR = PICKLIST_FOLDER
WORK_DIR = os.path.dirname(os.path.abspath(__file__))

UA = USER_AGENT


# ================== COOKIE LOADER ==================


def load_cookie() -> str:
    """\
    优先使用环境变量 DXM_COOKIE；
    否则使用 config.py 中 DXM_COOKIE_PATH 指定的文本文件。
    """
    # 1) 先看环境变量
    ck = os.environ.get("DXM_COOKIE", "").strip()
    if ck:
        return ck

    # 2) 再看 config.py 中配置的 txt 文件
    cookie_path = DXM_COOKIE_PATH
    if os.path.exists(cookie_path):
        with open(cookie_path, "r", encoding="utf-8") as f:
            return f.read().strip()

    # 3) 两者都没有 → 抛出错误
    raise RuntimeError(
        "未找到 DXM Cookie。\n"
        "请设置环境变量 DXM_COOKIE，或在 config.py 中配置 DXM_COOKIE_PATH，"
        "并在该路径创建 dxm_cookie.txt，内容为整行浏览器 Cookie。"
    )


# ================== COMMON HTTP ==================


def make_session() -> Tuple[requests.Session, dict]:
    s = requests.Session()
    cookie = load_cookie()
    headers = {
        "User-Agent": UA,
        "Cookie": cookie,
        "Origin": "https://www.dianxiaomi.com",
        "Referer": "https://www.dianxiaomi.com/web/order/paid?go=m100",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
    }
    return s, headers


# ================== list.json helpers ==================


def query_package_id_from_order_id(
    session: requests.Session,
    headers: dict,
    order_id: str,
) -> str | None:
    """Mode 2：用 list.json 在【待审核】中查询一个 orderId -> packageId"""
    url = "https://www.dianxiaomi.com/api/package/list.json"
    data = {
        "pageNo": 1,
        "pageSize": 50,
        "shopId": -1,
        "state": "paid",  # 待审核
        "platform": "",
        "isSearch": 1,
        "searchType": "orderId",
        "authId": -1,
        "startTime": "",
        "endTime": "",
        "country": "",
        "orderField": "order_pay_time",
        "isVoided": 0,
        "isRemoved": 0,
        "printJh": -1,
        "printMd": -1,
        "commitPlatform": "",
        "productStatus": "",
        "jhComment": -1,
        "storageId": 0,
        "isOversea": -1,
        "isFree": 0,
        "isBatch": 0,
        "custom": -1,
        "timeOut": 0,
        "refundStatus": 0,
        "buyerAccount": "",
        "forbiddenStatus": -1,
        "forbiddenReason": 0,
        "behindTrack": -1,
        "orderId": order_id,
    }

    print(f"[INFO] list.json 查询 orderId = {order_id}")
    resp = session.post(url, data=data, headers=headers)
    print(f"[HTTP] list.json status = {resp.status_code}")
    if resp.status_code != 200:
        print("[ERROR] list.json HTTP 请求失败")
        return None

    try:
        j = resp.json()
    except Exception as e:
        print("[ERROR] list.json 返回不是 JSON:", e)
        return None

    page = j.get("data", {}).get("page", {})
    rows = page.get("list", []) or []

    if not rows:
        print(f"[INFO] 在待审核中找不到该订单 (orderId={order_id})，视为不在【待审核】。")
        return None

    for row in rows:
        if row.get("orderId") == order_id:
            pkg = row.get("idStr") or str(row.get("id"))
            print(f"[INFO] 在待审核中找到: orderId {order_id} -> packageId {pkg}")
            return pkg

    print(f"[WARN] list.json 返回数据中没有匹配的 orderId={order_id}")
    return None


def get_all_pending_packages(session: requests.Session, headers: dict) -> List[dict]:
    """Mode 1：用 list.json 分页获取所有【待审核】包裹。"""
    url = "https://www.dianxiaomi.com/api/package/list.json"
    page_no = 1
    all_rows: List[dict] = []

    print("=== 获取所有【待审核】订单 (list.json 分页) ===")

    while True:
        data = {
            "pageNo": page_no,
            "pageSize": MAX_ORDERS,
            "shopId": -1,
            "state": "paid",  # 待审核
            "platform": "",
            "isSearch": 0,
            "searchType": "",
            "authId": -1,
            "startTime": "",
            "endTime": "",
            "country": "",
            "orderField": "order_pay_time",
            "isVoided": 0,
            "isRemoved": 0,
            "printJh": -1,
            "printMd": -1,
            "commitPlatform": "",
            "productStatus": "",
            "jhComment": -1,
            "storageId": 0,
            "isOversea": -1,
            "isFree": 0,
            "isBatch": 0,
            "custom": -1,
            "timeOut": 0,
            "refundStatus": 0,
            "buyerAccount": "",
            "forbiddenStatus": -1,
            "forbiddenReason": 0,
            "behindTrack": -1,
            "orderId": "",
        }

        print(f"[INFO] list.json 请求第 {page_no} 页...")
        resp = session.post(url, data=data, headers=headers)
        print(f"[HTTP] list.json status = {resp.status_code}")
        if resp.status_code != 200:
            print("[WARN] list.json HTTP 非 200，停止。")
            break

        try:
            j = resp.json()
        except Exception as e:
            print("[WARN] list.json JSON 解析失败:", e)
            break

        page = j.get("data", {}).get("page", {})
        rows = page.get("list", []) or []
        if not rows:
            print("[INFO] 本页无数据，结束分页。")
            break

        print(f"[INFO] 本页得到 {len(rows)} 条。")
        all_rows.extend(rows)

        if len(rows) < MAX_ORDERS:
            print("[INFO] 最后一页 (< pageSize)。")
            break

        page_no += 1

    print(f"[INFO] 共获取【待审核】包裹 {len(all_rows)} 条。")
    return all_rows


# ================== Excel helpers (Mode 2) ==================


def find_latest_order_ids_workbook() -> str:
    """在 ORDER_IDS_DIR 中寻找最新的 .xlsx 文件。
    - 如果目录不存在：自动创建，并友好提示后退出（不会继续执行，也不会切换到 Mode 1）
    - 如果目录存在但没有 .xlsx：友好提示后退出
    """
    if not os.path.isdir(ORDER_IDS_DIR):
        print(f"[WARN] 订单工作簿目录不存在，将自动创建: {ORDER_IDS_DIR}")
        os.makedirs(ORDER_IDS_DIR, exist_ok=True)
        print(
            "[提示] 未检测到工作簿。请把需要处理的订单工作簿放入此文件夹后重新运行 Mode 2。"
        )
        raise SystemExit(0)

    candidates = [
        os.path.join(ORDER_IDS_DIR, f)
        for f in os.listdir(ORDER_IDS_DIR)
        if f.lower().endswith(".xlsx")
    ]
    if not candidates:
        print(
            f"[提示] 在 {ORDER_IDS_DIR} 未检测到任何 .xlsx 工作簿。请先放入订单工作簿后再运行 Mode 2。"
        )
        raise SystemExit(0)

    latest = max(candidates, key=os.path.getmtime)
    print(f"[INFO] 使用最新订单工作簿: {latest}")
    return latest


def extract_order_ids_from_workbook(xlsx_path: str) -> list[str]:
    """\
    使用 pandas 读取 Excel：
      - 可以读取处于“打开状态”的 Excel（只要没有被独占写锁）
      - 自动寻找 'Order No' 列；找不到则用第一列
    """
    try:
        df = pd.read_excel(xlsx_path, dtype=str)
    except Exception as e:
        raise RuntimeError(f"无法读取 Excel: {e}")

    df.columns = [str(c).strip() for c in df.columns]

    target_col = None
    for col in df.columns:
        l = col.lower()
        if "order" in l and "no" in l:
            target_col = col
            print(f"[INFO] 检测到订单号列: {col}")
            break

    if target_col is None:
        target_col = df.columns[0]
        print(f"[WARN] 未检测到账单列，默认使用第一列: {target_col}")

    order_ids_raw = (
        df[target_col].dropna().astype(str).str.strip().tolist()
    )

    cleaned: list[str] = []
    seen = set()
    for oid in order_ids_raw:
        if not oid:
            continue
        low = oid.lower()
        if low in ("order id", "order no", "订单号"):
            continue
        if oid not in seen:
            seen.add(oid)
            cleaned.append(oid)

    print(f"[INFO] 从工作簿读取到 {len(cleaned)} 个唯一 orderId。")
    return cleaned


def resolve_package_ids_from_order_ids(
    session: requests.Session,
    headers: dict,
    order_ids: list[str],
) -> list[str]:
    package_ids: list[str] = []
    seen = set()
    for oid in order_ids:
        oid = oid.strip()
        if not oid:
            continue
        pkg = query_package_id_from_order_id(session, headers, oid)
        if pkg and pkg not in seen:
            seen.add(pkg)
            package_ids.append(pkg)
    print(
        f"[INFO] 在待审核中找到 {len(package_ids)} 个包裹 (由工作簿转换而来)。"
    )
    return package_ids



# ================== Cleanup helpers (Mode 2) ==================


def delete_processed_order_ids_workbook(xlsx_path: str) -> None:
    """    Mode 2 清理：当订单工作簿已成功处理后，删除该工作簿，避免重复处理。

    安全保护：
      - 仅允许删除 ORDER_IDS_DIR 目录下的文件
      - 若删除失败，仅提示警告，不影响主流程
    """
    try:
        abs_path = os.path.abspath(xlsx_path)
        expected_dir = os.path.abspath(ORDER_IDS_DIR)
        if os.path.dirname(abs_path) != expected_dir:
            print(
                f"[WARN] 拒绝删除不在 ORDER_IDS_DIR 内的文件: {abs_path}\n"
                f"       期望目录: {expected_dir}"
            )
            return

        if os.path.exists(abs_path):
            os.remove(abs_path)
            print(f"[CLEANUP] 已删除已处理的订单工作簿: {abs_path}")
        else:
            print(f"[CLEANUP] 订单工作簿不存在（可能已被删除）: {abs_path}")
    except Exception as e:
        print(f"[WARN] 删除订单工作簿失败: {xlsx_path}")
        print(f"       原因: {e}")


# ================== Export & Download ==================


def chunk_list(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def call_export_pick_data(
    session: requests.Session,
    headers: dict,
    package_ids: List[str],
    is_all: int = 0,
) -> str:
    """创建导出任务，返回 uuid。"""
    url = "https://www.dianxiaomi.com/order/exportPickData.json"
    joined_ids = ",".join(package_ids)

    print(f"[INFO] 调用 exportPickData.json, 包裹数={len(package_ids)}")
    payload = {
        "packageIds": joined_ids,
        "orderField": "order_pay_time",
        "isSearch": 0,
        "isAll": is_all,
    }

    resp = session.post(url, data=payload, headers=headers)
    print(f"[HTTP] exportPickData.json status = {resp.status_code}")
    if resp.status_code != 200:
        raise RuntimeError("exportPickData.json 调用失败")

    data = resp.json()
    print("[DEBUG] exportPickData 返回:", data)
    uuid = data.get("uuid")
    if not uuid:
        raise RuntimeError("exportPickData.json 返回没有 uuid")
    print(f"[INFO] 导出任务 uuid = {uuid}")
    return uuid


def poll_check_process(
    session: requests.Session,
    headers: dict,
    uuid: str,
    max_tries: int = 20,
    interval: int = 2,
) -> str:
    """轮询 checkProcess.json，直到拿到下载链接。"""
    url = "https://www.dianxiaomi.com/checkProcess.json"
    payload = {"uuid": uuid}

    for i in range(1, max_tries + 1):
        print(f"[INFO] 第 {i}/{max_tries} 次检查导出进度...")
        resp = session.post(url, data=payload, headers=headers)
        print(f"[HTTP] checkProcess.json status = {resp.status_code}")
        if resp.status_code != 200:
            time.sleep(interval)
            continue

        try:
            data = resp.json()
        except Exception as e:
            print("[WARN] checkProcess JSON 解析失败:", e)
            time.sleep(interval)
            continue

        print("[DEBUG] checkProcess 返回:", data)
        process_msg = data.get("processMsg") or {}
        code = process_msg.get("code")
        msg = process_msg.get("msg")
        total_num = process_msg.get("totalNum")
        num = process_msg.get("num")
        print(f"[INFO] code={code}, num={num}, totalNum={total_num}, msg={msg}")

        if code == 1 and isinstance(msg, str) and msg.startswith("http"):
            print("[OK] 导出完成，拿到下载链接。")
            return msg

        time.sleep(interval)

    raise RuntimeError("checkProcess.json 多次检查仍未拿到下载链接。")


def summarise_picklist_by_sku(xlsx_path: str) -> None:
    """\
    按 SKU 汇总拣货单：
      - 同一 SKU 的数量求和
      - 其它信息（仓库 / 商品编码 / 名称 / 货架位 / 拣货备注 / 客服备注）
        取该 SKU 的第一行作为代表
      - 覆盖写回到原始文件 xlsx_path
    如果文件中没有 SKU/数量 列，则什么都不做。
    """
    try:
        df = pd.read_excel(xlsx_path)
    except Exception as e:
        print(f"[WARN] 无法读取 Excel 做汇总: {e}")
        return

    cols = [str(c) for c in df.columns]
    if "SKU" not in cols or "数量" not in cols:
        print("[WARN] Excel 中没有 SKU / 数量 列，跳过汇总。")
        return

    df["SKU"] = df["SKU"].astype(str).fillna("").str.strip()
    df["数量"] = pd.to_numeric(df["数量"], errors="coerce").fillna(0)

    qty_df = df.groupby("SKU", as_index=False)["数量"].sum()

    prefer_cols = ["仓库", "商品编码", "名称", "货架位", "拣货备注", "客服备注"]
    keep_cols = ["SKU"] + [c for c in prefer_cols if c in df.columns]

    first_df = df.sort_values("SKU").drop_duplicates("SKU", keep="first")[keep_cols]

    summary = first_df.merge(qty_df, on="SKU", how="left")

    out_cols = ["SKU"]
    for c in ["仓库", "商品编码", "名称", "货架位"]:
        if c in summary.columns:
            out_cols.append(c)
    out_cols.append("数量")
    for c in ["拣货备注", "客服备注"]:
        if c in summary.columns:
            out_cols.append(c)

    summary = summary[out_cols]

    summary.to_excel(xlsx_path, index=False)
    print(f"[INFO] 已按 SKU 汇总并覆盖原拣货单: {xlsx_path}")


def download_excel(session: requests.Session, url: str) -> str:
    """\
    下载 Excel 文件到 DOWNLOAD_DIR，返回本地路径。
    下载完成后，自动按 SKU 做汇总，并覆盖原文件。
    """
    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    parsed = urllib.parse.urlparse(url)
    filename = os.path.basename(parsed.path) or "export.xlsx"
    local_path = os.path.join(DOWNLOAD_DIR, filename)

    print(f"[INFO] 下载 Excel 文件: {url}")
    print(f"[INFO] 保存到: {local_path}")

    dl_headers = {
        "User-Agent": UA,
        "Referer": "https://www.dianxiaomi.com/",
    }

    with session.get(url, headers=dl_headers, stream=True) as r:
        r.raise_for_status()
        with open(local_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

    print("[OK] Excel 文件已下载:", local_path)

    try:
        summarise_picklist_by_sku(local_path)
    except Exception as e:
        print(f"[WARN] 汇总拣货单时出错（保留原文件）: {e}")

    return local_path


# ================== 审核 batchAudit ==================


def call_batch_audit(
    session: requests.Session,
    headers: dict,
    package_ids: List[str],
):
    url = "https://www.dianxiaomi.com/api/package/batchAudit.json"
    joined_ids = ",".join(package_ids)

    print("=== 调用 batchAudit.json 批量审核 ===")
    print(f"[INFO] 本次审核包裹数 = {len(package_ids)}")

    payload = {"packageIds": joined_ids}
    resp = session.post(url, data=payload, headers=headers)
    print(f"[HTTP] batchAudit.json status = {resp.status_code}")
    if resp.status_code != 200:
        raise RuntimeError("batchAudit.json 调用失败")

    try:
        data = resp.json()
    except Exception as e:
        print("[ERROR] 解析 batchAudit JSON 失败:", e)
        print(resp.text[:500])
        return

    print("[PARSED JSON]", data)
    code = data.get("code")
    msg = data.get("msg")
    if code == 0:
        print("[OK] 批量审核成功, msg =", msg)
    else:
        print("[WARN] 批量审核返回异常, code =", code, "msg =", msg)


# ================== PUBLIC API (for pipeline) ==================


def export_from_dxm(
    mode: int = 1,
    workbook_path: str | None = None,
) -> tuple[list[str], list[str]]:
    """\
    供外部调用的主函数:
      mode=1: 导出所有【待审核】订单
      mode=2: 从订单工作簿读取 orderId，再导出对应【待审核】订单

    返回:
      (downloaded_files, package_ids)
    """
    session, headers = make_session()

    if mode == 1:
        print("=== MODE 1: 导出所有【待审核】订单 ===")
        rows = get_all_pending_packages(session, headers)

        package_ids: list[str] = []
        seen = set()
        for r in rows:
            pkg = r.get("idStr") or str(r.get("id"))
            if pkg and pkg not in seen:
                seen.add(pkg)
                package_ids.append(pkg)

        if not package_ids:
            print("[INFO] 当前没有任何订单在【待审核】，无需导出。")
            return [], []

    elif mode == 2:
        print("=== MODE 2: 从订单工作簿导出【待审核】订单 ===")
        if workbook_path is None:
            workbook_path = find_latest_order_ids_workbook()
        print(f"[INFO] 使用订单工作簿: {workbook_path}")

        order_ids = extract_order_ids_from_workbook(workbook_path)
        if not order_ids:
            print("[INFO] 工作簿中没有有效 orderId。")
            return [], []

        package_ids = resolve_package_ids_from_order_ids(
            session, headers, order_ids
        )
        if not package_ids:
            print("[INFO] 这些订单中，没有任何一单当前在【待审核】。")
            return [], []
    else:
        raise ValueError("mode 只能是 1 或 2")

    print(f"[INFO] 此次需要处理 {len(package_ids)} 个包裹。")

    downloaded_files: list[str] = []
    if DO_EXPORT:
        for idx, chunk in enumerate(
            chunk_list(package_ids, MAX_ORDERS), start=1
        ):
            print(f"\n--- 导出批次 {idx}, 数量 {len(chunk)} ---")
            uuid = call_export_pick_data(session, headers, chunk, is_all=0)
            url = poll_check_process(session, headers, uuid)
            path = download_excel(session, url)
            downloaded_files.append(path)
    else:
        print("[INFO] DO_EXPORT = False，跳过导出。")

    return downloaded_files, package_ids


def audit_packages(package_ids: list[str]) -> None:
    """\
    供外部调用的审核函数:
      - 按 MAX_ORDERS 分批调用 batchAudit.json
    """
    if not package_ids:
        print("[INFO] audit_packages: package_ids 为空，跳过审核。")
        return

    session, headers = make_session()
    for idx, chunk in enumerate(
        chunk_list(package_ids, MAX_ORDERS), start=1
    ):
        print(f"\n--- 审核批次 {idx}, 数量 {len(chunk)} ---")
        call_batch_audit(session, headers, chunk)


# ================== CLI FLOWS ==================


def export_and_maybe_audit(mode: int, workbook_path: str | None = None):
    """    CLI 主流程：
      - mode=1: 导出所有【待审核】订单，然后按配置决定是否审核
      - mode=2: 使用 ORDER_IDS_DIR 中最新工作簿（或指定 workbook_path）导出，然后按配置决定是否审核
              当 Mode 2 成功处理完该工作簿后，会自动删除该工作簿，避免重复处理。
    """
    wb_to_delete: str | None = None
    if mode == 2:
        if workbook_path is None:
            workbook_path = find_latest_order_ids_workbook()
        wb_to_delete = workbook_path

    success = False
    try:
        downloaded_files, package_ids = export_from_dxm(mode, workbook_path=workbook_path)

        if not package_ids:
            print("[INFO] 没有需要审核的包裹。")
            success = True
            return

        effective_do_audit = (not DRY_RUN) and DO_AUDIT
        if DRY_RUN:
            print("[INFO] DRY_RUN = True，本次不会调用审核。")

        if effective_do_audit:
            audit_packages(package_ids)
        else:
            print("[INFO] 本次不执行审核。")

        success = True
    finally:
        if mode == 2 and wb_to_delete and success:
            delete_processed_order_ids_workbook(wb_to_delete)


def run_mode1_all_pending():

    export_and_maybe_audit(mode=1)


def run_mode2_from_workbook():
    export_and_maybe_audit(mode=2)


# ================== MAIN MENU ==================


def main():
    print("=== Dianxiaomi Export & Audit ===")
    print(f"WORK_DIR      : {WORK_DIR}")
    print(f"ORDER_IDS_DIR : {ORDER_IDS_DIR}")
    print(f"DOWNLOAD_DIR  : {DOWNLOAD_DIR}")
    print()
    print(f"DRY_RUN   = {DRY_RUN}")
    print(f"DO_EXPORT = {DO_EXPORT}")
    print(f"DO_AUDIT  = {DO_AUDIT}")
    print()
    print("1. 导出 + (可选)审核 所有【待审核】订单  (Mode 1)")
    print("2. 从订单工作簿导出 + (可选)审核          (Mode 2)")
    print("3. 取消")
    choice = input("请选择 (1/2/3): ").strip()

    if choice == "1":
        run_mode1_all_pending()
    elif choice == "2":
        run_mode2_from_workbook()
    else:
        print("已取消。")


if __name__ == "__main__":
    main()
