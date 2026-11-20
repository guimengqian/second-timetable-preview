"""生成全站手绘风格插画（SVG）。

所有插画由本脚本程序化绘制：线条经过抖动、双笔描边，再叠加粉笔颗粒滤镜，
模拟黑板粉笔 / 铅笔速写质感。运行：python3 tools/art.py  → 输出到 assets/art/
"""
import math
import os
import random

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "art")
os.makedirs(OUT, exist_ok=True)

CHALK = "#e8edf1"
BLUE = "#7fa3b5"
BLUE_D = "#4f7385"
CORAL = "#c96b6b"
PINK = "#e7a9a4"
NAVY = "#142232"
YELLOW = "#f3e3a0"

FONT = "PingFang SC, Hiragino Sans GB, Noto Sans SC, Microsoft YaHei, sans-serif"
HAND = "Kaiti SC, STKaiti, KaiTi, serif"

DEFS = f"""
<defs>
  <filter id="chalk" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="warp"/>
    <feDisplacementMap in="SourceGraphic" in2="warp" scale="2" xChannelSelector="R" yChannelSelector="G" result="w"/>
    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="9" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.7 1.5" result="gm"/>
    <feComposite in="w" in2="gm" operator="in"/>
  </filter>
  <filter id="soft" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.45" result="gm"/>
    <feComposite in="SourceGraphic" in2="gm" operator="in"/>
  </filter>
  <filter id="brush" x="-10%" y="-20%" width="120%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.09" numOctaves="3" seed="6" result="t"/>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="34" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.6 0.05" numOctaves="2" seed="1" result="s"/>
    <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.5" result="sm"/>
    <feComposite in="d" in2="sm" operator="in"/>
  </filter>
</defs>"""


class Pen:
    """抖动线条生成器：同一条线画两遍，模拟铅笔反复描。"""

    def __init__(self, seed=1, jitter=1.6):
        self.r = random.Random(seed)
        self.j = jitter

    def _seg(self, p0, p1, j):
        (x0, y0), (x1, y1) = p0, p1
        L = math.hypot(x1 - x0, y1 - y0)
        n = max(2, int(L / 26))
        pts = []
        for i in range(n + 1):
            t = i / n
            pts.append((x0 + (x1 - x0) * t + self.r.uniform(-j, j), y0 + (y1 - y0) * t + self.r.uniform(-j, j)))
        # 出头：起笔收笔略微越过端点
        ox, oy = (x1 - x0) / (L or 1), (y1 - y0) / (L or 1)
        e = self.r.uniform(0, 3.5)
        pts[0] = (pts[0][0] - ox * e, pts[0][1] - oy * e)
        pts[-1] = (pts[-1][0] + ox * e, pts[-1][1] + oy * e)
        return pts

    @staticmethod
    def _d(pts):
        d = f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"
        for i in range(1, len(pts)):
            x, y = pts[i]
            px, py = pts[i - 1]
            d += f" Q{px:.1f},{py:.1f} {(px + x) / 2:.1f},{(py + y) / 2:.1f}"
        d += f" L{pts[-1][0]:.1f},{pts[-1][1]:.1f}"
        return d

    def line(self, p0, p1, w=2, c=CHALK, passes=2, op=1):
        out = []
        for k in range(passes):
            pts = self._seg(p0, p1, self.j * (1 + k * 0.6))
            out.append(f'<path d="{self._d(pts)}" fill="none" stroke="{c}" stroke-width="{w * (1 - k * 0.35):.2f}" stroke-linecap="round" opacity="{op * (1 - k * 0.35):.2f}"/>')
        return "".join(out)

    def poly(self, pts, w=2, c=CHALK, closed=True, passes=2, op=1):
        s = ""
        seq = pts + ([pts[0]] if closed else [])
        for i in range(len(seq) - 1):
            s += self.line(seq[i], seq[i + 1], w, c, passes, op)
        return s

    def rect(self, x, y, rw, rh, **k):
        return self.poly([(x, y), (x + rw, y), (x + rw, y + rh), (x, y + rh)], **k)

    def ellipse(self, cx, cy, rx, ry, w=2, c=CHALK, passes=2, op=1, start=0, end=360):
        out = []
        for k in range(passes):
            pts = []
            n = 40
            a0 = math.radians(start + self.r.uniform(-8, 0))
            a1 = math.radians(end + self.r.uniform(0, 12))
            for i in range(n + 1):
                a = a0 + (a1 - a0) * i / n
                jj = self.j * (1 + k * 0.5)
                pts.append((cx + rx * math.cos(a) + self.r.uniform(-jj, jj), cy + ry * math.sin(a) + self.r.uniform(-jj, jj)))
            out.append(f'<path d="{self._d(pts)}" fill="none" stroke="{c}" stroke-width="{w * (1 - k * 0.35):.2f}" stroke-linecap="round" opacity="{op * (1 - k * 0.35):.2f}"/>')
        return "".join(out)

    def curve(self, pts, w=2, c=CHALK, passes=2, op=1):
        """穿过若干控制点的手绘曲线（Catmull-Rom → 采样）。"""
        dense = []
        P = [pts[0]] + pts + [pts[-1]]
        for i in range(1, len(P) - 2):
            p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
            for t in [j / 10 for j in range(10)]:
                t2, t3 = t * t, t * t * t
                x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
                y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
                dense.append((x, y))
        dense.append(pts[-1])
        out = []
        for k in range(passes):
            jj = self.j * (0.6 + k * 0.6)
            q = [(x + self.r.uniform(-jj, jj), y + self.r.uniform(-jj, jj)) for x, y in dense]
            out.append(f'<path d="{self._d(q)}" fill="none" stroke="{c}" stroke-width="{w * (1 - k * 0.35):.2f}" stroke-linecap="round" stroke-linejoin="round" opacity="{op * (1 - k * 0.35):.2f}"/>')
        return "".join(out)

    def hatch(self, x, y, w, h, gap=7, angle=45, c=CHALK, sw=1, op=0.5):
        """矩形区域内的斜线排线。"""
        s = ""
        a = math.radians(angle)
        dx, dy = math.cos(a), math.sin(a)
        diag = w + h
        for t in range(-int(diag), int(diag), gap):
            # 与矩形求交
            p0 = (x + t, y)
            p1 = (x + t + dx * diag * 2, y + dy * diag * 2)
            pts = clip_line(p0, p1, x, y, w, h)
            if pts:
                s += self.line(pts[0], pts[1], sw, c, passes=1, op=op)
        return s


