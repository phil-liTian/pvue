/*
 * @Author: phil
 * @Date: 2025-08-01 20:46:48
 */

import { extend, hasOwn } from '@pvue/shared'
import { ReactiveFlags } from './constants'
import { toRaw, toReactive } from './reactive'

type CollectionTypes = IterableCollections | WeakCollections
type IterableCollections = Map<any, any> | Set<any>
type WeakCollections = WeakMap<any, any> | Set<any>

const getProto = <T extends CollectionTypes>(v: T): any =>
  Reflect.getPrototypeOf(v)

function createInstrumentations(readonly: boolean, shallow: boolean) {
  const instrumentations = {
    get(this, key: unknown) {
      const target = this[ReactiveFlags.RAW]
      const rawTarget = toRaw(target)

      const { has } = getProto(rawTarget)
      const wrap = toReactive
      // set、map、weakSet、weakMap的value会自动转换成响应式对象
      if (has.call(rawTarget, key)) {
        return wrap(target.get(key))
      }

      if (key === ReactiveFlags.IS_SHALLOW) {
        return shallow
      }

      return target.get(key)
    },
  }

  extend(
    instrumentations,
    readonly
      ? {}
      : {
          set(this, key: unknown, value: unknown) {
            // console.log('this', this, key, value)
            const target = toRaw(this)
            target.set(key, value)
          },
        }
  )

  return instrumentations
}

function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  const instrumentations = createInstrumentations(isReadonly, shallow)
  return (target, key, receiver) => {
    if (key === ReactiveFlags.RAW) {
      return target
    } else if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    }

    // console.log('hasown', target, key, hasOwn(instrumentations, key))

    // 这里因为proxy代理的对象没有Map、Set、WeakMap、WeakSet 上面的一些方法, 所以这里判断如果没有的话, 就用instrumentations对象里面的方法处理

    return Reflect.get(
      hasOwn(instrumentations, key) ? instrumentations : target,
      key,
      receiver
    )
  }
}

// reactive
export const mutableCollectionHandlers: ProxyHandler<any> = {
  get: createInstrumentationGetter(false, false),
}

// shallowReactive
export const shallowCollectionHandlers: ProxyHandler<any> = {
  get: createInstrumentationGetter(false, true),
}

// readonly
export const readonlyCollectionHandlers: ProxyHandler<any> = {
  get: createInstrumentationGetter(true, false),
}

// shallowReadonly
export const shallowReadonlyCollectionHandlers: ProxyHandler<any> = {
  get: createInstrumentationGetter(true, true),
}
