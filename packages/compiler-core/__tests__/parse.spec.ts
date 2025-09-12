import { NodeTypes, TextNode } from '../src/ast'
import { baseParse } from '../src/parser'

describe('compiler: parse', () => {
  describe('Text', () => {
    test('simple text', () => {
      const ast = baseParse('some text')
      const text = ast.children[0] as TextNode

      expect(text).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'some text',
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 9, line: 1, column: 10 },
          source: 'some text',
        },
      })
    })
  })
})
