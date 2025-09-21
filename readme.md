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
- triggerRef

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

8. dep 需要是\_\_v_skip 对象, 不能在获取对象的 dep 的也当作响应式对象被收集起来了, 需要被当作一种 INVALID 类型, 防止被处理成响应式对象。

9. startBatch 和 endBatch 被设计出来是要解决什么问题？

- startBatch 标记 "进入批量更新模式"，此时响应式数据的修改不会立即触发副作用执行，而是将副作用函数暂存到队列中。
- endBatch 标记 "退出批量更新模式"，此时会统一执行队列中暂存的副作用函数（并通过 NOTIFIED 去重），确保只执行一次最终结果。
  是为了解决批量更新的问题，当响应式对象发生时，并不能立即去执行 effect 的回调函数，而是先 notify 依赖需要被收集，将需要收集的对象放到 batchedSub 中，在所有的 notify 都执行完毕后，batchSub 会收集所有的 effect，使用 next 连接，最后使用 batchEnd 依次执行 batchedSub 中的 subscrier。

10. pauseTracking 和 resetTracking 起到什么作用

- 用于控制依赖追踪开关的核心函数，主要解决 "不必要的依赖收集" 问题，优化响应式系统的性能。
  pauseTracking()：暂停依赖追踪，此时读取响应式数据不会收集任何依赖。
  resetTracking()：恢复依赖追踪，让系统重新开始收集依赖。
  例如处理 array 的 shift、push、pop、unshift 方法时, 使用 pauseTracking 避免不必要的收集; 模板中静态部分的渲染（如固定文本）不需要追踪依赖，Vue 会在处理静态内容时暂停追踪。
  避免无关操作触发不必要的依赖关联，减少冗余更新。
  确保只有真正需要响应数据变化的副作用被正确追踪。

11. effect 的 pause 和 reasume 是干什么用的？
    pause 将当前 effect 的 flags 置成 PAUSED; 在 trigger 的时候，收集的 effectfn 不会立即执行，而是将其收集到 pausedQueueEffects 对象里面。这些 fn 在 resume 的时候会逐一执行

12. onEffectCleanup
    在 effect 执行完毕之后，执行的清空操作

13. onTrack 和 onTrigger 为什么会被设计？
    在 track 的时候收集关键信息，确保执行过程是预期结果。在 Trigger 的时候 检查 value 和 oldvalue 等相关信息是否正确。DebuggerEventExtraInfo 是触发的关键信息

### 运行时核心

从初始化时通过 createApp 建立应用上下文，到组件挂载阶段将 setup 函数返回值与响应式系统（Proxy 拦截器）绑定实现依赖收集，再到数据变更触发 trigger 时通过 effect 调度器推送更新任务至微任务队列，最终在 patch 过程中结合编译期标记的 PatchFlags 与双端 Diff 算法精准更新 VNode，并通过 queueJob 的优先级管理机制（如 flushPreFlushCbs 与 flushPostFlushCbs）协调生命周期钩子与副作用函数的执行时机，形成 "数据响应 - 任务调度 - 节点更新" 的闭环，同时通过 renderer 接口的抽象设计实现跨平台渲染能力的解耦。

核心 api

- createVNode 创建一个虚拟节点
  可处理参数(type, props， children), type 可以是 string 类型或者是对象类型, 如果 type 是一个 string 类型则认为是 element，如果是一个对象则认为是 COMPONENT，chilren 可分为三类，TEXT_CHILDREN,ARRAY_CHILDREN, SLOTS_CHILDREN（当 type 是一个对象，children 也是一个对象时，这个 children 就认为是 SLOTS_CHILDREN）. 会返回一个 VNode 对象

```js
export enum ShapeFlags {
  ELEMENT = 1,
  FUNCTIONAL_COMPONENT = 1 << 1,
  STATEFUL_COMPONENT = 1 << 2,
  TEXT_CHILDREN = 1 << 3,
  ARRAY_CHILDREN = 1 << 4,
  SLOTS_CHILDREN = 1 << 5,
  TELEPORT = 1 << 6,
  SUSPENSE = 1 << 7,
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  COMPONENT_KEPT_ALIVE = 1 << 9,
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT,
}
```

