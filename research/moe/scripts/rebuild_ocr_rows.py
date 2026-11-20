"""Rebuild table rows from Vision OCR boxes of the scanned 2019年度 attachment.

Usage: python -I rebuild_ocr_rows.py <ocr.json> <year> <out_all_rows.csv>
Columns are assigned by x-position relative to the 专业代码 column detected on each page;
rows are grouped by y-centre. Output has the same schema as parse_pdf.py plus `ocr_raw`
(all text on the row) so OCR errors can be audited.
"""
import csv
import json
import re
import statistics
import sys

SECTION_RE = re.compile(r"^([一二三四五六七八九十]+)[、,，.]\s*(.+?名单)")
CODE_RE = re.compile(r"^\d{6}[A-Z]{0,3}$")
# column left edges relative to the code column's left edge (from page 1 geometry)
REL = {"seq": -0.51, "school": -0.454, "major": -0.25, "code": -0.01, "degree": 0.091,
       "years": 0.172, "note": 0.231}
ORDER = ["seq", "school", "major", "code", "degree", "years", "note"]


def fix_code(t):
    t = t.replace(" ", "").replace("O", "0").replace("o", "0").replace("I", "1").replace("l", "1")
    return t


def main(ocr_path, year, out_path):
    data = json.load(open(ocr_path, encoding="utf-8"))
    rows, section, group = [], "（附件未分节）", ""
    for page in sorted(data):
        boxes = data[page]
        code_x = [b["x"] for b in boxes if re.match(r"^\d{6}[A-Z]{0,3}$", fix_code(b["text"]))]
        if not code_x:
            continue
        cx = statistics.median(code_x)
        edges = {k: cx + v for k, v in REL.items()}
        # cluster by y-centre
        boxes = sorted(boxes, key=lambda b: b["y"] + b["h"] / 2)
        lines, cur, cur_y = [], [], None
        for b in boxes:
            yc = b["y"] + b["h"] / 2
            if cur and abs(yc - cur_y) > 0.007:
                lines.append(cur)
                cur = []
            cur.append(b)
            cur_y = yc if len(cur) == 1 else (cur_y * (len(cur) - 1) + yc) / len(cur)
        if cur:
            lines.append(cur)
        for line in lines:
            line.sort(key=lambda b: b["x"])
            raw = " ".join(b["text"] for b in line)
            joined = re.sub(r"\s+", "", raw)
            m = SECTION_RE.match(joined)
            if m:
                section, group = m.group(1) + "、" + m.group(2), ""
                continue
            cells = {k: "" for k in ORDER}
            for b in line:
                col = "seq"
                for k in ORDER:
                    if b["x"] + 0.004 >= edges[k]:
                        col = k
                cells[col] += b["text"].replace(" ", "")
            if not cells["code"] and not cells["seq"].isdigit():
                if len(line) == 1 and 0.3 < line[0]["x"] + line[0]["w"] / 2 < 0.7 \
                        and "序号" not in joined and "附件" not in joined and "年度" not in joined \
                        and not re.match(r"^-?\d+-?$", joined):
                    group = joined
                continue
            if cells["seq"] == "序号" or "专业代码" in joined:
                continue
            cells["code"] = fix_code(cells["code"])
            rows.append(dict(year=year, page=page, section=section, group=group,
                             seq=cells["seq"], school=cells["school"], major_name=cells["major"],
                             major_code=cells["code"], degree=cells["degree"], years=cells["years"],
                             note=cells["note"], code_ok=bool(CODE_RE.match(cells["code"])),
                             ocr_raw=raw))
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print("rows", len(rows), "bad code", sum(not r["code_ok"] for r in rows))


if __name__ == "__main__":
    main(*sys.argv[1:4])
