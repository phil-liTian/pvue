import { isArray, isObject } from '@pvue/shared'
import { createVNode, isVNode, VNode } from './vnode'

type RawChildren = string | number | boolean | VNode | (() => any)

// export function h<K extends keyof HTMLElementTagNameMap>(
//   type: K,
//   children?: RawChildren
// ): VNode

export function h(type: any, propsOrChildren?: any, children?: any): VNode {
  const l = arguments.length
  if (l === 2) {
    // 第二个参数是对象并且不是数组
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }
    } else {
      // 数组、函数
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    if (l === 3 && isVNode(children)) {
      children = [children]
    } else if (l > 3) {
      // 从第三个往后的参数都视为children
      children = Array.prototype.slice.call(arguments, 2)
    }
  }

  return createVNode(type, propsOrChildren, children)
}
