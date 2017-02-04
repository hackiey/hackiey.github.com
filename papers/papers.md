---
layout:     post
title:      "论文打卡"
subtitle:   ""
date:       2017-02-02 21:00:00
author:     "Harry"
tags:
    - 论文
---

### 2017.02.04-Differentiable neural computers

[Differentiable neural computers](https://deepmind.com/blog/differentiable-neural-computers/)，这是Hybrid computing using a neural network with dynamic external memory
的简单概括，神经网络在模式识别等问题上有着很好的效果，但是难以进行推理等富有逻辑性的工作，Deepmind发明了一种可微分神经计算机，模仿人类记忆的连接，建立了一个
可随机读取的内存，random access memory(RAM)，且每一个memory与其他memory有一定的联系，当计算某一问题时，会根据输入自动寻找相关的memory以及所连接的memory，实现了伦敦地铁的最短路径查找、家谱识别等带有推理问题的能力。

### 2017.02.03-RL2: Fast Reinforcement Learning Via Slow Reinforcement Learning

这篇文章使用了RNN来作为增强学习的策略表示，RNN在每一个时间t接收(s,a,r,d)(状态，动作，奖励，结束标志),
输出层采用softmax输出actions的概率分布。这种方法减少了大量训练所需的时间和资源。（我对增强学习了解不多，还需要重新阅读这篇文章）

### 2017.02.02-Designing Neural Network Architectures Using Reinforcement Learning

使用Reinforcement learning自动构建卷积神经网络。