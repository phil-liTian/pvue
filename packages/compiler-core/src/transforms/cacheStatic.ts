/*
 * @Author: phil
 * @Date: 2025-09-18 14:16:04
 */
import { ConstantTypes, NodeTypes, RootNode } from '../ast'
import { isSlotOutlet } from '../utils'

export function getSingleElementRoot(root: RootNode) {
  const children = root.children.filter(v => v.type !== NodeTypes.COMMENT)

  return children.length === 1 &&
    children[0].type === NodeTypes.ELEMENT &&
    !isSlotOutlet(children[0])
    ? children[0]
    : null
}

export function getConstantType(node, context): ConstantTypes {
  switch (node.type) {
    case NodeTypes.TEXT: {
      return ConstantTypes.CAN_STRINGIFY
    }
  }

  return ConstantTypes.NOT_CONSTANT
}
