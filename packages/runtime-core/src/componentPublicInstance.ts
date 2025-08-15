/*
 * @Author: phil
 * @Date: 2025-08-09 20:06:05
 */
import { EMPTY_OBJ, extend, hasOwn, isFunction, NOOP } from '@pvue/shared'
import {
  ComponentInternalInstance,
  ConcreteComponent,
  Data,
  getComponentPublicInstance,
  isStatefulComponent,
} from './component'
import { shallowReadonly, toRaw, warn } from '@pvue/reactivity'
import { AppContext } from './apiCreateApp'
import { nextTick } from './scheduler'

export type ComponentPublicInstance = {}

export type PublicPropertiesMap = Record<
  string,
  (i: ComponentInternalInstance) => any
>

const getPublicInstance = (i: ComponentInternalInstance | null) => {
  if (!i) return null
  if (isStatefulComponent(i)) return getComponentPublicInstance(i)
}

export const publicPropertiesMap: PublicPropertiesMap = {
  $data: i => i.data,
  $props: i => shallowReadonly(i.props),
  $attrs: i => shallowReadonly(i.attrs),
  $slots: i => shallowReadonly(i.slots),
  $refs: i => shallowReadonly(i.refs),
  $parent: i => getPublicInstance(i.parent),
  $root: i => getPublicInstance(i.root),
  $emit: i => i.emit,
  $el: i => i.vnode.el,
  $options: i => i.type,

  $nextTick: i => i.n || (i.n = nextTick.bind(i.proxy)),
}

export interface ComponentRenderContext {
  _: ComponentInternalInstance
  [key: string]: any
}

const hasSetupBinding = (state: Data, key: string) => {
  return state !== EMPTY_OBJ && hasOwn(state, key)
}

export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
  get({ _: instance }: ComponentRenderContext, key: string) {
    console.log('key', key)

    const { data, setupState, ctx, appContext } = instance

    let globalProperties
    if (hasOwn(data, key)) {
      return data[key]
    } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
      return ctx[key]
    } else if (hasOwn(setupState, key)) {
      return setupState[key]
    } else if (
      (globalProperties = appContext.config.globalProperties) &&
      hasOwn(globalProperties, key)
    ) {
      console.log('globalProperties', globalProperties)

      return globalProperties[key]
    }

    const publicGetter = publicPropertiesMap[key]

    if (publicGetter) {
      return publicGetter(instance)
    } else {
      warn(
        `Property ${JSON.stringify(key)} was accessed during render ` +
          `but is not defined on instance.`
      )
    }
  },

  set({ _: instance }, key: string, value) {
    const { data, setupState, ctx } = instance

    if (hasOwn(data, key)) {
      data[key] = value
      return true
    }

    if (hasOwn(setupState, key)) {
      setupState[key] = value
    }

    // 单项数据流
    if (key[0] === '$' && key.slice(1) in instance) {
      warn(
        `Attempting to mutate public property "${key}". ` +
          `Properties starting with $ are reserved and readonly.`
      )
      return false
    } else {
      ctx[key] = value
    }

    return true
  },

  has({ _: { ctx, data, setupState, appContext } }, key: string) {
    return (
      hasOwn(ctx, key) ||
      (data !== EMPTY_OBJ && hasOwn(data, key)) ||
      hasSetupBinding(setupState, key) ||
      hasOwn(publicPropertiesMap, key) ||
      hasOwn(appContext.config.globalProperties, key)
    )
  },
}

// 将propsOptions上的属性挂载到ctx上
export function exposePropsOnRenderContext(
  instance: ComponentInternalInstance
) {
  const {
    ctx,
    propsOptions: [propsOptions],
  } = instance

  if (propsOptions) {
    Object.keys(propsOptions).forEach(key => {
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => instance.props[key],
        set: NOOP,
      })
    })
  }
}

// 将setup上面的属性挂载到ctx上
export function exposeSetupStateOnRenderContext(
  instance: ComponentInternalInstance
): void {
  const { ctx, setupState } = instance
  Object.keys(toRaw(setupState)).forEach(key => {
    Object.defineProperty(ctx, key, {
      enumerable: true,
      configurable: true,
      get: () => setupState[key],
      set: NOOP,
    })
  })
}

export function normalizePropsOptions(
  comp: ConcreteComponent,
  appContext: AppContext
) {
  const raw = comp.props

  let normalized = {}
  if (!isFunction(comp)) {
    extend(normalized, raw)
  }

  let res = [normalized]

  return res
}

// 给ctx定义一个不可被枚举的_属性
export function createDevRenderContext(instance: ComponentInternalInstance) {
  const target: Record<string, any> = {}
  Object.defineProperty(target, '_', {
    configurable: true,
    enumerable: false,
    get: () => instance,
  })
  return target
}
