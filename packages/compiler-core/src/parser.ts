import { extend, NO } from '@pvue/shared'
import {
  AttributeNode,
  ConstantTypes,
  createRoot,
  createSimpleExpression,
  DirectiveNode,
  type ElementNode,
  ElementTypes,
  Namespaces,
  NodeTypes,
  RootNode,
  SimpleExpressionNode,
  SourceLocation,
  TemplateChildNode,
} from './ast'
import { createCompilerError, defaultOnError, ErrorCodes } from './errors'
import { ParserOptions } from './options'
import Tokenizer, {
  CharCodes,
  isWhitespace,
  QuoteType,
  toCharCodes,
} from './tokenizer'

const stack: ElementNode = []
let currentInput = ''
// 当前处理的标签 在标签闭合后需要重新置为null
let currentOpenTag: ElementNode | null = null
// 根节点
let currentRoot: RootNode | null = null
// 当前处理的属性 例如<div :id='foo' />
let currentProp: null | DirectiveNode | AttributeNode = null
// 当前属性值 例如 <div :id='foo' /> 中的 foo
let currentAttrValue = ''
// 属性开始的位置下标 方便在onattribend中收集属性的位置
let currentAttrStartIndex = -1
// 属性结束的位置下标
let currentAttrEndIndex = -1

type OptionalOptions = 'isNativeTag' | 'isBuiltInComponent'

export type MergedParserOptions = Omit<
  Required<ParserOptions>,
  OptionalOptions
> &
  Pick<ParserOptions, OptionalOptions>

export const defaultParserOptions: MergedParserOptions = {
  onError: defaultOnError,
  isVoidTag: NO,
  getNamespace: () => Namespaces.HTML,
  isCustomElement: NO,
  ns: Namespaces.HTML,
  delimiters: ['{{', '}}'],
  comments: __DEV__,
}

let currentOptions: MergedParserOptions = defaultParserOptions

function backTrack(index: number, c: number) {
  let i = index
  while (currentInput.charCodeAt(i) !== c && i >= 0) i--
  return i
}

/**
 * 从currentInput的index开始匹配c, 找到code相同的元素的下标
 * @param index 开始匹配的下标
 * @param c 目前字符
 * @returns
 */
function lookAhead(index: number, c: number) {
  let i = index
  while (c !== currentInput.charCodeAt(i) && i < currentInput.length - 1) i++
  return i
}

function isUpperCase(c: number) {
  return c >= 65 && c <= 90
}

/**
 * 检查节点是否为Fragment模板
 * @param node - 元素节点
 * @returns 是否为Fragment模板
 */
function isFragmentTemplate({ tag, props }: ElementNode): boolean {
  if (tag === 'template') {
    for (let i = 0; i < props.length; i++) {
      if (props[i].type === NodeTypes.DIRECTIVE) {
        return true
      }
    }
  }

  return false
}

function isComponent({ tag, props }: ElementNode): boolean {
  // 指定tag是自定义标签的话 则不做component处理
  if (currentOptions.isCustomElement(tag)) {
    return false
  }

  // tag是component或者首字母大写或者isBuiltInComponent指定为true、isNativeTag指定为false的tag都认为是组件类型
  if (
    tag === 'component' ||
    isUpperCase(tag.charCodeAt(0)) ||
    (currentOptions.isBuiltInComponent &&
      currentOptions.isBuiltInComponent(tag)) ||
    (currentOptions.isNativeTag && !currentOptions.isNativeTag(tag))
  ) {
    return true
  }

  // 属性中存在<div is='pvue:a' /> 这种标签也会被当作component处理
  for (let i = 0; i < props.length; i++) {
    const p = props[i]
    if (p.type === NodeTypes.ATTRIBUTE) {
      // 属性中存在<div is='pvue:a' /> 这种标签也会被当作component处理
      if (p.name === 'is' && p.value) {
        if (p.value.content.startsWith('pvue:')) {
          return true
        }
      }
    }
  }

  return false
}

