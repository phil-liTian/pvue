import { RenderOptions } from '@pvue/runtime-core'

export const nodeOps: RenderOptions<any, any> = {
  createElement: tag => {
    const el = document.createElement(tag)
    return el
  },

  setElementText: (el, text) => {
    el.textContent = text
  },

  insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null)
  },
}
