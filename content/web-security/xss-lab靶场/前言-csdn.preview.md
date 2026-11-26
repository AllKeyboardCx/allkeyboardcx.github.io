# xss-lab靶场

## 前言

这是本人第一次作为pwn手开始学习web渗透的xss相关攻击手法，以下均是在做题的时候的个人心得

XSS（跨站脚本攻击，Cross-Site Scripting）是一种常见的 Web 安全漏洞，攻击者通过向网页中注入**恶意脚本代码**，当其他用户访问该页面时，浏览器会执行这些脚本，从而窃取用户的 Cookie、会话令牌、敏感信息，或者伪造用户操作。根据触发方式不同，主要分为反射型（临时构造 URL 诱导点击）、存储型（恶意代码永久保存在服务器，如评论区）和 DOM 型（通过修改前端 JavaScript 动态环境执行）。简单来说，就是网站没对用户输入做充分过滤，让攻击者把“代码”伪装成了“数据”喂给了浏览器。


XSS 本质上是因为**不可信的用户输入被当作代码执行**了，所以它最常出现在所有**接收用户输入并回显到页面**的地方。以下是几个最常见的藏身点：

1. **搜索框**：搜索关键词直接显示在结果页上（如“您搜索的是：xxx”），最容易出现反射型 XSS。
2. **评论区 / 留言板 / 论坛帖子**：用户提交的文字、表情、链接等内容被存储并展示给其他人看，是存储型 XSS 的高发区。
3. **URL 参数**：页面从地址栏取参数（如 `?id=123`）后直接写入页面内容或标签属性（如 `<img src="...">`），反射型和 DOM 型都很常见。
4. **用户头像 / 昵称 / 个人简介**：这些信息通常在多个页面展示（如个人主页、评论区头部），一旦存在漏洞，影响范围很大。
5. **富文本编辑器**：允许加粗、插图片、改字体颜色的地方，攻击者可能通过修改 HTML 源码嵌入 `<script>` 或事件处理器（如 `onerror`）。
6. **JSONP / JSON 接口回调**：如果后端返回的数据直接被 `eval()` 或 `innerHTML` 拼接进页面，也会引入 XSS。
7. **文件上传后的文件名或描述**：某些系统会把文件名直接显示在下载列表里，如果文件名包含 `<script>` 就可能触发。

总结一句话：**凡是“用户能写东西进去，别人能看到的地方”，都可能是 XSS 的窝点。**



1, 第一关
2, 第二关
3, 第三关
4, 第四关
5, 第五关
6, 第六关
7, 第七关
8, 第八关
9, 第九关
10, 第十关
11, 第十一关
12, 第十二关
13, 第十三关
14, 第十四关
15, 第十五关
16, 第十六关
17, 第十七关
18, 第十八关

---

## 第一关

### 目录

- [思考流程](#%E6%80%9D%E8%80%83%E6%B5%81%E7%A8%8B)
- [原理分析：](#%E5%8E%9F%E7%90%86%E5%88%86%E6%9E%90)


### 思考流程

打开页面后发现十分简洁，但是观察url：
`[欢迎来到level1](http://192.168.232.162/xss/level1.php?name=sss)`

![Pasted image 20261125135239](Pasted image 20261125135239.png)

可以发现payload的长度会随着 name 参数中的长度的变化而变化，推测这里存在xss，输入常见的xss代码：`<script>alert("YouHaveBeenHacked")</script>`

![Pasted image 20261125140102](Pasted image 20261125140102.png)

可以发现，成功通过

### 原理分析：

<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level2.php?keyword=test"; 
}
</script>
<title>欢迎来到level1</title>
</head>
<body>
<h1 align=center>欢迎来到level1</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["name"];
echo "<h2 align=center>欢迎用户".$str."</h2>";
?>
<center><img src=level1.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str)."</h3>";
?>
</body>
</html>

我们看一下这个后端的html代码，可以发现其中内嵌了php代码，

```php
$str = $_GET["name"];                 // $str = '<script>alert(1)</script>'
echo "<h2 align=center>欢迎用户".$str."</h2>";  // 直接拼接
```

