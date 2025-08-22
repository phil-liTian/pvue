/*
 * @Author: phil
 * @Date: 2025-08-21 21:21:30
 */

import {
  camelize,
  EMPTY_OBJ,
  extend,
  hasOwn,
  hyphenate,
  isArray,
  isFunction,
  isOn,
  isString,
  looseToNumber,
  toHandlerKey,
} from '@pvue/shared'
import { ComponentInternalInstance, ConcreteComponent } from './component'
import { callWithAsyncErrorHandling, ErrorCodes } from './errorHandling'
import { AppContext } from './apiCreateApp'
import { warn } from './warning'
import { ComponentOptions } from './componentOptions'
import { getModelModifiers } from './helpers/useModel'

export type ObjectEmitsOptions = Record<
  string,
  ((...args: any[]) => any) | null
>

export function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...rawArgs: any[]
) {
  const props = instance.vnode.props || EMPTY_OBJ
  let arg = rawArgs
  if (__DEV__) {
    const {
      emitsOptions,
      propsOptions: [propsOptions],
    } = instance

    // TODO: 校验
    if (__DEV__ && emitsOptions) {
      if (!(event in emitsOptions)) {
        if (!propsOptions || !(toHandlerKey(camelize(event)) in propsOptions)) {
          warn(
            `Component emitted event "${event}" but it is neither declared in ` +
              `the emits option nor as an "${toHandlerKey(
                camelize(event)
              )}" prop.`
          )
        }
      } else {
        const validator = emitsOptions[event]
        // 如果 定义的emit是一个函数 则认为是校验函数
        if (isFunction(validator)) {
          const isValid = validator(...rawArgs)
          if (!isValid) {
            warn(
              `Invalid event arguments: event validation failed for event "${event}".`
            )
          }
        }
      }
    }
  }

  const isModelListener = event.startsWith('update:')
  const modifiers = isModelListener && getModelModifiers(props, event.slice(7))

  if (modifiers) {
    if (modifiers.trim) {
      arg = rawArgs.map(v => (isString(v) ? v.trim() : v))
    }

    if (modifiers.number) {
      arg = rawArgs.map(looseToNumber)
    }
  }

  let handlerName
  let handler = (props[(handlerName = toHandlerKey(event))] ||
    props[(handlerName = toHandlerKey(camelize(event)))]) as Function

  // 如果有update: 且在props中没有匹配到对应的事件 将驼峰转化成-小写 尝试匹配props中属性
  if (isModelListener && !handler) {
    handler = props[(handlerName = toHandlerKey(hyphenate(event)))] as Function
  }

  if (handler) {
    // TODO  抛出事件
    callWithAsyncErrorHandling(
      handler,
      instance,
      ErrorCodes.COMPONENT_EVENT_HANDLER,
      arg
    )
  }

  const onceHandler = props[handlerName + 'Once'] as Function
  if (onceHandler) {
    if (!instance.emitted) {
      instance.emitted = {}
    } else if (instance.emitted[handlerName]) {
      return
    }

    instance.emitted[handlerName] = true
    callWithAsyncErrorHandling(
      onceHandler,
      instance,
      ErrorCodes.COMPONENT_EVENT_HANDLER,
      arg
    )
  }
}

export function normalizeEmitsOptions(
  comp: ConcreteComponent,
  appContext: AppContext,
  asMixin = false
) {
  let normalized: ObjectEmitsOptions = {}
  const raw = comp.emits

  // options api
  let hasExtends = false
  if (__FEATURE_OPTIONS_API__ && !isFunction(comp)) {
    const extendEmits = (raw: ComponentOptions) => {
      const normalizedFromExtend = normalizeEmitsOptions(raw, appContext, true)

      if (normalizedFromExtend) {
        hasExtends = true
        extend(normalized, normalizedFromExtend)
      }
    }

    if ((comp as ConcreteComponent).mixins) {
      ;(comp as ConcreteComponent).mixins.map(extendEmits)
    }
  }

  if (!raw && !hasExtends) {
    return null
  }

  if (isArray(raw)) {
    raw.map(key => (normalized[key] = null))
  } else {
    extend(normalized, raw)
  }

  return normalized
}

export function isEmitListener(
  options: ObjectEmitsOptions | null,
  key: string
) {
  if (!options || !isOn(key)) {
    return false
  }

  key = key.slice(2).replace(/Once$/, '')

  return (
    hasOwn(options, key[0].toLowerCase() + key.slice(1)) ||
    hasOwn(options, hyphenate(key)) ||
    hasOwn(options, key)
  )
}
