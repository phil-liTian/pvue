/*
 * @Author: phil
 * @Date: 2025-08-03 23:10:20
 */
import { isFunction } from '@pvue/shared'
import { Dep, globalVersion, Link } from './dep'
import { warn } from './warning'
import { EffectFlags, refreshComputed, batch } from './effect'
import { Ref } from './ref'
import { ReactiveFlags } from './constants'

declare const ComputedRefSymbol: unique symbol
declare const WritableComputedRefSymbol: unique symbol

interface BaseComputedRef<T, S = T> extends Ref<T, S> {
  [ComputedRefSymbol]: true

  effect: ComputedRefImpl<T>
}

export interface ComputedRef<T = any> extends BaseComputedRef<T> {
  readonly value: T
}

export interface WritableComputedRef<T, S = T> extends BaseComputedRef<T, S> {
  [WritableComputedRefSymbol]: T
}

export type ComputedGetter<T> = (oldValue: T) => T
export type ComputedSetter<T> = (newValue: T) => void

export type WritableComputedOptions<T> = {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

export class ComputedRefImpl<T = any> {
  readonly dep: Dep = new Dep(this)
  // 标记是ref类型的数据
  readonly __v_isRef = true

  readonly __v_isReadonly: boolean

  _value: any = undefined

  /**
   * @internal
   */
  deps?: Link = undefined

  /**
   * @internal
   */
  globalVersion: number = globalVersion - 1

  /**
   * @interface
   */
  flags: number = EffectFlags.DIRTY

  constructor(
    public fn,
    private readonly setter: ComputedSetter<T> | undefined
  ) {
    this[ReactiveFlags.IS_READONLY] = !setter
    // this._value = fn()
  }

  notify() {
    if (!(this.flags & EffectFlags.NOTIFIED)) {
      batch(this, true)
      return true
    }
  }

  get value() {
    const link = this.dep.track()
    refreshComputed(this)
    // 更新link的version 与 dep的version一致
    if (link) {
      link.version = this.dep.version
    }

    return this._value
  }

  set value(newValue) {
    if (this.setter) {
      this.setter(newValue)
    }
    //
    warn('Write operation failed: computed value is readonly')
  }
}

export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T> | undefined

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  return new ComputedRefImpl(getter, setter)
}

// computed.deps 是‘被谁依赖’的集合 而不是‘依赖了谁的集合’。 computed 创建时，仅初始化了 “追踪自身依赖（响应式变量）” 的能力，并未挂载 deps（因为还没有其他副作用依赖它）
