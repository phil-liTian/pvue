import { PatchFlags } from '@pvue/shared'
import { TransformContext } from './transform'
import type { Node as BabelNode } from '@babel/types'
import {
  CREATE_BLOCK,
  CREATE_ELEMENT_BLOCK,
  CREATE_ELEMENT_VNODE,
  CREATE_VNODE,
  OPEN_BLOCK,
} from './runtimeHelpers'

export enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  DIRECTIVE,
  COMMENT,
  ATTRIBUTE,

  // container
  IF,
  FOR,
  COMPOUND_EXPRESSION,
  TEXT_CALL,

  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION,
  JS_ARRAY_EXPRESSION,
}

export enum ConstantTypes {
  NOT_CONSTANT = 0,
  CAN_SKIP_PATCH,
  CAN_CACHE,
  CAN_STRINGIFY,
}

// element 类型 细分 比如 <slot /> <template /> <component />
export enum ElementTypes {
  ELEMENT,
  COMPONENT,
  SLOT,
  TEMPLATE,
}

export type Namespace = number

export enum Namespaces {
  HTML,
}

export const locStub: SourceLocation = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
  source: '',
}

export interface Position {
  line: number
  column: number
  offset: number
}

export interface SourceLocation {
  start: Position
  end: Position
  source: string
}

export interface Node {
  type: NodeTypes
  loc: SourceLocation
}

export interface TextNode extends Node {
  type: NodeTypes.TEXT
  content: string
}

export interface InterpolationNode extends Node {
  type: NodeTypes.INTERPOLATION
  content: string
}

export interface CompoundExpressionNode extends Node {
  type: NodeTypes.COMPOUND_EXPRESSION
  children: (SimpleExpressionNode | string | TextNode | InterpolationNode)[]
}

export interface SlotOutletNode extends BaseElementNode {
  tagType: ElementTypes.SLOT
  codegenNode: any
}

export interface TemplateNode extends BaseElementNode {
  tagType: ElementTypes.TEMPLATE
}

export interface VNodeCall extends Node {
  tag: string | symbol
  props: undefined
  children: TemplateChildNode[] | undefined
  patchFlag: PatchFlags | undefined
  dynamicProps: string | undefined
  directives: undefined | DirectiveNode
  isBlock: boolean
  disableTracking: boolean
  isComponent: boolean
}

export interface ForCodegenNode extends VNodeCall {}

export interface CallExpression extends Node {
  type: NodeTypes.JS_CALL_EXPRESSION
  callee: string | symbol
  arguments: TemplateChildNode[]
}

export interface ArrayExpression extends Node {
  type: NodeTypes.JS_ARRAY_EXPRESSION
  elements: Array<string | Node>
}

export type ExpressionNode = SimpleExpressionNode

export type JSChildNode = ExpressionNode

export type ParentNode = RootNode

export type TemplateChildNode = TextNode | InterpolationNode | ElementNode

export type ElementNode = any

export interface RootNode extends Node {
  children: TemplateChildNode[]
  source: string
  helpers: Set<symbol>

  codegenNode?: JSChildNode | TemplateChildNode
  hoists: (JSChildNode | null)[]
}

export interface TextNode extends Node {
  type: NodeTypes.TEXT
}

export interface ForNode extends Node {
  type: NodeTypes.FOR
  keyAlias: undefined | ExpressionNode
  objectIndexAlias: undefined | ExpressionNode
  valueAlias: undefined | ExpressionNode
  source: ExpressionNode
  children: TemplateChildNode[]
}

export interface CommentNode extends Node {
  type: NodeTypes.COMMENT
}

export interface ELementNode extends Node {
  type: NodeTypes.ELEMENT
}

export interface BaseElementNode extends Node {
  type: NodeTypes.ELEMENT
  tag: string
  children: TemplateChildNode[]
}

export interface ForParseResult {
  source: ExpressionNode
  value: ExpressionNode | undefined
  key: ExpressionNode | undefined
  index: ExpressionNode | undefined
}

export interface SimpleExpressionNode extends Node {
  type: NodeTypes.SIMPLE_EXPRESSION
  content: string
  isStatic: boolean
  constType: ConstantTypes

  ast?: null | false | BabelNode
  identifiers?: string[]
}

// <div :id='foo' />
export interface DirectiveNode extends Node {
  type: NodeTypes.DIRECTIVE
  // 是解析后的name 比如 : 解析后的name就是 bind,
  name: string

  // rawName就是 :
  rawName?: string

  // foo
  exp: ExpressionNode | undefined

  // id
  arg: ExpressionNode | undefined

  // 处理for指令后面的解析结果
  forParseResult?: ForParseResult
}

export interface AttributeNode extends Node {
  type: NodeTypes.ATTRIBUTE
  name: string
  // pvue:a
  value: undefined | TextNode
  nameLoc: SourceLocation
}

export function createRoot(
  children: TemplateChildNode[],
  source = ''
): RootNode {
  return {
    type: NodeTypes.ROOT,
    loc: locStub,
    children,
    source,
    helpers: new Set(),
    hoists: [],
  }
}

export function createSimpleExpression(
  content: SimpleExpressionNode['content'],
  isStatic: SimpleExpressionNode['isStatic'] = false,
  loc: SourceLocation = locStub,
  constType: ConstantTypes = ConstantTypes.NOT_CONSTANT
): SimpleExpressionNode {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content,
    isStatic,
    loc,
    constType,
  }
}

// 创建一个vnode element 类型的node
export function createVNodeCall(
  context: TransformContext | null,
  tag: VNodeCall['tag'],
  props?: VNodeCall['props'],
  children?: VNodeCall['children'],
  patchFlag?: VNodeCall['patchFlag'],
  dynamicProps?: VNodeCall['dynamicProps'],
  directives?: VNodeCall['directives'],
  isBlock: VNodeCall['isBlock'] = false,
  disableTracking: VNodeCall['disableTracking'] = false,
  isComponent: VNodeCall['isComponent'] = false
) {
  if (context) {
    if (isBlock) {
      context.helper(OPEN_BLOCK)
      context.helper(getVNodeBlockHelper(isComponent))
    } else {
      context.helper(getVNodeHelper(isComponent))
    }
  }

  return {
    type: NodeTypes.VNODE_CALL,
    tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isBlock,
  }
}

// 创建一个JS_CALL类型的对象
export function createCallExpression<T extends CallExpression['callee']>(
  callee: T,
  args
) {
  return {
    type: NodeTypes.JS_CALL_EXPRESSION,
    callee,
    arguments: args,
  }
}

export function createArrayExpression(elements: ArrayExpression['elements']) {
  return {
    type: NodeTypes.JS_ARRAY_EXPRESSION,
    elements,
  }
}

// 创建复合节点 比如 {{ foo }} bar
export function createCompoundExpression(
  children: CompoundExpressionNode['children'],
  loc: SourceLocation = locStub
): CompoundExpressionNode {
  return {
    type: NodeTypes.COMPOUND_EXPRESSION,
    loc,
    children,
  }
}

// 转化成isBlock
export function convertToBlock(node: VNodeCall, {}: TransformContext) {
  if (!node.isBlock) {
    node.isBlock = true
  }
}

/**
 * 根据是否为组件返回对应的VNode创建辅助函数
 * @param isComponent 是否为组件
 * @returns 相应的VNode创建函数标识符
 */
export function getVNodeHelper(isComponent) {
  return isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE
}

export function getVNodeBlockHelper(isComponent) {
  return isComponent ? CREATE_BLOCK : CREATE_ELEMENT_BLOCK
}
