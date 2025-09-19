import { createCallExpression } from '../ast'
import { RENDER_SLOT } from '../runtimeHelpers'
import { NodeTransform } from '../transform'
import { isSlotOutlet } from '../utils'

// 处理slot
export const transformSlotOutlet: NodeTransform = (node, context) => {
  if (isSlotOutlet(node)) {
    node.codegenNode = createCallExpression(context.helper(RENDER_SLOT))
  }
}
