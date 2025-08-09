/*
 * @Author: phil
 * @Date: 2025-08-01 20:57:43
 */

export const EMPTY_OBJ = {}
export const NOOP = (): void => {}

export const isObject = (val: unknown): val is Record<any, any> => {
  return val !== null && typeof val === 'object'
}

export const objectToString: typeof Object.prototype.toString =
  Object.prototype.toString

export const toTypeString = (value: unknown): string =>
  objectToString.call(value)

// [object Map] => Map
export const toRawType = (value: unknown): string => {
  // extract "RawType" from strings like "[object RawType]"
  return toTypeString(value).slice(8, -1)
}

export const isPlainObject = (val: unknown): val is object => {
  return toRawType(val) === 'Object'
}

const hasOwnProperty = Object.prototype.hasOwnProperty

export const hasOwn = (val: Object, key: string | symbol) => {
  return hasOwnProperty.call(val, key)
}

export const isFunction = (value: unknown): value is Function => {
  return typeof value === 'function'
}

export const isString = (val: unknown): val is string => typeof val === 'string'

export const isArray: typeof Array.isArray = Array.isArray

export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'

export const isIntegerKey = (key: unknown): boolean => {
  return (
    isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key
  )
}

export const extend: typeof Object.assign = Object.assign

export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)

// 给对象定义一个不可被枚举的属性
export const def = (
  obj: object,
  key: string | symbol,
  value: any,
  writable = false
): void => {
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: false,
    writable,
    value,
  })
}
