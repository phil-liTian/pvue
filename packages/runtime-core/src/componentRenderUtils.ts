import { ComponentInternalInstance } from './component'
import { normalizeVNode, VNode } from './vnode'

export function renderComponentRoot(
  instance: ComponentInternalInstance
): VNode {
  const { vnode, render, proxy } = instance

  const result = normalizeVNode(render?.call(proxy))
  return result
}
