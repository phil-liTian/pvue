/*
 * @Author: phil
 * @Date: 2025-08-01 20:35:18
 */
// =============== reactive ===============
import {
  hasChanged,
  hasOwn,
  isArray,
  isIntegerKey,
  isObject,
  isSymbol,
  makeMap,
} from '@pvue/shared'
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from './constants'
import { Target, reactive, reactiveMap, readonly, toRaw } from './reactive'
import { ITERATE_KEY, track, trigger } from './dep'
import { arrayInstrumentations } from './arrayInstrumentations'
import { isRef } from './ref'
import { warn } from './warning'

const isNonTrackableKeys = makeMap('__proto__,__v_isRef,__isVue')
// 内置的symbol集合
export const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .filter(key => key !== 'arguments' && key !== 'caller')
    .map(key => Symbol[key])
    .filter(isSymbol)
)

class BaseReactiveHandler implements ProxyHandler<Target> {
  constructor(protected _isReadonly = false, protected _isShallow = false) {}

  get(target: Target, key, receiver) {
    const isShallow = this._isShallow
    const isReadonly = this._isReadonly

    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return isShallow
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      // .RAW的对象就是reactive对象时，raw才是target, 否则raw是null
      //  如果一个对象的原型上有raw 而不是本身的raw 则 raw的target不存在

      if (
        receiver === reactiveMap.get(target) ||
        Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)
      ) {
        return target
      }

      return
    }

    // 对array进行单独处理
    const targetIsArray = isArray(target)
    if (!isReadonly) {
      let fn: Function | undefined
      if (targetIsArray && (fn = arrayInstrumentations[key])) {
        return fn
      }

      // should track hasOwnProperty
      // 跟踪hasOwnProperty: 如果effect里面是hasOwnProperty, 当setter改属性时，会派发更新
      if (key === 'hasOwnProperty') {
        return hasOwnProperty
      }
    }

    // ref wrapped in reactive should not track internal _value access
    const res = Reflect.get(target, key, isRef(target) ? target : receiver)

    // 如果是symbol内置的key,或者系统定义的不需要依赖收集的key 则不做依赖收集
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res
    }

    track(target, TrackOpTypes.GET, key)

    if (isShallow) {
      return res
    }

    // reactive 里面对象元素的value是ref类型 get时直接获取其value
    if (isRef(res)) {
      // test: should NOT unwrap ref types nested inside arrays
      // 如果获取数组的元素是ref类型, 则照常返回ref类型, 否则返回ref的value
      return targetIsArray && isIntegerKey(key) ? res : res.value
    }

    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }

  deleteProperty(target: Target, key: string | symbol): boolean {
    const hadKey = hasOwn(target, key)
    const result = Reflect.deleteProperty(target, key)
    if (result && hadKey) {
      // 删除操作触发更新
      trigger(target, TriggerOpTypes.DELETE, key)
    }
    return result
  }

  has(target: Target, key: string | symbol): boolean {
    const result = Reflect.has(target, key)
    // 不是symbol类型的key 或者不是
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
      // 操作in进行依赖收集
      track(target, TrackOpTypes.HAS, key)
    }

    return result
  }

  ownKeys(target: Record<string | symbol, unknown>): (string | symbol)[] {
    track(target, TrackOpTypes.ITERATE, ITERATE_KEY)

    return Reflect.ownKeys(target)
  }
}

class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(false, isShallow)
  }

  set(target: Target, key, value, receiver) {
    let oldValue = target[key]
    // 先改变对象的value
    if (!this._isShallow) {
      value = toRaw(value)

      // test: should work like a normal property when nested in a reactive object
      // 新的value不是ref, old是ref类型的 可以直接通过改变oldValue的value属性 触发ref的trigger
      if (!isArray(target) && !isRef(value) && isRef(oldValue)) {
        oldValue.value = value
        return true
      }
    }

    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)
    // 再执行trigger就可以拿到变化后的值
    // ref wrapped in reactive should not track internal _value access
    const result = Reflect.set(
      target,
      key,
      value,
      isRef(target) ? target : receiver
    )
    // 如果触发的key是对象原型上的key, 而非自身的key，则无需派发更新
    if (target === toRaw(receiver)) {
      if (hadKey) {
        if (hasChanged(value, oldValue)) {
          // 修改已存在的属性
          trigger(target, TriggerOpTypes.SET, key, value, oldValue)
        }
      } else {
        trigger(target, TriggerOpTypes.ADD, key, value)
      }
    }

    return result
  }
}

function hasOwnProperty(this: object, key: unknown) {
  const obj = toRaw(this)
  track(obj, TrackOpTypes.HAS, key)
  return obj.hasOwnProperty(key as string)
}

// readonly
class ReadonlyReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(true, isShallow)
  }

  set(target, key) {
    if (__DEV__) {
      warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }

    return true
  }
}

// reactive
export const mutableHandlers = new MutableReactiveHandler()

// shallowReactive
export const shallowMutableHandlers = new MutableReactiveHandler(true)

// readonlyReactive
export const readonlyHandlers = new ReadonlyReactiveHandler()

// shallowReadonly
export const shallowReadonlyHandlers = new ReadonlyReactiveHandler(true)
