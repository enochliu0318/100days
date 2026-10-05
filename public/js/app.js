import {parseFront,parseTimeline,parseDate,esc} from './md.js';
import {burst,size} from './fx.js';
import {play,isPlaying,setSrc} from './music.js';

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

try{
  const [a,b,l]=await Promise.all([get('content/site.md'),get('content/timeline.md'),get('content/letter.md')]);
  init(parseFront(a).meta,parseTimeline(b),parseFront(l));
}catch(e){
  $('ip').textContent='内容加载失败:请通过 Web 服务器访问(见 README)';console.error(e);
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
  let typeTimer=null,typing=false,closingLetter=false,closeLetterT=null;
  function openModal(html,cls){
    // 若上一封情书还停在缩回动画里,立即收敛信封状态,避免新旧弹窗互相打断
    if(closingLetter){
      closingLetter=false;if(closeLetterT){clearTimeout(closeLetterT);closeLetterT=null}
      M.classList.remove('closing');
      const BX=$('mbox');BX.classList.remove('flying');BX.style.cssText='';
      $('envwrap').classList.remove('open');
      setTimeout(restoreSeal,1000);
    }
    MB.innerHTML=html;
    M.classList.remove('ev','letter');if(cls)M.classList.add(cls);
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
        $('envwrap').classList.remove('open');
        setTimeout(restoreSeal,1000);
        closingLetter=false;
      },580);
    }else{
      M.classList.remove('open');document.body.style.overflow='';document.body.classList.remove('modal-on');
      restoreSeal();closingLetter=false;
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

  // 时间轴:卡片只显示日期+标题,点击弹窗阅读全文
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
    const d=parseDate(e.date),fut=d&&d>now0;
    const ex=(e.text.split(/\n+/).find(l=>l.trim()&&!/^!\s*\[/.test(l.trim()))||'').trim();
    return `<div class="ev glass${fut?' future':''}" data-i="${i}"><time>${d?fmt(d):esc(e.date)}</time><h3>${esc(e.title)}</h3>${ex?`<p class="ex">${esc(ex)}</p>`:''}</div>`;
  }).join('');
  $('tl').onclick=ev=>{
    const c=ev.target.closest('.ev');if(!c)return;
    const i=+c.dataset.i,d=parseDate(events[i].date);
    openModal(`${d?`<time>${fmt(d)}</time>`:''}<h3>${esc(events[i].title)}</h3>${bodies[i]}`,'ev');
  };

  // 计数器
  function tick(){
    const now=new Date(),diff=Math.max(now-START,0),day=Math.floor(diff/864e5),n=day+1;
    $('dn').textContent=n;$('d').textContent=day;
    $('ring').style.strokeDashoffset=603*(1-Math.min(n,N)/N);
    $('h').textContent=p2(Math.floor(diff/36e5)%24);$('m').textContent=p2(Math.floor(diff/6e4)%60);$('s').textContent=p2(Math.floor(diff/1e3)%60);
    const tg=new Date(START);tg.setDate(tg.getDate()+N-1);const r=tg-now;
    $('cd').textContent=r>0?`距离第 ${N} 天,还有 ${Math.floor(r/864e5)} 天 ${Math.floor(r/36e5)%24} 小时`
      :n===N?`🎉 今天,就是我们的第 ${N} 天!`:`我们已经走过了第 ${N} 天 ♥`;
  }
  tick();setInterval(tick,1000);

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
    $('envwrap').classList.add('open');
    const r=S.getBoundingClientRect();
    burst(r.left+r.width/2,r.top+r.height/2);
    const E=$('envwrap').getBoundingClientRect();
    setTimeout(()=>burst(E.left+E.width/2,E.top+E.height*.18),1000);
    setTimeout(openLetter,1520);
  };
}
