# Enoch & Sissi · 100 Days

纯静态网站,无需构建。内容全部放在 Markdown 文件里,改完 `git push` 即可更新。

## 目录结构

```
.
├─ README.md
├─ .gitignore
└─ public/                  ← 部署目录(Cloudflare 只发布这里)
   ├─ index.html            页面骨架
   ├─ css/style.css         样式(粉金主题,支持深色模式)
   ├─ js/
   │  ├─ app.js             主逻辑:密码锁、读取内容、计数器、时间轴、情书
   │  ├─ md.js              Markdown 解析
   │  ├─ fx.js              花瓣、爱心、烟花特效
   │  └─ music.js           背景音乐
   ├─ content/              ← 日常只需要编辑这里
   │  ├─ site.md            名字、在一起的日期、里程碑天数、音乐路径
   │  ├─ timeline.md        回忆时间轴
   │  └─ letter.md          情书
   └─ assets/
      ├─ music.mp3          背景音乐(自行放入,文件名与 site.md 中 music 一致)
      └─ photos/            时间轴照片
```

## 内容怎么改

- **site.md**:`him`、`her` 为两人名字,`start` 为在一起的日期(格式 `2026-06-30`),`milestone` 为纪念的天数。
- **timeline.md**:每条记录以 `## 日期 | 标题` 开头,可写多段正文,也可插入照片,详见文件顶部说明。
- **letter.md**:直接写正文,换行与空行会原样保留,页面会逐字显现。想改开头称呼,可在文件最前面加一段 front matter:`---` 换行 `to: 你想要的称呼` 换行 `---`。

## 本地预览

页面通过 `fetch` 读取 md 文件,不能直接双击打开 `index.html`,需要起一个本地服务:

```bash
npx serve public
# 或
python3 -m http.server -d public 8000
```

## 部署到 Cloudflare Pages

1. 把仓库推送到 GitHub(或 GitLab)。
2. 进入 Cloudflare 控制台,新建 Pages 项目并连接该仓库。
3. 构建设置:Framework preset 选 `None`,Build command 留空,Build output directory 填 `public`。
4. 保存并部署。之后每次 `git push`,Cloudflare 都会自动重新发布。

控制台界面可能会有调整,但这三项设置的含义不变。也可以不用 Git 集成,直接用命令行部署:

```bash
npx wrangler pages deploy public --project-name enoch-sissi
```

## 注意事项

- **首页密码锁**:打开网站需先输入四位密码(提示"我们的第一天",默认密码 `0630`),每次刷新都要重新输入;进入后右上角 🔒 可再次锁定。电脑上可直接用键盘输入数字、按退格删除,手机上点圆点键盘。想改密码:改 `public/js/app.js` 里的 `const CODE='0630'`;想改提示语:改 `public/index.html` 里的"提示 · 我们的第一天"。
- **音乐**:请自行准备音频文件并命名为 `public/assets/music.mp3`。上传和公开播放受版权保护的歌曲前,请自行确认授权。文件不存在时,页面会播放内置的氛围音,右上角的"＋"按钮也可临时选择手机里的音频。
- **缓存**:md 文件已设置为每次重新校验,更新后刷新页面即可看到。照片和音乐可能被浏览器缓存,替换文件时建议换一个文件名。
- **字体**:标题字体来自 Google Fonts,加载失败时会自动使用系统字体。