function onCloseTag(el: ElementNode, end: number) {
  setLocEnd(el.loc, lookAhead(end, CharCodes.Gt) + 1)

  const { tag, props } = el

  if (tag === 'slot') {
    el.tagType = ElementTypes.SLOT
  } else if (isFragmentTemplate(el)) {
    el.tagType = ElementTypes.TEMPLATE
  } else if (isComponent(el)) {
    el.tagType = ElementTypes.COMPONENT
  }
}

function addNode(node: TemplateChildNode) {
  ;(stack[0] || currentRoot).children.push(node)
}

function endOpenTag(end: number) {
  addNode(currentOpenTag)
  const { tag } = currentOpenTag

  // 是否是有效的tag 默认是false, 有效标签 不被收集到stack中 不需要闭合逻辑
  if (currentOptions.isVoidTag(tag)) {
    // 关闭标签的时候 需要更新currentOpenTag的loc信息，结束位置以及source
    onCloseTag(currentOpenTag, end)
  } else {
    // 将当前tag  推入栈顶, 为了方便比较后面结束标签是否跟开始相同, 不同则是无效tag
    stack.unshift(currentOpenTag)
  }

  currentOpenTag = null
}

function createExp(
  content: SimpleExpressionNode['content'],
  isStatic: SimpleExpressionNode['isStatic'] = false,
  loc: SourceLocation,
  constType: ConstantTypes = ConstantTypes.NOT_CONSTANT
) {
  const exp = createSimpleExpression(content, isStatic, loc, constType)

  return exp
}

