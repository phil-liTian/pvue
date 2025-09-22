import { ELementNode, Position } from './ast'

export enum QuoteType {
  NoValue = 0,
  Unquoted = 1,
  Single = 2,
  Double = 3,
}

export enum State {
  Text = 1,

  // interpolation
  InterpolationOpen,
  Interpolation,
  InterpolationClose,

  // tags
  BeforeTagName,
  BeforeClosingTagName,
  InTagName,
  InSelfClosingTag,
  InClosingTagName,
  AfterClosingTagName,

  // attrs
  BeforeAttrName,
  InAttrName, // 处理属性名 比如 <div is='pvue:a' />
  InDirArg, // 例如处理 :后面的属性
  InDirName, // 例如 v- 后面的name
  AfterAttrName,
  BeforeAttrValue,
  InAttrValueDq,
  InAttrValueSq,
  InAttrValueNq,

  // 注释
  BeforeDeclaration,
  BeforeComment, // 注释之前
  InDeclaration,
  InCommentLike,

  InSpecialComment,
}

export enum CharCodes {
  Lt = 0x3c, // <
  Slash = 0x2f, // /
  Gt = 0x3e, // ">"
  Eq = 0x3d, // "="

  UpperA = 0x41, // "A"
  LowerA = 0x61, // "a"
  UpperZ = 0x5a, // "Z"
  LowerZ = 0x7a, // "z"

  Space = 0x20, // " "

  Colon = 0x3a, // ":"

  SingleQuote = 0x27, // "'"
  DoubleQuote = 0x22, // '"'

  ExclamationMark = 0x21, // "!"
  Dash = 0x2d, // "-"

  LowerV = 0x76, // "v"
}

const defaultDelimitersOpen = new Uint8Array([123, 123]) // "{{"
const defaultDelimitersClose = new Uint8Array([125, 125]) // "}}"

//
const Sequences: {
  CommentEnd: Uint8Array
} = {
  CommentEnd: new Uint8Array([0x2d, 0x2d, 0x3e]), // "-->"
}

function isTagStartChar(c: number) {
  return (
    (c >= CharCodes.LowerA && c <= CharCodes.LowerZ) ||
    (c >= CharCodes.UpperA && c <= CharCodes.UpperZ)
  )
}

function isEndOfTagSection(c: number) {
  return c === CharCodes.Slash || c === CharCodes.Gt || isWhitespace(c)
}

export function isWhitespace(c: number): boolean {
  return c === CharCodes.Space
}

export interface Callbacks {
  ontext(start: number, endIndex: number): void
  onclosetag(start: number, endIndex: number): void
  oninterpolation(start: number, endIndex: number): void
  onopentagname(start: number, endIndex: number): void
  onopentagend(start: number, endIndex: number): void
  onselfclosingtag(endIndex: number): void
  ondirname(start: number, endIndex: number): void
  ondirarg(start: number, endIndex: number): void
  onattribnameend(endIndex: number): void

  onattribname(start: number, endIndex: number): void
  onattribdata(start: number, endIndex: number): void
  onattribend(quote: QuoteType, endIndex: number): void

  oncomment(start: number, endIndex: number): void
}

export default class Tokenizer {
  public state: State = State.Text
  private buffer = ''
  // 当前遍历的字符串的下标
  private index = 0
  private sectionStart = 0

  public delimiterOpen: Uint8Array = defaultDelimitersOpen
  public delimiterClose: Uint8Array = defaultDelimitersClose
  private delimiterIndex = -1

  constructor(
    private readonly stack: ELementNode[],
    private readonly cbs: Callbacks
  ) {}

  public reset() {
    //  每次parse之前一定要清空之前的状态 不然会污染全局状态
    this.state = State.Text
    this.index = 0
    this.sectionStart = 0
  }

  private stateText(c: number): void {
    if (c === CharCodes.Lt) {
      if (this.index > this.sectionStart) {
        this.cbs.ontext(this.sectionStart, this.index)
      }

      this.state = State.BeforeTagName
      this.sectionStart = this.index
    } else if (c === this.delimiterOpen[0]) {
      this.state = State.InterpolationOpen
      this.delimiterIndex = 0

      // 处理大胡子语法 {{

      // 处理第一个 {, 后续在parse里面处理第二个 {
      this.stateInterpolationOpen(c)
    }
  }