这里php不对任何用户的输入进行过滤处理，就直接拼接到了html代码上，当浏览器进行解析的时候，就会直接去执行里面的这个\<script> 可执行标签，echo html代码是后端写前端的典型方式，用于更新当前html页面

![Pasted image 20261125141444](Pasted image 20261125141444.png)

![Pasted image 20261125141455](Pasted image 20261125141455.png)

---

## 第二关

### 目录

- [思考流程](#%E6%80%9D%E8%80%83%E6%B5%81%E7%A8%8B)
	- [php中的转义函数](#php%E4%B8%AD%E7%9A%84%E8%BD%AC%E4%B9%89%E5%87%BD%E6%95%B0)
		- [. HTML 实体转义（最常用）](#-html-%E5%AE%9E%E4%BD%93%E8%BD%AC%E4%B9%89%E6%9C%80%E5%B8%B8%E7%94%A8)
		- [2. 去除或转义特殊字符](#2-%E5%8E%BB%E9%99%A4%E6%88%96%E8%BD%AC%E4%B9%89%E7%89%B9%E6%AE%8A%E5%AD%97%E7%AC%A6)
		- [3. 编码转换](#3-%E7%BC%96%E7%A0%81%E8%BD%AC%E6%8D%A2)
		- [4. 数据库转义（防止 SQL 注入，不是 XSS）](#4-%E6%95%B0%E6%8D%AE%E5%BA%93%E8%BD%AC%E4%B9%89%E9%98%B2%E6%AD%A2-sql-%E6%B3%A8%E5%85%A5%E4%B8%8D%E6%98%AF-xss)
		- [怎么判断用了哪个](#%E6%80%8E%E4%B9%88%E5%88%A4%E6%96%AD%E7%94%A8%E4%BA%86%E5%93%AA%E4%B8%AA)


### 思考流程

![Pasted image 20261125141544](Pasted image 20261125141544.png)

可以看到这里有两个参数，先试试这个keyword存不存在 xss

![Pasted image 20261125141652](Pasted image 20261125141652.png)

可以发现这里并不能执行，感觉是被后端转译或者清洗了，

![Pasted image 20261125141832](Pasted image 20261125141832.png)

我们尝试带上两个双引号，发现这里前端被污染了！看来感觉还是存在xss的，只是需要一些处理

![Pasted image 20261125142105](Pasted image 20261125142105.png)

![Pasted image 20261125142134](Pasted image 20261125142134.png)

通过查看源代码，可以发现，这里我们用双引号是可以截断的，但是和这道题关系不大（后来证明当时思考错了，还是有关系的），由于我们输入的代码被转义了，先来了解一下php中会有哪些转义函数

#### php中的转义函数

##### . HTML 实体转义（最常用）

|函数|作用|示例|
|---|---|---|
|`htmlspecialchars()`|转义 `&` `"` `'` `<` `>` 五个特殊字符|`<` → `&lt;`|
|`htmlentities()`|转义所有 HTML 实体，包括中文等|`©` → `&copy;`|

**区别**：`htmlspecialchars` 只转义最基本的五个，`htmlentities` 转义范围更广。做 XSS 防御一般用 `htmlspecialchars` 就够了。

---

##### 2. 去除或转义特殊字符

|函数|作用|示例|
|---|---|---|
|`strip_tags()`|直接删除所有 HTML/PHP 标签|`<script>alert(1)</script>` → `alert(1)`|
|`addslashes()`|转义引号和反斜杠|`"` → `\"`，`'` → `\'`|
|`stripslashes()`|去掉 `addslashes` 加的斜杠|`\"` → `"`|

---

##### 3. 编码转换

|函数|作用|
|---|---|
|`urlencode()`|URL 编码，空格变 `+`，特殊字符变 `%xx`|
|`urldecode()`|URL 解码还原|
|`base64_encode()` / `base64_decode()`|Base64 编解码|

---

##### 4. 数据库转义（防止 SQL 注入，不是 XSS）

|函数|说明|
|---|---|
|`mysqli_real_escape_string()`|MySQL 专用转义|
|`PDO::quote()`|PDO 方式转义|

这些防的是 SQL 注入，**不能防 XSS**。

##### 怎么判断用了哪个

你可以在页面源代码里观察你的输入变成了什么样：

|源代码中显示|大概率用了|
|---|---|
|`&lt;script&gt;`|`htmlspecialchars()`|
|标签直接消失|`strip_tags()`|
|`\<script\>`|`addslashes()`|
|`%3Cscript%3E`|`urlencode()`|
所以可以判断是通过 htmlspecialchars进行了转义的，使用 `"><script>alert(1)</script>` 即可闭合：

<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level3.php?writing=wait"; 
}
</script>
<title>欢迎来到level2</title>
</head>
<body>
<h1 align=center>欢迎来到level2</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["keyword"];
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form action=level2.php method=GET>
<input name=keyword  value="'.$str.'">
<input type=submit name=submit value="搜索"/>
</form>
</center>';
?>
<center><img src=level2.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str)."</h3>";
?>
</body>
</html>



虽然在  `<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>` 里不会被执行，但是在 `<input name=keyword  value="'.$str.'">` 里是可以被执行的，让其括号闭合后就能成功xss

---

## 第三关

### 目录

- [原理：](#%E5%8E%9F%E7%90%86)


### 思考流程

![Pasted image 20261125143725](Pasted image 20261125143725.png)

可以看到xss的位置还是十分明显，同样还是对我们的输入执行了过滤了，同样也是使用的htmlspecialchars进行了过滤  
`<input name=keyword value='&lt;script&gt;alert(45)&lt;/script&gt;'>`

![Pasted image 20261125143801](Pasted image 20261125143801.png)

一样的还是试试闭合括号，`'><script>alert(5)</alert>`，发现这里是单引号，并且已经不管用了，对比之前发现就连 value 这里的也被转义了

![Pasted image 20261125144119](Pasted image 20261125144119.png)

这里可以用到html事件属性：`'onclick='javascript:alert(1)`，这样就能绕过尖括号的htmlspecialchars方法，这个攻击手段对第二关也适用

### 原理：

<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level4.php?keyword=try harder!"; 
}
</script>
<title>欢迎来到level3</title>
</head>
<body>
<h1 align=center>欢迎来到level3</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["keyword"];
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>"."<center>
<form action=level3.php method=GET>
<input name=keyword  value='".htmlspecialchars($str)."'>
<input type=submit name=submit value=搜索 />
</form>
</center>";
?>
<center><img src=level3.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str)."</h3>";
?>
</body>
</html>

针对诸如 ：`<input name=keyword  value='".htmlspecialchars($str)."'>`，这类的过滤方法，我们输入 `'onclick='javascript:alert(1)` 时，会变成：
`<input name=keyword  value=''onclick='javascript:alert(1)'>`，这样再解析的时候，就会因为前面的括号闭合，导致变成：
`<input name=keyword  value='' onclick='javascript:alert(1)'>`，
这时候input元素就成了这样，只要再点一下这个输入框，就会触发这个事件

---

## 第四关

### 思考流程

![Pasted image 20261125145153](Pasted image 20261125145153.png)

发现这里十分邪恶地把我们的输入的尖括号全部都搞没了，试试另外一个

![Pasted image 20261125145342](Pasted image 20261125145342.png)

然后再点一下输入框就能成功执行xss了

---

## 第五关

### 目录

- [思考流程](#%E6%80%9D%E8%80%83%E6%B5%81%E7%A8%8B)
- [原理解释](#%E5%8E%9F%E7%90%86%E8%A7%A3%E9%87%8A)

### 思考流程

![Pasted image 20261125145624](Pasted image 20261125145624.png)

这题有点奇怪，会篡改我们的输入

![Pasted image 20261125145723](Pasted image 20261125145723.png)

并且是递归处理的，但是不会对 \</script> 进行替换处理

![Pasted image 20261125145804](Pasted image 20261125145804.png)

另一种途径也被处理了

所以我们不能出现这些关键字，`"><a href=javascript:alert(1)>xss</a>`，使用这个攻击代码，就能避免出现onclick和script关键字，

### 原理解释

`"><a href=javascript:alert(1)>xss</a>`，这里闭合了前面的括号，然后生成了一条链接，这样我们点击这个链接就能执行xss，

最终网页会渲染出这样的：
`<input name=keyword value=""><a href=javascript:alert(1)>xss</a>">`

<input name=keyword value=""><a href=javascript:alert(1)>xss</a>">

---

## 第六关

### 思考流程

![Pasted image 20261125150404](Pasted image 20261125150404.png)

我们所有已知已学会的途径都被堵死了，

![Pasted image 20261125150441](Pasted image 20261125150441.png)

但是我们知道html对标签名和属性名不敏感，所以，换成大写的就能绕过了

---

## 第七关

![Pasted image 20261125150558](Pasted image 20261125150558.png)

这道题直接把我们的属性给删掉了，

![Pasted image 20261125150837](Pasted image 20261125150837.png)

![Pasted image 20261125150636](Pasted image 20261125150636.png)

可以发现现在是直接删掉全部，并且大小写变换也没用了，我们可以试试双写绕过

`"oonnclick='javascript:alert(1)'`，由于后端只删除一次，而剩下的就不会再去检查是否还构成危险字符，所以可以绕过

### 原理

<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level8.php?keyword=nice try!"; 
}
</script>
<title>欢迎来到level7</title>
</head>
<body>
<h1 align=center>欢迎来到level7</h1>
<?php 
ini_set("display_errors", 0);
$str =strtolower( $_GET["keyword"]);
$str2=str_replace("script","",$str);
$str3=str_replace("on","",$str2);
$str4=str_replace("src","",$str3);
$str5=str_replace("data","",$str4);
$str6=str_replace("href","",$str5);
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form action=level7.php method=GET>
<input name=keyword  value="'.$str6.'">
<input type=submit name=submit value=搜索 />
</form>
</center>';
?>
<center><img src=level7.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str6)."</h3>";
?>
</body>
</html>

可以看到后端用的 `str_replace`，没有递归清洗

---

## 第八关

### 思考流程

![Pasted image 20261125151238](Pasted image 20261125151238.png)

![Pasted image 20261125151245](Pasted image 20261125151245.png)

会将我们的输入作为网页路径进行访问

![Pasted image 20261125151448](Pasted image 20261125151448.png)

观察网址特征，输入这个再点击友情链接就能直接到第九关了？？？？

好像是非预期解，我们来试试用xss来通关

![Pasted image 20261125151622](Pasted image 20261125151622.png)

我们的输入直接被放到href了！，试试javascript:alert，发现我们的ri被替换成了r_i，所以要对ri进行编码

![Pasted image 20261125151732](Pasted image 20261125151732.png)

`javasc&#114;&#105;pt:alert(1)`

这里的 &#114; 是 HTML 的实体编码格式，里面的数字是 ASCII 码， 114对应s

---

## 第九关

### 思考流程

![Pasted image 20261126183014](Pasted image 20261126183014.png)

可以发现，我们是尖括号被转义了，并且有href，试试javascript

![Pasted image 20261126183216](Pasted image 20261126183216.png)

一直说链接不合法我们也不知道什么才叫合法，继续试

![Pasted image 20261126183249](Pasted image 20261126183249.png)

这个通过了，说明得http开头

![Pasted image 20261126183401](Pasted image 20261126183401.png)

现在被转义了，没事，继续试，一开始我们的思路是闭合前面的引号，然后跳转到我们后面的这个xss

javasc&#114;&#105;pt:alert(1)//http://，但是后面发现这个函数只是检查有没有含有 http:\//即可，我们只需要让构造的字符串包含这个就行了，

![Pasted image 20261126184029](Pasted image 20261126184029.png)

### 原理详解

<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level10.php?keyword=well done!"; 
}
</script>
<title>欢迎来到level9</title>
</head>
<body>
<h1 align=center>欢迎来到level9</h1>
<?php 
ini_set("display_errors", 0);
$str = strtolower($_GET["keyword"]);
$str2=str_replace("script","scr_ipt",$str);
$str3=str_replace("on","o_n",$str2);
$str4=str_replace("src","sr_c",$str3);
$str5=str_replace("data","da_ta",$str4);
$str6=str_replace("href","hr_ef",$str5);
$str7=str_replace('"','&quot',$str6);
echo '<center>
<form action=level9.php method=GET>
<input name=keyword  value="'.htmlspecialchars($str).'">
<input type=submit name=submit value=添加友情链接 />
</form>
</center>';
?>
<?php
if(false===strpos($str7,'http://'))
{
  echo '<center><BR><a href="您的链接不合法？有没有！">友情链接</a></center>';
        }
else
{
  echo '<center><BR><a href="'.$str7.'">友情链接</a></center>';
}
?>
<center><img src=level9.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str7)."</h3>";
?>
</body>
</html>

`strpos` 可以发现程序中用了这个函数来检查我们的输入中是否包含` http://`

而我们再用 `//` 注释化后面的http就能正常跳转了

---

## 第十关

### 思考流程

![Pasted image 20261126184343](Pasted image 20261126184343.png)

上面的 get 参数能传递xss

![Pasted image 20261126184422](Pasted image 20261126184422.png)

这里的一些input被隐藏了，所以我们直接通过url传参：

![Pasted image 20261126192838](Pasted image 20261126192838.png)

传参下来后，发现只有 `t_sort` 能够进行传参

![Pasted image 20261126193001](Pasted image 20261126193001.png)

可以发现我们传参的值被过滤了，尖括号都被删除了

![Pasted image 20261126193117](Pasted image 20261126193117.png)

`javascript\:alert` 是没问题的，但是我们没有可以点击与之交互的组件，先创建一个：

`http://192.168.232.162/xss/level10.php?t_sort=%22onclick=%27javascript:alert(5)%27%20type=button%3E//`

这样就能闭合前面的引号，并修改type为button，这样就会出现一个按钮，我们点击它就好了

![Pasted image 20261126193426](Pasted image 20261126193426.png)


### 原理详解

<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level11.php?keyword=good job!"; 
}
</script>
<title>欢迎来到level10</title>
</head>
<body>
<h1 align=center>欢迎来到level10</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["keyword"];
$str11 = $_GET["t_sort"];
$str22=str_replace(">","",$str11);
$str33=str_replace("<","",$str22);
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form id=search>
<input name="t_link"  value="'.'" type="hidden">
<input name="t_history"  value="'.'" type="hidden">
<input name="t_sort"  value="'.$str33.'" type="hidden">
</form>
</center>';
?>
<center><img src=level10.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str)."</h3>";
?>
</body>
</html>


