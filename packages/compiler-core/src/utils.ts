/*
 * @Author: phil
 * @Date: 2025-09-19 09:42:14
 */
import {
  ElementType,
  InterpolationNode,
  NodeTypes,
  RootNode,
  SlotOutletNode,
  TemplateChildNode,
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
  return node.type === NodeTypes.ELEMENT && node.tagType === ElementType.SLOT
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
