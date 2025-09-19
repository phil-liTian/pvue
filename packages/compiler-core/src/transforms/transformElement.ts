import { createVNodeCall, NodeTypes, VNodeCall } from '../ast'
import { NodeTransform } from '../transform'

export const transformElement: NodeTransform = (node, context) => {
  return function postTransformElement() {
    node = context.currentNode

    if (!(node.type === NodeTypes.ELEMENT)) return
    const { tag } = node

    let vnodeTag = `"${tag}"`
    let vnodeProps: VNodeCall['props']
    let vnodeChildren: VNodeCall['children']

    // children
    if (node.children.length) {
      vnodeChildren = node.children
    }

    node.codegenNode = createVNodeCall(
      context,
      vnodeTag,
      vnodeProps,
      vnodeChildren
    )
  }
}
