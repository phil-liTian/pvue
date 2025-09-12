import { createRoot, NodeTypes, RootNode, SourceLocation } from './ast'
import Tokenizer from './tokenizer'

const stack = []
let currentInput = ''
let currentRoot: RootNode | null = null

const tokenizer = new Tokenizer(stack, {
  ontext(start, endIndex) {
    onText(getSlice(start, endIndex), start, endIndex)
  },
})

function getSlice(start, end) {
  return currentInput.slice(start, end)
}

function getLoc(start: number, end?: number): SourceLocation {
  return {
    start: tokenizer.getPos(start),
    end: end === null ? end : tokenizer.getPos(end!),
    source: getSlice(start, end),
  }
}

function onText(content: string, start: number, endIndex: number) {
  const parent = (stack[0] || currentRoot) as RootNode

  parent.children.push({
    type: NodeTypes.TEXT,
    content,
    loc: getLoc(start, endIndex),
  })
}

export function baseParse(input: string): RootNode {
  currentInput = input
  const root = (currentRoot = createRoot([], input))

  tokenizer.parse(input)

  return root
}
