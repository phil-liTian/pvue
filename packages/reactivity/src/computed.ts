/*
 * @Author: phil
 * @Date: 2025-08-03 23:10:20
 */
import { isFunction } from '@pvue/shared'

export class ComputedRefImpl<T> {
  _value: any = undefined
  constructor(fn) {
    this._value = fn()
  }

  get value() {
    return this._value
  }

  set value(newValue) {
    //
  }
}

export function computed<T>(getterOrOptions) {
  let getter
  let setter

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions
  }

  return new ComputedRefImpl(getter)
}
