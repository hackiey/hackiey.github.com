---
layout:     post
title:      "人工神经网络（多层网络和BP算法）（一）"
subtitle:   ""
date:       2016-05-19 00:00:00
header-img: img/in-post/ann/ann2.jpg
author:     "Harry"
tags:
    - 机器学习
    - 人工神经网络
---

现在我们了解了感知器和线性单元这两个基本单元，也用它们学习了一些基本的函数，但是单个单元的学习能力是有限的，为了解决更多的实际问题，研究人员提出了多层网络。

### 可微阈值单元

首先要说明的是梯度下降算法是一个非常实用的算法，它有效地保证了我们能够在误差最小的地方收敛，因此我们需要选择一个能够配合梯度下降且能够表示非线性函数的网络的基本单元。感知器的函数输出不连续，因此它不可微，不适用于梯度下降，而多个线性单元的组合也只能表示线性函数，因此也不适合。我们需要一个这样的单元：

> 它的输出是输入的非线性函数，并且输出是输入的可微函数。一种答案是sigmoid单元(双曲正切函数tanh也可满足)，这是一种非常类似于感知器的单元，但它基于一个平滑的可谓阈值函数。

![sigmoid函数图像](/img/in-post/ann/multi-networks-and-BP/sigmoid.png)

下面是sigmoid函数的公式：

$$\sigma(y)={1\over {1+e^{-y}}} \tag 1$$

根据图像可以看出，sigmoid函数可以把非常的输入值映射到(-1,1)的输出，它经常被称为sigmoid单元的挤压函数(squashing function)。下面是sigmoid单元的图示：

![sigmoid函数图像](/img/in-post/ann/multi-networks-and-BP/ann-sigmoid.png)

根据图示可以看出sigmoid单元的输出为：

$$ o = \sigma (\vec w \cdot \vec x) $$ 

### 反向传播算法

在书中是先介绍了算法后介绍公式的推导，但我认如果能够理解推导过程，那么理解算法也是自然而然的了。因此我会先写下算法的推导过程，之后给出算法描述。

在具体的推导之前先来了解一下多层网络，下图展示了一个典型的三层网络结构，输入层(Input layer)-隐藏层(Hidden layer)-输出层(Output layer)。

![BP网络](/img/in-post/ann/multi-networks-and-BP/back-propagation.png)

为了求每条边线的权值，我们从一个随机的初始权值开始，不断使用梯度下降算法来更新权值，因此我们要求的是$$\Delta w_{ji}$$。

在对多层网络有了一个直观的了解之后，就可以定义各个符号的意义了：

> $$x_{ji}$$ = 单元 j 的第 i 个输入
> 
> $$w_{ji}$$ = 与单元 j 的第 i 个输入相关联的权值
>
> $$net_j=\sum_i w_{ji}x_{ji}$$（单元 j 的输入的集合） 
>
> $$o_j$$ = 单元 j 计算出的输出
>
> $$t_j$$ = 单元 j 的目标输出
>
> $$\sigma = sigmoid$$函数
>
> outputs = 网络最后一层的单元的集合
>
> Downstream( j ) = 单元的直接输入（immediate inputs）中包含单元 j 的输出的单元的集合

（未完待续）