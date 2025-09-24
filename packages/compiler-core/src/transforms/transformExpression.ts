/*
 * @Author: phil
 * @Date: 2025-09-23 19:50:11
 */
import { SimpleExpressionNode } from '../ast'
import { TransformContext } from '../transform'
import { isSimpleIdentifier } from '../utils'

export function processExpression(
  node: SimpleExpressionNode,
  context: TransformContext
) {
  const ast = node.ast

  const rewriteIdentifier = (raw: string) => {
    return `_ctx.${raw}`
  }

  const rawExp = node.content

  if (ast === null || (!ast && isSimpleIdentifier(rawExp))) {
    node.content = rewriteIdentifier(rawExp)
  }

  return node
}
