/*
 * @Author: phil
 * @Date: 2025-08-03 23:10:20
 */
import { isFunction } from '@pvue/shared'
import { Dep } from './dep'
import { warn } from './warning'
import { refreshComputed } from './effect'

export class ComputedRefImpl<T = any> {
  readonly dep: Dep = new Dep()
  readonly __v_isRef = true
  _value: any = undefined
  constructor(public fn) {
    this._value = fn()
  }

  get value() {
    this.dep.track()
    refreshComputed(this)
    return this._value
  }

  set value(newValue) {
    //
    warn('Write operation failed: computed value is readonly')
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
