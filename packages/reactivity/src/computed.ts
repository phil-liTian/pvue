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
  // console.log('getter', getter())

  return new ComputedRefImpl(getter)
}
