export type TemplateChildNode = any

export enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
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

export interface RootNode extends Node {
  children: TemplateChildNode[]
  source: string
}

export interface TextNode extends Node {
  type: NodeTypes.TEXT
}

export interface ELementNode extends Node {
  type: NodeTypes.ELEMENT
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
  }
}
