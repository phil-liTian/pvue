/*
 * @Author: phil
 * @Date: 2025-08-12 18:04:55
 */
import { isArray } from '@pvue/shared'
import { ComponentInternalInstance } from './component'
import { callWithErrorHandling, ErrorCodes } from './errorHandling'

export enum SchedulerJobFlags {
  QUEUED = 1 << 0,
  PRE = 1 << 1,
  ALLOW_RECURSE = 1 << 2,
  DISPOSED = 1 << 3,
}

const queue: SchedulerJob[] = []
let currentFlushPromise: Promise<void> | null = null
let pendingPostFlushCbs: SchedulerJob[] = []
let flushIndex = -1

export interface SchedulerJob extends Function {
  id?: number

  flags?: SchedulerJobFlags

  i?: ComponentInternalInstance
}

export type SchedulerJobs = SchedulerJob | SchedulerJob[]

function getId(job: SchedulerJob) {
  return job.id == null
    ? job.flags! & SchedulerJobFlags.PRE
      ? -1
      : Infinity
    : job.id
}

// this: 在运行时JavaScript中并不存在这个参数，它只在编译阶段用于类型检查。
export function nextTick<T = void, R = void>(
  this: T,
  fn?: (this: T) => R
): Promise<R> {
  // 打印当前函数的this上下文和传入的回调函数fn

  // 创建一个已解决状态的Promise对象，用于实现微任务队列的异步执行
  const p = currentFlushPromise || Promise.resolve()

  // 根据是否传入回调函数fn来决定返回值：
  // 1. 如果传入了fn，则在Promise解决后执行该回调函数，并确保回调函数的this指向正确
  // 2. 如果没有传入fn，则直接返回Promise对象
  return fn ? p.then(this ? fn.bind(this) : fn) : p
}

// 二分查找
function findInsertionIndex(id: number) {
  let start = flushIndex + 1
  let end = queue.length

  while (start < end) {
    // 对于正整数而言 这里就相当于除以2 向下取整 类似于Math.floor(x / 2)
    const middle = (start + end) >>> 1
    const middleJob = queue[middle]
    const middleJobId = getId(middleJob)

    // middleJobId === id 即id相同 并且中间的Job是PRE 则需要将start移动到middle + 1
    // 后加入的pre job, 在原pre job的后面
    // 都是pre job 有id的在没id的前面执行
    if (
      middleJobId < id ||
      (middleJobId === id && middleJob.flags! & SchedulerJobFlags.PRE)
    ) {
      start = middle + 1
    } else {
      end = middle
    }
  }

  return start
}

export function queueJob(job: SchedulerJob): void {
  if (!(job.flags! & SchedulerJobFlags.QUEUED)) {
    const jobId = getId(job)
    const lastJob = queue[queue.length - 1]

    // 这里需要根据id来控制job的排序 id 越小 越靠前
    if (
      !lastJob ||
      (!(job.flags! & SchedulerJobFlags.PRE) && jobId >= getId(lastJob))
    ) {
      // 没有入队
      queue.push(job)
    } else {
      // 根据id来动态控制job的排序
      // let i = queue.length - 1
      // while (i > 0 && getId(queue[i - 1]) > jobId) {
      //   i--
      // }
      queue.splice(findInsertionIndex(jobId), 0, job)
    }

    job.flags! |= SchedulerJobFlags.QUEUED

    queueFlush()
  }
}

// 执行job
function flushJobs() {
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]

      // DISPOSED 的job不执行
      if (job && !(job.flags! & SchedulerJobFlags.DISPOSED)) {
        // 如果job flags设置了ALLOW_RECURSE 则表示可以自己触发自己
        if (job.flags! & SchedulerJobFlags.ALLOW_RECURSE) {
          job.flags! &= ~SchedulerJobFlags.QUEUED
        }

        callWithErrorHandling(job, job.i, ErrorCodes.SCHEDULER)
      }
    }
  } finally {
    // 如果放到这里 第二次再收集的时候会造成死循环
    // currentFlushPromise = null
    // 重置数据
    flushIndex = -1
    queue.length = 0
    // 执行queuePostFlushCb里面收集的回调函数
    flushPostFlushCbs()
    // 第二次再收集的时候
    currentFlushPromise = null

    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs()
    }
  }
}

//  更新nextTick中中的promise
function queueFlush() {
  if (!currentFlushPromise) {
    currentFlushPromise = Promise.resolve().then(flushJobs)
  }
}

/**
 * 刷新后置刷新回调队列
 *
 * 执行所有待处理的后置刷新回调函数，确保去重并按ID排序
 * 执行过程中会清空原队列，并处理回调函数的递归标志
 */
export function flushPostFlushCbs(): void {
  if (pendingPostFlushCbs?.length) {
    // 去重 并且根据id来排序
    const deduped = [...new Set(pendingPostFlushCbs)].sort(
      (a, b) => getId(a) - getId(b)
    )
    pendingPostFlushCbs.length = 0

    for (
      let postFlushIndex = 0;
      postFlushIndex < deduped.length;
      postFlushIndex++
    ) {
      const cb = deduped[postFlushIndex]

      if (cb.flags! & SchedulerJobFlags.ALLOW_RECURSE) {
        cb.flags! &= ~SchedulerJobFlags.QUEUED
      }

      cb()
    }
  }
}

/**
 * 刷新预刷新回调队列
 * @param i 开始刷新的索引，默认为flushIndex + 1
 * @description 执行队列中从索引i开始的所有任务，执行过程中会从队列中移除已执行的任务，并重置允许递归任务的状态
 */
export function flushPreFlushCbs(i: number = flushIndex + 1): void {
  for (; i < queue.length; i++) {
    const job = queue[i]
    // 删除queue中第i个元素后, queue数组变短, i也要减1
    queue.splice(i, 1)
    i--
    // flushPreFlushCbs 会将ALLOW_RECURSE的job 重置为未入队状态
    if (job.flags! & SchedulerJobFlags.ALLOW_RECURSE) {
      job.flags! &= ~SchedulerJobFlags.QUEUED
    }
    job()
  }
}

/**
 * 将回调函数添加到后置刷新队列中
 * @param cb 要执行的回调函数或回调函数数组
 */
export function queuePostFlushCb(cb: SchedulerJobs): void {
  if (!isArray(cb)) {
    if (!(cb.flags! & SchedulerJobFlags.QUEUED)) {
      pendingPostFlushCbs.push(cb)
      cb.flags! |= SchedulerJobFlags.QUEUED
    }
  } else {
    pendingPostFlushCbs.push(...cb)
  }

  queueFlush()
}
