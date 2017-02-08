---
layout:     post
title:      "论文打卡"
subtitle:   ""
date:       2017-02-02 21:00:00
author:     "Harry"
tags:
    - 论文
---

### 2017.02.08-

### 2017.02.07-Learning to learn by gradient descent by gradient descent(!*****)

将使用梯度下降的优化函数描述为一个可以被梯度下降优化的函数。在一些问题上超过了人类手工设计的优化函数。
综合了不同问题领域内不同的优化函数。

### 2017.02.06-Reinforcement Learning Neural Turing Machines - Revised(2015,!)

将reinforcement learning和neural turing machine结合起来学习简单算法。

### 2017.02.05-Learning to Optimize (2016，!*****)

这篇文章提出一个方法用以学习更好的优化算法，并将其描述为一个增强学习问题——任何优化算法都可以被表示为一个策略问题，学习优化算法可以简单
概括为寻找一个最优策略。使用了guided policy search进行训练，奖励机制则为惩罚那些收敛过慢的算法。实验表明自主的优化算法比手工调节
收敛的更快或能达到一个更好的最优值。

### 2017.02.04-Differentiable neural computers(2016)

[Differentiable neural computers](https://deepmind.com/blog/differentiable-neural-computers/)，这是Hybrid computing using a neural network with dynamic external memory
的简单概括，神经网络在模式识别等问题上有着很好的效果，但是难以进行推理等富有逻辑性的工作，Deepmind发明了一种可微分神经计算机，模仿人类记忆的连接，建立了一个
可随机读取的内存，random access memory(RAM)，且每一个memory与其他memory有一定的联系，当计算某一问题时，会根据输入自动寻找相关的memory以及所连接的memory，实现了伦敦地铁的最短路径查找、家谱识别等带有推理问题的能力。

### 2017.02.03-RL2: Fast Reinforcement Learning Via Slow Reinforcement Learning(2016,!)

这篇文章使用了RNN来作为增强学习的策略表示，RNN在每一个时间t接收(s,a,r,d)(状态，动作，奖励，结束标志),
输出层采用softmax输出actions的概率分布。这种方法减少了大量训练所需的时间和资源。（我对增强学习了解不多，还需要重新阅读这篇文章）

### 2017.02.02-Designing Neural Network Architectures Using Reinforcement Learning(2016,!)

使用Reinforcement learning自动构建卷积神经网络。