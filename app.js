'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let castCardFor=null, castPinned=false, castTimer;
  const parallaxWindows = $$('.chapter-cover>.scene-background');

  // No CSS URL is assigned before the asset approaches the viewport.
  function loadScene(el){
    if(el.classList.contains('wash-layer')){loadWash(el);return;}
    if(el.dataset.bg){el.style.backgroundImage=`url("${el.dataset.bg}")`;el.dataset.bgLoaded='true';}
    if(el.dataset.src){el.src=el.dataset.src;el.dataset.bgLoaded='true';}
  }
  // Washes: a faint illustration under long prose and data panels (image → directional shade → text).
  // The layer is built here so no image URL exists until the band approaches the viewport.
  $$('[data-wash]').forEach(el=>{el.classList.add('wash','wash-'+el.dataset.wash);const layer=document.createElement('div');layer.className='wash-layer';layer.setAttribute('aria-hidden','true');layer.innerHTML='<i></i>';el.prepend(layer);});
  function loadWash(layer){const src=`assets/img/scene-${layer.parentElement.dataset.wash}.jpg`;const img=new Image();img.onload=()=>{layer.style.setProperty('--wash-img',`url("${src}")`);layer.classList.add('is-loaded');};img.src=src;}
  const sceneAssets=$$('[data-bg],[data-src],.wash-layer');
  const sceneObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){loadScene(e.target);sceneObserver.unobserve(e.target);}}),{rootMargin:'200px 0px',threshold:0}):null;
  sceneAssets.forEach(el=>sceneObserver?sceneObserver.observe(el):loadScene(el));
  const topButton = $('.return-top');
  const runningAnimations = new Map();
  function enterTransition(el, scale=false) {
    runningAnimations.get(el)?.cancel();
    if(reducedMotion.matches || !el.animate)return;
    const animation=el.animate(scale?[{opacity:0,transform:'scale(.96) translateY(6px)'},{opacity:1,transform:'scale(1) translateY(0)'}]:[{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.16,1,.3,1)'});
    runningAnimations.set(el,animation);
    animation.onfinish=()=>{if(runningAnimations.get(el)===animation)runningAnimations.delete(el);};
  }
  topButton.addEventListener('click',()=>{window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});$('#top').setAttribute('tabindex','-1');$('#top').focus({preventScroll:true});});
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeURL = value => { try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.href : '#source-records'; } catch { return '#source-records'; } };
  const tipSource = (label, link = '') => `<footer class="tooltip-source"><span>${esc(label)}</span>${link}</footer>`;
  const sourceLink = (url, title = '查看原文') => `<a href="${esc(safeURL(url))}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>`;
  const pressed = (selector, active, key) => $$(selector).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[key] === String(active))));
  const menu = $('.menu-toggle'), nav = $('#chapter-nav');
  function closeMenu() { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded','false'); menu.setAttribute('aria-label','打开章节目录'); }
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; nav.classList.toggle('is-open',open); menu.setAttribute('aria-expanded',String(open)); menu.setAttribute('aria-label',open?'关闭章节目录':'打开章节目录'); });
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {closeMenu(); menu.focus();} });
  document.addEventListener('click', e => { if (!nav.contains(e.target) && !menu.contains(e.target)) closeMenu(); });
  const chapters = $$('[data-chapter]');
  let framePending = false;
  function updateReading() {
    const max = document.documentElement.scrollHeight - innerHeight;
    $('.reading-progress i').style.transform = `scaleX(${max > 0 ? Math.min(1,scrollY/max) : 0})`;
    document.body.classList.toggle('has-scrolled',scrollY > 100);
    const visible=scrollY>innerHeight*2;
    topButton.classList.toggle('is-visible',visible);
    topButton.setAttribute('aria-hidden',String(!visible));topButton.tabIndex=visible?0:-1;
    for(const el of parallaxWindows){
      const r=el.getBoundingClientRect();
      const y=!reducedMotion.matches && innerWidth>650 && r.bottom>0 && r.top<innerHeight ? Math.max(-18,Math.min(18,(innerHeight/2-r.top-r.height/2)*.045)):0;
      el.style.setProperty('--parallax-y',y+'px');
    }
    const current = [...chapters].reverse().find(x => x.getBoundingClientRect().top < innerHeight * .4) || chapters[0];
    $$('#chapter-nav a').forEach(a => {const active = a.hash === '#'+current.id; a.classList.toggle('active',active); if (active) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current');});
    const heroBottom=$('.hero').getBoundingClientRect().bottom, endRect=$('.ending').getBoundingClientRect();
    document.body.classList.toggle('cast-ready',heroBottom<innerHeight*.35);
    // Fixed UI sits on the light ending surface: switch it to ink so it stays legible.
    document.body.classList.toggle('nav-on-paper',endRect.top<innerHeight-200&&endRect.bottom>innerHeight-60);
    document.body.classList.toggle('rail-on-paper',endRect.top<innerHeight*.2&&endRect.bottom>innerHeight*.6);
    if(castCardFor)positionCastCard();
    framePending=false;
  }
  const requestReading = () => { if (!framePending) {framePending=true;requestAnimationFrame(updateReading);} };
  addEventListener('scroll',requestReading,{passive:true});addEventListener('resize',requestReading);updateReading();
  $$('[data-year]').forEach(b => b.addEventListener('click',()=> {pressed('[data-year]',b.dataset.year,'year'); $$('.program').forEach(p=> {p.hidden=b.dataset.year!=='all'&&!p.dataset.years.includes(b.dataset.year);});}));
  // Cast rail: one avatar for the opening's scenario character; it lights up while the story narrates her.
  const castInfo={protagonist:{name:'她',role:'中传传播学（计算传播方向）2023级 · 引子人物',line:'专业名字还在，但已经改过一次。',links:[['出场 · 引子','#intro'],['本章 · 方向课程对照','#rewrite-title'],['结尾 · 她的下一张课表','#her-plan']]}};
  const castButtons=$$('.cast-avatar'), castCard=$('#cast-card'), litRefs=new Set();
  function paintCast(){const lit=new Set([...litRefs].map(el=>el.dataset.personRef));castButtons.forEach(b=>{const on=lit.has(b.dataset.cast);b.classList.toggle('is-lit',on);if(on)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});$$('.person-name').forEach(n=>n.classList.toggle('is-lit',lit.has(n.dataset.person)));}
  if('IntersectionObserver' in window){const castObserver=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting)litRefs.add(e.target);else litRefs.delete(e.target);}paintCast();},{rootMargin:'-28% 0px -28% 0px',threshold:0});$$('[data-person-ref]').forEach(el=>castObserver.observe(el));}
  function positionCastCard(){
    if(!castCardFor||castCard.hidden)return;
    const r=castCardFor.getBoundingClientRect(), w=castCard.offsetWidth, h=castCard.offsetHeight;
    if(innerWidth>1050){castCard.style.left=Math.min(innerWidth-w-16,r.right+18)+'px';castCard.style.top=Math.max(76,Math.min(innerHeight-h-16,r.top-12))+'px';}
    else{const rail=$('.cast-rail').getBoundingClientRect();castCard.style.left='';castCard.style.top=Math.max(76,Math.min(innerHeight-h-12,rail.bottom+8))+'px';}
  }
  function closeCast(){clearTimeout(castTimer);castCard.hidden=true;castCardFor?.setAttribute('aria-expanded','false');castCardFor=null;castPinned=false;}
  function openCast(btn,pin){
    clearTimeout(castTimer);
    if(castPinned&&!pin&&btn!==castCardFor)return;
    const key=btn.dataset.cast, p=castInfo[key], entering=castCard.hidden||castCardFor!==btn;
    castCardFor?.setAttribute('aria-expanded','false'); castCardFor=btn; castPinned=pin; btn.setAttribute('aria-expanded','true');
    castCard.innerHTML=`<button type="button" class="cast-card-close" aria-label="关闭人物说明">关闭</button><div class="cast-card-head"><img src="assets/img/avatar-${key}.jpg" alt="" width="64" height="64"><div><strong>${esc(p.name)}</strong><span>${esc(p.role)}</span></div></div><blockquote>${esc(p.line)}</blockquote><div class="cast-card-links">${p.links.map(([text,to])=>`<a href="${to}">${esc(text)} →</a>`).join('')}</div><small>人物为基于真实专业调整信息构建的叙事场景，并非采访对象；肖像为 AI 插画</small>`;
    castCard.hidden=false; positionCastCard(); if(entering)enterTransition(castCard,true);
    castCard.querySelector('.cast-card-close').addEventListener('click',()=>{const origin=castCardFor;closeCast();origin?.focus();});
    castCard.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeCast));
  }
  const deferCast=()=>{if(!castPinned){clearTimeout(castTimer);castTimer=setTimeout(closeCast,260);}};
  castButtons.forEach(b=>{
    b.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')openCast(b,false);});b.addEventListener('pointerleave',deferCast);
    b.addEventListener('focus',()=>openCast(b,false));b.addEventListener('blur',e=>{if(!castCard.contains(e.relatedTarget))deferCast();});
    b.addEventListener('click',()=>{if(castCardFor===b&&castPinned)closeCast();else openCast(b,true);});
  });
  castCard.addEventListener('pointerenter',()=>clearTimeout(castTimer));castCard.addEventListener('pointerleave',deferCast);
  castCard.addEventListener('focusout',e=>{if(!castCard.contains(e.relatedTarget)&&e.relatedTarget!==castCardFor)deferCast();});
  document.addEventListener('click',e=>{if(castCardFor&&!castCard.contains(e.target)&&!castCardFor.contains(e.target))closeCast();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!castCard.hidden){const origin=castCardFor;closeCast();origin?.focus();}});
  addEventListener('resize',positionCastCard);
  let story, jobSkillIndex;
  const tooltip=document.createElement('aside');
  tooltip.id='chart-tooltip'; tooltip.className='chart-tooltip'; tooltip.hidden=true;
  tooltip.setAttribute('role','region'); tooltip.setAttribute('aria-label','图表详情与来源');
  document.body.append(tooltip);
  let tooltipTarget=null, tooltipPinned=false, closeTimer, tooltipPoint=null, tooltipFrame=0;
  function trackTooltip(e){
    if(e.pointerType==='touch'||tooltipPinned)return;
    tooltipPoint={x:e.clientX,y:e.clientY};
    if(!tooltipFrame)tooltipFrame=requestAnimationFrame(()=>{tooltipFrame=0;positionTooltip();});
  }
  // Delegation also covers D3 cells rebuilt after changing filters.
  document.addEventListener('pointermove',e=>{if(e.target.closest('.skill-cell,.chart-hit,.credit-quilt button'))trackTooltip(e);},{passive:true});
  document.addEventListener('pointerover',e=>{if(e.target.closest('.skill-cell,.chart-hit,.credit-quilt button'))trackTooltip(e);},true);
  document.addEventListener('focusin',e=>{if(e.target.closest('.skill-cell,.chart-hit,.credit-quilt button')){tooltipPoint=null;positionTooltip();}});

  function clearChartGroup(){ $$('.chart-group-active').forEach(el=>el.classList.remove('chart-group-active')); $$('.is-chart-muted,.is-chart-linked,.is-chart-selected').forEach(el=>el.classList.remove('is-chart-muted','is-chart-linked','is-chart-selected')); }
  function linkChartGroup(target){
    clearChartGroup();
    const chart=target.closest('#skills-chart,.time-chart,.admissions-figure,.routes,.credit-quilt,.cuc16-figure');
    if(!chart)return;
    chart.classList.add('chart-group-active');
    const cells=[...chart.querySelectorAll('.skill-cell,.time-row,.admission-row,.routes>div,.credit-quilt button,.unit-group')];
    cells.forEach(el=>{const linked=target.dataset.chartGroup?el.dataset.chartGroup===target.dataset.chartGroup:el===target;el.classList.add(linked?'is-chart-linked':'is-chart-muted');});
    target.classList.add('is-chart-selected');
    if(target.dataset.chartGroup)chart.querySelectorAll('.skill-heading>div').forEach(el=>el.classList.toggle('is-chart-linked',el.dataset.chartGroup===target.dataset.chartGroup));
  }
  function hideTooltip(){clearChartGroup();clearTimeout(closeTimer); tooltip.hidden=true; tooltipTarget?.setAttribute('aria-expanded','false'); tooltipTarget=null; tooltipPinned=false;tooltipPoint=null;}
  function positionTooltip(){
    if(!tooltipTarget || tooltip.hidden)return;
    const r=tooltipTarget.getBoundingClientRect(), width=tooltip.offsetWidth,height=tooltip.offsetHeight;
    const point=tooltipPoint;
    let left=point?point.x+18:r.left+r.width/2-width/2;
    if(point&&left+width>innerWidth-16)left=point.x-width-18;
    left=Math.max(16,Math.min(innerWidth-width-16,left));
    let top=point?point.y+18:r.bottom+12;
    if(top+height>innerHeight-16)top=point?point.y-height-18:r.top-height-12;
    top=Math.max(76,Math.min(innerHeight-height-16,top));
    tooltip.style.left=left+'px';tooltip.style.top=(scrollY+top)+'px';

  }
  function showTooltip(target,html,pin=false){
    clearTimeout(closeTimer);
    if(tooltipPinned && !pin && target!==tooltipTarget)return;
    const entering=tooltip.hidden||tooltipTarget!==target;
    tooltipTarget?.setAttribute('aria-expanded','false');
    tooltipTarget=target; tooltipPinned=pin; target.setAttribute('aria-expanded','true');
    tooltip.innerHTML='<button type="button" class="tooltip-close" aria-label="关闭图表详情">关闭</button>'+html;
    tooltip.hidden=false; positionTooltip(); linkChartGroup(target); if(entering)enterTransition(tooltip,true);
    tooltip.querySelector('button').addEventListener('click',()=>{const origin=tooltipTarget;hideTooltip();origin?.focus();});
  }
  function deferHide(){if(!tooltipPinned){clearTimeout(closeTimer);closeTimer=setTimeout(hideTooltip,240);}}
  tooltip.addEventListener('pointerenter',()=>clearTimeout(closeTimer)); tooltip.addEventListener('pointerleave',deferHide);
  tooltip.addEventListener('focusin',()=>clearTimeout(closeTimer));
  tooltip.addEventListener('focusout',e=>{if(!tooltip.contains(e.relatedTarget)&&!tooltipPinned)deferHide();});
  document.addEventListener('click',e=>{if(tooltipTarget&&!tooltip.contains(e.target)&&!tooltipTarget.contains(e.target))hideTooltip();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!tooltip.hidden){const origin=tooltipTarget;hideTooltip();origin?.focus();}});
  addEventListener('resize',positionTooltip);
  addEventListener('scroll',()=>{if(tooltipTarget){const r=tooltipTarget.getBoundingClientRect();if(r.bottom<70||r.top>innerHeight)hideTooltip();}},{passive:true});
  function bindChartHit(el, content){
    el.classList.add('chart-hit'); el.tabIndex=0; el.setAttribute('role','button');el.setAttribute('aria-controls','chart-tooltip');el.setAttribute('aria-expanded','false');
    const open=pin=>showTooltip(el,content(),pin);
    el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')open(false);});
    el.addEventListener('pointerleave',deferHide);el.addEventListener('focus',()=>open(false));el.addEventListener('blur',deferHide);
    el.addEventListener('click',()=>{if(tooltipTarget===el&&tooltipPinned)hideTooltip();else open(true);});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}});
  }
  $$('.admission-row').forEach((el,i)=>bindChartHit(el,()=>{const a=story?.admissions[i];if(!a)return '<p>数据正在加载。</p>';const source=story.sources.find(x=>x.id===a.source);return `<h4>${esc(el.querySelector('.admission-label').textContent)}</h4><p>${esc(a.count)}人 / 计划${i===2?'约':''}${esc(a.plan)}人；${i===2?'拟录取':'录取'}公示。</p><p class="tooltip-note">公示人数不等同于报名人数，不能由此推算录取率。</p>${tipSource('来源：'+source.school+' · '+source.title,sourceLink(source.url,'查看公示原文'))}`;}));
  // New bar and tile charts carry their own note and source in data-tip attributes.
  $$('[data-tip]').forEach(el=>bindChartHit(el,()=>{const d=el.dataset, label=el.querySelector('span,.unit-head span')?.firstChild?.textContent||'';return `<h4>${esc(label)}</h4><p>${esc(d.tip)}</p>${tipSource('来源：'+d.tipSource,d.tipUrl?sourceLink(d.tipUrl,'查看原文'):'')}`;}));
  $$('.routes>div').forEach(el=>bindChartHit(el,()=>`<h4>${esc(el.querySelector('h4').textContent)}</h4><p>${esc(el.textContent)}</p><p class="tooltip-note">各入口的学分、凭证与最高学历要求不同，请分别核对项目简章。</p>${tipSource('来源：人大、中传公开文件；北大招生简章','<a href="#source-records">查看高校文件台账</a>')}`));
  $$('.credit-quilt button').forEach(el=>{
    const content=()=>{const rows=story?.courses.filter(c=>c.program_id==='cuc-news-2025'&&categoryNames[el.dataset.courseCategory].includes(c.name))||[];const source=story?.sources.find(x=>x.id==='cuc-minor25');return `<h4>${esc(el.textContent)}</h4><p>${rows.map(c=>`${esc(c.name)}：${c.credits}学分，${c.hours}学时`).join('<br>')}</p><p class="tooltip-note">按课程名称归类；不推断实际授课技能。</p>${tipSource('来源：'+(source?source.title:'中传2025年辅修招生简章'),source?sourceLink(source.url,'查看课程原表'):'')}`;};
    el.setAttribute('aria-controls','chart-tooltip');el.setAttribute('aria-expanded','false');
    el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')showTooltip(el,content());});el.addEventListener('pointerleave',deferHide);
    el.addEventListener('focus',()=>showTooltip(el,content()));el.addEventListener('blur',deferHide);el.addEventListener('click',()=>showTooltip(el,content(),true));
  });
  function prepareGrowth(target){
    [...target.querySelectorAll('.skill-row,.time-row,.admission-row,.credit-quilt button,.route-line')].forEach((el,i)=>el.style.setProperty('--growth-delay',Math.min(i,8)*55+'ms'));
    target.querySelectorAll('.admission-row').forEach(row=>row.querySelectorAll('.seat.occupied').forEach((seat,i)=>seat.style.setProperty('--growth-delay',Math.min(i,12)*22+'ms')));
  }
  function playGrowth(target){
    if(reducedMotion.matches)return;prepareGrowth(target);target.classList.remove('growth-play');
    requestAnimationFrame(()=>{target.classList.add('growth-play');clearTimeout(target.growthTimer);target.growthTimer=setTimeout(()=>target.classList.remove('growth-play'),1800);});
  }
  const growthTargets=$$('.admissions-figure,.skills-figure,.curriculum-figure,.adjust-figure,.nat-figure,.rewrite-figure,.routes-figure');
  growthTargets.forEach(prepareGrowth);
  if('IntersectionObserver' in window&&!reducedMotion.matches){
    const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.dataset.chartEntered='true';playGrowth(e.target);observer.unobserve(e.target);}}),{threshold:.12});
    // Skills are observed after their data has rendered.
    growthTargets.filter(el=>!el.classList.contains('skills-figure')).forEach(el=>observer.observe(el));
    window.observeSkillEntrance=()=>observer.observe($('.skills-figure'));
  }


  const openingStage=$('.opening-stage');
  if('IntersectionObserver' in window&&!reducedMotion.matches){
    openingStage.classList.add('is-armed');
    const openingObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){openingStage.classList.add('is-playing');openingObserver.disconnect();}},{threshold:.35});
    openingObserver.observe(openingStage);
  }
  const revealTargets=$$('.chapter-cover h2,.chapter-cover .chapter-question,.chapter-divider,.prose>p,.prose>.voice,.person-introduction,.her-plan,.method-card,.figure>figcaption,.figure>.chart-conclusion,.choice,.core-findings,.ending-voice,.ending>p,.ending-title,.credits-inner');
  const mediaTargets=$$('.image-window');
  const counters=$$('.lead-evidence b');
  const counterFrames=new Map();
  function countUp(el){
    if(el.dataset.counted)return;el.dataset.counted='true';
    const final=Number(el.textContent);el.dataset.countFinal=String(final);
    if(reducedMotion.matches)return;
    el.setAttribute('aria-label',String(final));
    const started=performance.now();
    const tick=now=>{if(reducedMotion.matches){el.textContent=String(final);counterFrames.delete(el);return;}const t=Math.min(1,(now-started)/1050);el.textContent=String(Math.round(final*(1-Math.pow(1-t,3))));if(t<1)counterFrames.set(el,requestAnimationFrame(tick));else counterFrames.delete(el);};
    counterFrames.set(el,requestAnimationFrame(tick));
  }
  let revealObserver,mediaObserver,countObserver;
  if('IntersectionObserver' in window&&!reducedMotion.matches){
    revealObserver=new IntersectionObserver(entries=>{
      let order=0;
      entries.filter(e=>e.isIntersecting).sort((a,b)=>a.target.getBoundingClientRect().top-b.target.getBoundingClientRect().top).forEach(e=>{e.target.style.setProperty('--reveal-delay',Math.min(order++,4)*70+'ms');e.target.classList.add('is-revealed');revealObserver.unobserve(e.target);});
    },{threshold:0,rootMargin:'0px 0px -32px 0px'});
    revealTargets.forEach(el=>{el.classList.add('reveal-pending');revealObserver.observe(el);});
    mediaObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-revealed');mediaObserver.unobserve(e.target);}}),{threshold:.08});
    mediaTargets.forEach(el=>{el.classList.add('image-pending');const img=el.querySelector('img');const settle=e=>{if(e.propertyName==='transform'){el.classList.add('image-settled');img.removeEventListener('transitionend',settle);requestReading();}};img.addEventListener('transitionend',settle);mediaObserver.observe(el);});
    countObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){countUp(e.target);countObserver.unobserve(e.target);}}),{threshold:.5});
    counters.forEach(el=>countObserver.observe(el));
  }
  reducedMotion.addEventListener('change',()=>{
    if(reducedMotion.matches){
      revealObserver?.disconnect();mediaObserver?.disconnect();countObserver?.disconnect();
      revealTargets.forEach(el=>el.classList.add('is-revealed'));openingStage.classList.add('is-playing');
      mediaTargets.forEach(el=>el.classList.add('is-revealed','image-settled'));
      for(const [el,id] of counterFrames){cancelAnimationFrame(id);el.textContent=el.dataset.countFinal;}counterFrames.clear();
      for(const a of runningAnimations.values())a.cancel();runningAnimations.clear();
    }
    requestReading();
  });

  const employerColumns=[{name:'中央媒体',n:15,key:'中央媒体(n=15)',color:'var(--blue)'},{name:'市场化媒体',n:18,key:'市场化媒体(n=18)',color:'var(--gold)'},{name:'互联网大厂',n:20,key:'互联网大厂(n=20)',color:'var(--salmon)'}];
  const internetColumns=[{name:'内容岗位',n:10,key:'互联网·内容岗(n=10)',color:'var(--blue)'},{name:'数据分析岗位',n:10,key:'互联网·数据分析岗(n=10)',color:'var(--salmon)'}];
  const keySkills=['新闻采编与判断','视频与视听制作','外语','财经与商业知识','数据分析与指标','AI工具与大模型'];
  let skillMode='employers';
  const skillTerms={
    '新闻采编与判断':/采访|采编|新闻敏感|新闻判断|信息感知/,
    '视频与视听制作':/视频|剪辑|视听|全媒体/,
    '外语':/英文|英语|外语|中英文/,
    '财经与商业知识':/财经|金融|经济|商业|行业/,
    '数据分析与指标':/数据|指标|分析|归因|统计/,
    'AI工具与大模型':/AI|AIGC|大模型|人工智能/i,
    '编程与数据工具':/SQL|Python|编程|数据库/i
  };
  function jobExcerpt(job,skill){
    const sentences=[job.responsibilities,job.requirements].filter(Boolean).flatMap(v=>v.split(/\n|(?<=[。；;])/)).map(v=>v.trim()).filter(Boolean);
    return sentences.find(v=>(skillTerms[skill]||/./).test(v))||sentences[0]||'';
  }
  function skillDetails(d,c,target,pin=false){
    const skill=d['技能类别'], count=Number(d[c.key]);
    const detail=`${c.name}的${c.n}条招聘启事中，${count}条提到“${skill}”，占比${(count/c.n*100).toFixed(1).replace('.0','')}%。`;
    $('#skill-detail').textContent=detail;
    const jobs=story.jobs.filter(j=>{
      const group=c.key.startsWith('互联网')?'互联网大厂':c.name;
      const category=c.key.includes('内容岗')?'内容':c.key.includes('数据分析岗')?'数据分析':null;
      return j.group===group&&(!category||j.job_category===category)&&(jobSkillIndex[j.id]||[]).includes(skill);
    });
    const job=jobs.find(j=>jobExcerpt(j,skill));
    const html=`<h4>${esc(skill)} · ${esc(c.name)}</h4><p>${esc(detail)}</p>`+(job?`<p class="tooltip-meta">岗位例句｜${esc(job.employer)} · ${esc(job.title)}</p><blockquote>“${esc(jobExcerpt(job,skill))}”</blockquote><p class="tooltip-note">例句摘自该岗位 responsibilities / requirements；按逐条技能编码匹配。提及率不代表录用概率。</p>${tipSource('来源：53条招聘启事编码',sourceLink(job.url,'打开这条招聘原文'))}`:`<p class="tooltip-note">这组样本没有点名该技能的岗位，不提供其他组的例句。</p>${tipSource('来源：53条招聘启事编码')}`);
    showTooltip(target,html,pin);
  }
  function renderSkills(){
    const columns=skillMode==='employers'?employerColumns:internetColumns;
    const rows=$('#all-skills').checked?story.skills:story.skills.filter(d=>keySkills.includes(d['技能类别']));
    hideTooltip(); const root=d3.select('#skills-chart'); root.selectAll('p').remove();
    root.selectAll('.skill-heading').data([columns]).join('div').attr('class','skill-heading').style('--columns',columns.length).html('<span>技能</span>'+columns.map(c=>`<div data-chart-group="${esc(c.key)}"><b>${c.name}</b><small>${c.n}条岗位</small></div>`).join(''));
    const row=root.selectAll('.skill-row').data(rows,d=>d['技能类别']).join(enter=>{const r=enter.append('div').attr('class','skill-row');r.append('strong');return r;}).style('--columns',columns.length);
    row.classed('is-key',d=>['数据分析与指标','AI工具与大模型'].includes(d['技能类别']));
    row.select('strong').text(d=>d['技能类别']);
    row.each(function(d){const cells=d3.select(this).selectAll('.skill-cell').data(columns,c=>c.key).join(enter=>{const b=enter.append('button').attr('class','skill-cell').attr('type','button');b.append('span').attr('class','skill-value');b.append('span').attr('class','skill-count');b.append('span').attr('class','skill-track').append('i').attr('class','skill-bar').style('width','0%');return b;}).style('--skill-color',c=>c.color).attr('aria-label',c=>`${d['技能类别']}，${c.name}：${d[c.key]}/${c.n}条，${Math.round(Number(d[c.key])/c.n*100)}%`).classed('is-key',c=>['数据分析与指标','AI工具与大模型'].includes(d['技能类别'])&&c.key.startsWith('互联网'))
        .attr('data-chart-group',c=>c.key).attr('aria-controls','chart-tooltip').attr('aria-expanded','false')
        .on('click',function(_,c){if(tooltipTarget===this&&tooltipPinned)hideTooltip();else skillDetails(d,c,this,true);})
        .on('pointerenter',function(e,c){if(e.pointerType!=='touch')skillDetails(d,c,this);}).on('pointerleave',deferHide)
        .on('focus',function(_,c){skillDetails(d,c,this);}).on('blur',deferHide);
      cells.select('.skill-value').text(c=>`${Math.round(Number(d[c.key])/c.n*100)}%`);
      cells.select('.skill-count').text(c=>`${d[c.key]}/${c.n}条`);
      cells.select('.skill-bar').interrupt().style('width',c=>`${Number(d[c.key])/c.n*100}%`);
    });
    root.selectAll('.callout').remove();
    if(skillMode==='employers')row.filter(d=>['新闻采编与判断','数据分析与指标'].includes(d['技能类别'])).append('p').attr('class','callout callout-skill').attr('aria-hidden','true').text(d=>`互联网 20 条中 ${d['互联网大厂(n=20)']} 条点名`);
    prepareGrowth($('.skills-figure'));if($('.skills-figure').dataset.chartEntered)playGrowth($('.skills-figure'));
  }
  function renderJobs(){ const group=$('#job-group').value, query=$('#job-search').value.trim().toLocaleLowerCase(); const jobs=story.jobs.filter(j=>(group==='all'||j.group===group)&&[j.employer,j.title,j.majors_text,j.requirements,j.responsibilities,j.preferred].join(' ').toLocaleLowerCase().includes(query)); $('#job-count').textContent=`共 ${jobs.length} 条岗位`; $('#job-list').innerHTML=jobs.length?jobs.map(j=>`<details class="job-record"><summary><span><small>${esc(j.employer)}</small><strong>${esc(j.title)}</strong></span><span class="expand-icon" aria-hidden="true"></span></summary><div class="job-body"><p class="record-meta">${esc([j.group,j.recruit_type,j.grad_year&&j.grad_year+'届',j.publish_date&&'发布于 '+j.publish_date].filter(Boolean).join(' · '))}</p>${[['专业要求',j.majors_text],['岗位职责',j.responsibilities],['任职要求',j.requirements],['优先条件',j.preferred]].filter(([,v])=>v).map(([k,v])=>`<h4>${k}</h4><p>${esc(v).replace(/\n/g,'<br>')}</p>`).join('')}${sourceLink(j.url,'打开招聘原文')}</div></details>`).join(''):'<p class="empty-state">没有符合条件的岗位。试试其他关键词，或选择全部雇主。</p>'; }
  const categoryNames={'史论':['中国新闻传播史','新闻理论','外国新闻传播史'],'采写编':['新闻采访','新闻写作','全媒体新闻编辑'],'数字':['数据新闻报道概论','数字新闻学原理']};
  function renderCategory(category){pressed('[data-course-category]',category,'courseCategory');const rows=story.courses.filter(c=>c.program_id==='cuc-news-2025'&&categoryNames[category].includes(c.name)); const names={'史论':'新闻史论','采写编':'新闻采写编','数字':'数据与数字新闻'}; $('#course-detail').innerHTML=`<h4>${names[category]} · ${rows.reduce((a,c)=>a+c.credits,0)}学分</h4><p>${rows.map(c=>`${esc(c.name)} · ${c.credits}学分 / ${c.hours}学时`).join('<br>')}</p>`;}
  function renderCourses(){const program=$('#course-program').value;const rows=story.courses.filter(c=>program==='all'||c.program_id===program);$('#course-list').innerHTML=rows.map(c=>`<div class="course-item"><div><strong>${esc(c.name)}</strong><small>${c.program_id.startsWith('pku')?'北大 FLIC':'中传新闻学辅修'} · ${esc(c.category)}${c.semester?' · '+esc(c.semester):''}</small></div><span>${c.credits}学分<small>${c.hours?c.hours+'学时':c.weekly_hours?c.weekly_hours+'周学时':''}</small></span></div>`).join('');}
  const costNumbers=[['5,200','元','40学分 × 130元 / 学分'],['28 / 30','学分','分项合计 / 简章正文要求'],['不另收学费','','食宿、交通费用由学生自理']];
  const costSources=['cuc-minor25','pku-flic25','pku-finance25'];
  function renderCost(index){pressed('[data-cost]',index,'cost'); const row=story.costs[index],big=costNumbers[index],source=story.sources.find(s=>s.id===costSources[index]); $('#cost-receipt').innerHTML=`<h4>${esc(row[0])}</h4><p class="receipt-total">${big[0]} <small>${big[1]}</small></p><p class="receipt-caption">${big[2]}</p><dl>${['学分与模块','学费','时间与地点','修读条件'].map((k,i)=>`<div class="receipt-row"><dt>${k}</dt><dd>${esc(row[i+1])}</dd></div>`).join('')}</dl>${sourceLink(source.url,'查阅项目简章')}`; }
  function renderSources(){const query=$('#source-search').value.trim().toLocaleLowerCase();const rows=story.sources.filter(s=>[s.school,s.title,s.summary].join(' ').toLocaleLowerCase().includes(query));$('#source-list').innerHTML=rows.length?rows.map(s=>`<article class="source-record"><p class="record-meta">${esc(s.school)} · ${esc(s.date)}</p><h4>${sourceLink(s.url,s.title)}</h4><p>${esc(s.summary)}</p></article>`).join(''):'<p class="empty-state">没有找到这份资料。试试学校全称或“招生简章”。</p>';}
  async function loadStory(){
    try {
      const response=await fetch('story-data.json');if(!response.ok)throw new Error(`HTTP ${response.status}`);story=await response.json();const indexResponse=await fetch('assets/job-skill-index.json');if(!indexResponse.ok)throw new Error('Job skill index unavailable');jobSkillIndex=await indexResponse.json();if(!window.d3)throw new Error('Chart library unavailable');
      renderSkills();renderJobs();renderCourses();renderCategory('数字');renderCost(0);renderSources();window.observeSkillEntrance?.();
      $$('[data-skill-mode]').forEach(b=>b.addEventListener('click',()=>{skillMode=b.dataset.skillMode;pressed('[data-skill-mode]',skillMode,'skillMode');renderSkills();$('#skill-detail').textContent=skillMode==='internet'?'内容与数据分析岗位各10条；点击技能格查看条数。':'三类雇主共53条岗位；点击技能格查看条数。';}));
      $('#all-skills').addEventListener('change',renderSkills);$('#job-group').addEventListener('change',renderJobs);$('#job-search').addEventListener('input',renderJobs);$('#course-program').addEventListener('change',renderCourses);$('#source-search').addEventListener('input',renderSources);
      $$('[data-course-category]').forEach(b=>b.addEventListener('click',()=>renderCategory(b.dataset.courseCategory)));$$('[data-cost]').forEach(b=>b.addEventListener('click',()=>renderCost(Number(b.dataset.cost))));
      $('.load-error')?.remove();requestReading();
    } catch(error) {
      if(!$('.load-error')) {const panel=document.createElement('div');panel.className='load-error';panel.setAttribute('role','alert');panel.innerHTML='<p>交互数据加载失败，请重新加载。</p><button type="button">重新加载数据</button>';$('#skills-chart').after(panel);panel.querySelector('button').addEventListener('click',async e=>{e.target.disabled=true;await loadStory();e.target.disabled=false;});}
      console.error('交互数据加载失败',error);
    }
  }
  loadStory();
})();

/* video-intro（AutoClaw） */
(function(){var v=document.getElementById('intro-video'),b=document.getElementById('video-play');if(!v||!b)return;b.addEventListener('click',function(){b.closest('.video-frame').classList.add('is-playing');v.controls=true;v.play();});v.addEventListener('ended',function(){v.controls=false;v.currentTime=0;b.closest('.video-frame').classList.remove('is-playing');});})();
