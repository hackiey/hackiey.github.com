---
layout:     post
title:      "人工神经网络（感知器）（二）（delta法则）"
subtitle:   ""
date:       2016-05-15 00:00:00
header-img: img/in-post/ann/ann2.jpg
author:     "Harry"
tags:
    - 机器学习
    - 人工神经网络
---

感知器训练法则所能解决的问题是非常有限的，大部分的问题都是线性不可分的，所以为了保证在线性不可分时仍能够使训练过程收敛，要引入delta法则。它同时也是学习多个单元的互联网络的基础。

### delta法则

delta法则的关键思想是使用梯度下降(gradient descent)搜索“所有“（由于程序在训练时不可能完全平滑，所以设置一个足够小的$$\eta$$来尽可能的在误差最小值附近逼近这个值）可能的权值假设空间，从中找出能够最佳拟合训练样例的权向量。

>最好把delta训练法则理解为训练一个无阈值的感知器，也就是一个线性单元(linear unit)，它的输出o如下:

$$ o(\vec x) = \vec w \cdot \vec x \tag{1}$$ 

为了理解梯度下降，首先先定义训练误差:

$$
	E(\vec w)={1\over 2}\sum_{d\epsilon D}(t_d-o_d)^2 \tag{2}
$$

这是最常用的用来度量误差的定义，其中D是训练样例集合，$$t_d$$是训练样例d的目标输出，$$o_d$$是线性单元对训练样例d的输出，`形式上如同方差，至于为什么要乘1/2，可能是为了推导出最后的公式后有一个简洁的运算。`一个有两个输入的线性单元对应的误差平面图如下，从这里可以直观的看出，当随机初始化权值后，误差有可能在误差平面上任何一个点，为了到达$$E(\vec w)$$的最小值，要不断去寻找当前点在这个平面上**最陡**的方向并朝着这个方向进行移动。这里可以看出为什么delta法则总能收敛。`如果训练数据不能线性可分，那么这个误差平面与$$w_1和w_2$$组成的平面不会相交，即使收敛也无法学习到最正确的目标函数(考虑异或函数，你无论如和也无法找出两个权值来拟合这个目标函数)。`

![不同假设的误差](/img/in-post/ann/perceptron/error.png)

### 梯度下降法则的推导

推导过程的关键是找出沿误差曲面最陡峭下降的方向。可以通过计算E相对向量$$\vec w$$的**每个分量的导数**来得到这个**方向**。这个向量导数被称为E对于$$\vec w$$的梯度(gradient)，记作$$\nabla E(\vec w)$$。
	
$$
	\nabla E(\vec w)\equiv \left [
		{\partial E\over \partial w_0} ,
		{\partial E\over \partial w_1} ,
		... ,
		{\partial E\over \partial w_n} ,
	\right ]\tag{3}
$$

梯度本身是一个向量，没有具体的距离量度，因此梯度下降的训练法则是:

$$\vec w\leftarrow \vec w+ \Delta \vec w$$

其中:

$$\Delta \vec w=- \eta \nabla E(\vec w) \tag {4}$$ 

$$\eta$$是学习速率，它决定了在梯度下降中向误差最小值移动的速度。为了获取最终的权值更新公式($$w_i$$的更新公式)，可以写出其分量形式:

$$w_i\leftarrow w_i +\Delta w_i$$

其中:

$$\Delta w_i=-\eta {\partial E\over\partial w_i} \tag{5}$$

现在来推导一下$$\partial E \over \partial w_i$$,根据(2)式可以得出第一步，然后根据求导法则逐步推导，需要注意的是，$$t_d$$`是训练数据的目标输出，它与`$$w_i$$`无关，而`$$o_d$$`包含了在公式中充当未知数的`$$w_i$$`，因此最后一步求导时`$$t_d$$`被视为一个常数最终成为0。这个推导过程十分重要，它是梯度下降算法的核心过程。`

$$
\begin{align}
{\partial E\over \partial w_i} & = {\partial \over \partial w_i}{1\over 2}\sum_{d\epsilon D}(t_d-o_d)^2 = {1\over 2}\sum_{d\epsilon D}{\partial \over \partial w_i}(t_d-o_d)^2\\
& = {1\over 2}\sum_{d\epsilon D}2(t_d-o_d){\partial \over \partial w_i}(t_d-o_d) \\
& = \sum_{d\epsilon D}(t_d-o_d){\partial \over \partial w_i}(t_d-\vec w \cdot \vec x_d) \\
{\partial E\over \partial w_i} & = \sum_{d\epsilon D}(t_d-o_d)(-x_{id}) \tag{6}\\
\end{align}
$$

其中$$x_{id}$$是训练样例d的一个输入分量$$x_i$$。将(6)代入(5)中可以得出最终的梯度下降权值更新法则:

$$\nabla w_i=\eta \sum_{d\epsilon D}(t_d-o_d)x_{id} \tag{7}$$

### 训练线性单元的梯度下降算法

---
**GRADIENT-DESCENT(training_examples, $$\eta$$)**

training_examples中每一个训练样例形式为序偶<$$\vec x$$, t>，其中$$\vec x$$是输入值向量，t是目标输出值，$$\eta$$是学习速率(例如0.05)

- 初始化每个$$w_i$$为某个小的随机值
- 遇到终止条件之前，做以下操作:
	- 初始化每个$$\nabla w_i$$为0
	- 对于训练样例training_examples中的每个<$$\vec x$$, t>，做:
		- 把实例$$\vec x$$输入到此单元，计算出o
		- 对于线性单元的每个权$$w_i$$，做:
		
		$$\Delta w_i\leftarrow \Delta w_i +\eta (t-o)x_i \tag8$$
	- 对于线性单元的每个权$$w_i$$，做:
		
		$$w_i \leftarrow w_i+\Delta w_i \tag9$$
		
---
从算法的描述中就可以看出，每一步都要应用所有的训练样例到线性单元并计算出o，因此训练过程是极其缓慢的。`算法中所提到的终止条件指的是事先设定一个可以接受的误差范围，当误差小于这个范围时则终止。`

### 实验

这一节实验使用书中的一个练习题：

>实现一个两输入线性单元的delta训练法则。训练它来拟合目标概念 $$-2+x_1+2x_2>0$$。画出误差E相对训练迭代次数的函数曲线。画出5，10，50，100，……次迭代后的决策面。
>(a)为 $$\eta$$ 选取不同的常量值，并使用衰减的学习速率——也就是第i次迭代使用 $$\eta_0 / i $$，再进行实验。哪一个效果更好？

（未完待续）