- isVNode
  判断对象身上是否有\_\_v_isVNode 属性，内部实现类似响应式系统判断是否是 reactive 或者 ref 是一样的.

- createTextVNode
  快速创建一个文本节点

- createCommentVNode
  快速创建一个注释节点

- normalizeVNode
  参数是一个 children，目的是将这个 children 处理成 vnode,如果是 null 或者是 boolean 类型的参数, 则直接创建一个注释节点；如果是一个数组就将这个数组用 Fragment 包裹起来; 如果本来就是一个 vnode，则将这个 vnode 克隆一份出来；其他情况的话就默认创建一个文本节点

- normalizeChildren
  处理 vnode 的 children, 给 vnode 加上 ShapeFlag 标识。如果 children 是一个函数，则这个函数默认按 SLOT_CHILDREN 处理; 如果 children 是一个对象，分两种情况处理：1.vnode 的 type 是一个对象，则就直接当插槽处理了 2. vnode 的 type 是一个 string 类型的，则说明是 dom 元素，默认将对象的 default 对象的执行结果当作当前 vnode 的 children 递归处理。

- isSameVNodeType
  判断是否是相同的 vnode, 只要 vnode 的 key 和 type 都相同，则认为就是同一个 vnode，这在进行双端 diff 算法的时候有重要作用

- h
  h 函数实际上是对 createVNode 的一种封装，更好的暴露给用户使用
  1. 如果参数只有两个的话， 1.1 如果第二个参数是一个对象 且是一个 vnode 直接当 children 处理， [propsOrChildren] 1.2 否则直接当 children 处理
  2. 如果是三个参数的话 2.1 第三个参数是 vnode，则将其用数组包一下 [children]
  3. 大于三个参数 从第三个开始都当 children 处理

关键数据结构

VNode

Component

经典问题总结

1.  自定义渲染器的执行过程？挂载 app 上的方法是如何实现的？
    在 runtime-dom 中使用 runtime-core 中的 createRenderer 方法导出 createApp 方法。实际指向的是 runtime-core 中的 createAppAPI.在这里将返回一个 app 对象, 在 app 对象上挂载 config、mount、unmount、provide 等方法。实现了一整套自定义渲染器的流程，是 runtime-core 可以在任意平台使用
    2.1 主要流程

```js
// 在runtime-dom中 创建相应的renderOptions
function ensureRenderer() {
  return createRenderer(renderOptions)
}

export const createApp = (...args: any[]) => {
  const app = ensureRenderer().createApp(...args)

  return app
}

// 在runtime-core中 导出createRenderer方法, 创建app实例

export function createRenderer<HostNode, HostElement>(
  options: RenderOptions<HostNode, HostElement>
) {
  return baseCreateRenderer(options)
}

function baseCreateRenderer(options) {
  // ...
  return {
    render,
    createApp: createAppAPI(render) as any,
  }
}


// 在createAppAPI中返回app对象。在函数内部处理创建的app对象上的属性，比如use、mount等方法

export function createAppAPI(render): CreateAppFunction {
  return function createApp(rootComponent, rootProps = null) {
     const app: App = {}
    // ...

    // mount方法 将执行render函数 将rootComponet挂载到rootContainer上。 开始执行patch逻辑
    mount() {
    }

     return app
  }
}

```

3. patch 的执行过程

4. openBlock、closeBlock、setupBlock 是如何工作的？

5. 为什么需要使用 nextTick 才能拿到组件更新后的内容？

6. 组件代理对象是如何实现的, 为什么在 render 里面可以直接使用 setup 返回的数据？

7. api/ inject、provide 是如何实现的？

8. 组件生命周期的实现原理，以及调用时机？

9. 组件的 emit 是如何实现组件通信的？

10. 组件的插槽实现原理分析？

11. 在 vue 中是如何实现错误捕获机制的？

12. 警告机制是如何拿到嵌套的 instance 实例的？

### 编译原理

