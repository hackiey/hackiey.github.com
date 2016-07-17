---
layout:     post
title:      "梯度下降"
subtitle:   ""
date:       2016-07-17 00:00:00
header-img: img/in-post/ann/ann2.jpg
author:     "Harry"
tags:
    - 机器学习
---

梯度下降是一个最优化算法，通过迭代的方式寻找代价函数的最小值，梯度下降是一个非常常用的算法，不仅仅可以应用在线性回归问题中，还被广泛应用于机器学习中的众多领域，

### 基本思想

定义$$J(\theta_0,\theta_1)={1\over 2m}\sum_{i=1}^m(h_\theta(x^{(i)}) - y^{(i)})^2 $$

目标： $$min_{\theta_0,\theta_1}J(\theta_0,\theta_1)$$

到目前为止，我们仍然只使用了一个变量x，所以代价函数的变量只有$$\theta_0（截距项）和\theta_1$$，$$min_{\theta_0,\theta_1}J(\theta_0,\theta_1)$$指的是选择合适的$$\theta_0和\theta_1$$使得$$J(\theta_0,\theta_1)$$取得最小值。

在[线性回归](/2016/07/16/linear-regression)中的末尾为了简化，我们设$$\theta_0$$为0，画出了$$J关于\theta_1$$的图像，是一个一元二次函数的图像，现在将$$\theta_0$$加入进来，画一幅二元二次图像。