如上 php  源代码所示

---

## 第十一关

### 思考流程

![Pasted image 20261126193654](Pasted image 20261126193654.png)

可以看到这道题也是只有 `t_sort` 能传参，

`http://192.168.232.162/xss/level11.php?t_sort=1" onclick='javascript:alert(1)' type=button>  "`, 这样试试，

![Pasted image 20261126194445](Pasted image 20261126194445.png)

发现我们一直被一个双引号括起来的，感觉应该是被函数转义了，这条路走不通，
![Pasted image 20261126194643](Pasted image 20261126194643.png)

发现从上一关来到这里后，t_ref被赋值为我们第十关输入的payload了，推测应该是有传参的，referer是 HTTP 请求头 中 的一个字段，记录了我们从哪个页面跳转过来

用hackbar抓包重放，修改我们的referer为 ： 
`1" onclick='javascript:alert(45)' type=button> //`
即可执行xss

![Pasted image 20261126194905](Pasted image 20261126194905.png)

![Pasted image 20261126194949](Pasted image 20261126194949.png)

这样即可。注意图片中应该是onclick 而不是 onlick，这里是笔者笔误

<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level12.php?keyword=good job!"; 
}
</script>
<title>欢迎来到level11</title>
</head>
<body>
<h1 align=center>欢迎来到level11</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["keyword"];
$str00 = $_GET["t_sort"];
$str11=$_SERVER['HTTP_REFERER'];
$str22=str_replace(">","",$str11);
$str33=str_replace("<","",$str22);
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form id=search>
<input name="t_link"  value="'.'" type="hidden">
<input name="t_history"  value="'.'" type="hidden">
<input name="t_sort"  value="'.htmlspecialchars($str00).'" type="hidden">
<input name="t_ref"  value="'.$str33.'" type="hidden">
</form>
</center>';
?>
<center><img src=level11.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str)."</h3>";
?>
</body>
</html>