def clip_line(p0, p1, x, y, w, h):
    (x0, y0), (x1, y1) = p0, p1
    t0, t1 = 0.0, 1.0
    dx, dy = x1 - x0, y1 - y0
    for p, q in ((-dx, x0 - x), (dx, x + w - x0), (-dy, y0 - y), (dy, y + h - y0)):
        if p == 0:
            if q < 0:
                return None
        else:
            t = q / p
            if p < 0:
                t0 = max(t0, t)
            else:
                t1 = min(t1, t)
    if t0 > t1:
        return None
    return (x0 + dx * t0, y0 + dy * t0), (x0 + dx * t1, y0 + dy * t1)


def svg(name, w, h, body, bg=None):
    bgr = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{DEFS}{bgr}{body}</svg>'
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(s)
    print("wrote", name, f"{len(s) / 1024:.0f}KB")


def text(x, y, t, size=18, c=CHALK, anchor="start", family=FONT, weight=400, op=1, rot=0):
    tr = f' transform="rotate({rot} {x} {y})"' if rot else ""
    return f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" fill="{c}" text-anchor="{anchor}" font-weight="{weight}" opacity="{op}"{tr}>{t}</text>'


# ---------------------------------------------------------------- 人物
def bust(pen, cx, cy, s=1.0, hair="short", c=CHALK, w=2.2, glasses=False, bag=False):
    """胸像轮廓：头 + 颈 + 肩。hair: short / long / pony / bob"""
    out = ""
    hr = 44 * s
    out += pen.ellipse(cx, cy, hr * 0.86, hr, w=w, c=c)
    # 颈与肩
    out += pen.curve([(cx - 16 * s, cy + hr * 0.92), (cx - 18 * s, cy + hr * 1.35), (cx - 60 * s, cy + hr * 1.6), (cx - 98 * s, cy + hr * 2.1), (cx - 112 * s, cy + hr * 3.4)], w=w, c=c)
    out += pen.curve([(cx + 16 * s, cy + hr * 0.92), (cx + 18 * s, cy + hr * 1.35), (cx + 60 * s, cy + hr * 1.6), (cx + 98 * s, cy + hr * 2.1), (cx + 112 * s, cy + hr * 3.4)], w=w, c=c)
    if hair == "short":
        out += pen.curve([(cx - hr * 0.9, cy + 4 * s), (cx - hr * 0.8, cy - hr * 0.7), (cx - hr * 0.2, cy - hr * 1.12), (cx + hr * 0.5, cy - hr * 1.0), (cx + hr * 0.92, cy - hr * 0.3), (cx + hr * 0.88, cy + 6 * s)], w=w, c=c)
        out += pen.curve([(cx - hr * 0.7, cy - hr * 0.5), (cx - hr * 0.1, cy - hr * 0.35), (cx + hr * 0.6, cy - hr * 0.6)], w=w * 0.8, c=c)
    elif hair == "long":
        out += pen.curve([(cx - hr * 0.95, cy + hr * 1.5), (cx - hr * 1.05, cy), (cx - hr * 0.6, cy - hr * 1.05), (cx + hr * 0.4, cy - hr * 1.12), (cx + hr * 1.02, cy - hr * 0.2), (cx + hr * 1.0, cy + hr * 1.5)], w=w, c=c)
        out += pen.curve([(cx - hr * 0.75, cy - hr * 0.3), (cx - hr * 0.1, cy - hr * 0.7), (cx + hr * 0.7, cy - hr * 0.35)], w=w * 0.8, c=c)
    elif hair == "pony":
        out += pen.curve([(cx - hr * 0.9, cy + 2 * s), (cx - hr * 0.85, cy - hr * 0.75), (cx, cy - hr * 1.12), (cx + hr * 0.8, cy - hr * 0.8), (cx + hr * 0.9, cy)], w=w, c=c)
        out += pen.curve([(cx + hr * 0.75, cy - hr * 0.7), (cx + hr * 1.35, cy - hr * 0.55), (cx + hr * 1.5, cy + hr * 0.2), (cx + hr * 1.25, cy + hr * 0.9)], w=w, c=c)
        out += pen.curve([(cx - hr * 0.7, cy - hr * 0.4), (cx, cy - hr * 0.62), (cx + hr * 0.6, cy - hr * 0.45)], w=w * 0.8, c=c)
    elif hair == "bob":
        out += pen.curve([(cx - hr * 0.95, cy + hr * 0.6), (cx - hr * 1.0, cy - hr * 0.4), (cx - hr * 0.3, cy - hr * 1.12), (cx + hr * 0.5, cy - hr * 1.05), (cx + hr * 1.0, cy - hr * 0.3), (cx + hr * 0.95, cy + hr * 0.6)], w=w, c=c)
        out += pen.line((cx - hr * 0.8, cy - hr * 0.35), (cx + hr * 0.8, cy - hr * 0.42), w=w * 0.8, c=c)
    if glasses:
        out += pen.ellipse(cx - hr * 0.33, cy + hr * 0.1, hr * 0.22, hr * 0.17, w=w * 0.7, c=c, passes=1)
        out += pen.ellipse(cx + hr * 0.33, cy + hr * 0.1, hr * 0.22, hr * 0.17, w=w * 0.7, c=c, passes=1)
        out += pen.line((cx - hr * 0.11, cy + hr * 0.08), (cx + hr * 0.11, cy + hr * 0.08), w=w * 0.6, c=c, passes=1)
    if bag:
        out += pen.line((cx - 70 * s, cy + hr * 1.75), (cx + 40 * s, cy + hr * 3.3), w=w * 0.9, c=c)
    return out


