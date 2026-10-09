// ── 默认渲染器:把一站的内容包排成「信封 + 画框」 ──
//
// 想给某一站换一套自己的排版 / 动画?把这个文件整份复制到 js/milestones/<名字>.js,
// 改完之后在 content/milestones/<天数>.md 的 front matter 里写一行 `view: <名字>` 就挂上了。
// 默认渲染器只是"起手式",完全可以不用它 —— 你的渲染器和它是平级的。
//
// render(host, ms, ctx)
//   host  要渲染进去的容器(已经在页面上)
//   ms    { day, meta, blocks:[{type,title,src,text}] }
//         blocks 是纯数据:type 是 「信」/「画」/ 其它,title 是标题,src 是图片路径,text 是正文/题词
//   ctx   几个现成的能力:
//           ctx.envelope()          拿到那只「单例信封」元素(挂到 host 上就行)
//           ctx.useLetter(block,ms) 告诉它:拆开信封时读的是这一段(正文 + 称呼)
//           ctx.artZoom(src,title,caption)  打开画框灯箱
//           ctx.esc                 转义函数(拼 HTML 时防注入)
import {esc as e} from '../md.js';

export function render(host,ms,ctx){
  host.innerHTML='';

  // 小标题:第 N 天 + 名字 + 一句话
  const head=document.createElement('div');
  head.className='mshead';
  head.innerHTML=`<h2><small>${ms.day} Days</small>${e(ms.meta.title||`第 ${ms.day} 天`)}</h2>`
    +(ms.meta.desc?`<p class="msdesc">${e(ms.meta.desc)}</p>`:'');
  host.appendChild(head);

  // 按内容包里的顺序,一块一块排下去
  for(const b of ms.blocks){
    const t=String(b.type||'').toLowerCase();
    if(t==='信'||t==='letter'){
      const env=ctx.envelope();
      const lt=env.querySelector('#lt');
      if(lt)lt.textContent=b.title||'写给宝宝的信';
      ctx.useLetter(b,ms);
      host.appendChild(env);
    }else if(t==='画'||t==='图'||t==='art'||t==='image'){
      host.appendChild(art(b,ctx));
    }else{
      host.appendChild(note(b));
    }
  }
  host.querySelectorAll('section').forEach(s=>s.classList.add('show'));
}

// 一块「画」:卡纸 + 和纸胶带 + 点击放大(样式全部复用 .artwork 那一套)
function art(b,ctx){
  const d=document.createElement('div');
  d.className='artwork';
  const title=b.title||'纪念画';
  d.innerHTML=`<h2><small>Hand-painted</small>${e(title)}</h2>`
    +`<figure class="artframe" role="button" tabindex="0" aria-label="放大看看${e(title)}">`
    +`<span class="tape t1" aria-hidden="true"></span><span class="tape t2" aria-hidden="true"></span>`
    +`<img class="artimg" src="${e(b.src)}" alt="${e(title)}" loading="lazy"></figure>`
    +(b.text?`<p class="artquote en">${e(b.text)}</p>`:'')
    +`<p class="arthint">轻触放大</p>`;
  const fig=d.querySelector('.artframe');
  const go=()=>ctx.artZoom(b.src,title,b.text||'');
  fig.onclick=go;
  fig.onkeydown=ev=>{if(ev.key!=='Enter'&&ev.key!==' ')return;ev.preventDefault();go()};
  return d;
}

// 一块普通文字(类型写别的时走这里)
function note(b){
  const d=document.createElement('div');
  d.className='msnote';
  d.innerHTML=(b.title?`<h3>${e(b.title)}</h3>`:'')
    +b.text.split(/\n+/).filter(Boolean).map(p=>`<p>${e(p.trim())}</p>`).join('');
  return d;
}