> 图片来自coursera的机器学习课程梯度下降部分的视频中（[视频连接](https://www.coursera.org/learn/machine-learning/lecture/8SpIM/gradient-descent)）。

![cost function(square)](/img/in-post/machine-learning/gradient-descent/cost-function-square.png)

熟悉微积分的人都知道，在曲线的某一点上斜率就是曲线在这一点的导数，这就是梯度的概念，梯度是曲线上升最快的方向，因此想要最快的到达曲线的底部（最小值处），就要求出这一点的导数，朝着相反的方向走一小步，再求新的位置的导数并继续移动一小步，直到达到最小值点。应用在上图的曲面中，要在每一个位置求出两个变量（$$\theta_0和\theta_1$$）的偏导数，这时梯度变成了一个二维向量。随机落在曲面上一点时，迭代寻找最小值的过程如下图：

![cost function(square)](/img/in-post/machine-learning/gradient-descent/gradient-descent-1.png)

### 推导

现在你对梯度下降有了一个直观的认识，尽管你不需要了解相关的数学知识也可以完成训练过程，但我仍然强烈建议你阅读完这一部分，这对算法的理解有很多帮助。当然直接跳过这一部分也不会影响实际应用。

为了得到梯度下降的一般形式，需要把线性回归的变量数量扩展到n个，即多元线性回归，现在定义假设函数为：

$$h_\theta(x)=\theta_0+\theta_1 x_1+\theta_2 x_2+...+\theta_n x_n $$

为了表示方便，设 $$x_0 = 1$$ ：

$$h_\theta(x)=\theta_0 x_0+\theta_1 x_1+\theta_2 x_2+...+\theta_n x_n \tag1$$

写成向量形式，$$ \theta$$是一个n+1维向量：

$$ h_\theta(x) =  \theta \cdot  x$$

新的代价函数公式为：

$$J( \theta)={1\over 2m}\sum_{i=1}^m(h_\theta(x^{(i)}) - y^{(i)})^2 \tag2$$

定义代价函数$$J(\theta)$$的梯度为：

$$
	\nabla J( \theta)\equiv \left [
		{\partial J\over \partial \theta_0} ,
		{\partial J\over \partial \theta_1} ,
		... ,
		{\partial J\over \partial \theta_n} ,
	\right ]\tag{3}
$$

梯度是一个方向，获取到移动的方向后，接下来定义$$ \theta$$的更新规则，“ := ”是赋值的意思：
	
$$ \theta :=  \theta+ \Delta  \theta$$

其中：

$$\Delta  \theta=\alpha \nabla J( \theta) \tag4$$
	
其中$$\alpha$$是学习速率，它决定了在向误差最小值移动的速度——一步迈出去走多远（可以证明，在$$\alpha$$足够小的情况下，梯度下降算法总能收敛）。为了获取最终的权值更新公式($$\theta_i$$的更新公式)，写出其分量形式：

$$\theta_j := \theta_j+\Delta \theta_j$$

其中：

$$\Delta \theta_j=-\alpha {\partial J\over\partial \theta_j} \tag{5}$$

现在来推导公式中的$$\partial J\over\partial \theta_j$$：

$$
\begin{align}
{\partial J\over \partial \theta_j} & = {\partial \over \partial \theta_j}{1\over 2m}\sum_{i=1}^m(h_\theta(x^{(i)}) - y^{(i)})^2 = {1\over 2m}\sum_{i=1}^m{\partial\over \partial \theta_j}(h_\theta(x^{(i)}) - y^{(i)})^2\\
& = {1\over 2m}\sum_{i=1}^m 2(h_\theta(x^{(i)}) - y^{(i)}) {\partial\over \partial \theta_j}(h_\theta(x^{(i)}) - y^{(i)}) \\
& = {1\over m}\sum_{i=1}^m (h_\theta(x^{(i)}) - y^{(i)}){\partial \over \partial \theta_j}(\theta_0 x_0^{(i)} + \theta_1 x_1^{(i)} + ... + \theta_j x_j^{(i)} + ...+ \theta_n x_n^{(i)}-y^{(i)}) \\
{\partial J\over \partial \theta_j} & = {1 \over m}\sum_{i=1}^m(h_\theta(x^{(i)}) - y^{(i)})x_j^{(i)} \tag{6}\\
\end{align}
$$

其中$$x_j^{(i)}$$是第i个训练样例的第j个输入，将(6)代入(5)中得：

$$\Delta \theta_j=- \alpha {1\over m}\sum_{i=1}^m(h_\theta(x^{(i)})-y^{(i)})x_j^{(i)} $$

最终:

$$\theta_j := \theta_j - \alpha {1\over m}\sum_{i=1}^m(h_\theta(x^{(i)})-y^{(i)})x_j^{(i)} \tag7$$

### 算法

得到具体的更新公式之后，梯度下降的算法就十分清晰了：

---
**GRADIENT DESCENT (training_examples,$$\alpha$$)**
(n>=1，$$j\in[0,n+1]$$)

- (1)初始化每个$$\theta_j$$为某个小的随机值
- (2)遇到终止条件之前，做以下操作：
	- (2.1)对于训练样例training_examples中的每个$$(x^{(i)},y^{(i)})$$，做：
		- 计算$$h_\theta(x^{(i)})$$
		- 对于每个权值$$\theta_j$$，做：
		$$\Delta \theta_j := \Delta \theta_j - \alpha(h_\theta(x^{(i)})-y^{(i)})x_j^{(i)}		\tag8$$
	- (2.2)对于每个权值$$\theta_j$$,做：
	$$\theta_j:=\theta_j+{1\over m}\Delta \theta_j\tag9$$

这里初看上去似乎有些疑惑，$$\sum_{i=1}^m$$的求和式不见了，其实整个(2.1)步就在做这一求和工作，并在(2.2)步进行更新。
这里有一个隐含的规则，先执行(2.1)再执行(2.2)意味着在计算所有的$$\Delta \theta_j$$的时候都是使用的上一轮$$\theta$$，这条规则叫做**同步更新**，即在更新第j+1个权值时，要使用与更新j时一样——都是上轮迭代的权值。

### 缺陷和改进

你也许已经注意到，梯度下降虽然可以保证收敛，但无法保证一定可以收敛在全局最小值，例如在代价函数曲面图上选择另外一个点就会收敛在另外一个局部最小值中：

![cost function 2](/img/in-post/machine-learning/gradient-descent/gradient-descent-2.png)

通常情况下你不需要为这种情况担心，像这样拥有多个局部极小值的情况是很少见的，即使遇到多个局部极小值也不要紧，因为使用梯度下降一般都会运行良好，训练出来的结果也都会令人满意。

通过观察公式(7)，你会发现每一次迭代都要计算一遍所有的训练样例，这样的计算是缓慢而且代价昂贵的，因此有人提出了随机梯度下降（stochastic gradient descent），它的思想是使用单个样例更新权值而不是基于所有的训练样例，将标准的梯度下降稍加修改就是下面的随机梯度下降。

##### 随机梯度下降

由于随机梯度下降在每一次迭代时不需要计算所有的训练样例，因此随机梯度下降的代价函数为：

$$J^{(i)}(\theta)={1\over 2}h_\theta(x^{(i)}-y^{(i)})^2 \tag{10}$$
	
对(10)求$$\theta_j$$偏导数最终求得权值更新公式为：

$$\theta_j=- \alpha(h_\theta(x^{(i)})-y^{(i)})x_j^{(i)}\tag{11}$$

将(8)替换为(11)，并删掉(9)就是随机梯度下降算法。
