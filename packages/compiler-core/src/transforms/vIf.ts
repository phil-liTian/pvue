import { DirectiveNode, ElementNode, NodeTypes } from '../ast'
import {
  createStructuralDirectiveTransform,
  NodeTransform,
  TransformContext,
} from '../transform'

export const transformIf: NodeTransform = createStructuralDirectiveTransform(
  /^(if)$/,
  (node, dir, context) => {
    console.log('vif')

    processIf(node, dir, context)
  }
)

export function processIf(
  node: ElementNode,
  dir: DirectiveNode,
  context: TransformContext
) {
  if (dir.name === 'if') {
    const ifNode = {
      type: NodeTypes.IF,
    }

    context.replaceNode(ifNode)
  }
}
