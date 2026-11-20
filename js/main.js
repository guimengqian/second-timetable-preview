/* 滚动叙事：进度变量、人物头像、章节导航、渐入、参考资料 */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---------------------------------------------------------- 滚动进度 --p
  const scenes = $$('[data-progress]');
  const steppers = scenes.map(sc => ({ sc, items: $$('[data-at]', sc) }));
  window.sceneHooks = []; // charts.js 可注册 (scene, p) 回调

  function progressOf(el) {
    const r = el.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
  }

  // ---------------------------------------------------------- 人物亮起
  const cast = $('#cast');
  const castItems = Object.fromEntries($$('#cast li').map(li => [li.dataset.p, li]));
  const mentions = $$('.who[data-p], .quote-wall [data-p]');

  function lightCast() {
    const lit = new Set();
    const lo = innerHeight * 0.18, hi = innerHeight * 0.82;
    for (const m of mentions) {
      const r = m.getBoundingClientRect();
      if (r.bottom > lo && r.top < hi) lit.add(m.dataset.p);
    }
    // 粘性场景中当前展示的卡片
    $$('.stair-cards article.in').forEach(a => lit.add(a.dataset.p));
    const wk = $('#week');
    if (wk) {
      const r = wk.getBoundingClientRect();
      if (r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5) lit.add(wk.dataset.who || 'linhe');
    }
    for (const [p, li] of Object.entries(castItems)) li.classList.toggle('lit', lit.has(p));
  }

  // ---------------------------------------------------------- 导航
  const navLinks = $$('#chapnav a');
  const secs = $$('main > .sec');
  const nav = $('#chapnav');
  const cover = $('.cover');

  function onScroll() {
    for (const { sc, items } of steppers) {
      const r = sc.getBoundingClientRect();
      if (r.bottom < -50 || r.top > innerHeight + 50) continue;
      const p = progressOf(sc);
      sc.style.setProperty('--p', p.toFixed(4));
      // data-at：到达阈值即出现；之后的同组元素出现时，较早的标为 old（楼梯卡片只保留一张）
      let last = -1;
      items.forEach((it, i) => {
        const on = p >= parseFloat(it.dataset.at);
        it.classList.toggle('in', on);
        if (on) last = i;
      });
      if (sc.classList.contains('stairs')) items.forEach((it, i) => it.classList.toggle('old', i < last));
      for (const fn of window.sceneHooks) fn(sc, p);
    }
    const past = cover.getBoundingClientRect().bottom < innerHeight * 0.6;
    nav.classList.toggle('show', past);
    cast.classList.toggle('show', past);

    let cur = secs[0].id;
    for (const s of secs) if (s.getBoundingClientRect().top < innerHeight * 0.5) cur = s.id;
    navLinks.forEach(a => a.classList.toggle('on', a.dataset.sec === cur));

    // 第四章封面之后切到浅色导航
    const s4 = $('#s4'), c4 = $('#s4 .chapter-cover');
    document.body.classList.toggle('is-light', s4.getBoundingClientRect().top < innerHeight * 0.5 && c4.getBoundingClientRect().bottom < innerHeight * 0.5);

    lightCast();
  }
  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(() => { onScroll(); ticking = false; }); ticking = true; }
  }, { passive: true });
  addEventListener('resize', onScroll);
  window.refreshScroll = onScroll;

  // ---------------------------------------------------------- 渐入 / 高亮 / 章节封面
  $$('.content > p, .content > figure, .content > blockquote, .cases article, .quote-wall blockquote').forEach(el => el.classList.add('fade'));
  const io = new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('.fade, mark, .chapter-cover').forEach(el => io.observe(el));

  // ---------------------------------------------------------- 参考资料（自动汇总正文链接）
  const refs = $('#refs');
  if (refs) {
    const seen = new Map();
    $$('main a[href^="http"]').forEach(a => {
      if (a.closest('.refs')) return;
      const href = a.href;
      if (seen.has(href)) return;
      let label = a.textContent.replace(/^原文：/, '').trim();
      const cardTitle = a.closest('article')?.querySelector('h4')?.textContent;
      if (cardTitle) label = cardTitle + '：' + label;
      seen.set(href, label);
    });
    const extra = [
      ['教育部：2024年度普通高等学校本科专业备案和审批结果（教高函〔2025〕3号）', 'http://www.moe.gov.cn/srcsite/A08/moe_1034/s4930/202504/t20250422_1188239.html'],
      ['教育部：2024年度本科专业备案名单（附件1）', 'http://www.moe.gov.cn/srcsite/A08/moe_1034/s4930/202504/W020250422312780758186.pdf'],
      ['北大外国语学院：FLIC 2024录取公示', 'https://sfl.pku.edu.cn/jxgl/bks/27wyx158724.htm'],
      ['北大外国语学院：FLIC 2025录取公示', 'https://sfl.pku.edu.cn/jxgl/bks/tz/27wyx168069.htm'],
      ['北大新闻与传播学院：国际传播与国际金融2025拟录取公示', 'https://sjc.pku.edu.cn/info/1038/13615.htm'],
      ['北大外国语学院：FLIC 2024简章', 'https://sfl.pku.edu.cn/jxgl/bks/tz/27wyx157869.htm'],
      ['北京师范大学：传播学＋人工智能双学位', 'https://news.bnu.edu.cn/zx/zhxw/ae3d784a3d6448399f3606a5ec0b28bd.htm'],
      ['中国传媒大学：传播学（智能与计算传播）', 'https://www.cuc.edu.cn/cucnews/_t114/2024/0724/c1901a241451/pagem.psp'],
    ];
    for (const [label, href] of extra) if (!seen.has(href)) seen.set(href, label);
    for (const [href, label] of seen) {
      const li = document.createElement('li');
      li.innerHTML = `${label}. <a href="${href}" target="_blank" rel="noopener">${href}</a>`;
      refs.appendChild(li);
    }
  }
  $$('main a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });

  onScroll();
})();
