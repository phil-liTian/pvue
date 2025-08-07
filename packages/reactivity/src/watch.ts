import { isFunction } from '@pvue/shared'
import { Ref } from './ref'

export type WatchSource<T = any> = Ref<T, any> | (() => T)

export function watch(source: object | WatchSource | WatchSource[], cb?: null) {
  let getter: () => any
  if (isFunction(source)) {
  }
}
