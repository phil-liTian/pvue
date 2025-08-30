/*
 * @Author: phil
 * @Date: 2025-08-09 19:50:06
 */
import { hasOwn, isFunction, NO } from '@pvue/shared'
import { InjectionKey } from './apiInject'
import {
  Component,
  ComponentInternalInstance,
  Data,
  validateComponentName,
} from './component'
import { ComponentPublicInstance } from './componentPublicInstance'
import { createVNode } from './vnode'
import { warn } from './warning'
import { ComponentOptions } from './componentOptions'
import { callWithAsyncErrorHandling, ErrorCodes } from './errorHandling'

export type OptionMergeFunction = (to: unknown, from: unknown) => any
export interface AppConfig {
  readonly isNativeTag: (tag: string) => boolean
  globalProperties: Record<string, any>
  optionMergeStrategies: Record<string, OptionMergeFunction>
  throwUnhandledErrorInProduction?: boolean
  errorHandler?: (
    err: unknown,
    instance: ComponentInternalInstance | null,
    info: string
  ) => void

  warnHandler?: (
    msg: string,
    instance: ComponentPublicInstance | null,
    trace: string
  ) => void
}

export type PluginInstallFunction<Options = any[]> = Options extends unknown[]
  ? (app: App, ...options: Options) => any
  : (app: App, options: Options) => any

export type FunctionPlugin<Options = any[]> = PluginInstallFunction<Options> &
  Partial<ObjectPlugin<Options>>

export type ObjectPlugin<Options = any[]> = {
  install: PluginInstallFunction<Options>
}

export type Plugin<
  Options = any[],
  P extends unknown[] = Options extends unknown[] ? Options : [Options]
> = ObjectPlugin<Options> | FunctionPlugin<P>

export interface AppContext {
  config: AppConfig
  provides: Record<string | symbol, any>
  components: Record<string, Component>
  mixins: ComponentOptions[]
}
export interface App<HostElement = any> {
  _container: HostElement | null
  _context: AppContext
  _instance: ComponentInternalInstance | null
  config: AppConfig

  use<Options extends unknown[]>(
    plugin: Plugin<Options>,
    ...options: NoInfer<Options>
  ): this
  use<Options>(plugin: Plugin<Options>, options: NoInfer<Options>): this

  mount(rootCoontainer: HostElement | string): ComponentPublicInstance
  onUnmount(cb: () => void): void
  unmount(): void
  runWithContext<T>(fn: () => T): T
  component(name: string): Component | undefined
  mixin(mixin: ComponentOptions): this
  component<T extends Component>(name: string, component: T): this
  provide<T, K = InjectionKey<T> | string | number>(
    key: K,
    value: K extends InjectionKey<infer V> ? V : T
  ): this
}

export function createAppContext(): AppContext {
  return {
    config: {
      isNativeTag: NO,
      globalProperties: {},
      errorHandler: undefined,
      warnHandler: undefined,
      optionMergeStrategies: {},
    },
    provides: Object.create(null),
    components: {},
    mixins: [],
  }
}

export type CreateAppFunction = (
  rootComponent: Component,
  rootProps?: Data | null
) => App

export function createAppAPI(render): CreateAppFunction {
  return function createApp(rootComponent, rootProps = null) {
    const context = createAppContext()
    let isMounted = false
    let installedPlugins = new WeakSet()
    const pluginCleanupFns: Array<() => any> = []

    const app: App = {
      _container: null,
      _context: context,
      _instance: null,
      get config() {
        return context.config
      },

      mount(rootContainer) {
        if (!isMounted) {
          if (__DEV__ && rootContainer.__vue_app__) {
            warn(
              `There is already an app instance mounted on the host container.\n` +
                ` If you want to mount another app on the same host container,` +
                ` you need to unmount the previous app by calling \`app.unmount()\` first.`
            )
          }

          const vnode = createVNode(rootComponent, rootProps)

          // 确保后续获取到appContext是一开始初始化的appContext
          vnode.appContext = context

          app._instance = vnode.component
          isMounted = true
          app._container = rootContainer
          rootContainer.__vue_app__ = app

          return render(vnode, rootContainer)
        } else if (__DEV__) {
          warn(
            `App has already been mounted.\n` +
              `If you want to remount the same app, move your app creation logic ` +
              `into a factory function and create fresh app instances for each ` +
              `mount - e.g. \`const createMyApp = () => createApp(App)\``
          )
        }
      },

      // 卸载
      unmount() {
        if (isMounted) {
          callWithAsyncErrorHandling(
            pluginCleanupFns,
            app._instance,
            ErrorCodes.APP_UNMOUNT_CLEANUP
          )

          render(null, app._container)

          delete app._container.__vue_app__
        } else if (__DEV__) {
          warn(`Cannot unmount an app that is not mounted.`)
        }
      },

      onUnmount(cleanupFn: () => void) {
        pluginCleanupFns.push(cleanupFn)
      },

      provide(key, value) {
        if (__DEV__ && (key as string | symbol) in context.provides) {
          if (hasOwn(context.provides, key as string | symbol)) {
            warn(
              `App already provides property with key "${String(key)}". ` +
                `It will be overwritten with the new value.`
            )
          }
        }

        context.provides[key as string | symbol] = value

        return app
      },

      component(name, component?: Component): any {
        if (__DEV__) {
          validateComponentName(name, context.config)
        }

        if (!component) {
          return context.components[name]
        }

        if (__DEV__ && context.components[name]) {
          warn(`Component "${name}" has already been registered in target app.`)
        }

        context.components[name] = component

        return app
      },

      mixin(mixin: ComponentOptions) {
        if (__FEATURE_OPTIONS_API__) {
          if (!context.mixins.includes(mixin)) {
            context.mixins.push(mixin)
          } else if (__DEV__) {
            warn(
              'Mixin has already been applied to target app' +
                (mixin.name ? `: ${mixin.name}` : '')
            )
          }
        } else {
          warn('Mixins are only available in builds supporting Options API')
        }

        return app
      },

      use(plugin: Plugin, ...options: any[]) {
        if (installedPlugins.has(plugin)) {
          __DEV__ && warn(`Plugin has already been applied to target app.`)
        } else if (plugin && isFunction(plugin.install)) {
          installedPlugins.add(plugin)
          plugin.install(app, ...options)
        } else if (isFunction(plugin)) {
          installedPlugins.add(plugin)
          plugin(app, ...options)
        } else {
          __DEV__ &&
            warn(
              `A plugin must either be a function or an object with an "install" ` +
                `function.`
            )
        }

        return app
      },

      runWithContext(fn) {
        const lastApp = currentApp
        currentApp = app
        try {
          return fn()
        } finally {
          currentApp = lastApp
        }
      },
    }

    return app
  }
}

export let currentApp: App | null = null
