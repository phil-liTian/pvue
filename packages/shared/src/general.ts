/*
 * @Author: phil
 * @Date: 2025-08-01 20:57:43
 */

import { makeMap } from './makeMap'

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

export const isOn = (key: string): boolean => {
  return (
    key.charCodeAt(0) === 111 /* o */ &&
    key.charCodeAt(1) === 110 /* n */ &&
    // uppercase letter
    (key.charCodeAt(2) > 122 || key.charCodeAt(2) < 97)
  )
}

/**
 * @description ,key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted不可用作props
 */
export const isReservedProp: (key: string) => boolean = makeMap(
  ',key,ref,ref_for,ref_key,' +
    'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted'
)

/**
 * 创建一个带缓存功能的字符串处理函数
 * @param fn 原始字符串处理函数
 * @returns 带缓存功能的函数，结果相同的输入只会计算一次
 * @template T 字符串处理函数类型
 */
const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
  const cache: Record<string, string> = Object.create(null)
  return ((str: string) => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }) as T
}

const camelizeRE = /-(\w)/g
/**
 * 将连字符分隔的字符串转换为驼峰命名
 * @param str 原始字符串
 * @returns 驼峰命名的字符串
 */
export const camelize: (str: string) => string = cacheStringFunction(
  (str: string): string => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
  }
)

const hyphenateRE = /\B([A-Z])/g

/**
 * @internal
 * @description 将字符串中大写字母换成 （-小写字母）
 */
export const hyphenate: (str: string) => string = cacheStringFunction(
  (str: string) => str.replace(hyphenateRE, '-$1').toLowerCase()
)

/**
 * @description 字符串转化成首字母大写的字符串
 */
export const capitalize: <T extends string>(str: T) => Capitalize<T> =
  cacheStringFunction(<T extends string>(str: T) => {
    return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>
  })

/**
 * @description 将字符串转化成on开始的驼峰字符串
 */
export const toHandlerKey: <T extends string>(
  str: T
) => T extends '' ? '' : `on${Capitalize<T>}` = cacheStringFunction(
  <T extends string>(str: T) => {
    const s = str ? `on${capitalize(str)}` : ''
    return s as T extends '' ? '' : `on${Capitalize<T>}`
  }
)

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

export const looseToNumber = (val: any): any => {
  const n = isString(val) ? Number(val) : NaN

  return isNaN(n) ? val : n
}
