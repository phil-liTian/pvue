export enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  SIMPLE_EXPRESSION,
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

export type ExpressionNode = SimpleExpressionNode

export type JSChildNode = ExpressionNode

export type TemplateChildNode = TextNode

export interface RootNode extends Node {
  children: TemplateChildNode[]
  source: string
  helpers: Set<symbol>

  codegenNode?: JSChildNode | TemplateChildNode
}

export interface TextNode extends Node {
  type: NodeTypes.TEXT
}

export interface ELementNode extends Node {
  type: NodeTypes.ELEMENT
}

export interface SimpleExpressionNode extends Node {
  type: NodeTypes.SIMPLE_EXPRESSION
  content: string
  isStatic: boolean
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