  private stateInterpolationOpen(c: number): void {
    if (c === this.delimiterOpen[this.delimiterIndex]) {
      // 当前遍历到第二个{
      if (this.delimiterIndex === this.delimiterOpen.length - 1) {
        const start = this.index + 1 - this.delimiterOpen.length

        if (start > this.sectionStart) {
          this.cbs.ontext(this.sectionStart, start)
        }

        this.sectionStart = start
        this.state = State.Interpolation
      } else {
        this.delimiterIndex++
      }
    }
  }

  private stateInterpolation(c: number): void {
    if (c === this.delimiterClose[0]) {
      this.state = State.InterpolationClose
      this.delimiterIndex = 0
      this.stateInterpolationClose(c)
    }
  }

  private stateInterpolationClose(c: number): void {
    if (c === this.delimiterClose[this.delimiterIndex]) {
      if (this.delimiterIndex === this.delimiterClose.length - 1) {
        // 第二个}
        this.cbs.oninterpolation(this.sectionStart, this.index + 1)

        this.state = State.Text
        this.sectionStart = this.index + 1
      } else {
        // 第一个}
        this.delimiterIndex++
      }
    }
  }

  private stateBeforeTagName(c: number): void {
    if (c === CharCodes.ExclamationMark) {
      // 注释
      this.state = State.BeforeDeclaration
      this.sectionStart = this.index + 1
    } else if (c === CharCodes.Slash) {
      this.state = State.BeforeClosingTagName
      // this.sectionStart = this.index + 1
    } else if (isTagStartChar(c)) {
      // 标签内容
      this.sectionStart = this.index
      this.state = State.InTagName
    } else {
      this.state = State.Text
      this.stateText(c)
    }
  }

  private stateInTagName(c: number): void {
    // 处理开始标签中的内容
    if (isEndOfTagSection(c)) {
      this.handleTagName(c)
    }
  }

  private stateBeforeClosingTagName(c: number): void {
    // 根据传入的字符c判断下一个状态：如果c是有效的标签起始字符，则状态变为"处理关闭标签名称中"，否则状态变为"处理特殊注释中"
    this.state = isTagStartChar(c)
      ? State.InClosingTagName
      : State.InSpecialComment
    // 设置当前处理的节段起始位置为当前索引，用于后续提取标签名或注释内容
    this.sectionStart = this.index
  }

  private stateInClosingTagName(c: number): void {
    if (c === CharCodes.Gt) {
      this.cbs.onclosetag(this.sectionStart, this.index)

      this.state = State.AfterClosingTagName
      this.stateAfterClosingTagName(c)
    }
  }

  // 处理自闭合标签
  private stateInSelfClosingTag(c: number): void {
    if (c === CharCodes.Gt) {
      this.cbs.onselfclosingtag(this.index)
      this.state = State.Text
      this.sectionStart = this.index + 1
    }
  }

  private stateAfterClosingTagName(c: number) {
    if (c === CharCodes.Gt) {
      this.sectionStart = this.index + 1
      this.state = State.Text
    }
  }

  // 第一次可能是一个空格 <div :id="foo"/>, 不需要处理重新进入parse
  private stateBeforeAttrName(c: number): void {
    if (c === CharCodes.Gt) {
      // 中间没有属性了 直接结束
      this.cbs.onopentagend(this.sectionStart, this.index)

      this.state = State.Text
      this.sectionStart = this.index + 1
    } else if (c === CharCodes.Slash) {
      // 自闭合标签
      this.state = State.InSelfClosingTag
    } else if (!isWhitespace(c)) {
      this.handleAttrStart(c)
    }
  }

  private stateInDirArg(c: number) {
    if (c === CharCodes.Eq) {
      this.cbs.ondirarg(this.sectionStart, this.index)
      this.handleAttrNameEnd(c)
    }
  }

