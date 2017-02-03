---
layout:     post
title:      "论文打卡"
subtitle:   ""
date:       2017-02-02 21:00:00
author:     "Harry"
tags:
    - 论文
---

### 2017.02.03-RL2: Fast Reinforcement Learning Via Slow Reinforcement Learning

这篇文章使用了RNN来作为增强学习的策略表示，RNN在每一个时间t接收(s,a,r,d)(状态，动作，奖励，结束标志),
输出层采用softmax输出actions的概率分布。这种方法减少了大量训练所需的时间和资源。（我对增强学习了解不多，还需要重新阅读这篇文章）

### 2017.02.02-Designing Neural Network Architectures Using Reinforcement Learning

使用Reinforcement learning自动构建卷积神经网络。