def avatar(name, hair, glasses, accent, emblem):
    pen = Pen(seed=sum(map(ord, name)), jitter=1.1)
    body = f'<circle cx="100" cy="100" r="96" fill="{NAVY}"/>'
    g = bust(pen, 100, 80, s=0.62, hair=hair, glasses=glasses, w=2.4)
    g += emblem(pen)
    body += f'<g filter="url(#chalk)">{g}</g>'
    body += f'<circle cx="100" cy="100" r="96" fill="none" stroke="{accent}" stroke-width="3" opacity=".9"/>'
    svg(f"avatar-{name}.svg", 200, 200, f'<clipPath id="c"><circle cx="100" cy="100" r="96"/></clipPath><g clip-path="url(#c)">{body}</g>')


def make_avatars():
    # 林禾：新闻学大四，抱笔记本电脑（自学数据）
    avatar("linhe", "pony", False, CHALK, lambda p: p.rect(70, 150, 60, 34, w=2) + p.line((64, 186), (136, 186), w=2))
    # 周屿：会计学转修新闻学辅修，戴眼镜，胸前一叠课表
    avatar("zhouyu", "short", True, CHALK, lambda p: p.rect(76, 148, 48, 40, w=2) + p.line((82, 160), (118, 160), w=1.4) + p.line((82, 170), (118, 170), w=1.4) + p.line((82, 180), (108, 180), w=1.4))
    # 苏棠：北大新传，赴深圳/英国修金融，背包
    avatar("sutang", "bob", False, CHALK, lambda p: p.line((60, 136), (120, 200), w=2.2) + p.ellipse(132, 168, 14, 10, w=1.6))


