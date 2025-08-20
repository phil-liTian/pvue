/*
 * @Author: phil
 * @Date: 2025-08-11 19:42:07
 */
import { RenderOptions } from '@pvue/runtime-core'

const doc = (typeof document !== 'undefined' ? document : null) as Document

export const nodeOps: Omit<RenderOptions<any, any>, 'patchProp'> = {
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

  createText: text => doc.createTextNode(text),
}
