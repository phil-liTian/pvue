/*
 * @Author: phil
 * @Date: 2025-08-01 20:46:48
 */

import { extend, hasOwn } from '@pvue/shared'
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from './constants'
import { Target, toRaw, toReactive } from './reactive'
import { track, trigger } from './dep'

type CollectionTypes = IterableCollections | WeakCollections
type IterableCollections = Map<any, any> | Set<any>
type WeakCollections = WeakMap<any, any> | WeakSet<any>
type SetTypes = (Set<any> | WeakSet<any>) & Target
type MapTypes = (Map<any, any> | WeakMap<any, any>) & Target

const getProto = <T extends CollectionTypes>(v: T): any =>
  Reflect.getPrototypeOf(v)

function createIterableMethod(method) {
  return function (this, ...args) {
    const target = this[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const innerIterator = target[method](...args)

    return {
      next() {
        const { value, done } = innerIterator.next()
        return { value, done }
      },
    }
  }
}

function createInstrumentations(readonly: boolean, shallow: boolean) {
  const instrumentations = {
    get(this, key: unknown) {
      const target = this[ReactiveFlags.RAW]
      const rawTarget = toRaw(target)
      const rawKey = toRaw(key)
      if (!readonly) {
        track(rawTarget, TrackOpTypes.GET, rawKey)
      }

      const { has } = getProto(rawTarget)

      const wrap = toReactive
      // set、map、weakSet、weakMap的value会自动转换成响应式对象
      if (has.call(rawTarget, key)) {
        return wrap(target.get(key))
      }

      if (key === ReactiveFlags.IS_SHALLOW) {
        return shallow
      }

      const res = target.get(key)

      return res
    },

    has(this, key): boolean {
      const target = this[ReactiveFlags.RAW]
      return target.has(key)
    },
  }

  extend(
    instrumentations,
    readonly
      ? {}
      : {
          set(this: MapTypes, key: unknown, value: unknown) {
            // console.log('this', this, key, value)
            const target = toRaw(this)
            target.set(key, value)
            trigger(target, TriggerOpTypes.SET, key, value)

            return this
          },

          add(this: SetTypes, value) {
            const target = toRaw(this)

            const proto = getProto(target)
            const hadKey = proto.has.call(target, value)
            if (!hadKey) {
              target.add(value)
            }

            return this
          },
        }
  )

  // 处理for...of key是 Symbol.iterator

  const iteratorMethods = [Symbol.iterator]

  iteratorMethods.map(item => {
    instrumentations[item] = createIterableMethod(item)
  })

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
