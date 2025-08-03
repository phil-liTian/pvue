import { def, toRawType } from '@pvue/shared'
import { ReactiveFlags } from './constants'
import { mutableHandlers, shallowMutableHandlers } from './baseHandlers'
import {
  mutableCollectionHandlers,
  shallowCollectionHandlers,
} from './collectionHandlers'

export const reactiveMap: WeakMap<Target, any> = new WeakMap<Target, any>()
export const shallowReactiveMap: WeakMap<Target, any> = new WeakMap<
  Target,
  any
>()

export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.RAW]?: boolean
}

export type Reactive<T> = {} & T
export type Raw<T> = T

enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2,
}

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}

function getTargetType(value: Target) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value))
}

export function reactive<T extends Object>(target: T): Reactive<T>

export function reactive(target: Object) {
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  )
}

export function shallowReactive(target: Object) {
  return createReactiveObject(
    target,
    false,
    shallowMutableHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  )
}

export function isReactive(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}

export function isShallow(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW])
}

function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandler: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {
  // 如果本来就是reactive对象, 再使用reactive包裹时, 直接返回原对象
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }

  // 如果多次将相同对象处理成响应式对象 则返回相同的代理对象,而不是新建一个代理对象
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  const targetType = getTargetType(target)

  if (targetType === TargetType.INVALID) {
    return target
  }

  // set、map、weakMap、weakSet 走collectionHandlers逻辑
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandler
  )

  proxyMap.set(target, proxy)

  return proxy
}

export function toRaw<T>(observed: T): T {
  const raw = observed && ((observed as Target)[ReactiveFlags.RAW] as T)
  return raw ? toRaw(raw) : observed
}

// 标记一个对象，使其永远不会被转换为响应式对象 。
export function markRaw<T extends Object>(value: T): Raw<T> {
  if (Object.isExtensible(value)) {
    // 可拓展
    def(value, ReactiveFlags.SKIP, true)
  }

  return value
}

export function isProxy(value: any): boolean {
  return value ? !!value[ReactiveFlags.RAW] : false
}