---

## 第十二关

### 思考流程

![Pasted image 20261126195929](Pasted image 20261126195929.png)

这道题可以发现我们有个 t_ua 变量，而且值是我们的UA，推测可以修改UA来达到执行xss的目的

`1" onclick='javascript:alert(1)' type=button > //`

这一关旨在让我们明白各种注入点

---

## 第十三关

### 思考流程

![Pasted image 20261126200418](Pasted image 20261126200418.png)

推测cookie，`1" onclick='javascript:alert(1)' type=button > //`

![Pasted image 20261126200641](Pasted image 20261126200641.png)

被拦截了，修改type为text试试
也还是不行，发现cookie的格式是：
`user=call+me+maybe%3F; BkGOp9578O_think_template=default`，结合在源代码里看到的，或许我们只能修改user后的值，

`user=1" onclick='javascript:alert(1)' type=text > //; BkGOp9578O_think_template=default`

这里text或者button都可以

---

## 第十四关

### 思考流程

![Pasted image 20261126201133](Pasted image 20261126201133.png)

这关修改cookie是没用的，

![Pasted image 20261126201154](Pasted image 20261126201154.png)

观察源代码发现这里能进入第十五关，但是直接点进去是不行的

发现这里网页似乎会加载一个网址，但是没加载成功，上网搜之后发现在中国境内这个第十四关几乎不可能通关，除非挂梯子