# ---------------------------------------------------------------- 封面
def make_cover():
    W, H = 1600, 1000
    pen = Pen(seed=11, jitter=1.8)
    g = ""
    # 课表网格（像栅栏一样竖向拉长）
    x0, y0, cw, rh, cols, rows = 210, 150, 168, 116, 7, 6
    days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    for i in range(cols + 1):
        g += pen.line((x0 + i * cw, y0 - 30), (x0 + i * cw, y0 + rows * rh + 40), w=2.4)
    for j in range(rows + 1):
        g += pen.line((x0 - 20, y0 + j * rh), (x0 + cols * cw + 20, y0 + j * rh), w=1.6, op=0.75)
    labels = ""
    for i, d in enumerate(days):
        labels += text(x0 + i * cw + cw / 2, y0 - 44, d, 22, CHALK, "middle", op=0.7)
    # 第一张课表（白天）：淡蓝方块
    first = [(0, 0), (0, 1), (1, 0), (1, 2), (2, 1), (3, 0), (3, 1), (4, 2), (2, 0), (4, 0)]
    # 第二张课表（晚间、周末）：珊瑚红方块
    second = [(2, 4), (4, 4), (5, 1), (5, 2), (6, 1), (6, 2), (0, 5), (1, 5), (3, 5), (5, 4), (6, 4), (2, 5)]
    fills = ""
    for (c, r) in first:
        fills += f'<rect x="{x0 + c * cw + 10}" y="{y0 + r * rh + 10}" width="{cw - 20}" height="{rh - 20}" fill="{BLUE}" opacity=".55" filter="url(#brush)"/>'
    for (c, r) in second:
        fills += f'<rect x="{x0 + c * cw + 10}" y="{y0 + r * rh + 10}" width="{cw - 20}" height="{rh - 20}" fill="{CORAL}" opacity=".75" filter="url(#brush)"/>'
    # 课程名（第一张课表）
    names1 = {(0, 0): "新闻采访", (1, 0): "新闻写作", (3, 0): "新闻编辑", (2, 1): "新闻史论", (4, 2): "毕业设计", (0, 1): "传播学概论"}
    names2 = {(2, 4): "辅修·晚", (4, 4): "辅修·晚", (5, 1): "Python", (6, 1): "SQL", (5, 2): "大模型应用", (6, 2): "作品集", (0, 5): "网课 23:00", (3, 5): "实习日报", (6, 4): "统计学"}
    for (c, r), t in names1.items():
        labels += text(x0 + c * cw + cw / 2, y0 + r * rh + rh / 2 + 8, t, 22, NAVY, "middle", weight=600, op=0.85)
    for (c, r), t in names2.items():
        labels += text(x0 + c * cw + cw / 2, y0 + r * rh + rh / 2 + 8, t, 22, "#fff", "middle", weight=600, op=0.95)
    # 人物：站在课表栅栏后的学生
    person = bust(pen, 1250, 460, s=1.55, hair="pony", w=3.2)
    body = f'<g filter="url(#soft)">{fills}</g><g filter="url(#chalk)">{g}{person}</g>{labels}'
    svg("cover.svg", W, H, body)


# ---------------------------------------------------------------- 引子：手机与新闻剪报
def make_phone():
    W, H = 520, 900
    pen = Pen(seed=21, jitter=1.4)
    g = pen.rect(70, 40, 380, 800, w=3)
    g += pen.rect(92, 100, 336, 660, w=1.6, op=0.7)
    g += pen.ellipse(260, 800, 22, 22, w=2)
    g += pen.line((220, 70), (300, 70), w=3)
    t = text(110, 145, "新闻推送", 26, CHALK, weight=700)
    items = [
        ("1", "中传“砍掉”16个专业", CORAL),
        ("2", "“双一流”高校学科调整信号", CHALK),
        ("3", "AI时代的学科“新陈代谢”", CHALK),
        ("4", "彻底重构课堂？", CHALK),
    ]
    for i, (n, s, col) in enumerate(items):
        y = 205 + i * 78
        t += text(112, y, n, 26, col, weight=700)
        t += text(146, y, s, 23, col)
        g += pen.line((110, y + 26), (410, y + 26), w=1, op=0.35, passes=1)
    t += text(112, 560, "3月9日  周一  23:47", 20, BLUE)
    body = f'<g filter="url(#chalk)">{g}</g>{t}'
    svg("phone.svg", W, H, body)


