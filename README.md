# 本站操作手册

这是 **allkeyboardcx.github.io** 的日常操作说明：怎么发一篇文章、怎么建一个专栏、图片放哪、哪些文件不能手改、出问题怎么查。
照着做就行，不需要懂前端。

目录：[站点怎么跑的](#站点怎么跑的) · [仓库地图](#仓库地图) · [写一篇文章](#写一篇文章) · [环境](#环境) · [怎么提交](#怎么提交) · [用 git 命令更新仓库](#用-git-命令更新仓库详细步骤) · [图片](#图片) · [专栏](#专栏) · [分类](#分类) · [不要手改的文件](#不要手改的文件) · [阅读量与评论](#阅读量与评论) · [成就与荣誉怎么更新](#成就与荣誉怎么更新) · [改样式与改页面](#改样式与改页面) · [本地预览](#本地预览) · [常见坑](#常见坑) · [发布前清单](#发布前清单)

---

## 站点怎么跑的

纯静态博客：**没有构建步骤**，改完 push 到 `main` 分支，GitHub Pages 会自动重新发布。

只有一件事是"半自动"的——文章列表不是手写的，而是由脚本扫 `content/` 目录生成：

```
你 push 一篇 md  →  GitHub Action「Build Index」自动跑 scripts/build-index.js
                 →  重写各分类的 index.json / series.json  →  自动提交一次
                 →  GitHub Pages 重新发布  →  页面更新
```

所以正常流程下，**你只需要传 md 和图片**，列表、专栏、排序都是自动的。

## 仓库地图

| 路径 | 干什么 |
| --- | --- |
| `content/<分类>/` | 所有文章 md，按分类放 |
| `content/<分类>/<专栏名>/` | 专栏里的文章（子文件夹就是一个专栏） |
| `content/<分类>/index.json` | 分类文章列表，**脚本生成，别手改** |
| `content/<分类>/series.json` | 该分类下的专栏列表，**脚本生成，别手改** |
| `pictures/` | 文章配图，全站公用 |
| `pages/` | 各个页面：文章页、分类页、专栏页、搜索、笔记、工具、关于 |
| `pages/article.html` | 文章页（?category=…&file=…） |
| `pages/series.html` | 专栏页（?category=…&series=…） |
| `css/styles.css` | 上游模板样式（Bootstrap + Start Bootstrap），**别动** |
| `css/sidebar.css` | 侧栏旧样式，**别动** |
| `css/design-system.css` | 覆盖层，改样式只加这里 |
| `js/sidebar.js` | 侧栏 + 按整点换肤 |
| `scripts/build-index.js` | 生成 index.json / series.json 的脚本 |
| `.github/workflows/build-index.yml` | 上面那个 Action 的配置 |
| `_qa/` | 历史截图和审计页，和站点无关，可以忽略 |

## 写一篇文章

### 放哪儿

```
content/
  binary/        二进制 / Pwn
    hello.md     ← 一篇普通文章
    xctf/        ← 一个专栏（见下面「专栏」）
      wp1.md
  security/       安全研究
  web-security/   Web 安全
```

**文件名就是链接的一部分**，建议英文小写 + 下划线，别用空格。

### 开头四行（格式固定）

文件最前面写这四行，**前缀必须顶格、全大写、跟一个空格**：

```
DATE 2026-07-11
TAG heap, 堆溢出, hook 劫持
SUMMARY 一句话说明这篇在讲什么，会显示在列表和文章信息头。
TITLE 从 0 开始的堆漏洞利用
```

| 行 | 说明 |
| --- | --- |
| `DATE` | `YYYY-MM-DD`；不写会退化成"文件修改时间"，列表日期就不准了 |
| `TAG` | 逗号分隔，会进标签云和文章页标签 |
| `SUMMARY` | 列表卡片和文章信息头的简介 |
| `TITLE` | 文章标题；不写会变成 `Untitled` |

四行之后空一行，接着就是正常 Markdown 正文（标题、列表、代码块都支持，代码块会自动高亮）。

### 示例

````markdown
DATE 2026-07-11
TAG pwn, tcache
SUMMARY glibc 2.31 下 tcache poisoning 的最小复现。
TITLE Tcache Poisoning 笔记

## 环境

- Ubuntu 20.04
- glibc 2.31

```bash
checksec ./pwn
```
````

## 怎么提交

三种方式，选一种就行。

**A. GitHub 网页上传（不用装 git）**

1. 打开仓库 → 进 `content/binary/`（换成你的分类）
2. 右上 `Add file` → `Upload files`，把 md 拖进去
3. 下面写一句提交说明 → `Commit changes`

图片也一样，拖到 `pictures/` 里。

**B. 命令行**（最常用；完整版见下一节「用 git 命令更新仓库」）

```bash
git pull --rebase                 # 先同步，不然会被远端新提交挡住
git add <你改过的文件>            # 例如 content/binary/新文章.md
git commit -m "content: 一句话说明"
git push
```

**C. GitHub Desktop**：改完点 Commit to main，再 Push origin。

**push 之后**：去仓库的 `Actions` 页看「Build Index」，变绿就说明索引重建好了，刷新页面即可（一般 1 分钟左右，以 Actions 日志为准）。
如果变了红，点进去看报错，通常是 md 头部格式写坏了。

手动重建（本地）：

```bash
node scripts/build-index.js     # 或 npm run build
```

## 用 git 命令更新仓库（详细步骤）

> 下面按 **Windows PowerShell** 写。macOS / Linux 把路径分隔符换成 `/` 即可，命令本身完全一样。

### 0. 先确认你在仓库目录里

```powershell
cd C:\Users\allkeyboard\Documents\deepseek-harness\default-workspace\allkeyboardcx.github.io
git status
```

- 看到 `On branch main` 和 `nothing to commit, working tree clean` → 位置对，且当前没有未提交的改动
- 看到 `fatal: not a git repository` → 目录不对，`cd` 到仓库根再试

### 1. 一次性配置（配过就跳过）

先查现在是什么状态：

```powershell
git --version
git config --global user.name
git config --global user.email
```

最后两条没输出，就补上（名字用你的 GitHub 用户名更直观）：

```powershell
git config --global user.name "AllKeyboardCx"
git config --global user.email "allkeyboard@163.com"
```

**认证**：远端用的是 HTTPS，第一次 `git push` 会弹一个浏览器窗口让你登录 GitHub（Git Credential Manager），登录一次以后就不用了。
如果弹出来的是命令行让你输密码 —— GitHub 早就不收登录密码了，要用 **Personal Access Token**：
GitHub → `Settings` → `Developer settings` → `Personal access tokens` → `Tokens (classic)` → `Generate new token`，勾上 `repo` 权限，把生成的那串当密码贴进去。
⚠️ token 只填在那一次弹窗里，**不要写进任何文件**，更不要提交进仓库。

**换行符警告可以忽略**：本机是 `core.autocrlf=true`，`git add` 时会打印 `LF will be replaced by CRLF the next time Git touches it` —— 这是提示，不是错误。

### 2. 第一次拿到仓库（换电脑或重装才需要）

```powershell
git clone https://github.com/AllKeyboardCx/allkeyboardcx.github.io.git
cd allkeyboardcx.github.io
```

### 3. 日常更新：六步

**第 1 步：先同步远端**

```powershell
git pull --rebase
```

为什么必须先来这一下：仓库里的 Actions 会自己往 `main` 提交一条 `Auto-update index.json`。你不同步就直接 push，一定被拒。
输出 `Already up to date.` 或者列出几个更新过的文件，都算正常。真出冲突看第 6 节。

**第 2 步：改文件**

文章 md 放 `content/<分类>/`，配图放 `pictures/`，荣誉照片放 `assets/honors/`。格式见上面「写一篇文章」和「成就与荣誉怎么更新」。

**第 3 步：看清楚要提交什么**

```powershell
git status
```

红色的 `modified:`、`deleted:` 和 `??`（未跟踪的新文件）就是这次要提交的东西。
**先扫一眼这份清单**，确认没有临时文件，也没有把别人的改动一起带上。

**第 4 步：加进暂存区**（写具体文件名，别偷懒用 `git add .`）

```powershell
git add content/binary/tcache-poisoning.md
git add pictures/tcache.png
```

确实要全加就用 `git add -A`，但一定先看完第 3 步的清单。

**第 5 步：提交**

```powershell
git commit -m "content: 新增 Tcache Poisoning 笔记"
```

**第 6 步：推送**

```powershell
git push
```

成功的样子（箭头是这次推送的范围）：

```
To https://github.com/AllKeyboardCx/allkeyboardcx.github.io.git
   be20a74..c66106c  main -> main
```

### 4. 完整例子：发一篇带图的文章

```powershell
cd C:\Users\allkeyboard\Documents\deepseek-harness\default-workspace\allkeyboardcx.github.io
git pull --rebase
# 用编辑器写 content/binary/tcache-poisoning.md（头部四行：DATE / TAG / SUMMARY / TITLE）
# 截图存到 pictures/tcache.png
git status
git add content/binary/tcache-poisoning.md pictures/tcache.png
git commit -m "content: 新增 Tcache Poisoning 笔记"
git push
```

> 如果 md 里图写的是 `![[tcache.png]]` 这种 Obsidian 写法：本地跑一次 `node scripts/build-index.js` 会把它改写成 `../pictures/tcache.png`，改完记得一起提交；懒得跑就交给 Action，它也会做。

### 5. push 完别急着刷新

1. 打开仓库的 **Actions** 页，等这次「Build Index」变绿（一般 1 分钟左右）
2. 变绿之后 Pages 才会重新发布，再等它跑完
3. 回到页面按 `Ctrl+F5` 硬刷新

如果变红了，点进去看日志里第一处红字。最常见的是 md 头部格式写坏，或者 `honors.json` / `series.json` 的 JSON 语法错（少个逗号、多个逗号）。

### 6. 常见报错怎么办

| 报错（原样） | 原因 | 解决 |
| --- | --- | --- |
| `! [rejected] main -> main (fetch first)` / `Updates were rejected because the remote contains work that you do not have locally` | 远端有你没有的提交（多半是 Action 自动提交的 index.json） | `git pull --rebase` 再 `git push` |
| `Authentication failed` | 凭据过期，或者用了登录密码 | 重新登录，或改用 Personal Access Token |
| `nothing to commit, working tree clean` | 文件没保存，或者改的不是这个仓库 | 检查文件到底改了没、是不是在正确目录 |
| `LF will be replaced by CRLF` | Windows 换行符转换提示 | 警告，忽略即可 |
| `fatal: not a git repository` | 不在仓库目录里 | `cd` 到仓库根 |
| `CONFLICT (content): Merge conflict in ...` | pull 时同一个文件两边都改了 | 按下面「解冲突三步」处理 |

**解冲突三步**：

```powershell
git status                       # 看哪些文件标了 CONFLICT
# 用编辑器打开这些文件，删掉 <<<<<<< / ======= / >>>>>>> 三种标记，只留你要的内容
git add <解好冲突的文件>
git rebase --continue
```

不想打这一架，可以直接 `git rebase --abort` 退回到 pull 之前，再想别的办法。

### 7. 后悔药

| 情形 | 命令 |
| --- | --- |
| 改了但还没 add，想撤销 | `git restore <文件>` |
| 已 add 还没 commit，想取消暂存 | `git restore --staged <文件>` |
| 刚 commit 还没 push，想补文件或改说明 | `git add <漏掉的文件>` 然后 `git commit --amend --no-edit` |
| 已经 push 了，想撤销这次改动 | `git revert <哈希>` 再 `git push`（生成一条反向提交，历史不乱） |

> ⚠️ 不要用 `git reset --hard` 加 `git push -f`：强推会把 Actions 自动提交的 index.json 顶掉，别人的提交也会一起丢。

### 8. 提交信息怎么写

格式 `类型: 一句话`，类型用下面这几个就够：

| 类型 | 什么时候用 |
| --- | --- |
| `content` | 新增或修改文章 |
| `feat` | 新功能 |
| `fix` | 修 bug |
| `docs` | 文档（比如这份 README） |
| `style` | 样式、排版调整 |

例子：

```
content: 新增 Tcache Poisoning 笔记
fix(friends): CSDN 友链指向 blog.csdn.net/qq_54958662
feat(honors): 成就与荣誉改成 JSON 驱动 —— 弹幕 + 画廊 + 灯箱
```

## 图片

统一放仓库根目录的 `pictures/`，文章里两种写法都行：

```markdown
![[demo.png]]         ← Obsidian 写法，会自动转
![[demo.png|600]]     ← 带显示宽度
![demo](../pictures/demo.png)   ← 普通 Markdown
```

注意：Obsidian 写法是在跑索引脚本时**就地改写**成 `<img src="../pictures/demo.png">` 的，
所以跑完 `scripts/build-index.js` 之后 `git status` 里会看到 md 被修改——这是正常的，一起提交即可。
图片本身放在 `pictures/`，用文件名引用，不要带路径。

## 专栏

一个分类下的**子文件夹就是一个专栏**（只往下找一层）。比如 Pwn 分类里的 XCTF 系列：

```
content/binary/xctf/
  series.json      ← 可选，写标题和顺序
  wp1.md
  wp2.md
```

没有 `series.json` 也能用，那就拿文件夹名当标题。有了它更好看：

```json
{
  "title": "XCTF 系列 Writeup",
  "summary": "2024 年打过的 XCTF 题目合集。",
  "cover": "",
  "order": ["wp1", "wp2"]
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 否 | 专栏标题，不写用文件夹名 |
| `summary` | 否 | 专栏简介，不写就取最新一篇的 SUMMARY |
| `cover` | 否 | 封面图，目前页面还没用到（预留给以后） |
| `order` | 否 | 数组，手动指定顺序，写文件名，`.md` 可省 |

**排序规则**：不写 `order` 就按 `DATE` **升序**（比赛 WP 按时间读更顺）；写了 `order` 就按它排，没列进去的按日期排在后面。

**页面表现**：

- 分类页顶部出现「📚 专栏」卡片，点进专栏页
- 专栏里的文章**不再**出现在分类页的单篇列表里（不会重复）
- 文章页信息头多一个「📚 专栏：xxx」的小标签

**新开一个专栏**（以 XCTF 为例）：

1. 网页上进入 `content/binary/` → `Add file` → `Create new file`，文件名写 `xctf/wp1.md`（斜杠会自动建文件夹），按上面的格式写好正文
2. 再建 `xctf/series.json`，粘贴上面那段 JSON，改成你的标题
3. 等 Action 跑完，回分类页刷新，就能看到专栏卡片

**删掉一个专栏**：把整个文件夹删掉，等 Action 重跑索引（文件夹空了就不会再出现在列表里）。

## 分类

现在有三个有内容的分类：

| 分类 | 页面 | 内容 |
| --- | --- | --- |
| `binary` | `pages/binary.html` | 二进制 / Pwn |
| `security` | `pages/security.html` | 安全研究 / 杂项 |
| `web-security` | `pages/web-security.html` | Web 安全 |

`pages/notes.html`（笔记）和 `pages/tools.html`（工具）是静态页，不吃 `content/`。

**想加第四个分类**，光建文件夹不够，还要改代码（搜索这些位置照着改，别只改一处）：

| 文件 | 位置 | 干什么 |
| --- | --- | --- |
| `pages/binary.html` | 整页 | 复制一份成新分类页，改 fetch 路径和标题 |
| `index.html` | 913–915 行、938–940 行 | 首页两处 `fetch('content/<分类>/index.json')` |
| `pages/article.html` | 531–533 行 | 文章页读各分类索引，用来找当前文章 |
| `pages/search.html` | 140–142 行 | 搜索页读各分类索引 |

## 不要手改的文件

| 文件 | 为什么 |
| --- | --- |
| `content/<分类>/index.json` | 脚本生成的文章列表，手改会被下次覆盖 |
| `content/<分类>/series.json` | 脚本生成的**专栏列表**（注意：和专栏文件夹里的同名文件不是一回事，那个才是你手写的） |
| `css/styles.css`、`css/sidebar.css` | 上游模板样式，改了就再也对不齐 |

## 友情链接怎么改

首页和关于页各有一份，**两处都要改**：

| 文件 | 行号 |
| --- | --- |
| `index.html` | 429–440 |
| `pages/about.html` | 184–195 |

每条由四个部件组成：

```html
<li class="friend-link-item"><a href="https://github.com/allkeyboardcx" target="_blank" class="text-light text-decoration-none d-flex align-items-center"><span class="friend-icon">🐙</span><span>GitHub</span></a></li>
```

- 改链接：`<a href="...">`
- 改显示名：最后一个 `<span>`
- 改图标：`friend-icon` 里那个 emoji；头像图那条是 `<img src="assets/H4J1M1.jpg">`（关于页写 `../assets/...`）
- 加一条：复制一整行 `<li>` 粘到 `</ul>` 前面

注意：卡片底色是 `css/sidebar.css` 里按 `nth-child(1)…(5)` 配好的五种渐变色，**顺序即颜色**；加到第 6 条会掉回默认样式，真要加就在 `css/design-system.css` 末尾补一条 `:nth-child(6)`。

## 阅读量与评论

文章的浏览量和评论走 Supabase，每篇文章的 key 是 `分类/文件名`，专栏文章是 `分类/专栏/文件名`。
这部分全自动，你不用管；改用文件名才会导致老数据接不上（所以改名要谨慎）。

## 成就与荣誉怎么更新

关于页那块「🏆 成就与荣誉」是纯数据驱动：**丢图片 + 改 JSON，push 就生效**，不用碰 HTML，也不用跑 `scripts/build-index.js`。

目录：`assets/honors/`

```
assets/honors/
  honors.json        ← 只改这个
  2026-ncis.jpg      ← 图片放这里，名字随便
```

`honors.json` 是一个数组，每条：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `date` | 是 | `YYYY-MM-DD`，用于排序（新的在前）和弹幕前缀 |
| `title` | 是 | 一句话成就，弹幕正文 + 画廊标题 |
| `desc` | 否 | 补充说明，画廊浮层和灯箱里显示 |
| `image` | 否 | 图片文件名（只写名字，不带路径）；**写了才进画廊** |
| `link` | 否 | 相关链接，预留字段 |

```json
[
  { "date": "2026-05-20", "title": "全国大学生信息安全竞赛 一等奖", "desc": "团队赛 Web 方向", "image": "2026-ncis.jpg" },
  { "date": "2026-03-01", "title": "某 CTF 线上赛 排名 12" }
]
```

规则与行为：

- 每条都会飘一条**弹幕**（最多同时 12 条，取最新的），鼠标悬停会暂停
- 带 `image` 的额外进**画廊**：点击开灯箱，`Esc` 关闭，`←`/`→` 切换上下张
- 系统开了「减少动效」时，弹幕自动变成静态标签墙，不滚动
- 现在里面有 3 条**标注了「示例 ·」的假数据 + 2 张占位图**，看到效果后直接替换或删掉，别忘了一起删图片文件
- 图片建议压到 300KB 以内（仓库是静态托管，图太大会拖慢首屏）
- JSON 写坏或文件缺失时，页面会回退成原来那句「菜鸟仍在努力中... 🐣」，不会白屏

## 改样式与改页面

CSS 是三层叠起来的，后面的覆盖前面的：

```
styles.css  →  sidebar.css  →  design-system.css（最后加载，覆盖层）
```

- 新样式一律加在 `css/design-system.css` 里，**按末尾已有的编号分节**归位（1 变量 / 2 归零 / 3 基底 / 4 导航 / 5 侧栏 / 6 卡片 / 7 按钮表单 / 8 首屏 / 9 文章排版 / 10 提示块目录 / 11 响应式 / 12 工具类 / 13 专栏卡片）
- 不要新建第四个 css 文件，也不要在 html 里写大段内联样式
- 六套整点换肤（`js/sidebar.js` 按当前小时切 `theme-*`）、背景插画、星空、Live2D 看板娘、侧栏抽屉、首屏日月、启动终端、文章信息头，这些是站点的原始设计，**改之前先确认**，不要顺手重构

## 本地预览

从**仓库根目录**起一个静态服务器（必须从根起，否则 `../content/`、`../pictures/` 这类相对路径会 404）：

```bash
python -m http.server 8000
# 或者一条命令重建索引再起服务
npm run dev
```

然后打开 http://localhost:8000/ 。

> 本机（Windows）如果 `node` 不在 PATH 里，可以用完整路径：
> `C:\Users\allkeyboard\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe scripts/build-index.js`

## 常见坑

| 现象 | 原因 / 怎么办 |
| --- | --- |
| 新文章线上看不到 | Action 还没跑完，或者根本没触发（它只认 `content/**/*.md` 和 `scripts/build-index.js` 的改动）；去 Actions 页看「Build Index」 |
| 文章页白屏 / 404 | 开头四行格式坏了（前缀要顶格、大写、后跟一个空格）；或 URL 里的 `file` 和真实文件名不一致 |
| 列表日期不对 | 没写 `DATE`，取的是文件修改时间 |
| 图片裂了 | 图片没放进 `pictures/`；或者只提交了 md 里的路径改写、没提交图片 |
| 专栏卡片没出现 | 文件夹里没有 md（空文件夹不算专栏）；或 `series.json` 写坏（脚本会警告，并用文件夹名当标题） |
| 改了 md 页面还是旧的 | 没等 Action / 浏览器缓存，硬刷新 `Ctrl+F5` |
| 中文文件名 | 能用（链接里已做编码），但仍建议英文小写 + 下划线 |

## 发布前清单

- [ ] md 放在正确的 `content/<分类>/` 下（专栏文章放在 `content/<分类>/<专栏名>/`）
- [ ] 开头 `DATE / TAG / SUMMARY / TITLE` 四行格式正确
- [ ] 图片已上传到 `pictures/`，文章里用的是文件名
- [ ] 本地跑过一次 `node scripts/build-index.js`，没有报错
- [ ] push 之后 Actions 里的「Build Index」变绿
- [ ] 打开线上分类页和文章页，确认列表、正文、目录都正常
