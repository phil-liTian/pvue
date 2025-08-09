import { createVNode, VNode } from './vnode'

export function h(type: any, propsOrChildren?: any, children?: any): VNode {
  const l = arguments.length
  if (l === 2) {
  } else {
    // if ( l === 3 ) {
    // }
  }

  return createVNode(type, propsOrChildren, children)
}
