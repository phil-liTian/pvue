import { ComponentInternalInstance } from './component'

export enum SchedulerJobFlags {
  QUEUED = 1 << 0,
  PRE = 1 << 1,
  ALLOW_RECURSE = 1 << 2,
  DISPOSED = 1 << 3,
}

export interface SchedulerJob extends Function {
  id?: number

  flags?: SchedulerJobFlags

  i?: ComponentInternalInstance
}

// this: 在运行时JavaScript中并不存在这个参数，它只在编译阶段用于类型检查。
export function nextTick<T = void, R = void>(this: T, fn?: (this: T) => R) {
  // 打印当前函数的this上下文和传入的回调函数fn

  // 创建一个已解决状态的Promise对象，用于实现微任务队列的异步执行
  const p = Promise.resolve()

  // 根据是否传入回调函数fn来决定返回值：
  // 1. 如果传入了fn，则在Promise解决后执行该回调函数，并确保回调函数的this指向正确
  // 2. 如果没有传入fn，则直接返回Promise对象
  return fn ? p.then(this ? fn.bind(this) : fn) : p
}

export function queueJob(job: SchedulerJob): void {}