def make_clippings():
    W, H = 1100, 760
    pen = Pen(seed=31, jitter=1.5)
    g = ""
    t = ""
    clips = [
        (90, 60, -6, "人民网四川频道 · 2026.03.11", "彻底重构课堂？", "中传16个专业关停并转"),
        (520, 40, 5, "南方财经网 · 2026.03.12", "“双一流”高校“砍掉”16个专业", "高校学科调整重磅信号释放"),
        (150, 380, 3, "中国蓝观察 · 2026.03.11", "中传“砍掉”16个专业", "AI时代的学科“新陈代谢”"),
        (560, 400, -4, "教育部 · 2025.04.22", "撤销、停招专业点数", "大幅超过增设专业点数"),
    ]
    for (x, y, rot, src, h1, h2) in clips:
        w, h = 430, 280
        cx, cy = x + w / 2, y + h / 2
        seg = f'<g transform="rotate({rot} {cx} {cy})">'
        seg += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{NAVY}"/>'
        inner = pen.rect(x, y, w, h, w=2.2)
        for k in range(6):
            inner += pen.line((x + 24, y + 160 + k * 18), (x + w - 24 - (k == 5) * 150, y + 160 + k * 18), w=1.2, op=0.45, passes=1)
        seg += f'<g filter="url(#chalk)">{inner}</g>'
        seg += text(x + 24, y + 42, src, 17, BLUE)
        seg += text(x + 24, y + 92, h1, 30, CHALK, weight=700)
        seg += text(x + 24, y + 132, h2, 24, CHALK, op=0.85)
        seg += "</g>"
        g += seg
    # NEWS 字样
    svg("clippings.svg", W, H, g)


# ---------------------------------------------------------------- 章节封面
def make_ch1():
    """誓言下的出走：人物抱着《新闻学》课本，纸页从头顶飞散；斜向笔刷带。"""
    W, H = 1600, 1000
    pen = Pen(seed=41, jitter=2)
    band = f'<path d="M-50,760 L1650,420 L1650,1050 L-50,1050 Z" fill="{BLUE_D}" opacity=".9" filter="url(#brush)"/>'
    fig = ""
    # 白色剪影人物（实心 + 轮廓）
    sil = (f'<g transform="translate(-180,-330) scale(1.7)">'
           f'<path d="M300,420 C270,420 255,450 262,480 C268,510 285,525 300,528 C318,526 334,510 338,480 C344,448 330,420 300,420 Z '
           f'M250,540 C220,560 205,620 200,700 L196,960 L404,960 L400,700 C395,620 380,560 350,540 C330,532 270,532 250,540 Z" fill="{CHALK}" opacity=".95" filter="url(#soft)"/>'
           f'<rect x="240" y="640" width="120" height="150" fill="{CORAL}" filter="url(#soft)"/></g>')
    fig = ""
    pen2 = Pen(seed=42, jitter=1.4)
    fig2 = f'<g transform="translate(-180,-330) scale(1.7)">' + pen2.rect(240, 640, 120, 150, w=2, c=NAVY) + pen2.line((262, 680), (338, 680), w=2, c=NAVY) + pen2.line((262, 705), (338, 705), w=2, c=NAVY) + '</g>'
    papers = ""
    rr = random.Random(5)
    for i in range(22):
        x = 400 + i * 40 + rr.uniform(-30, 30)
        y = 330 - i * 12 + rr.uniform(-60, 60)
        a = rr.uniform(-40, 40)
        sz = rr.uniform(18, 40)
        papers += f'<rect x="{x:.0f}" y="{y:.0f}" width="{sz:.0f}" height="{sz * 0.7:.0f}" fill="{CHALK}" transform="rotate({a:.0f} {x:.0f} {y:.0f})" opacity="{rr.uniform(.6, 1):.2f}"/>'
    body = band + sil + fig + f'<g filter="url(#chalk)">{fig2}</g>' + f'<g filter="url(#soft)">{papers}</g>'
    svg("ch1.svg", W, H, body)


def make_ch2():
    """跨界人还是局外人：一扇半开的门，门里门外各站一个人。"""
    W, H = 1600, 1000
    pen = Pen(seed=51, jitter=1.8)
    band = f'<path d="M-50,300 C400,240 900,380 1650,250 L1650,520 C1000,600 500,480 -50,560 Z" fill="{BLUE_D}" opacity=".75" filter="url(#brush)"/>'
    g = ""
    # 门框
    g += pen.poly([(640, 900), (640, 260), (960, 260), (960, 900)], w=3.2, closed=False)
    # 半开的门扇（透视）
    door = f'<path d="M960,262 L1130,200 L1130,960 L960,900 Z" fill="#26384a"/>'
    g += pen.poly([(960, 262), (1130, 200), (1130, 960), (960, 900)], w=2.6)
    g += pen.ellipse(1105, 600, 7, 9, w=2)
    # 门里的光
    light = f'<path d="M642,262 L958,262 L958,898 L642,898 Z" fill="{YELLOW}" opacity=".18" filter="url(#soft)"/>'
    # 地面
    g += pen.line((300, 900), (1400, 900), w=2, op=0.6)
    # 两个人：门外（局外）和门槛上（跨界）
    p1 = bust(pen, 420, 560, s=1.0, hair="short", glasses=True, w=2.6)
    p2 = bust(pen, 800, 520, s=1.0, hair="bob", w=2.6)
    body = band + light + door + f'<g filter="url(#chalk)">{g}{p1}{p2}</g>'
    svg("ch2.svg", W, H, body)


