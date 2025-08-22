import { isArray, isFunction, isObject, NOOP } from '@pvue/shared'
import { ComponentInternalInstance, LifecycleHook } from './component'
import { onMounted } from './apiLifecycle'
import { computed, isRef, reactive, warn } from '@pvue/reactivity'
import { inject } from './apiInject'
import { callWithAsyncErrorHandling } from './errorHandling'
import { LifecycleHooks } from './enums'
// 处理component的配置

export type ComponentOptions = ComponentOptionsBase

interface LegacyOptions {
  computed?: any
  inject?: any
  data?: () => any
  mounted?: () => any
  created?: () => any

  // componsition
  mixins: any[]
}

export interface ComponentOptionsBase extends LegacyOptions {
  render?: Function
  setup?: Function
}

export type MergedComponentOptions = ComponentOptions

export function mergeOptions(to: any, from: any) {}

function resolveMergedOptions(
  instance: ComponentInternalInstance
): MergedComponentOptions {
  const base = instance.type || {}
  let resolved: MergedComponentOptions = {}

  return Object.assign(resolved, base)
}

export function applyOptions(instance: ComponentInternalInstance) {
  const publicThis = instance.proxy
  const { ctx } = instance

  const options = resolveMergedOptions(instance)
  const {
    mounted,
    data: dataOptions,
    computed: computedOptions,
    inject: injectOptions,
    created,
  } = options
  // vue2还有data配置 vue3已经不需要这个配置了
  if (dataOptions) {
    if (!isFunction(dataOptions) && __DEV__) {
      warn(
        `The data option must be a function. ` +
          `Plain object usage is no longer supported.`
      )
    }

    const data = dataOptions.call(publicThis)

    if (!isObject(data)) {
    } else {
      // 是一个对象， 挂到instance上面 方便在组件代理对象上拿到
      instance.data = reactive(data)

      // 将data中的属性挂载到ctx上

      if (__DEV__) {
        for (const key in data) {
          Object.defineProperty(ctx, key, {
            enumerable: true,
            configurable: true,
            get: () => data[key],
            set: NOOP,
          })
        }
      }
    }
  }

  if (injectOptions) {
    resolveInjections(injectOptions, ctx)
  }

  // 处理computed配置
  if (computedOptions) {
    for (const key in computedOptions) {
      const opt = computedOptions[key]
      const get = isFunction(opt)
        ? opt.bind(publicThis)
        : isFunction(opt.get)
        ? opt.get.bind(publicThis)
        : NOOP

      // TODO 处理computed的 getter和setter
      const c = computed(get)

      //将c返回的结果挂到ctx上面
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => c.value,
        set: v => c.value,
      })
    }
  }

  if (created) {
    callHook(created, instance, LifecycleHooks.CREATED)
  }

  // 注册生命周期函数
  function registerLifecycleHook(
    register: Function,
    hook?: Function | Function[]
  ) {
    if (isArray(hook)) {
    } else if (hook) {
      register(hook.bind(publicThis))
    }
  }

  registerLifecycleHook(onMounted, mounted)
}

function resolveInjections(injectOptions, ctx: any) {
  for (const key in injectOptions) {
    const opt = injectOptions[key]
    let injected: unknown
    if (isObject(opt)) {
      if ('default' in opt) {
        injected = inject(opt.from || key, opt.default, true)
      }
    }

    if (isRef(injected)) {
    } else {
      ctx[key] = injected
    }
  }
}

function callHook(
  hook: Function,
  instance: ComponentInternalInstance,
  type: LifecycleHooks
) {
  callWithAsyncErrorHandling(hook.bind(instance.proxy), instance, type)
}
