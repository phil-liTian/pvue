/*
 * @Author: phil
 * @Date: 2025-09-19 09:42:14
 */
import {
  ElementNode,
  ElementTypes,
  InterpolationNode,
  NodeTypes,
  RootNode,
  SlotOutletNode,
  TemplateChildNode,
  TemplateNode,
  TextNode,
} from './ast'

/**
 * 判断当前node的tagType 是否是slot
 * @param node
 * @returns
 */
export function isSlotOutlet(
  node: RootNode | TemplateChildNode
): node is SlotOutletNode {
  return node.type === NodeTypes.ELEMENT && node.tagType === ElementTypes.SLOT
}

/**
 * 判断当前node是否是文本节点  INTERPOLATION和TEXT都归纳为文本节点
 * @param node
 * @returns
 */
export function isText(
  node: TemplateChildNode
): node is InterpolationNode | TextNode {
  return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT
}

export function isTemplateNode(node: TemplateChildNode): node is TemplateNode {
  return (
    node.type === NodeTypes.ELEMENT && node.tagType === ElementTypes.TEMPLATE
  )
}

// 处理v-for 指令 可以支持中间运算符是in | of
// 例如: <div v-for='item in 10' /> <div v-for='item of 10' /> 都支持
export const forAliasRE: RegExp = /([\s\S]*?)\s+(?:in|of)\s+(\S[\s\S]*)/

export function findProp(node: ElementNode, name: string) {
  for (let i = 0; i < node.props.length; i++) {
    const p = node.props[i]

    if (p.name === 'bind' && p.exp) {
      return p
    }
  }
}

const nonIdentifierRE = /^$|^\d|[^\$\w\xA0-\uFFFF]/
export const isSimpleIdentifier = (name: string): boolean =>
  !nonIdentifierRE.test(name)
