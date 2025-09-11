import { extend, hasChanged } from '@pvue/shared'
import { Dep, Link, globalVersion } from './dep'
import { activeEffectScope } from './effectScope'
import { ComputedRefImpl } from './computed'
import { TrackOpTypes, TriggerOpTypes } from './constants'
import { warn } from './warning'

export type EffectScheduler = (...args: any[]) => any
export let activeSub: Subscriber | undefined
let batchedSub: Subscriber | undefined
let batchedComputed: Subscriber | undefined
let batchDepth = 0

const pausedQueueEffects = new WeakSet<ReactiveEffect>()
export interface Subscriber {
  deps?: Link
  depsTail?: Link
  flags: EffectFlags
  next?: Subscriber
  notify(): true | void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

export enum EffectFlags {
  ACTIVE = 1 << 0,
  RUNNING = 1 << 1,
  TRACKING = 1 << 2,
  NOTIFIED = 1 << 3,
  DIRTY = 1 << 4,
  ALLOW_RECURSE = 1 << 5,
  PAUSED = 1 << 6,
  EVALUATED = 1 << 7,
}

export type DebuggerEvent = {
  effect: Subscriber
} & DebuggerEventExtraInfo

export type DebuggerEventExtraInfo = {
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key: any
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}

function isDirty(sub: Subscriber): boolean {
  for (let link = sub.deps; link; link = link.nextDep) {
    if (
      link.dep.version !== link.version ||
      (link.dep.computed &&
        (refreshComputed(link.dep.computed) ||
          link.dep.version !== link.version))
    ) {
      return true
    }
  }

  return false
}

export function batch(sub: Subscriber, isComputed: boolean = false) {
  sub.flags |= EffectFlags.NOTIFIED

  if (isComputed) {
    sub.next = batchedComputed
    batchedComputed = sub
    return
  }
  // batchedSub为将最新的sub添加到链表的最前面的结果
  sub.next = batchedSub
  batchedSub = sub
}

export function startBatch() {
  batchDepth++
}

export function endBatch() {
  if (--batchDepth > 0) return

  if (batchedComputed) {
    let e: Subscriber | undefined = batchedComputed
    batchedComputed = undefined

    while (e) {
      let next = e.next
      e.next = undefined
      e.flags &= ~EffectFlags.NOTIFIED
      e = next
    }
  }

  while (batchedSub) {
    let e: Subscriber | undefined = batchedSub
    batchedSub = undefined
    while (e) {
      const next = e.next
      // 取消已通知更新状态，确保下次可正常更新
      e.flags &= ~EffectFlags.NOTIFIED
      // console.log('next', next)
      if (e.flags & EffectFlags.ACTIVE) {
        ;(e as ReactiveEffect).trigger()
      }

      e = next
    }
  }
}

export class ReactiveEffect<T = any> implements Subscriber {
  flags: EffectFlags = EffectFlags.TRACKING | EffectFlags.ACTIVE
  // 表头
  deps?: Link = undefined
  // 表尾
  depsTail?: Link = undefined
  next: any
  scheduler?: EffectScheduler = undefined

  onStop?: () => void

  onTrack?: (event: DebuggerEvent) => void

  // 内置 清空函数
  cleanup?: () => void = undefined

  constructor(public fn: () => T) {
    if (activeEffectScope && activeEffectScope.active) {
      activeEffectScope.effects.push(this)
    }
  }

  pause() {
    this.flags |= EffectFlags.PAUSED
  }

  resume() {
    if (this.flags & EffectFlags.PAUSED) {
      // 重置为正常状态
      this.flags &= ~EffectFlags.PAUSED
      if (pausedQueueEffects.has(this)) {
        pausedQueueEffects.delete(this)
        this.trigger()
      }
    }
  }

  run() {
    // stop 之后的 fn 就不是active类型的, 这时如果再次触发trigger
    if (!(this.flags & EffectFlags.ACTIVE)) {
      return this.fn()
    }
    // TODO

    cleanupEffect(this)
    prepareDeps(this)
    const prevEffect = activeSub
    // 这是需要收集的effect
    this.flags |= EffectFlags.RUNNING
    const prevShouldTrack = shouldTrack
    activeSub = this
    shouldTrack = true
    try {
      return this.fn()
    } finally {
      cleanupDeps(this)
      activeSub = prevEffect
      shouldTrack = prevShouldTrack
      this.flags &= ~EffectFlags.RUNNING
    }
  }

  /**
   * @internal
   */
  runIfDirty() {
    if (isDirty(this)) {
      this.run()
    }
  }

  stop() {
    if (this.flags & EffectFlags.ACTIVE) {
      // active 的 effect才可以停止
      // this.dep.clear()
      // this.deps?.dep = new Link({}, {})

      for (let link = this.deps; link; link = link.nextDep) {
        // link 的sub 就是subscriber dep就是依赖项
        removeSub(link)
      }

      this.deps = undefined

      cleanupEffect(this)
      this.onStop && this.onStop()
      this.flags &= ~EffectFlags.ACTIVE
    }
  }

