---
layout:     post
title:      "Keras notes"
subtitle:   ""
date:       2017-08-09 12:00:00
author:     "Harry"
tags:
    - Keras
---

### 层

1. trainable属性可以设置层的weights和bias是否可以被更新
2. 自定义层
    - 编写自己的layer时，一定要注意考虑batch_size

3. 尽量为每个层命名，这样在fine tuning的时候你会很方便的调整每个层
4. Keras的Conv2D层的filter shape通常会写(width, height)，实际上的shape是(width, height, channels), 因此输出的feature map个数是filter的个数

### 模型

1. 多个子模型输出
```
model = Sequential()
model1 = Sequential()
model2 = Sequential()
final_model = keras.models.Model(model.input,[model1.output, model2.output])
final_model.compile(loss=[model1_loss, model2_loss], metrics=['mse','mae'])
```
loss是一一对应的，metrics中所有的方式会对每一个输出模型评估一遍

2. 如果数据集不平衡，可以使用class weights，假设0标签有100个，1标签只有10个，需要指定class_weights为10:1
```
class_weights = {0: 1, 1: 10}
model.fit(x.,y, class_weight = class_weights)
```
当输出层含有多个标签时，可以指定不同的输出使用不同的weights
```
class_weights = {'output_a':{0:10, 1:1}, 'output_b':{0:1, 1:10}} # output_a和output_b都是输出层的对应的layer name
```

### backend

1. reshape 包含batch_size的tensor时，需要使用tensorflow指定batch：
```
shape = K.shape(x)
pool_shape = tf.stack([shape[0], ...])  # Here you can mix integers and symbolic elements of `shape`
input_reshaped = K.reshape(x, pool_shape)
```
2. K.transpose的axis无法指定，固定为(1,0)，如果想修改多维变量的axis，可以使用K.permute_dismensions
```
tranposed = K.permute_dimensions(x, (0,2,3,1))
```

### metrics

1. Keras2.0之后移除了很多比较有用的metrics，例如precision和recall等，旧版本的keras保留了很多metrics，[在这里](https://github.com/fchollet/keras/blob/53e541f7bf55de036f4f5641bd2947b96dd8c4c3/keras/metrics.py)。

2. 使用自定义metrics后，load_model需要指定metrics
```
model = keras.models.load_model('xxx.hdf5', custom_objects:{'metric_name':custom_metric})
```

### 测试

1. 如果你想直接打印出某些结果，可以使用下面的代码
```
sess = tf.Session()
with sess.as_default():
    a = K.variable(np.array(...))
    print(K.eval(a))
```

### Tips

1. 使用callback保存checkpoint,filepath中的val开头的变量需要在model.fit里指定validation_data时才可以使用
```
checkpoint = keras.callbacks.ModelCheckpoint(filepath = '...{epoch:02d}-{acc:.5f}-{loss:.5f}-{val_acc:.5f}-{val_loss:.5f}.hdf5')
model.fit(x,y, validation_data=(x_val, y_val), callbacks=[checkpoint])
```

2. 使用tensorflow做后端时，使用callback里的tensorboard，有助于调参
```
tensorboard = keras.callbacks.TensorBoard(log_dir = folder_path)
```
之后在model.fit的callbacks参数中添加上tensorboard

翻出去可以用disqus留言……