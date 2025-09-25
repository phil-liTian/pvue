/*
 * @Author: phil
 * @Date: 2025-09-23 19:50:11
 */
import { Identifier } from '@babel/types'
import {
  CompoundExpressionNode,
  ConstantTypes,
  createCompoundExpression,
  createSimpleExpression,
  NodeTypes,
  SimpleExpressionNode,
} from '../ast'
import { walkIdentifiers } from '../babelUtils'
import { NodeTransform, TransformContext } from '../transform'
import { isSimpleIdentifier } from '../utils'

interface PrefixMeta {
  start: number
  end: number
  isConstant: boolean
}

export const transformExpression: NodeTransform = (node, context) => {
  // console.log('node, context', node, context)
  if (node.type === NodeTypes.INTERPOLATION) {
    // 表达式 {{}}
    node.content = processExpression(node.content, context)
  }
}

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
    // 判断当前exp是否存在identifiers中, identifiers是processFor中收集起来的标识符
    const isScopeVarReference = context.identifiers[rawExp]

    if (!isScopeVarReference) {
      node.content = rewriteIdentifier(rawExp)
    }
  }

  if (!ast) return node

  type QualifiedId = Identifier & PrefixMeta
  const ids: QualifiedId[] = []
  // 如果之前已经挂载了ast 则这里遍历ast节点树
  walkIdentifiers(ast, (node, parent, _, isReferenced) => {
    const needPrefix = isReferenced
    if (needPrefix) {
      node.name = rewriteIdentifier(node.name)
      ids.push(node as QualifiedId)
    } else {
      ids.push(node as QualifiedId)
    }
  })

  const children: CompoundExpressionNode['children'] = []

  ids.forEach((id, i) => {
    const start = id.start - 1
    const end = id.end - 1
    const last = ids[i - 1]

    // 获取上一个Identifiers到当前Identifiers中间的内容
    const leadingText = rawExp.slice(last ? last.end - 1 : 0, start)

    if (leadingText.length) {
      children.push(leadingText + '')
    }
    const source = rawExp.slice(start, end)

    children.push(
      createSimpleExpression(
        id.name,
        false,
        {},
        id.isConstant ? ConstantTypes.NOT_CONSTANT : ConstantTypes.NOT_CONSTANT
      )
    )

    // 最后一个时 比较剩余内容
    if (i === ids.length - 1 && end < rawExp.length) {
      children.push(rawExp.slice(end))
    }
  })

  let ret

  if (children.length) {
    ret = createCompoundExpression(children, node.loc)
    // ret.ast = ast
  } else {
    ret = node
  }

  return ret
}
