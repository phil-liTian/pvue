## 响应式系统 - 核心

### reactive

#### reactive

将普通对象转换成响应式对象，响应式对象发生变化时，effect 会重新执行, 从而组件会重新渲染

#### markRaw

标记成原始类型，标记的元素不可处理成响应式对象

#### toRaw

转化成原始对象, 获取响应式对象的 raw 属性，在 get 里面处理，当 key 时 raw 时 则返回 target 元素

#### isReactive

在响应式对象被 get 时，监测 key 是不是 IS_REACTIVE, 响应式对象的该属性为 true，反之为 false

#### isProxy

就是判断对象有没有 raw 属性

#### shallowReactive

#### readonly

#### isShallow

#### isReadony

### ref
