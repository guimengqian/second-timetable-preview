"""Build moe_0503_rows.csv and moe_0503_summary.csv from parsed/all_rows_<year>.csv.

Usage: python -I build_outputs.py <moe_dir>
"""
import collections
import csv
import re
import sys

NOTICES = {
    "2019": ("http://www.moe.gov.cn/srcsite/A08/moe_1034/s4930/202003/t20200303_426853.html",
             "附件1 2019年度普通高等学校本科专业备案和审批结果（W020200303365402032446.pdf，扫描件，OCR）"),
    "2020": ("http://www.moe.gov.cn/srcsite/A08/moe_1034/s4930/202103/t20210301_516076.html",
             "附件1 2020年度普通高等学校本科专业备案和审批结果（W020210302545152199812.xls）"),
    "2021": ("http://www.moe.gov.cn/srcsite/A08/moe_1034/s4930/202202/t20220224_602135.html",
             "附件1 2021年度普通高等学校本科专业备案和审批结果（W020220228600206028276.pdf）"),
    "2022": ("http://www.moe.gov.cn/srcsite/A08/moe_1034/s4930/202304/t20230419_1056224.html",
             "附件1 2022年度普通高等学校本科专业备案和审批结果（W020230419336779647503.pdf）"),
    "2023": ("http://www.moe.gov.cn/srcsite/A08/moe_1034/s4930/202403/t20240319_1121111.html",
             "附件1 2023年度普通高等学校本科专业备案和审批结果（W020240319305498774149.pdf）"),
    "2024": ("http://www.moe.gov.cn/srcsite/A08/moe_1034/s4930/202504/t20250422_1188239.html",
             "附件1 2024年度普通高等学校本科专业备案和审批结果（W020250422312780758186.pdf）"),
}

SECTION_TYPE = {"一": "新增备案", "二": "新增审批", "三": "调整", "四": "撤销"}

# 2019 scanned attachment: fields verified by eye against the page images where OCR dropped them
OVERRIDES_2019 = {
    ("一", "716"): {"school": "巢湖学院"},
    ("一", "1155"): {"school": "湖北工程学院新技术学院"},
    ("一", "1273"): {"school": "广东外语外贸大学南国商学院"},
    ("一", "1407"): {"school": "四川外国语大学重庆南方翻译学院"},
    ("一", "1409"): {"school": "重庆师范大学涉外商贸学院"},
    ("一", "874"): {"note": "△"},
    ("一", "953"): {"note": "△"},
    ("一", "972"): {"note": "△"},
    ("一", "991"): {"note": "△"},
    ("一", "1129"): {"note": "△"},
    ("二", "78"): {"note": "新专业（交叉）；附件所列代码99J001T为临时代码，目录(2020年版)起列为050310T会展"},
    ("四", "357"): {"years": "四年"},
}
# seq numbers OCR could not read for 0503 rows, filled from the page image
SEQ_FIX_2019 = {("一", "巢湖学院", "网络与新媒体"): "716"}

# Schools located in Beijing that appear in 0503 rows under a central ministry header
# (group == 北京市 rows are Beijing by definition). Checked by school name.
BEIJING_CENTRAL = {
    "北京语言大学", "对外经济贸易大学", "中国人民大学", "北京交通大学", "北京邮电大学",
    "中国传媒大学", "华北电力大学", "中国劳动关系学院", "外交学院", "北京航空航天大学",
    "中央民族大学", "中国社会科学院大学", "北京体育大学", "北京外国语大学", "中国农业大学",
}
BEIJING_CAVEAT = {"华北电力大学": "校本部在北京，另有保定校区；附件未注明校区"}


def code_of(r):
    return re.sub(r"[^0-9A-Z]", "", r["major_code"])


def is_0503(r):
    return code_of(r).startswith("0503") or r["major_name"] == "会展"


def list_type(r, year):
    sec = r["section"][:1]
    if year in ("2023", "2024"):
        if "调整" in r["note"]:
            return "调整"
        return "新增（附件未分备案/审批）"
    return SECTION_TYPE.get(sec, "未知")


