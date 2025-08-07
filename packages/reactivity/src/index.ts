/*
 * @Author: phil
 * @Date: 2025-08-03 23:02:24
 */
export {
  reactive,
  isReactive,
  isShallow,
  isReadonly,
  isProxy,
  markRaw,
  toRaw,
  toReactive,
  type Raw,
  type Reactive,
} from './reactive'

export { effect, ReactiveEffect } from './effect'

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

export { computed } from './computed'

export { watch } from './watch'
