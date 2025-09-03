import {
  EMPTY_OBJ,
  hasChanged,
  isArray,
  isFunction,
  isObject,
  isPlainObject,
  NOOP,
} from '@pvue/shared'
import { isRef, Ref } from './ref'
import { EffectScheduler, ReactiveEffect } from './effect'
import { warn } from './warning'
import { isReactive } from './reactive'
import { SchedulerJob } from '@pvue/runtime-core'

export type OnCleanup = (cleanupFn: () => void) => void
export type WatchEffect = (onCleanup: OnCleanup) => void
export type WatchSource<T = any> = Ref<T, any> | (() => T)
export type WatchCallback<V = any, OV = any> = (value: V, oldValue: OV) => any
export type WatchScheduler = (job: () => void, isFirstRun: boolean) => void
export type WatchOptions<Immediate = boolean> = {
  immediate?: Immediate
  deep?: boolean | number
  once?: boolean
  scheduler?: EffectScheduler
  onWarn?: (msg: string, source: unknown, type: string) => void
  call?: (fn: Function | Function[], type: any, args?: unknown[]) => void

  /**
   * @internal augmentJob
   */
  augmentJob?: (job: SchedulerJob) => void
}

export type WatchStopHandler = () => void
let activeWatcher: ReactiveEffect | undefined = undefined
const cleanupMap: WeakMap<ReactiveEffect, (() => void)[]> = new WeakMap()

// 初始化的监听的值 如果是简单数据类型 那么就用一个空对象来表示
const INITIAL_WATCHER_VALUE = {}

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
): WatchHandle {
  const { immediate, deep, scheduler, call, once, augmentJob } = options

  // 标识是否强制执行WatchCallback；没有当前标识的话只有value发生变化的时候watch的回调函数才会执行
  let forceTrigger = false
  let isMultiSource = false

  const warnInvalidSource = (s: unknown) => {
    ;(options.onWarn || warn)(
      `Invalid watch source: `,
      s,
      `A watch source can only be a getter/effect function, a ref, ` +
        `a reactive object, or an array of these types.`
    )
  }

  // STAR: 处理监听reactive包裹的对象类型的数据 get的时候触发依赖收集.需要注意的是 上台的activeSub在运行接收后一定要将activeSub重置成之前的prevEffect
  // 否则在同一个事件处理过程中 可能存在effect意外的响应式数据也被收集起来了
  const reactiveGetter = (source: Object) => {
    if (deep === false) {
      return traverse(source, 1)
    }

    return traverse(source)
  }
  let getter: () => any
  let boundCleanup: typeof onWatcherCleanup
  let effect: ReactiveEffect
  let cleanup: (() => void) | undefined
  // 监听的对象可以是ref、reactive、array、function

  if (isRef(source)) {
    getter = () => source.value
  } else if (isReactive(source)) {
    getter = () => reactiveGetter(source)
    forceTrigger = true
  } else if (isArray(source)) {
    isMultiSource = true
    forceTrigger = source.some(v => isReactive(v) || isRef(v))
    // 如果说监听的source是一个array类型，对array中的每个元素进行遍历, 对ref， reactive, function类型的元素进行处理
    getter = () =>
      source.map(s => {
        if (isReactive(s)) {
          return reactiveGetter(s)
        } else if (isRef(s)) {
          return s.value
        } else if (isFunction(s)) {
          return call ? call(s, WatchErrorCodes.WATCH_GETTER) : s()
        } else {
          __DEV__ && warnInvalidSource(s)
        }
      })
  } else if (isFunction(source)) {
    if (cb) {
      getter = call
        ? () => call(source, WatchErrorCodes.WATCH_GETTER)
        : (source as () => any)
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

        // 如果是一个函数 则函数的第一个参数是boundCleanup, watch stop的时候会依次执行cleanup函数
        try {
          return call
            ? // call的参数是boundCleanup可以清除注册的cleanup函数
              call(source, WatchErrorCodes.WATCH_CALLBACK, [boundCleanup])
            : source(boundCleanup)
        } finally {
          // activeWatcher = effect
        }
      }
    }
  } else {
    getter = NOOP
    __DEV__ && warnInvalidSource(source)
  }

  if (cb && deep) {
    const baseGetter = getter
    const depth = deep === true ? Infinity : deep
    getter = () => traverse(baseGetter(), depth)
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

  // 如果source是数组 那么oldValue就用一个数组来表示, 元素都是初始化的值
  let oldValue: any = isMultiSource
    ? new Array(source).fill(INITIAL_WATCHER_VALUE)
    : INITIAL_WATCHER_VALUE

  boundCleanup = fn => onWatcherCleanup(fn, false, effect)

  effect = new ReactiveEffect(getter)

  const job = (immediateFirstRun?: boolean) => {
    if (cb) {
      const newValue = effect.run()

      if (deep || hasChanged(newValue, oldValue) || forceTrigger) {
        activeWatcher = effect
        if (cleanup) {
          cleanup()
        }
        try {
          const args = [
            newValue,
            oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue,
            boundCleanup,
          ]
          oldValue = newValue
          // @ts-ignore
          call ? call(cb, WatchErrorCodes.WATCH_CALLBACK, args) : cb(...args)
        } finally {
          activeWatcher = effect
        }
      }
    } else {
      // watchEffect
      effect.run()
    }
  }

  effect.scheduler = scheduler ? () => scheduler(job, false) : job

  cleanup = effect.onStop = () => {
    const cleanups = cleanupMap.get(effect)
    if (cleanups) {
      if (call) {
        call(cleanups, WatchErrorCodes.WATCH_CLEANUP)
      } else {
        for (const cleanup of cleanups) cleanup()
      }
      // 这里需要注意的是cleanup执行完成 需要从cleanMap中移除掉，下次响应式数据发生变化的时候，会重新收集依赖
      cleanupMap.delete(effect)
    }
  }

  if (augmentJob) {
    augmentJob(job)
  }

  if (cb) {
    if (immediate) {
      // 如果指定了immediate callback需要立即执行
      job()
    } else {
      oldValue = effect.run()
    }
  } else if (scheduler) {
    // 如果指定了scheduler 那么就用scheduler来执行job
    scheduler(job.bind(null, true), true)
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

/**
 * 深度遍历一个值，处理对象循环引用
 * @param value - 要遍历的值
 * @param depth - 最大遍历深度，默认为Infinity
 * @param seen - 已遍历对象的集合，用于检测循环引用
 * @returns 原始值
 */
export function traverse(
  value: unknown,
  depth: number = Infinity,
  seen?: Set<unknown>
) {
  if (depth <= 0 || !isObject(value)) {
    return value
  }

  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  depth--
  if (isRef(value)) {
    traverse(value.value, depth, seen)
  }

  // 深度track数组中的元素，收集数组中元素的依赖
  else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], depth, seen)
    }
  }
  // 监听对象变化
  else if (isPlainObject(value)) {
    for (const key in value) {
      // get操作会触发依赖收集 从而使触发响应key更新时候 会触发scheduler执行
      traverse(value[key], depth, seen)
    }
  }

  return value
}
