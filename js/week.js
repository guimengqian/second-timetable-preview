/* “这是第二张课表再普通不过的一周”：人物切换 + 一周时间滑杆 + 场所地图 + 笔记本
 * 每段注明依据（basis）。 */
(function () {
  const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const ROOM = { classroom: '主修课堂', minor: '辅修晚课', library: '图书馆', dorm: '宿舍', office: '实习单位', transit: '地铁 / 高铁' };
  const B = {
    intern: '招聘启事原文：“一周至少能出勤3天，持续实习3个月及以上”（21世纪经济报道）；“每周可到岗3天及以上”（DT财经）',
    sql: '招聘启事原文：“具备SQL、Python等数据分析相关能力”（腾讯 · 内容运营）',
    aigc: '招聘启事原文：“熟练使用AIGC工具辅助内容创作”（小红书 · 创意写作）',
    major1: '新闻学主修课。中传新闻学主要课程25门，以数据、计算命名的2门',
    minorT: '中传新闻学辅修简章：上课时间为周三晚、周五晚及周末；130元/学分',
    minorHW: '辅修必修含新闻采写编6学分（中传2025辅修教学计划）',
    acc: '会计学主修课。会计学在2025年本科专业设置公示中列为拟撤销',
    fin: '北大国际传播与国际金融项目简章：4个模块×9周；9月至次年4月在深圳学习',
    finSelf: '项目简章：住宿、生活、交通、保险费用由学生自理',
    thesis: '主修培养方案的毕业论文要求',
    sleep: '—',
  };
  // [日(0-6), 起, 止, 场所, 事项, 是否属于第二张课表, 依据]
  const S = {
    linhe: [
      ...[0, 2, 3].flatMap(d => [[d, 8, 9, 'transit', '地铁去实习单位', 0, B.intern], [d, 9, 18, 'office', '实习：内容运营、看数据后台', 1, B.intern], [d, 18, 19, 'transit', '地铁回学校', 0, B.intern]]),
      ...[1, 4].flatMap(d => [[d, 8, 12, 'classroom', '主修课：新闻编辑、新闻史论', 0, B.major1], [d, 14, 17, 'classroom', '主修课：毕业设计指导', 0, B.major1], [d, 17, 20, 'library', '主修作业', 0, B.major1]]),
      ...[0, 1, 2, 3, 4].map(d => [d, 20, 23, 'library', '网课：Python数据分析 / SQL练习', 1, B.sql]),
      [5, 9, 12, 'library', '整理作品集：把方向课作业改成数据报道', 1, B.intern],
      [5, 14, 18, 'library', '练习用大模型做选题、改稿', 1, B.aigc],
      [6, 10, 12, 'dorm', '投递简历、改求职信', 1, B.intern],
      [6, 14, 18, 'library', '主修作业', 0, B.major1],
    ],
    zhouyu: [
      ...[0, 1, 3].flatMap(d => [[d, 8, 12, 'classroom', '会计学主修课', 0, B.acc], [d, 14, 17, 'classroom', '会计学主修课', 0, B.acc], [d, 19, 22, 'library', '主修作业', 0, B.acc]]),
      ...[2, 4].flatMap(d => [[d, 8, 12, 'classroom', '会计学主修课', 0, B.acc], [d, 14, 17, 'library', '主修作业', 0, B.acc], [d, 18, 21, 'minor', '辅修晚课：新闻采访 / 新闻写作', 1, B.minorT]]),
      [5, 8, 12, 'minor', '辅修周末课：新闻编辑', 1, B.minorT],
      [5, 13, 17, 'minor', '辅修周末课：数据新闻报道概论', 1, B.minorT],
      [6, 9, 12, 'library', '辅修作业：采访稿', 1, B.minorHW],
      [6, 14, 17, 'library', '主修作业', 0, B.acc],
    ],
    sutang: [
      ...[0, 1, 2, 3, 4].flatMap(d => [[d, 8, 9, 'transit', '地铁去上课', 0, B.fin], [d, 9, 12, 'classroom', '金融模块课程', 1, B.fin], [d, 14, 17, 'classroom', '金融模块课程', 1, B.fin]]),
      ...[1, 3].map(d => [d, 19, 22, 'library', '金融课作业：财务报表分析', 1, B.fin]),
      [2, 19, 21, 'dorm', '线上会：北京的主修论文小组', 0, B.thesis],
      [4, 18, 19, 'transit', '地铁回住处', 0, B.finSelf],
      [5, 10, 16, 'library', '金融案例小组作业', 1, B.fin],
      [6, 14, 17, 'dorm', '线上会：主修论文 / 查英国住宿', 0, B.finSelf],
    ],
  };

  const el = document.getElementById('week');
  if (!el) return;
  const range = document.getElementById('wk-range');
  const $ = id => document.getElementById(id);
  let who = 'linhe';
  el.dataset.who = who;


  // These schedules never change while scrubbing: compute them once.
  const cache = Object.fromEntries(Object.entries(S).map(([person, blocks]) => {
    const hours = Array.from({length: 168}, (_, h) => {
      const d = Math.floor(h / 24), t = h % 24;
      return blocks.find(b => b[0] === d && t >= b[1] && t < b[2]) ||
        [d, t, t + 1, 'dorm', t < 7 || t >= 23 ? '睡觉' : '吃饭、休息', 0, B.sleep];
    });
    const per = DAYS.map((_, d) => blocks.filter(b => b[0] === d).reduce((v, b) => {
      v[b[5] ? 'b' : 'a'] += b[2] - b[1]; return v;
    }, {a: 0, b: 0}));
    return [person, {hours, per, sum: per.reduce((s, p) => s + p.b, 0)}];
  }));
  const fields = Object.fromEntries(['day', 'clock', 'place', 'act', 'basis', 'sum'].map(k => [k, $('wk-' + k)]));
  const rooms = [...el.querySelectorAll('.room')], buttons = [...el.querySelectorAll('.week-tabs button')];
  const host = $('wk-bars');
  host.innerHTML = DAYS.map(d => `<div class="day-bar"><i class="sec2"></i><i class="primary"></i><span>${d.slice(1)}</span></div>`).join('');
  const dayBars = [...host.children];
  const days = document.createElement('div');
  days.className = 'week-days'; days.setAttribute('role', 'group'); days.setAttribute('aria-label', '跳到星期');
  days.innerHTML = DAYS.map((d, i) => `<button type="button" data-day="${i}" aria-pressed="false">${d}</button>`).join('');
  range.after(days);
  days.addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    range.value = +btn.dataset.day * 24 + (+range.value % 24); render();
  });
  function text(el, value) { if (el.textContent !== String(value)) el.textContent = value; }
  function bars() {
    cache[who].per.forEach((p, d) => {
      const [second, primary] = dayBars[d].children;
      second.style.height = p.b / 14 * 52 + 'px';
      primary.style.height = p.a / 14 * 52 + 'px';
      dayBars[d].setAttribute('aria-label', `${DAYS[d]}：第二张课表 ${p.b} 小时，主修及其他安排 ${p.a} 小时`);
    });
    text(fields.sum, cache[who].sum);
  }
  let previousDay = -1, previousRoom = '', queued = false;
  function render() {
    const h = +range.value, d = Math.floor(h / 24), b = cache[who].hours[h];
    text(fields.day, DAYS[d]); text(fields.clock, String(h % 24).padStart(2, '0') + ':00');
    text(fields.place, ROOM[b[3]] + (b[5] ? ' · 第二张课表' : ''));
    text(fields.act, b[4]); text(fields.basis, b[6] === '—' ? '' : '依据：' + b[6]);
    range.setAttribute('aria-valuetext', `${DAYS[d]} ${h % 24}点，${b[4]}`);
    if (previousRoom !== b[3]) {
      rooms.forEach(r => r.classList.toggle('on', r.dataset.room === b[3])); previousRoom = b[3];
    }
    if (previousDay !== d) {
      dayBars.forEach((bar, i) => bar.firstElementChild.classList.toggle('today', i === d));
      [...days.children].forEach((btn, i) => btn.setAttribute('aria-pressed', String(i === d)));
      previousDay = d;
    }
  }
  range.addEventListener('input', () => {
    if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; render(); }); }
  });
  buttons.forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.who === who));
    btn.addEventListener('click', () => {
      who = btn.dataset.who; el.dataset.who = who;
      buttons.forEach(o => { o.classList.toggle('on', o === btn); o.setAttribute('aria-pressed', String(o === btn)); });
      bars(); render(); window.refreshScroll?.();
    });
  });
  bars(); render();
})();
