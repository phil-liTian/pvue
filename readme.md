<!--
 * @Author: phil
 * @Date: 2025-09-02 10:53:27
-->

### 响应式原理

基于 Proxy 代理和 Effect 副作用系统实现：通过 Proxy 对数据对象进行包装，拦截其属性的读取（get）和修改（set）操作；当读取属性时，触发依赖收集，将当前执行的副作用函数（如组件渲染、watch 回调等）通过 Link 结构关联到对应属性的依赖集合（dep）中；当属性被修改时，触发依赖触发，遍历该属性的 dep 集合并执行所有关联的副作用函数，从而实现数据变化自动驱动视图或相关逻辑更新，同时通过 WeakMap 等数据结构高效管理依赖关系，确保响应式系统的性能和内存安全性

核心 api

- reactive（响应式对象需要对 Map、Set 以及数组单独处理）
  -- 响应式对象的核心 api, 用于将一个普通对象转换为响应式对象, 响应式对象的属性值可以是任意类型, 包括对象、数组、函数等。
- shallowReactive
  -- 浅响应式对象的核心 api, 用于将一个普通对象转换为响应式对象, 响应式对象的属性值只能是对象、数组等引用类型, 不能是函数等原始类型。
- readonly
  -- 只读响应式对象的核心 api, 用于将一个普通对象转换为只读响应式对象, 只读响应式对象的属性值不能被修改。
- shallowReadonly
  -- 浅只读响应式对象的核心 api, 用于将一个普通对象转换为浅只读响应式对象, 浅只读响应式对象的属性值只能是对象、数组等引用类型, 不能是函数等原始类型。
- toReactive
  -- 用于将一个普通对象转换为响应式对象, 响应式对象的属性值可以是任意类型, 包括对象、数组、函数等。
- isReactive
  -- 用于判断一个对象是否是响应式对象。
- isShallow
  -- 用于判断一个对象是否是浅响应式对象。
- isReadonly
  -- 用于判断一个对象是否是只读响应式对象。
- toRaw
  -- 用于将一个响应式对象转换为普通对象。
- markRaw
  -- 用于标记一个对象为原始对象, 标记为原始对象的对象不会被转换为响应式对象。
- isProxy
  -- 用于判断一个对象是否是响应式对象。

- ref
  -- 响应式对象的核心 api, 用于将一个普通对象转换为响应式对象, 响应式对象的属性值可以是任意类型, 包括对象、数组、函数等。如果 ref 的 value 是一个对象则会使用 reactive 处理。
- isRef
  -- 用于判断一个对象是否是 ref 对象。computed 也是一个 ref 类型的对象
- unref
  -- 用于获取 ref 对象的 value 值, 如果是 ref 对象则返回 value 值, 如果不是 ref 对象则直接返回。
- toRef
  -- 如果本身就是一个 ref 则无需处理；如果是一个对象，需要显示传入需要转 ref 的 key，返回一个新的 ref 对象；还可以是一个函数，则将这个函数的返回值转换为 ref 对象。
- toRefs
  -- 传入一个对象，返回一个所有元素都转化成 ref 对象的新对象
- toValue
  -- 用于将一个 ref 对象转换为普通值, 如果是 ref 对象则返回 value 值, 如果不是 ref 对象则直接返回。如果是函数则返回函数执行结果。
- customRef
  -- 自定义 ref 的核心 api, 用于创建自定义 ref 对象, 自定义 ref 对象可以自定义依赖收集和触发更新的逻辑。
  -- 构造函数参数：
  -- factory: 工厂函数, 用于创建自定义 ref 对象。
  -- factory 函数参数：
  -- track: 依赖收集函数, 用于在访问 ref 对象的 value 属性时, 收集依赖。
  -- trigger: 触发更新函数, 用于在修改 ref 对象的 value 属性时, 触发更新。

- computed
  -- 计算属性的核心 api, 用于根据响应式数据计算出一个新的值, 新的值会被缓存起来, 只有当依赖的响应式数据发生变化时, 才会重新计算新的值。

- watch
  -- 监听响应式数据的核心 api, 用于监听响应式数据的变化, 当响应式数据发生变化时, 会触发回调函数执行。
- onWatcherCleanup
  -- 用于在 watcher 执行完毕后, 执行一些清理操作, 比如取消事件监听、清除定时器等。

- effect
  -- 副作用函数的核心 api, 用于将一个函数转换为副作用函数, 副作用函数会在响应式数据发生变化时, 自动执行。
  -- 除了 fn, 可传入 ReactiveEffectOptions
  -- ReactiveEffectOptions:
  -- scheduler: 调度函数, 用于在响应式数据发生变化时, 执行副作用函数。
  -- onStop: 停止函数, 用于在副作用函数停止时, 执行一些清理操作。

- ReactiveEffect
  -- 响应式副作用函数的核心类, 用于创建响应式副作用函数, 响应式副作用函数会在响应式数据发生变化时, 自动执行。effect 和 watch 都依赖这个类实现。
  -- 构造函数参数：
  -- fn: 副作用函数

- pauseTracking
  -- 暂停依赖收集

- effectScope
  -- 副作用函数作用域的核心类, 用于创建副作用函数作用域, 副作用函数作用域可以用于管理副作用函数, 副作用函数作用域可以用于取消副作用函数的执行。
- onScopeDispose
  -- 用于在副作用函数作用域停止时, 执行一些清理操作, 比如取消事件监听、清除定时器等。

关键数据结构

