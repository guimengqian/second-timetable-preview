/* 全部图表（d3）。数据：assets/data/story.json（由 tools/build_data.py 生成） */
(function () {
  const C = { chalk: '#e8edf1', ink: '#c9d3db', blue: '#7fa3b5', blueD: '#4f7385', coral: '#c96b6b', coralL: '#e7a9a4', navy: '#142232', yellow: '#f3e3a0', grid: 'rgba(232,237,241,.18)' };
  const tip = document.createElement('div');
  tip.className = 'tip';
  document.body.appendChild(tip);
  const showTip = (ev, html) => {
    tip.innerHTML = html;
    tip.classList.add('show');
    const x = Math.min(ev.clientX + 14, innerWidth - tip.offsetWidth - 10);
    const y = Math.min(ev.clientY + 14, innerHeight - tip.offsetHeight - 10);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  };
  const hideTip = () => tip.classList.remove('show');
  const bindTip = (sel, fn) => sel.on('mousemove', (ev, d) => showTip(ev, fn(d))).on('mouseleave', hideTip)
    .on('touchstart', (ev, d) => { showTip(ev.touches[0], fn(d)); }, { passive: true });
  const pct = (a, b) => Math.round(a / b * 100) + '%';
  // 粉笔质感滤镜（每个 svg 内注入一次）
  const chalkDefs = svg => {
    const f = svg.append('defs').append('filter').attr('id', 'chk' + Math.random().toString(36).slice(2, 7));
    f.append('feTurbulence').attr('type', 'fractalNoise').attr('baseFrequency', 0.9).attr('numOctaves', 1).attr('result', 'g');
    f.append('feColorMatrix').attr('in', 'g').attr('type', 'matrix').attr('values', '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.35').attr('result', 'm');
    f.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'm').attr('operator', 'in');
    return `url(#${f.attr('id')})`;
  };
  // 只在进入视口时绘制，配合入场动画
  const whenVisible = (el, fn) => {
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: '0px 0px -15% 0px' });
    io.observe(el);
  };

  fetch('assets/data/story.json').then(r => r.json()).then(D => {
    window.STORY = D;
    draw('#c-cut16', cut16, D);
    draw('#c-moe', moe, D);
    draw('#c-0503', moe0503, D);
    draw('#c-circles', circles, D);
    draw('#c-skills', skills, D);
    draw('#c-majors', majors, D);
    draw('#c-cost', cost, D);
    draw('#c-seats', seats, D);
    draw('#c-minor', minor, D);
    draw('#c-cuc6', cuc6, D);
    bubbles(D);
    if (window.refreshScroll) window.refreshScroll();
  });

  function draw(sel, fn, D) {
    const el = document.querySelector(sel);
    if (!el) return;
    whenVisible(el, () => fn(el, D));
  }

  // ------------------------------------------------------------ 中传16个专业
  function cut16(el, D) {
    const g = D.cuc_cut16;
    const groups = g.groups.map(([name, how, items]) => ({ name, how, items, kind: 'cut' }))
      .concat([{ name: '另一端：新增', how: '2024年度教育部备案 / 审批', items: g.added, kind: 'add' }]);
    const W = 640, cw = 116, ch = 40, gap = 8, cols = 5;
    let y = 0;
    const rows = groups.map(gr => { const r = { ...gr, y }; y += 44 + Math.ceil(gr.items.length / cols) * (ch + gap) + 18; return r; });
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${y}`);
    const flt = chalkDefs(svg);
    const colors = ['#c96b6b', '#a65a5a', '#d58e86', C.blue];
    rows.forEach((gr, gi) => {
      const G = svg.append('g').attr('transform', `translate(0,${gr.y})`);
      G.append('text').attr('x', 0).attr('y', 22).attr('fill', C.chalk).attr('font-size', 30).attr('font-weight', 700).text(gr.items.length);
      G.append('text').attr('x', 44).attr('y', 14).attr('fill', C.chalk).attr('font-size', 15).text(gr.name);
      G.append('text').attr('x', 44).attr('y', 33).attr('fill', C.blue).attr('font-size', 12).text(gr.how);
      gr.items.forEach((it, i) => {
        const x = (i % cols) * (cw + gap), yy = 44 + Math.floor(i / cols) * (ch + gap);
        const unnamed = it.includes('未列名');
        const cell = G.append('g').attr('transform', `translate(${x},${yy})`).style('opacity', 0);
        cell.append('rect').attr('width', cw).attr('height', ch).attr('rx', 3)
          .attr('fill', unnamed ? 'none' : colors[gi]).attr('fill-opacity', .85)
          .attr('stroke', C.chalk).attr('stroke-dasharray', unnamed ? '4 3' : null).attr('stroke-opacity', unnamed ? .7 : 0)
          .attr('filter', flt);
        cell.append('text').attr('x', cw / 2).attr('y', ch / 2 + 5).attr('text-anchor', 'middle').attr('fill', '#fff').attr('font-size', it.length > 7 ? 11 : 13).text(it);
        cell.transition().delay(gi * 250 + i * 60).duration(500).style('opacity', 1);
      });
    });
  }

  // ------------------------------------------------------------ 全国专业点调整
  function moe(el, D) {
    const m = D.moe_2024;
    const rows = [
      { k: '停招专业点', v: m['停招'], c: C.coral },
      { k: '撤销专业点', v: m['撤销'], c: C.coral },
      { k: '新增专业点', v: m['新增'], c: C.blue },
      { k: '调整门类或年限', v: m['调整门类或年限'], c: 'rgba(232,237,241,.45)' },
    ];
    const W = 640, L = 120, H = rows.length * 58 + 70;
    const x = d3.scaleLinear().domain([0, 3648]).range([0, W - L - 70]);
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const flt = chalkDefs(svg);
    rows.forEach((r, i) => {
      const y = i * 58;
      const g = svg.append('g').attr('transform', `translate(0,${y})`);
      g.append('text').attr('x', L - 12).attr('y', 26).attr('text-anchor', 'end').attr('fill', C.chalk).attr('font-size', 15).text(r.k);
      const b = g.append('rect').attr('x', L).attr('y', 8).attr('height', 28).attr('width', 0).attr('fill', r.c).attr('filter', flt);
      b.transition().delay(i * 160).duration(1000).attr('width', x(r.v));
      const t = g.append('text').attr('x', L + 8).attr('y', 28).attr('fill', C.chalk).attr('font-size', 18).attr('font-weight', 700).text(r.v);
      t.transition().delay(i * 160).duration(1000).attr('x', L + x(r.v) + 8);
      bindTip(b, () => `<b>${r.k}</b>：${r.v} 个<br>2024年度 · 全国本科专业布点共${m['布点总数']}个`);
    });
    // 停招+撤销 合计 对比 新增
    const y = rows.length * 58 + 10;
    const g = svg.append('g').attr('transform', `translate(0,${y})`);
    g.append('text').attr('x', L - 12).attr('y', 26).attr('text-anchor', 'end').attr('fill', C.coralL).attr('font-size', 15).text('停招＋撤销');
    g.append('rect').attr('x', L).attr('y', 8).attr('height', 28).attr('width', 0).attr('fill', 'none').attr('stroke', C.coralL).attr('stroke-width', 2).attr('stroke-dasharray', '6 4')
      .transition().delay(800).duration(1000).attr('width', x(3648));
    g.append('text').attr('x', L + x(3648) + 8).attr('y', 28).attr('fill', C.coralL).attr('font-size', 18).attr('font-weight', 700).text('3648').style('opacity', 0)
      .transition().delay(1600).style('opacity', 1);
    g.append('text').attr('x', L).attr('y', 58).attr('fill', C.ink).attr('font-size', 13)
      .text('停招2220＋撤销1428＝3648，约为新增1839的1.98倍');
  }

  // ------------------------------------------------------------ 新传类 0503 逐年（数据到位后启用）
  function moe0503(el, D) {
    const rows = D.moe_0503_years;
    if (!rows) return;
    el.closest('figure').hidden = false;
    const keys = [['传统五专业', C.coral], ['网络与新媒体', C.blue], ['其他新兴专业', 'rgba(232,237,241,.55)']];
    const W = 680, H = 400, L = 46, T = 30, B = 70;
    const x = d3.scaleBand().domain(rows.map(d => d.year)).range([L, W - 10]).padding(.32);
    const y = d3.scaleLinear().domain([-40, 72]).range([H - B, T]);
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const flt = chalkDefs(svg);
    [-40, -20, 0, 20, 40, 60].forEach(v => {
      svg.append('line').attr('x1', L).attr('x2', W - 10).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', v ? C.grid : C.chalk).attr('stroke-opacity', v ? 1 : .7);
      svg.append('text').attr('x', L - 8).attr('y', y(v) + 4).attr('text-anchor', 'end').attr('fill', C.ink).attr('font-size', 11).text(v > 0 ? '+' + v : v);
    });
    svg.append('text').attr('x', L).attr('y', T - 12).attr('fill', C.chalk).attr('font-size', 12).text('↑ 新增专业点');
    svg.append('text').attr('x', L).attr('y', y(-40) + 18).attr('fill', C.coralL).attr('font-size', 12).text('↓ 撤销专业点');
    rows.forEach((d, i) => {
      const cx = x(d.year), bw = x.bandwidth();
      let acc = 0;
      keys.forEach(([k, c], j) => {
        const v = d.add[k] || 0;
        if (!v) return;
        const r = svg.append('rect').attr('x', cx).attr('width', bw).attr('y', y(0)).attr('height', 0).attr('fill', c).attr('filter', flt);
        r.transition().delay(i * 140 + j * 80).duration(700).attr('y', y(acc + v)).attr('height', y(acc) - y(acc + v) - 1);
        bindTip(r, () => `<b>${d.year}年度 · 新增 · ${k}</b>：${v} 个<br>当年新传类新增共 ${d3.sum(Object.values(d.add))} 个${d['二学位'] ? `（含二学位 ${d['二学位']} 个）` : ''}`);
        acc += v;
      });
      svg.append('text').attr('x', cx + bw / 2).attr('y', y(acc) - 6).attr('text-anchor', 'middle').attr('fill', C.chalk).attr('font-size', 12).text('+' + acc);
      if (d.del) {
        let dacc = 0;
        keys.forEach(([k, c], j) => {
          const v = d.del[k] || 0;
          if (!v) return;
          const r = svg.append('rect').attr('x', cx).attr('width', bw).attr('y', y(-dacc)).attr('height', 0).attr('fill', c).attr('filter', flt);
          r.transition().delay(600 + i * 140 + j * 80).duration(700).attr('height', y(-dacc - v) - y(-dacc) - 1);
          bindTip(r, () => `<b>${d.year}年度 · 撤销 · ${k}</b>：${v} 个`);
          dacc += v;
        });
        svg.append('text').attr('x', cx + bw / 2).attr('y', y(-dacc) + 16).attr('text-anchor', 'middle').attr('fill', C.coralL).attr('font-size', 12).text('−' + dacc);
      } else {
        const g = svg.append('g');
        g.append('rect').attr('x', cx).attr('width', bw).attr('y', y(0) + 2).attr('height', y(-30) - y(0)).attr('fill', 'none').attr('stroke', C.coralL).attr('stroke-dasharray', '4 4').attr('stroke-opacity', .7);
        g.append('text').attr('x', cx + bw / 2).attr('y', y(-15) + 4).attr('text-anchor', 'middle').attr('fill', C.coralL).attr('font-size', 18).text('?');
        bindTip(g, () => `<b>${d.year}年度 · 撤销</b><br>教育部附件不再列逐校撤销名单，只公布全国总数，无法统计新传类`);
      }
      svg.append('text').attr('x', cx + bw / 2).attr('y', H - B + 34).attr('text-anchor', 'middle').attr('fill', C.ink).attr('font-size', 13).text(d.year);
    });
    const lx0 = L; let lx = lx0;
    keys.forEach(([k, c]) => {
      svg.append('rect').attr('x', lx).attr('y', H - 22).attr('width', 12).attr('height', 12).attr('fill', c);
      const t = svg.append('text').attr('x', lx + 18).attr('y', H - 12).attr('fill', C.ink).attr('font-size', 12).text(k);
      lx += 34 + t.node().getComputedTextLength();
    });
    svg.append('text').attr('x', lx + 6).attr('y', H - 12).attr('fill', C.coralL).attr('font-size', 12).text('?  附件无撤销名单');
  }

  // ------------------------------------------------------------ 三类雇主词圈
  function circles(el, D) {
    const cs = D.jobs.circles;
    const W = 720, R = 108, H = 2 * R + 70;
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const flt = chalkDefs(svg);
    const fills = [C.coral, '#9aa7b1', C.blue];
    cs.forEach((c, i) => {
      const cx = R + 12 + i * ((W - 2 * R - 24) / 2), cy = R + 6;
      const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);
      const id = 'clip' + i + Math.random().toString(36).slice(2, 6);
      g.append('clipPath').attr('id', id).append('circle').attr('r', R - 4);
      g.append('circle').attr('r', R).attr('fill', fills[i]).attr('fill-opacity', .9).attr('filter', flt)
        .attr('transform', 'scale(0)').transition().delay(i * 200).duration(700).attr('transform', 'scale(1)');
      const top = c.words.filter(w => w.count > 0).slice(0, 7);
      const fs = d3.scaleLinear().domain([1, c.n]).range([11, 27]);
      // 最大的字放中间，其余交替上下排布
      const list = [];
      top.forEach((w, k) => (k % 2 ? list.push(w) : list.unshift(w)));
      const total = list.reduce((s, w) => s + fs(w.count) * 1.22, 0);
      let yy = -total / 2;
      const tg = g.append('g').attr('clip-path', `url(#${id})`);
      list.forEach(w => {
        const f = fs(w.count);
        yy += f * 1.22;
        const t = tg.append('text').attr('x', 0).attr('y', yy - f * .22).attr('text-anchor', 'middle')
          .attr('font-size', f).attr('font-weight', f > 20 ? 800 : 500).attr('fill', '#fff')
          .attr('fill-opacity', .45 + .55 * (w.count / c.n)).text(w.skill.replace('（通用）', '')).style('opacity', 0);
        t.transition().delay(i * 200 + 500).duration(600).style('opacity', 1);
        bindTip(t, () => `<b>${c.group}</b>：${w.skill}<br>${w.count} / ${c.n} 条岗位点名（${pct(w.count, c.n)}）`);
      });
      g.append('text').attr('y', R + 34).attr('text-anchor', 'middle').attr('fill', C.chalk).attr('font-size', 17).text(`${c.group} · ${c.n}条`);
    });
  }

  // ------------------------------------------------------------ 技能点图
  function skills(el, D) {
    const J = D.jobs;
    let net = '互联网·内容岗';
    const series = () => [
      { key: '中央媒体', color: C.chalk },
      { key: '市场化媒体', color: C.blue },
      { key: net, color: C.coral },
    ];
    const W = 680, L = 150, R = 30, rowH = 30, T = 46;
    const H = T + J.skills.length * rowH + 20;
    const x = d3.scaleLinear().domain([0, 1]).range([L, W - R]);
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    [0, .25, .5, .75, 1].forEach(v => {
      svg.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', T - 12).attr('y2', H - 14).attr('stroke', C.grid);
      svg.append('text').attr('x', x(v)).attr('y', T - 18).attr('text-anchor', 'middle').attr('fill', C.ink).attr('font-size', 11).text(v * 100 + '%');
    });
    // 图例
    const lg = svg.append('g').attr('class', 'legend');
    function legend() {
      lg.selectAll('*').remove();
      let lx = L;
      series().forEach(s => {
        lg.append('circle').attr('cx', lx).attr('cy', 8).attr('r', 6).attr('fill', s.color);
        const t = lg.append('text').attr('x', lx + 10).attr('y', 12).attr('fill', C.chalk).attr('font-size', 12).text(`${s.key}（${J.n[s.key]}）`);
        lx += 22 + t.node().getComputedTextLength();
      });
    }
    const rows = svg.append('g');
    function render() {
      legend();
      const S = series();
      const data = J.skills.map(d => ({ ...d, vals: S.map(s => ({ key: s.key, color: s.color, v: d[s.key] / J.n[s.key], n: d[s.key], N: J.n[s.key] })) }))
        .sort((a, b) => (b[net] / J.n[net]) - (a[net] / J.n[net]));
      const g = rows.selectAll('g.row').data(data, d => d.skill);
      const ge = g.enter().append('g').attr('class', 'row');
      ge.append('text').attr('class', 'lab').attr('x', L - 12).attr('y', 4).attr('text-anchor', 'end').attr('font-size', 13);
      ge.append('line').attr('class', 'rng').attr('stroke', 'rgba(232,237,241,.35)').attr('stroke-width', 2);
      const all = ge.merge(g);
      all.transition().duration(700).attr('transform', (d, i) => `translate(0,${T + 6 + i * rowH})`);
      all.select('.lab').text(d => d.skill).attr('fill', d => (d.skill === '新闻采编与判断' || d.skill === '数据分析与指标' || d.skill === 'AI工具与大模型') ? C.chalk : C.ink)
        .attr('font-weight', d => (d.skill === '新闻采编与判断' || d.skill === '数据分析与指标' || d.skill === 'AI工具与大模型') ? 700 : 400);
      all.select('.rng').transition().duration(700)
        .attr('x1', d => x(d3.min(d.vals, v => v.v))).attr('x2', d => x(d3.max(d.vals, v => v.v)));
      const dots = all.selectAll('circle.dot').data(d => d.vals.map(v => ({ ...v, skill: d.skill })), (d, i) => i);
      dots.enter().append('circle').attr('class', 'dot').attr('r', 7).attr('cx', x(0)).attr('stroke', C.navy).attr('stroke-width', 1.5)
        .merge(dots)
        .attr('fill', d => d.color)
        .call(s => bindTip(s, d => `<b>${d.skill}</b><br>${d.key}：${d.n} / ${d.N} 条（${pct(d.n, d.N)}）`))
        .transition().duration(800).delay((d, i) => i * 60).attr('cx', d => x(d.v));
    }
    render();
    const fig = el.closest('figure');
    fig.querySelectorAll('.toggle button').forEach(b => b.addEventListener('click', () => {
      fig.querySelectorAll('.toggle button').forEach(o => o.classList.toggle('on', o === b));
      net = b.dataset.g;
      render();
    }));
  }

  // ------------------------------------------------------------ 专业门槛
  function majors(el, D) {
    const rows = D.jobs.majors;
    const W = 680, L = 100, R = 150, rowH = 62, H = rows.length * rowH + 50;
    const x = d3.scaleLinear().domain([0, 1]).range([L, W - R]);
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const flt = chalkDefs(svg);
    const parts = [['限定', C.coral, '只接受所列专业'], ['优先', C.coralL, '所列专业优先'], ['未提或不限', 'rgba(232,237,241,.22)', '未提专业或专业不限']];
    rows.forEach((r, i) => {
      const y = i * rowH;
      const g = svg.append('g').attr('transform', `translate(0,${y})`);
      g.append('text').attr('x', L - 12).attr('y', 26).attr('text-anchor', 'end').attr('fill', C.chalk).attr('font-size', 15).text(r.group);
      g.append('text').attr('x', L - 12).attr('y', 44).attr('text-anchor', 'end').attr('fill', C.blue).attr('font-size', 11).text(r.n + '条');
      let acc = 0;
      parts.forEach(([k, c, desc], j) => {
        const v = r[k] / r.n;
        const rect = g.append('rect').attr('x', x(acc)).attr('y', 10).attr('height', 34).attr('width', 0).attr('fill', c).attr('filter', flt);
        rect.transition().delay(i * 200 + j * 150).duration(700).attr('width', Math.max(0, x(acc + v) - x(acc) - 2));
        if (r[k] > 0) g.append('text').attr('x', x(acc) + 8).attr('y', 32).attr('fill', j === 2 ? C.ink : '#fff').attr('font-size', 13).attr('font-weight', 700).text(r[k]);
        bindTip(rect, () => `<b>${r.group}</b> · ${desc}<br>${r[k]} / ${r.n} 条`);
        acc += v;
      });
      g.append('text').attr('x', W - R + 14).attr('y', 24).attr('fill', C.chalk).attr('font-size', 12).text(`点名新传 ${r['点名新传']}`);
      g.append('text').attr('x', W - R + 14).attr('y', 42).attr('fill', C.coralL).attr('font-size', 12).text(`点名理工数统 ${r['点名理工数统计算机']}`);
    });
    let lx = L;
    parts.forEach(([k, c]) => {
      svg.append('rect').attr('x', lx).attr('y', H - 26).attr('width', 12).attr('height', 12).attr('fill', c);
      svg.append('text').attr('x', lx + 18).attr('y', H - 16).attr('fill', C.ink).attr('font-size', 12).text(k);
      lx += 100;
    });
  }

  // ------------------------------------------------------------ 账单
  function cost(el, D) {
    const items = [
      { k: '中传辅修 · 学位', v: 5200, f: '40学分 × 130元', t: '周三晚、周五晚、周末（校内）', who: '走进新传', extra: '含5学分毕业论文；主修结束即止' },
      { k: '中传辅修 · 证书', v: 3250, f: '25学分 × 130元', t: '周三晚、周五晚、周末（校内）', who: '走进新传', extra: '证书不授予学位' },
      { k: '北大 FLIC', v: 0, f: '简章未列额外学费', t: '校内跨院修读', who: '走进新传', extra: '报名成绩须居前50%；不可修双学位' },
      { k: '北大 国际金融', v: 0, f: '不另收学费', t: '9—4月深圳，4—6月英国', who: '跨出新传', extra: '住宿、生活、交通、保险自理（未公开金额）', hidden: true },
    ];
    const W = 680, L = 150, rowH = 64, H = items.length * rowH + 30;
    const x = d3.scaleLinear().domain([0, 6000]).range([L, W - 150]);
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const flt = chalkDefs(svg);
    const pat = svg.append('defs').append('pattern').attr('id', 'hatchc').attr('width', 8).attr('height', 8).attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
    pat.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 8).attr('stroke', C.coralL).attr('stroke-width', 2);
    items.forEach((it, i) => {
      const g = svg.append('g').attr('transform', `translate(0,${i * rowH})`);
      g.append('text').attr('x', L - 12).attr('y', 24).attr('text-anchor', 'end').attr('fill', C.chalk).attr('font-size', 15).text(it.k);
      g.append('text').attr('x', L - 12).attr('y', 42).attr('text-anchor', 'end').attr('fill', C.blue).attr('font-size', 11).text(it.who);
      const b = g.append('rect').attr('x', L).attr('y', 8).attr('height', 30).attr('width', 0).attr('fill', C.coral).attr('filter', flt);
      b.transition().delay(i * 200).duration(900).attr('width', x(it.v) - L);
      let label = it.v ? `${it.v.toLocaleString()} 元` : '0 元学费';
      if (it.hidden) {
        const h = g.append('rect').attr('x', L).attr('y', 8).attr('height', 30).attr('width', 0).attr('fill', 'url(#hatchc)').attr('stroke', C.coralL).attr('stroke-dasharray', '4 3');
        h.transition().delay(i * 200).duration(900).attr('width', x(4200) - L);
        g.append('text').attr('x', L + 10).attr('y', 29).attr('fill', '#fff').attr('font-size', 13).text('异地食宿、交通、保险自理：?');
        bindTip(h, () => `<b>${it.k}</b><br>${it.f}；${it.extra}<br>简章未公布费用金额，图中斜线区仅示意“存在但未知”`);
        label = '0 元学费 ＋ ?';
      }
      g.append('text').attr('x', (it.hidden ? x(4200) : x(it.v)) + 10).attr('y', 29).attr('fill', C.chalk).attr('font-size', 16).attr('font-weight', 700).text(label);
      g.append('text').attr('x', L).attr('y', 56).attr('fill', C.ink).attr('font-size', 11.5).attr('opacity', .8).text(`${it.f} · ${it.t}`);
      bindTip(b, () => `<b>${it.k}</b><br>${it.f}<br>时间地点：${it.t}<br>${it.extra}`);
    });
  }

  // ------------------------------------------------------------ 名额小人
  function seats(el, D) {
    const rows = D.admissions.map(a => ({ label: `${a.year} ${a.short}`, plan: a.plan, n: a.count, status: a.status, approx: a.short === '国际金融' }));
    const W = 680, L = 120, rowH = 92, H = rows.length * rowH + 10, step = 26;
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const person = 'M0,-14 a5,5 0 1,1 0.01,0 Z M-7,-6 Q0,-9 7,-6 L8,10 L-8,10 Z';
    rows.forEach((r, i) => {
      const g = svg.append('g').attr('transform', `translate(0,${i * rowH})`);
      g.append('text').attr('x', 0).attr('y', 30).attr('fill', C.chalk).attr('font-size', 16).text(r.label);
      g.append('text').attr('x', 0).attr('y', 52).attr('fill', C.coralL).attr('font-size', 26).attr('font-weight', 800).text(r.n);
      g.append('text').attr('x', 26 + (r.n >= 10 ? 14 : 0), 52).attr('x', 30).attr('y', 52).attr('fill', C.ink).attr('font-size', 13).text(`/ ${r.approx ? '约' : ''}${r.plan}人 · ${r.status}`);
      for (let k = 0; k < r.plan; k++) {
        const on = k < r.n;
        const p = g.append('path').attr('d', person).attr('transform', `translate(${L + 40 + k * step},${36})`)
          .attr('fill', on ? C.coral : 'none').attr('stroke', on ? C.coral : 'rgba(232,237,241,.45)').attr('stroke-width', 1.4).style('opacity', 0);
        p.transition().delay(i * 300 + k * 40).duration(300).style('opacity', 1);
      }
      g.append('text').attr('x', L + 40 + r.plan * step + 6).attr('y', 42).attr('fill', C.blue).attr('font-size', 11).text(`空 ${r.plan - r.n}`);
    });
  }

  // ------------------------------------------------------------ 16学分 树图
  function minor(el, D) {
    const m = D.cuc_minor;
    const W = 640, H = 300;
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const flt = chalkDefs(svg);
    const root = d3.hierarchy({ children: m.blocks.map(([name, v]) => ({ name, v })) }).sum(d => d.v);
    d3.treemap().size([W, H]).paddingInner(6)(root);
    const tips = {
      '新闻史论': '新闻史论类必修，6学分',
      '新闻采写编': '新闻采访、写作、编辑类必修，6学分',
      '数据与数字新闻': m.data_courses.map(([n, c, h]) => `${n} · ${c}学分 / ${h}学时`).join('<br>'),
    };
    root.leaves().forEach((l, i) => {
      const isData = l.data.name.includes('数据');
      const g = svg.append('g');
      const r = g.append('rect').attr('x', l.x0).attr('y', l.y0).attr('width', l.x1 - l.x0).attr('height', l.y1 - l.y0)
        .attr('fill', isData ? C.coral : (i ? C.blueD : C.blue)).attr('filter', flt).style('opacity', 0);
      r.transition().delay(i * 250).duration(600).style('opacity', 1);
      g.append('text').attr('x', l.x0 + 16).attr('y', l.y0 + 50).attr('fill', '#fff').attr('font-size', 46).attr('font-weight', 800).text(l.data.v);
      g.append('text').attr('x', l.x0 + 16).attr('y', l.y0 + 80).attr('fill', '#fff').attr('font-size', 16).text(l.data.name + ' · 学分');
      bindTip(r, () => `<b>${l.data.name}</b><br>${tips[l.data.name]}`);
    });
  }

  // ------------------------------------------------------------ 中传6个方向（浅色章节）
  function cuc6(el, D) {
    const rows = D.cuc_directions.rows.map(([name, note, k, n]) => ({ name, note, k, n }));
    const W = 680, L = 210, rowH = 52, H = rows.length * rowH + 20;
    const x = d3.scaleLinear().domain([0, .35]).range([L, W - 90]);
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    rows.forEach((r, i) => {
      const g = svg.append('g').attr('transform', `translate(0,${i * rowH})`);
      const hl = r.name === '新闻学';
      g.append('text').attr('x', L - 14).attr('y', 22).attr('text-anchor', 'end').attr('fill', '#142232').attr('font-size', 14.5).attr('font-weight', hl ? 800 : 500).text(r.name);
      g.append('text').attr('x', L - 14).attr('y', 39).attr('text-anchor', 'end').attr('fill', '#7a8a96').attr('font-size', 11).text(r.note);
      g.append('rect').attr('x', L).attr('y', 8).attr('height', 26).attr('width', x(.35) - L).attr('fill', '#efece2');
      const b = g.append('rect').attr('x', L).attr('y', 8).attr('height', 26).attr('width', 0).attr('fill', r.k >= 7 ? '#142232' : '#d9b84a');
      b.transition().delay(i * 150).duration(900).attr('width', x(r.k / r.n) - L);
      g.append('text').attr('x', x(r.k / r.n) + 10).attr('y', 27).attr('fill', '#142232').attr('font-size', 15).attr('font-weight', 700).text(`${r.k} / ${r.n} 门`);
      bindTip(b, () => `<b>${r.name}</b>（${r.note}）<br>主要课程 ${r.n} 门，其中数据、计算与AI类 ${r.k} 门（${pct(r.k, r.n)}）`);
    });
  }

  // ------------------------------------------------------------ 失眠序列：招聘原文气泡
  function bubbles(D) {
    const host = document.querySelector('.insomnia .bubbles');
    if (!host) return;
    const pos = [[4, 12], [58, 9], [30, 22], [66, 26], [2, 30], [40, 6], [62, 42], [6, 46]];
    const els = D.jd_quotes.map((q, i) => {
      const a = document.createElement('a');
      a.className = 'bubble';
      a.href = q.url; a.target = '_blank'; a.rel = 'noopener';
      a.style.left = pos[i % pos.length][0] + '%';
      a.style.top = pos[i % pos.length][1] + '%';
      a.innerHTML = `“${q.quote}”<small>—— ${q.employer} · ${q.title}</small>`;
      host.appendChild(a);
      return a;
    });
    window.sceneHooks.push((sc, p) => {
      if (!sc.classList.contains('insomnia')) return;
      const k = Math.floor(p * (els.length + 1.5));
      const keep = innerWidth < 760 ? 1 : 3;
      els.forEach((e, i) => { e.classList.toggle('in', i < k); e.classList.toggle('old', i < k - keep); });
    });
  }
})();
