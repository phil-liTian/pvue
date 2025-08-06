import {
  extend,
  hasChanged,
  isArray,
  isFunction,
  isObject,
  type IfAny,
} from '@pvue/shared'
import { Dep } from './dep'
import { isProxy, isShallow, toRaw, toReactive } from './reactive'
import { ReactiveFlags } from './constants'
import { warn } from './warning'

declare const RefSymbol: unique symbol
export interface Ref<T = any, S = T> {
  get value(): T
  set value(_: S)

  //是Vue响应式系统中类型系统的关键部分，它使得TypeScript能够在编译时正确区分和处理Ref类型，同时不影响运行时行为和开发体验。
  [RefSymbol]: true
}

declare const ShallowRefSymbol: unique symbol

export type ShallowRef<T = any, S = T> = Ref<T, S> & {
  [ShallowRefSymbol]: true
}

export type MaybeRef<T = any> = T | Ref<T> | ShallowRef<T>

export type MaybeRefOrGetter<T> = MaybeRef<T> | (() => T)

// [T] extends [Ref]目的: 通过将类型包装在元组中来阻止条件类型的分布式行为。

// 当在条件类型中使用泛型类型参数时，如果这个类型参数是联合类型，条件类型会自动分发到联合类型的每个成员上。这称为"分布式条件类型"。
// type Example<T> = T extends string ? 'yes' : 'no';
// type Result = Example<string | number>; // 'yes' | 'no'

// type Example<T> = [T] extends [string] ? 'yes' : 'no'
// type Result = Example<string | number> // 'no'

// [T] extends [Ref]
// 这里T可能是联合类型, 我们想要检查的是T这个整体是不是Ref类型
/**
 * eg: T = Ref<number> | string
 * 如果使用 T extends Ref => Ref<number> extends Ref | string extends Ref true | false => true
 * 如果使用 [T] extends [Ref] => Ref<number> | string extends Ref false
 */

export function ref<T>(value: T): [T] extends [Ref] ? IfAny<T, Ref<T>, T> : any

export function ref<T = any>(): Ref<T | undefined>
export function ref(value?: unknown) {
  return createRef(value, false)
}

export function shallowRef<T = any>(value: T): any
export function shallowRef<T = any>(): ShallowRef<T | undefined>
export function shallowRef(value?: unknown) {
  return createRef(value, true)
}

function createRef(rawValue: unknown, shallow: boolean) {
  // 如果ref的value本来就是一个ref 那么不需要重复处理了
  if (isRef(rawValue)) {
    return rawValue
  }

  return new RefImpl(rawValue, shallow)
}

class RefImpl<T = any> {
  _value: T
  private _rawValue: T
  dep: Dep = new Dep()
  public readonly [ReactiveFlags.IS_REF] = true
  public readonly [ReactiveFlags.IS_SHALLOW]: boolean = false

  constructor(value: T, isShallow: boolean) {
    this._rawValue = isShallow ? value : toRaw(value)
    // 如果是shallow类型就是value, 否则实现跟reactive一样
    this._value = isShallow ? value : toReactive(value)
    this[ReactiveFlags.IS_SHALLOW] = isShallow
  }

  get value() {
    this.dep.track()
    return this._value
  }

  set value(newValue) {
    const oldValue = this._rawValue
    const useDirectValue = isShallow(newValue) || this[ReactiveFlags.IS_SHALLOW]

    newValue = useDirectValue ? newValue : toRaw(newValue)
    if (hasChanged(oldValue, newValue)) {
      this._rawValue = newValue
      this._value = useDirectValue ? newValue : toReactive(newValue)
      this.dep.trigger()
    }
  }
}

export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
  return r ? r[ReactiveFlags.IS_REF] === true : false
}

export function unref<T>(ref: MaybeRef<T>): T {
  return isRef(ref) ? ref.value : ref
}

class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly [ReactiveFlags.IS_REF] = true
  public _value: T[K] = undefined!

  constructor(
    private readonly _object: T,
    private readonly _key: K,
    private readonly _defaultValue?: T[K]
  ) {}

  get value() {
    const val = this._object[this._key]

    return (this._value = val === undefined ? this._defaultValue! : val)
  }

  set value(newValue) {
    this._object[this._key] = newValue
  }
}

class GetterRefImpl<T> {
  public readonly [ReactiveFlags.IS_REF] = true
  public readonly [ReactiveFlags.IS_READONLY] = true
  public _value: T = undefined!
  constructor(private readonly _getter: () => T) {}

  get value() {
    return (this._value = this._getter())
  }
}

export type ToRef<T> = any
export function toRef<T>(value: T)
export function toRef<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  defalutValue: T[K]
)

export function toRef<T extends object, K extends keyof T>(obj: T, key: K)
export function toRef(
  source: Record<string, any> | MaybeRef,
  key?: string,
  defaultValue?: unknown
) {
  if (isRef(source)) {
    return source
  } else if (isObject(source) && arguments.length > 1) {
    return propertyToRef(source, key!, defaultValue)
  } else if (isFunction(source)) {
    return new GetterRefImpl(source)
  } else {
    return ref(source)
  }
}

export function toRefs<T extends object>(object: T) {
  if (!isProxy(object)) {
    warn(`toRefs() expects a reactive object but received a plain one.`)
  }

  const ret: any = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    ret[key] = propertyToRef(object, key)
  }

  return ret
}

function propertyToRef(
  source: Record<string, any>,
  key: string,
  defaultValue?: unknown
) {
  const val = source[key]
  return isRef(val) ? val : new ObjectRefImpl(source, key, defaultValue)
}

// ref.value 的时候 会正常进行依赖收集, shallowRef改变时 不会触发更新, triggerRef 会手动触发更新
export function triggerRef(ref: Ref): void {
  if ((ref as unknown as RefImpl).dep) {
    ;(ref as unknown as RefImpl).dep.trigger()
  }
}

export type CustomRefFactory<T> = (
  track: () => void,
  trigger: () => void
) => {
  get: () => T
  set: (value: T) => void
}

class CustomRefImpl<T> {
  private dep: Dep
  private readonly _get: ReturnType<CustomRefFactory<T>>['get']
  private readonly _set: ReturnType<CustomRefFactory<T>>['set']
  public readonly [ReactiveFlags.IS_REF] = true
  public _value: T = undefined!

  constructor(factory: CustomRefFactory<T>) {
    const dep = (this.dep = new Dep())
    const { set, get } = factory(dep.track.bind(dep), dep.trigger.bind(dep))
    this._get = get
    this._set = set
  }

  get value() {
    return (this._value = this._get())
  }
  set value(newValue) {
    this._set(newValue)
  }
}

export function customRef<T>(factory: CustomRefFactory<T>) {
  return new CustomRefImpl(factory)
}

export const toValue = <T>(source: MaybeRefOrGetter<T>): T => {
  return isFunction(source) ? source() : unref(source)
}

// infer V是TypeScript中的类型推断关键字，用于从匹配的类型中提取部分类型信息
// 如果T ShallowRef<number, unknown> 则此时推断出来的V是number类型

/**
 * 如果T是ShallowRef类型，直接返回其包装的值类型V
 * 如果T是普通的Ref类型，则返回UnwrapRefSimple<V>（对包装的值进行进一步解包）
 * 如果T不是任何引用类型，则返回UnwrapRefSimple<T>（对值本身进行解包）
 */
export type UnwrapRef<T> = T extends ShallowRef<infer V, unknown> ? V : any
