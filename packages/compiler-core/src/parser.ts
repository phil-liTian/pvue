import { extend, NO } from '@pvue/shared'
import {
  createRoot,
  type ElementNode,
  NodeTypes,
  RootNode,
  SourceLocation,
  TemplateChildNode,
} from './ast'
import { createCompilerError, defaultOnError, ErrorCodes } from './errors'
import { ParserOptions } from './options'
import Tokenizer, { CharCodes } from './tokenizer'

const stack: ElementNode = []
let currentInput = ''
let currentOpenTag: ElementNode | null = null
let currentRoot: RootNode | null = null
export type MergedParserOptions = Required<ParserOptions>

export const defaultParserOptions: MergedParserOptions = {
  onError: defaultOnError,
  isVoidTag: NO,
}

let currentOptions: MergedParserOptions = defaultParserOptions

function backTrack(index: number, c: number) {
  let i = index
  while (currentInput.charCodeAt(i) !== c && i >= 0) i--
  return i
}

function addNode(node: TemplateChildNode) {
  ;(stack[0] || currentRoot).children.push(node)
}

function endOpenTag(end: number) {
  addNode(currentOpenTag)

  // 将当前tag  推入栈顶
  stack.unshift(currentOpenTag)
  currentOpenTag = null
}

const tokenizer = new Tokenizer(stack, {
  ontext(start, endIndex) {
    onText(getSlice(start, endIndex), start, endIndex)
  },

  oninterpolation(start, endIndex) {
    const innerStart = start + tokenizer.delimiterOpen.length
    const innerEnd = endIndex - tokenizer.delimiterClose.length

    let exp = getSlice(innerStart, innerEnd)

    addNode({
      type: NodeTypes.INTERPOLATION,
      loc: getLoc(start, endIndex),
      content: '',
    })
  },

  onopentagname(start, endIndex) {
    const name = getSlice(start, endIndex)

    currentOpenTag = {
      type: NodeTypes.ELEMENT,
      tag: name,
      children: [],
      // tagType: NodeTypes.ELEMENT,
    }
  },

  onopentagend(start, endIndex) {
    endOpenTag(endIndex)
  },

  onclosetag(start, end) {
    const name = getSlice(start, end)
    if (!currentOptions.isVoidTag(name)) {
      let found = false

      // 拿栈顶元素进行比较 tag相同则认为标签是匹配的
      for (let i = 0; i < stack.length; i++) {
        const e = stack[i]

        if (e.tag.toLowerCase() === name.toLowerCase()) {
          found = true
        }
      }

      // 如果当前标签与栈顶标签不同, 则认为当前标签是无效标签
      if (!found) {
        emitError(ErrorCodes.X_INVALID_END_TAG, backTrack(start, CharCodes.Lt))
      }
    }
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

function setLocEnd(loc: SourceLocation, end: number) {
  loc.end = tokenizer.getPos(end)
  loc.source = getSlice(loc.start.offset, end)
}

function onText(content: string, start: number, endIndex: number) {
  const parent = (stack[0] || currentRoot) as RootNode

  // 如果当前children的最后一个也是TEXT, 则将当前children的内容合并到之前的children中

  const lastNode = parent.children[parent.children.length - 1]
  if (lastNode && lastNode.type === NodeTypes.TEXT) {
    lastNode.content += content
    setLocEnd(lastNode.loc, endIndex)
  } else {
    parent.children.push({
      type: NodeTypes.TEXT,
      content,
      loc: getLoc(start, endIndex),
    })
  }
}

function reset() {
  tokenizer.reset()
  stack.length = 0
}

export function baseParse(input: string, options?: ParserOptions): RootNode {
  reset()
  currentInput = input
  const root = (currentRoot = createRoot([], input))

  // TODO
  extend(currentOptions, options)

  tokenizer.parse(input)

  return root
}

function emitError(code: ErrorCodes, index: number) {
  currentOptions.onError(createCompilerError(code, getLoc(index, index)))
}
