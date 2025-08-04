export function ref(value?: unknown) {
  return createRef(value, false)
}

function createRef(rawValue: unknown, shallow: boolean) {
  return new RefImpl(rawValue)
}

class RefImpl<T = any> {
  _value: T
  constructor(value) {
    this._value = value
  }

  get value() {
    return this._value
  }

  set value(newValue) {
    this._value = newValue
  }
}
