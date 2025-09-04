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
    this.dep.track()
    refreshComputed(this)
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

// computed是一个订阅对象，初次track时，会挂载一个deps, 后续如果computed依赖多个属性，这些属性都会被添加到nextDep中，如果依赖的属性发生变化, 这个computed的version会被重置成-1，然后在track的时候，会将这些-1的computed的nextDep进行更新，发生变化后依赖的属性可能会增加，往nextDep中添加新增的属性

// 如果effect里面监听的是一个computed, 那么computed的依赖属性发生变化了, 如何让这个effect重新执行？？？
// 1. 依赖收集阶段：如果activeSub是computed, 则将当前sub的flag置为TRACKING, 使computed的依赖属性get时可以被正常收集到 link.dep.subs = link
// 2. 触发更新阶段：computed依赖的数据发生变化了，首先应该触发computed的更新机制，如果当前computed没有被notify过，则 notify computed收集batchedComputed，收集后将computed的dep也通知更新下, 将其收集到batchedSub中
// 3. 执行更新阶段：逐个执行batchsub 中的sub， 将batchComputed中的flags重置成未通知状态
