"""由 research/ 下的原始表计算全部图表数据 → assets/data/story.json

运行：python3 -I tools/build_data.py
页面上的每个数字都应能在这里找到计算过程，或在 MANUAL 中找到来源链接。
"""
import csv
import json
import os
from collections import Counter, defaultdict

ROOT = os.path.join(os.path.dirname(__file__), "..")
R = lambda *p: os.path.join(ROOT, "research", *p)


def read(path):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


SKILLS = ["写作表达", "新闻采编与判断", "选题策划", "视频与视听制作", "平台与账号运营", "外语", "财经与商业知识",
          "用户与传播效果", "视觉与设计", "数据分析与指标", "编程与数据工具", "AI工具与大模型", "沟通协作（通用）"]


def group_of(row):
    if row["group"] == "互联网大厂":
        return "互联网·数据岗" if row["job_category"] == "数据分析" else "互联网·内容岗"
    return row["group"]


def jobs_block():
    m = read(R("jd_skill_matrix.csv"))
    jd = {x["id"]: x for x in read(R("jd_all.csv"))}
    groups = ["中央媒体", "市场化媒体", "互联网·内容岗", "互联网·数据岗"]
    by = defaultdict(list)
    for x in m:
        by[group_of(x)].append(x)
    skills = []
    for s in SKILLS:
        skills.append({"skill": s, **{g: sum(int(x[s]) for x in by[g]) for g in groups}})
    n = {g: len(by[g]) for g in groups}

    # 三类雇主（词云圈）：互联网合并
    big = defaultdict(list)
    for x in m:
        big[x["group"]].append(x)
    circles = []
    for g in ["中央媒体", "市场化媒体", "互联网大厂"]:
        circles.append({"group": g, "n": len(big[g]),
                        "words": sorted([{"skill": s, "count": sum(int(x[s]) for x in big[g])} for s in SKILLS],
                                        key=lambda d: -d["count"])})

    # 专业门槛
    majors = []
    for g in ["中央媒体", "市场化媒体", "互联网大厂"]:
        rows = big[g]
        c = Counter(x["专业表述"] for x in rows)
        majors.append({"group": g, "n": len(rows),
                       "限定": c.get("专业限定", 0), "优先": c.get("专业优先", 0),
                       "未提或不限": c.get("未提专业", 0) + c.get("专业不限", 0),
                       "点名新传": sum(int(x["提到新闻传播"]) for x in rows),
                       "点名理工数统计算机": sum(int(x["提到理工数统计算机"]) for x in rows)})

    # 样本构成
    comp = Counter((x["group"], x["job_category"]) for x in m)
    rtype = Counter(x["recruit_type"] for x in jd.values())
    dates = sorted(x["publish_date"] for x in jd.values() if x["publish_date"])
    employers = len(set(x["employer"].split("（")[0] for x in jd.values()))
    return {
        "n_total": len(m), "n": n, "groups": groups, "skills": skills, "circles": circles, "majors": majors,
        "composition": [{"group": g, "category": c, "n": k} for (g, c), k in sorted(comp.items())],
        "recruit_type": dict(rtype), "date_range": [dates[0], dates[-1]], "n_dated": len(dates),
        "n_employers": employers,
        "coding_check": {
            "method": "以关键词规则独立复核人工编码，计算 Cohen's κ",
            "AI工具与大模型": 0.78, "数据分析与指标": 0.92, "编程与数据工具": 1.00, "新闻采编与判断": 0.73,
            "note": "分歧均为语义差异（如“AI”指 Adobe Illustrator、“人工智能”作为报道领域），保留人工编码",
        },
    }


# 失眠段落里弹出的招聘原文（id 对应 research/jd_all.csv）
JD_QUOTES = [
    ("net-05", "具备SQL、Python等数据分析相关能力"),
    ("net-12", "熟练使用AIGC工具辅助内容创作，在过程中能够进行有效判断并修改，而非直接依赖生成结果"),
    ("mkt-01", "大学本科及以上学历，经济、管理、理工科等相关专业优先"),
    ("net-02", "统计学、应用数学、计算机等相关专业背景优先"),
    ("net-19", "熟练使用AI工具（如通用对话式AI、AI写作助手等）辅助内容策划与生产"),
    ("mkt-04", "一周至少能出勤3天，持续实习3个月及以上"),
    ("net-05", "能对AI的输出进行高质量判断，具备人机协同的工作意识和习惯"),
    ("mkt-07", "有数据分析能力，用Python等代码分析更佳"),
]


