import { def, hasOwn, isObject, toRawType } from '@pvue/shared'
import { ReactiveFlags } from './constants'
import {
  mutableHandlers,
  readonlyHandlers,
  shallowMutableHandlers,
  shallowReadonlyHandlers,
} from './baseHandlers'
import {
  mutableCollectionHandlers,
  readonlyCollectionHandlers,
  shallowCollectionHandlers,
  shallowReadonlyCollectionHandlers,
} from './collectionHandlers'

export const reactiveMap: WeakMap<Target, any> = new WeakMap<Target, any>()
export const shallowReactiveMap: WeakMap<Target, any> = new WeakMap<
  Target,
  any
>()
export const readonlyMap: WeakMap<Target, any> = new WeakMap<Target, any>()
export const shallowReadonlyMap: WeakMap<Target, any> = new WeakMap<
  Target,
  any
>()

export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.RAW]?: boolean
  [ReactiveFlags.IS_SHALLOW]?: boolean
}

export type Reactive<T> = {} & T
export type Raw<T> = T

enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2,
}

/**
 * 根据对象的类型确定其响应式类型
 * @param rawType 对象的类型
 * @returns 对象的响应式类型
 */
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

/**
 * 确定目标对象的响应式类型
 * @param value 要检查的目标对象
 * @returns 目标对象的响应式类型
 */
function getTargetType(value: Target) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value))
}

export function reactive<T extends Object>(target: T): Reactive<T>

/**
 * 创建一个响应式对象
 * @param target 目标对象
 * @returns 响应式代理对象
 */
export function reactive(target: Object) {
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  )
}

/**
 * 创建一个浅层响应式对象，只有对象的第一层属性是响应式的
 * @param target 目标对象
 * @returns 浅层响应式代理对象
 */
export function shallowReactive(target: Object) {
  return createReactiveObject(
    target,
    false,
    shallowMutableHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  )
}

/**
 * 创建一个只读的响应式对象
 * @param target 目标对象
 * @returns 只读的响应式代理对象
 */
export function readonly(target: Object) {
  return createReactiveObject(
    target,
    true,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap
  )
}

/**
 * 创建一个浅层只读的响应式对象
 * @param target 目标对象
 * @returns 浅层只读的响应式代理对象
 */
export function shallowReadonly(target: Object) {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap
  )
}

/**
 * 将值转换为响应式对象
 * @param value 要转换的值
 * @returns 如果值是对象则返回响应式对象，否则返回原值
 */
export function toReactive<T extends unknown>(value: T) {
  return isObject(value) ? reactive(value) : value
}

/**
 * 检查一个值是否为响应式对象
 * @param value - 要检查的值
 * @returns 如果值是响应式对象则返回true，否则返回false
 */
export function isReactive(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}

/**
 * 检查一个值是否为浅响应式对象
 * @param value - 要检查的值
 * @returns 如果值是浅响应式对象则返回true，否则返回false
 */
export function isShallow(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW])
}

/**
 * 检查一个值是否为只读响应式对象
 * @param value - 要检查的值
 * @returns 如果值是只读响应式对象则返回true，否则返回false
 */
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY])
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

  const targetType = getTargetType(target)
  // 对象里面有skip 则认为是无效target 不做响应式处理
  if (targetType === TargetType.INVALID) {
    return target
  }

  // 如果多次将相同对象处理成响应式对象 则返回相同的代理对象,而不是新建一个代理对象
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // set、map、weakMap、weakSet 走collectionHandlers逻辑
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandler
  )

  proxyMap.set(target, proxy)

  return proxy
}

/**
 * 将响应式对象转换为原始对象
 * @param observed 响应式对象
 * @returns 原始对象
 */
export function toRaw<T>(observed: T): T {
  const raw = observed && ((observed as Target)[ReactiveFlags.RAW] as T)
  return raw ? toRaw(raw) : observed
}

/**
 * 将对象标记为"原始"，使其不会被转换为响应式对象
 * @param value 要标记的对象
 * @returns 原始对象
 */
export function markRaw<T extends Object>(value: T): Raw<T> {
  if (Object.isExtensible(value) && !hasOwn(value, ReactiveFlags.SKIP)) {
    // 可拓展
    def(value, ReactiveFlags.SKIP, true)
  }

  return value
}

/**
 * 检查一个值是否为代理对象
 * @param value - 要检查的值
 * @returns 如果值是代理对象则返回true，否则返回false
 */
export function isProxy(value: any): boolean {
  return value ? !!value[ReactiveFlags.RAW] : false
}

export function toReadonly(value) {
  isObject(value) ? readonly(value) : value
}