Vue3 编译原理核心流程体现为 "模板到渲染函数的优化式转化"：首先通过解析器将模板字符串转化为带位置信息的 AST（抽象语法树），随后遍历 AST 进行标记优化（如静态节点标记 PatchFlags、树结构扁平化）与静态提升（将不参与更新的节点 / 属性提取至渲染函数外），接着由转换模块处理指令（v-if/v-for 等）、事件绑定等特殊语法并生成对应的 JavaScript 表达式，最后由代码生成器将优化后的 AST 转换为可执行的渲染函数（含\_createVNode、\_setupRenderEffect 等运行时 API 调用），使编译产物能直接与运行时的虚拟 DOM 渲染逻辑对接，通过 "编译期预判" 减少运行时 Diff 计算量，实现 "编译优化 - 运行时渲染" 的协同增效。

代码体现为: baseParse 通过 tokenizer 的 parse 方法将 input 转化成 ast。这里的 parse 方法是一个状态机，处理字符串在不同状态间流转。然后通过 transform 处理 ast, 在 traverseNode 的时候，针对不同的 NodeType 使用不同 NodeTransform 处理。处理生成的 codegenNode，是在 codegen 中生成代码的核心对象。codegen 的结果就是一个 render 函数。

核心点 1: prase 状态机的处理

通过维护一系列离散状态（如初始状态、标签开始状态、属性解析状态、文本解析状态等），根据当前读取的模板字符类型（如<、>、{{、字母等）触发状态切换，并在对应状态下执行特定解析逻辑（如解析标签名、属性、插值、文本等），从而将模板字符串逐步转换为 AST 节点，高效处理嵌套结构、指令、注释等各种模板语法，确保解析过程的有序性和准确性。

核心点 2: nodeTransform 的设计理念

1. 将不同类型节点（如元素、文本、插值、指令等）的转换逻辑拆分为独立的 transform 函数，每个函数专注处理特定类型节点（如 transformElement 处理元素节点、transformText 处理文本节点），降低耦合性。
2. 通过配置允许自定义 transform 函数，开发者可根据需求扩展编译逻辑（如自定义指令处理、特定语法转换），增强编译器灵活性
3. 从后往前执行（即 AST 的后序遍历），核心是为了让父节点在处理时能获取子节点已完成转换的完整信息 —— 由于许多转换逻辑（如静态节点标记、指令关联、作用域分析等）依赖子节点的处理结果（如子节点是否为静态、是否包含特定指令等），先处理子节点再处理父节点，可确保父节点在转换时能基于子节点的最终状态做决策，避免因信息不全导致的错误判断或重复处理，同时保证模块化 transform 函数间的协同性，让整个转换流程更符合 AST 的嵌套结构逻辑。

核心点 3: comiler 与 runtime 连接的核心逻辑
在 runtime-core 中抛出方法 registerRuntimeCompiler, 接收一个 compileToFunction 函数，执行 compileToFunction 函数会返回一个 render 函数。函数的 code 是 compiler 中 generate 生成的。

在 pvue 中将 compiler 和 runtime 串联起来的核心逻辑

```js
import { registerRuntimeCompiler } from '@pvue/runtime-core'
function compileToFunction(template: string | HTMLElement) {
  const { code } = compile(template as string)

  // 只需要保留函数体中的内容
  const funcBody = code.replace(/^function\s+\w*\([^)]*\)\s*\{|\}$/g, '').trim()

  const render = new Function('PVue', funcBody)

  // return render
  return render
}

registerRuntimeCompiler(compileToFunction)

```

在 compiler-dom 中

```js
import { baseCompile, RootNode } from '@pvue/compiler-core'
export function compile(src: string | RootNode) {
  return baseCompile(src)
}
```

在 compiler-core 中处理 baseCompile 的内容，使用 generate 生成一个 code

```js
export function baseCompile(source: string | RootNode) {
  const ast = isString(source) ? baseParse(source) : source

  transform(ast, {})
  return generate(ast, {})
}
```

在 runtime-core 中

```js
let compiler
export function registerRuntimeCompiler(_compiler: any): void {
  compiler = _compiler
}

export function finishComponentSetup(
  instance: ComponentInternalInstance,
  skipOptions?: boolean
) {
  const Component = instance.type
  // ...
  if (!instance.render) {
    if (compiler) {
      const template = Component.template

      if (template) {
        Component.render = compiler(template)
      }
    }
  }
  // ...
}
```