  // v- 后面的内容
  private stateInDirName(c: number) {
    // 指令后面有可能是没有等号的<div v-foo/>
    if (c === CharCodes.Eq || isEndOfTagSection(c)) {
      this.cbs.ondirname(this.sectionStart, this.index)
      this.handleAttrNameEnd(c)
    }
  }

  // 处理属性名
  private stateInAttrName(c: number) {
    if (c === CharCodes.Eq || isEndOfTagSection(c)) {
      // 处理属性名
      this.cbs.onattribname(this.sectionStart, this.index)
      // 处理属性值
      this.handleAttrNameEnd(c)
    }
  }

  private stateAfterAttrName(c: number) {
    if (c === CharCodes.Eq) {
      this.state = State.BeforeAttrValue
    } else if (c === CharCodes.Slash || c === CharCodes.Gt) {
      // 有可能是没有属性值的 也就是说 属性后面没有'等号' <div v-foo />
      // 或者是开始标签中 属性没有属性值 <div id></div>
      this.cbs.onattribend(QuoteType.NoValue, this.sectionStart)
      this.state = State.BeforeAttrName
      this.stateBeforeAttrName(c)
    }
  }

  private stateBeforeAttrValue(c: number) {
    if (c === CharCodes.DoubleQuote) {
      this.state = State.InAttrValueDq
      this.sectionStart = this.index + 1
    } else if (c === CharCodes.SingleQuote) {
      this.state = State.InAttrValueSq
      this.sectionStart = this.index + 1
    } else {
      this.state = State.InAttrValueNq
      this.sectionStart = this.index
      this.stateInAttrValueNoQuotes(c)
    }
  }

  // 处理双引号里面的内容
  private stateInAttrValueDoubleQuotes(c: number) {
    this.handleInAttrValue(c, CharCodes.DoubleQuote)
  }

  private stateInAttrValueSingleQuotes(c: number) {
    this.handleInAttrValue(c, CharCodes.SingleQuote)
  }

  private stateInAttrValueNoQuotes(c: number) {
    if (c === CharCodes.Gt) {
      this.cbs.onattribdata(this.sectionStart, this.index)

      this.cbs.onattribend(QuoteType.Unquoted, this.index)
      this.sectionStart = this.index
      this.state = State.BeforeAttrName
      this.stateBeforeAttrName(c)
    }
  }

  public currentSequence: Uint8Array = undefined!
  private sequenceIndex = 0

  // 处理注释
  private stateBeforeDeclaration(c: number) {
    this.state =
      c === CharCodes.Dash ? State.BeforeComment : State.InDeclaration
  }

  private stateBeforeComment(c: number) {
    if (c === CharCodes.Dash) {
      this.state = State.InCommentLike
      this.sectionStart = this.index + 1
      this.currentSequence = Sequences.CommentEnd
      // TODO
      this.sequenceIndex = 2
    }
  }

  private stateInCommentLike(c: number) {
    if (c === this.currentSequence[this.sequenceIndex]) {
      // -
      if (++this.sequenceIndex === this.currentSequence.length) {
        // 处理注释中的内容
        this.cbs.oncomment(this.sectionStart, this.index - 2)
        this.sectionStart = this.index + 1
        this.state = State.Text
        this.sequenceIndex = 0
      }
    }

    // 如果不是注释的结束内容
    else if (c !== this.currentSequence[this.sequenceIndex - 1]) {
      // console.log('c', c)

      this.sequenceIndex = 0
    }
  }

  private handleAttrStart(c: number) {
    if (c === CharCodes.LowerV && this.peek() === CharCodes.Dash) {
      // v-
      this.state = State.InDirName
      this.sectionStart = this.index
    } else if (c === CharCodes.Colon) {
      // <div :id='foo' /> 中 :
      this.cbs.ondirname(this.index, this.index + 1)
      this.state = State.InDirArg
      this.sectionStart = this.index + 1
    } else {
      this.state = State.InAttrName
      this.sectionStart = this.index
    }
  }

  private handleAttrNameEnd(c: number): void {
    this.sectionStart = this.index
    this.state = State.AfterAttrName
    this.cbs.onattribnameend(this.index)
    this.stateAfterAttrName(c)
  }

