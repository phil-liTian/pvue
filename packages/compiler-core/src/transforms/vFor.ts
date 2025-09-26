/*
 * @Author: phil
 * @Date: 2025-09-19 10:10:12
 */
import {
  createCallExpression,
  createFunctionExpression,
  createVNodeCall,
  DirectiveNode,
  ElementNode,
  ForNode,
  ForParseResult,
  NodeTypes,
} from '../ast'
import { createCompilerError, ErrorCodes } from '../errors'
import { findProp, isTemplateNode } from '../utils'
import {
  createStructuralDirectiveTransform,
  NodeTransform,
  TransformContext,
} from '../transform'
import { processExpression } from './transformExpression'
import { FRAGMENT, RENDER_LIST } from '../runtimeHelpers'

export const transformFor: NodeTransform = createStructuralDirectiveTransform(
  'for',
  (node, dir, context) => {
    const { helper } = context
    return processFor(node, dir, context, forNode => {
      const isTemplate = isTemplateNode(node)

      const renderExp = createCallExpression(helper(RENDER_LIST), [
        forNode.source,
      ]) as any

      if (__DEV__ && isTemplate) {
        node.children.some(c => {
          if (c.type === NodeTypes.ELEMENT) {
            const key = findProp(c, 'key')

            if (key) {
              context.onError(
                createCompilerError(
                  ErrorCodes.X_V_FOR_TEMPLATE_KEY_PLACEMENT,
                  key.loc
                )
              )
              return true
            }
          }
        })
      }

      forNode.codegenNode = createVNodeCall(
        context,
        helper(FRAGMENT),
        undefined,
        renderExp /** children */,
        0,
        undefined,
        undefined,
        true,
        true /** disableTracking */
      )

      return () => {
        renderExp.arguments.push(
          createFunctionExpression(
            createForLoopParams(forNode.parseResult),
            {},
            true
          )
        )
      }
    })
  }
)

export function processFor(
  node: ElementNode,
  dir: DirectiveNode,
  context: TransformContext,
  processCodegen?: (forNode: ForNode) => () => void
) {
  if (!dir.exp) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_FOR_NO_EXPRESSION, dir.loc)
    )
    return
  }

  if (dir.name === 'for') {
    const parseResult = dir.forParseResult
    if (!parseResult) {
      context.onError(
        createCompilerError(ErrorCodes.X_V_FOR_MALFORMED_EXPRESSION, dir.loc)
      )
      return
    }
    const { addIdentifiers } = context

    finalizeForParseResult(parseResult, context)

    const { source, value, key, index } = parseResult
    const forNode: ForNode = {
      type: NodeTypes.FOR,
      valueAlias: value,
      keyAlias: key,
      objectIndexAlias: index,
      source,
      loc: dir.loc,
      children: isTemplateNode(node) ? node.children : [node],
      parseResult,
    }

    context.replaceNode(forNode)

    const onExit = processCodegen && processCodegen(forNode)

    if (context.prefixIdentifiers) {
      // 比如 <div v-for="i in items" /> 中的 i 会添加到identifiers中, 后续给变量增加_ctx的时候，如果存在在identifiers中的value不会添加_ctx.前缀
      value && addIdentifiers(value)
    }

    return () => {
      onExit && onExit()
    }
  }
}

export function finalizeForParseResult(
  result: ForParseResult,
  context: TransformContext
) {
  if (!__BROWSER__ && context.prefixIdentifiers) {
    result.source = processExpression(result.source, context)
  }
}

export function createForLoopParams({ value, key, index }: ForParseResult) {
  return createParamsList([value, key, index])
}

function createParamsList(args) {
  let i = args.length
  while (i--) {
    if (args[i]) break
  }

  return args.slice(0, i + 1).map(arg => arg)
}
