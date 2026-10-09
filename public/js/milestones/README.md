# 自定义渲染器放在这里

想给某一个纪念日换一套**完全不同的排版 / 动画**?在这个目录里加一个文件就行,
不用碰 app.js,也不用改别的纪念日。

## 三步

1. 把默认渲染器整份复制过来,改名:

   ```bash
   cp public/js/views/default.js public/js/milestones/730.js
   ```

2. 打开 `public/js/milestones/730.js`,爱怎么改怎么改。导出的还是同一个函数:

   ```js
   export function render(host, ms, ctx){
     host.innerHTML = '';          // 先把容器清空
     // ms.day    第几天,比如 730
     // ms.meta   front matter,含 title / desc / 你自己加的任意字段
     // ms.blocks [{type,title,src,text}] —— 纯数据,想怎么排就怎么排
     // ctx       {envelope(), useLetter(block,ms), artZoom(src,title,caption), esc}
     // host      要渲染进去的容器(已经在页面上,内容会被清空)
   }
   ```

3. 在这一站的内容文件 `public/content/milestones/730.md` 的 front matter 里挂上它:

   ```yaml
   ---
   title: 两年啦
   view: 730      # ← 就是文件名(不含 .js)
   ---
   ```

搞定。没有写 `view:` 的纪念日继续用默认渲染器,互不影响。

## 注意

- `ctx.envelope()` 返回的是**那一只单例信封**。同一时间只会有它一份存在,
  你把它 `host.appendChild(...)` 挂上就行;要自己画一套就用不着它。
- 渲染器里不要引用会互相撞的 `id`(要的话自己加前缀)。
- 文件找不到或抛异常时会自动回退到默认渲染器,不会把整站弄白。
