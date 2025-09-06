import { extend, hasChanged } from '@pvue/shared'
import { Dep, Link, globalVersion } from './dep'
import { activeEffectScope } from './effectScope'
import { ComputedRefImpl } from './computed'

export type EffectScheduler = (...args: any[]) => any
export let activeSub
let batchedSub: Subscriber | undefined
let batchedComputed: Subscriber | undefined
let batchDepth = 0
export interface Subscriber {
  deps?: Link
  depsTail?: Link
  flags: EffectFlags
  next?: Subscriber
  notify(): true | void
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

  constructor(public fn: () => T) {
    if (activeEffectScope && activeEffectScope.active) {
      activeEffectScope.effects.push(this)
    }
  }

  run() {
    // stop 之后的 fn 就不是active类型的, 这时如果再次触发trigger
    if (!(this.flags & EffectFlags.ACTIVE)) {
      return this.fn()
    }
    // TODO
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
    if (this.scheduler) {
      this.scheduler()
    } else {
      this.runIfDirty()
    }
  }
}

export interface ReactiveEffectOptions {
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
    const prev = link.prevDep
    head = link
    link.dep.activeLink = link.prevActiveLink
    link.prevActiveLink = undefined

    link = prev
  }
}

function removeSub(link: Link) {
  const { dep } = link

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
