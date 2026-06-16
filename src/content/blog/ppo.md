---
title: "PPO"
description: "PPO训练LLM的一些理解"
date: 2023-03-10
author: "Harry"
tags:
  - "rl"
draft: false
---

## **Reward Model在句子结尾才打分，怎么指导中间token的训练呢**

这个问题要解决的是怎么将最后一个token的reward反映到之前每一个token中。

在LLM的训练中，$t$ 代表第 $t$ 个要生成的token
$$
\mathcal{L}_{actor}(\pi_\theta) = -\mathbb{E}_t[min(ratio_t\hat{A}_t, clip(ratio_t, 1-\epsilon, 1+\epsilon)\hat{A}_t)]
$$
$$
ratio_t=\frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{old}}(a_t|s_t)}
$$
在actor的loss中，我们只需要关心优化方向——广义优势函数 $A_t$，如果 $\hat{A}_t>0$，那就多朝这个方向训练，如果 $\hat{A}_t<0$，就远离这个方向。它的物理含义是，**我此次生成的这个token（$a_t$）到底是好还是坏**。

PPO有两个模型，一个Actor，一个Critic。Actor用来生成句子，Critic用于给句子打分，和Reward Model不同的是，**Critic能给半个句子打分**。

**Critic的任务是预测从当前Token开始，一直到句子结束，最终能拿到多少预期奖励。它的输出是** $V(s_t)$。

有了能给半个句子打分的Critic，那么t时刻的优化方向就有了。
$$
\delta_t=r_t+V(s_{t+1})-V(s_t)
$$
$\delta_t$的学名叫做时序差分误差 (TD Error)，通俗的名字叫“意外惊喜”。这个公式的直觉解释是：

**惊喜 = (我刚刚拿到的即时奖励 + 我觉得下一步之后能拿到的分) - 我原本觉得现在能拿到的分**

在中间token里，即时奖励 $r_t$ 只是KL散度的惩罚，暂时先忽略它。

例如 $s_t$ = 天空很， $a_t$=蓝， $s_{t+1}$ = 天空很蓝。

那么 “$a_t$=蓝” 到底是好还是坏呢，计算 $\delta_t = V(”天空很蓝”) - V("天空很")$ 是不是大于0就可以了。

听起来Actor的训练好像不需要最终的reward $r_T$ 呀，只需要Critic就够了？

当然不是！

我们只算出了**一步**的TD Error，真正的 $\hat{A}_t$ 不止看一步，而是要看未来很多步。

**如果只看一步**（只看一步真实奖励，剩下的靠Critic猜）：
$$
\hat{A}_t^{(1)}=r_t+ \gamma V(s_{t+1})-V(s_t)=\delta_t
$$
**这样虽然方差小（稳定），但是偏差很大（Critic也没那么准！）。**

在这里解释一下 $\gamma$，$\gamma$的物理含义是“模型对**未来奖励**的重视程度。它定义了什么是**好的回报**。” 通常 $\gamma=0.99$。（为什么 $\gamma$ 不取1，这个问题之后另外解释，现在我们只需要知道取一个小于1的值，能够帮助我们更稳定的训练LLM）

**那么再多看一步呢**（看两步真实奖励，剩下的靠Critic猜）：
$$
\begin{aligned} \hat{A}_t^{(2)} &= r_t + \gamma r_{t+1} + \gamma^2V(s_{t+2})-V(s_{t}) \\&= \underbrace{(r_t + \gamma V(s_{t+1}) - V(s_t))}_{\delta_t} + \gamma \underbrace{(r_{t+1} + \gamma V(s_{t+2}) - V(s_{t+1}))}_{\delta_{t+1}} \\ &= \delta_t + \gamma \delta_{t+1} \end{aligned}
$$
**继续看** $k$ **步**
$$
\hat{A}_t^{(k)} = \sum_{l=0}^{l=k} \gamma^l\delta_{t+l}
$$
当 $k \to \infty$ 时，偏差会小，但因为序列太长，随机性积累太多，会导致方差很大。为了平衡只看一步和看所有步的偏差、方差问题，广义优势函数引入了 $\lambda$ 参数：
$$
\hat{A}_t^{(k)}=\sum_{l=0}^{l=k}(\gamma\lambda)^l\delta_{t+1}
$$
为啥有了 $\gamma$ 还要有个 $\lambda$？

虽然 $\gamma$ 和 $\lambda$ 总是成对出现，而且看上去功能一样，但是他们的物理含义完全不一样：

$\gamma$ **(Discount Factor)**决定了**我们要看多远**（定义了目标），究竟是关注长远利益，还是当前利益。

$\lambda$ **(GAE Parameter)** 决定了**我们要怎么算**（定义了估算方法），究竟是信赖真实的reward，还是信赖Critic的估算。

