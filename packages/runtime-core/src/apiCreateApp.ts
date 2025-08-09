import { ComponentPublicInstance } from './componentPublicInstance'

export interface App<HostElement = any> {
  mount(rootCoontainer: HostElement | string): ComponentPublicInstance
}

export function createAppAPI() {
  return function createApp(...args) {
    const app: App = {
      mount(rootCoontainer) {
        console.log('rootCoontainer', rootCoontainer)
      },
    }

    return app
  }
}