def make_ch3():
    """周末复周末：一条首尾相接的“∞”形笔刷带。"""
    W, H = 1600, 1000
    d = "M800,500 C960,300 1260,260 1340,420 C1420,580 1200,740 1010,640 C900,580 860,540 800,500 C740,460 700,420 590,360 C400,260 180,420 260,580 C340,740 640,700 800,500 Z"
    band = f'<path d="{d}" fill="none" stroke="{BLUE}" stroke-width="150" opacity=".85" filter="url(#brush)"/>'
    band += f'<path d="{d}" fill="none" stroke="{PINK}" stroke-width="60" opacity=".35" filter="url(#brush)"/>'
    pen = Pen(seed=61, jitter=1.4)
    g = pen.curve([(260, 580), (340, 740), (640, 700), (800, 500), (960, 300), (1260, 260), (1340, 420)], w=2, op=0.7)
    body = band + f'<g filter="url(#chalk)">{g}</g>'
    svg("ch3.svg", W, H, body)


def make_ch4():
    """空教室也会迎来清晨：俯视的教室，窗口射出一束光。"""
    W, H = 1600, 1000
    pen = Pen(seed=71, jitter=1.8)
    beam = f'<path d="M560,330 L1650,180 L1650,820 L560,640 Z" fill="{YELLOW}" opacity=".95" filter="url(#brush)"/>'
    g = ""
    # 教室盒子（一点透视）
    o = [(40, 120), (560, 120), (560, 860), (40, 860)]
    i = [(170, 260), (430, 260), (430, 720), (170, 720)]
    g += pen.poly(o, w=3)
    g += pen.poly(i, w=2.4)
    for a, b in zip(o, i):
        g += pen.line(a, b, w=2.4)
    # 窗
    g += pen.poly([(430, 300), (540, 220), (540, 700), (430, 640)], w=2.2)
    g += pen.line((485, 260), (485, 670), w=1.6)
    # 黑板
    g += pen.rect(200, 285, 200, 70, w=2)
    g += pen.hatch(200, 285, 200, 70, gap=9, op=0.35)
    # 课桌
    for r in range(3):
        for c in range(3):
            x = 200 + c * 70
            y = 420 + r * 90
            g += pen.rect(x, y, 48, 30, w=1.6)
    # 地面排线
    g += pen.hatch(170, 600, 260, 120, gap=12, angle=-35, op=0.25)
    board = f'<rect x="200" y="285" width="200" height="70" fill="#2e4a3e" opacity=".8"/>'
    body = beam + board + f'<g filter="url(#chalk)">{g}</g>'
    svg("ch4.svg", W, H, body)


# ---------------------------------------------------------------- 路径树
def make_route():
    """从新传本科生出发的四条“第二张课表”路径（对应正文路径树）。"""
    W, H = 1000, 560
    pen = Pen(seed=81, jitter=1.2)
    g = ""
    t = ""

    def cap(x, y):
        s = pen.poly([(x - 34, y - 10), (x, y - 26), (x + 34, y - 10), (x, y + 6)], w=2)
        s += pen.ellipse(x, y + 26, 22, 24, w=2)
        s += pen.line((x + 30, y - 10), (x + 30, y + 14), w=1.6)
        return s

    def card(x, y, label):
        s = pen.rect(x - 34, y - 22, 68, 44, w=2)
        s += pen.line((x - 22, y - 8), (x + 22, y - 8), w=1.4)
        s += pen.line((x - 22, y + 6), (x + 10, y + 6), w=1.4)
        return s

    g += cap(90, 250)
    t += text(90, 330, "新传本科生", 20, CHALK, "middle")
    t += text(90, 356, "主修：第一张课表", 15, BLUE, "middle")
    g += pen.line((150, 270), (240, 270), w=2.4)
    g += pen.line((240, 70), (240, 490), w=2.4)
    rows = [
        (90, "荣誉课程包", "15学分", "一组跨学科课程", "人大 · 2025"),
        (225, "辅修", "25—40学分", "周三、周五晚与周末", "中传 · 1—2年"),
        (360, "联合培养", "4模块×9周", "深圳9—4月，英国4—6月", "北大 · 1学年"),
        (490, "跨专业考研", "更换最高学历", "重新进入完整培养周期", "硕士 · 2.5—3年"),
    ]
    for y, name, cred, note, who in rows:
        g += pen.line((240, y), (420, y), w=2.2)
        g += card(470, y, "")
        t += text(300, y - 14, name, 20, CHALK)
        t += text(530, y - 6, cred, 20, CORAL if y == 490 else CHALK, weight=600)
        t += text(530, y + 20, note, 15, BLUE)
        g += pen.line((760, y), (830, y), w=1.6, op=0.6)
        g += pen.ellipse(880, y, 46, 46, w=2)
        t += text(880, y + 6, who.split(" · ")[1], 15, CHALK, "middle")
        t += text(880, y - 52, who.split(" · ")[0], 13, BLUE, "middle")
    body = f'<g filter="url(#chalk)">{g}</g>{t}'
    svg("route.svg", W, H, body)


