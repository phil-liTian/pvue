/*
 * @Author: phil
 * @Date: 2025-08-01 20:46:48
 */

import {
  capitalize,
  extend,
  hasChanged,
  hasOwn,
  isMap,
  toRawType,
} from '@pvue/shared'
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from './constants'
import {
  isReadonly,
  isShallow,
  Target,
  toRaw,
  toReactive,
  toReadonly,
} from './reactive'
import { ITERATE_KEY, MAP_KEY_ITERATE_KEY, track, trigger } from './dep'
import { warn } from './warning'

type CollectionTypes = IterableCollections | WeakCollections
type IterableCollections = Map<any, any> | Set<any>
type WeakCollections = WeakMap<any, any> | WeakSet<any>
type SetTypes = (Set<any> | WeakSet<any>) & Target
type MapTypes = (Map<any, any> | WeakMap<any, any>) & Target

const toShallow = <T extends unknown>(value: T): T => value

const getProto = <T extends CollectionTypes>(v: T): any =>
  Reflect.getPrototypeOf(v)

function createReadonlyMethod(type: TriggerOpTypes): Function {
  return function (this, ...args: unknown[]) {
    if (__DEV__) {
      console.log('args', args)
      const key = args[0] ? `on key "${args[0]}" ` : ''

      warn(
        `${capitalize(type)} operation ${key}failed: target is readonly.`,
        toRaw(this)
      )

      // const key
    }
  }
}

function createIterableMethod(method, isReadonly: boolean, isShallow: boolean) {
  return function (this, ...args) {
    const target = this[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    //
    const targetIsMap = isMap(rawTarget)

    const innerIterator = target[method](...args)

    // 是Map的keys方法
    const isKeyOnly = method === 'keys' && targetIsMap

    track(
      rawTarget,
      TrackOpTypes.ITERATE,
      isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
    )

    // const wrap = isReadonly ? toReadonly : isShallow ? toShallow : toReactive
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive

    return {
      next() {
        const { value, done } = innerIterator.next()
        return { value: wrap(value), done }
      },
      [Symbol.iterator]() {
        return this
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
        // 如果说rawKey和key有变化，也需要收集key的变化;也就是说如果map的key是一个响应式对象, 那么进行依赖收集的时候，需要同时收集key和rawKey两个依赖
        if (hasChanged(rawKey, key)) {
          track(rawTarget, TrackOpTypes.GET, key)
        }

        track(rawTarget, TrackOpTypes.GET, rawKey)
      }

      const { has } = getProto(rawTarget)

      const wrap = shallow ? toShallow : readonly ? toReadonly : toReactive
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

      const rawKey = toRaw(key)

      if (hasChanged(key, rawKey)) {
        track(target, TrackOpTypes.HAS, key)
      }
      track(target, TrackOpTypes.HAS, rawKey)

      return rawKey === key
        ? target.has(rawKey)
        : target.has(key) || target.has(rawKey)
    },

    get size() {
      const target = this[ReactiveFlags.RAW]
      // 收集size的依赖, get size的key与set的key不同 如何处理？？
      track(target, TrackOpTypes.ITERATE, ITERATE_KEY)

      return Reflect.get(target, 'size')
    },

    forEach(this: IterableCollections, callback: Function, thisArgs) {
      const observed = this
      const target = observed[ReactiveFlags.RAW]
      const rawTarget = toRaw(target)
      const wrap = shallow ? toShallow : readonly ? toReadonly : toReactive

      track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
      return target.forEach((value, key) => {
        return callback.call(thisArgs, wrap(value), wrap(key), this)
      })
    },
  }

  extend(
    instrumentations,
    readonly
      ? {
          // 只读的话, 不可增、删、改、清空
          set: createReadonlyMethod(TriggerOpTypes.SET),
          delete: createReadonlyMethod(TriggerOpTypes.DELETE),
          clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
          add: createReadonlyMethod(TriggerOpTypes.ADD),
        }
      : {
          set(this: MapTypes, key: unknown, value: unknown) {
            // 处理value 如果value是响应式对象, 那么需要转换成原始对象
            if (!shallow && !isShallow(value) && !isReadonly(value)) {
              value = toRaw(value)
            }

            // console.log('this', this, key, value)
            const target = toRaw(this)
            const { has, get } = getProto(target)
            let hadKey = has.call(target, key)

            if (!hadKey) {
            } else if (__DEV__) {
              checkIdentityKeys(target, has, key)
            }

            const oldValue = get.call(target, key)
            target.set(key, value)

            if (!hadKey) {
              trigger(target, TriggerOpTypes.ADD, key, value)
            } else if (hasChanged(oldValue, value)) {
              trigger(target, TriggerOpTypes.SET, key, value)
            }

            return this
          },

          add(this: SetTypes, value) {
            if (!shallow && !isShallow(value) && !isReadonly(value)) {
              value = toRaw(value)
            }

            const target = toRaw(this)

            const proto = getProto(target)
            const hadKey = proto.has.call(target, value)
            if (!hadKey) {
              target.add(value)
              trigger(target, TriggerOpTypes.ADD, value)
            }

            return this
          },

          delete(this: SetTypes, key) {
            const target = toRaw(this)
            const { has } = getProto(target)

            let hadKey = has.call(target, key)

            if (!hadKey) {
              key = toRaw(key)
              hadKey = has.call(target, key)
            } else if (__DEV__) {
              checkIdentityKeys(target, has, key)
            }

            const result = target.delete(key)
            if (hadKey) {
              trigger(target, TriggerOpTypes.DELETE, key)
            }

            return result
          },

          clear(this: IterableCollections) {
            const target = toRaw(this)
            const hadItems = target.size !== 0
            const result = target.clear()
            if (hadItems) {
              trigger(target, TriggerOpTypes.CLEAR)
            }

            return result
          },
        }
  )

  // 处理for...of key是 Symbol.iterator

  const iteratorMethods = [Symbol.iterator, 'keys', 'values', 'entries']

  iteratorMethods.map(item => {
    instrumentations[item] = createIterableMethod(item, readonly, shallow)
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
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
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

function checkIdentityKeys(target: CollectionTypes, has, key: unknown) {
  const rawKey = toRaw(key)
  if (rawKey !== key && has.call(target, rawKey)) {
    const type = toRawType(target)
    warn(
      `Reactive ${type} contains both the raw and reactive ` +
        `versions of the same object${type === `Map` ? ` as keys` : ``}, ` +
        `which can lead to inconsistencies. ` +
        `Avoid differentiating between the raw and reactive versions ` +
        `of an object and only use the reactive version if possible.`
    )
  }
}

// track size,或者forEach时, 当add, delete, clear都会改变size的大小，那么如果在这些方法执行时触发size更新呢, 增加ITERATE_KEY的类型依赖，增删改都触发ITERATE_KEY更新

// vue的处理响应式数据Map类型时 为什么要将keys、entries、values单独处理？
// Map的 keys, values, entries 方法都返回的是迭代器对象, 需要调用next方法才能获取到值.而迭代器是惰性的、一次性的，并且其本身不具备响应式能力。
//  是惰性的：值只在调用 next() 时才计算
//  是一次性的：遍历完就“耗尽”了，无法重新开始
//  不是响应式的：map 的变化不会自动通知到已创建的 iterator。
