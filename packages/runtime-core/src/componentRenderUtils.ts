import { ComponentInternalInstance } from './component'
import { normalizeVNode, VNode } from './vnode'

export function renderComponentRoot(
  instance: ComponentInternalInstance
): VNode {
  const { vnode, render } = instance

  const result = normalizeVNode(render?.())
  return result
}