  notify() {
    if (this.flags & EffectFlags.RUNNING) {
      return
    }

    if (!(this.flags & EffectFlags.NOTIFIED)) {
      batch(this)
    }
  }

  trigger() {
    if (this.flags & EffectFlags.PAUSED) {
      pausedQueueEffects.add(this)
      // 停止的effect需要收集起来 在resume之后会再拿出来执行
    } else if (this.scheduler) {
      this.scheduler()
    } else {
      this.runIfDirty()
    }
  }
}

export interface DebuggerOptions {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

export interface ReactiveEffectOptions extends DebuggerOptions {
  onStop?: () => void
  scheduler?: EffectScheduler
}

export interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

/**
 * 准备订阅者的依赖项，将所有依赖项的版本标记为-1
 * @param sub 订阅者对象
 */
function prepareDeps(sub: Subscriber) {
  for (let link = sub.deps; link; link = link.nextDep) {
    link.version = -1
    link.prevActiveLink = link.dep.activeLink
    link.dep.activeLink = link
  }
}

export function refreshComputed(computed: ComputedRefImpl): undefined {
  if (computed.globalVersion === globalVersion) return
  computed.flags &= ~EffectFlags.DIRTY

  computed.globalVersion = globalVersion
  const prevSub = activeSub
  activeSub = computed
  const dep = computed.dep
  const prevShouldTrack = shouldTrack
  shouldTrack = true

  try {
    prepareDeps(computed as any)

    const value = computed.fn(computed._value)
    if (dep.version === 0 || hasChanged(value, computed._value)) {
      dep.version++
      computed._value = value
    }
  } finally {
    activeSub = prevSub
    cleanupDeps(computed)
    shouldTrack = prevShouldTrack
  }
}

export function effect<T = any>(fn: () => T, options?: ReactiveEffectOptions) {
  // 如果effect的fn本来就是一个effect函数 则 将effect的fn与之前的fn保持一致
  // should not double wrap if the passed function is a effect
  if ((fn as ReactiveEffectRunner).effect instanceof ReactiveEffect) {
    fn = (fn as ReactiveEffectRunner).effect.fn
  }

  const e = new ReactiveEffect(fn)

  if (options) {
    extend(e, options)
  }

  e.run()

  const runner = e.run.bind(e) as ReactiveEffectRunner

  runner.effect = e
  return runner
}

export function stop(runner: ReactiveEffectRunner) {
  runner.effect.stop()
}

function cleanupDeps(sub: Subscriber) {
  let link = sub.depsTail
  let head

  while (link) {
    // fn函数执行完成后 都要清空targetMap中的数据
    if (link.version === -1) {
      removeSub(link)
    }

    const prev = link.prevDep
    head = link
    link.dep.activeLink = link.prevActiveLink
    link.prevActiveLink = undefined

    link = prev
  }
}

function removeSub(link: Link) {
  const { dep, prevSub, nextSub } = link

  // # should only remove the dep when the last effect is stopped
  if (nextSub) {
    nextSub.prevSub = prevSub
  }

  // 是同一个Subscriber
  if (dep.subs === link) {
    dep.subs = prevSub
  }

  // 当执行stop的时候 应该要清空targetMap中的内容
  if (dep.map && dep.key) {
    dep.map.delete(dep.key)
  }
}

export let shouldTrack = true

export function pauseTracking(): void {
  shouldTrack = false
}

export function enableTracking(): void {}

export function resetTracking(): void {}

export function onEffectCleanup(
  fn: () => void,
  failSilently: boolean = false
): void {
  if (activeSub instanceof ReactiveEffect) {
    activeSub.cleanup = fn
  } else if (__DEV__ && !failSilently) {
    warn(
      `onEffectCleanup() was called when there was no active effect` +
        ` to associate with.`
    )
  }
}

function cleanupEffect(e: ReactiveEffect) {
  const { cleanup } = e
  e.cleanup = undefined
  if (cleanup) {
    try {
      cleanup()
    } finally {
    }
  }
}

// startBatch和endBatch的设计初衷：批量合并更新； 合并多次连续的数据修改触发的更新
// startBatch：标记 "进入批量更新模式"，此时响应式数据的修改不会立即触发副作用执行，而是将副作用函数暂存到队列中。
// endBatch：标记 "退出批量更新模式"，此时会统一执行队列中暂存的副作用函数（并通过NOTIFIED去重），确保只执行一次最终结果。

// pauseTracking和resetTracking的设计初衷: 用于控制依赖追踪开关的核心函数，主要解决 "不必要的依赖收集" 问题，优化响应式系统的性能。
// pauseTracking()：暂停依赖追踪，此时读取响应式数据不会收集任何依赖。
// resetTracking()：恢复依赖追踪，让系统重新开始收集依赖。
// 例如处理array的shift、push、pop、unshift方法时, 使用pauseTracking避免不必要的收集; 模板中静态部分的渲染（如固定文本）不需要追踪依赖，Vue 会在处理静态内容时暂停追踪。
// 避免无关操作触发不必要的依赖关联，减少冗余更新。
// 确保只有真正需要响应数据变化的副作用被正确追踪。

// effect的pause、resume是要解决什么问题？

// onEffectCleanup是要解决什么问题？