# ---------------------------------------------------------------- 一周地图
def iso_room(pen, ox, oy, w=250, d=150, h=90, items=None):
    """斜二测房间：地板 + 两面墙。返回 svg 片段。"""
    sk = 0.5
    A = (ox, oy)
    B = (ox + w, oy)
    C = (ox + w + d * sk, oy - d * sk)
    D = (ox + d * sk, oy - d * sk)
    s = pen.poly([A, B, C, D], w=2)
    for p in (A, D, C):
        s += pen.line(p, (p[0], p[1] - h), w=1.8)
    s += pen.line((A[0], A[1] - h), (D[0], D[1] - h), w=1.8)
    s += pen.line((D[0], D[1] - h), (C[0], C[1] - h), w=1.8)
    # 地砖
    for k in range(1, 5):
        s += pen.line((ox + w * k / 5, oy), (ox + w * k / 5 + d * sk, oy - d * sk), w=0.8, op=0.3, passes=1)
    for k in range(1, 3):
        y = oy - d * sk * k / 3
        x = ox + d * sk * k / 3
        s += pen.line((x, y), (x + w, y), w=0.8, op=0.3, passes=1)
    return s


def make_weekmap():
    W, H = 900, 600
    pen = Pen(seed=91, jitter=1.0)
    g = ""
    rooms = [
        ("classroom", 20, 250, "主修教室"),
        ("minor", 310, 250, "辅修晚课"),
        ("library", 600, 250, "图书馆"),
        ("dorm", 20, 540, "宿舍"),
        ("office", 310, 540, "实习单位"),
        ("transit", 600, 540, "地铁 / 高铁"),
    ]
    t = ""
    for key, x, y, label in rooms:
        g += iso_room(pen, x, y, w=200, d=140, h=95)
        cx, cy = x + 140, y - 40
        if key == "classroom":
            for r in range(2):
                for c in range(3):
                    g += pen.rect(x + 40 + c * 55 + r * 25, y - 30 - r * 30, 36, 16, w=1.4)
            g += pen.rect(x + 95, y - 160, 110, 48, w=1.6)
        elif key == "minor":
            g += pen.rect(x + 60, y - 50, 120, 22, w=1.4)
            g += pen.rect(x + 95, y - 160, 110, 48, w=1.6)
            g += pen.ellipse(x + 186, y - 140, 10, 10, w=1.4)
            g += pen.line((x + 186, y - 150), (x + 186, y - 140), w=1.2, passes=1)
        elif key == "library":
            for k in range(3):
                g += pen.rect(x + 82 + k * 40, y - 175, 30, 85, w=1.4)
                for m in range(3):
                    g += pen.line((x + 82 + k * 40, y - 150 + m * 22), (x + 112 + k * 40, y - 150 + m * 22), w=1, passes=1, op=0.6)
            g += pen.rect(x + 40, y - 45, 110, 22, w=1.4)
        elif key == "dorm":
            g += pen.rect(x + 30, y - 55, 90, 34, w=1.4)
            g += pen.rect(x + 100, y - 175, 90, 34, w=1.4)
            g += pen.line((x + 100, y - 141), (x + 100, y - 60), w=1.4)
            g += pen.line((x + 190, y - 141), (x + 190, y - 60), w=1.4)
            g += pen.rect(x + 140, y - 50, 40, 26, w=1.2)
        elif key == "office":
            for k in range(3):
                g += pen.rect(x + 40 + k * 55, y - 45, 42, 20, w=1.4)
                g += pen.rect(x + 46 + k * 55, y - 70, 30, 22, w=1.2)
            g += pen.rect(x + 120, y - 165, 70, 50, w=1.2)
        elif key == "transit":
            g += pen.line((x + 20, y - 30), (x + 230, y - 30), w=1.4)
            for k in range(4):
                g += pen.rect(x + 30 + k * 46, y - 60, 34, 24, w=1.2)
            g += pen.rect(x + 95, y - 170, 120, 44, w=1.4)
            g += pen.ellipse(x + 120, y - 120, 8, 8, w=1.2)
            g += pen.ellipse(x + 190, y - 120, 8, 8, w=1.2)
    body = f'<g filter="url(#chalk)">{g}</g>{t}'
    svg("weekmap.svg", W, H, body)


