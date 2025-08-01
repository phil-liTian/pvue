// =============== reactive ===============

import { ReactiveFlags } from './constants'
import { Target } from './reactive'

class BaseReactiveHandler implements ProxyHandler<Target> {
  constructor(_isReadonly = false, _isShallow = false) {}

  get(target: Target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }

    return Reflect.get(target, key, receiver)
  }
  set(target: Target, key, value, receiver) {
    return Reflect.set(target, key, value, receiver)
  }
}

class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(false, isShallow)
  }
}

export const mutableHandlers = new MutableReactiveHandler()
