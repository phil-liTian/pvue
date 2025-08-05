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

### effect

1. 如何解决 effect 中改变响应式对象造成的递归的问题

```js
const counterSpy = vitest.fn(() => counter.num++)
effect(counterSpy)
```

添加 flags, 在 run 里面 flags 处理成 RUNNING, 在 notify 中判断如果是 running 的 effect, 不再触发更新

2. batchStart 和 batchEnd 是要解决什么问题？
   当在 startBatch 和 endBatch 之间修改多个响应式数据时，Vue 会将这些变更合并为一个“批次”，避免触发多次不必要的副作用（如组件的重复渲染或计算属性的重复计算）。
   原理: 批量模式通过一个“批处理计数器”实现
   startBatch：增加计数器，进入批量模式。
   endBatch：减少计数器，当计数器归零时，统一触发依赖更新。

3. noTracking
   用于临时禁用依赖收集，适用于需要读取响应式数据但不想建立依赖关系的场景
   比如: unshift: 不进行依赖收集
   当新增数组元素, 如果收集的 depMap 有 key 是 length 的依赖, 直接派发更新

4. ownKeys 收集 for...in 遍历时候的依赖

5. in 操作符 会触发 reflect 的 has 方法, 在 has 方法里面进行依赖手机

6. ARRAY_ITERATE_KEY: join
7. ITERATE_KEY: ownKeys