def main(moe):
    out_rows = []
    for year, (url, att) in NOTICES.items():
        for r in csv.DictReader(open(f"{moe}/parsed/all_rows_{year}.csv", encoding="utf-8")):
            if not is_0503(r):
                continue
            sec = r["section"][:1]
            if year == "2019":
                fix = SEQ_FIX_2019.get((sec, r["school"], r["major_name"]))
                if fix:
                    r["seq"] = fix
                r.update(OVERRIDES_2019.get((sec, r["seq"]), {}))
                if r["note"] == "A":  # OCR reading of △, all such rows re-checked above
                    r["note"] = "△"
            group = r["group"]
            beijing = group == "北京市" or r["school"] in BEIJING_CENTRAL
            note_bits = [r["note"]] if r["note"] else []
            out_rows.append({
                "year": year,
                "list_type": list_type(r, year),
                "school": r["school"],
                "province_or_region": group,
                "major_code": code_of(r),
                "major_name": r["major_name"],
                "years": r["years"],
                "degree_or_note": "；".join([r["degree"]] + note_bits),
                "source_url": url,
                "attachment_name": att,
                "seq_in_attachment": r["seq"],
                "section_in_attachment": r["section"].replace("撒销", "撤销"),
                "page_or_cell": r["page"],
                "beijing": "是" if beijing else "",
                "beijing_basis": ("附件分组=北京市" if group == "北京市" else
                                  ("校址在北京（中央部门所属）" + ("；" + BEIJING_CAVEAT[r["school"]] if r["school"] in BEIJING_CAVEAT else ""))
                                  if beijing else ""),
                "extraction": "OCR(macOS Vision)+逐行目视核对扫描图" if year == "2019" else
                              ("xlrd读取xls单元格" if year == "2020" else "pdfplumber读取PDF文本层表格"),
            })
    fields = list(out_rows[0].keys())
    with open(f"{moe}/moe_0503_rows.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(out_rows)

    # summary: year x list_type x major (+ subtotal per year x list_type)
    cnt = collections.Counter((r["year"], r["list_type"], r["major_code"], r["major_name"]) for r in out_rows)
    bj = collections.Counter((r["year"], r["list_type"], r["major_code"], r["major_name"]) for r in out_rows if r["beijing"])
    dual = collections.Counter((r["year"], r["list_type"], r["major_code"], r["major_name"]) for r in out_rows if "二学位" in r["degree_or_note"])
    sub = collections.Counter((r["year"], r["list_type"]) for r in out_rows)
    subbj = collections.Counter((r["year"], r["list_type"]) for r in out_rows if r["beijing"])
    subdual = collections.Counter((r["year"], r["list_type"]) for r in out_rows if "二学位" in r["degree_or_note"])
    with open(f"{moe}/moe_0503_summary.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["year", "list_type", "major_code", "major_name", "count", "of_which_beijing",
                     "of_which_second_degree(二学位)", "source_url"])
        for (y, t) in sorted(sub):
            for (yy, tt, c, n) in sorted(k for k in cnt if k[0] == y and k[1] == t):
                w.writerow([y, t, c, n, cnt[(yy, tt, c, n)], bj[(yy, tt, c, n)], dual[(yy, tt, c, n)], NOTICES[y][0]])
            w.writerow([y, t, "0503合计", "新闻传播学类小计", sub[(y, t)], subbj[(y, t)], subdual[(y, t)], NOTICES[y][0]])
        # explicit zero / not-published rows so absence is not misread
        for y in ("2019", "2020", "2021", "2022"):
            for t in ("新增备案", "新增审批", "调整", "撤销"):
                if (y, t) not in sub:
                    w.writerow([y, t, "0503合计", "新闻传播学类小计（附件该节无0503条目）", 0, 0, 0, NOTICES[y][0]])
        for y in ("2023", "2024"):
            if (y, "调整") not in sub:
                w.writerow([y, "调整", "0503合计", "新闻传播学类小计（附件无0503调整条目）", 0, 0, 0, NOTICES[y][0]])
            w.writerow([y, "撤销", "0503合计", "附件无撤销名单，0503撤销数无法从教育部原文得出", "未公布", "未公布", "未公布", NOTICES[y][0]])
        for t in ("新增", "撤销", "停招"):
            w.writerow(["2025", t, "0503合计", "教育部未公布2025年度备案和审批结果名单", "未公布", "未公布", "未公布",
                        "http://www.moe.gov.cn/srcsite/A08/moe_1034/s3882/202604/t20260427_1434931.html"])
    for k in sorted(sub):
        print(k, sub[k], "beijing", subbj[k], "二学位", subdual[k])
    print("total rows", len(out_rows), "beijing", sum(1 for r in out_rows if r["beijing"]))


if __name__ == "__main__":
    main(sys.argv[1])
