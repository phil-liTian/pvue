import { EMPTY_OBJ, isFunction, NOOP } from '@pvue/shared'
import { isRef, Ref } from './ref'
import { EffectScheduler, ReactiveEffect } from './effect'
import { warn } from './warning'
import { isReactive } from './reactive'

export type OnCleanup = (cleanupFn: () => void) => void
export type WatchEffect = (onCleanup: OnCleanup) => void
export type WatchSource<T = any> = Ref<T, any> | (() => T)
export type WatchCallback<V = any, OV = any> = (value: V, oldValue: OV) => any
export type WatchOptions<Immediate = boolean> = {
  immediate?: Immediate
  deep?: boolean | number
  once?: boolean
  scheduler?: EffectScheduler
  call?: (fn: Function | Function[], type: any, args?: unknown[]) => void
}

export type WatchStopHandler = () => void
let activeWatcher: ReactiveEffect | undefined = undefined
const cleanupMap: WeakMap<ReactiveEffect, (() => void)[]> = new WeakMap()

export interface WatchHandle extends WatchStopHandler {
  pause: () => void
  resume: () => void
  stop: () => void
}

export enum WatchErrorCodes {
  WATCH_GETTER = 2,
  WATCH_CALLBACK,
  WATCH_CLEANUP,
}

export function watch(
  source: object | WatchSource | WatchSource[] | WatchEffect,
  cb?: null | WatchCallback,
  options: WatchOptions = EMPTY_OBJ
) {
  const { immediate, deep, scheduler, call, once } = options
  let getter: () => any
  let boundCleanup: typeof onWatcherCleanup
  let effect: ReactiveEffect
  let cleanup: (() => void) | undefined
  // 监听的对象可以是ref、reactive、array、function
  if (isRef(source)) {
    getter = () => source.value
  } else if (isReactive(source)) {
    getter = NOOP
  } else if (isFunction(source)) {
    if (cb) {
      getter = () => {
        return source(boundCleanup)
      }
    } else {
      getter = () => {
        if (cleanup) {
          try {
            cleanup()
          } finally {
          }
        }

        // source是function时 也可以收集cleanup
        activeWatcher = effect

        try {
          return call
            ? call(source, WatchErrorCodes.WATCH_CALLBACK, [])
            : source(boundCleanup)
        } finally {
        }
      }
    }
  } else {
    getter = NOOP
  }

  const watchHandle: WatchHandle = () => {
    effect.stop()
  }

  // 只监听一次就停止监听
  if (once && cb) {
    const _cb = cb
    cb = (...args) => {
      _cb(...args)
      watchHandle()
    }
  }

  boundCleanup = fn => onWatcherCleanup(fn, false, effect)

  effect = new ReactiveEffect(getter)

  const job = () => {
    if (cb) {
      activeWatcher = effect
      call ? call(cb, WatchErrorCodes.WATCH_CALLBACK, []) : cb(1, 2)
    } else {
      effect.run()
    }
  }

  effect.scheduler = scheduler ? () => {} : job

  cleanup = effect.onStop = () => {
    const cleanups = cleanupMap.get(effect)
    if (cleanups) {
      if (call) {
        call(cleanups, WatchErrorCodes.WATCH_CLEANUP)
      } else {
        for (const cleanup of cleanups) cleanup()
      }
    }
  }

  if (cb) {
    effect.run()
  } else {
    effect.run()
  }

  watchHandle.pause = () => {}
  watchHandle.resume = () => {}
  watchHandle.stop = watchHandle

  return watchHandle
}

// 这个方法中的cleanupFn会在 effect执行stop的时候执行，利用的就是effect中的stop方法
export function onWatcherCleanup(
  cleanupFn: () => void,
  failSilently = false,
  owner: ReactiveEffect | undefined = activeWatcher
) {
  if (owner) {
    let cleanups = cleanupMap.get(owner)
    if (!cleanups) cleanupMap.set(owner, (cleanups = []))
    cleanups.push(cleanupFn)
  } else if (!failSilently) {
    warn(
      `onWatcherCleanup() was called when there was no active watcher` +
        ` to associate with.`
    )
  }
}