def make_notebook():
    W, H = 360, 520
    pen = Pen(seed=101, jitter=1.0)
    paper = f'<rect x="30" y="20" width="310" height="480" fill="#d3dae0" opacity=".94" filter="url(#soft)"/>'
    g = pen.rect(30, 20, 310, 480, w=2)
    grid = ""
    for k in range(1, 24):
        grid += pen.line((30, 20 + k * 20), (340, 20 + k * 20), w=0.7, c=BLUE_D, op=0.35, passes=1)
    for k in range(1, 16):
        grid += pen.line((30 + k * 20, 20), (30 + k * 20, 500), w=0.7, c=BLUE_D, op=0.22, passes=1)
    for k in range(10):
        y = 50 + k * 46
        g += pen.ellipse(30, y, 12, 7, w=1.6, start=-90, end=200)
    g += pen.poly([(300, 500), (340, 460), (340, 500)], w=1.6)
    body = paper + f'<g>{grid}</g><g filter="url(#chalk)">{g}</g>'
    svg("notebook.svg", W, H, body)


# ---------------------------------------------------------------- 失眠序列：三个剪影
def make_silhouettes():
    W, H = 1400, 800
    pen = Pen(seed=111, jitter=1.6)
    g = ""
    for i, (x, hair) in enumerate([(330, "pony"), (700, "short"), (1070, "bob")]):
        g += bust(pen, x, 300, s=1.45, hair=hair, w=2.2, glasses=(hair == "short"))
    # 手机屏的微光
    glow = ""
    for x in (330, 700, 1070):
        glow += f'<ellipse cx="{x}" cy="690" rx="70" ry="26" fill="{BLUE}" opacity=".25" filter="url(#soft)"/>'
        glow += f'<rect x="{x - 26}" y="640" width="52" height="86" rx="6" fill="{BLUE}" opacity=".35"/>'
    body = glow + f'<g filter="url(#chalk)">{g}</g>'
    svg("silhouettes.svg", W, H, body)


# ---------------------------------------------------------------- 分岔楼梯
def stairs(pen, x0, y0, steps, dx, dy, w):
    s = ""
    x, y = x0, y0
    for k in range(steps):
        nx, ny = x + dx, y - dy
        s += pen.poly([(x, y), (x + w, y), (x + w, ny), (x, ny)], w=1.6, closed=True)
        s += pen.line((x, ny), (nx, ny - dy * 0.15), w=1.2, op=0.6, passes=1)
        x, y = nx, ny
    return s, (x, y)


def make_staircase():
    W, H = 1200, 1000
    pen = Pen(seed=121, jitter=1.2)
    g = ""
    fill = ""
    # 主干楼梯（正面，向上收窄）
    for k in range(12):
        y = 960 - k * 34
        half = 170 - k * 6
        fill += f'<rect x="{600 - half}" y="{y - 34}" width="{half * 2}" height="34" fill="#2a3d50"/>'
        g += pen.rect(600 - half, y - 34, half * 2, 34, w=1.8)
    top = 960 - 12 * 34
    # 三条分岔
    branches = [(-1, 9, 520), (0, 10, 600), (1, 9, 680)]
    doors = []
    for sgn, n, sx in branches:
        x, y = sx - 50, top
        for k in range(n):
            nx = x + sgn * 34
            ny = y - 30
            fill += f'<rect x="{min(x, nx)}" y="{ny}" width="100" height="30" fill="#2a3d50"/>'
            g += pen.rect(min(x, nx), ny, 100, 30, w=1.5)
            x, y = nx, ny
        doors.append((x + 50, y))
    for (dx_, dy_) in doors:
        fill += f'<rect x="{dx_ - 34}" y="{dy_ - 120}" width="68" height="120" fill="{NAVY}"/>'
        g += pen.rect(dx_ - 34, dy_ - 120, 68, 120, w=2.4)
        g += pen.ellipse(dx_ + 22, dy_ - 60, 4, 5, w=1.4)
        fill += f'<rect x="{dx_ - 30}" y="{dy_ - 116}" width="60" height="112" fill="{YELLOW}" opacity=".12"/>'
    body = f'<g filter="url(#soft)">{fill}</g><g filter="url(#chalk)">{g}</g>'
    svg("staircase.svg", W, H, body)
    return doors


if __name__ == "__main__":
    make_avatars()
    make_cover()
    make_phone()
    make_clippings()
    make_ch1()
    make_ch2()
    make_ch3()
    make_ch4()
    make_route()
    make_weekmap()
    make_notebook()
    make_silhouettes()
    make_staircase()
