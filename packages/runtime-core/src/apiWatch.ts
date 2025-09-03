/*
 * @Author: phil
 * @Date: 2025-09-01 12:52:07
 */
import {
  watch as baseWatch,
  WatchCallback,
  type WatchOptions as BaseWatchOptions,
  type WatchEffect,
  type WatchSource,
} from '@pvue/reactivity'
import { EMPTY_OBJ, extend } from '@pvue/shared'
import { callWithAsyncErrorHandling } from './errorHandling'
import { currentInstance } from './component'
import { queueJob, SchedulerJob, SchedulerJobFlags } from './scheduler'
import { queuePostRenderEffect } from './renderer'

export interface WatchEffectOptions {
  flush?: 'pre' | 'post' | 'sync'
}

export interface WatchOptions<Immediate = boolean> extends WatchEffectOptions {
  immediate?: Immediate
  once?: boolean
  deep?: boolean | number
}

function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect,
  cb: WatchCallback | null,
  options: WatchOptions = EMPTY_OBJ
) {
  const { flush } = options
  const baseWatchOptions: BaseWatchOptions = extend({}, options)

  const instance = currentInstance
  baseWatchOptions.call = (fn, type, args) => {
    return callWithAsyncErrorHandling(fn, instance, type, args)
  }

  let isPre = false
  if (flush === 'post') {
    baseWatchOptions.scheduler = job => {
      queuePostRenderEffect(job)
    }
  }

  // watch监听的回调函数 不应该立即执行, 应该的微任务列表中执行
  else if (flush !== 'sync') {
    isPre = true
    baseWatchOptions.scheduler = (job, isFirstRun) => {
      if (isFirstRun) {
        job()
      } else {
        queueJob(job)
      }
    }
  }

  // STAR: 如果有callBack 当监听的source多次发生变化时, callBack会重复执行, 需要将job设置成ALLOW_RECURSE类型,这样job执行完后，
  // 又会被标记成为入队状态, 这样就可以实现每次value变化，job都会入队
  baseWatchOptions.augmentJob = (job: SchedulerJob) => {
    if (cb) {
      job.flags! |= SchedulerJobFlags.ALLOW_RECURSE
    }

    if (isPre) {
      job.flags! |= SchedulerJobFlags.PRE
    }
  }

  const watchHandle = baseWatch(source, cb, baseWatchOptions)

  return watchHandle
}

export function watch<T>(
  source: T | WatchSource<T>,
  cb: any,
  options?: WatchOptions
) {
  return doWatch(source as any, cb, options)
}

export function watchEffect(effect: WatchEffect, options?: WatchEffectOptions) {
  return doWatch(effect, null, options)
}

export function watchPostEffect(
  effect: WatchEffect,
  options?: WatchEffectOptions
) {
  return doWatch(effect, null, { ...options, flush: 'post' })
}

export function watchSyncEffect(
  effect: WatchEffect,
  options?: WatchEffectOptions
) {
  return doWatch(effect, null, { ...options, flush: 'sync' })
}
/**
 * 1. deep实现核心逻辑：traverse 进行遍历, 遍历到的元素会被track, 当遍历到的元素发生变化时, 会触发scheduler执行
 * 2. watch的source发生变化，相同的job的不会入队, 需要将job的flags设置成ALLOW_RECURSE,这样相同的job就会重复入队
 * 3. 当watch的source是数组时, 会遍历数组中的每个元素, 每个元素会被track, 当元素发生变化时, 会触发scheduler执行
 * 4. flush: post 可以在回调函数里面拿到更新后的dom结构。需要注意的是：组件挂载是同步执行的，而watch的回调函数是通过queuePostRenderEffect处理的，会放到pendingPostFlushCbs中，自动执行的会是一个异步任务,所以在render函数的最后会通过flushPostFlushCbs执行pendingPostFlushCbs的回调函数
 */
