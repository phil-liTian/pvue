import { isArray, isObject, isString } from '@pvue/shared'
import { VNodeChild } from '../vnode'
import { warn } from '../warning'

export function renderList(
  source: string,
  renderItem: (value: string, index: number) => VNodeChild
): VNodeChild[]

export function renderList(
  source: number,
  renderItem: (value: number, index: number) => VNodeChild
): VNodeChild[]

export function renderList<T>(
  source: Iterable<T>,
  renderItem: (value: T, index: number) => VNodeChild
): VNodeChild[]

export function renderList<T>(
  source: T,
  renderItem: (value: T, index: number) => VNodeChild
): VNodeChild[]

export function renderList<T extends object>(
  source: T,
  renderItem: <K extends keyof T>(value: T[K], key: K, i: number) => VNodeChild
): VNodeChild[]

export function renderList(
  source: any,
  renderItem: (...args: any[]) => VNodeChild
) {
  let ret: VNodeChild[] = []
  const sourceIsArray = isArray(source)
  if (sourceIsArray || isString(source)) {
    ret = new Array(source.length)
    for (let i = 0; i < source.length; i++) {
      ret[i] = renderItem(source[i], i)
    }
  } else if (typeof source === 'number') {
    if (__DEV__ && !Number.isInteger(source)) {
      warn(`The v-for range expect an integer value but got ${source}.`)
    }
    ret = new Array(source)
    for (let i = 0; i < source; i++) {
      ret[i] = renderItem(i + 1, i)
    }
  } else if (isObject(source)) {
    if (source[Symbol.iterator as any]) {
      ret = Array.from(source as Iterable<any>, (item, i) =>
        renderItem(item, i)
      )
    } else {
      const keys = Object.keys(source)
      ret = new Array(keys.length)

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        ret[i] = renderItem(source[key], key, i)
      }
    }
  }

  return ret
}
