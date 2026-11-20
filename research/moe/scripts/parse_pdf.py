"""Parse MOE 本科专业备案和审批结果 PDF attachments (text-layer PDFs, 2021-2024年度).

Usage: python -I parse_pdf.py <pdf> <year> <out_all_rows.csv>
Writes every table row (all majors, not just 0503) with section + group header,
so 0503 filtering and sanity totals can be done downstream.
"""
import csv
import re
import sys

import pdfplumber

SECTION_RE = re.compile(r"^([一二三四五六七八九十]+)、\s*(.+?名单)")
CODE_RE = re.compile(r"^\d{6}[A-Z]{0,2}$")


def norm(s):
    return re.sub(r"\s+", "", s or "")


def main(pdf_path, year, out_path):
    rows = []
    section = "（附件未分节）"
    group = ""
    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            # section headings with their vertical position
            heads = []
            for line in page.extract_text_lines():
                m = SECTION_RE.match(norm(line["text"]))
                if m:
                    heads.append((line["top"], m.group(1) + "、" + m.group(2)))
            tables = page.find_tables()
            events = [(h[0], "head", h[1]) for h in heads]
            for t in tables:
                for r_idx, row in enumerate(t.rows):
                    top = row.bbox[1]
                    events.append((top, "row", (t, r_idx)))
            events.sort(key=lambda e: e[0])
            extracted = {id(t): t.extract() for t in tables}
            for top, kind, payload in events:
                if kind == "head":
                    section = payload
                    group = ""
                    continue
                t, r_idx = payload
                cells = [norm(c) for c in extracted[id(t)][r_idx]]
                if not any(cells):
                    continue
                if cells[0] == "序号":
                    continue
                nonempty = [c for c in cells if c]
                if len(nonempty) == 1 and not cells[0].isdigit():
                    group = nonempty[0]
                    continue
                cells += [""] * (7 - len(cells))
                seq, school, name, code, degree, years, note = cells[:7]
                rows.append(dict(year=year, page=pno, section=section, group=group,
                                 seq=seq, school=school, major_name=name,
                                 major_code=code, degree=degree, years=years,
                                 note=note, code_ok=bool(CODE_RE.match(code))))
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    bad = [r for r in rows if not r["code_ok"]]
    print(pdf_path, "rows", len(rows), "bad-code rows", len(bad))
    for r in bad[:15]:
        print("  BAD", r)


if __name__ == "__main__":
    main(*sys.argv[1:4])
