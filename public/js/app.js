import {parseFront,parseTimeline,parseDate,parseMilestones,parseMilestone,esc} from './md.js';
import {render as renderDefault} from './views/default.js';
import {burst,size} from './fx.js';
import {play,isPlaying,setSrc} from './music.js?v=2';

const $=id=>document.getElementById(id),p2=n=>String(n).padStart(2,'0');
const get=async f=>{const r=await fetch(f,{cache:'no-cache'});if(!r.ok)throw new Error(f);return r.text()};

// 首页密码锁:提示是"我们的第一天",密码 0630;每次刷新都需解锁,🔒按钮可再次锁定
const LOCK=(function(){
  const L=$('lock');if(!L)return null;
  const CODE='0630',DOTS=[...L.querySelectorAll('.ldots i')],hint=L.querySelector('.lhint');
  let code='',done=false;
  const draw=()=>DOTS.forEach((d,i)=>d.classList.toggle('on',i<code.length));
  const reset=()=>{code='';done=false;draw();hint.textContent='提示 · 我们的第一天'};
  function pass(){
    done=true;L.classList.remove('wrong','shake');L.classList.add('ok');hint.textContent='欢迎回家 ♥';
    const [W,H]=size();
    setTimeout(()=>L.classList.add('gone'),1100);
    setTimeout(()=>burst(W/2,H*.42),1250);
    setTimeout(()=>burst(W*.3,H*.35),1550);setTimeout(()=>burst(W*.7,H*.3),1800);
  }
  function fail(){
    L.classList.add('wrong','shake');hint.textContent='再想想,是我们的第一天 ♡';
    setTimeout(()=>{if(done)return;L.classList.remove('wrong','shake');reset()},700);
  }
  function press(k){
    if(done||L.classList.contains('gone')||code.length>=4)return;
    code+=k;draw();
    if(code.length===4)(code===CODE?pass:fail)();
  }
  L.querySelector('.lkeys').onclick=e=>{
    const b=e.target.closest('button');if(!b||b.classList.contains('ph'))return;
    b.blur();
    if(b.classList.contains('del')){if(!done){code=code.slice(0,-1);draw()}return}
    press(b.textContent.trim());
  };
  // PC 键盘:0-9 输入,退格删除;锁隐藏或已解锁时忽略
  document.addEventListener('keydown',e=>{
    if(done||L.classList.contains('gone'))return;
    if(/^[0-9]$/.test(e.key)){e.preventDefault();press(e.key)}
    else if(e.key==='Backspace'){e.preventDefault();code=code.slice(0,-1);draw()}
  });
  return{relock(){reset();L.classList.remove('ok','wrong','shake','gone')}};
})();
const lb=$('lb');if(lb&&LOCK)lb.onclick=LOCK.relock;

// 抓取失败才算"需要 Web 服务器";init 里的代码异常单独上报,避免误导排查方向
let A,B,META,MSS=[],NEXTDAY=null;
try{
  [A,B]=await Promise.all([get('content/site.md'),get('content/timeline.md')]);
}catch(e){
  $('ip').textContent=location.protocol==='file:'
    ?'内容加载失败:请通过 Web 服务器访问(见 README)'
    :'内容加载失败:请检查网络后重试';
  console.error('[fetch]',e);throw e;
}
META=parseFront(A).meta;
{
  // 里程碑 = 配置里那串天数。已到达的才去读它的内容包:
  // content/milestones/<天数>.md;文件缺失或写着 draft: 1 都当作"还没写",跳过不影响页面。
  const S=parseDate(META.start)||new Date(),now=new Date(),MS=parseMilestones(META);
  const unOf=d=>{const x=new Date(S);x.setDate(x.getDate()+d-1);return x};
  const reached=MS.filter(d=>unOf(d)<=now);
  NEXTDAY=MS.find(d=>unOf(d)>now)??null;   // 下一个还没到的里程碑(null = 到头了)
  MSS=(await Promise.all(reached.map(async d=>{
    try{return{day:d,...parseMilestone(await get(`content/milestones/${d}.md`))}}catch{return null}
  }))).filter(x=>x&&!x.meta.draft);
}
try{
  init(META,parseTimeline(B),MSS,NEXTDAY);
}catch(e){
  console.error('[init]',e);
  $('ip').textContent='页面初始化出错,请刷新重试';
}

