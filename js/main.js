/* Scroll work is coalesced; geometry is read only when layout changes. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const scenes = $$('[data-progress]').map(sc => ({
    sc, sticky: $('.sticky', sc), items: $$('[data-at]', sc).map(el => ({el, at: +el.dataset.at})),
    motion: $$('.cover-art, .cover-title, .cover-sub, .scroll-cue, .phone', sc), p: -1, step: -2
  }));
  window.sceneHooks = [];
  const cast = $('#cast'), nav = $('#chapnav'), cover = $('.cover');
  const castItems = $$('#cast li'), navLinks = $$('#chapnav a');
  const sections = $$('main > .sec'), mentions = $$('.who[data-p], .quote-wall [data-p]').filter(m => !m.closest('[data-progress]'));
  const week = $('#week'), lightCover = $('#s4 .chapter-cover');
  const geometry = new Map();
  let dirty = true, queued = false, vh = innerHeight, shown = false, active = '', light = false;
  const clamp = v => Math.max(0, Math.min(1, v));
  const measured = [...new Set([...scenes.map(s => s.sc), ...sections, ...mentions, cover, week, lightCover])].filter(Boolean);
  function measure() {
    const y = scrollY;
    vh = document.documentElement.clientHeight;
    for (const el of measured) {
      const r = el.getBoundingClientRect();
      geometry.set(el, {top: r.top + y, bottom: r.bottom + y, height: r.height});
    }
    for (const s of scenes) s.stickyHeight = s.sticky.clientHeight;
    dirty = false;
  }
  function closeCards() {
    castItems.forEach(li => { li.classList.remove('open', 'preview'); li.setAttribute('aria-expanded', 'false'); });
  }
  function frame() {
    queued = false;
    if (dirty) measure();
    const y = scrollY, lit = new Set();
    for (const s of scenes) {
      const r = geometry.get(s.sc);
      const p = clamp((y - r.top) / Math.max(1, r.height - s.stickyHeight));
      let last = -1;
      s.items.forEach((it, i) => { if (p >= it.at) last = i; });
      if (p !== s.p) {
        // Local variables avoid invalidating an entire scene's descendants.
        const value = p.toFixed(4);
        s.motion.forEach(el => el.style.setProperty('--p', value));
        s.p = p;
        for (const hook of window.sceneHooks) hook(s.sc, p);
      }
      if (last !== s.step) {
        s.items.forEach((it, i) => {
          it.el.classList.toggle('in', i <= last);
          if (s.sc.classList.contains('stairs')) it.el.classList.toggle('old', i < last);
        });
        s.step = last;
      }
      if (r.top < y + vh * .7 && r.bottom > y + vh * .3) {
        if (s.sc.classList.contains('stairs') && last >= 0) lit.add(s.items[last].el.dataset.p);
        if (s.sc.classList.contains('scene-phone') && last >= 1) lit.add('linhe');
      }
    }
    const past = geometry.get(cover).bottom < y + vh * .6;
    if (past !== shown) {
      nav.classList.toggle('show', past); cast.classList.toggle('show', past);
      nav.inert = cast.inert = !past;
      if (!past) closeCards();
      shown = past;
    }
    let cur = sections[0].id;
    for (const sec of sections) if (geometry.get(sec).top < y + vh * .5) cur = sec.id;
    if (cur !== active) {
      navLinks.forEach(a => {
        const on = a.dataset.sec === cur;
        a.classList.toggle('on', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      active = cur;
    }
    const isLight = geometry.get(lightCover).bottom < y + vh * .5;
    if (light !== isLight) { document.body.classList.toggle('is-light', isLight); light = isLight; }
    for (const m of mentions) {
      const r = geometry.get(m);
      if (r.bottom > y + vh * .18 && r.top < y + vh * .82) lit.add(m.dataset.p);
    }
    const w = geometry.get(week);
    if (w && w.top < y + vh * .5 && w.bottom > y + vh * .5) lit.add(week.dataset.who || 'linhe');
    castItems.forEach(li => {
      const on = lit.has(li.dataset.p);
      if (on !== li.classList.contains('lit')) li.classList.toggle('lit', on);
    });
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  window.refreshScroll = () => { dirty = true; scenes.forEach(s => { s.p = -1; }); schedule(); };
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', window.refreshScroll, {passive: true});
  addEventListener('pageshow', window.refreshScroll);
  const resize = new ResizeObserver(window.refreshScroll);
  resize.observe($('main'));
  scenes.forEach(s => resize.observe(s.sc));
  document.fonts.ready.then(window.refreshScroll);
  $$('img').forEach(img => img.addEventListener('load', window.refreshScroll, {once: true}));
  nav.inert = cast.inert = true;

  castItems.forEach((li, i) => {
    li.setAttribute('role', 'button'); li.setAttribute('aria-expanded', 'false');
    li.setAttribute('aria-label', li.querySelector('img').alt + '的人物介绍');
    const card = $('.card', li); card.id = 'person-card-' + i;
    li.setAttribute('aria-controls', card.id);
    const toggle = () => { const open = !li.classList.contains('open'); closeCards(); li.classList.toggle('open', open); li.setAttribute('aria-expanded', String(open)); };
    li.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { closeCards(); li.classList.add('preview'); li.setAttribute('aria-expanded', 'true'); } });
    li.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') closeCards(); });
    li.addEventListener('click', toggle);
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
  document.addEventListener('pointerdown', e => { if (!cast.contains(e.target)) closeCards(); }, {passive: true});
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCards(); });

  $$('.content > p, .content > figure, .content > blockquote, .cases article, .quote-wall blockquote').forEach(el => el.classList.add('fade'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {rootMargin: '0px 0px 80px 0px'});
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

  window.refreshScroll();
})();
