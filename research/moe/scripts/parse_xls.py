"""Parse the 2020年度 xls attachment (W020210302545152199812.xls) into the same row schema as parse_pdf.py.

Usage: python -I parse_xls.py <xls> <year> <out_all_rows.csv>
"""
import csv
import re
import sys

import xlrd

SECTION_RE = re.compile(r"^([一二三四五六七八九十]+)、\s*(.+?名单)")
CODE_RE = re.compile(r"^\d{6}[A-Z]{0,3}$")


def cell(v):
    if isinstance(v, float):
        v = str(int(v)) if v == int(v) else str(v)
    return re.sub(r"\s+", "", str(v))


def main(path, year, out_path):
    book = xlrd.open_workbook(path)
    rows = []
    for sheet in book.sheets():
        section, group = "（附件未分节）", ""
        for i in range(sheet.nrows):
            cells = [cell(v) for v in sheet.row_values(i)]
            nonempty = [c for c in cells if c]
            if not nonempty:
                continue
            m = SECTION_RE.match(cells[0])
            if m:
                section, group = m.group(1) + "、" + m.group(2), ""
                continue
            if cells[0] == "序号":
                continue
            if len(nonempty) == 1 and not cells[0].isdigit():
                group = nonempty[0]
                continue
            if not cells[0].isdigit():
                continue
            cells += [""] * (8 - len(cells))
            seq, school, name, code, degree, years, note = cells[:7]
            rows.append(dict(year=year, page=f"{sheet.name}!R{i + 1}", section=section,
                             group=group, seq=seq, school=school, major_name=name,
                             major_code=code, degree=degree, years=years, note=note,
                             code_ok=bool(CODE_RE.match(code))))
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(path, "rows", len(rows), "bad", sum(not r["code_ok"] for r in rows))


if __name__ == "__main__":
    main(*sys.argv[1:4])
