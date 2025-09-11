import { TrackOpTypes } from './constants'
import { ARRAY_ITERATE_KEY, track } from './dep'
import { startBatch, endBatch, pauseTracking } from './effect'
import { isProxy, isShallow, toRaw, toReactive } from './reactive'

function searchProxy(
  self: unknown[],
  method: keyof Array<any>,
  args: unknown[]
) {
  const arr = toRaw(self) as any
  track(arr, TrackOpTypes.ITERATE, ARRAY_ITERATE_KEY)
  const res = arr[method](...args)

  // 只有当args[0] 是proxy对象的时候 才有可能执行多次
  if ((res === -1 || res === false) && isProxy(args[0])) {
    args[0] = toRaw(args[0])
    return arr[method](...args)
  }

  return res
}

export function reactiveReadArray<T>(array: T[]): T[] {
  const raw = toRaw(array)
  if (raw === array) return raw
  track(raw, TrackOpTypes.ITERATE, ARRAY_ITERATE_KEY)

  // raw是shallow类型的话 则对每一个元素不深度监听
  return isShallow(raw) ? raw : raw.map(toReactive)
}

export const arrayInstrumentations = <any>{
  //
  __proto__: null,
  join(separator?: string) {
    return reactiveReadArray(this).join(separator)
  },

  unshift(...args: unknown[]) {
    return noTracking(this, 'unshift', args)
  },

  shift() {
    return noTracking(this, 'shift')
  },

  indexOf(...args: unknown[]) {
    return searchProxy(this, 'indexOf', args)
  },

  includes(...args: unknown[]) {
    return searchProxy(this, 'includes', args)
  },

  lastIndexOf(...args: unknown[]) {
    return searchProxy(this, 'lastIndexOf', args)
  },

  splice(...args: unknown[]) {
    return noTracking(this, 'splice', args)
  },

  push(...args: unknown[]) {
    return noTracking(this, 'push', args)
  },

  pop() {
    return noTracking(this, 'pop')
  },
}

function noTracking(
  self: unknown[],
  method: keyof Array<any>,
  args: unknown[] = []
) {
  pauseTracking()
  startBatch()
  const res = (toRaw(self) as any)[method].apply(self, args)
  endBatch()
  return res
}

// shift 执行过程
// [1, 2, 3]

// get：length -> '0' -> has('1') -> '1' -> has('2') -> '2'

// set: 0: 2 -> 1: 3 -> length: 2

// delete: 2