const tokenizer = new Tokenizer(stack, {
  ontext(start, endIndex) {
    onText(getSlice(start, endIndex), start, endIndex)
  },

  oninterpolation(start, endIndex) {
    let innerStart = start + tokenizer.delimiterOpen.length
    let innerEnd = endIndex - tokenizer.delimiterClose.length

    // 去掉两边的空白区域
    while (isWhitespace(currentInput.charCodeAt(innerStart))) {
      innerStart++
    }

    while (isWhitespace(currentInput.charCodeAt(innerEnd - 1))) {
      innerEnd--
    }

    let exp = getSlice(innerStart, innerEnd)

    addNode({
      type: NodeTypes.INTERPOLATION,
      loc: getLoc(start, endIndex),
      content: createExp(exp, false, getLoc(innerStart, innerEnd)),
    })
  },

  onopentagname(start, endIndex) {
    const name = getSlice(start, endIndex)

    currentOpenTag = {
      type: NodeTypes.ELEMENT,
      tag: name,
      children: [],
      props: [],
      // 记录当前tag的位置
      loc: getLoc(start - 1, endIndex),
      // 这个属性在onCloseTag的时候会被重新定义 因为在结束的时候才知道是 slot、template、component还是说就是一个element类型
      tagType: ElementTypes.ELEMENT,
      codegenNode: undefined,
      ns: currentOptions.getNamespace(name, stack[0], currentOptions.ns),
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

          for (let j = 0; j <= i; j++) {
            // onclosetag()
            // 比较是相同节点之后 需要弹出栈顶元素 确保下次入栈的元素与当前元素处理到同一层级
            const el = stack.shift()

            // 在结束标签后面 需要更新开始收集的tag的位置信息 以及source内容
            onCloseTag(el, end)
          }
        }
      }

      // 如果当前标签与栈顶标签不同, 则认为当前标签是无效标签
      if (!found) {
        emitError(ErrorCodes.X_INVALID_END_TAG, backTrack(start, CharCodes.Lt))
      }
    }
  },

  // 处理自闭合标签, 如果栈顶元素与当前自闭合标签相同, 其实这种情况下是必然相同的, 则将栈顶元素弹出,方便处理后续进入的openTag
  onselfclosingtag(endIndex) {
    const name = currentOpenTag.tag
    // 标识是自闭合标签
    currentOpenTag.isSelfClosing = true

    endOpenTag(endIndex)
    if (stack[0] && stack[0]?.tag === name) {
      // 设置自闭合标签的结束位置
      onCloseTag(stack.shift(), endIndex)
    }
  },

  ondirname(start, endIndex) {
    const raw = getSlice(start, endIndex)
    const name = raw === ':' ? 'bind' : raw.slice(2)

    currentProp = {
      type: NodeTypes.DIRECTIVE,
      name,
      rawName: raw,
      exp: undefined,
      arg: undefined,
      loc: getLoc(start),
    }
  },

  ondirarg(start, endIndex) {
    const arg = getSlice(start, endIndex)

    const isStatic = arg[0] !== '['
    ;(currentProp as DirectiveNode).arg = createExp(
      arg,
      isStatic,
      getLoc(start, endIndex),
      ConstantTypes.CAN_STRINGIFY
    )
  },

  onattribnameend(endIndex) {},

  // 引号闭合 记录当前属性值的开始及结束位置
  onattribdata(start, endIndex) {
    currentAttrValue = getSlice(start, endIndex)
    if (currentAttrStartIndex < 0) currentAttrStartIndex = start
    currentAttrEndIndex = endIndex
  },

  // 属性属性名 <div is='vue:a' />
  onattribname(start, endIndex) {
    currentProp = {
      type: NodeTypes.ATTRIBUTE,
      name: getSlice(start, endIndex),
      value: undefined,
      loc: getLoc(start, endIndex),
      nameLoc: getLoc(start, endIndex),
    }
  },

  // 将当前属性push到currentOpenTag中
  onattribend(quote, endIndex) {
    if (currentProp && currentOpenTag) {
      setLocEnd(currentProp.loc, endIndex)
      // 如果说没有引号 则说明 属性没有value值，如果是指令的话，则说明没有exp表达式的内容
      if (quote !== QuoteType.NoValue) {
        if (currentProp.type === NodeTypes.ATTRIBUTE) {
          currentProp.value = {
            type: NodeTypes.TEXT,
            content: currentAttrValue,
            // 如果是没有被引号包起来的属性，source应该就是当前属性的下标
            loc:
              QuoteType.Unquoted === quote
                ? getLoc(currentAttrStartIndex, currentAttrEndIndex)
                : getLoc(currentAttrStartIndex - 1, currentAttrEndIndex + 1),
          }
        } else {
          currentProp.exp = createExp(
            currentAttrValue,
            false,
            getLoc(currentAttrStartIndex, currentAttrEndIndex),
            ConstantTypes.NOT_CONSTANT
          )
        }
      }

      currentOpenTag.props.push(currentProp)
    }

    // 初始化一下
    currentAttrEndIndex = currentAttrStartIndex = -1
  },

  oncomment(start, endIndex) {
    if (currentOptions.comments) {
      // 处理注释信息，将注释信息加入到children中

      addNode({
        type: NodeTypes.COMMENT,
        content: getSlice(start, endIndex),
        loc: getLoc(start - 4, endIndex + 3),
      })
    }
  },
})

function getSlice(start, end) {
  return currentInput.slice(start, end)
}

function getLoc(start: number, end?: number): SourceLocation {
  return {
    start: tokenizer.getPos(start),
    // @ts-ignore
    end: end == null ? end : tokenizer.getPos(end!),
    // @ts-ignore
    source: end == null ? end : getSlice(start, end),
  }
}

/**
 * 设置位置对象的结束位置
 * @param loc 源代码位置对象
 * @param end 结束位置的偏移量
 */
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
  // 重置下currentOptions为defaultParserOptions 缓存内容
  currentOptions = extend({}, defaultParserOptions)

  const delimiters = options && options.delimiters

  if (delimiters) {
    tokenizer.delimiterOpen = toCharCodes(delimiters[0])
    tokenizer.delimiterClose = toCharCodes(delimiters[1])
  }

  const root = (currentRoot = createRoot([], input))

  // TODO
  extend(currentOptions, options)
  // currentOptions = extend({}, defaultParserOptions)

  tokenizer.parse(input)

  // 根元素需要记录整个input的开始位置、结束位置以及source的内容
  root.loc = getLoc(0, currentInput.length)
  return root
}

function emitError(code: ErrorCodes, index: number) {
  currentOptions.onError(createCompilerError(code, getLoc(index, index)))
}
