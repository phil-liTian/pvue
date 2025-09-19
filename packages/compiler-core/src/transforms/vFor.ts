import { DirectiveNode, ElementNode, NodeTypes } from '../ast'
import {
  createStructuralDirectiveTransform,
  NodeTransform,
  TransformContext,
} from '../transform'

export const transformFor: NodeTransform = createStructuralDirectiveTransform(
  'for',
  (node, dir, context) => {
    processIf(node, dir, context)
  }
)

export function processIf(
  node: ElementNode,
  dir: DirectiveNode,
  context: TransformContext
) {
  if (dir.name === 'for') {
    const ifNode = {
      type: NodeTypes.FOR,
    }

    context.replaceNode(ifNode)
  }
}
