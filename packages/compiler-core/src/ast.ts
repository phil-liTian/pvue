import { PatchFlags } from '@pvue/shared'
import { TransformContext } from './transform'

export enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  DIRECTIVE,
  COMMENT,

  // container
  IF,

  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION,
}

export enum ConstantTypes {
  NOT_CONSTANT = 0,
  CAN_SKIP_PATCH,
  CAN_CACHE,
  CAN_STRINGIFY,
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

export interface VNodeCall extends Node {
  tag: string | symbol
  props: undefined
  children: TemplateChildNode[] | undefined
  patchFlag: PatchFlags | undefined
  dynamicProps: string | undefined
  directives: undefined
  isBlock: boolean
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

export interface ELementNode extends Node {
  type: NodeTypes.ELEMENT
}

export interface BaseElementNode extends Node {
  type: NodeTypes.ELEMENT
  tag: string
}

export interface SimpleExpressionNode extends Node {
  type: NodeTypes.SIMPLE_EXPRESSION
  content: string
  isStatic: boolean
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
  loc: SourceLocation = locStub
): SimpleExpressionNode {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content,
    isStatic,
    loc,
  }
}

export function createVNodeCall(
  context: TransformContext | null,
  tag: VNodeCall['tag'],
  props?: VNodeCall['props'],
  children?: VNodeCall['children'],
  patchFlag?: VNodeCall['patchFlag'],
  dynamicProps?: VNodeCall['dynamicProps'],
  directives?: VNodeCall['directives'],
  isBlock: VNodeCall['isBlock'] = false
) {
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

export function convertToBlock(node: VNodeCall, {}: TransformContext) {
  if (!node.isBlock) {
    node.isBlock = true
  }
}
