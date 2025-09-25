/*
 * @Author: phil
 * @Date: 2025-09-24 14:45:03
 */
import { walk } from 'estree-walker'
import type { Node, Identifier } from '@babel/types'

/**
 * 检查节点是否被引用
 * @param node 当前节点
 * @param parent 父节点
 * @param grandParent 祖父节点
 * @returns 是否被引用
 */
function isReferenced(node: Node, parent: Node, grandParent: Node): boolean {
  switch (parent.type) {
    case 'MemberExpression': {
      return parent.object === node
    }
  }

  return true
}

export function isReferencedIdentifier(
  id: Identifier,
  parent: Node | null,
  parentStack: Node[]
) {
  if (!parent) return true

  if (isReferenced(id, parent, parentStack[parentStack.length - 2])) {
    return true
  }

  return false
}

export function walkIdentifiers(
  root: Node,
  onIdentifier: (
    node: Identifier,
    parent: Node | null,
    parentStack: Node[],
    isReference: boolean
  ) => void,
  includeAll = false,
  parentStack: Node[] = []
) {
  // @ts-ignore
  walk(root, {
    enter(node: Node, parent: Node | null) {
      // console.log('node', node.type)

      if (node.type === 'Identifier') {
        const isRefed = isReferencedIdentifier(node, parent, parentStack)

        onIdentifier(node, parent, parentStack, isRefed)
      }
    },
    leave(node) {
      // console.log('leave node', node.type)
    },
  })
}
