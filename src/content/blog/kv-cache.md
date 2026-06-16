---
title: "KV Cache"
description: "KV Cache的一些笔记"
date: 2026-05-02
author: "Harry"
tags:
  - "推理优化"
draft: false
---

# KV Cache 计算
KV Cache是一种利用空间换时间的推理加速方法。Language Model的定义是 $P(x_n|x_{1,...,n-1})$
意味着语言模型每次输入历史所有的token，输出一个当前token。

回顾一下Transformer架构中的Self Attention：
$$
Attention(Q, K, V)=softmax(\frac{Q K^T}{\sqrt{d_k}})V
$$
$$
softmax( \begin{bmatrix} Q_1K_1^T && 0 && 0\\ Q_2K_1^T && Q_2K_2^T && 0 \\ Q_3K_1^T && Q_3K_2^T && Q_3K_3^T \end{bmatrix}, -1) \times \begin{bmatrix} V_1\\ V_2\\ V_3 \end{bmatrix}
$$
从矩阵的分块运算中可以看出来，当计算到 $token_3$ 的时候，前两行是完全不需要计算的，整个计算在 $Q$上只用到了$Q_3$，而$K$和$V$都是完整的（$K_3$和$V_3$还需要计算 ）因此将历史的 $K_1$ $K_2$ $V_1$ $V_2$ 存下来，可以节省大量的计算时间。

现在来计算KV Cache的显存占用，以标准的Transformer架构为例：
$$
memory = 2 \times b \times s \times l \times n_{kv} \times d_{head} \times p
$$
- 2：表示要计算 $K$ 和 $V$ 两个Tensor
- $b$：batch size
- $s$：序列长度
- $l$：模型层数
- $n_{kv}$：注意力头的数量，不同的注意力机制有不同的头数
- $d_{head}$：每个注意力头的维度
- $p$：数据精度，例如FP32、FP16、BF16、FP8等

回顾一下各种注意力机制：
1. MHA，传统的多头注意力机制，$n_{kv}$等于注意力头数$H$
2. MQA中，$K$ 和 $V$被压缩成了一个头，因此 $n_{kv}=1$，KV Cache的显存占用量降低为 $\frac{1}{H}$，但对模型表达能力有较大影响，现在主流模型基本都不用MQA
3. GQA中，$n_{kv}=G$，在 $1$ 和 $H$之间取得一个较好的平衡，将KV Cache显存占用量降低为 $\frac{G}{H}$

以Qwen3.5 27B的模型规格为参考，使用标准的Transformer结构计算一下显存占用率（实际上的Qwen3.5 用了混合注意力机制）， $b=16$，$s=4096$，$l=64$，$d_{head}=128$，$n_{kv}=48$，$p=2$ (FP 16)

- $MHA=2 \times 16 \times 4096 \times 64 \times 48 \times 128 \times 2 = 96G$
- $GQA (G=8) = 2 \times 16 \times 4096 \times 64 \times 8 \times 128 \times 2 = 16G$
- $MQA = 2 \times 16 \times 4096 \times 64 \times 1 \times 128 \times 2 = 2G$

可以看到，KV Cache实际上非常耗显存，尤其是在Agent时代，1M上下文已经是常态，这导致KV Cache占用的显存以及和计算单元之间的数据交换都成为了瓶颈。因此很多模型都在结构上做了各种尝试。

# 现代模型降低KV Cache的方式
### Mimo V2

Mimo V2 使用两个技术降低KV Cache：
1. GQA：对于SWA，Q Heads=64，KV Heads=8，GA部分 Q Heads=64，KV Heads=4
2. 混合滑动窗口注意力：滑动窗口注意力（Slide WIndow Attention，SWA）和全局注意力（Global Window）。Mimo-V2-Flash中，SQA:GA=5:1，SWA的窗口大小为128，每个token只关注过去128个$KV$，而非全序列，因此这部分的KV Cache几乎可以忽略不计。相比于GQA，显存可以降低约6倍。

### DeepSeek V4

Deepseek V4在注意力机制上做了两层压缩，除了最近的128个token使用完整的token级的KV Cache之外，之前的token使用两种形式的压缩：
1. Compressed Sparse Attention(CSA)压缩稀疏注意力：将连续的$m=4$ 个token压缩为一个KV条目，推理时，通过lighting indexer（闪电检索器）检索出top-k个KV，用于选择最相关的$k$个小区域
2. Heavily Compressed Attention(HCA)重度压缩注意力：将连续的$m=128$个token压缩为一个KV条目，HCA的KV条目全部用于token计算，重点在对全局信息的掌控。

除了最初的两层使用HCA，剩余的层交替使用CSA和HCA，整体下来基本上是1:1，相比于DeepSeek V3.2，DeepSeek V4的KV Cache显存占用降低到了10%左右。