总之，现在我们有了优势函数的计算，就可以计算每一步token的优化方向了。

## Reward Model给整个句子打分，那Critic是怎么做到可以为半个句子打分，它是怎么训练的？

我们首先看看Critic的输入输出，它接收一个token序列（通常是Prompt+当前生成的token序列），输出一个标量，这个标量代表**从现在起对未来预期总收益的估计。**

回顾一下PPO的整个训练过程：

1. 采样 （Rollout）
    - Actor根据prompt生成response。
    - Critic对response每一个token计算 $V_{old}(s_t)$
2. 计算奖励
    - Reward Model对整个response进行打分得到 $r_T$
    - 计算每一步的KL散度奖励 $r_t$，避免Actor距离Reference Model过远
3. 计算优势 $A_t$
4. 模型更新，将采样阶段获得的数据分成多个mini-batch，对Actor和Critic进行多次更新。

从这个过程中可以看到，奖励($r_t$ 、$r_T$)、优势($A_t$)、Value估计($V_{old}(s_t)$)这些数据在一次rollout采样后都是固定的，而模型会多次动态更新。

现在再回过头来看Critic的训练，Critic的输出既然是一个标量，那么优化就是一个标准的回归问题，loss很自然地使用MSE loss：
$$
\mathcal{L}_{critic}(\pi_{\phi})=-\frac{1}{2}\mathbb{E}_t(V_\phi(s_t)-V_t^{target})^2
$$
$V_t^{target}$是Critic预测的ground truth。那么怎么得到这个ground truth呢？对于 $s_t$，已经有了采样时的预测 $V_{old}(s_t)$，那么只要知道跟真实情况差了多少，把这部分加上就好了！这不正好就是 $A_t$ 的定义：用于评估当前状态下Critic的预测到底是变好了还是变差了。
$$
V_t^{target} = A_t+V_{old}(s_t)
$$
和Actor计算 $A_t$ 的部分一样，我们首先定义TD Error $\delta_t$ 的计算：
$$
\delta_t = r_t + \gamma V_{old}(s_{t+1}) - V_{old}(s_t)
$$
**等等！用一个还没训练好的网络 $V(s_{t+1})$ 去指导它自己 $V(s_t)$，这不是”左脚踩右脚“上天吗？这怎么能训练得准呢？**

这是强化学习中反直觉、但也是很精妙的一个概念：**自举（bootstrapping）**

答案是：虽然用到了Critic自己的预测，但也在其中加入了真实的奖励

我们看这样一个例子：预测开车回家的时间

一开始还未出发时($s_0$)你预计自己要60分钟到家( $V(s_0)=60$ )，开了10分钟到达一个红绿灯($s_1$)后，你感觉路上不是很堵，于是预计自己还有45分钟要到家( $r_0=10$，$V(s_1)=45$)。

问题来了，怎么修正你在 $s_0$ 时的预期呢？

**方法一：**一直开到家看看真实花费的时间52分钟，再告诉自己出发时的60分钟错了，要减少预测的时间。这种方法就是蒙特卡洛方法，走完一遍全程再修正自己的预测，缺点就是实在太慢了，而且中间有突发状况时也会增加很多的不确定性。

**方法二：**不需要开到家，在$s_1$时刻就可以更新$s_0$时的判断：10+45=55分钟。由于45分钟是在已经开了10分钟之后做出的估计，离家更近了因此预测的也会更精准。

这里的核心逻辑是：虽然$V(s_1)$=45仍然是个预测，它可能不准确，但 $r_0+V(s_1)$ 一定比 $V(s_0)$更准，因为 $r_0=10$ 是事实！我们用一段”已发生的事实“替换掉了一段纯猜测，从而减少了不确定性。

换一个角度来思考：**Critic的目标不是去追求绝对的真理**，他的目标是 $r_t + V(s_{t+1})$，强迫神经网络消除这一步和下一步的矛盾。一开始Critic会在句子结尾（更靠近完整奖励的地方）消除这种不确定性，随后逐渐传播到句子开头。**当Critic在每一步的预测都消除了这种不确定性后，Critic自然会收敛到真实的Value估计。**

现在我们知道了TD Error这种训练目标的合理性，再把它套回广义优势函数的估计方法中去，就可以得到Critic的训练目标了，这样Critic也就只通过最终的reward，而能为半个句子打分。
$$
A_t^{GAE} = \delta_t + (\gamma \lambda) \delta_{t+1} + (\gamma \lambda)^2 \delta_{t+2} + \dots
$$
$$
A_t^{GAE} = \sum_{k=0}^{\infty} (\gamma \lambda)^k \delta_{t+k}
$$
