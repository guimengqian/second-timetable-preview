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
  function updatePortrait(src){const img=$('#person-portrait');img.dataset.src=src;const r=img.getBoundingClientRect();if(img.dataset.bgLoaded==='true'||r.bottom>-200&&r.top<innerHeight+200)loadScene(img);else sceneObserver?.observe(img);}
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
  const portraitFiles=['shenruoning','yeshuhuan','chensiqi'];
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
  const nightScenes = [{day:'周三 · 22:00',angle:300},{day:'周五 · 02:30',angle:75},{day:'周六 · 08:00',angle:240},{day:'周日 · 深夜',angle:345},{day:'周一 · 08:00',angle:240}];
  function selectNight(index) { const scene=nightScenes[index]; $$('.night-line').forEach((n,i)=>n.classList.toggle('is-active',i===index)); $('.clock-day').textContent=scene.day; $('.clock-hand').style.setProperty('--clock-angle',`${scene.angle}deg`); }
  selectNight(0);
  if ('IntersectionObserver' in window) { const nightObserver = new IntersectionObserver(entries=> { for(const e of entries) if(e.isIntersecting) selectNight(Number(e.target.dataset.night)); },{rootMargin:'-32% 0px -40% 0px',threshold:0}); $$('.night-line').forEach(n=>nightObserver.observe(n)); }
  $$('[data-year]').forEach(b => b.addEventListener('click',()=> {pressed('[data-year]',b.dataset.year,'year'); $$('.program').forEach(p=> {p.hidden=b.dataset.year!=='all'&&!p.dataset.years.includes(b.dataset.year);});}));
  const people = [
    {name:'沈若宁',role:'北大外院乌尔都语 · FLIC项目',hours:14,phases:[
      {label:'周一至周四',title:'白天，守住第一张课表',text:'背诵乌尔都语字母、研读南亚文学史，跨过专业成绩前50%的报名门槛后，继续应对主修的学业要求。',quote:'外语人现在特别焦虑，如果不修FLIC，毕业简历上除了专四专八几乎啥也没有。'},
      {label:'周五至周六',title:'从傍晚到全天，切换到采编现场',text:'完成《中国文化走出去实践课》要求的5个采编视频作品：扛着三脚架满校园找留学生采访，回来自己写英文脚本、配音、剪辑。',quote:'好几个周五晚上为了赶周六早上的作业截止时间，在宿舍导出4K成片到凌晨两点半，笔记本风扇转得像拖拉机，吵得室友直翻身，心里特别愧疚。'}]},
    {name:'叶书桓',role:'北师大传播学＋人工智能双学士',hours:20,phases:[
      {label:'周二 · 08:00',title:'上午，在传播学的语境里',text:'在文科楼听传播学老师讲拉扎斯菲尔德和媒介环境学，沉浸在阅读量与论文思辨里。',quote:'刚进入文科的哲学语境，脑子还没转过来。'},
      {label:'周二 · 13:30',title:'下午至晚间，走进另一套逻辑',text:'冲去机房对着高等数学、线性代数和Python数据结构发呆，屏幕上一整片红色报错。',quote:'学校等于用502胶水把两张课表硬焊死在一起。我们班有好几个高考偏文科的同学，大一上学期就被微积分和Python虐哭了好几次。'}]},
    {name:'陈思琪',role:'人大新闻学 · 跨向互联网数据分析',hours:18,phases:[
      {label:'周一至周五',title:'白天主修，晚间自学',text:'应付新闻主修课，推掉已经联系好的央媒日常实习，每天晚上在明德楼图书馆坐到闭馆。',quote:'带教老师问我怎么不来了，我只能撒谎说家里有事，其实心里虚得要命。'},
      {label:'周末至深夜',title:'到经院、统计学院，补课',text:'去经院和统计学院蹭计量经济学，在图书馆刷LeetCode SQL窗口函数与A/B测试归因题。',quote:'高数期中只考了38分，最后挂科重修，那阵子焦虑到枕头上全是头发。'}]}
  ];
  let personIndex=0,phaseIndex=0;
  // Each phase is placed on a Monday-00:00 week axis (hours). Anchors follow the journal's own wording
  // (周一至周四 / 周五傍晚 / 周二 08:00 / 13:30 / 周末); the slider only positions them, it adds no claims.
  const weekAnchors=[[8,114],[32,37.5],[8,128]], weekRanges=[[6,144],[30,46],[6,168]];
  const dayNames=['周一','周二','周三','周四','周五','周六','周日'];
  let weekTime=weekAnchors[0][0], weekFrame=0;
  const range=$('#day-range');
  function weekLabel(t){let d=Math.min(6,Math.floor(t/24)),h=Math.floor(t%24);const m=Math.round(t%1*60);if(t>0&&t%24===0){d=t/24-1;h=24;}return `${dayNames[d]} · ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}
  function renderWeek(entering=false){
    const anchors=weekAnchors[personIndex];
    const reached=anchors.filter(a=>a<=weekTime).length;
    phaseIndex=Math.max(0,reached-1);
    pressed('[data-phase]',phaseIndex,'phase');
    $$('#schedule-content .schedule-entry').forEach((li,i)=>{const past=i<reached;li.classList.toggle('is-past',past&&i!==reached-1);li.classList.toggle('is-now',past&&i===reached-1);li.classList.toggle('is-future',!past);li.setAttribute('aria-hidden',String(!past));});
    $('#schedule-content .schedule-empty')?.toggleAttribute('hidden',reached>0);
    const label=weekLabel(weekTime);$('#day-readout').textContent=label;range.setAttribute('aria-valuetext',label);
    const h=weekTime%12, m=Math.round(weekTime%1*60);
    $('.scrub-hour').style.transform=`rotate(${h*30+m*.5}deg)`;$('.scrub-minute').style.transform=`rotate(${m*6}deg)`;
    range.style.setProperty('--progress',((weekTime-range.min)/(range.max-range.min)*100)+'%');
    if(entering)enterTransition($('#schedule-content'));
  }
  function setWeekTime(t,entering){weekTime=Math.min(Number(range.max),Math.max(Number(range.min),t));range.value=String(weekTime);renderWeek(entering);}
  range.addEventListener('input',()=>{weekTime=Number(range.value);if(!weekFrame)weekFrame=requestAnimationFrame(()=>{weekFrame=0;renderWeek();});});
  function renderPerson(){
    const p=people[personIndex], [min,max]=weekRanges[personIndex], anchors=weekAnchors[personIndex];
    pressed('[data-person]',personIndex,'person'); $('#person-name').textContent=p.name; $('#person-role').textContent=p.role; $('#person-hours').textContent=p.hours;
    updatePortrait(`assets/img/figure-${portraitFiles[personIndex]}.jpg`); $('#person-portrait').alt=p.name+'人物插画（模拟叙事）';
    $('#schedule-sheet').dataset.personRef=portraitFiles[personIndex]; paintCast();
    range.min=String(min);range.max=String(max);
    $('#day-ticks').innerHTML=anchors.map((a,i)=>{const x=(a-min)/(max-min)*100, t=x<15?8:x>85?92:50;return `<span style="left:${x}%;transform:translateX(-${t}%);--tick:${t}%">${esc(p.phases[i].label)}</span>`;}).join('');
    $('#day-tabs').innerHTML=p.phases.map((x,i)=>`<button data-phase="${i}" aria-pressed="${i===0}">${esc(x.label)}</button>`).join('');
    $$('[data-phase]').forEach(b=>b.addEventListener('click',()=>setWeekTime(anchors[Number(b.dataset.phase)],true)));
    $('#schedule-content').innerHTML=`<p class="schedule-empty" hidden>向右拖动滑杆，这一周从这里开始。</p><ol class="schedule-timeline">${p.phases.map(x=>`<li class="schedule-entry"><p class="entry-when">${esc(x.label)}</p><h4>${esc(x.title)}</h4><p>${esc(x.text)}</p><blockquote>“${esc(x.quote)}”</blockquote></li>`).join('')}</ol>`;
    setWeekTime(anchors[0],true); enterTransition($('.person-heading')); enterTransition($('.schedule-total'));
  }
  $$('[data-person]').forEach(b=>b.addEventListener('click',()=>{personIndex=Number(b.dataset.person);renderPerson();}));

  // Cast rail: avatars light up while the story is narrating that person; hover/tap opens a short bio.
  const castKeys=portraitFiles, castQuotes=[people[0].phases[0].quote,people[1].phases[1].quote.split('。')[0]+'。',people[2].phases[1].quote];
  const castLinks=[[['跳到本章 · 看沈若宁的一周',0]],[['跳到本章 · 看叶书桓的一周',1]],[['出场 · 引子','#chen-intro'],['跳到本章 · 看陈思琪的一周',2]]];
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
    const i=castKeys.indexOf(btn.dataset.cast), p=people[i], entering=castCard.hidden||castCardFor!==btn;
    castCardFor?.setAttribute('aria-expanded','false'); castCardFor=btn; castPinned=pin; btn.setAttribute('aria-expanded','true');
    castCard.innerHTML=`<button type="button" class="cast-card-close" aria-label="关闭人物小传">关闭</button><div class="cast-card-head"><img src="assets/img/avatar-${castKeys[i]}.jpg" alt="" width="64" height="64"><div><strong>${esc(p.name)}</strong><span>${esc(p.role)}</span></div></div><p class="cast-card-hours"><b>${p.hours}</b>小时 / 周 · 主修之外的额外投入</p><blockquote>“${esc(castQuotes[i])}”</blockquote><div class="cast-card-links">${castLinks[i].map(([text,to])=>typeof to==='number'?`<a href="#schedule-title" data-cast-jump="${to}">${esc(text)} →</a>`:`<a href="${to}">${esc(text)} →</a>`).join('')}</div><small>人物为模拟叙事；肖像为插画</small>`;
    castCard.hidden=false; positionCastCard(); if(entering)enterTransition(castCard,true);
    castCard.querySelector('.cast-card-close').addEventListener('click',()=>{const origin=castCardFor;closeCast();origin?.focus();});
    castCard.querySelectorAll('[data-cast-jump]').forEach(a=>a.addEventListener('click',()=>{personIndex=Number(a.dataset.castJump);renderPerson();closeCast();}));
    castCard.querySelectorAll('a:not([data-cast-jump])').forEach(a=>a.addEventListener('click',closeCast));
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
  renderPerson();
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
    const chart=target.closest('#skills-chart,.time-chart,.admissions-figure,.routes,.credit-quilt');
    if(!chart)return;
    chart.classList.add('chart-group-active');
    const cells=[...chart.querySelectorAll('.skill-cell,.time-row,.admission-row,.routes>div,.credit-quilt button')];
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
  $$('.time-row').forEach(el=>bindChartHit(el,()=>{const d=el.dataset, who=el.querySelector('span').firstChild.textContent;return `<h4>${esc(who)}</h4><p>${esc(d.path)}；${d.hours?`每周额外投入 ${esc(d.hours)} 小时。`:'未给出具体小时数，按人物叙述整理。'}</p><p class="tooltip-note">个人叙述用于呈现时间压力，不作总体推断。</p>${tipSource('来源：4位跨界者的深度访谈（模拟叙事）')}`;}));
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
  const growthTargets=$$('.admissions-figure,.skills-figure,.curriculum-figure,.time-figure,.routes-figure');
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
  const revealTargets=$$('.chapter-cover h2,.chapter-cover .chapter-question,.chapter-divider,.prose>p,.prose>.voice,.person-introduction,.figure>figcaption,.figure>.chart-conclusion,.choice,.core-findings,.ending-voice,.ending>p,.ending-title,.credits-inner');
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
