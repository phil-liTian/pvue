/*
 * @Author: phil
 * @Date: 2025-08-01 20:57:43
 */
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

const hasOwnProperty = Object.prototype.hasOwnProperty

export const hasOwn = (val: Object, key: string) => {
  return hasOwnProperty.call(val, key)
}

export const extend: typeof Object.assign = Object.assign

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
