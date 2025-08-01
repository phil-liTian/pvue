import { ReactiveFlags } from './constants'
import { mutableHandlers } from './baseHandlers'
import { mutableCollectionHandlers } from './collectionHandlers'

export const reactiveMap: WeakMap<Target, any> = new WeakMap<Target, any>()
export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean
}

export type Reactive<T> = {} & T

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

export function isReactive(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}

function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandler: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {
  return new Proxy(target, baseHandler)
}
