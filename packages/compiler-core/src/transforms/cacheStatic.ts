import { NodeTypes, RootNode } from '../ast'
import { isSlotOutlet } from '../utils'

export function getSingleElementRoot(root: RootNode) {
  const children = root.children.filter(v => v.type !== NodeTypes.COMMENT)

  return children.length === 1 &&
    children[0].type === NodeTypes.ELEMENT &&
    !isSlotOutlet(children[0])
    ? children[0]
    : null
}
