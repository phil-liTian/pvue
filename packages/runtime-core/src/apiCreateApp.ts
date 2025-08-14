import { ComponentPublicInstance } from './componentPublicInstance'
import { createVNode } from './vnode'

export interface AppConfig {
  globalProperties: Record<string, any>
}

export interface AppContext {
  config: AppConfig
}
export interface App<HostElement = any> {
  config: AppConfig
  mount(rootCoontainer: HostElement | string): ComponentPublicInstance
}

export function createAppContext(): AppContext {
  return {
    config: {
      globalProperties: {},
    },
  }
}

export function createAppAPI(render) {
  return function createApp(rootComponent) {
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
    }

    return app
  }
}
