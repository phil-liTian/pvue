/*
 * @Author: phil
 * @Date: 2025-09-19 11:09:28
 */
import {
  CompoundExpressionNode,
  createCompoundExpression,
  NodeTypes,
} from '../ast'
import { NodeTransform } from '../transform'
import { isText } from '../utils'

export const transformText: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ROOT) {
    return () => {
      const children = node.children
      let currentContainer: CompoundExpressionNode | undefined = undefined
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child)) {
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j]
            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = createCompoundExpression(
                  [],
                  child.loc
                )
              }
              children.splice(j, 1)
              j--
            }
          }
        }
      }
    }
  }
}
