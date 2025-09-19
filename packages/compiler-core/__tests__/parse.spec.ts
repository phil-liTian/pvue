import {
  CommentNode,
  ConstantTypes,
  ElementNode,
  ElementType,
  InterpolationNode,
  Namespaces,
  NodeTypes,
  TextNode,
} from '../src/ast'
import { ErrorCodes } from '../src/errors'
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

    test('simple text with invalid end tag', () => {
      const onError = vi.fn()
      const ast = baseParse('some text</div>', { onError })
      const text = ast.children[0] as TextNode

      expect(onError.mock.calls).toMatchObject([
        [
          {
            code: ErrorCodes.X_INVALID_END_TAG,
            loc: {
              start: { column: 10, line: 1, offset: 9 },
              end: { column: 10, line: 1, offset: 9 },
            },
          },
        ],
      ])

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

    test('text with interpolation', () => {
      const ast = baseParse('some {{ foo + bar }} text')
      const text1 = ast.children[0] as TextNode
      const text2 = ast.children[2] as TextNode

      expect(text1).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'some ',
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 5, line: 1, column: 6 },
          source: 'some ',
        },
      })

      expect(text2).toStrictEqual({
        type: NodeTypes.TEXT,
        content: ' text',
        loc: {
          start: { offset: 20, line: 1, column: 21 },
          end: { offset: 25, line: 1, column: 26 },
          source: ' text',
        },
      })
    })

    test('text with interpolation which has `<`', () => {
      const ast = baseParse('some {{ a<b && c>d }} text')
      const text1 = ast.children[0] as TextNode
      const text2 = ast.children[2] as TextNode

      expect(text1).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'some ',
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 5, line: 1, column: 6 },
          source: 'some ',
        },
      })
      expect(text2).toStrictEqual({
        type: NodeTypes.TEXT,
        content: ' text',
        loc: {
          start: { offset: 21, line: 1, column: 22 },
          end: { offset: 26, line: 1, column: 27 },
          source: ' text',
        },
      })
    })

    test('text with mix of tags and interpolations', () => {
      const ast = baseParse('some <span>{{ foo < bar + foo }} text</span>')
      const text1 = ast.children[0] as TextNode
      const text2 = (ast.children[1] as ElementNode).children![1] as TextNode

      expect(text1).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'some ',
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 5, line: 1, column: 6 },
          source: 'some ',
        },
      })
      expect(text2).toStrictEqual({
        type: NodeTypes.TEXT,
        content: ' text',
        loc: {
          start: { offset: 32, line: 1, column: 33 },
          end: { offset: 37, line: 1, column: 38 },
          source: ' text',
        },
      })
    })

    test('lonely "<" doesn\'t separate nodes', () => {
      const ast = baseParse('a < b', {
        onError: err => {
          if (err.code !== ErrorCodes.INVALID_FIRST_CHARACTER_OF_TAG_NAME) {
            throw err
          }
        },
      })
      const text = ast.children[0] as TextNode

      expect(text).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'a < b',
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 5, line: 1, column: 6 },
          source: 'a < b',
        },
      })
    })

    test('lonely "{{" doesn\'t separate nodes', () => {
      const ast = baseParse('a {{ b', {
        onError: error => {
          if (error.code !== ErrorCodes.X_MISSING_INTERPOLATION_END) {
            throw error
          }
        },
      })
      const text = ast.children[0] as TextNode

      expect(text).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'a {{ b',
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 6, line: 1, column: 7 },
          source: 'a {{ b',
        },
      })
    })
  })

  describe('Interpolation', () => {
    test('simple interpolation', () => {
      const ast = baseParse('{{message}}')
      const interpolation = ast.children[0] as InterpolationNode

      expect(interpolation).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: `message`,
          isStatic: false,
          constType: ConstantTypes.NOT_CONSTANT,
          loc: {
            start: { offset: 2, line: 1, column: 3 },
            end: { offset: 9, line: 1, column: 10 },
            source: 'message',
          },
        },
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 11, line: 1, column: 12 },
          source: '{{message}}',
        },
      })
    })

    test('it can have tag-like notation', () => {
      const ast = baseParse('{{ a<b }}')
      const interpolation = ast.children[0] as InterpolationNode

      expect(interpolation).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: `a<b`,
          isStatic: false,
          constType: ConstantTypes.NOT_CONSTANT,
          loc: {
            start: { offset: 3, line: 1, column: 4 },
            end: { offset: 6, line: 1, column: 7 },
            source: 'a<b',
          },
        },
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 9, line: 1, column: 10 },
          source: '{{ a<b }}',
        },
      })
    })

    test('it can have tag-like notation (2)', () => {
      const ast = baseParse('{{ a<b }}{{ c>d }}')
      const interpolation1 = ast.children[0] as InterpolationNode
      const interpolation2 = ast.children[1] as InterpolationNode

      expect(interpolation1).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: `a<b`,
          isStatic: false,
          constType: ConstantTypes.NOT_CONSTANT,
          loc: {
            start: { offset: 3, line: 1, column: 4 },
            end: { offset: 6, line: 1, column: 7 },
            source: 'a<b',
          },
        },
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 9, line: 1, column: 10 },
          source: '{{ a<b }}',
        },
      })

      expect(interpolation2).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          isStatic: false,
          constType: ConstantTypes.NOT_CONSTANT,
          content: 'c>d',
          loc: {
            start: { offset: 12, line: 1, column: 13 },
            end: { offset: 15, line: 1, column: 16 },
            source: 'c>d',
          },
        },
        loc: {
          start: { offset: 9, line: 1, column: 10 },
          end: { offset: 18, line: 1, column: 19 },
          source: '{{ c>d }}',
        },
      })
    })

    test('it can have tag-like notation (3)', () => {
      const ast = baseParse('<div>{{ "</div>" }}</div>')
      const element = ast.children[0] as ElementNode
      const interpolation = element.children[0] as InterpolationNode

      expect(interpolation).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          isStatic: false,
          // The `constType` is the default value and will be determined in `transformExpression`.
          constType: ConstantTypes.NOT_CONSTANT,
          content: '"</div>"',
          loc: {
            start: { offset: 8, line: 1, column: 9 },
            end: { offset: 16, line: 1, column: 17 },
            source: '"</div>"',
          },
        },
        loc: {
          start: { offset: 5, line: 1, column: 6 },
          end: { offset: 19, line: 1, column: 20 },
          source: '{{ "</div>" }}',
        },
      })
    })

    test('custom delimiters', () => {
      const ast = baseParse('<p>{msg}</p>', {
        delimiters: ['{', '}'],
      })
      const element = ast.children[0] as ElementNode
      const interpolation = element.children[0] as InterpolationNode

      expect(interpolation).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: `msg`,
          isStatic: false,
          constType: ConstantTypes.NOT_CONSTANT,
          loc: {
            start: { offset: 4, line: 1, column: 5 },
            end: { offset: 7, line: 1, column: 8 },
            source: 'msg',
          },
        },
        loc: {
          start: { offset: 3, line: 1, column: 4 },
          end: { offset: 8, line: 1, column: 9 },
          source: '{msg}',
        },
      })
    })
  })

  describe('Comment', () => {
    test('empty comment', () => {
      const ast = baseParse('<!---->')
      const comment = ast.children[0] as CommentNode

      expect(comment).toStrictEqual({
        type: NodeTypes.COMMENT,
        content: '',
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 7, line: 1, column: 8 },
          source: '<!---->',
        },
      })
    })

    test('simple comment', () => {
      const ast = baseParse('<!--abc-->')
      const comment = ast.children[0] as CommentNode

      expect(comment).toStrictEqual({
        type: NodeTypes.COMMENT,
        content: 'abc',
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 10, line: 1, column: 11 },
          source: '<!--abc-->',
        },
      })
    })

    test('two comments', () => {
      const ast = baseParse('<!--abc--><!--def-->')
      const comment1 = ast.children[0] as CommentNode
      const comment2 = ast.children[1] as CommentNode

      expect(comment1).toStrictEqual({
        type: NodeTypes.COMMENT,
        content: 'abc',
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 10, line: 1, column: 11 },
          source: '<!--abc-->',
        },
      })
      expect(comment2).toStrictEqual({
        type: NodeTypes.COMMENT,
        content: 'def',
        loc: {
          start: { offset: 10, line: 1, column: 11 },
          end: { offset: 20, line: 1, column: 21 },
          source: '<!--def-->',
        },
      })
    })

    test('comments option', () => {
      const astOptionNoComment = baseParse('<!--abc-->', { comments: false })
      const astOptionWithComments = baseParse('<!--abc-->', { comments: true })

      expect(astOptionNoComment.children).toHaveLength(0)
      expect(astOptionWithComments.children).toHaveLength(1)
    })

    test('comments in the <pre> tag should be removed when comments option requires it', () => {
      const rawText = `<p/><!-- foo --><p/>`

      const astWithComments = baseParse(`<pre>${rawText}</pre>`, {
        comments: true,
      })
      expect(
        (astWithComments.children[0] as ElementNode).children
      ).toMatchObject([
        {
          type: NodeTypes.ELEMENT,
          tag: 'p',
        },
        {
          type: NodeTypes.COMMENT,
        },
        {
          type: NodeTypes.ELEMENT,
          tag: 'p',
        },
      ])

      const astWithoutComments = baseParse(`<pre>${rawText}</pre>`, {
        comments: false,
      })
      expect(
        (astWithoutComments.children[0] as ElementNode).children
      ).toMatchObject([
        {
          type: NodeTypes.ELEMENT,
          tag: 'p',
        },
        {
          type: NodeTypes.ELEMENT,
          tag: 'p',
        },
      ])
    })
  })

  describe('Element', () => {
    test('simple div', () => {
      const ast = baseParse('<div>hello</div>')
      const element = ast.children[0] as ElementNode

      expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        ns: Namespaces.HTML,
        tag: 'div',
        tagType: ElementType.ELEMENT,
        codegenNode: undefined,
        props: [],
        children: [
          {
            type: NodeTypes.TEXT,
            content: 'hello',
            loc: {
              start: { offset: 5, line: 1, column: 6 },
              end: { offset: 10, line: 1, column: 11 },
              source: 'hello',
            },
          },
        ],
        loc: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 16, line: 1, column: 17 },
          source: '<div>hello</div>',
        },
      })
    })
  })
})
