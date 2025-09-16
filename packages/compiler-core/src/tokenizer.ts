import { ELementNode, Position } from './ast'

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
  InClosingTagName,
  AfterClosingTagName,

  // attrs
  BeforeAttrName,

  InSpecialComment,
}

export enum CharCodes {
  Lt = 0x3c, // <
  Slash = 0x2f, // /
  Gt = 0x3e, // ">"

  UpperA = 0x41, // "A"
  LowerA = 0x61, // "a"
  UpperZ = 0x5a, // "Z"
  LowerZ = 0x7a, // "z"
}

const defaultDelimitersOpen = new Uint8Array([123, 123]) // "{{"
const defaultDelimitersClose = new Uint8Array([125, 125]) // "}}"

function isTagStartChar(c: number) {
  return (
    (c >= CharCodes.LowerA && c <= CharCodes.LowerZ) ||
    (c >= CharCodes.UpperA && c <= CharCodes.UpperZ)
  )
}

function isEndOfTagSection(c: number) {
  return c === CharCodes.Slash || c === CharCodes.Gt
}

export interface Callbacks {
  ontext(start: number, endIndex: number): void
  onclosetag(start: number, endIndex: number): void
  oninterpolation(start: number, endIndex: number): void
  onopentagname(start: number, endIndex: number): void
  onopentagend(start: number, endIndex: number): void
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
    if (c === CharCodes.Slash) {
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
    this.state = isTagStartChar(c)
      ? State.InClosingTagName
      : State.InSpecialComment
    this.sectionStart = this.index
  }

  private stateInClosingTagName(c: number): void {
    if (c === CharCodes.Gt) {
      this.cbs.onclosetag(this.sectionStart, this.index)

      this.state = State.AfterClosingTagName
      this.stateAfterClosingTagName(c)
    }
  }

  private stateAfterClosingTagName(c: number) {
    if (c === CharCodes.Gt) {
      this.sectionStart = this.index + 1
    }
  }

  private stateBeforeAttrName(c: number): void {
    if (c === CharCodes.Gt) {
      // 结束
      this.cbs.onopentagend(this.sectionStart, this.index)

      this.state = State.Text
      this.sectionStart = this.index + 1
    }
  }

  private handleTagName(c: number) {
    this.cbs.onopentagname(this.sectionStart, this.index)

    this.state = State.BeforeAttrName

    this.stateBeforeAttrName(c)
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

  public parse(input: string): void {
    this.buffer = input

    while (this.index < input.length) {
      const c = this.buffer.charCodeAt(this.index)

      switch (this.state) {
        case State.Text: {
          this.stateText(c)
          break
        }

        case State.BeforeTagName: {
          this.stateBeforeTagName(c)
          break
        }

        case State.InTagName: {
          this.stateInTagName(c)
          break
        }

        case State.BeforeClosingTagName: {
          this.stateBeforeClosingTagName(c)
          break
        }

        // 处理结束标签 当是>的时候 结束
        case State.InClosingTagName: {
          this.stateInClosingTagName(c)
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

        case State.InterpolationClose: {
          this.stateInterpolationClose(c)
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
