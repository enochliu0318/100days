import {parseFront,parseTimeline,parseDate,esc} from './md.js';
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
let A,B,LF;
try{
  [A,B,LF]=await Promise.all([get('content/site.md'),get('content/timeline.md'),get('content/letter.md')]);
}catch(e){
  $('ip').textContent=location.protocol==='file:'
    ?'内容加载失败:请通过 Web 服务器访问(见 README)'
    :'内容加载失败:请检查网络后重试';
  console.error('[fetch]',e);throw e;
}
try{
  init(parseFront(A).meta,parseTimeline(B),parseFront(LF));
}catch(e){
  console.error('[init]',e);
  $('ip').textContent='页面初始化出错,请刷新重试';
}

function init(c,events,letter){
  const him=c.him||'Him',her=c.her||'Her',N=+c.milestone||100,START=parseDate(c.start)||new Date();
  const now0=new Date(),fmt=d=>`${d.getFullYear()}.${p2(d.getMonth()+1)}.${p2(d.getDate())}`;
  document.title=`${him} & ${her} · 第 ${N} 天`;
  $('ih').innerHTML=`${esc(him)} <span>&amp;</span> ${esc(her)}`;
  $('is').textContent=`${N} DAYS OF LOVE`;
  $('names').innerHTML=`${esc(him)}<span>&amp;</span>${esc(her)}`;
  $('dt').textContent=fmt(START).replace(/\./g,' · ');
  $('goal').textContent=`/ ${N} 天`;
  $('lt').textContent=`写给宝宝的信`;
  $('ft').textContent=`${him} & ${her} · ${START.getFullYear()}`;
  const mg=document.querySelectorAll('#mono text');
  if(mg.length){const ini=s=>((s||'').trim()[0]||'♥').toUpperCase();mg.forEach(n=>n.textContent=`${ini(him)} & ${ini(her)}`)}
  setSrc(c.music||'assets/music.mp3');

  // 通用弹窗
  const M=$('modal'),MB=$('mbody'),BOX=$('mbox');
  let typeTimer=null,typing=false,closingLetter=false,closeLetterT=null,closeEnvT=null;
  // 信封收起:.open 移除后前盖/翻盖不会自行过渡(展开是 animation forwards 驱动),
  // 改由 .closing 显式收合:信纸先缩回(0.5s) → 回折盖落下(0.5s@0.5s) → 前盖合上(0.4s@0.7s),约 1.1s 后收敛。
  function startEnvClose(){
    const E=$('envwrap');
    if(closeEnvT){clearTimeout(closeEnvT);closeEnvT=null}
    E.classList.remove('open');E.classList.add('closing');
    closeEnvT=setTimeout(()=>{closeEnvT=null;$('envwrap').classList.remove('closing')},1150);
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
    const sheetEl=document.querySelector('.envsvg .esheet'),BX=$('mbox');
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
      M.classList.remove('open');document.body.style.overflow='';document.body.classList.remove('modal-on');
      startEnvClose();restoreSeal();closingLetter=false;
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
    const S=$('seal'),E=$('envwrap');
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

  // 一百天纪念画:走专门的灯箱(.artzoom),不复用时间轴那个 .memo 阅读面板——
  // .memo 是一张 520px 宽的纸卡(标题 + 纸底 + 78vh 高度上限 + 内部滚动),竖幅原画塞进去
  // 只能缩到栏宽再上下滚,细节全丢。灯箱里不放标题、不加纸底,<img> 同时受 max-width 与
  // max-height 约束,交给 CSS 按 1364×1766 的固有比例取"放得下的最大尺寸"。
  const ART='assets/photos/100天.jpg',artEl=$('art');
  if(artEl){
    const artZoom=()=>{
      openModal(`<figure class="zoomfig"><img class="zoomimg" src="${ART}" width="1364" height="1766"`
        +` alt="宝宝画的一百天纪念画:蓝色小海豚与白色小白鲸">`
        +`<figcaption class="zoomcap">小海豚 ❤️ 小白鲸</figcaption></figure>`,'artzoom');
      const im=MB.querySelector('.zoomimg');
      if(im)im.onclick=closeModal; // 再点一下画本身也收起,与点背景同一手感
    };
    artEl.onclick=artZoom;
    artEl.onkeydown=ev=>{if(ev.key!=='Enter'&&ev.key!==' ')return;ev.preventDefault();artZoom()};
  }

  // 计数器
  function tick(){
    const now=new Date(),diff=Math.max(now-START,0),day=Math.floor(diff/864e5),n=day+1;
    $('dn').textContent=n;$('d').textContent=day;
    $('ring').style.strokeDashoffset=603*(1-Math.min(n,N)/N);
    $('h').textContent=p2(Math.floor(diff/36e5)%24);$('m').textContent=p2(Math.floor(diff/6e4)%60);$('s').textContent=p2(Math.floor(diff/1e3)%60);
    const tg=new Date(START);tg.setDate(tg.getDate()+N-1);const r=tg-now;
    $('cd').textContent=r>0?`距离第 ${N} 天,还有 ${Math.floor(r/864e5)} 天 ${Math.floor(r/36e5)%24} 小时`
      :n===N?`🎉 今天是我们的第 ${N} 天!`:`我们已经走过了第 ${N} 天 ♥`;
  }
  tick();setInterval(tick,1000);

  // ── 解锁闸门:三个阶段 ──
  //   locked  未进入剧透期 → 只显示计数(信件与时间轴整段隐藏)
  //   teased  剧透期(解锁前 TEASE 天)→ 预告"有内容",但仍不给看
  //   open    满 N 天 → 全部展开
  const MAIN=document.querySelector('main');
  const TEASE=Math.max(0,+c.tease||0);                 // site.md 里 tease 配置剧透提前天数
  const un=new Date(START);un.setDate(un.getDate()+N-1); // 解锁日 00:00
  const leftDays=()=>Math.ceil((un-new Date())/864e5);   // 距解锁还剩几天(向上取整)
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
    const D=fmt(un).replace(/\./g,' · ');
    if(st==='open'){$('pn').innerHTML='';return}
    if(st==='teased'){
      $('pn').innerHTML='';                       // 剧透卡片自己会说明,不再重复
      $('tday').textContent=`第 ${N} 天 · ${fmt(un)}`;
      $('thint').textContent=L===1?'就是明天 ♥':`还有 ${L} 天 · 先数完最后几天`;
      return;
    }
    $('pn').innerHTML=`<span class="pk">🔒</span>更多内容会在第 ${N} 天解锁<br><b>${D}</b><i>还有 ${L} 天 · 故事慢慢来</i>`;
  }
  // 跨越剧透起点 / 解锁时刻:留在页面上的用户无需刷新,到点自动切换
  function schedule(){
    clearTimeout(gateT);
    const ms=un-new Date();
    if(ms<=0)return;
    gateT=setTimeout(()=>{if(gate()==='open')unlock();schedule()},ms+1500);
  }
  gate();schedule();

  // 解锁演出:彩带 + 两段内容依次浮现
  function unlock(){
    MAIN.classList.remove('pending');
    const [W,H]=size();
    burst(W/2,H*.4);setTimeout(()=>burst(W*.3,H*.3),320);setTimeout(()=>burst(W*.7,H*.32),640);
    const secs=[...document.querySelectorAll('.env,.artwork,.moments')];
    secs.forEach((s,i)=>{s.style.transition='none';s.classList.remove('show');
      setTimeout(()=>{s.style.transition='';requestAnimationFrame(()=>s.classList.add('show'))},260+i*220)});
    $('cd').textContent=`🎉 第 ${N} 天，全部内容已解锁`;
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
  const LETTER=letter.body;
  function typeLetter(){
    if(!M.classList.contains('open'))return;
    const L=$('letter');L.textContent='';let i=0;
    if(typeTimer){clearTimeout(typeTimer);typeTimer=null}
    L.classList.add('typing');
    const step=()=>{
      if(!M.classList.contains('open')){typeTimer=null;return}
      const ch=LETTER[i++];L.textContent+=ch;
      if(L.scrollHeight-L.scrollTop-L.clientHeight<90)L.scrollTop=L.scrollHeight;
      if(i>=LETTER.length){typeTimer=null;typing=false;L.classList.remove('typing');$('rb').style.display='block';const [W,H]=size();burst(W/2,H*.5);return}
      const wait=/[。!?…]/.test(ch)?300:/[,、;:]/.test(ch)?160:ch==='\n'?140:58;
      typeTimer=setTimeout(step,wait);
    };
    typeTimer=setTimeout(step,70);
  }
  function openLetter(){
    openModal(`<p class="to en">${esc(letter.meta.to||`To my dearest ${her},`)}</p><div id="letter"></div>`,'letter');
    typing=true;
    // FLIP:弹窗信纸从信封里那张信纸的位置直接放大展开
    const sheetEl=document.querySelector('.envsvg .esheet'),BX=$('mbox');
    if(sheetEl){
      M.classList.add('noanim');
      BX.style.transition='none';BX.style.transform='none';
      const t=BX.getBoundingClientRect(),s=sheetEl.getBoundingClientRect();
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
  $('envwrap').onclick=()=>{
    const S=$('seal');if(S.classList.contains('break'))return;
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
    $('envwrap').classList.remove('closing');
    $('envwrap').classList.add('open');
    const r=S.getBoundingClientRect();
    burst(r.left+r.width/2,r.top+r.height/2);
    const E=$('envwrap').getBoundingClientRect();
    // 时序与 style.css 对齐:火漆 .42s 裂完 → 前盖 .48s 起折(0.92s 翻到位)→ 信纸 1.06s 抽出(1.91s 到位)。
    // 信封口那次 burst 压在盖子完全翻开之后,开信弹窗必须等信纸停稳(否则 FLIP 会从半空的位置起飞)。
    setTimeout(()=>burst(E.left+E.width/2,E.top+E.height*.18),1440);
    setTimeout(openLetter,1960);
  };
}
