/* Responsive D3 charts. Marks render once; scrolling never redraws them. */
(function () {
  const C = {chalk:'#e8edf1', ink:'#c9d3db', blue:'#7fa3b5', blueD:'#4f7385', coral:'#c96b6b', coralL:'#e7a9a4', navy:'#142232', grid:'rgba(232,237,241,.18)'};
  const tip = document.createElement('div'); tip.className = 'tip'; tip.id = 'chart-tooltip'; tip.setAttribute('role', 'tooltip'); document.body.append(tip);
  let tipTarget = null;
  const hideTip = () => { tip.classList.remove('show'); tipTarget?.removeAttribute('aria-describedby'); tipTarget = null; };
  function showTip(ev, html, node) {
    hideTip(); tipTarget = node; tip.innerHTML = html; tip.classList.add('show');
    node.setAttribute('aria-describedby', tip.id);
    const r = node.getBoundingClientRect(), box = tip.getBoundingClientRect();
    const x = ev.clientX || (r.left + r.width / 2), y = ev.clientY || r.top;
    tip.style.left = Math.max(10, Math.min(x + 12, document.documentElement.clientWidth - box.width - 10)) + 'px';
    tip.style.top = Math.max(10, Math.min(y + 16, innerHeight - box.height - 10)) + 'px';
  }
  function bindTip(sel, fn) {
    sel.attr('tabindex', 0).attr('role', 'graphics-symbol').attr('aria-label', d => fn(d).replace(/<br\s*\/?\s*>/g, '，').replace(/<[^>]*>/g, ''))
      .on('pointerenter', function(ev,d) { if(ev.pointerType !== 'touch') showTip(ev,fn(d),this); })
      .on('pointerleave', ev => { if(ev.pointerType !== 'touch') hideTip(); })
      .on('click', function(ev,d) { showTip(ev,fn(d),this); })
      .on('focus', function(ev,d) { showTip(ev,fn(d),this); }).on('blur',hideTip)
      .on('keydown', function(ev,d) { if(ev.key==='Enter'||ev.key===' ') {ev.preventDefault(); showTip(ev,fn(d),this);} });
    return sel;
  }
  addEventListener('scroll',hideTip,{passive:true});
  addEventListener('resize',hideTip,{passive:true});
  document.addEventListener('pointerdown',e=>{if(tipTarget&&!tipTarget.contains(e.target))hideTip();},{passive:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip();});
  const pct = (a,b) => Math.round(a/b*100)+'%';
  const small = W => W < 540;
  function svg(el,W,H) {
    return d3.select(el).append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H).attr('role','group').attr('aria-label',el.closest('figure').querySelector('figcaption b').textContent);
  }
  function text(g,x,y,value,size=13,color=C.ink,anchor='start') {
    return g.append('text').attr('x',x).attr('y',y).attr('fill',color).attr('font-size',size).attr('text-anchor',anchor).text(value);
  }
  function wrap(g,x,y,value,width,size=13,color=C.ink) {
    const cap=Math.max(1,Math.floor(width/size)), lines=[];
    for(let i=0;i<value.length;i+=cap)lines.push(value.slice(i,i+cap));
    const t=text(g,x,y,'',size,color);
    lines.forEach((line,i)=>t.append('tspan').attr('x',x).attr('dy',i?size*1.5:0).text(line));
    return lines.length*size*1.5;
  }
  function rect(g,x,y,w,h,c) {return g.append('rect').attr('x',x).attr('y',y).attr('width',Math.max(0,w)).attr('height',h).attr('fill',c);}
  function legend(g,items,W,y,size=12) {
    let x=0,row=0;
    items.forEach(([label,color])=>{
      const width=label.length*size+30;
      if(x&&x+width>W){x=0;row++;}
      rect(g,x,y+row*24,11,11,color);text(g,x+17,y+10+row*24,label,size);x+=width;
    });
  }

  function cut16(el,D,W) {
    const groups=D.cuc_cut16.groups.map(([name,how,items,n])=>({name,how,items,n})).concat([{name:'另一端：新增',how:'2024年度教育部备案 / 审批',items:D.cuc_cut16.added,n:D.cuc_cut16.added.length}]);
    const cols=small(W)?2:5,gap=8,cw=(W-gap*(cols-1))/cols,ch=46;
    let H=0;
    groups.forEach(gr=>{gr.y=H;gr.head=48+Math.ceil(gr.how.length/Math.floor((W-44)/12))*18;H+=gr.head+Math.ceil(gr.items.length/cols)*(ch+gap)+22;});
    const s=svg(el,W,H),colors=[C.coral,'#a65a5a','#b9736e',C.blueD];
    groups.forEach((gr,gi)=>{
      const g=s.append('g').attr('transform',`translate(0,${gr.y})`);
      text(g,0,34,gr.n,30,C.chalk).attr('font-weight',700);text(g,44,19,gr.name,15,C.chalk);
      wrap(g,44,40,gr.how,W-44,12,C.blue);
      gr.items.forEach((it,i)=>{
        const x=(i%cols)*(cw+gap), y=gr.head+Math.floor(i/cols)*(ch+gap),unnamed=it.includes('未列名');
        const cell=g.append('g');rect(cell,x,y,cw,ch,unnamed?'none':colors[gi]).attr('rx',3).attr('stroke',unnamed?C.ink:'none').attr('stroke-dasharray','4 3');
        const cap=Math.floor((cw-12)/12),lines=Math.ceil(it.length/cap);
        const t=text(cell,x+cw/2,y+(ch-lines*17)/2+13,'',12,'#fff','middle');
        for(let n=0;n<lines;n++)t.append('tspan').attr('x',x+cw/2).attr('dy',n?17:0).text(it.slice(n*cap,(n+1)*cap));
      });
    });
  }
  function moe(el,D,W) {
    const m=D.moe_2024,compact=small(W),L=compact?0:120,rowH=compact?75:58;
    const rows=[['停招专业点',m.停招,C.coral],['撤销专业点',m.撤销,C.coral],['新增专业点',m.新增,C.blue],['调整门类或年限',m['调整门类或年限'],C.blueD],['停招＋撤销',m.停招+m.撤销,C.coralL]];
    const H=rowH*5+52,s=svg(el,W,H),x=d3.scaleLinear().domain([0,3648]).range([0,W-L-64]);
    rows.forEach(([k,v,c],i)=>{
      const y=i*rowH,by=y+(compact?28:8);
      text(s,compact?0:L-12,y+(compact?17:28),k,14,C.chalk,compact?'start':'end');
      const b=rect(s,L,by,x(v),26,i===4?'none':c);
      if(i===4)b.attr('stroke',c).attr('stroke-dasharray','5 3');
      text(s,L+x(v)+8,by+20,v,17,C.chalk).attr('font-weight',700);
      bindTip(b,()=>`<b>${k}</b>：${v} 个<br>2024年度 · 全国本科专业布点共${m.布点总数}个`);
    });
    wrap(s,L,rowH*5+4,'停招2220＋撤销1428＝3648，约为新增1839的1.98倍',W-L,12);
  }
  function moe0503(el,D,W) {
    const rows=D.moe_0503_years;if(!rows)return;
    const keys=[['传统五专业',C.coral],['网络与新媒体',C.blue],['其他新兴专业','#9aa7b1']];
    const compact=small(W),L=30,T=30,B=compact?130:92,H=440,s=svg(el,W,H);
    const x=d3.scaleBand().domain(rows.map(d=>d.year)).range([L,W-6]).padding(.32),y=d3.scaleLinear().domain([-40,72]).range([H-B,T]);
    [-40,-20,0,20,40,60].forEach(v=>{s.append('line').attr('x1',L).attr('x2',W-6).attr('y1',y(v)).attr('y2',y(v)).attr('stroke',v?C.grid:C.chalk);text(s,L-6,y(v)+4,v>0?'+'+v:v,11,C.ink,'end');});
    text(s,L,15,'↑ 新增专业点',12,C.chalk);text(s,L,H-B+20,'↓ 撤销专业点',12,C.coralL);
    rows.forEach(d=>{
      const cx=x(d.year),bw=x.bandwidth();let acc=0;
      keys.forEach(([k,c])=>{const v=d.add[k]||0;if(!v)return;bindTip(rect(s,cx,y(acc+v),bw,y(acc)-y(acc+v)-1,c),()=>`<b>${d.year}年度 · 新增 · ${k}</b>：${v} 个<br>当年新传类新增共 ${d3.sum(Object.values(d.add))} 个${d.二学位?`（含二学位 ${d.二学位} 个）`:''}`);acc+=v;});
      text(s,cx+bw/2,y(acc)-6,'+'+acc,11,C.chalk,'middle');
      if(d.del){let total=0;keys.forEach(([k,c])=>{const v=d.del[k]||0;if(!v)return;bindTip(rect(s,cx,y(-total),bw,y(-total-v)-y(-total)-1,c),()=>`<b>${d.year}年度 · 撤销 · ${k}</b>：${v} 个`);total+=v;});text(s,cx+bw/2,y(-total)+15,'−'+total,11,C.coralL,'middle');}
      else {const g=s.append('g');rect(g,cx,y(0)+2,bw,y(-30)-y(0),'none').attr('stroke',C.coralL).attr('stroke-dasharray','4 4');text(g,cx+bw/2,y(-15)+5,'?',18,C.coralL,'middle');bindTip(g,()=>`<b>${d.year}年度 · 撤销</b><br>教育部附件不再列逐校撤销名单，只公布全国总数，无法统计新传类`);}
      text(s,cx+bw/2,H-B+42,d.year,12,C.ink,'middle');
    });
    legend(s,keys,W,H-B+59);text(s,0,H-4,'?  附件无撤销名单',12,C.coralL);
  }
  function circles(el,D,W) {
    const cs=D.jobs.circles,compact=small(W),R=compact?Math.min(118,(W-20)/2):(W-30)/6,H=compact?cs.length*(R*2+55):R*2+60,s=svg(el,W,H);
    cs.forEach((c,i)=>{
      const g=s.append('g').attr('transform',`translate(${compact?W/2:R+5+i*(2*R+10)},${compact?R+5+i*(2*R+55):R+5})`);
      g.append('circle').attr('r',R).attr('fill',[C.coral,C.blueD,'#597b8d'][i]);
      const fs=d3.scaleLinear().domain([1,c.n]).range([11,compact?26:23]);
      const list=[];c.words.filter(w=>w.count>0).slice(0,7).forEach((w,k)=>k%2?list.push(w):list.unshift(w));
      let yy=-list.reduce((n,w)=>n+fs(w.count)*1.22,0)/2;
      list.forEach(w=>{const f=fs(w.count);yy+=f*1.22;bindTip(text(g,0,yy-f*.22,w.skill.replace('（通用）',''),f,'#fff','middle').attr('font-weight',f>20?700:400),()=>`<b>${c.group}</b>：${w.skill}<br>${w.count} / ${c.n} 条岗位点名（${pct(w.count,c.n)}）`);});
      text(g,0,R+29,`${c.group} · ${c.n}条`,compact?17:15,C.chalk,'middle');
    });
  }
  function skills(el,D,W) {
    const J=D.jobs,compact=small(W),fig=el.closest('figure'),net=el.dataset.group||'互联网·内容岗';
    const series=[['中央媒体',C.chalk],['市场化媒体',C.blue],[net,C.coral]],L=compact?12:140,R=14,T=compact?124:76,rowH=compact?66:34,H=T+J.skills.length*rowH+12;
    const s=svg(el,W,H),x=d3.scaleLinear().domain([0,1]).range([L,W-R]);
    legend(s,series.map(([key,c])=>[`${key}（${J.n[key]}）`,c]),W,4);
    [0,.25,.5,.75,1].forEach(v=>{s.append('line').attr('x1',x(v)).attr('x2',x(v)).attr('y1',T-8).attr('y2',H-12).attr('stroke',C.grid);text(s,x(v),T-18,v*100+'%',11,C.ink,'middle');});
    [...J.skills].sort((a,b)=>b[net]-a[net]).forEach((d,i)=>{
      const yy=T+i*rowH+(compact?27:8),vals=series.map(([key,c])=>({key,c,n:d[key],v:d[key]/J.n[key]}));
      text(s,compact?0:L-12,yy+(compact?-17:4),d.skill,13,C.chalk,compact?'start':'end');
      s.append('line').attr('x1',x(d3.min(vals,v=>v.v))).attr('x2',x(d3.max(vals,v=>v.v))).attr('y1',yy).attr('y2',yy).attr('stroke',C.ink).attr('stroke-opacity',.5).attr('stroke-width',2);
      vals.forEach((v,j)=>{const g=s.append('g');g.append('circle').attr('cx',x(v.v)).attr('cy',yy+(j-1)*5).attr('r',7).attr('fill',v.c).attr('stroke',C.navy).attr('stroke-width',1.5);bindTip(g,()=>`<b>${d.skill}</b><br>${v.key}：${v.n} / ${J.n[v.key]} 条（${pct(v.n,J.n[v.key])}）`);});
    });
    fig.querySelectorAll('.toggle button').forEach(b=>{
      b.setAttribute('aria-pressed',String(b.dataset.g===net));b.classList.toggle('on',b.dataset.g===net);
      b.onclick=()=>{if(el.dataset.group===b.dataset.g)return;el.dataset.group=b.dataset.g;hideTip();el.replaceChildren();skills(el,D,W);};
    });
  }
  function majors(el,D,W) {
    const rows=D.jobs.majors,compact=small(W),L=compact?0:100,R=compact?0:128,rowH=compact?110:68,H=rows.length*rowH+58,s=svg(el,W,H);
    const x=d3.scaleLinear().domain([0,1]).range([L,W-R]),parts=[['限定',C.coral,'只接受所列专业'],['优先',C.coralL,'所列专业优先'],['未提或不限',C.blueD,'未提专业或专业不限']];
    rows.forEach((r,i)=>{
      const y=i*rowH,by=y+(compact?31:12);text(s,compact?0:L-12,y+(compact?18:26),r.group,14,C.chalk,compact?'start':'end');
      text(s,compact?W:L-12,y+(compact?18:45),r.n+'条',12,C.blue,compact?'end':'end');let acc=0;
      parts.forEach(([k,c,desc])=>{const v=r[k]/r.n,w=x(acc+v)-x(acc);if(r[k]){const g=s.append('g');rect(g,x(acc),by,w-2,30,c);text(g,x(acc)+w/2-1,by+21,r[k],13,k==='优先'?C.navy:'#fff','middle');bindTip(g,()=>`<b>${r.group}</b> · ${desc}<br>${r[k]} / ${r.n} 条`);}acc+=v;});
      text(s,compact?0:W-R+12,compact?by+54:by+12,`点名新传 ${r['点名新传']}`,12,C.chalk);
      text(s,compact?W:W-R+12,compact?by+54:by+30,`点名理工数统 ${r['点名理工数统计算机']}`,12,C.coralL,compact?'end':'start');
    });legend(s,parts.map(([k,c])=>[k,c]),W,H-42);
  }
  function cost(el,D,W) {
    const rows=[
      {k:'中传辅修 · 学位',v:5200,f:'40学分 × 130元',t:'周三晚、周五晚、周末（校内）',who:'走进新传',extra:'含5学分毕业论文；主修结束即止'},
      {k:'中传辅修 · 证书',v:3250,f:'25学分 × 130元',t:'周三晚、周五晚、周末（校内）',who:'走进新传',extra:'证书不授予学位'},
      {k:'北大 FLIC',v:null,f:'简章未列额外学费',t:'校内跨院修读',who:'走进新传',extra:'报名成绩须居前50%；不可修双学位'},
      {k:'北大 国际金融',v:0,f:'不另收学费',t:'9—4月深圳，4—6月英国',who:'跨出新传',extra:'住宿、生活、交通、保险自理（未公开金额）',hidden:true}
    ];
    const compact=small(W),L=compact?0:146,rowH=compact?154:108,H=rows.length*rowH,s=svg(el,W,H),x=d3.scaleLinear().domain([0,6000]).range([0,W-L-86]);
    rows.forEach((it,i)=>{
      const y=i*rowH,by=y+(compact?35:12),g=s.append('g');
      text(g,compact?0:L-12,y+(compact?20:30),it.k,15,C.chalk,compact?'start':'end');
      text(g,compact?W:L-12,y+(compact?20:50),it.who,11,C.blue,'end');
      if(it.v){rect(g,L,by,x(it.v),27,C.coral);text(g,L+x(it.v)+8,by+21,it.v.toLocaleString()+' 元',15,C.chalk);}
      else text(g,L,by+21,it.v===null?it.f:'0 元学费 ＋ 异地生活费用',14,C.chalk);
      let ty=by+51;
      ty+=wrap(g,L,ty,`${it.f} · ${it.t}`,W-L,12);
      if(it.hidden)wrap(g,L,ty+2,it.extra,W-L,12,C.coralL);
      bindTip(g,()=>`<b>${it.k}</b><br>${it.f}<br>时间地点：${it.t}<br>${it.extra}`);
    });
  }
  function seats(el,D,W) {
    const compact=small(W),cols=compact?10:20,step=compact?(W-20)/cols:(W-160)/cols,rowH=compact?152:94,H=D.admissions.length*rowH,s=svg(el,W,H);
    const person='M0,-14 a5,5 0 1,1 0.01,0 Z M-7,-6 Q0,-9 7,-6 L8,10 L-8,10 Z';
    D.admissions.forEach((r,i)=>{
      const y=i*rowH;text(s,0,y+19,`${r.year} ${r.short}`,15,C.chalk);
      text(s,0,y+47,r.count,26,C.coralL).attr('font-weight',700);
      text(s,34,y+46,`/ ${r.short==='国际金融'?'约':''}${r.plan}人 · ${r.status}`,12);
      for(let k=0;k<r.plan;k++)s.append('path').attr('d',person).attr('transform',`translate(${(compact?10:164)+(k%cols)*step},${y+(compact?82:36)+Math.floor(k/cols)*32})`).attr('fill',k<r.count?C.coral:'none').attr('stroke',k<r.count?C.coral:C.blue).attr('stroke-width',1.3);
      text(s,compact?W:164,y+(compact?140:75),`空 ${r.plan-r.count}`,12,C.blue,compact?'end':'start');
    });
  }
  function minor(el,D,W) {
    const m=D.cuc_minor,H=small(W)?340:300,s=svg(el,W,H);
    const root=d3.hierarchy({children:m.blocks.map(([name,v])=>({name,v}))}).sum(d=>d.v);d3.treemap().size([W,H]).paddingInner(6)(root);
    root.leaves().forEach((l,i)=>{
      const g=s.append('g');rect(g,l.x0,l.y0,l.x1-l.x0,l.y1-l.y0,i===2?C.coral:i?C.blueD:C.blue);
      const cellH=l.y1-l.y0;
      text(g,l.x0+14,l.y0+Math.min(51,cellH*.52),l.data.v,42,'#fff').attr('font-weight',800);wrap(g,l.x0+14,l.y0+Math.min(78,cellH-16),l.data.name+' · 学分',l.x1-l.x0-24,14,'#fff');
      bindTip(g,()=>`<b>${l.data.name}</b><br>${i===2?m.data_courses.map(([n,c,h])=>`${n} · ${c}学分 / ${h}学时`).join('<br>'):l.data.v+'学分'}`);
    });
  }
  function cuc6(el,D,W) {
    const compact=small(W),L=compact?0:210,rowH=compact?103:60,H=D.cuc_directions.rows.length*rowH+8,s=svg(el,W,H),x=d3.scaleLinear().domain([0,.35]).range([0,W-L-83]);
    D.cuc_directions.rows.forEach(([name,note,k,n],i)=>{
      const y=i*rowH,by=y+(compact?58:10);text(s,compact?0:L-14,y+22,name,compact?14:13,'#142232',compact?'start':'end').attr('font-weight',name==='新闻学'?800:500);
      text(s,compact?0:L-14,y+41,note,11.5,'#526675',compact?'start':'end');
      const g=s.append('g');rect(g,L,by,x(.35),26,'#efece2');rect(g,L,by,x(k/n),26,k>=7?'#142232':'#d9b84a');
      text(g,L+x(k/n)+8,by+20,`${k} / ${n} 门`,14,'#142232').attr('font-weight',700);
      bindTip(g,()=>`<b>${name}</b>（${note}）<br>主要课程 ${n} 门，其中数据、计算与AI类 ${k} 门（${pct(k,n)}）`);
    });
  }
  function bubbles(D) {
    const host=document.querySelector('.insomnia .bubbles');if(!host)return;
    const pos=[[4,12],[58,9],[30,22],[66,26],[2,30],[40,6],[62,42],[6,46]];
    const els=D.jd_quotes.map((q,i)=>{const a=document.createElement('a');a.className='bubble';a.href=q.url;a.target='_blank';a.rel='noopener';a.style.left=pos[i%pos.length][0]+'%';a.style.top=pos[i%pos.length][1]+'%';a.innerHTML=`“${q.quote}”<small>—— ${q.employer} · ${q.title}</small>`;a.tabIndex=-1;host.append(a);return a;});
    let prev=-1,prevKeep=0;
    window.sceneHooks.push((sc,p)=>{
      if(!sc.classList.contains('insomnia'))return;
      const k=Math.min(els.length,Math.floor(p*(els.length+1.5))),keep=innerWidth<760?1:3;
      if(k===prev&&keep===prevKeep)return;prev=k;prevKeep=keep;
      els.forEach((e,i)=>{const visible=i<k&&i>=k-keep;e.classList.toggle('in',i<k);e.classList.toggle('old',i<k-keep);e.tabIndex=visible?0:-1;e.setAttribute('aria-hidden',String(!visible));});
    });
  }
  const specs=[['c-cut16',cut16],['c-moe',moe],['c-0503',moe0503],['c-circles',circles],['c-skills',skills],['c-majors',majors],['c-cost',cost],['c-seats',seats],['c-minor',minor],['c-cuc6',cuc6]];
  fetch('assets/data/story.json').then(r=>{if(!r.ok)throw Error('Chart data '+r.status);return r.json();}).then(D=>{
    const charts=specs.map(([id,fn])=>({el:document.getElementById(id),fn,width:0})).filter(c=>c.el);
    function render() {
      const sizes=charts.map(c=>Math.round(c.el.getBoundingClientRect().width));
      charts.forEach((c,i)=>{const W=sizes[i];if(W>0&&c.width!==W){c.width=W;c.el.replaceChildren();c.fn(c.el,D,W);}});
      window.refreshScroll?.();
    }
    render();bubbles(D);window.refreshScroll?.();
    let timer;
    const observer=new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(render,120);});
    charts.forEach(c=>observer.observe(c.el));
  }).catch(()=>{
    specs.forEach(([id])=>{const el=document.getElementById(id);if(el){const btn=document.createElement('button');btn.className='chart-retry';btn.textContent='重新加载图表';btn.onclick=()=>location.reload();el.append(btn);}});
  });
})();
