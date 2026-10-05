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
