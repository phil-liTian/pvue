/*
 * @Author: phil
 * @Date: 2025-08-12 17:39:11
 */
import { ShapeFlags } from '@pvue/shared'
import { ComponentInternalInstance, FunctionalComponent } from './component'
import { normalizeVNode, VNode } from './vnode'

export function renderComponentRoot(
  instance: ComponentInternalInstance
): VNode {
  const { vnode, render, proxy, type: Component, props, attrs } = instance
  let result
  try {
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      // 对象组件
      result = normalizeVNode(render?.call(proxy))
    } else {
      // 函数组件
      const render = Component as FunctionalComponent

      result = normalizeVNode(render(props, { attrs }))
    }
  } finally {
  }

  return result
}
