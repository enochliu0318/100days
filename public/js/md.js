// 极简 Markdown 解析:front matter、时间轴
export const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function parseFront(t){
  const m=t.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/),meta={};
  if(!m)return{meta,body:t.trim()};
  m[1].split(/\r?\n/).forEach(l=>{const i=l.indexOf(':');if(i>0&&!l.trim().startsWith('#'))meta[l.slice(0,i).trim()]=l.slice(i+1).trim()});
  return{meta,body:m[2].trim()};
}

// "## 日期 | 标题" 开头为一条记录,其后的内容为正文;第一条之前的文字会被忽略
export function parseTimeline(t){
  const out=[];let cur=null;
  t.split(/\r?\n/).forEach(l=>{
    const m=l.match(/^##\s+(.+?)\s*\|\s*(.+)$/);
    if(m){cur={date:m[1],title:m[2],lines:[]};out.push(cur)}else if(cur)cur.lines.push(l);
  });
  return out.map(e=>({date:e.date,title:e.title,text:e.lines.join('\n').trim()}));
}

export function parseDate(s){
  const m=String(s||'').trim().match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  return m?new Date(+m[1],m[2]-1,+m[3]):null;
}

// 纪念日内容包:front matter + 一串"块"。
//   ## 类型 | 标题 | 附加(=图片路径)   ← 开始一个块(类型:信 / 画,其它按普通文字)
//   块下面到下一个 "##" 之间的行,是这个块的正文
// 想给某一站换一套排版/动画,不用改这里 —— 在 front matter 写 view: 名字 即可(见 js/views/default.js)
export function parseMilestone(t){
  const {meta,body}=parseFront(t),blocks=[];let cur=null;
  body.split(/\r?\n/).forEach(l=>{
    const m=l.match(/^##\s*(.+)$/);
    if(m){
      const [type,title,src]=m[1].split('|').map(s=>s.trim());
      cur={type:type||'文字',title:title||'',src:src||'',lines:[]};
      blocks.push(cur);
    }else if(cur)cur.lines.push(l);
  });
  // 一个 "##" 都没有:整篇当成一块普通文字
  if(!blocks.length&&body)blocks.push({type:'文字',title:'',src:'',lines:body.split(/\r?\n/)});
  return {meta,blocks:blocks.map(b=>({type:b.type,title:b.title,src:b.src,text:b.lines.join('\n').trim()}))};
}
export function parseMilestones(meta){
  const raw=String(meta.milestones||'').trim();
  let list;
  if(raw)list=raw.split(/[\s,，]+/).map(Number).filter(n=>n>0);
  else{
    list=[+meta.milestone||100];
    const nx=+meta.next||0;if(nx>list[0])list.push(nx);
  }
  return [...new Set(list)].sort((a,b)=>a-b);
}
