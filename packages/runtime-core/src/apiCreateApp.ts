import { Component, Data } from './component'
import { ComponentPublicInstance } from './componentPublicInstance'
import { createVNode } from './vnode'

export interface AppConfig {
  globalProperties: Record<string, any>
}

export interface AppContext {
  config: AppConfig
  provides: Record<string | symbol, any>
}
export interface App<HostElement = any> {
  config: AppConfig
  mount(rootCoontainer: HostElement | string): ComponentPublicInstance
  runWithContext<T>(fn: () => T): T
}

export function createAppContext(): AppContext {
  return {
    config: {
      globalProperties: {},
    },
    provides: Object.create(null),
  }
}

export type CreateAppFunction = (
  rootComponent: Component,
  rootProps?: Data | null
) => App

export function createAppAPI(render): CreateAppFunction {
  return function createApp(rootComponent, rootProps = null) {
    const context = createAppContext()

    const app: App = {
      get config() {
        return context.config
      },

      mount(rootContainer) {
        const vnode = createVNode(rootComponent)

        // 确保后续获取到appContext是一开始初始化的appContext
        vnode.appContext = context
        return render(vnode, rootContainer)
      },

      runWithContext(fn) {
        currentApp = app
        return fn()
      },
    }

    return app
  }
}

export let currentApp: App | null = null