function init(c,events,mss,nextDay){
  const him=c.him||'Him',her=c.her||'Her',START=parseDate(c.start)||new Date();
  // 里程碑模型(见 site.md):
  //   MS      = milestones 列表(升序);MS[0] 是首批内容(信封 / 画 / 时间轴)的解锁点
  //   mss     = 已到达且写好的内容包(升序),每一项 {day,meta,blocks};每一站都可以有自己的排版
  //   nextDay = 下一个还没到的里程碑(null = 到头了)→ 圆环瞄准它,「下一封信」也数它
  const MS=parseMilestones(c),FIRST=MS[0],NEXT=nextDay;
  const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
  const unOf=d=>addD(START,d-1);                    // 第 d 天的 00:00
  const un0=unOf(FIRST);
  const unN=NEXT!=null?unOf(NEXT):null;
  const GOAL=NEXT!=null?NEXT:MS[MS.length-1];       // 圆环瞄准下一站;没有下一站就停在最后一站
  const leftNext=()=>unN?Math.ceil((unN-new Date())/864e5):0;
  const TEASE=Math.max(0,+c.tease||0);              // 提前多少天开始预告(闸门与「下一封信」共用)
  const SHOWCASE=Math.max(0,c.showcase==null?7:+c.showcase||0);   // 纪念日前后各多少天浮到主页
  const now0=new Date(),fmt=d=>`${d.getFullYear()}.${p2(d.getMonth()+1)}.${p2(d.getDate())}`;
  $('ih').innerHTML=`${esc(him)} <span>&amp;</span> ${esc(her)}`;
  $('names').innerHTML=`${esc(him)}<span>&amp;</span>${esc(her)}`;
  $('dt').textContent=fmt(START).replace(/\./g,' · ');
  $('goal').textContent=`/ ${GOAL} 天`;
  $('ft').textContent=`${him} & ${her} · ${START.getFullYear()}`;
  setSrc(c.music||'assets/music.mp3');

  // 信封是"单例":从 <template> 克隆一份,谁要展示内容包就把它挂到谁身上。
  // 同一时间只会存在一只信封,那套拆封动画原样复用,也不会撞 id。
  const ENV=document.getElementById('tpl-env').content.firstElementChild.cloneNode(true);
  ENV.classList.add('show');
  const envwrap=()=>ENV.querySelector('.envwrap');
  { // 印章上的 E & S
    const mg=ENV.querySelectorAll('#mono text');
    if(mg.length){const ini=s=>((s||'').trim()[0]||'♥').toUpperCase();mg.forEach(n=>n.textContent=`${ini(him)} & ${ini(her)}`)}
  }

  // 通用弹窗
  const M=$('modal'),MB=$('mbody'),BOX=$('mbox');
  let typeTimer=null,typing=false,closingLetter=false,closeLetterT=null,closeEnvT=null;
  // 当前正在读的信 + 它"从哪张信纸飞出"的来源元素(信封里那张;从其它入口打开时为 null)
  let CUR={meta:{},body:''},CUR_SHEET=null;
  // 信封收起:.open 移除后前盖/翻盖不会自行过渡(展开是 animation forwards 驱动),
  // 改由 .closing 显式收合:信纸先缩回(0.5s) → 回折盖落下(0.5s@0.5s) → 前盖合上(0.4s@0.7s),约 1.1s 后收敛。
  function startEnvClose(){
    const E=envwrap();
    if(closeEnvT){clearTimeout(closeEnvT);closeEnvT=null}
    E.classList.remove('open');E.classList.add('closing');
    closeEnvT=setTimeout(()=>{closeEnvT=null;E.classList.remove('closing')},1150);
  }
  function openModal(html,cls){
    // 若上一封情书还停在缩回动画里,立即收敛信封状态,避免新旧弹窗互相打断
    if(closingLetter){
      closingLetter=false;if(closeLetterT){clearTimeout(closeLetterT);closeLetterT=null}
      M.classList.remove('closing');
      const BX=$('mbox');BX.classList.remove('flying');BX.style.cssText='';
      startEnvClose();
      setTimeout(restoreSeal,1400);
    }
    MB.innerHTML=html;
    // 每次开窗都要把上一种弹窗的皮肤类清干净:漏掉任何一个都会让后开的弹窗继承前一种的规则
    M.classList.remove('memo','letter','artzoom');if(cls)M.classList.add(cls);
    BOX.className='mbox'+(cls==='letter'?' paper':'');
    M.classList.add('open');document.body.style.overflow='hidden';document.body.classList.add('modal-on');BOX.scrollTop=0;
  }
  // 情书关闭:弹窗信纸缩回信封 → 信纸收回 → 盖子合上 → 印章复位
  function closeLetter(){
    if(!M.classList.contains('open')||closingLetter)return;
    closingLetter=true;
    if(typeTimer){clearTimeout(typeTimer);typeTimer=null}
    typing=false;const TL=$('letter');if(TL)TL.classList.remove('typing');
    const sheetEl=CUR_SHEET,BX=$('mbox');
    if(sheetEl){
      M.classList.add('noanim');
      BX.style.transition='none';BX.style.transform='none';
      const t=BX.getBoundingClientRect();
      M.classList.remove('noanim');
      const s=sheetEl.getBoundingClientRect();
      BX.style.transformOrigin='0 0';
      BX.style.transition='transform .55s cubic-bezier(.58,.04,.42,.98)';
      BX.style.transform=`translate(${s.left-t.left}px,${s.top-t.top}px) scale(${(s.width/t.width).toFixed(4)},${(s.height/t.height).toFixed(4)})`;
      BX.classList.add('flying');M.classList.add('closing');
      closeLetterT=setTimeout(()=>{
        closeLetterT=null;
        M.classList.remove('open','closing');
        BX.classList.remove('flying');BX.style.cssText='';
        document.body.style.overflow='';document.body.classList.remove('modal-on');
        startEnvClose();
        setTimeout(restoreSeal,1300);
        closingLetter=false;
      },580);
    }else{
      // 非信封入口(例如第 365 天的信):直接收起弹窗,不去碰主信封的印章
      M.classList.remove('open');document.body.style.overflow='';document.body.classList.remove('modal-on');
      closingLetter=false;
    }
  }
  function closeModal(){
    if(M.classList.contains('letter')){closeLetter();return}
    M.classList.remove('open');document.body.style.overflow='';document.body.classList.remove('modal-on');
    if(typeTimer){clearTimeout(typeTimer);typeTimer=null}
    typing=false;
  }
  // iOS 15 旧 WebKit:带滤镜的 SVG 在 visibility 切换/克隆增删后可能不再重绘,统一强制恢复印章
  function restoreSeal(){
    const S=ENV.querySelector('#seal'),E=envwrap();
    if(E)E.classList.remove('open');
    S.classList.remove('break');
    S.querySelectorAll('.half').forEach(h=>h.remove());
    S.style.display='none';void S.offsetWidth;S.style.display='';
    S.classList.add('pop');setTimeout(()=>S.classList.remove('pop'),520);
  }
  $('mx').onclick=closeModal;
  M.onclick=e=>{if(e.target===M)closeModal()};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&M.classList.contains('open'))closeModal()});

  // 时间轴:卡片只显示 缩略图 + 日期 + 标题 + 摘要,点击弹窗阅读全文
  // 正文里 "N. 小标题：正文" 与 "xx状态：… / 和你的状态：…" 挤在一整段最难读,
  // 这里只拆成块级元素做排版层次,文字本身一字不改
  const rich=s=>{
    const lab=s.match(/^([^：:]{2,12})[：:]/);
    if(!lab)return esc(s);
    const t=lab[1].trim();
    // 对比型:把 "和你的状态：" 之后的部分切成第二块
    const cmp=s.match(/^(.+?)(和(?:你|我)的?状态[：:].+)$/s);
    // 标签只保留"日常状态"本体,"和你的状态"整句交给 CSS 的 .lab.alt:before 渲染,否则"你的状态"会重复出现两次
    if(cmp)return `<b class="lab">${esc(t)}</b>${esc(cmp[1].slice(lab[0].length))}<b class="lab alt"></b>${esc(cmp[2].replace(/^和(?:你|我)的?状态[：:]/,''))}`;
    return `<b class="lab">${esc(t)}</b>${esc(s.slice(lab[0].length))}`;
  };
  const bodies=events.map(e=>e.text.split(/\n+/).filter(Boolean).map(l=>{
    const im=l.match(/^!\[(.*?)\]\((.+?)\)$/);
    if(im)return `<img src="${esc(im[2])}" alt="${esc(im[1])}" loading="lazy">`;
    const s=l.trim(),nb=s.match(/^(\d+)[.、]\s*(.+)$/s);
    if(nb)return `<p class="num"><i>${esc(nb[1])}</i>${rich(nb[2])}</p>`;
    return `<p>${rich(s)}</p>`;
  }).join(''));
  $('tl').innerHTML=events.map((e,i)=>{
    const d=parseDate(e.date),fut=!!(d&&d>now0);
    const lines=e.text.split(/\n+/).map(l=>l.trim()).filter(Boolean);
    const pics=lines.filter(l=>/^!\[.*?\]\(.+?\)$/.test(l)).map(l=>l.replace(/^!\[.*?\]\((.+?)\)$/,'$1'));
    const ex=lines.find(l=>!/^!\s*\[/.test(l))||'';
    // 缩略图放在卡片右侧(正文之后、箭头之前),多图时右下角标数量;tabindex + --d 负责键盘可达与错落入场
    return `<div class="ev glass${fut?' future':''}" data-i="${i}" tabindex="0" style="--d:${i*70}ms">`
      +`<div class="evbody"><div class="evtop"><time>${d?fmt(d):esc(e.date)}</time>${fut?'<span class="soon">即将到来</span>':''}</div>`
      +`<h3>${esc(e.title)}</h3>${ex?`<p class="ex">${esc(ex)}</p>`:''}</div>`
      +`${pics.length?`<span class="evpic"><img src="${esc(pics[0])}" alt="${esc(e.title)}" loading="lazy">${pics.length>1?`<b class="ecnt">${pics.length}</b>`:''}</span>`:''}`
      +`<span class="evgo" aria-hidden="true">›</span></div>`;
  }).join('');
  const openEvent=i=>{
    const d=parseDate(events[i].date);
    openModal(`${d?`<time>${fmt(d)}</time>`:''}<h3>${esc(events[i].title)}</h3>${bodies[i]}`,'memo');
  };
  $('tl').onclick=ev=>{
    const c=ev.target.closest('.ev');if(!c)return;
    openEvent(+c.dataset.i);
  };
  // 键盘可达:卡片 tabindex=0,回车 / 空格等同点击
  $('tl').onkeydown=ev=>{
    if(ev.key!=='Enter'&&ev.key!==' ')return;
    const c=ev.target.closest('.ev');if(!c)return;
    ev.preventDefault();openEvent(+c.dataset.i);
  };

  // 画的灯箱(.artzoom):不复用时间轴那个 .memo 阅读面板——.memo 是一张 520px 宽的纸卡
  // (标题 + 纸底 + 78vh 高度上限 + 内部滚动),竖幅原画塞进去只能缩到栏宽再上下滚,细节全丢。
  // 灯箱里不放标题、不加纸底,<img> 同时受 max-width 与 max-height 约束,交给 CSS 按原画
  // 固有比例取"放得下的最大尺寸"。默认渲染器里的「画」块就是调它。
  function artZoom(src,title,caption){
    openModal(`<figure class="zoomfig"><img class="zoomimg" src="${esc(src)}" alt="${esc(title||'')}">`
      +(caption?`<figcaption class="zoomcap">${esc(caption)}</figcaption>`:'')+`</figure>`,'artzoom');
    const im=MB.querySelector('.zoomimg');
    if(im)im.onclick=closeModal; // 再点一下画本身也收起,与点背景同一手感
  }

  // 计数器:圆环瞄准下一个里程碑(没配置 next 时就是 milestone 本身)
  function tick(){
    const now=new Date(),diff=Math.max(now-START,0),day=Math.floor(diff/864e5),n=day+1;
    $('dn').textContent=n;$('d').textContent=day;
    $('ring').style.strokeDashoffset=603*(1-Math.min(n,GOAL)/GOAL);
    $('h').textContent=p2(Math.floor(diff/36e5)%24);$('m').textContent=p2(Math.floor(diff/6e4)%60);$('s').textContent=p2(Math.floor(diff/1e3)%60);
    // 标题 / 开场副标题跟着天数走,不再写死成 milestone
    document.title=`${him} & ${her} · 第 ${n} 天`;
    $('is').textContent=`${n} DAYS OF LOVE`;
    // 「下一封信」卡片里的"还有 X 天"随日子跳动
    const nd=$('nldays');if(nd)nd.textContent=Math.max(leftNext(),0);
    const tg=addD(START,GOAL-1),r=tg-now;
    $('cd').textContent=r>0?`距离第 ${GOAL} 天,还有 ${Math.floor(r/864e5)} 天 ${Math.floor(r/36e5)%24} 小时`
      :n===GOAL?`🎉 今天是我们的第 ${GOAL} 天!`:`我们已经走过了第 ${GOAL} 天 ♥`;
  }
  tick();setInterval(tick,1000);

  // ── 解锁闸门(只锁首批内容:信封 / 画 / 时间轴)──
  //   locked  未进入剧透期 → 只显示计数(内容整段隐藏)
  //   teased  剧透期(解锁前 TEASE 天)→ 预告"有内容",但仍不给看
  //   open    满 MS[0] 天 → 全部展开
  // 关键:过了 MS[0] 天之后 st 恒为 open,pending 永不回加 —— 首批内容一旦解锁就永久可见。
  const MAIN=document.querySelector('main');
  const leftDays=()=>Math.ceil((un0-new Date())/864e5);   // 距首批内容解锁还剩几天(向上取整)
  let gateT=null;
  function gate(){
    const L=leftDays();
    const st=L<=0?'open':(L<=TEASE?'teased':'locked');
    const fresh=st!==gate.st;gate.st=st;
    MAIN.classList.toggle('pending',st!=='open');
    MAIN.classList.toggle('teasing',st==='teased');
    if(fresh)paint(st,L);
    return st;
  }
  // 按阶段渲染提示文案
  function paint(st,L){
    const D=fmt(un0).replace(/\./g,' · ');
    if(st==='open'){$('pn').innerHTML='';return}
    if(st==='teased'){
      $('pn').innerHTML='';                       // 剧透卡片自己会说明,不再重复
      $('tday').textContent=`第 ${FIRST} 天 · ${fmt(un0)}`;
      $('thint').textContent=L===1?'就是明天 ♥':`还有 ${L} 天 · 先数完最后几天`;
      return;
    }
    $('pn').innerHTML=`<span class="pk">🔒</span>更多内容会在第 ${FIRST} 天解锁<br><b>${D}</b><i>还有 ${L} 天 · 故事慢慢来</i>`;
  }
  // 跨越剧透起点 / 解锁时刻:留在页面上的用户无需刷新,到点自动切换
  function schedule(){
    clearTimeout(gateT);
    const ms=un0-new Date();
    if(ms<=0)return;
    gateT=setTimeout(()=>{if(gate()==='open')unlock();schedule()},ms+1500);
  }
  gate();schedule();

  // 解锁演出:彩带 + 主页 showcase 把这一站挂出来
  function unlock(){
    MAIN.classList.remove('pending');
    const [W,H]=size();
    burst(W/2,H*.4);setTimeout(()=>burst(W*.3,H*.3),320);setTimeout(()=>burst(W*.7,H*.32),640);
    mountShowcase();
    $('cd').textContent=`🎉 第 ${FIRST} 天，全部内容已解锁`;
  }

  // 滚动显现
  const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('show')),{threshold:.1});
  document.querySelectorAll('section').forEach(s=>io.observe(s));

  // 开场
  $('intro').onclick=()=>{
    $('intro').classList.add('gone');const [W,H]=size();
    burst(W/2,H/2);setTimeout(()=>burst(W*.3,H*.35),300);setTimeout(()=>burst(W*.7,H*.4),600);
    if(!isPlaying())play();
  };

  // 情书:封蜡 → 翻盖打开 → 信纸抽出 → 弹窗信纸 → 逐字显现(标点停顿 + 光标 + 智能滚动)
  // CUR 决定这次读哪一封:信封读最新一封,归档里的每一条读它自己那封
  function typeLetter(){
    if(!M.classList.contains('open'))return;
    const L=$('letter'),TXT=CUR.body;L.textContent='';let i=0;
    if(typeTimer){clearTimeout(typeTimer);typeTimer=null}
    L.classList.add('typing');
    const step=()=>{
      if(!M.classList.contains('open')){typeTimer=null;return}
      const ch=TXT[i++];L.textContent+=ch;
      if(L.scrollHeight-L.scrollTop-L.clientHeight<90)L.scrollTop=L.scrollHeight;
      if(i>=TXT.length){typeTimer=null;typing=false;L.classList.remove('typing');$('rb').style.display='block';const [W,H]=size();burst(W/2,H*.5);return}
      const wait=/[。!?…]/.test(ch)?300:/[,、;:]/.test(ch)?160:ch==='\n'?140:58;
      typeTimer=setTimeout(step,wait);
    };
    typeTimer=setTimeout(step,70);
  }
  // src:这次要读的信;sheet:它"飞出来"的源信纸(主信封里那张);没给源信纸就普通展开
  function openLetter(src,sheet){
    CUR=src;CUR_SHEET=sheet||null;
    openModal(`<p class="to en">${esc(src.meta.to||`To my dearest ${her},`)}</p><div id="letter"></div>`,'letter');
    typing=true;
    const BX=$('mbox');
    if(CUR_SHEET){
      // FLIP:弹窗信纸从信封里那张信纸的位置直接放大展开
      M.classList.add('noanim');
      BX.style.transition='none';BX.style.transform='none';
      const t=BX.getBoundingClientRect(),s=CUR_SHEET.getBoundingClientRect();
      BX.style.transformOrigin='0 0';
      BX.style.transform=`translate(${s.left-t.left}px,${s.top-t.top}px) scale(${(s.width/t.width).toFixed(4)},${(s.height/t.height).toFixed(4)})`;
      BX.classList.add('flying');
      void BX.offsetWidth; // 强制提交样式,确保缩回过渡当帧启动(否则会延迟到下一次回流)
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        M.classList.remove('noanim');
        BX.style.transition='transform .62s cubic-bezier(.3,.85,.25,1)';
        BX.style.transform='';
        setTimeout(()=>{BX.classList.remove('flying');BX.style.cssText=''},660);
      }));
      setTimeout(typeLetter,900);
    }else setTimeout(typeLetter,380);
    $('rb').onclick=()=>{if(typing)return;typing=true;$('rb').style.display='none';typeLetter()};
  }
  envwrap().onclick=()=>{
    const S=ENV.querySelector('#seal');if(S.classList.contains('break'))return;
    const svg=S.querySelector('svg'),ZIG='M100 14 L88 32 L110 66 L90 102 L110 136 L92 170 L100 186';
    ['l','r'].forEach(k=>{
      const h=document.createElement('div');h.className='half '+k;
      const c=svg.cloneNode(true);
      const p=document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d',ZIG);p.setAttribute('fill','none');p.setAttribute('stroke','#5f0b1a');p.setAttribute('stroke-width','7');p.setAttribute('stroke-linejoin','round');p.setAttribute('opacity','.9');
      c.appendChild(p);h.appendChild(c);S.appendChild(h);
    });
    S.classList.add('break');
    // 若上一轮收起尚未结束,先取消,避免 .closing 与 .open 同时生效导致盖子状态冲突
    if(closeEnvT){clearTimeout(closeEnvT);closeEnvT=null}
    const EW=envwrap();
    EW.classList.remove('closing');
    EW.classList.add('open');
    const r=S.getBoundingClientRect();
    burst(r.left+r.width/2,r.top+r.height/2);
    const E=EW.getBoundingClientRect();
    // 时序与 style.css 对齐:火漆 .42s 裂完 → 前盖 .48s 起折(0.92s 翻到位)→ 信纸 1.06s 抽出(1.91s 到位)。
    // 信封口那次 burst 压在盖子完全翻开之后,开信弹窗必须等信纸停稳(否则 FLIP 会从半空的位置起飞)。
    setTimeout(()=>burst(E.left+E.width/2,E.top+E.height*.18),1440);
    setTimeout(()=>openLetter(CUR,ENV.querySelector('.envsvg .esheet')),1960);
  };

  // ── 内容包渲染 ──
  //   默认渲染器是 js/views/default.js(信封 + 画框)。某一站在 front matter 写了 view: 名字,
  //   就改用 js/milestones/<名字>.js 里你自己的渲染器 —— 想在某一站换一套完全不同的排版/动画,
  //   把默认渲染器整份复制过去改就行。ctx 是递给渲染器的小工具箱。
  const ctx={
    envelope:()=>ENV,
    useLetter:(b,ms)=>{CUR={meta:{to:ms.meta.to},body:b.text}},
    artZoom,
    esc
  };
  function clearHost(host){if(!host)return;if(ENV.parentNode===host)host.removeChild(ENV);host.innerHTML=''}
  // 两个内容包宿主:主页 showcase 与纪念日详情。同一时刻只允许一份内容包(信封是单例),
  // 所以渲染前把它们全清空,再往目标里挂。
  const clearAll=()=>clearHost($('showcase'))||clearHost($('msdetail'));
  function showView(ms,host){
    if(!host||!ms)return;
    clearAll();                            // 先把单例信封摘下来,免得被一起清掉
    const fallback=err=>{if(err)console.error('[view]',err);renderDefault(host,ms,ctx)};
    if(ms.meta.view){
      import(`./milestones/${ms.meta.view}.js`).then(m=>{try{m.render(host,ms,ctx)}catch(e){fallback(e)}},fallback);
    }else renderDefault(host,ms,ctx);
  }

  // 主页 showcase:纪念日前后 SHOWCASE 天,把这一站的内容包浮出来;其余时间主页只留计数与倒计时
  function mountShowcase(){
    const host=$('showcase');if(!host)return;
    const today=Math.floor(Math.max(new Date()-START,0)/864e5)+1;
    const hit=[...mss].reverse().find(m=>Math.abs(today-m.day)<=SHOWCASE);
    if(!hit){clearAll();return}
    showView(hit,host);
  }

  // 纪念日页:每一站一张卡,点开看这一站的内容包(地址里带上天数,方便直接分享/收藏)
  function mountMilestones(){
    const ar=$('ar'),list=$('arlist');if(!ar||!list)return;
    if(!mss.length){ar.style.display='none';return}
    list.innerHTML=mss.map((m,i)=>{
      const pic=m.blocks.find(b=>b.src&&/画|图|art|image/i.test(String(b.type)));
      return `<div class="aritem glass" role="button" tabindex="0" data-i="${i}">`
        +`<span class="arnum"><b>${m.day}</b><small>DAYS</small></span>`
        +`<span class="arbody"><time>${fmt(unOf(m.day)).replace(/\./g,' · ')}</time>`
        +`<h3>${esc(m.meta.title||`第 ${m.day} 天`)}</h3>`
        +(m.meta.desc?`<p class="arex">${esc(m.meta.desc)}</p>`:'')+`</span>`
        +(pic?`<span class="evpic"><img src="${esc(pic.src)}" alt="${esc(m.meta.title||'')}" loading="lazy"></span>`:'')
        +`<span class="argo" aria-hidden="true">›</span></div>`;
    }).join('');
    // 点同一张卡再点一次 = 收起;点别的卡 = 换一站
    const go=i=>{
      const cur=(location.hash||'').split('/')[2];
      location.hash=(cur&&+cur===mss[i].day)?'#/milestones':`#/milestones/${mss[i].day}`;
    };
    list.onclick=e=>{const it=e.target.closest('.aritem');if(it)go(+it.dataset.i)};
    list.onkeydown=e=>{
      if(e.key!=='Enter'&&e.key!==' ')return;
      const it=e.target.closest('.aritem');if(!it)return;
      e.preventDefault();go(+it.dataset.i);
    };
    const cl=$('msclose');if(cl)cl.onclick=()=>{location.hash='#/milestones'};
  }

  // ── 路由:主页 #/ ｜ 时间轴 #/timeline ｜ 纪念日 #/milestones[/<天数>] ──
  const VIEWS={home:$('v-home'),timeline:$('v-timeline'),milestones:$('v-milestones')};

  // 导航里那块玻璃滑块:量出当前标签的位置,把玻璃移过去(宽度也一起过渡)
  const tabsEl=$('tabs'),thumbEl=$('thumb');
  function moveThumb(){
    if(!tabsEl||!thumbEl)return;
    const a=tabsEl.querySelector('a.on');
    if(!a){thumbEl.style.width='0';return}
    thumbEl.style.transition='';
    thumbEl.style.width=a.offsetWidth+'px';
    thumbEl.style.transform=`translateX(${a.offsetLeft}px)`;
  }

  // ── 玻璃滑块本身可以拖:手指按在导航条上左右拖,玻璃跟着走、颜色跟即切换,
  //    松手吸附到最近的那个标签并换页。页面不动,只动这块玻璃。 ──
  if(tabsEl&&thumbEl){
    const links=[...tabsEl.querySelectorAll('a')];
    const cx=a=>a.offsetLeft+a.offsetWidth/2;
    const onI=()=>Math.max(0,links.findIndex(a=>a.classList.contains('on')));
    let d=null,suppress=false,suppressT=null;
    const snap=i=>{thumbEl.style.width=links[i].offsetWidth+'px';thumbEl.style.transform=`translateX(${links[i].offsetLeft}px)`};
    const nearest=x=>{let b=0,bd=1e9;links.forEach((a,i)=>{const v=Math.abs(x-cx(a));if(v<bd){bd=v;b=i}});return b};
    tabsEl.addEventListener('pointerdown',e=>{
      if(!links.length)return;
      if(e.pointerType==='mouse'&&e.button!==0)return;
      d={x:e.clientX,i:onI(),at:onI(),moved:0,cap:false};
      thumbEl.style.transition='none';
    });
    tabsEl.addEventListener('pointermove',e=>{
      if(!d)return;
      const dx=e.clientX-d.x;d.moved=dx;
      if(!d.cap){
        if(Math.abs(dx)<4)return;
        d.cap=true;tabsEl.classList.add('dragging');
        try{tabsEl.setPointerCapture(e.pointerId)}catch(err){}
      }
      const last=links[links.length-1];
      const x=Math.max(cx(links[0]),Math.min(cx(last),cx(links[d.i])+dx));
      const t=nearest(x),w=links[t].offsetWidth;
      const maxL=last.offsetLeft+last.offsetWidth-w;
      const left=Math.max(links[0].offsetLeft,Math.min(maxL,x-w/2));
      thumbEl.style.width=w+'px';thumbEl.style.transform=`translateX(${left}px)`;
      d.at=t;
      links.forEach((a,k)=>a.classList.toggle('on',k===t));
    });
    const drop=()=>{
      if(!d)return;const g=d;d=null;
      tabsEl.classList.remove('dragging');
      thumbEl.style.transition='';                 // 恢复过渡,吸附才有动画
      const i=Math.abs(g.moved)>4?g.at:g.i;
      snap(i);
      if(Math.abs(g.moved)>4){
        suppress=true;clearTimeout(suppressT);suppressT=setTimeout(()=>{suppress=false;suppressT=null},250);
        location.hash=links[i].getAttribute('href');
      }else links.forEach((a,k)=>a.classList.toggle('on',k===i));
    };
    tabsEl.addEventListener('pointerup',drop);
    tabsEl.addEventListener('pointercancel',drop);
    // 拖完之后浏览器还会按"松手位置那个链接"再跳一次,拦掉它
    tabsEl.addEventListener('click',e=>{
      if(!suppress)return;
      suppress=false;e.stopPropagation();e.preventDefault();
    },true);
  }

  function route(){
    const raw=(location.hash||'#/').replace(/^#\/?/,''),[name,sub]=raw.split('/');
    const key=VIEWS[name]?name:'home',cur=VIEWS[key];
    for(const k in VIEWS)VIEWS[k].classList.toggle('active',k===key);
    document.querySelectorAll('#tabs a').forEach(a=>a.classList.toggle('on',a.dataset.v===key));
    requestAnimationFrame(moveThumb);
    // 这一页的 section 进场(IntersectionObserver 也会兜底)
    requestAnimationFrame(()=>cur.querySelectorAll('section').forEach(s=>s.classList.add('show')));
    if(key==='home')mountShowcase();                     // 主页:重新挂上这一站的内容包
    else if(key==='milestones'){
      const det=$('msdetail'),i=mss.findIndex(m=>String(m.day)===sub);
      // 展开的那张卡高亮 + 箭头转下来;详情下方给一个「收起」
      document.querySelectorAll('#arlist .aritem').forEach(a=>a.classList.toggle('open',i>=0&&+a.dataset.i===i));
      const cl=$('msclose');if(cl)cl.classList.toggle('on',i>=0);
      if(i>=0){showView(mss[i],det);setTimeout(()=>det.scrollIntoView({behavior:'smooth',block:'start'}),80)}
      else clearAll();
    }else clearAll();                                    // 时间轴页:把信封收起来(下次回主页再挂)
    if(!sub)window.scrollTo({top:0,behavior:'smooth'});
  }
  addEventListener('hashchange',route);
  addEventListener('resize',moveThumb);

  // ── 下一封信:下一个里程碑的倒计时 ──
  //   还没到达,所以只预告不给看;提前 TEASE 天出现,没到预告期 / 没有下一站 / 首批内容还没解锁时整段收起。
  //   到了那天(并且它的信写好之后)它会自动出现在上面的归档里,信封也会换成最新那封。
  function mountNextLetter(){
    const nl=$('nl'),card=$('nlcard');
    if(!nl||!card)return;
    if(NEXT==null||un0-new Date()>0){nl.style.display='none';return}
    const ICON=`<div class="nlseal" aria-hidden="true"><svg viewBox="0 0 120 88">`
      +`<rect x="4" y="6" width="112" height="76" rx="8" fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/>`
      +`<path d="M4 14 L60 54 L116 14" fill="none" stroke="currentColor" stroke-width="2" opacity=".55" stroke-linejoin="round"/>`
      +`<circle cx="60" cy="62" r="11" fill="currentColor" opacity=".2"/>`
      +`<path d="M60 67.5c-3.4-3.6-7-5.7-7-9.4 0-2.9 2.2-4.8 4.6-4.8 1.5 0 2.6.8 2.4 1.9.2-1.1 1.3-1.9 2.4-1.9 2.4 0 4.6 1.9 4.6 4.8 0 3.7-3.6 5.8-7 9.4z" fill="currentColor" opacity=".85"/>`
      +`</svg></div>`;
    function render(){
      const L=leftNext();
      // 还没到预告期,或已经越过那天(从那刻起它就归归档管了):整段不出现
      if(L>TEASE||L<=0){nl.style.display='none';nl.classList.remove('show');return}
      nl.style.display='';nl.classList.add('show');
      card.className='nlcard';
      card.innerHTML=ICON
        +`<p class="nltitle">第 ${GOAL} 天</p>`
        +`<p class="nldesc">写给宝宝的下一封信,会在那天自动拆封</p>`
        +`<p class="nlcd">还有 <b id="nldays">${L}</b> 天 · ${fmt(unN).replace(/\./g,' · ')}</p>`
        +`<p class="nlhint">${L<=1?'就是明天 ♥':'就快到了 ♥'}</p>`;
    }
    render();
    // 页面长期挂着也没关系:每分钟看一眼,跨过预告期 / 当天时自动出现或收起
    let last=leftNext();
    setInterval(()=>{const L=leftNext();if(L!==last){last=L;render()}},6e4);
  }
  mountMilestones();
  mountNextLetter();
  route();
}
