

DATE 2026-07-04

TITLE  Buuctf堆利用专项训练（概念理论向）

SUMMARY 入门&熟悉基础堆漏洞，fastbin、tcache基础利用，unsorted bin&libc泄露，劫持钩子&one gadget

TAG heap理论



## 第一阶段：入门 & 熟悉基础堆漏洞

这个阶段的目标是理解**堆块结构、free 后的变化、UAF 的基本利用**。

| 题目名称（关键词）             | 核心知识点           | 为什么适合                      |
| --------------------- | --------------- | -------------------------- |
| **hitcon2014_stkof**  | 堆溢出、unlink（经典版） | 最经典的 unlink 入门，理解 fd/bk 伪造 |
| **0ctf2015_freenote** | UAF、堆指针数组       | 理解释放后指针未清空的危害              |
| **hacknote**          | UAF、打印函数指针劫持    | 小而美的 UAF 利用，控制函数指针         |
| **babyfengshui_2016** | 堆溢出、结构体指针覆盖     | 实战风格，通过溢出改指针实现任意写          |

**做完后你应该能：**

- 手动分析堆块 metadata（size、prev_size、fd/bk）
  
- 理解 unlink 如何实现任意地址写
  
- 利用 UAF 修改函数指针
  

---

## 第二阶段：fastbin & tcache 基础利用

学习 fastbin 和 tcache 的单链表特性，掌握最主流的攻击方式。

|题目名称（关键词）|核心知识点|注意点|
|---|---|---|
|**zctf2016_note2**|fastbin dup、double free|理解 fastbin 如何通过双重释放实现任意分配|
|**wdb_2018_3rd_soEasy**|tcache dup|tcache 版本（2.26+），比 fastbin 更简单|
|**ciscn_2019_en_2**|tcache poisoning|伪造 fd 指针，分配到任意地址|
|**hitcon_2018_children_tcache**|tcache + UAF 组合|综合题，需要泄露地址 + tcache 攻击|

**做完后你应该能：**

- 区分 fastbin 和 tcache 的链表差异
  
- 用 double free 实现任意地址分配
  
- 结合信息泄露完成 tcache poisoning
  

---

## 第三阶段：unsorted bin & libc 泄露

学会利用 unsorted bin 泄露 libc 基址，这是大多数堆题绕不开的步骤。

|题目名称（关键词）|核心知识点|特点|
|---|---|---|
|**hctf2016_fheap**|unsorted bin 泄露 libc|通过 UAF 读 fd 指针得到 main_arena 地址|
|**gyctf_2020_force**|House of Force|利用 top chunk 大小溢出，任意分配|
|**suctf_2018_basic**|unsorted bin + fastbin 组合|先泄露 libc，再打 __malloc_hook|
|**pwnable_hacknote**（加强版）|多种手法结合|不是简单版，需要组合 unsorted bin 和 fastbin|

**做完后你应该能：**

- 让堆块进入 unsorted bin 并读出 fd 指针
  
- 根据偏移计算 libc 基址和 system、__malloc_hook 等地址
  
- 理解 main_arena 与 libc 的固定偏移
  

---

## 第四阶段：劫持钩子 & one gadget

学习最终获得 shell 的常见方式：覆盖 __malloc_hook / __free_hook。

|题目名称（关键词）|核心知识点|备注|
|---|---|---|
|**vnd_2018_easy**|fastbin attack + __malloc_hook|经典流程：泄露→分配→改钩子→触发|
|**asis2016_b00ks**|UAF + 任意地址读/写|复杂一点，需要伪造结构体|
|**ciscn_2019_s_3**（堆部分）|tcache + __free_hook|配合栈迁移或 ROP，比较综合|
|**bctf2016_bcloud**|House of Spirit + 钩子劫持|难度稍高，但思路巧妙|

**做完后你应该能：**

- 用 one_gadget 直接 getshell
  
- 理解 __malloc_hook 附近找 fake chunk 的技巧（realloc 调整栈）
  
- 区分 __malloc_hook 和 __free_hook 的触发时机
  

---

## 第五阶段：高版本 & 绕过 safe linking（可选进阶）

如果用的 BUUCTF 环境 glibc 版本较新（2.30+），会遇到 safe linking（fd 异或加密）。

|题目名称（关键词）|核心知识点|
|---|---|
|**glibc_2.31_house_of_pig**|safe linking 绕过 + IO_FILE|
|**2021_西湖论剑_杨超越**|tcache + safe linking 泄露堆地址|
|***ctf2021_garbage**|高版本堆利用综合|

> 注意：BUUCTF 上部分题目可能仍是 2.23/2.27，safe linking 题目较少，可以先用低版本打基础。

---

## 推荐的刷题路线图（顺序版）

第一阶段（2-3题）：
hitcon2014_stkof → hacknote → 0ctf2015_freenote
第二阶段（3-4题）：
zctf2016_note2 → wdb_2018_3rd_soEasy → ciscn_2019_en_2 → hitcon_2018_children_tcache
第三阶段（2-3题）：
hctf2016_fheap → suctf_2018_basic → gyctf_2020_force
第四阶段（2-3题）：
vnd_2018_easy → asis2016_b00ks → ciscn_2019_s_3
第五阶段（可选）：
根据遇到的版本再找对应新题

---

## 额外建议

1. **调试是关键**：每个题都用 gdb + pwndbg/peda 动态调试，看堆块布局变化（`heap`, `bins`, `tcache` 命令）。
   
2. **写 exp 模板**：积累自己的 Python 模板（含 malloc、free、show、edit 的封装）。
   
3. **看完 writeup 要重做**：不要直接抄，理解了之后关掉 writeup 自己重写 exp。
   
4. **关注 libc 版本**：在 BUUCTF 启动题目时，用 `ldd` 或 `strings` 查看 libc 版本，不同版本手法不同。
