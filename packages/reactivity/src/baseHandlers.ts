/*
 * @Author: phil
 * @Date: 2025-08-01 20:35:18
 */
// =============== reactive ===============
import { isObject } from '@pvue/shared'
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from './constants'
import { Target, reactive, reactiveMap } from './reactive'
import { track, trigger } from './dep'

class BaseReactiveHandler implements ProxyHandler<Target> {
  constructor(_isReadonly = false, protected _isShallow = false) {}

  get(target: Target, key, receiver) {
    const shallow = this._isShallow

    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    } else if (key === ReactiveFlags.RAW) {
      // .RAW的对象就是reactive对象时，raw才是target, 否则raw是null
      //  如果一个对象的原型上有raw 而不是本身的raw 则 raw的target不存在

      if (
        receiver === reactiveMap.get(target) ||
        Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)
      ) {
        return target
      } else if (key === ReactiveFlags.IS_SHALLOW) {
        return shallow
      }

      return
    }

    const res = Reflect.get(target, key, receiver)

    track(target, TrackOpTypes.GET, key)

    if (isObject(res)) {
      return reactive(res)
    }

    return res
  }
}

class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(false, isShallow)
  }

  set(target: Target, key, value, receiver) {
    trigger(target, TriggerOpTypes.SET, key)

    return Reflect.set(target, key, value, receiver)
  }
}

// reactive
export const mutableHandlers = new MutableReactiveHandler()

// shallowReactive
export const shallowMutableHandlers = new MutableReactiveHandler(true)

// readonlyReactive
