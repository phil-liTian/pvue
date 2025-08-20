/*
 * @Author: phil
 * @Date: 2025-08-13 19:43:49
 */
import {
  EMPTY_OBJ,
  camelize,
  extend,
  hasOwn,
  hyphenate,
  isArray,
  isFunction,
  isReservedProp,
  makeMap,
} from '@pvue/shared'
import { ComponentInternalInstance, ConcreteComponent, Data } from './component'
import { warn } from './warning'
import { AppContext } from './apiCreateApp'
import { shallowReactive, toRaw } from '@pvue/reactivity'
import { createInternalObject } from './internalObject'

export type ComponentPropsOptions<P = Data> =
  | string[]
  | ComponentObjectPropsOptions<P>

export type ComponentObjectPropsOptions<P = Data> = {
  [k in keyof P]: null
}

export interface PropOptions<T = any, D = T> {
  type: true | null
  required?: boolean
  default?: D

  /**
   * @internal
   */
  skipCheck?: boolean

  /**
   * @internal
   */
  skipFactory?: boolean
}

enum BooleanFlags {
  shouldCast,
  shouldCastTrue,
}

type NormalizedProp = PropOptions & {
  [BooleanFlags.shouldCast]?: boolean
  [BooleanFlags.shouldCastTrue]?: boolean
}

export type NormalizedProps = Record<string, NormalizedProp>
export type NormalizedPropsOptions = [NormalizedProps, string[]] | []

export function initProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  isStateful: number
) {
  const { propsOptions, type } = instance
  const props: Data = {}
  const attrs: Data = createInternalObject()

  setFullProps(instance, rawProps, props, attrs)
  for (const key in propsOptions[0]) {
    if (!(key in props)) {
      props[key] = undefined
    }
  }

  if (__DEV__) {
    validateProps(rawProps || {}, props, instance)
  }

  if (isStateful) {
    instance.props = shallowReactive(props)
  } else {
    // 函数组件没有设置props的话 则照单全收, 设置了的话 则只接收设置了的props
    if (!type.props) {
      // functional component
      instance.props = attrs
    } else {
      instance.props = props
    }
  }

  instance.attrs = attrs

  // instance.ctx.props = rawProps!
  // extend(instance.ctx, rawProps || {})
}

// 将propsOptions中的 options选项赋值到 props上

/**
 *
 * @param instance
 * @param rawProps 传给组件的props 例如: h(Comp, {foo: '123'}) 这里的rawProps就是{foo: '123'}
 * @param props
 * @param attrs
 */
function setFullProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  props: Data,
  attrs: Data
) {
  const [options, needCastKeys] = instance.propsOptions
  let rawCastValues: Data | undefined
  for (const key in rawProps) {
    const value = rawProps[key]
    let camelKey
    if (options && hasOwn(options, (camelKey = camelize(key)))) {
      if (!needCastKeys || !needCastKeys.includes(camelKey)) {
        props[camelKey] = value
      } else {
        ;(rawCastValues || (rawCastValues = {}))[camelKey] = value
      }
    } else {
      if (!(key in attrs) || value !== attrs[key]) {
        attrs[key] = value
      }
    }
  }
  if (needCastKeys) {
    const rawCurrentProps = toRaw(props)
    const castValues = rawCastValues || EMPTY_OBJ
    for (let i = 0; i < needCastKeys.length; i++) {
      const key = needCastKeys[i]

      props[key] = resolvePropValue(
        options!,
        rawCurrentProps,
        key,
        castValues[key],
        instance,
        !hasOwn(castValues, key)
      )
    }
  }
}

export function normalizePropsOptions(
  comp: ConcreteComponent,
  appContext: AppContext
) {
  const raw = comp.props

  let normalized = {},
    needCastKeys: NormalizedPropsOptions[1] = []
  if (!isFunction(comp)) {
    // extend(normalized, raw)
  }

  // 接收的props是数组 给它转换成空对象
  if (isArray(raw)) {
    for (let i = 0; i < raw.length; i++) {
      const normalizedKey = raw[i]
      normalized[normalizedKey] = EMPTY_OBJ
    }
  } else if (raw) {
    // 非数组 --- 对象
    for (const key in raw) {
      const normalizedKey = camelize(key)
      if (validatePropName(normalizedKey)) {
        let shouldCast = false
        let shouldCastTrue = true
        const opt = raw[key]

        // 有可能指定了type或者default属性
        const prop = (normalized[normalizedKey] = isFunction(opt)
          ? { type: opt }
          : extend({}, opt))

        const propType = prop.type

        if (isArray(propType)) {
          // 可能指定多个type
        } else {
          shouldCast = isFunction(propType) && propType.name === 'Boolean'
        }

        prop[BooleanFlags.shouldCast] = shouldCast
        prop[BooleanFlags.shouldCastTrue] = shouldCastTrue
        // 指定type为Boolean 或者有default会被收集
        if (shouldCast || hasOwn(prop, 'default')) {
          needCastKeys.push(normalizedKey)
        }
      }
    }
  }

  let res = [normalized, needCastKeys]

  return res
}

/**
 * 验证属性名是否有效
 * @param key 要验证的属性名
 * @returns 如果属性名有效返回true，否则返回false
 */
function validatePropName(key: string) {
  if (key[0] !== '$' && !isReservedProp(key)) {
    return true
  } else if (__DEV__) {
    warn(`Invalid prop name: "${key}" is a reserved property.`)
  }

  return false
}

function resolvePropValue(
  options: NormalizedProps,
  props: Data,
  key: string,
  value: unknown,
  instance: ComponentInternalInstance | null,
  isAbsent: boolean // 传进来的props 是否有该值
) {
  const opt = options[key]
  if (opt != null) {
    const hasDefault = hasOwn(props, 'default')
    if (hasDefault) {
      // TODO
    } else {
      if (opt[BooleanFlags.shouldCast]) {
        if (isAbsent) {
          value = false
        } else if (
          opt[BooleanFlags.shouldCastTrue] &&
          (value === hyphenate(key) || value === '')
        ) {
          value = true
        }
      }
    }
  }

  return value
}

function validateProps(
  rawProps: Data,
  props: Data,
  instance: ComponentInternalInstance
) {
  const resolvedValues = toRaw(props)
  const options = instance.propsOptions[0]
  for (const key in options) {
    const opt = options[key]
    if (opt === null) continue
    // TODO 校验
    validateProp(key, resolvedValues[key], opt, resolvedValues)
  }
}

function validateProp(
  name: string,
  value: unknown,
  prop: PropOptions,
  props: Data
) {
  const { type, required } = prop

  if (type != null && type !== true) {
    let isValid = false
    const types = isArray(type) ? type : [type]

    for (let i = 0; i < types.length && !isValid; i++) {
      const { valid } = assertType(value, types[i])
      isValid = valid
    }

    if (!isValid) {
      warn(`Invalid prop: type check failed for prop "${name}".`)
    }
  }
}

function assertType(value: unknown, type) {
  const expectedType = getType(type)
  let valid

  if (expectedType === 'null') {
  } else if (isSimpleType(expectedType)) {
    const t = typeof value
    valid = t === expectedType.toLowerCase()
  } else {
    valid = value instanceof (type as any)
  }

  return {
    valid,
  }
}

function getType(ctor): string {
  console.log('typeof ctor', typeof ctor, ctor)

  if (typeof ctor === 'function') {
    return ctor.name || ''
  }

  return ''
}

const isSimpleType = /*@__PURE__*/ makeMap(
  'String,Number,Boolean,Function,Symbol,BigInt'
)
