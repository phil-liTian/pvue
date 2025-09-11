/*
 * @Author: phil
 * @Date: 2025-08-03 23:02:24
 */
export {
  reactive,
  shallowReadonly,
  shallowReactive,
  isReactive,
  isShallow,
  isReadonly,
  readonly,
  isProxy,
  markRaw,
  toRaw,
  toReactive,
  type Raw,
  type Reactive,
} from './reactive'

export { effect, onEffectCleanup, ReactiveEffect } from './effect'

export {
  effectScope,
  onScopeDispose,
  getCurrentScope,
  EffectScope,
} from './effectScope'

export {
  ref,
  shallowRef,
  unref,
  triggerRef,
  customRef,
  isRef,
  toRef,
  toRefs,
  toValue,
  type Ref,
  type ShallowRef,
  type ToRef,
  type MaybeRef,
  type MaybeRefOrGetter,
} from './ref'

export { trigger, getDepFromReactive, track } from './dep'

export { ReactiveFlags, TriggerOpTypes } from './constants'

export { warn } from './warning'

export { computed } from './computed'

export {
  watch,
  onWatcherCleanup,
  type WatchOptions,
  type WatchEffect,
  type WatchSource,
  type WatchCallback,
} from './watch'