  private handleTagName(c: number) {
    this.cbs.onopentagname(this.sectionStart, this.index)

    this.state = State.BeforeAttrName

    this.stateBeforeAttrName(c)
  }

  private handleInAttrValue(c: number, quote: number) {
    if (c === quote) {
      // 引号闭合
      this.cbs.onattribdata(this.sectionStart, this.index)

      this.cbs.onattribend(
        c === CharCodes.DoubleQuote ? QuoteType.Double : QuoteType.Single,
        this.index + 1
      )
      this.state = State.BeforeAttrName
    }
  }

  public getPos(index: number): Position {
    let line = 1
    let column = index + 1

    return {
      line,
      column,
      offset: index,
    }
  }

  private peek() {
    return this.buffer.charCodeAt(this.index + 1)
  }

  public parse(input: string): void {
    this.buffer = input

    while (this.index < input.length) {
      const c = this.buffer.charCodeAt(this.index)

      switch (this.state) {
        // 开始处理文本内容 遇到< 开始解析element， 遇到{ 开始解析插值
        case State.Text: {
          this.stateText(c)
          break
        }

        // 遇到< 进入该阶段
        case State.BeforeTagName: {
          this.stateBeforeTagName(c)
          break
        }

        // 处理开始标签中的内容
        case State.InTagName: {
          this.stateInTagName(c)
          break
        }

        // 结束之前
        case State.BeforeClosingTagName: {
          this.stateBeforeClosingTagName(c)
          break
        }

        // 处理结束标签 当是>的时候 结束
        case State.InClosingTagName: {
          this.stateInClosingTagName(c)
          break
        }

        case State.BeforeAttrName: {
          this.stateBeforeAttrName(c)
          break
        }

        // 处理属性
        case State.InDirArg: {
          this.stateInDirArg(c)
          break
        }

        // 处理指令名
        case State.InDirName: {
          this.stateInDirName(c)
          break
        }

        case State.InAttrName: {
          this.stateInAttrName(c)
          break
        }

        // 处理属性值
        case State.BeforeAttrValue: {
          this.stateBeforeAttrValue(c)
          break
        }

        case State.InAttrValueDq: {
          this.stateInAttrValueDoubleQuotes(c)
          break
        }

        case State.InAttrValueSq: {
          this.stateInAttrValueSingleQuotes(c)
          break
        }

        case State.InAttrValueNq: {
          this.stateInAttrValueNoQuotes(c)
          break
        }

        // 处理自闭合标签
        case State.InSelfClosingTag: {
          this.stateInSelfClosingTag(c)
          break
        }

        // 处理 {{

        case State.InterpolationOpen: {
          // 处理第二个 {
          this.stateInterpolationOpen(c)
          break
        }

        case State.Interpolation: {
          // 处理 {{  }} 中间的内容
          this.stateInterpolation(c)
          break
        }

        // 处理第二个 }
        case State.InterpolationClose: {
          this.stateInterpolationClose(c)
          break
        }

        // 处理注释
        case State.BeforeDeclaration: {
          this.stateBeforeDeclaration(c)
          break
        }

        case State.BeforeComment: {
          this.stateBeforeComment(c)
          break
        }

        case State.InCommentLike: {
          this.stateInCommentLike(c)
          break
        }
      }

      this.index++
    }

    // 如果最后State是Text, 则将剩下的内容放到Text Children中
    this.cleanup()

    this.finish()
  }

  // 处理非正常结束的字符串
  private finish() {
    this.handleTrailingData()
  }

  private cleanup() {
    if (this.sectionStart !== this.index) {
      if (this.state === State.Text) {
        this.cbs.ontext(this.sectionStart, this.index)
        this.sectionStart = this.index
      }
    }
  }

  private handleTrailingData() {
    const endIndex = this.buffer.length
    // 处理剩下的队尾的元素

    if (this.sectionStart >= endIndex) return

    this.cbs.ontext(this.sectionStart, endIndex)
  }
}

export function toCharCodes(str: string): Uint8Array {
  const ret = new Uint8Array(str.length)

  for (let i = 0; i < str.length; i++) {
    ret[i] = str.charCodeAt(i)
  }
  return ret
}
