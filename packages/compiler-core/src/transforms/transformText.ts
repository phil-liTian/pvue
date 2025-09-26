/*
 * @Author: phil
 * @Date: 2025-09-19 11:09:28
 */
import { PatchFlagNames, PatchFlags } from '@pvue/shared'
import {
  CallExpression,
  CompoundExpressionNode,
  ConstantTypes,
  createCallExpression,
  createCompoundExpression,
  NodeTypes,
} from '../ast'
import { CREATE_TEXT } from '../runtimeHelpers'
import { NodeTransform } from '../transform'
import { isText } from '../utils'
import { getConstantType } from './cacheStatic'

export const transformText: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ROOT || node.type === NodeTypes.FOR) {
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
                  [child],
                  child.loc
                )
              }

              currentContainer.children.push(` + `, next)

              children.splice(j, 1)
              j--
            } else {
              // 如果next不是 text类型的 则需要当作下一个children处理, 进入下一次i循环
              currentContainer = undefined
              break
            }
          }
        }
      }

      // 处理后的children只有一个的话 就不需要将当前节点处理成TEXT_CALL了
      if (children.length === 1 && node.type === NodeTypes.ROOT) {
        return
      }

      // <div/>{{ foo }} bar {{ baz }}<div/>
      // 如果children里面的元素 是text 或者是 COMPOUND_EXPRESSION类型的节点 需要特殊处理
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          let callArgs: CallExpression['arguments'] = []

          if (child.type !== NodeTypes.TEXT || child.content !== ' ') {
            callArgs.push(child)
          }

          if (getConstantType(child, context) === ConstantTypes.NOT_CONSTANT) {
            callArgs.push(
              PatchFlags.TEXT +
                (__DEV__ ? ` /* ${PatchFlagNames[PatchFlags.TEXT]} */` : '')
            )
          }

          children[i] = {
            type: NodeTypes.TEXT_CALL,
            codegenNode: createCallExpression(
              context.helper(CREATE_TEXT),
              callArgs
            ),
          }
        }
      }
    }
  }
}
