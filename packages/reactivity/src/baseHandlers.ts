/*
 * @Author: phil
 * @Date: 2025-08-01 20:35:18
 */
// =============== reactive ===============
import { hasChanged, hasOwn, isArray, isObject, isSymbol } from '@pvue/shared'
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from './constants'
import { Target, reactive, reactiveMap, readonly, toRaw } from './reactive'
import { track, trigger } from './dep'

class BaseReactiveHandler implements ProxyHandler<Target> {
  constructor(protected _isReadonly = false, protected _isShallow = false) {}

  get(target: Target, key, receiver) {
    const shallow = this._isShallow
    const isReadonly = this._isReadonly

    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return shallow
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

    const res = Reflect.get(target, key, receiver)

    track(target, TrackOpTypes.GET, key)

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
    if (!isSymbol(key)) {
      // 操作in进行依赖收集
      track(target, TrackOpTypes.HAS, key)
    }

    return result
  }
}

class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(false, isShallow)
  }

  set(target: Target, key, value, receiver) {
    let oldValue = target[key]
    // 先改变对象的value
    value = toRaw(value)

    const hadKey = isArray(target)
      ? Number(key) < target.length
      : hasOwn(target, key)
    // 再执行trigger就可以拿到变化后的值
    const result = Reflect.set(target, key, value, receiver)

    if (hadKey) {
      if (hasChanged(value, oldValue)) {
        // 修改已存在的属性
        trigger(target, TriggerOpTypes.SET, key)
      }
    } else {
      trigger(target, TriggerOpTypes.ADD, key)
    }

    return result
  }
}

// readonly
class ReadonlyReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(true, isShallow)
  }

  set() {
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
