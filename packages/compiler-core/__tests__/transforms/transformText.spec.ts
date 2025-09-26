import { PatchFlags } from '@pvue/shared'
import {
  CompilerOptions,
  NodeTypes,
  generate,
  baseParse as parse,
  transform,
} from '../../src/index'
import { CREATE_TEXT } from '../../src/runtimeHelpers'
import { transformText } from '../../src/transforms/transformText'
import { transformElement } from '../../src/transforms/transformElement'
import { genFlagText } from '../testUtils'

function transformWithTextOpt(template: string, options: CompilerOptions = {}) {
  const ast = parse(template)
  transform(ast, {
    nodeTransforms: [
      // transformFor,
      // ...(options.prefixIdentifiers ? [transformExpression] : []),
      transformElement,
      transformText,
    ],
    ...options,
  })
  return ast
}

describe('compiler: transform text', () => {
  test('no consecutive text', () => {
    const root = transformWithTextOpt(`{{ foo }}`)
    expect(root.children[0]).toMatchObject({
      type: NodeTypes.INTERPOLATION,
      content: {
        content: `foo`,
      },
    })

    expect(generate(root).code).toMatchSnapshot()
  })

  test('consecutive text', () => {
    const root = transformWithTextOpt(`{{ foo }} bar {{ baz }}`)
    expect(root.children.length).toBe(1)

    expect(root.children[0]).toMatchObject({
      type: NodeTypes.COMPOUND_EXPRESSION,
      children: [
        { type: NodeTypes.INTERPOLATION, content: { content: `foo` } },
        ` + `,
        { type: NodeTypes.TEXT, content: ` bar ` },
        ` + `,
        { type: NodeTypes.INTERPOLATION, content: { content: `baz` } },
      ],
    })

    expect(generate(root).code).toMatchSnapshot()
  })

  test('consecutive text between elements', () => {
    const root = transformWithTextOpt(`<div/>{{ foo }} bar {{ baz }}<div/>`)
    expect(root.children.length).toBe(3)
    expect(root.children[0].type).toBe(NodeTypes.ELEMENT)
    expect(root.children[1]).toMatchObject({
      // when mixed with elements, should convert it into a text node call
      type: NodeTypes.TEXT_CALL,
      codegenNode: {
        type: NodeTypes.JS_CALL_EXPRESSION,
        callee: CREATE_TEXT,
        arguments: [
          {
            type: NodeTypes.COMPOUND_EXPRESSION,
            children: [
              { type: NodeTypes.INTERPOLATION, content: { content: `foo` } },
              ` + `,
              { type: NodeTypes.TEXT, content: ` bar ` },
              ` + `,
              { type: NodeTypes.INTERPOLATION, content: { content: `baz` } },
            ],
          },
          genFlagText(PatchFlags.TEXT),
        ],
      },
    })
    expect(root.children[2].type).toBe(NodeTypes.ELEMENT)
    expect(generate(root).code).toMatchSnapshot()
  })
})