def quotes_block():
    jd = {x["id"]: x for x in read(R("jd_all.csv"))}
    out = []
    for i, q in JD_QUOTES:
        x = jd[i]
        t = " ".join(x[f] for f in ("requirements", "preferred", "responsibilities")).replace(" ", "")
        assert q.replace(" ", "") in t, f"引文与原文不符：{i} {q}"
        out.append({"id": i, "quote": q, "employer": x["employer"].split("（")[0], "title": x["title"], "url": x["url"]})
    return out


def courses_block():
    rows = read(R("courses.csv"))
    return {"n": len(rows), "by_program": dict(Counter(r.get("program_id", "") for r in rows))}


# 无法由 CSV 计算、直接取自公开原文的数字（附来源）
MANUAL = {
    "moe_2024": {
        "label": "2024年度", "停招": 2220, "新增": 1839, "撤销": 1428, "调整门类或年限": 157, "布点总数": "6.28万",
        "src": "http://www.moe.gov.cn/jyb_xwfb/s271/202504/t20250422_1188246.html",
        "src2": "http://www.moe.gov.cn/srcsite/A08/moe_1034/s4930/202504/t20250422_1188239.html",
    },
    "moe_0503_2024": {
        "total": 44,
        "by_major": [["网络与新媒体", 23], ["国际新闻与传播", 7], ["传播学", 6], ["数字出版", 4], ["时尚传播", 3], ["新闻学", 1]],
        "beijing": 5,
        "src": "http://www.moe.gov.cn/srcsite/A08/moe_1034/s4930/202504/W020250422312780758186.pdf",
    },
    "cuc_directions": {
        "rows": [
            ["传播学（智能与计算传播）", "2022开设，2024升级", 7, 24],
            ["传播学（舆情分析）", "2022年开设", 7, 24],
            ["新闻学（数据新闻）", "2014年开设实验班", 7, 24],
            ["新闻学（新闻舆论学）", "官网未注明开设年份", 3, 24],
            ["新闻学", "1959年开设", 2, 25],
            ["传播学", "国内最早的传播学本科之一", 2, 26],
        ],
        "rule": "课程名称含“数据”“计算”“Python”“网页抓取”“自然语言”“统计”“社会网络分析”计入；以“数字”命名者不计入",
        "src": "https://xinwenxueyuan.cuc.edu.cn/7492/list.htm",
    },
    "cuc_minor": {
        "blocks": [["新闻史论", 6], ["新闻采写编", 6], ["数据与数字新闻", 4]],
        "data_courses": [["数据新闻报道概论", 2, 32], ["数字新闻学原理", 2, 32]],
        "price_per_credit": 130, "degree_credits": 40, "cert_credits": 25, "plan": 150,
        "time": "周三晚、周五晚及周末",
        "src": "https://jwc.cuc.edu.cn/_upload/article/files/a2/61/24a43fbe4205b88bba7295844445/54f7d5f7-2be3-436a-89fb-38efc9aa90de.pdf",
    },
    "cuc_cut16": {
        "groups": [
            ["艺术类", "2026年艺术类校考招生计划中消失", ["摄影", "视觉传达设计", "漫画", "新媒体艺术", "动画（游戏艺术方向）"]],
            ["经管理工类", "2025年本科专业设置公示：拟撤销", ["国际经济与贸易", "社会学", "应用统计学", "会计学", "思想政治教育", "光电信息科学与工程", "自动化"]],
            ["语言类", "并入国际传播、双语播音等方向", ["翻译", "波斯语", "越南语", "另1个（报道未列名）"]],
        ],
        "added": ["智能视听工程", "智能工程与创意设计", "智能影像艺术", "游戏艺术设计"],
        "src": ["http://sc.people.com.cn/n2/2026/0311/c345167-41520639.html",
                "https://finance.sina.com.cn/jjxw/2026-03-11/doc-inhqrfck5579652.shtml"],
    },
}


def main():
    story = json.load(open(os.path.join(ROOT, "story-data.json"), encoding="utf-8"))
    data = {
        "jobs": jobs_block(),
        "jd_quotes": quotes_block(),
        "courses": courses_block(),
        "admissions": story["admissions"],
        "costs": story["costs"],
        **MANUAL,
    }
    moe = os.path.join(ROOT, "research", "moe", "moe_0503_summary.csv")
    if os.path.exists(moe):
        data["moe_0503_summary"] = read(moe)
    nat = os.path.join(ROOT, "research", "moe", "moe_national_totals.csv")
    if os.path.exists(nat):
        data["moe_national"] = read(nat)
    os.makedirs(os.path.join(ROOT, "assets", "data"), exist_ok=True)
    with open(os.path.join(ROOT, "assets", "data", "story.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    j = data["jobs"]
    print("JD", j["n_total"], j["n"], "employers", j["n_employers"], j["date_range"], j["recruit_type"])
    for mrow in j["majors"]:
        print(mrow)


if __name__ == "__main__":
    main()
