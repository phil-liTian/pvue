import { extend } from '@pvue/shared'
import { Dep, Link } from './dep'

export let activeSub
let batchedSub: Subscriber | undefined
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

function batch(sub) {
  sub.flags |= EffectFlags.NOTIFIED
  // batchedSub为将最新的sub添加到链表的最前面的结果
  sub.next = batchedSub
  batchedSub = sub
}

export function startBatch() {
  batchDepth++
}

export function endBatch() {
  if (--batchDepth > 0) return

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
  onStop?: () => void

  constructor(public fn: () => T) {}

  run() {
    // stop 之后的 fn 就不是active类型的, 这时如果再次触发trigger
    if (!(this.flags & EffectFlags.ACTIVE)) {
      return this.fn()
    }

    // 这是需要收集的effect
    this.flags |= EffectFlags.RUNNING
    activeSub = this
    try {
      this.fn()
    } finally {
      cleanupDeps(this)
      this.flags &= ~EffectFlags.RUNNING
    }
  }

  stop() {
    if (this.flags & EffectFlags.ACTIVE) {
      // active 的 effect才可以停止
      // this.dep.clear()
      // this.deps?.dep = new Link({}, {})

      for (let link = this.deps; link; link = link.nextDep) {}

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
    this.run()
  }
}

export interface ReactiveEffectOptions {
  onStop?: () => void
}

export interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
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

  while (link) {
    const prev = link.prevDep

    link.dep.activeLink = link.prevActiveLink
    link.prevActiveLink = undefined

    link = prev
  }
}
