import { ELementNode, Position } from './ast'

export enum State {
  Text = 1,
}

export interface Callbacks {
  ontext(start: number, endIndex: number): void
}

export default class Tokenizer {
  public state: State = State.Text
  private buffer = ''
  // 当前遍历的字符串的下标
  private index = 0
  private sectionStart = 0

  constructor(
    private readonly stack: ELementNode[],
    private readonly cbs: Callbacks
  ) {}

  private stateText(c: number) {}

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
          // console.log('c', c)
        }
      }

      this.index++
    }

    this.cleanup()
  }

  private cleanup() {
    if (this.sectionStart !== this.index) {
      if (this.state === State.Text) {
        this.cbs.ontext(this.sectionStart, this.index)
      }
    }
  }
}