- Link: 双向链表，用于维护依赖关系。
  -- 是响应式对象属性和副作用函数的桥梁，当响应式数据(需要被依赖收集的情况中, 有 activeSub 并且 shouldTrack 为 true)被访问(get)时, 会将副作用函数添加到链表中;当响应式数据被修改(set)时, 会触发链表中所有的副作用函数。
  -- 如果一个响应式数据有多个依赖项，比如说 computed 的值依赖多个响应式对象的属性，那么每一个响应式对象都有一个自己的 Dep, Link 中通过 nextDep 和 prevDep 来维护多个 Dep 之间的关系。当响应式数据发生变化时，会触发 Dep 中的 notify 方法，通知所有的副作用函数执行。将副作用函数收集到 batchedSub 中, 当批量更新时, 会遍历 batchedSub, 执行副作用函数。
  -- Link 还有一个更新逻辑, 比如说 computed 的依赖项发生了变化, 那么获取 computed 值的时候, 会 refreshComputed, 会将之前收集到的 dep 的 version 更新为-1, 那么在进行依赖收集的时候检测这些为-1 的 dep，然后更新当前链表中的 Dep,更新后再将当前链表的 version 加 1。
  -- Link 的 sub 指的就是 activeSub, 即当前正在执行的副作用函数; dep 指的是依赖的集合实例, 即当前的 Dep 实例对象

```js
export class Link {
  version: number
  nextDep?: Link
  prevDep?: Link
  nextSub?: Link
  prevSub?: Link
  prevActiveLink?: Link
  constructor(public sub: Subscriber, public dep: Dep) {
    this.version = dep.version
    this.nextDep =
      this.prevDep =
      this.nextSub =
      this.prevSub =
      this.prevActiveLink =
        undefined
  }
}
```

- Dep: 依赖收集类，用于收集依赖和触发更新
  -- activeSub: 比如在 effect 中, activeSub 就是 new 出来的 ReactiveEffect 对象；在 computed 中, activeSub 就是 new 出来的 ComputedRefImpl 对象
  -- deps: 依赖收集链表, 用于收集依赖, 这个字段是在 activeSub 中的
  -- depsTail: 依赖收集链表的尾节点
  -- version: 依赖收集链表的版本号, 用于判断依赖是否发生了变化；isDirty 就是通过这个 version 来判断的，如果是 dirty 的话，fn 才会执行
  -- activeLink: 指向当前正在执行的副作用函数的链表节点
  -- subs: 依赖收集链表, 用于收集依赖（这个字段是在 Dep 中的，两个字段都是存储的 link）

经典问题总结

1. 执行 effect 的 stop 函数的时候，如何清空当前 effect 的 targetMap?

- 在进行依赖收集的时候, 即 new Dep() 的时候，给 dep 挂载上一个 map 和 key, 当执行 stop 的时候, 清空 map 中的内容

2. 如果 effect 的 fn 中的依赖项是一个 computed，如果实现 computed 的依赖项发生变化了, effect 的 fn 也会重新执行？

- 2.1 依赖收集阶段：如果 activeSub 是 computed, 则将当前 sub 的 flag 置为 TRACKING, 使 computed 的依赖属性 get 时可以被正常收集到 link.dep.subs = link
- 2.2 触发更新阶段：computed 依赖的数据发生变化了，首先应该触发 computed 的更新机制，如果当前 computed 没有被 notify 过，则 notify computed 收集 batchedComputed，收集后将 computed 的 dep 也通知更新下, 将其收集到 batchedSub 中
- 2.3 执行更新阶段：逐个执行 batchsub 中的 sub， 将 batchComputed 中的 flags 重置成未通知状态

3. 如果 computed 的依赖更新了, 他的 Link 改怎样维护呢？

- computed 是一个订阅对象，初次 track 时，会挂载一个 deps, 后续如果 computed 依赖多个属性，这些属性都会被添加到 nextDep 中，如果依赖的属性发生变化, 这个 computed 的 version 会被重置成-1，然后在 track 的时候，会将这些-1 的 computed 的 nextDep 进行更新，发生变化后依赖的属性可能会增加，往 nextDeps 添加新增的属性

4. 在 watch 中, 初始化时，他的回调函数不一定会立即执行，可以动态指定 immediate 这个是如何实现的？

- 4.1 watch 本质上也是基于 ReactiveEffect 实现的, 会对 source 进行处理，最终都会处理成一个函数类型的参数, effect 中设置了一个调度器的 scheduler, 当依赖数据发生变化时不会立即执行 fn，而是执行 scheduler。需要提到的是，watch 的回调函数是一个异步函数，会放到微任务队列中执行。
  相同的微任务无法入队，这里的解决方案是给入队的 job 添加 ALLOW_RECURSE 标识，这样就解决了响应式数据多次入队，回调函数多次执行的问题。

5. watch 中的 deep 是如何实现的呢？怎么实现 deep 可以指定 number 类型，限制监听到哪一个层级的？

- traverse 进行遍历, 遍历到的元素会被 track, 当遍历到的元素发生变化时, 会触发 scheduler 执行

6. watch 的 job 会放到异步对象中，name flush: post 在挂载时, 如何拿到渲染后的 dom 结构的？

- 挂载时 即执行完 render 函数, 在 render 函数最后会执行 flushPostFlushCbs, 会遍历 pendingPostFlushCbs 中的 job, 执行 job 中的 fn, 这里的 fn 就是 watch 的回调函数, 回调函数中可以拿到渲染后的 dom 结构

7. Reflect 是处理不了 Map 和 Set 的 for...of 的, 那么是如何处理的呢？

- for...of 的遍历 key 会是一个 Symbol.iterator 类型, 那么 Map 和 Set 就可以使用 Symbol.iterator 进行遍历, 通过调用 innerIterator.next()方法, 来实现遍历的逻辑, 当调用 next 方法时, 会返回一个对象, 包含 value 和 done 两个属性, value 是当前遍历到的元素, done 是一个 boolean 类型, 表示是否遍历完成
