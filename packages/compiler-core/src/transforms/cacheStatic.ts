import { NodeTypes, RootNode } from '../ast'

export function getSingleElementRoot(root: RootNode) {
  const children = root.children.filter(v => v.type !== NodeTypes.COMMENT)

  return children.length === 1 && children[0].type === NodeTypes.ELEMENT
    ? children[0]
    : null
}
