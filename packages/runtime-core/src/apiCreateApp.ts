import { ComponentPublicInstance } from './componentPublicInstance'
import { createVNode } from './vnode'

export interface App<HostElement = any> {
  mount(rootCoontainer: HostElement | string): ComponentPublicInstance
}

export function createAppAPI(render) {
  return function createApp(rootComponent) {
    console.log('args', rootComponent)

    const app: App = {
      mount(rootContainer) {
        const vnode = createVNode(rootComponent)
        console.log('rootCoontainer', vnode)

        render(vnode, rootContainer)
      },
    }

    return app
  }
}