说一下这关本来的原理：

这一关是经典的 EXIF 元数据注入（存储型 XSS），网页用iframe 嵌入了一个 EXIF 信息查看器，把XSS代码写进图片的EXIF元数据里，上传后，exif_read_data 会读取图片的EXIF信息，并直接回显到页面，未做转义，回显时就会触发弹窗

直接跳到 第十五关：

[欢迎来到level15](http://192.168.232.162/xss/level15.php)

---

## 第十五关

### 思考流程

![Pasted image 20261126201944](Pasted image 20261126201944.png)

观察到一个不同寻常的组件，经过搜索后：

这个ng-include是前端框架AngularJS的一个指令，用于动态包含/加载外部的HTML模版文件

我们这里通过包含第一关的php后，由于第一关接收name参数，这里我们修改成一个img组件，由于src后的x我们服务器肯定是没有的，就会出错，onerrer指定出错后的动作，我们指定为弹窗，就能成功注入xss了

`?src='level1.php?name=<img src=x onerror=alert(1)>'`，

![Pasted image 20261126202533](Pasted image 20261126202533.png)

---

## 第十六关

### 思考流程

![Pasted image 20261126202715](Pasted image 20261126202715.png)

如法炮制，发现被转义了，但是在html里，换行是可以替代空格的，使用URL编码将回车符转换为 %0d 或 (%0a)替代即可

`?keyword=<img%dsrc=x onerror=alert(5)>`

![Pasted image 20261126202946](Pasted image 20261126202946.png)

---

## 第十七关

### 思考流程

embed 支持鼠标事件（Chrome 下 onmouseover/onclick 能触发）

一样对空格进行 %0d 的替换后，将鼠标移动到 embed 区域上即可

`?arg01=a&arg02=b onmouseover=alert(1)`

![Pasted image 20261126203407](Pasted image 20261126203407.png)

---

## 第十八关

### 思考流程

和第十七关一致
